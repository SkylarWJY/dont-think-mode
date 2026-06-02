"use client";

import { useEffect } from "react";

/**
 * Local-first safeguard, fire-and-forget on app open: ask the browser for
 * *persistent* storage so it won't evict our localStorage under pressure (and
 * resists Safari's idle eviction).
 *
 * Note: we deliberately do NOT auto-download JSON backups — that quietly piled
 * files into ~/Downloads and confused more than it helped. Backups are now
 * explicit: Settings → 数据备份 → 导出备份 (which on a phone saves to Files /
 * iCloud and feeds the Obsidian sync).
 */
export default function AutoBackup() {
  useEffect(() => {
    const sm = typeof navigator !== "undefined" ? navigator.storage : undefined;
    if (!sm?.persist) return;
    sm.persisted()
      .then((already) => (already ? null : sm.persist()))
      .catch(() => {});
  }, []);

  return null;
}
