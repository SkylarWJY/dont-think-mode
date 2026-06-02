#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Don't Think Mode → Obsidian
// Turn a Life OS backup JSON into one daily-summary note per day,
// filed under <vault>/40_journal/life-os/YYYY-MM-DD.md.
//
// The app is local-first (browser localStorage). You export a JSON
// from the app (Settings → 数据备份 → 导出备份); on a phone that saves
// to Files / iCloud. This script reads the newest such file and
// renders Markdown into the Obsidian vault — no browser permissions.
//
// Usage:
//   node scripts/to-obsidian.mjs                 # newest backup → default vault
//   node scripts/to-obsidian.mjs path/to.json    # explicit backup file
//   LIFEOS_VAULT=/path/to/Vault node scripts/to-obsidian.mjs
//   LIFEOS_BACKUP_DIR=/path node scripts/to-obsidian.mjs   # override search dir
//
// Where it looks for backups (newest wins, across all):
//   1. iCloud Drive › LifeOS  (the phone's "Save to Files" drop folder)
//   2. ~/Downloads            (desktop browser exports)
//
// Notes:
//   • Writes ONLY into 40_journal/life-os/ — never touches your
//     hand-written daily notes in 40_journal/daily/.
//   • Idempotent: re-running overwrites the same dated notes.
//   • Sessions reset on day rollover, so the per-pomodoro list and
//     finished-task titles appear on the *today* note only; past
//     days show the banked DayLog stats.
// ─────────────────────────────────────────────────────────────

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HOME = os.homedir();
const VAULT = process.env.LIFEOS_VAULT || path.join(HOME, "Desktop", "Skylar");
const OUT_DIR = path.join(VAULT, "40_journal", "life-os");
const ICLOUD_ROOT = path.join(
  HOME,
  "Library",
  "Mobile Documents",
  "com~apple~CloudDocs"
);
const ICLOUD = path.join(ICLOUD_ROOT, "LifeOS");
const DOWNLOADS = path.join(HOME, "Downloads");
// Scan the iCloud Drive root too — iOS "Save to Files" often drops the export
// there rather than inside the LifeOS subfolder, and we don't want to miss it.
const SEARCH_DIRS = process.env.LIFEOS_BACKUP_DIR
  ? [process.env.LIFEOS_BACKUP_DIR]
  : [ICLOUD, ICLOUD_ROOT, DOWNLOADS];

// ── 1. Locate the backup JSON ───────────────────────────────
function newestBackup() {
  const explicit = process.argv[2];
  if (explicit) {
    if (!fs.existsSync(explicit)) die(`找不到文件：${explicit}`);
    return explicit;
  }
  const candidates = SEARCH_DIRS.filter((d) => fs.existsSync(d))
    .flatMap((dir) =>
      fs
        .readdirSync(dir)
        .filter((f) => /^life-os-.*\.json$/i.test(f))
        .map((f) => {
          const full = path.join(dir, f);
          return { full, mtime: fs.statSync(full).mtimeMs };
        })
    )
    .sort((a, b) => b.mtime - a.mtime);
  if (candidates.length === 0)
    die(
      `没找到 life-os-*.json 备份。找过这些位置：\n` +
        SEARCH_DIRS.map((d) => `  · ${d}`).join("\n") +
        `\n手机上：打开 App → Settings → 数据备份 →「↓ 导出备份」→ 存到 iCloud › LifeOS。`
    );
  return candidates[0].full;
}

function die(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

// ── 2. Parse + normalize ────────────────────────────────────
const file = newestBackup();
let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  die(`无法解析 JSON：${file}\n${e.message}`);
}
const data = parsed?.data ?? parsed;
if (!data || typeof data !== "object" || !Array.isArray(data.history))
  die(`这看起来不是 Life OS 备份：${file}`);

const schedule = Array.isArray(data.schedule) ? data.schedule : [];
const blockTitle = new Map(schedule.map((b) => [b.id, b.title]));
const today = data.today && data.today.date ? data.today : null;
const history = data.history.filter((d) => d && d.date);
const sessions = Array.isArray(data.sessions) ? data.sessions : [];
const tasks = Array.isArray(data.tasks) ? data.tasks : [];
const streak = Number.isFinite(data.streak) ? data.streak : null;

// ── 3. Render one note per day ──────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
const clock = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const check = (ok) => (ok ? "✓" : "—");

function renderDay(day, isToday) {
  const doneBlocks = (day.completedBlocks || [])
    .map((id) => blockTitle.get(id))
    .filter(Boolean);

  const fm = [
    "---",
    `date: ${day.date}`,
    "source: dont-think-mode",
    `score: ${day.score ?? 0}`,
    `pomodoros: ${day.pomodorosDone ?? 0}`,
    `focus_minutes: ${day.focusMinutes ?? 0}`,
    isToday && streak != null ? `streak: ${streak}` : null,
    "tags: [life-os/daily]",
    "---",
  ].filter((l) => l != null);

  const lines = [...fm, ""];
  lines.push(`# ${day.date} · Life OS 小结`);
  lines.push("");
  const streakTxt =
    isToday && streak != null ? ` · 🔥 连续 ${streak} 天达标` : "";
  lines.push(`**得分 ${day.score ?? 0}**${streakTxt}`);
  lines.push("");

  // What got finished
  const doneTasks = isToday ? tasks.filter((t) => t.done) : [];
  if (doneBlocks.length || doneTasks.length) {
    lines.push("## 完成");
    for (const t of doneBlocks) lines.push(`- ✓ ${t}`);
    for (const t of doneTasks) lines.push(`- ✓ ~~${t.title}~~`);
    lines.push("");
  }

  // Today's pomodoro log (sessions exist for today only)
  if (isToday) {
    const todays = sessions
      .filter((s) => s.completedAt && sameDay(s.startedAt, day.date))
      .sort((a, b) => a.startedAt - b.startedAt);
    if (todays.length) {
      lines.push("## 今日番茄");
      for (const s of todays)
        lines.push(`- ${clock(s.startedAt)} · ${s.taskTitle || "专注"}`);
      lines.push("");
    }
  }

  // Stats + daily checks
  lines.push("## 数据");
  lines.push(`- 番茄钟：${day.pomodorosDone ?? 0} 个`);
  lines.push(`- 专注时长：${day.focusMinutes ?? 0} 分钟`);
  lines.push(
    `- 健身 ${check(day.fitnessDone)} · 跳舞 ${check(day.danceDone)} · ` +
      `晨间养护 ${check(day.beautyDone)} · 准时睡觉 ${check(day.sleptOnTime)}`
  );
  lines.push("");

  return lines.join("\n");
}

function sameDay(ms, dateStr) {
  const d = new Date(ms);
  const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return key === dateStr;
}

// ── 4. Write ────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });

const days = [];
// Only write today if it actually has activity, mirroring the app's
// rollover rule (no empty placeholder notes).
if (
  today &&
  (today.pomodorosDone > 0 ||
    (today.completedBlocks || []).length > 0 ||
    today.score > 0)
)
  days.push([today, true]);
for (const d of history) days.push([d, false]);

let written = 0;
for (const [day, isToday] of days) {
  const out = path.join(OUT_DIR, `${day.date}.md`);
  fs.writeFileSync(out, renderDay(day, isToday), "utf8");
  written++;
}

const rel = path.relative(HOME, OUT_DIR).replace(/^/, "~/");
console.log(`\n✓ 导出 ${written} 天小结 → ${rel}`);
console.log(`  来源备份：${path.relative(HOME, file).replace(/^/, "~/")}\n`);
