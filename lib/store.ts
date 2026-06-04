"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Goal, Settings, Task, DayLog, PomodoroSession, TimeBlock } from "./types";
import { emptyDayLog, computeScore } from "./score";
import { defaultSchedule } from "./schedule";
import { todayKey } from "./time";

const DEFAULT_SETTINGS: Settings = {
  name: "",
  wakeMinutes: 8 * 60,
  sleepMinutes: 22 * 60,
  focusLength: 25,
  breakLength: 5,
  longBreakLength: 15,
  notifications: true,
  sound: true,
  openaiKey: "",
  autoBackup: true,
  theme: "dark",
  nightlyBackup: true,
};

// Neutral starter goals — edit these in Goals to make them yours. The AI/local
// task sorter weights tasks against whatever goals you set here.
const SEED_GOALS: Goal[] = [
  { id: "g1", title: "Ship the product", tier: "highest", weight: 10 },
  { id: "g2", title: "Grow revenue", tier: "highest", weight: 10 },
  { id: "g3", title: "Talk to users", tier: "highest", weight: 9 },
  { id: "g4", title: "Build the team", tier: "high", weight: 7 },
  { id: "g5", title: "Stay healthy", tier: "high", weight: 7 },
  { id: "g6", title: "Move every day", tier: "high", weight: 6 },
  { id: "g7", title: "Sleep on a schedule", tier: "high", weight: 5 },
];

const SEED_SCHEDULE: TimeBlock[] = defaultSchedule(DEFAULT_SETTINGS);

interface LifeState {
  hydrated: boolean;
  settings: Settings;
  schedule: TimeBlock[];
  goals: Goal[];
  tasks: Task[];
  activeTaskId: string | null; // task the pomodoro currently credits; null = auto-pick top
  planConfirmed: boolean;
  aiSource: "ai" | "local" | null;
  today: DayLog;
  history: DayLog[];
  streak: number;
  sessions: PomodoroSession[];
  lastBackupAt: number | null; // epoch ms of the last export, for backup reminders

  // pomodoro engine — shared across pages, survives navigation + phone-lock
  pomoPhase: PomoPhase;
  pomoRunning: boolean;
  pomoEndsAt: number | null; // epoch ms the running phase ends
  pomoRemaining: number; // seconds; authoritative when paused
  pomoCycle: number; // completed focus blocks this session

  // lifecycle
  ensureToday: () => void;
  hydrate: () => void;

  // backup / restore
  exportData: () => string;
  importData: (raw: string) => { ok: boolean; error?: string };
  markBackup: () => void;

  // settings & goals
  updateSettings: (patch: Partial<Settings>) => void;

  // daily schedule (editable rhythm)
  updateBlock: (id: string, patch: Partial<TimeBlock>) => void;
  addBlock: () => void;
  removeBlock: (id: string) => void;
  resetSchedule: () => void;

  addGoal: (g: Omit<Goal, "id">) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;

  // tasks & plan
  setTasks: (tasks: Task[], source: "ai" | "local") => void;
  appendTasks: (tasks: Task[], source: "ai" | "local") => void;
  addTask: (title: string) => void;
  removeTask: (id: string) => void;
  editTaskTitle: (id: string, title: string) => void;
  setTaskPomodoros: (id: string, delta: -1 | 1) => void;
  reorderTask: (id: string, dir: -1 | 1) => void;
  moveTaskToTop: (id: string) => void;
  setTaskRank: (id: string, newRank: number) => void;
  toggleTaskDone: (id: string) => void;
  toggleTaskOptional: (id: string) => void;
  setTaskProgress: (id: string, progress: number) => void;
  toggleTaskRecurring: (id: string) => void;
  setActiveTask: (id: string | null) => void;
  clearTasks: () => void;
  confirmPlan: () => void;

  // execution
  completeBlock: (blockId: string, score: number) => void;
  uncompleteBlock: (blockId: string) => void;
  skipBlock: (blockId: string) => void;
  unskipBlock: (blockId: string) => void;
  nudgeShift: (deltaMin: number) => void;
  resetShift: () => void;
  recordPomodoro: (taskId: string | undefined, taskTitle: string, minutes: number) => void;

  // pomodoro engine controls
  pomoStart: () => void;
  pomoPause: () => void;
  pomoReset: () => void;
  pomoSkip: () => void;
  pomoComplete: () => void;

  setFitness: (v: boolean) => void;
  setDance: (v: boolean) => void;
  setBeauty: (v: boolean) => void;
  setSleptOnTime: (v: boolean) => void;
}

function recompute(today: DayLog, tasks: Task[]): DayLog {
  return { ...today, score: computeScore(today, tasks) };
}

type PomoPhase = "focus" | "break" | "long";

/** Length of a pomodoro phase in seconds, from settings. */
function pomoLen(phase: PomoPhase, s: Settings): number {
  return (
    (phase === "focus"
      ? s.focusLength
      : phase === "break"
      ? s.breakLength
      : s.longBreakLength) * 60
  );
}

// One-time localStorage key migration. The store key was renamed
// skylar-life-os → dont-think-mode; copy any existing data forward so a
// returning user keeps their goals, history and streak. Runs before persist
// reads the new key, so hydration picks up the migrated payload.
const STORAGE_KEY = "dont-think-mode";
if (typeof window !== "undefined") {
  try {
    const legacy = window.localStorage.getItem("skylar-life-os");
    if (legacy && !window.localStorage.getItem(STORAGE_KEY)) {
      window.localStorage.setItem(STORAGE_KEY, legacy);
    }
  } catch {
    /* private mode / storage disabled — fall back to fresh state */
  }
}

export const useLife = create<LifeState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      settings: DEFAULT_SETTINGS,
      schedule: SEED_SCHEDULE,
      goals: SEED_GOALS,
      tasks: [],
      activeTaskId: null,
      planConfirmed: false,
      aiSource: null,
      today: emptyDayLog(todayKey()),
      history: [],
      streak: 0,
      sessions: [],

      pomoPhase: "focus",
      pomoRunning: false,
      pomoEndsAt: null,
      pomoRemaining: DEFAULT_SETTINGS.focusLength * 60,
      pomoCycle: 0,
      lastBackupAt: null,

      hydrate: () => set({ hydrated: true }),

      exportData: () => {
        const s = get();
        return JSON.stringify(
          {
            app: "dont-think-mode",
            version: 1,
            exportedAt: new Date().toISOString(),
            data: {
              settings: s.settings,
              schedule: s.schedule,
              goals: s.goals,
              tasks: s.tasks,
              planConfirmed: s.planConfirmed,
              aiSource: s.aiSource,
              today: s.today,
              history: s.history,
              streak: s.streak,
              sessions: s.sessions,
            },
          },
          null,
          2
        );
      },

      importData: (raw) => {
        try {
          // Any real import/restore exits the pinned demo clock.
          try {
            localStorage.removeItem("lifeos_demo_clock");
          } catch {}
          const parsed = JSON.parse(raw);
          const d = parsed?.data ?? parsed;
          if (!d || typeof d !== "object")
            return { ok: false, error: "文件格式无法识别" };
          if (!d.settings || !Array.isArray(d.goals))
            return { ok: false, error: "缺少 settings / goals，可能不是 Life OS 备份" };
          set({
            settings: { ...DEFAULT_SETTINGS, ...d.settings },
            schedule:
              Array.isArray(d.schedule) && d.schedule.length > 0
                ? d.schedule
                : SEED_SCHEDULE,
            goals: d.goals,
            tasks: Array.isArray(d.tasks) ? d.tasks : [],
            planConfirmed: !!d.planConfirmed,
            aiSource: d.aiSource ?? null,
            today: d.today ?? emptyDayLog(todayKey()),
            history: Array.isArray(d.history) ? d.history : [],
            streak: typeof d.streak === "number" ? d.streak : 0,
            sessions: Array.isArray(d.sessions) ? d.sessions : [],
          });
          get().ensureToday();
          return { ok: true };
        } catch (e) {
          return { ok: false, error: "JSON 解析失败" };
        }
      },

      markBackup: () => set({ lastBackupAt: Date.now() }),

      ensureToday: () => {
        const { today, history, streak, tasks, settings } = get();
        const key = todayKey();
        if (today.date === key) return;
        // roll over the day
        const hadActivity =
          today.pomodorosDone > 0 || today.completedBlocks.length > 0;
        const newHistory = hadActivity ? [today, ...history].slice(0, 90) : history;
        const continued = hadActivity && today.score >= 60;
        // Carry unfinished tasks into the new day — finished ones are already
        // banked in history. Reset daily progress + re-rank, and tag them so
        // the UI can show they rolled over from yesterday.
        // Recurring tasks reappear fresh every day; other unfinished tasks roll
        // over (tagged so the UI can show they came from yesterday).
        const carried = tasks
          .filter((t) => t.recurring || !t.done)
          .sort((a, b) => a.rank - b.rank)
          .map((t, i) => ({
            ...t,
            rank: i + 1,
            done: false,
            donePomodoros: 0,
            progress: 0,
            optional: false,
            carriedOver: t.recurring ? false : true,
          }));
        set({
          today: emptyDayLog(key),
          history: newHistory,
          streak: continued ? streak + 1 : hadActivity ? 0 : streak,
          tasks: carried,
          activeTaskId: null,
          planConfirmed: false,
          aiSource: null,
          sessions: [],
          pomoPhase: "focus",
          pomoRunning: false,
          pomoEndsAt: null,
          pomoRemaining: pomoLen("focus", settings),
          pomoCycle: 0,
        });
      },

      updateSettings: (patch) =>
        set((s) => {
          const settings = { ...s.settings, ...patch };
          // Keep an idle timer synced to new focus/break lengths.
          const extra = s.pomoRunning
            ? {}
            : { pomoRemaining: pomoLen(s.pomoPhase, settings) };
          return { settings, ...extra };
        }),

      updateBlock: (id, patch) =>
        set((s) => ({
          schedule: s.schedule.map((b) =>
            b.id === id ? { ...b, ...patch } : b
          ),
        })),

      addBlock: () =>
        set((s) => {
          const lastEnd = s.schedule.reduce((m, b) => Math.max(m, b.end), 0);
          const start = Math.min(lastEnd, 1380);
          const block: TimeBlock = {
            id: `blk${Date.now()}`,
            title: "新时间块",
            type: "work",
            start,
            end: Math.min(1440, start + 60),
            score: 5,
            cue: "新时间块开始。",
          };
          return { schedule: [...s.schedule, block] };
        }),

      removeBlock: (id) =>
        set((s) => ({ schedule: s.schedule.filter((b) => b.id !== id) })),

      resetSchedule: () =>
        set((s) => ({ schedule: defaultSchedule(s.settings) })),

      addGoal: (g) =>
        set((s) => ({
          goals: [...s.goals, { ...g, id: `g${Date.now()}` }],
        })),
      updateGoal: (id, patch) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      removeGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      setTasks: (tasks, source) =>
        set({ tasks, aiSource: source, planConfirmed: false }),

      appendTasks: (incoming, source) =>
        set((s) => {
          const existingTitles = new Set(
            s.tasks.map((t) => t.title.trim().toLowerCase())
          );
          const maxRank = s.tasks.reduce((m, x) => Math.max(m, x.rank), 0);
          let r = maxRank;
          const fresh = incoming
            .filter((t) => !existingTitles.has(t.title.trim().toLowerCase()))
            .map((t) => ({ ...t, rank: ++r }));
          if (fresh.length === 0)
            return { aiSource: source, planConfirmed: false };
          return {
            tasks: [...s.tasks, ...fresh],
            aiSource: source,
            planConfirmed: false,
          };
        }),

      addTask: (title) =>
        set((s) => {
          const t = title.trim();
          if (!t) return {};
          const maxRank = s.tasks.reduce((m, x) => Math.max(m, x.rank), 0);
          const task: Task = {
            id: `t${Date.now()}`,
            title: t,
            rank: maxRank + 1,
            pomodoros: 2,
            reason: "手动添加",
            deep: false,
            morning: false,
            revenue: false,
            product: false,
            health: false,
            optional: false,
            done: false,
            donePomodoros: 0,
          };
          return { tasks: [...s.tasks, task], planConfirmed: false };
        }),

      removeTask: (id) =>
        set((s) => {
          const arr = s.tasks
            .filter((t) => t.id !== id)
            .sort((a, b) => a.rank - b.rank);
          arr.forEach((t, k) => (t.rank = k + 1));
          return { tasks: arr, planConfirmed: false };
        }),

      editTaskTitle: (id, title) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, title: title.trim() || t.title } : t
          ),
        })),

      setTaskPomodoros: (id, delta) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, pomodoros: Math.max(1, Math.min(8, t.pomodoros + delta)) }
              : t
          ),
        })),

      reorderTask: (id, dir) =>
        set((s) => {
          const arr = [...s.tasks].sort((a, b) => a.rank - b.rank);
          const i = arr.findIndex((t) => t.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= arr.length) return {};
          [arr[i], arr[j]] = [arr[j], arr[i]];
          arr.forEach((t, k) => (t.rank = k + 1));
          return { tasks: arr };
        }),

      // Set a task's position directly — change the number to 1 and it's first,
      // to 3 and it's third. Everything else re-ranks around it.
      setTaskRank: (id, newRank) =>
        set((s) => {
          const arr = [...s.tasks].sort((a, b) => a.rank - b.rank);
          const from = arr.findIndex((t) => t.id === id);
          if (from < 0) return {};
          const to = Math.max(1, Math.min(arr.length, Math.round(newRank))) - 1;
          const [item] = arr.splice(from, 1);
          arr.splice(to, 0, item);
          const reordered = arr.map((t, k) => ({ ...t, rank: k + 1 }));
          return { tasks: reordered, today: recompute(s.today, reordered) };
        }),

      // Promote a task to #1 in one tap — no more moving it up row by row.
      moveTaskToTop: (id) =>
        set((s) => {
          const arr = [...s.tasks].sort((a, b) => a.rank - b.rank);
          const target = arr.find((t) => t.id === id);
          if (!target) return {};
          const reordered = [target, ...arr.filter((t) => t.id !== id)].map(
            (t, k) => ({ ...t, rank: k + 1 })
          );
          return { tasks: reordered, today: recompute(s.today, reordered) };
        }),

      toggleTaskDone: (id) =>
        set((s) => {
          const target = s.tasks.find((t) => t.id === id);
          if (!target) return {};
          const nowDone = !target.done;
          const tasks = s.tasks.map((t) =>
            t.id === id ? { ...t, done: nowDone } : t
          );
          // Keep a per-day log of finished task titles so Review can show, by
          // date, exactly what got done.
          const prev = s.today.completedTasks ?? [];
          const completedTasks = nowDone
            ? prev.includes(target.title)
              ? prev
              : [...prev, target.title]
            : prev.filter((t) => t !== target.title);
          // Finishing the focused task drops the manual pick so focus rolls on.
          const activeTaskId =
            nowDone && s.activeTaskId === id ? null : s.activeTaskId;
          return {
            tasks,
            activeTaskId,
            today: recompute({ ...s.today, completedTasks }, tasks),
          };
        }),

      toggleTaskOptional: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, optional: !t.optional } : t
          ),
        })),

      setTaskProgress: (id, progress) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, progress: Math.max(0, Math.min(100, Math.round(progress))) }
              : t
          ),
        })),

      toggleTaskRecurring: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, recurring: !t.recurring } : t
          ),
        })),

      // Pick which task the pomodoro credits. Changing this does NOT touch the
      // running timer — it keeps ticking; you're just re-pointing the credit.
      setActiveTask: (id) => set({ activeTaskId: id }),

      clearTasks: () =>
        set({ tasks: [], activeTaskId: null, planConfirmed: false, aiSource: null }),

      confirmPlan: () => set({ planConfirmed: true }),

      completeBlock: (blockId, score) =>
        set((s) => {
          if (s.today.completedBlocks.includes(blockId)) return {};
          const today = {
            ...s.today,
            completedBlocks: [...s.today.completedBlocks, blockId],
            // completing and "moved on early" are mutually exclusive
            skippedBlocks: (s.today.skippedBlocks ?? []).filter((b) => b !== blockId),
          };
          if (blockId === "fitness") today.fitnessDone = true;
          if (blockId === "sleep") today.sleptOnTime = true;
          if (blockId === "morning-upgrade") today.beautyDone = true;
          return { today: recompute(today, s.tasks) };
        }),

      uncompleteBlock: (blockId) =>
        set((s) => {
          const today = {
            ...s.today,
            completedBlocks: s.today.completedBlocks.filter((b) => b !== blockId),
          };
          if (blockId === "fitness") today.fitnessDone = false;
          if (blockId === "sleep") today.sleptOnTime = false;
          if (blockId === "morning-upgrade") today.beautyDone = false;
          return { today: recompute(today, s.tasks) };
        }),

      // Move on to the next block early WITHOUT marking it done. No score, not
      // counted as completed — it just advances the "Now" view to what's next.
      skipBlock: (blockId) =>
        set((s) => {
          const skipped = s.today.skippedBlocks ?? [];
          if (skipped.includes(blockId)) return {};
          return {
            today: {
              ...s.today,
              skippedBlocks: [...skipped, blockId],
              // never let a skipped block also read as completed
              completedBlocks: s.today.completedBlocks.filter((b) => b !== blockId),
            },
          };
        }),

      unskipBlock: (blockId) =>
        set((s) => ({
          today: {
            ...s.today,
            skippedBlocks: (s.today.skippedBlocks ?? []).filter((b) => b !== blockId),
          },
        })),

      nudgeShift: (deltaMin) =>
        set((s) => {
          const cur = s.today.shiftMinutes ?? 0;
          const next = Math.max(-180, Math.min(600, cur + deltaMin));
          return { today: { ...s.today, shiftMinutes: next } };
        }),

      resetShift: () =>
        set((s) => ({ today: { ...s.today, shiftMinutes: 0 } })),

      recordPomodoro: (taskId, taskTitle, minutes) =>
        set((s) => {
          const today = {
            ...s.today,
            pomodorosDone: s.today.pomodorosDone + 1,
            focusMinutes: s.today.focusMinutes + minutes,
          };
          const tasks = taskId
            ? s.tasks.map((t) =>
                t.id === taskId
                  ? { ...t, donePomodoros: t.donePomodoros + 1 }
                  : t
              )
            : s.tasks;
          const session: PomodoroSession = {
            id: `p${Date.now()}`,
            taskId,
            taskTitle,
            startedAt: Date.now() - minutes * 60000,
            completedAt: Date.now(),
            index: today.pomodorosDone,
          };
          return {
            today: recompute(today, tasks),
            tasks,
            sessions: [session, ...s.sessions].slice(0, 200),
          };
        }),

      pomoStart: () =>
        set((s) => {
          if (s.pomoRunning) return {};
          const rem =
            s.pomoRemaining > 0
              ? s.pomoRemaining
              : pomoLen(s.pomoPhase, s.settings);
          return {
            pomoRunning: true,
            pomoRemaining: rem,
            pomoEndsAt: Date.now() + rem * 1000,
          };
        }),

      pomoPause: () =>
        set((s) => {
          if (!s.pomoRunning) return {};
          const rem = s.pomoEndsAt
            ? Math.max(0, Math.round((s.pomoEndsAt - Date.now()) / 1000))
            : s.pomoRemaining;
          return { pomoRunning: false, pomoEndsAt: null, pomoRemaining: rem };
        }),

      pomoReset: () =>
        set((s) => ({
          pomoRunning: false,
          pomoEndsAt: null,
          pomoRemaining: pomoLen(s.pomoPhase, s.settings),
        })),

      pomoSkip: () => get().pomoComplete(),

      // Advance to the next phase. On a finished focus block, bank the pomodoro
      // against the current top task. Auto-continues into the next phase.
      pomoComplete: () =>
        set((s) => {
          const now = Date.now();
          if (s.pomoPhase === "focus") {
            // Credit the task the user is focused on (if they picked one and it's
            // still active); otherwise fall back to the top task by rank.
            const active = s.tasks.find(
              (t) => t.id === s.activeTaskId && !t.done && !t.optional
            );
            const top =
              active ??
              [...s.tasks]
                .sort((a, b) => a.rank - b.rank)
                .find((t) => !t.done && !t.optional);
            const today0 = {
              ...s.today,
              pomodorosDone: s.today.pomodorosDone + 1,
              focusMinutes: s.today.focusMinutes + s.settings.focusLength,
            };
            // Bank the pomodoro against the task — but NEVER auto-mark it done.
            // Reaching the estimate just means it's full (e.g. 4/3 🍅); only the
            // user marks a task complete.
            const tasks = top
              ? s.tasks.map((t) =>
                  t.id === top.id
                    ? { ...t, donePomodoros: t.donePomodoros + 1 }
                    : t
                )
              : s.tasks;
            const session: PomodoroSession = {
              id: `p${now}`,
              taskId: top?.id,
              taskTitle: top?.title ?? "Deep Work",
              startedAt: now - s.settings.focusLength * 60000,
              completedAt: now,
              index: today0.pomodorosDone,
            };
            const newCycle = s.pomoCycle + 1;
            const next: PomoPhase = newCycle % 4 === 0 ? "long" : "break";
            const len = pomoLen(next, s.settings);
            return {
              today: recompute(today0, tasks),
              tasks,
              activeTaskId: s.activeTaskId,
              sessions: [session, ...s.sessions].slice(0, 200),
              pomoPhase: next,
              pomoCycle: newCycle,
              pomoRunning: true,
              pomoRemaining: len,
              pomoEndsAt: now + len * 1000,
            };
          }
          // break / long → back to focus
          const len = pomoLen("focus", s.settings);
          return {
            pomoPhase: "focus",
            pomoRunning: true,
            pomoRemaining: len,
            pomoEndsAt: now + len * 1000,
          };
        }),

      setFitness: (v) =>
        set((s) => ({ today: recompute({ ...s.today, fitnessDone: v }, s.tasks) })),
      setDance: (v) =>
        set((s) => ({ today: recompute({ ...s.today, danceDone: v }, s.tasks) })),
      setBeauty: (v) =>
        set((s) => ({ today: recompute({ ...s.today, beautyDone: v }, s.tasks) })),
      setSleptOnTime: (v) =>
        set((s) => ({ today: recompute({ ...s.today, sleptOnTime: v }, s.tasks) })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (s) => ({
        settings: s.settings,
        schedule: s.schedule,
        goals: s.goals,
        tasks: s.tasks,
        activeTaskId: s.activeTaskId,
        planConfirmed: s.planConfirmed,
        aiSource: s.aiSource,
        today: s.today,
        history: s.history,
        streak: s.streak,
        sessions: s.sessions,
        pomoPhase: s.pomoPhase,
        pomoRunning: s.pomoRunning,
        pomoEndsAt: s.pomoEndsAt,
        pomoRemaining: s.pomoRemaining,
        pomoCycle: s.pomoCycle,
        lastBackupAt: s.lastBackupAt,
      }),
      onRehydrateStorage: () => (state) => {
        // Migrate users persisted before the schedule became editable.
        if (state && (!state.schedule || state.schedule.length === 0)) {
          state.schedule = defaultSchedule(state.settings ?? DEFAULT_SETTINGS);
        }
        // Default auto-backup on for users persisted before it existed.
        if (state?.settings && state.settings.autoBackup === undefined) {
          state.settings.autoBackup = true;
        }
        // Default theme for users persisted before light mode existed.
        if (state?.settings && state.settings.theme === undefined) {
          state.settings.theme = "dark";
        }
        // Default nightly backup on for users persisted before it existed.
        if (state?.settings && state.settings.nightlyBackup === undefined) {
          state.settings.nightlyBackup = true;
        }
        state?.hydrate();
        state?.ensureToday();
      },
    }
  )
);
