"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import { useLife } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { todaysWorkout } from "@/lib/schedule";
import { fmtDuration } from "@/lib/time";
import { chime, notify } from "@/lib/notifications";

const DANCE = ["基本功", "身体控制", "成舞练习"];

export default function FitnessPage() {
  const hydrated = useHydrated();
  const today = useLife((s) => s.today);
  const setFitness = useLife((s) => s.setFitness);
  const setDance = useLife((s) => s.setDance);
  const sound = useLife((s) => s.settings.sound);
  const notifications = useLife((s) => s.settings.notifications);

  if (!hydrated) return <div className="pt-24 text-center text-mist-faint">…</div>;

  const workout = todaysWorkout();
  const isDanceOnly = workout === "Dance Only Day";

  return (
    <div>
      <Header title="Fitness & Dance" sub="训练时间 · 把身体也当作产品来打磨。" />

      <div className="mb-5 rounded-2xl border border-amber/30 bg-amber/5 px-4 py-4 text-center">
        <p className="text-[10px] uppercase tracking-widest text-amber">今日训练</p>
        <p className="mt-1 text-2xl font-semibold text-mist">{workout}</p>
        <p className="mt-1 text-xs text-mist-faint">
          {isDanceOnly ? "跳舞 2 小时" : "健身 1 小时 + 跳舞 1 小时"}
        </p>
      </div>

      {!isDanceOnly && (
        <TrainingTimer
          title="健身"
          minutes={60}
          accent="#c98a8a"
          done={today.fitnessDone}
          onDone={() => setFitness(!today.fitnessDone)}
          sound={sound}
          notifications={notifications}
        />
      )}

      <TrainingTimer
        title="跳舞"
        minutes={isDanceOnly ? 120 : 60}
        accent="#9db8a4"
        done={today.danceDone}
        onDone={() => setDance(!today.danceDone)}
        sound={sound}
        notifications={notifications}
        items={DANCE}
      />
    </div>
  );
}

function TrainingTimer({
  title,
  minutes,
  accent,
  done,
  onDone,
  sound,
  notifications,
  items,
}: {
  title: string;
  minutes: number;
  accent: string;
  done: boolean;
  onDone: () => void;
  sound: boolean;
  notifications: boolean;
  items?: string[];
}) {
  const total = minutes * 60;
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (ref.current) clearInterval(ref.current);
      return;
    }
    ref.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (sound) chime();
          if (notifications) notify(`${title}完成`, "干得漂亮，记得拉伸。");
          setRunning(false);
          onDone();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const progress = 1 - remaining / total;

  return (
    <div className="mb-4 rounded-2xl border border-ink-line bg-ink-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-mist">{title}</p>
          <p className="numeric text-xs text-mist-faint">{minutes} 分钟</p>
        </div>
        <span className="numeric text-3xl font-light text-mist">
          {fmtDuration(remaining)}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-line">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress * 100}%`, background: accent }}
        />
      </div>

      {items && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {items.map((i) => (
            <span
              key={i}
              className="rounded-full border border-ink-line px-2.5 py-1 text-[11px] text-mist-dim"
            >
              {i}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setRunning((r) => !r)}
          className="flex-1 rounded-xl bg-ink-soft py-2.5 text-sm text-mist"
        >
          {running ? "暂停" : "开始"}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setRemaining(total);
          }}
          className="rounded-xl border border-ink-line px-4 text-sm text-mist-dim"
        >
          重置
        </button>
        <button
          onClick={onDone}
          className={`rounded-xl px-4 text-sm font-medium ${
            done
              ? "border border-sage/40 bg-sage/10 text-sage"
              : "bg-mist text-ink"
          }`}
        >
          {done ? "✓ 完成" : "标记完成"}
        </button>
      </div>
    </div>
  );
}
