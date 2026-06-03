"use client";

import { useEffect, useState } from "react";
import { useLife } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { shareJSONBackup } from "@/lib/backup";

const NIGHT_MINS = 23 * 60 + 30; // 11:30pm

function sameLocalDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

/**
 * A one-tap "back up to iCloud" prompt that appears after 11:30pm if today
 * hasn't been backed up yet. Paired with an iOS Shortcuts automation that opens
 * the app at 11:30pm, this is the closest a web app can get to a nightly backup
 * — the save itself is a real share-sheet action, so it never fails silently.
 */
export default function NightlyBackup() {
  const hydrated = useHydrated();
  const nightlyBackup = useLife((s) => s.settings.nightlyBackup);
  const lastBackupAt = useLife((s) => s.lastBackupAt);
  const today = useLife((s) => s.today);
  const tasks = useLife((s) => s.tasks);
  const history = useLife((s) => s.history);
  const markBackup = useLife((s) => s.markBackup);

  const [, tick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Re-evaluate the clock each minute and when the app regains focus (e.g.
  // when the Shortcut brings it forward).
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") tick((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!hydrated || !nightlyBackup || dismissed) return null;

  const now = Date.now();
  const mins = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const backedToday = lastBackupAt ? sameLocalDay(lastBackupAt, now) : false;
  const hasData =
    history.length > 0 ||
    tasks.length > 0 ||
    today.pomodorosDone > 0 ||
    today.completedBlocks.length > 0;

  if (mins < NIGHT_MINS || backedToday || !hasData) return null;

  async function backup() {
    setBusy(true);
    const st = useLife.getState();
    const res = await shareJSONBackup(
      st.exportData(),
      `life-os-backup-${st.today.date}.json`
    );
    setBusy(false);
    if (res === "shared" || res === "downloaded") {
      markBackup();
      setDismissed(true);
    }
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[60] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-amber/40 bg-ink-card/95 px-3 py-2.5 shadow-lg backdrop-blur">
        <span className="text-lg">🌙</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-mist">今晚备份</p>
          <p className="truncate text-[11px] text-mist-faint">
            存一份到 iCloud，今天的记录就安全了
          </p>
        </div>
        <button
          onClick={backup}
          disabled={busy}
          className="shrink-0 rounded-full bg-amber px-3.5 py-2 text-xs font-semibold text-ink disabled:opacity-60"
        >
          {busy ? "…" : "存到 iCloud →"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="关闭"
          className="shrink-0 px-1 text-mist-faint"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
