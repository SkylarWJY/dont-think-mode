"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import { useLife } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { fmtClock } from "@/lib/time";
import { buildDayCard, shareImageBlob } from "@/lib/shareCard";

export default function ReviewPage() {
  const hydrated = useHydrated();
  const today = useLife((s) => s.today);
  const history = useLife((s) => s.history);
  const tasks = useLife((s) => s.tasks);
  const streak = useLife((s) => s.streak);
  const settings = useLife((s) => s.settings);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [cardBusy, setCardBusy] = useState(false);

  const all = useMemo(() => [today, ...history], [today, history]);
  const week = useMemo(() => all.slice(0, 7), [all]);
  const month = useMemo(() => all.slice(0, 30), [all]);
  const weekAvg = week.length
    ? Math.round(week.reduce((n, d) => n + d.score, 0) / week.length)
    : 0;
  const monthAvg = month.length
    ? Math.round(month.reduce((n, d) => n + d.score, 0) / month.length)
    : 0;
  const blocks = useLife((s) => s.schedule);

  if (!hydrated) return <div className="pt-24 text-center text-mist-faint">…</div>;

  const doneTasks = tasks.filter((t) => t.done);
  const maxBar = Math.max(100, ...week.map((d) => d.score));

  // What I actually finished today: named time blocks + tasks.
  const doneBlocks = today.completedBlocks
    .map((id) => blocks.find((b) => b.id === id)?.title)
    .filter((x): x is string => !!x);
  const nothingYet =
    doneBlocks.length === 0 &&
    doneTasks.length === 0 &&
    today.pomodorosDone === 0;

  const checks: { label: string; ok: boolean }[] = [
    { label: "早起 · Morning Routine", ok: today.completedBlocks.includes("morning-upgrade") },
    { label: "健身", ok: today.fitnessDone },
    { label: "跳舞", ok: today.danceDone },
    { label: "晨间养护", ok: today.beautyDone },
    { label: `${fmtClock(settings.sleepMinutes)} 前睡觉`, ok: today.sleptOnTime },
  ];

  async function genCard() {
    setCardBusy(true);
    const completed = [...doneBlocks, ...doneTasks.map((t) => t.title)];
    const blob = await buildDayCard({
      date: today.date,
      score: today.score,
      pomodoros: today.pomodorosDone,
      focusMinutes: today.focusMinutes,
      streak,
      completed,
      name: settings.name,
    });
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    setCardBlob(blob);
    setCardUrl(URL.createObjectURL(blob));
    setCardBusy(false);
  }

  function closeCard() {
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    setCardUrl(null);
    setCardBlob(null);
  }

  return (
    <div>
      <Header title="Review" sub="今天过得怎么样。" />

      {/* Daily summary — what I actually finished today */}
      <div className="rounded-2xl border border-ink-line bg-ink-card p-4">
        <p className="text-xs uppercase tracking-widest text-mist-faint">
          今日小结
        </p>
        {nothingYet ? (
          <p className="mt-2 text-sm text-mist-dim">
            今天还没有完成的记录 — 去执行第一件事吧。
          </p>
        ) : (
          <>
            <p className="mt-2 text-[15px] leading-relaxed text-mist">
              今天你完成了{" "}
              <span className="font-semibold text-sage">{doneBlocks.length}</span>{" "}
              个时间块、
              <span className="font-semibold text-sage">
                {today.pomodorosDone}
              </span>{" "}
              个番茄钟、
              <span className="font-semibold text-sage">{doneTasks.length}</span>{" "}
              件任务。
            </p>
            {(doneBlocks.length > 0 || doneTasks.length > 0) && (
              <ul className="mt-3 space-y-1.5">
                {doneBlocks.map((title, i) => (
                  <li
                    key={`b-${i}`}
                    className="flex items-center gap-2 text-sm text-mist-dim"
                  >
                    <span className="text-sage">✓</span>
                    {title}
                  </li>
                ))}
                {doneTasks.map((t) => (
                  <li
                    key={`t-${t.id}`}
                    className="flex items-center gap-2 text-sm text-mist-dim"
                  >
                    <span className="text-sage">✓</span>
                    <span className="line-through">{t.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* Share today's card → Save to Photos */}
      {!nothingYet && !cardUrl && (
        <button
          onClick={genCard}
          disabled={cardBusy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber/40 bg-amber/10 py-3 text-sm font-medium text-amber active:bg-amber/20 disabled:opacity-60"
        >
          {cardBusy ? "生成中…" : "📷 生成今日卡片 · 存到相册 / 分享"}
        </button>
      )}

      {/* Generated card preview + save */}
      {cardUrl && (
        <div className="mt-3 rounded-2xl border border-ink-line bg-ink-card p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardUrl}
            alt="今日卡片"
            className="w-full rounded-xl border border-ink-line"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() =>
                cardBlob &&
                shareImageBlob(cardBlob, `life-os-${today.date}.png`)
              }
              className="flex-1 rounded-xl bg-mist py-3 text-sm font-semibold text-ink"
            >
              存到相册 / 分享
            </button>
            <button
              onClick={closeCard}
              className="rounded-xl border border-ink-line bg-ink-soft px-5 text-sm text-mist-dim"
            >
              关闭
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-mist-faint">
            手机上点「存到相册」→ 在分享菜单里选「存储图像」
          </p>
        </div>
      )}

      {/* Score row */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Score label="今日" value={today.score} accent />
        <Score label="本周均分" value={weekAvg} />
        <Score label="本月均分" value={monthAvg} />
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-ink-line bg-ink-card py-3">
        <span className="text-sage">🔥</span>
        <span className="numeric text-lg font-semibold text-mist">{streak}</span>
        <span className="text-sm text-mist-faint">天连续达标</span>
      </div>

      {/* Weekly trend */}
      <p className="mb-2 mt-7 text-xs uppercase tracking-widest text-mist-faint">
        本周趋势
      </p>
      <div className="flex h-32 items-end justify-between gap-2 rounded-2xl border border-ink-line bg-ink-card p-4">
        {week
          .slice()
          .reverse()
          .map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-sage/70 transition-all"
                  style={{ height: `${(d.score / maxBar) * 100}%`, minHeight: 2 }}
                />
              </div>
              <span className="numeric text-[9px] text-mist-faint">
                {d.date.slice(5)}
              </span>
            </div>
          ))}
      </div>

      {/* Today checks */}
      <p className="mb-2 mt-7 text-xs uppercase tracking-widest text-mist-faint">
        今日总结
      </p>
      <div className="space-y-2 rounded-2xl border border-ink-line bg-ink-card p-4">
        <Row label="完成番茄钟" value={`${today.pomodorosDone} 个`} />
        <Row label="专注时长" value={`${today.focusMinutes} 分钟`} />
        <Row label="完成任务" value={`${doneTasks.length}/${tasks.length || 0}`} />
        <div className="my-2 h-px bg-ink-line" />
        {checks.map((c) => (
          <div key={c.label} className="flex items-center justify-between">
            <span className="text-sm text-mist-dim">{c.label}</span>
            <span className={c.ok ? "text-sage" : "text-mist-faint"}>
              {c.ok ? "✓" : "—"}
            </span>
          </div>
        ))}
      </div>

      {/* Per-day history — what got finished, by date */}
      {history.length > 0 && (
        <>
          <p className="mb-2 mt-7 text-xs uppercase tracking-widest text-mist-faint">
            历史记录 · 每天完成了什么
          </p>
          <div className="space-y-3">
            {history.map((d) => {
              const dBlocks = (d.completedBlocks ?? [])
                .map((id) => blocks.find((b) => b.id === id)?.title)
                .filter((x): x is string => !!x);
              const dTasks = d.completedTasks ?? [];
              const empty = dBlocks.length === 0 && dTasks.length === 0;
              return (
                <div
                  key={d.date}
                  className="rounded-2xl border border-ink-line bg-ink-card p-4"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="numeric text-sm font-semibold text-mist">
                      {d.date.slice(5)}
                    </span>
                    <span className="numeric text-xs text-mist-faint">
                      {d.score} 分 · {d.pomodorosDone} 🍅
                    </span>
                  </div>
                  {empty ? (
                    <p className="mt-1.5 text-xs text-mist-faint">
                      这天没有完成记录
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {dTasks.map((t, i) => (
                        <li
                          key={`t-${i}`}
                          className="flex items-center gap-2 text-sm text-mist-dim"
                        >
                          <span className="text-sage">✓</span>
                          <span>{t}</span>
                        </li>
                      ))}
                      {dBlocks.map((t, i) => (
                        <li
                          key={`b-${i}`}
                          className="flex items-center gap-2 text-sm text-mist-faint"
                        >
                          <span className="text-sage">·</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Score({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-ink-line bg-ink-card px-3 py-4 text-center">
      <p
        className={`numeric text-2xl font-semibold ${
          accent ? "text-sage" : "text-mist"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] text-mist-faint">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-mist-dim">{label}</span>
      <span className="numeric text-sm text-mist">{value}</span>
    </div>
  );
}
