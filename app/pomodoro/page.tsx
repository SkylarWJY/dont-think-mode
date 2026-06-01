"use client";

import { useMemo } from "react";
import Ring from "@/components/Ring";
import Header from "@/components/Header";
import { useLife } from "@/lib/store";
import { useHydrated, useTick } from "@/lib/hooks";
import { fmtDuration } from "@/lib/time";
import { productivityScore } from "@/lib/score";

export default function PomodoroPage() {
  const hydrated = useHydrated();
  const settings = useLife((s) => s.settings);
  const tasks = useLife((s) => s.tasks);
  const today = useLife((s) => s.today);
  const toggleDone = useLife((s) => s.toggleTaskDone);

  // Shared, timestamp-based engine in the store — survives navigation + lock.
  const phase = useLife((s) => s.pomoPhase);
  const running = useLife((s) => s.pomoRunning);
  const endsAt = useLife((s) => s.pomoEndsAt);
  const pomoRemaining = useLife((s) => s.pomoRemaining);
  const cycle = useLife((s) => s.pomoCycle);
  const pomoStart = useLife((s) => s.pomoStart);
  const pomoPause = useLife((s) => s.pomoPause);
  const pomoReset = useLife((s) => s.pomoReset);
  const pomoSkip = useLife((s) => s.pomoSkip);

  useTick(1000); // re-render each second so the countdown ticks down

  const topTask = useMemo(
    () => [...tasks].sort((a, b) => a.rank - b.rank).find((t) => !t.done),
    [tasks]
  );

  if (!hydrated) return <div className="pt-24 text-center text-mist-faint">…</div>;

  const total =
    (phase === "focus"
      ? settings.focusLength
      : phase === "break"
      ? settings.breakLength
      : settings.longBreakLength) * 60;
  const remaining =
    running && endsAt
      ? Math.max(0, Math.round((endsAt - Date.now()) / 1000))
      : pomoRemaining;
  const progress = total ? 1 - remaining / total : 0;
  const accent = phase === "focus" ? "#d8b48a" : "#9db8a4";
  const prodScore = productivityScore(today, topTask ? false : true);

  return (
    <div>
      <Header title="Deep Work" sub="一次只做眼前这一件事。" />

      <div className="mb-5 rounded-2xl border border-ink-line bg-ink-card px-4 py-3 text-center">
        <p className="text-[10px] uppercase tracking-widest text-mist-faint">
          当前任务
        </p>
        <p className="mt-0.5 font-medium text-mist">
          {topTask ? topTask.title : "自由专注"}
        </p>
        {topTask && (
          <>
            <p className="text-xs text-mist-faint">
              {topTask.donePomodoros}/{topTask.pomodoros} 番茄钟
            </p>
            <button
              onClick={() => toggleDone(topTask.id)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-sage/40 bg-sage/10 px-3 py-1.5 text-xs font-medium text-sage"
            >
              ✓ 标记完成
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col items-center">
        <span className="mb-3 text-xs uppercase tracking-[0.3em] text-mist-faint">
          {phase === "focus"
            ? `专注 · 第 ${cycle + 1} 个`
            : phase === "long"
            ? "长休息"
            : "短休息"}
        </span>
        <Ring progress={progress} color={accent} size={250}>
          <span className="numeric text-5xl font-light text-mist">
            {fmtDuration(remaining)}
          </span>
          <span className="mt-1 text-xs text-mist-faint">
            {phase === "focus" ? `${settings.focusLength} 分钟专注` : "休息"}
          </span>
        </Ring>

        <div className="mt-7 flex w-full gap-3">
          <button
            onClick={() => (running ? pomoPause() : pomoStart())}
            className="flex-1 rounded-2xl bg-mist py-3.5 text-sm font-semibold text-ink"
          >
            {running ? "暂停" : "开始"}
          </button>
          <button
            onClick={pomoSkip}
            className="rounded-2xl border border-ink-line bg-ink-soft px-5 text-sm text-mist-dim"
          >
            跳过
          </button>
          <button
            onClick={pomoReset}
            className="rounded-2xl border border-ink-line bg-ink-soft px-5 text-sm text-mist-dim"
          >
            重置
          </button>
        </div>
      </div>

      {/* Today stats */}
      <div className="mt-9 grid grid-cols-3 gap-3">
        <Stat label="完成番茄钟" value={String(today.pomodorosDone)} />
        <Stat label="专注分钟" value={String(today.focusMinutes)} />
        <Stat label="生产力分数" value={String(prodScore)} accent />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-ink-line bg-ink-card px-3 py-4 text-center">
      <p
        className={`numeric text-2xl font-semibold ${
          accent ? "text-amber" : "text-mist"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] text-mist-faint">{label}</p>
    </div>
  );
}
