import { Goal, Task } from "./types";
import { API_BASE } from "./apiBase";

let _id = 0;
const uid = () => `t${Date.now()}_${_id++}`;

/**
 * Turn a freeform voice/text dump into discrete task strings.
 * Handles patterns like "我今天想做三件事：A，B，C" and bullet/line lists.
 */
export function parseTasks(raw: string): string[] {
  let text = raw.trim();
  if (!text) return [];

  // drop a leading framing clause: "...：" / "...:"
  const colon = text.search(/[:：]/);
  if (colon !== -1 && colon < text.length - 1) {
    const head = text.slice(0, colon);
    if (/(想做|要做|计划|today|todo|tasks|事)/i.test(head)) {
      text = text.slice(colon + 1);
    }
  }

  return text
    .split(/[\n,，;；、。]|(?<=\S)\.(?=\s|$)|\s+and\s+|然后|还要|并且(?:还)?|以及|再去|接着/gi)
    .map((s) =>
      s
        .replace(/^\s*[-*•\d.)）(（]+\s*/, "")
        .replace(/^(我要|要|想|然后|再|还要|并且|以及)\s*/g, "")
        .trim()
    )
    .filter((s) => s.length > 0);
}

// Keyword banks used by the local heuristic ranker.
const BANKS = {
  revenue: ["融资", "pitch", "deck", "投资", "fund", "raise", "客户", "bd", "sales", "deal", "revenue", "收入", "签约", "合同"],
  product: ["产品", "网站", "首页", "app", "code", "代码", "feature", "ship", "发布", "mvp", "build", "上线"],
  customer: ["客户", "用户", "bd", "outreach", "消息", "dm", "增长", "growth", "lead", "demo"],
  health: ["健身", "跳舞", "训练", "拉伸", "护肤", "睡", "健康", "workout", "dance", "gym"],
  urgent: ["今天", "马上", "deadline", "截止", "紧急", "asap", "urgent", "现在"],
  chore: ["杂事", "整理", "清理", "回复", "报销", "杂", "errand", "admin"],
};

const has = (s: string, bank: string[]) =>
  bank.some((k) => s.toLowerCase().includes(k.toLowerCase()));

function goalBoost(title: string, goals: Goal[]): number {
  let boost = 0;
  for (const g of goals) {
    const words = g.title.toLowerCase().split(/[\s、,，/]+/).filter(Boolean);
    if (words.some((w) => w.length > 1 && title.toLowerCase().includes(w))) {
      boost += g.weight * (g.tier === "highest" ? 1.5 : g.tier === "high" ? 1 : 0.4);
    }
  }
  return boost;
}

/**
 * Local, zero-dependency ranking. Used as a fallback whenever the
 * OpenAI key is absent or the API call fails — so the app is never blocked.
 */
export function heuristicSort(titles: string[], goals: Goal[]): Task[] {
  const scored = titles.map((title) => {
    const revenue = has(title, BANKS.revenue);
    const product = has(title, BANKS.product);
    const customer = has(title, BANKS.customer);
    const health = has(title, BANKS.health);
    const urgent = has(title, BANKS.urgent);
    const chore = has(title, BANKS.chore);

    let score = 1;
    const reasons: string[] = [];
    if (revenue) { score += 6; reasons.push("可能带来收入/融资"); }
    if (product) { score += 5; reasons.push("推进产品"); }
    if (customer) { score += 4; reasons.push("带来客户/增长"); }
    if (urgent) { score += 3; reasons.push("今天紧急"); }
    if (health) { score += 2; reasons.push("关乎健康与状态"); }
    if (chore) { score -= 2; reasons.push("属于杂事，可压后"); }
    score += goalBoost(title, goals);

    // pomodoro estimate from length / type
    const long = title.length > 14 || product || revenue;
    const pomodoros = chore ? 1 : long ? 3 : 2;

    return {
      title,
      score,
      reason: reasons.length ? reasons.join("，") : "常规任务",
      deep: product || revenue || title.length > 20,
      morning: revenue || product, // hardest things in the AM
      revenue,
      product,
      health,
      optional: chore && !urgent,
      pomodoros,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.map((t, i) => ({
    id: uid(),
    title: t.title,
    rank: i + 1,
    pomodoros: t.pomodoros,
    reason: t.reason,
    deep: t.deep,
    morning: t.morning,
    revenue: t.revenue,
    product: t.product,
    health: t.health,
    optional: t.optional,
    done: false,
    donePomodoros: 0,
  }));
}

/**
 * Ask the server route to sort. Falls back to the local heuristic on any
 * error so the experience degrades gracefully with no API key configured.
 */
export async function sortTasks(
  titles: string[],
  goals: Goal[],
  openaiKey: string
): Promise<{ tasks: Task[]; source: "ai" | "local" }> {
  if (!openaiKey) {
    return { tasks: heuristicSort(titles, goals), source: "local" };
  }
  try {
    const res = await fetch(`${API_BASE}/api/sort`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titles, goals, key: openaiKey }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
      throw new Error("empty");
    }
    return { tasks: data.tasks as Task[], source: "ai" };
  } catch {
    return { tasks: heuristicSort(titles, goals), source: "local" };
  }
}
