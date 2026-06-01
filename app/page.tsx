"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import Ring from "@/components/Ring";
import DayTimeline from "@/components/DayTimeline";
import { useLife } from "@/lib/store";
import { useTick, useHydrated } from "@/lib/hooks";
import { resolveSchedule } from "@/lib/schedule";
import { scoreLevers } from "@/lib/score";
import { fmtClock, fmtLeft, fmtDuration, nowMinutes, greeting } from "@/lib/time";

const TYPE_ACCENT: Record<string, string> = {
  routine: "#9db8a4",
  prep: "#9db8a4",
  work: "#d8b48a",
  meal: "#9db8a4",
  fitness: "#c98a8a",
  winddown: "#8a96c9",
  sleep: "#6b6b73",
  wake: "#9db8a4",
};

export default function TodayPage() {
  const hydrated = useHydrated();
  const now = useTick(1000);
  const settings = useLife((s) => s.settings);
  const schedule = useLife((s) => s.schedule);
  const today = useLife((s) => s.today);
  const tasks = useLife((s) => s.tasks);
  const streak = useLife((s) => s.streak);
  const completeBlock = useLife((s) => s.completeBlock);
  const uncompleteBlock = useLife((s) => s.uncompleteBlock);
  const nudgeShift = useLife((s) => s.nudgeShift);
  const resetShift = useLife((s) => s.resetShift);
  const setFitness = useLife((s) => s.setFitness);
  const setDance = useLife((s) => s.setDance);
  const setSleptOnTime = useLife((s) => s.setSleptOnTime);
  const toggleTaskDone = useLife((s) => s.toggleTaskDone);
  const ensureToday = useLife((s) => s.ensureToday);

  // Shared pomodoro engine — so a work block's NOW ring shows the live focus /
  // break countdown instead of the whole-block remaining.
  const pomoPhase = useLife((s) => s.pomoPhase);
  const pomoRunning = useLife((s) => s.pomoRunning);
  const pomoEndsAt = useLife((s) => s.pomoEndsAt);
  const pomoRemaining = useLife((s) => s.pomoRemaining);

  useEffect(() => {
    ensureToday();
  }, [ensureToday]);

  const shift = today.shiftMinutes ?? 0;
  const blocks = useMemo(
    () => schedule.map((b) => ({ ...b, start: b.start + shift, end: b.end + shift })),
    [schedule, shift]
  );
  const min = nowMinutes(now);
  const state = resolveSchedule(blocks, min);

  // Block-boundary reminders are handled app-wide by <BlockReminders /> in the
  // layout, so they fire on every page and on resume from background.

  if (!hydrated) {
    return <div className="pt-24 text-center text-mist-faint">…</div>;
  }

  const isWinddown = state.now?.type === "winddown" || state.now?.type === "sleep";
  const accent = state.now ? TYPE_ACCENT[state.now.type] : "#9db8a4";
  // How long the current block has already been running — i.e. how late you are
  // starting it. "现在开始" snaps its start to now and pushes the rest of the day.
  const startDelay = state.now ? Math.max(0, Math.round(min - state.now.start)) : 0;
  const ordered = [...tasks].sort((a, b) => a.rank - b.rank);
  // Skip tasks deferred via "今天可以不做" (optional) — they roll to tomorrow,
  // so the current task should advance to the next active one.
  const topTask = ordered.find((t) => !t.done && !t.optional);
  const planDone = ordered.filter((t) => t.done).length;
  const doneToday = state.now ? today.completedBlocks.includes(state.now.id) : false;
  const minsToNext = state.next ? Math.max(0, state.next.start - min) : 0;

  // Pomodoro readout for the NOW ring when the current block is Deep Work.
  const isWorkNow = !!state.now?.pomodoro && !doneToday;
  const pomoIsBreak = pomoPhase !== "focus";
  const pomoTotalSec =
    (pomoPhase === "focus"
      ? settings.focusLength
      : pomoPhase === "break"
      ? settings.breakLength
      : settings.longBreakLength) * 60;
  const pomoRemainSec =
    pomoRunning && pomoEndsAt
      ? Math.max(0, Math.round((pomoEndsAt - Date.now()) / 1000))
      : pomoRemaining;
  const pomoProgress = pomoTotalSec ? 1 - pomoRemainSec / pomoTotalSec : 0;
  const pomoAccent = pomoIsBreak ? "#9db8a4" : "#d8b48a";

  const rank1 = tasks.find((t) => t.rank === 1);
  const levers = scoreLevers(today, rank1?.done ?? false);
  const remainingLevers = levers.filter((l) => !l.done);
  const remainingPoints = remainingLevers.reduce((n, l) => n + l.points, 0);

  function completeLever(key: string) {
    switch (key) {
      case "morning":
        completeBlock("morning-upgrade", 20);
        break;
      case "topTask":
        if (rank1) toggleTaskDone(rank1.id);
        break;
      case "fitness":
        setFitness(true);
        break;
      case "dance":
        setDance(true);
        break;
      case "sleep":
        setSleptOnTime(true);
        break;
    }
  }

  return (
    <div className={isWinddown ? "winddown" : ""}>
      <header className="mb-6 mt-1 flex items-center justify-between">
        <div>
          <p className="text-sm text-mist-faint">
            {greeting(min)}
            {settings.name ? `，${settings.name}` : ""}
          </p>
          <p className="numeric text-xs text-mist-faint">{fmtClock(min)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/review"
            className="flex flex-col items-end rounded-2xl border border-ink-line bg-ink-card px-3 py-1.5"
          >
            <span className="numeric text-lg font-semibold text-sage">
              {today.score}
            </span>
            <span className="text-[10px] text-mist-faint">今日 · 连续 {streak}d</span>
          </Link>
          <Link
            href="/settings"
            aria-label="设置"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-line bg-ink-card text-mist-dim"
          >
            ⚙
          </Link>
        </div>
      </header>

      {/* NOW */}
      <section className="flex flex-col items-center">
        <span className="mb-3 text-xs uppercase tracking-[0.3em] text-mist-faint">
          Now
        </span>
        {isWorkNow ? (
          // Deep Work → tap the ring to enter the pomodoro timer; show the
          // live focus / break countdown instead of whole-block remaining.
          <Link href="/pomodoro" className="flex flex-col items-center">
            <Ring progress={pomoProgress} color={pomoAccent}>
              <span className="numeric text-5xl font-light tracking-tight text-mist">
                {fmtDuration(pomoRemainSec)}
              </span>
              <span className="mt-1 text-xs" style={{ color: pomoAccent }}>
                {pomoIsBreak
                  ? pomoPhase === "long"
                    ? "长休息中"
                    : "休息中"
                  : "专注中"}
              </span>
            </Ring>
          </Link>
        ) : (
          <Ring
            progress={doneToday ? 1 : state.now ? state.progress : 0}
            color={doneToday ? "#9db8a4" : accent}
          >
            {state.now ? (
              doneToday ? (
                <>
                  <span className="text-4xl text-sage">✓</span>
                  {state.next && (
                    <span className="mt-1 text-xs text-mist-faint">
                      下一项 {fmtLeft(minsToNext)}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="numeric text-5xl font-light tracking-tight text-mist">
                    {fmtLeft(state.minutesLeft)}
                  </span>
                  <span className="mt-1 text-xs text-mist-faint">remaining</span>
                </>
              )
            ) : (
              <span className="px-8 text-center text-sm text-mist-faint">
                {state.beforeDay ? "新的一天即将开始" : "今天已经结束"}
              </span>
            )}
          </Ring>
        )}

        <div className="mt-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-mist">
            {state.now?.title ?? "Rest"}
          </h1>
          {doneToday ? (
            <p className="mt-1 text-sm text-sage">
              ✓ 已完成{state.next ? ` · 下一项 ${state.next.title}` : ""}
            </p>
          ) : (
            state.now?.subtitle && (
              <p className="mt-0.5 text-sm text-mist-dim">{state.now.subtitle}</p>
            )
          )}
          {state.now && (
            <p className="numeric mt-1 text-xs text-mist-faint">
              {fmtClock(state.now.start)} – {fmtClock(state.now.end)}
            </p>
          )}
        </div>

        {/* Current task inside a work block */}
        {!doneToday && state.now?.pomodoro && topTask && (
          <Link
            href="/pomodoro"
            className="mt-4 w-full rounded-2xl border border-ink-line bg-ink-card px-4 py-3"
          >
            <p className="text-[10px] uppercase tracking-widest text-amber">
              Deep Work · 任务 1
            </p>
            <p className="mt-0.5 font-medium text-mist">{topTask.title}</p>
            <p className="mt-0.5 text-xs text-mist-faint">
              {topTask.donePomodoros}/{topTask.pomodoros} 番茄钟 · 进入专注 →
            </p>
          </Link>
        )}
        {!doneToday && state.now?.pomodoro && !topTask && (
          <Link
            href="/plan"
            className="mt-4 w-full rounded-2xl border border-dashed border-ink-line px-4 py-3 text-center text-sm text-mist-dim"
          >
            还没有今日任务 — 去输入并让 AI 排序 →
          </Link>
        )}

        {/* Checklist for ritual blocks */}
        {!doneToday && state.now?.checklist && (
          <div className="mt-4 w-full rounded-2xl border border-ink-line bg-ink-card p-4">
            <ul className="space-y-1.5">
              {state.now.checklist.map((c) => (
                <li key={c} className="flex items-center gap-2 text-sm text-mist-dim">
                  <span className="text-sage">·</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Complete / advance — works for every block, including Deep Work */}
        {state.now && (
          <button
            onClick={() =>
              doneToday
                ? uncompleteBlock(state.now!.id)
                : completeBlock(state.now!.id, state.now!.score)
            }
            className={`mt-4 w-full rounded-2xl py-3 text-sm font-medium transition-colors ${
              doneToday
                ? "border border-sage/40 bg-sage/10 text-sage"
                : "bg-mist text-ink"
            }`}
          >
            {doneToday
              ? "↩ 撤销，回到这一块"
              : state.now.type === "work"
              ? "提前结束这段，进入下一项 →"
              : `完成这个时间块  +${state.now.score}`}
          </button>
        )}

        {/* Running late → one tap snaps THIS block to now, pushing the rest back */}
        {state.now && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-mist-faint">
            {startDelay >= 1 ? (
              <button
                onClick={() => nudgeShift(startDelay)}
                className="rounded-full border border-ink-line px-3 py-1 text-mist-dim"
              >
                晚了? 现在开始这一项 · 顺延 {fmtLeft(startDelay)} →
              </button>
            ) : (
              <span>准点 · 按计划进行</span>
            )}
            {shift !== 0 && (
              <button
                onClick={resetShift}
                className="rounded-full border border-sage/40 bg-sage/10 px-2.5 py-1 text-sage"
              >
                已移 {shift > 0 ? "+" : ""}
                {shift}m · 重置
              </button>
            )}
          </div>
        )}
      </section>

      {/* NEXT */}
      {state.next && (
        <section className="mt-8">
          <span className="text-xs uppercase tracking-[0.3em] text-mist-faint">
            Next
          </span>
          <div className="mt-2 flex items-center justify-between rounded-2xl border border-ink-line bg-ink-soft px-4 py-3">
            <div>
              <p className="font-medium text-mist">{state.next.title}</p>
              {state.next.subtitle && (
                <p className="text-xs text-mist-faint">{state.next.subtitle}</p>
              )}
            </div>
            <span className="numeric text-sm text-mist-dim">
              {fmtClock(state.next.start)}
            </span>
          </div>
        </section>
      )}

      {/* Score → action: the biggest levers still on the table today */}
      <section className="mt-8">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-[0.3em] text-mist-faint">
            今天拉满
          </span>
          <span className="numeric text-xs text-mist-faint">
            {remainingLevers.length === 0
              ? "关键分已拉满"
              : `还差 ${remainingPoints} 分`}
          </span>
        </div>
        {remainingLevers.length === 0 ? (
          <div className="rounded-2xl border border-sage/30 bg-sage/5 px-4 py-3 text-sm text-sage">
            ✓ 今天的关键分全部拿下 — 漂亮。
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {remainingLevers.map((l) => {
              if (l.key === "topTask" && !rank1) {
                return (
                  <Link
                    key={l.key}
                    href="/plan"
                    className="rounded-full border border-ink-line bg-ink-card px-3 py-2 text-sm text-mist-dim"
                  >
                    {l.label}{" "}
                    <span className="numeric text-mist-faint">+{l.points}</span>
                  </Link>
                );
              }
              return (
                <button
                  key={l.key}
                  onClick={() => completeLever(l.key)}
                  className="rounded-full border border-ink-line bg-ink-card px-3 py-2 text-sm text-mist transition-colors active:bg-sage/10"
                >
                  {l.label}{" "}
                  <span className="numeric text-amber">+{l.points}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Today's plan — reflects whatever you set on the Plan tab */}
      {ordered.length > 0 && (
        <section className="mt-8">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-[0.3em] text-mist-faint">
              今日计划
            </span>
            <Link href="/plan" className="text-[11px] text-mist-faint underline-offset-2 hover:underline">
              完成 {planDone}/{ordered.length} · 编辑 →
            </Link>
          </div>
          <ul className="space-y-1.5">
            {ordered.map((t) => (
              <li
                key={t.id}
                className={`flex items-center gap-3 rounded-xl border border-ink-line bg-ink-card px-3 py-2.5 text-sm ${
                  t.done || t.optional ? "opacity-50" : ""
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                    t.done ? "border-sage bg-sage text-ink" : "border-ink-line text-mist-dim"
                  }`}
                >
                  {t.done ? "✓" : t.rank}
                </span>
                <span className={`min-w-0 flex-1 truncate text-mist ${t.done || t.optional ? "line-through" : ""}`}>
                  {t.title}
                </span>
                <span className="numeric shrink-0 text-[11px] text-mist-faint">
                  {t.donePomodoros}/{t.pomodoros} 🍅
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Full-day timeline — 几点做什么，一目了然 */}
      <div className="mt-10">
        <DayTimeline min={min} shift={shift} />
      </div>

      {/* Don't Think Mode anchor */}
      <p className="mt-10 text-center text-sm leading-relaxed text-mist-faint">
        我打开 App 后，不需要思考，<br />只需要执行。
      </p>
    </div>
  );
}
