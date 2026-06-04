import { todayKey } from "./time";

// A self-contained, GENERIC demo dataset for showing the app off — no personal
// data, safe to ship. Dates are computed relative to "now" so every demo looks
// fresh. Load it from Settings → 演示模式.

function dayKey(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return todayKey(d);
}

function task(
  id: string,
  title: string,
  rank: number,
  pomodoros: number,
  done: boolean,
  donePomodoros: number,
  flags: Partial<Record<"deep" | "morning" | "revenue" | "product" | "health", boolean>> = {}
) {
  return {
    id,
    title,
    rank,
    pomodoros,
    donePomodoros,
    done,
    reason: "",
    deep: false,
    morning: false,
    revenue: false,
    product: false,
    health: false,
    optional: false,
    carriedOver: false,
    ...flags,
  };
}

function dayLog(
  date: string,
  score: number,
  pomos: number,
  focus: number,
  blocks: string[],
  tasks: string[]
) {
  return {
    date,
    completedBlocks: blocks,
    skippedBlocks: [],
    completedTasks: tasks,
    pomodorosDone: pomos,
    focusMinutes: focus,
    fitnessDone: false,
    danceDone: false,
    beautyDone: false,
    sleptOnTime: false,
    shiftMinutes: 0,
    score,
  };
}

/** Build a fresh demo export JSON (string) — feed straight to importData. */
export function buildDemoExport(): string {
  const data = {
    settings: {
      name: "Alex",
      wakeMinutes: 480,
      sleepMinutes: 1320,
      focusLength: 25,
      breakLength: 5,
      longBreakLength: 15,
      notifications: true,
      sound: true,
      openaiKey: "",
      autoBackup: false,
      theme: "dark",
      nightlyBackup: false,
    },
    schedule: [], // empty → importData falls back to the default schedule
    goals: [
      { id: "g1", title: "Ship the product", tier: "highest", weight: 10 },
      { id: "g2", title: "Grow revenue", tier: "highest", weight: 10 },
      { id: "g3", title: "Talk to users", tier: "highest", weight: 9 },
      { id: "g4", title: "Build the team", tier: "high", weight: 7 },
      { id: "g5", title: "Stay healthy", tier: "high", weight: 6 },
    ],
    tasks: [
      task("d1", "Ship the new onboarding flow", 1, 3, false, 1, { deep: true, product: true }),
      task("d2", "Record a 2-min product demo", 2, 2, false, 0, { product: true }),
      task("d3", "Reply to 5 customer emails", 3, 1, true, 1, { revenue: true }),
      task("d4", "Fix the signup bug", 4, 2, true, 2, { product: true }),
      task("d5", "Prep the investor update", 5, 2, false, 0, { revenue: true }),
      task("d6", "Review open pull requests", 6, 1, false, 0, { product: true }),
    ],
    activeTaskId: null,
    planConfirmed: true,
    aiSource: "ai",
    today: dayLog(dayKey(0), 75, 5, 125, ["morning-upgrade"], [
      "Reply to 5 customer emails",
      "Fix the signup bug",
    ]),
    history: [
      dayLog(dayKey(1), 92, 9, 225, ["morning-upgrade", "prep", "work-pm"], [
        "Closed the Acme deal",
        "Shipped dark mode",
        "Wrote the launch post",
      ]),
      dayLog(dayKey(2), 64, 5, 125, ["morning-upgrade"], [
        "Customer interviews ×3",
        "Polished onboarding copy",
      ]),
      dayLog(dayKey(3), 88, 8, 200, ["morning-upgrade", "work-pm"], [
        "Refactored the API",
        "Demo to 2 design partners",
      ]),
      dayLog(dayKey(4), 45, 3, 75, [], ["Replied to investors"]),
      dayLog(dayKey(5), 80, 7, 175, ["morning-upgrade", "prep"], [
        "Pricing page v2",
        "Onboarded a new user",
      ]),
    ],
    streak: 4,
    sessions: [],
  };
  return JSON.stringify({
    app: "dont-think-mode",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  });
}
