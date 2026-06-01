"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useLife } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { fmtClock24 } from "@/lib/time";
import { BlockType } from "@/lib/types";

const TYPES: { value: BlockType; label: string }[] = [
  { value: "routine", label: "日常 / 仪式" },
  { value: "prep", label: "准备" },
  { value: "work", label: "深度工作" },
  { value: "meal", label: "吃饭" },
  { value: "fitness", label: "训练" },
  { value: "winddown", label: "放松" },
  { value: "sleep", label: "睡觉" },
  { value: "wake", label: "起床" },
];

// "HH:MM" → minutes-from-midnight
const parseHM = (v: string) => {
  const [h, m] = v.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const toHM = (min: number) => fmtClock24(min);

export default function ScheduleEditorPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const schedule = useLife((s) => s.schedule);
  const updateBlock = useLife((s) => s.updateBlock);
  const addBlock = useLife((s) => s.addBlock);
  const removeBlock = useLife((s) => s.removeBlock);
  const resetSchedule = useLife((s) => s.resetSchedule);

  if (!hydrated)
    return <div className="pt-24 text-center text-mist-faint">…</div>;

  const ordered = [...schedule].sort((a, b) => a.start - b.start);

  return (
    <div>
      <Header
        title="每日节奏"
        sub="改成你真实的一天。Today 的倒计时会照这个走。"
      />

      <div className="space-y-3">
        {ordered.map((b) => {
          const bad = b.end <= b.start;
          return (
            <div
              key={b.id}
              className="rounded-2xl border border-ink-line bg-ink-card p-4"
            >
              <input
                value={b.title}
                onChange={(e) => updateBlock(b.id, { title: e.target.value })}
                placeholder="时间块名字"
                className="w-full bg-transparent text-[15px] font-medium text-mist placeholder:text-mist-faint focus:outline-none"
              />
              <input
                value={b.subtitle ?? ""}
                onChange={(e) =>
                  updateBlock(b.id, { subtitle: e.target.value })
                }
                placeholder="副标题（可选）"
                className="mt-0.5 w-full bg-transparent text-xs text-mist-dim placeholder:text-mist-faint focus:outline-none"
              />

              <div className="mt-3 flex items-center gap-2">
                <input
                  type="time"
                  value={toHM(b.start)}
                  onChange={(e) =>
                    updateBlock(b.id, { start: parseHM(e.target.value) })
                  }
                  className="rounded-lg border border-ink-line bg-ink-soft px-2 py-1.5 text-sm text-mist focus:border-sage/50 focus:outline-none"
                />
                <span className="text-mist-faint">→</span>
                <input
                  type="time"
                  value={toHM(b.end === 1440 ? 0 : b.end)}
                  onChange={(e) => {
                    const v = parseHM(e.target.value);
                    updateBlock(b.id, { end: v === 0 ? 1440 : v });
                  }}
                  className={`rounded-lg border bg-ink-soft px-2 py-1.5 text-sm text-mist focus:outline-none ${
                    bad ? "border-rose/60" : "border-ink-line focus:border-sage/50"
                  }`}
                />
                {bad && (
                  <span className="text-[11px] text-rose">结束要晚于开始</span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={b.type}
                  onChange={(e) =>
                    updateBlock(b.id, { type: e.target.value as BlockType })
                  }
                  className="rounded-lg border border-ink-line bg-ink-soft px-2 py-1.5 text-xs text-mist focus:outline-none"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => updateBlock(b.id, { pomodoro: !b.pomodoro })}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    b.pomodoro
                      ? "border-amber/40 bg-amber/10 text-amber"
                      : "border-ink-line text-mist-faint"
                  }`}
                >
                  {b.pomodoro ? "🍅 番茄工作块" : "设为番茄工作块"}
                </button>

                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-[11px] text-mist-faint">分值</span>
                  <input
                    type="number"
                    value={b.score}
                    onChange={(e) =>
                      updateBlock(b.id, {
                        score: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-14 rounded-lg border border-ink-line bg-ink-soft px-2 py-1 text-xs text-mist focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (confirm(`删除「${b.title}」？`)) removeBlock(b.id);
                }}
                className="mt-3 text-[11px] text-mist-faint underline-offset-2 hover:underline"
              >
                ✕ 删除这个时间块
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={addBlock}
        className="mt-3 w-full rounded-2xl border border-dashed border-ink-line py-3 text-sm text-mist-dim"
      >
        + 添加时间块
      </button>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex-1 rounded-2xl bg-mist py-3.5 text-sm font-semibold text-ink"
        >
          完成
        </button>
        <button
          onClick={() => {
            if (confirm("恢复成默认作息？你的改动会被覆盖。")) resetSchedule();
          }}
          className="rounded-2xl border border-ink-line bg-ink-soft px-5 text-sm text-mist-dim"
        >
          恢复默认
        </button>
      </div>
    </div>
  );
}
