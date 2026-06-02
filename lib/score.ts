import { DayLog } from "./types";

export const POINTS = {
  wakeOnTime: 10,
  morningRoutine: 10,
  pomodoro: 5,
  topTask: 20,
  fitness: 20,
  dance: 20,
  sleepOnTime: 20,
};

export function emptyDayLog(date: string): DayLog {
  return {
    date,
    completedBlocks: [],
    skippedBlocks: [],
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

/** Recompute the live score from the day's activity. */
export function computeScore(log: DayLog, topTaskDone: boolean): number {
  let s = 0;
  if (log.completedBlocks.includes("morning-upgrade")) {
    s += POINTS.wakeOnTime + POINTS.morningRoutine;
  }
  s += log.pomodorosDone * POINTS.pomodoro;
  if (topTaskDone) s += POINTS.topTask;
  if (log.fitnessDone) s += POINTS.fitness;
  if (log.danceDone) s += POINTS.dance;
  if (log.sleptOnTime) s += POINTS.sleepOnTime;
  return s;
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
      key: "morning",
      label: "早起 Routine",
      points: POINTS.wakeOnTime + POINTS.morningRoutine,
      done: log.completedBlocks.includes("morning-upgrade"),
    },
    { key: "topTask", label: "完成第一要务", points: POINTS.topTask, done: topTaskDone },
    { key: "fitness", label: "健身", points: POINTS.fitness, done: log.fitnessDone },
    { key: "dance", label: "跳舞", points: POINTS.dance, done: log.danceDone },
    { key: "sleep", label: "准时睡", points: POINTS.sleepOnTime, done: log.sleptOnTime },
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
