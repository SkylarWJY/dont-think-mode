import { todayKey } from "./time";

// A self-contained, GENERIC demo dataset for showing the app off — no personal
// data, safe to ship. Dates are computed relative to "now" so every demo looks
// fresh. Load it from Settings → 演示模式.

function dayKey(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return todayKey(d);
}

function task(
  id: string,
  title: string,
  rank: number,
  pomodoros: number,
  done: boolean,
  donePomodoros: number,
  flags: Partial<Record<"deep" | "morning" | "revenue" | "product" | "health", boolean>> = {}
) {
  return {
    id,
    title,
    rank,
    pomodoros,
    donePomodoros,
    done,
    reason: "",
    deep: false,
    morning: false,
    revenue: false,
    product: false,
    health: false,
    optional: false,
    carriedOver: false,
    ...flags,
  };
}

function dayLog(
  date: string,
  score: number,
  pomos: number,
  focus: number,
  blocks: string[],
  tasks: string[]
) {
  return {
    date,
    completedBlocks: blocks,
    skippedBlocks: [],
    completedTasks: tasks,
    pomodorosDone: pomos,
    focusMinutes: focus,
    fitnessDone: false,
    danceDone: false,
    beautyDone: false,
    sleptOnTime: false,
    shiftMinutes: 0,
    score,
  };
}

/** Build a fresh demo export JSON (string) — feed straight to importData. */
export function buildDemoExport(): string {
  const data = {
    settings: {
      name: "Sky",
      wakeMinutes: 480,
      sleepMinutes: 1320,
      focusLength: 25,
      breakLength: 5,
      longBreakLength: 15,
      notifications: true,
      sound: true,
      openaiKey: "",
      autoBackup: false,
      theme: "dark",
      nightlyBackup: false,
    },
    schedule: [], // empty → importData falls back to the default schedule
    goals: [
      { id: "g1", title: "把产品做出来", tier: "highest", weight: 10 },
      { id: "g2", title: "跑通收入", tier: "highest", weight: 10 },
      { id: "g3", title: "多跟用户聊", tier: "highest", weight: 9 },
      { id: "g4", title: "搭起团队", tier: "high", weight: 7 },
      { id: "g5", title: "保持健康", tier: "high", weight: 6 },
    ],
    tasks: [
      task("d1", "上线新的用户引导流程", 1, 3, false, 1, { deep: true, product: true }),
      task("d2", "录一条 2 分钟产品 demo", 2, 2, false, 0, { product: true }),
      task("d3", "回复 5 封用户邮件", 3, 1, true, 1, { revenue: true }),
      task("d4", "修掉注册页的 bug", 4, 2, true, 2, { product: true }),
      task("d5", "准备这周的投资人月报", 5, 2, false, 0, { revenue: true }),
      task("d6", "Review 团队的代码 PR", 6, 1, false, 0, { product: true }),
    ],
    activeTaskId: null,
    planConfirmed: true,
    aiSource: "ai",
    today: dayLog(dayKey(0), 75, 5, 125, ["morning-upgrade"], [
      "回复 5 封用户邮件",
      "修掉注册页的 bug",
    ]),
    history: [
      dayLog(dayKey(1), 92, 9, 225, ["morning-upgrade", "prep", "work-pm"], [
        "谈下了 Acme 大客户",
        "上线深色模式",
        "写好发布推文",
      ]),
      dayLog(dayKey(2), 64, 5, 125, ["morning-upgrade"], [
        "做了 3 个用户访谈",
        "打磨引导文案",
      ]),
      dayLog(dayKey(3), 88, 8, 200, ["morning-upgrade", "work-pm"], [
        "重构了 API",
        "给 2 个设计合伙人演示",
      ]),
      dayLog(dayKey(4), 45, 3, 75, [], ["回复了投资人"]),
      dayLog(dayKey(5), 80, 7, 175, ["morning-upgrade", "prep"], [
        "定价页改版 v2",
        "拉新了一个用户",
      ]),
    ],
    streak: 4,
    sessions: [],
  };
  return JSON.stringify({
    app: "dont-think-mode",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  });
}
