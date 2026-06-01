"use client";

import { useEffect, useRef } from "react";
import { useLife } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { resolveSchedule } from "@/lib/schedule";
import { nowMinutes } from "@/lib/time";
import { notify, chime } from "@/lib/notifications";

/**
 * App-wide block-boundary reminders. Mounted once in the layout so they fire
 * on every page — and re-check the instant the PWA becomes visible again.
 *
 * iOS aggressively throttles (or freezes) timers while a PWA is hidden, so the
 * interval alone can miss a boundary; the visibilitychange re-check catches up
 * on resume and tells you which block you should be in *now*.
 *
 * Honest platform limit: iOS does NOT deliver notifications to a *fully closed*
 * PWA without a server-sent Web Push. This covers "app open or freshly resumed".
 */
export default function BlockReminders() {
  const hydrated = useHydrated();
  const schedule = useLife((s) => s.schedule);
  const settings = useLife((s) => s.settings);
  const shiftMinutes = useLife((s) => s.today.shiftMinutes ?? 0);

  // Survives page navigation (component lives in the layout) so we don't
  // re-announce the same block when the user moves between tabs.
  const lastBlockId = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    const check = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      const blocks = schedule.map((b) => ({
        ...b,
        start: b.start + shiftMinutes,
        end: b.end + shiftMinutes,
      }));
      const { now } = resolveSchedule(blocks, nowMinutes());
      const cur = now?.id ?? null;

      // First observation just sets the baseline — never notify on open.
      if (lastBlockId.current === null) {
        lastBlockId.current = cur;
        return;
      }
      if (cur && cur !== lastBlockId.current) {
        const block = blocks.find((b) => b.id === cur);
        if (block) {
          if (settings.notifications) notify("Don't Think Mode", block.cue);
          if (settings.sound) chime();
        }
      }
      lastBlockId.current = cur;
    };

    // Tick often enough to land near the minute boundary while open, and
    // re-check immediately whenever the tab/PWA becomes visible again.
    const id = setInterval(check, 20000);
    const onVisible = () => check();
    document.addEventListener("visibilitychange", onVisible);
    check();

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hydrated, schedule, settings.notifications, settings.sound, shiftMinutes]);

  return null;
}
