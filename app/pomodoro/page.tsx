"use client";

import { useMemo } from "react";
import Ring from "@/components/Ring";
import Header from "@/components/Header";
import { useLife } from "@/lib/store";
import { useHydrated, useTick } from "@/lib/hooks";
import { fmtDuration, fmtLeft, nowMinutes } from "@/lib/time";
import { productivityScore } from "@/lib/score";

export default function PomodoroPage() {
  const hydrated = useHydrated();
  const settings = useLife((s) => s.settings);
  const tasks = useLife((s) => s.tasks);
  const today = useLife((s) => s.today);
  const toggleDone = useLife((s) => s.toggleTaskDone);
  const activeTaskId = useLife((s) => s.activeTaskId);
  const setActiveTask = useLife((s) => s.setActiveTask);

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

  // Active task queue: not done, not deferred — ordered by priority.
  const queue = useMemo(
    () =>
      [...tasks]
        .filter((t) => !t.done && !t.optional)
        .sort((a, b) => a.rank - b.rank),
    [tasks]
  );
  // The "current" task is whichever you tapped (if still active), else the top
  // of the queue. Switching tasks does NOT touch the running timer.
  const activeTask = activeTaskId
    ? queue.find((t) => t.id === activeTaskId)
    : undefined;
  const topTask = activeTask ?? queue[0];
  // Everything else you could switch to — tap to focus it.
  const upNext = queue.filter((t) => t.id !== topTask?.id);
  const isManual = !!activeTask && activeTask.id !== queue[0]?.id;

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

  // Pomodoro rhythm: a long break lands after every SET focus blocks.
  const SET = 4;
  // During focus, the in-progress one is today's #(cycle+1); during a break
  // it's the next one up. Either way the upcoming index is cycle+1.
  const pomoIndex = cycle + 1;
  const inSet = phase === "long" ? SET : cycle % SET; // completed in this set
  const toLong = phase === "long" ? SET : SET - (cycle % SET); // until long break
  // How much of the *waking* day (wake → sleep) has passed — for the vertical
  // day rail. Morning sits at the top; the fill grows downward as the day goes.
  const nowMin = nowMinutes();
  const dayStart = settings.wakeMinutes;
  const dayEnd = Math.max(settings.sleepMinutes, dayStart + 1);
  const dayElapsed = Math.min(Math.max(nowMin - dayStart, 0), dayEnd - dayStart);
  const dayFrac = dayElapsed / (dayEnd - dayStart);
  const dayPct = Math.round(dayFrac * 100);
  const dayLeftMin = Math.max(0, dayEnd - nowMin);

  const rhythmHint =
    phase === "long"
      ? "做满 4 个 · 长休息"
      : toLong === 1 && phase === "focus"
      ? "这个之后就是长休息"
      : `再 ${toLong} 个进入长休息`;

  return (
    <div>
      {/* Vertical day rail — how much of today (wake→sleep) has passed. */}
      <div className="pointer-events-none fixed right-1.5 top-[max(0.75rem,env(safe-area-inset-top))] bottom-24 z-40 flex w-9 flex-col items-center">
        <span className="numeric mb-1 text-[9px] text-mist-faint">起</span>
        <div className="relative w-1.5 flex-1 overflow-hidden rounded-full bg-ink-line/50">
          <div
            className="absolute inset-x-0 top-0 rounded-full bg-amber/70"
            style={{ height: `${dayPct}%` }}
          />
          {/* current-position marker */}
          <div
            className="absolute inset-x-[-3px] h-[2px] bg-amber"
            style={{ top: `calc(${dayPct}% - 1px)` }}
          />
        </div>
        <span className="numeric mt-1 text-[9px] text-mist-faint">睡</span>
        <span className="numeric mt-1 text-[10px] font-semibold text-amber">
          {dayPct}%
        </span>
        <span className="numeric text-[8px] leading-tight text-mist-faint">
          剩{fmtLeft(dayLeftMin)}
        </span>
      </div>

      <Header title="Deep Work" sub="一次只做眼前这一件事。" />

      <div className="mb-5 rounded-2xl border border-ink-line bg-ink-card px-4 py-3 text-center">
        <p className="text-[10px] uppercase tracking-widest text-amber">
          正在专注{isManual ? " · 已手动选择" : ""}
        </p>
        <p className="mt-0.5 font-medium text-mist">
          {topTask ? topTask.title : "自由专注"}
        </p>
        {topTask && (
          <>
            <p className="text-xs text-mist-faint">
              {topTask.donePomodoros}/{topTask.pomodoros} 番茄钟
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => toggleDone(topTask.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-sage/40 bg-sage/10 px-3 py-1.5 text-xs font-medium text-sage"
              >
                ✓ 标记完成
              </button>
              {isManual && (
                <button
                  onClick={() => setActiveTask(null)}
                  className="inline-flex items-center rounded-full border border-ink-line px-3 py-1.5 text-xs text-mist-faint"
                >
                  回到默认顺序
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col items-center">
        <span className="text-xs uppercase tracking-[0.3em] text-mist-faint">
          {phase === "focus"
            ? `专注 · 今天第 ${pomoIndex} 个`
            : phase === "long"
            ? `长休息 · 下一个第 ${pomoIndex} 个`
            : `短休息 · 下一个第 ${pomoIndex} 个`}
        </span>

        {/* Set progress toward the long break — 4 dots + hint. */}
        <div className="mb-3 mt-2 flex items-center gap-1.5">
          {Array.from({ length: SET }).map((_, i) => {
            const filled = i < inSet;
            const active = phase === "focus" && i === inSet;
            return (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${
                  active
                    ? "bg-amber ring-2 ring-amber/30"
                    : filled
                    ? "bg-sage"
                    : "bg-ink-line"
                }`}
              />
            );
          })}
          <span className="ml-2 text-[10px] text-mist-faint">{rhythmHint}</span>
        </div>

        <Ring progress={progress} color={accent} size={250}>
          <span className="numeric text-5xl font-light text-mist">
            {fmtDuration(remaining)}
          </span>
          <span className="mt-1 text-xs text-mist-faint">
            {phase === "focus" ? `${settings.focusLength} 分钟专注` : "休息"}
          </span>
        </Ring>

        {phase !== "focus" && (
          <p className="mt-3 text-xs text-mist-dim">
            还有{" "}
            <span className="numeric text-mist">{fmtDuration(remaining)}</span>{" "}
            开始今天第 {pomoIndex} 个番茄钟
          </p>
        )}

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

      {/* Switch tasks — tap any one to focus it. The timer keeps running. */}
      {upNext.length > 0 && (
        <div className="mt-9">
          <p className="mb-2 text-xs uppercase tracking-widest text-mist-faint">
            切换任务 · 点一下专注它（计时不重置）
          </p>
          <div className="space-y-2">
            {upNext.slice(0, 6).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTask(t.id)}
                className="flex w-full items-center justify-between rounded-xl border border-ink-line bg-ink-soft px-4 py-2.5 text-left transition-colors active:bg-amber/10"
              >
                <span className="truncate pr-3 text-sm text-mist-dim">
                  {t.title}
                </span>
                <span className="numeric shrink-0 text-xs text-mist-faint">
                  {t.donePomodoros}/{t.pomodoros} 🍅
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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
