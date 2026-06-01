"use client";

import { useEffect } from "react";
import { useLife } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";

const DAY = 86_400_000;
const INTERVAL_DAYS = 7; // auto-export at most once a week

/**
 * Two local-first safeguards, both fire-and-forget on app open:
 *  1. Ask the browser for *persistent* storage so it won't evict our
 *     localStorage under pressure (and resists Safari's idle eviction).
 *  2. Auto-download a JSON backup when the last one is overdue — so a returning
 *     user always has a recent off-device copy without thinking about it.
 * The Settings → 数据备份 panel remains the reliable manual fallback if a
 * browser blocks the programmatic download.
 */
export default function AutoBackup() {
  const hydrated = useHydrated();

  // 1. Request persistent storage (once is enough; browser remembers).
  useEffect(() => {
    const sm = typeof navigator !== "undefined" ? navigator.storage : undefined;
    if (!sm?.persist) return;
    sm.persisted()
      .then((already) => (already ? null : sm.persist()))
      .catch(() => {});
  }, []);

  // 2. Auto-export an overdue backup, once per app open.
  useEffect(() => {
    if (!hydrated) return;
    const s = useLife.getState();
    if (!s.settings.autoBackup) return;

    const hasData =
      s.history.length > 0 ||
      s.tasks.length > 0 ||
      s.today.pomodorosDone > 0 ||
      s.today.completedBlocks.length > 0;
    if (!hasData) return;

    const last = s.lastBackupAt ?? 0;
    if (Date.now() - last < INTERVAL_DAYS * DAY) return;

    try {
      const json = s.exportData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `life-os-auto-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      s.markBackup();
    } catch {
      /* download blocked — the Settings panel reminder will nudge instead */
    }
  }, [hydrated]);

  return null;
}
