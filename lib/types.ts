// ─────────────────────────────────────────────────────────────
// Don't Think Mode — domain model
// ─────────────────────────────────────────────────────────────

export type BlockType =
  | "wake"
  | "routine"
  | "prep"
  | "work"
  | "meal"
  | "fitness"
  | "winddown"
  | "sleep";

/** A fixed block in the daily rhythm. Times are minutes-from-midnight. */
export interface TimeBlock {
  id: string;
  title: string;
  subtitle?: string;
  type: BlockType;
  start: number; // minutes from midnight
  end: number; // minutes from midnight
  checklist?: string[]; // sub-tasks shown inside the block
  pomodoro?: boolean; // work blocks run the pomodoro engine
  score: number; // points awarded on completion
  cue: string; // notification copy when this block starts
}

export type GoalTier = "highest" | "high" | "low";

export interface Goal {
  id: string;
  title: string;
  tier: GoalTier;
  weight: number; // 1–10
}

/** A task the user wants to do today, after AI sorting. */
export interface Task {
  id: string;
  title: string;
  rank: number; // 1 = most important
  pomodoros: number; // estimated focus blocks
  reason: string; // AI explanation of the ranking
  deep: boolean; // needs deep focus
  morning: boolean; // best placed in AM
  revenue: boolean;
  product: boolean;
  health: boolean;
  optional: boolean; // can be skipped today
  done: boolean;
  donePomodoros: number;
  carriedOver?: boolean; // rolled over from a previous unfinished day
}

export type WorkoutType = "push" | "pull" | "legs" | "dance";

export interface PomodoroSession {
  id: string;
  taskId?: string;
  taskTitle: string;
  startedAt: number; // epoch ms
  completedAt?: number;
  index: number; // which pomodoro of the day
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  completedBlocks: string[]; // block ids you actually finished (earns score)
  skippedBlocks?: string[]; // block ids you left early — advanced past, NOT completed
  completedTasks?: string[]; // titles of tasks finished this day, for the history log
  pomodorosDone: number;
  focusMinutes: number;
  fitnessDone: boolean;
  danceDone: boolean;
  beautyDone: boolean;
  sleptOnTime: boolean;
  shiftMinutes: number; // today-only schedule offset (running late / ahead)
  score: number;
}

export interface Settings {
  name: string; // optional display name for the greeting; "" hides it
  wakeMinutes: number; // default 480 (8:00)
  sleepMinutes: number; // default 1320 (22:00)
  focusLength: number; // minutes, default 25
  breakLength: number; // minutes, default 5
  longBreakLength: number; // minutes, default 15
  notifications: boolean;
  sound: boolean;
  openaiKey: string; // optional; enables real LLM sorting
  autoBackup: boolean; // auto-download a JSON backup when one is overdue
  theme: "dark" | "light"; // UI theme; default dark
}
