"use client";

import { useEffect } from "react";
import { useLife } from "@/lib/store";
import { resolveSchedule } from "@/lib/schedule";
import { nowMinutes } from "@/lib/time";
import { chime, notify, primeAudio } from "@/lib/notifications";

/**
 * Drives the shared pomodoro engine. Mounted once in the layout so the timer
 * advances (focus → break → focus) regardless of which page you're on — and
 * survives navigation and phone-lock, since the engine is timestamp-based in
 * the store.
 *
 * Two jobs, on one always-on 1s tick:
 *  1. Fire the chime + notification when a phase completes.
 *  2. Auto-start focus the moment you're inside a Deep Work block, so the
 *     countdown is always visibly running — "时间一直在走" — with no idle
 *     "点击开始" state. A deliberate mid-focus pause leaves a partial
 *     remaining, so it is NOT clobbered; only a fresh/full focus auto-starts.
 */
export default function PomoEngine() {
  // Keep the audio output unlocked so the timer-fired chime can actually
  // play. iOS suspends the AudioContext on background / lock, so re-prime it
  // on every interaction and whenever the tab regains focus.
  useEffect(() => {
    const wake = () => primeAudio();
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const st = useLife.getState();

      // 1. Phase completion → bank + chime + notify.
      if (st.pomoRunning && st.pomoEndsAt != null && Date.now() >= st.pomoEndsAt) {
        const wasFocus = st.pomoPhase === "focus";
        const doneBefore = st.today.pomodorosDone;
        st.pomoComplete();
        const after = useLife.getState();
        if (after.settings.sound) chime();
        if (after.settings.notifications) {
          if (wasFocus) {
            notify("番茄钟完成", `休息一下 · 已完成 ${doneBefore + 1} 个`);
          } else {
            notify("休息结束", "回到专注。");
          }
        }
        return; // state just changed; pick it up next tick
      }

      // 2. Auto-start focus when inside an active Deep Work block.
      if (!st.pomoRunning && st.pomoPhase === "focus") {
        const fresh = st.pomoRemaining === st.settings.focusLength * 60;
        if (!fresh) return; // a deliberate pause left a partial — respect it
        const shift = st.today.shiftMinutes ?? 0;
        const blocks = st.schedule.map((b) => ({
          ...b,
          start: b.start + shift,
          end: b.end + shift,
        }));
        const cur = resolveSchedule(blocks, nowMinutes()).now;
        const inWork =
          !!cur?.pomodoro && !st.today.completedBlocks.includes(cur.id);
        if (inWork) st.pomoStart();
      }
    };

    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, []);

  return null;
}
