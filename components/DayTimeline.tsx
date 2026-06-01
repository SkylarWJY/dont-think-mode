"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useLife } from "@/lib/store";
import { packTasksIntoWork } from "@/lib/schedule";
import { fmtClock24, fmtLeft } from "@/lib/time";
import { TimeBlock } from "@/lib/types";

const ACCENT: Record<string, string> = {
  routine: "#9db8a4",
  prep: "#9db8a4",
  work: "#d8b48a",
  meal: "#9db8a4",
  fitness: "#c98a8a",
  winddown: "#8a96c9",
  sleep: "#6b6b73",
  wake: "#9db8a4",
};

type Status = "past" | "now" | "future";

interface Milestone {
  time: number;
  label: string;
  icon: string;
}

/** Narrative markers that fill the gaps between blocks. */
const MILESTONES: Milestone[] = [
  { time: 9 * 60, label: "到 Office · 进入 Deep Work Mode", icon: "→" },
  { time: 18 * 60, label: "Professional Day Complete · 下班", icon: "✦" },
];

type Item =
  | { kind: "block"; time: number; block: TimeBlock }
  | { kind: "milestone"; time: number; ms: Milestone }
  | { kind: "now"; time: number };

export default function DayTimeline({
  min,
  shift = 0,
}: {
  min: number;
  shift?: number;
}) {
  const settings = useLife((s) => s.settings);
  const tasks = useLife((s) => s.tasks);
  const today = useLife((s) => s.today);
  const completeBlock = useLife((s) => s.completeBlock);
  const uncompleteBlock = useLife((s) => s.uncompleteBlock);

  const schedule = useLife((s) => s.schedule);
  const blocks = useMemo(
    () => schedule.map((b) => ({ ...b, start: b.start + shift, end: b.end + shift })),
    [schedule, shift]
  );
  const slots = useMemo(
    () =>
      packTasksIntoWork(
        [...tasks].sort((a, b) => a.rank - b.rank).filter((t) => !t.optional),
        blocks,
        settings.focusLength,
        settings.breakLength
      ),
    [tasks, blocks, settings.focusLength, settings.breakLength]
  );

  const slotsByBlock = useMemo(() => {
    const m: Record<string, typeof slots> = {};
    for (const s of slots) (m[s.blockId] ||= []).push(s);
    return m;
  }, [slots]);

  // True when the current time falls in a gap between blocks (no active block).
  const inGap = !blocks.some((b) => min >= b.start && min < b.end);

  // Build the interleaved, time-sorted list of blocks + milestones + now-marker.
  const items = useMemo(() => {
    const list: Item[] = [];
    for (const b of blocks) list.push({ kind: "block", time: b.start, block: b });
    for (const ms of MILESTONES)
      list.push({ kind: "milestone", time: ms.time, ms });
    if (inGap && min >= blocks[0].start && min < 1440)
      list.push({ kind: "now", time: min });
    // sort by time; at equal time, milestone/now sit before the block header
    return list.sort((a, b) =>
      a.time === b.time
        ? (a.kind === "block" ? 1 : 0) - (b.kind === "block" ? 1 : 0)
        : a.time - b.time
    );
  }, [blocks, settings, inGap, min]);

  // The timeline marks "now" visually (breathing dot + Now badge), but it must
  // NOT scroll the page to it: the Today page should always open at the top on
  // the Now ring, not jump down here. We only opt out of the browser's stale
  // scroll restoration so a reload also lands at the top.
  const currentRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (typeof history !== "undefined" && "scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs uppercase tracking-[0.3em] text-mist-faint">
          今日时间线
        </h2>
        <span className="numeric text-xs text-mist-faint">
          {fmtClock24(min)} · 现在
        </span>
      </div>

      <ol className="relative">
        {items.map((item, i) => {
          const last = i === items.length - 1;

          // ── live "现在" marker (only shown during gaps) ──────────────
          if (item.kind === "now") {
            return (
              <li key="now-marker" ref={currentRef} className="flex gap-3 pb-2">
                <div className="flex w-12 shrink-0 justify-end pt-0.5">
                  <span className="numeric text-sm font-semibold text-sage">
                    {fmtClock24(min)}
                  </span>
                </div>
                <div className="relative flex w-4 shrink-0 flex-col items-center">
                  <span className="mt-1 h-3 w-3 animate-breathe rounded-full bg-sage" />
                  {!last && <span className="w-px flex-1 bg-ink-line" />}
                </div>
                <div className="flex-1 pb-1">
                  <div className="rounded-xl border border-sage/30 bg-sage/5 px-3 py-2 text-xs text-sage">
                    现在 · 块与块之间的过渡
                  </div>
                </div>
              </li>
            );
          }

          // ── milestone marker ─────────────────────────────────────────
          if (item.kind === "milestone") {
            const passed = min >= item.time;
            return (
              <li key={`ms-${item.time}`} className="flex gap-3 pb-2">
                <div className="flex w-12 shrink-0 justify-end pt-0.5">
                  <span
                    className={`numeric text-xs ${
                      passed ? "text-mist-faint" : "text-mist-dim"
                    }`}
                  >
                    {fmtClock24(item.time)}
                  </span>
                </div>
                <div className="relative flex w-4 shrink-0 flex-col items-center">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 rounded-full ${
                      passed ? "bg-mist-faint" : "bg-mist-dim"
                    }`}
                  />
                  {!last && <span className="w-px flex-1 bg-ink-line" />}
                </div>
                <div className="flex-1 pb-1">
                  <p
                    className={`text-xs ${
                      passed ? "text-mist-faint" : "text-mist-dim"
                    }`}
                  >
                    <span className="mr-1">{item.ms.icon}</span>
                    {item.ms.label}
                  </p>
                </div>
              </li>
            );
          }

          // ── time block ───────────────────────────────────────────────
          const b = item.block;
          const status: Status =
            min >= b.end ? "past" : min >= b.start ? "now" : "future";
          const done = today.completedBlocks.includes(b.id);
          const accent = ACCENT[b.type];
          const blockSlots = slotsByBlock[b.id] ?? [];

          return (
            <li
              key={b.id}
              ref={status === "now" ? currentRef : undefined}
              className="relative flex gap-3 pb-2"
            >
              {/* time rail */}
              <div className="flex w-12 shrink-0 flex-col items-end pt-0.5">
                <span
                  className={`numeric text-sm font-semibold ${
                    status === "now"
                      ? "text-mist"
                      : status === "past"
                      ? "text-mist-faint"
                      : "text-mist-dim"
                  }`}
                >
                  {fmtClock24(b.start)}
                </span>
                <span className="numeric text-[10px] text-mist-faint">
                  {fmtClock24(b.end === 1440 ? 0 : b.end)}
                </span>
              </div>

              {/* connector dot + line */}
              <div className="relative flex w-4 shrink-0 flex-col items-center">
                <span
                  className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${
                    status === "now" ? "animate-breathe" : ""
                  }`}
                  style={{
                    borderColor: accent,
                    background: status === "past" || done ? accent : "transparent",
                  }}
                />
                {!last && (
                  <span
                    className="w-px flex-1"
                    style={{
                      background: status === "past" ? accent : "#26262c",
                      opacity: status === "past" ? 0.4 : 1,
                    }}
                  />
                )}
              </div>

              {/* card */}
              <div
                className={`mb-1 flex-1 rounded-2xl border px-4 py-3 transition-colors ${
                  status === "now"
                    ? "border-transparent bg-ink-card ring-1"
                    : status === "past"
                    ? "border-ink-line bg-transparent opacity-55"
                    : "border-ink-line bg-ink-soft"
                }`}
                style={
                  status === "now"
                    ? ({ ["--tw-ring-color" as any]: accent } as React.CSSProperties)
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-mist">{b.title}</h3>
                      {status === "now" && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink"
                          style={{ background: accent }}
                        >
                          Now
                        </span>
                      )}
                    </div>
                    {b.subtitle && (
                      <p className="text-xs text-mist-faint">{b.subtitle}</p>
                    )}
                  </div>
                  {status === "now" && (
                    <span className="numeric shrink-0 text-sm text-mist-dim">
                      剩 {fmtLeft(b.end - min)}
                    </span>
                  )}
                  {done && status !== "now" && (
                    <span className="shrink-0 text-sage">✓</span>
                  )}
                </div>

                {/* work block → packed task slots with explicit times */}
                {b.pomodoro && (
                  <div className="mt-2 space-y-1.5">
                    {blockSlots.length > 0 ? (
                      blockSlots.map((s, k) => (
                        <Link
                          key={k}
                          href="/pomodoro"
                          className="flex items-center justify-between rounded-lg bg-ink-soft px-3 py-2"
                        >
                          <span className="min-w-0 truncate text-sm text-mist">
                            {s.taskTitle}
                          </span>
                          <span className="numeric ml-2 shrink-0 text-[11px] text-amber">
                            {fmtClock24(s.startMin)}–{fmtClock24(s.endMin)} ·{" "}
                            {s.pomodoros}🍅
                          </span>
                        </Link>
                      ))
                    ) : (
                      <Link
                        href="/plan"
                        className="block rounded-lg border border-dashed border-ink-line px-3 py-2 text-center text-xs text-mist-faint"
                      >
                        还没排任务 — 去输入,让 AI 排进这段 →
                      </Link>
                    )}
                  </div>
                )}

                {/* ritual block → checklist */}
                {b.checklist && (
                  <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {b.checklist.map((c) => (
                      <li
                        key={c}
                        className="text-xs text-mist-dim before:mr-1 before:text-sage before:content-['·']"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                )}

                {/* fitness block → link into Move / Dance flow */}
                {b.type === "fitness" && (
                  <Link
                    href="/fitness"
                    className="mt-2 flex items-center justify-between rounded-lg bg-ink-soft px-3 py-2 text-xs"
                    style={{ color: ACCENT.fitness }}
                  >
                    <span>进入训练 · 力量 + 跳舞</span>
                    <span>→</span>
                  </Link>
                )}

                {/* complete toggle for non-work blocks that are current or past */}
                {!b.pomodoro && status !== "future" && (
                  <button
                    onClick={() =>
                      done ? uncompleteBlock(b.id) : completeBlock(b.id, b.score)
                    }
                    className={`mt-2.5 w-full rounded-lg py-1.5 text-xs font-medium transition-colors ${
                      done
                        ? "border border-sage/30 bg-sage/10 text-sage"
                        : status === "now"
                        ? "bg-mist text-ink"
                        : "border border-ink-line text-mist-dim"
                    }`}
                  >
                    {done ? `✓ 已完成  +${b.score}` : `完成  +${b.score}`}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
