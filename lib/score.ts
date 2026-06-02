import { DayLog, Task } from "./types";

// Scoring philosophy (set by the user):
//   1. Finishing the daily routine and 2. the number of tasks done are the
//   backbone of the score. 3. The day's #1 task (the priority-goal task) is
//   worth a big bonus.
export const POINTS = {
  morningRoutine: 15,
  fitness: 15,
  sleepOnTime: 15,
  dance: 10,
  taskDone: 8, // each completed task
  topTask: 25, // the day's #1 — the priority-goal task
};

export function emptyDayLog(date: string): DayLog {
  return {
    date,
    completedBlocks: [],
    skippedBlocks: [],
    completedTasks: [],
    pomodorosDone: 0,
    focusMinutes: 0,
    fitnessDone: false,
    danceDone: false,
    beautyDone: false,
    sleptOnTime: false,
    shiftMinutes: 0,
    score: 0,
  };
}

/** Points from the daily routine alone (the binary rituals). */
function routinePoints(log: DayLog): number {
  let s = 0;
  if (log.completedBlocks.includes("morning-upgrade")) s += POINTS.morningRoutine;
  if (log.fitnessDone) s += POINTS.fitness;
  if (log.sleptOnTime) s += POINTS.sleepOnTime;
  if (log.danceDone) s += POINTS.dance;
  return s;
}

/**
 * Recompute the live score from the day's activity:
 *   routine rituals + (tasks done × 8) + (the #1 task → +25).
 */
export function computeScore(log: DayLog, tasks: Task[]): number {
  const doneCount = tasks.filter((t) => t.done).length;
  const topTaskDone = tasks.find((t) => t.rank === 1)?.done ?? false;
  return (
    routinePoints(log) +
    doneCount * POINTS.taskDone +
    (topTaskDone ? POINTS.topTask : 0)
  );
}

export interface ScoreLever {
  key: "morning" | "topTask" | "fitness" | "dance" | "sleep";
  label: string;
  points: number;
  done: boolean;
}

/** The big binary levers that move today's score — for "do this to level up". */
export function scoreLevers(log: DayLog, topTaskDone: boolean): ScoreLever[] {
  return [
    {
      key: "topTask",
      label: "完成第一要务 · 优先目标",
      points: POINTS.topTask,
      done: topTaskDone,
    },
    {
      key: "morning",
      label: "早起 Routine",
      points: POINTS.morningRoutine,
      done: log.completedBlocks.includes("morning-upgrade"),
    },
    { key: "fitness", label: "健身", points: POINTS.fitness, done: log.fitnessDone },
    { key: "sleep", label: "准时睡", points: POINTS.sleepOnTime, done: log.sleptOnTime },
    { key: "dance", label: "跳舞", points: POINTS.dance, done: log.danceDone },
  ];
}

/** A rough 0–100 productivity score from focus + completion. */
export function productivityScore(log: DayLog, topTaskDone: boolean): number {
  const focus = Math.min(50, log.focusMinutes / 6); // 300 focus min → 50
  const ritual =
    (log.completedBlocks.includes("morning-upgrade") ? 12 : 0) +
    (log.fitnessDone ? 12 : 0) +
    (log.danceDone ? 8 : 0) +
    (log.sleptOnTime ? 10 : 0) +
    (topTaskDone ? 8 : 0);
  return Math.round(Math.min(100, focus + ritual));
}
