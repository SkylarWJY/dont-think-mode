import { TimeBlock, Settings, Task } from "./types";
import { nowMinutes } from "./time";

const H = (h: number, m = 0) => h * 60 + m;

/**
 * The fixed daily rhythm — a sensible default standing routine.
 * Work blocks (9–12, 13–18) are pomodoro containers that AI-sorted
 * tasks get slotted into; everything else is a ritual with a checklist.
 */
export function defaultSchedule(s: Settings): TimeBlock[] {
  const wake = s.wakeMinutes; // default 8:00
  const sleep = s.sleepMinutes; // default 22:00

  return [
    {
      id: "morning-upgrade",
      title: "Morning Routine",
      subtitle: "早晨开机",
      type: "routine",
      start: wake,
      end: wake + 30,
      checklist: [
        "起床",
        "喝一杯水",
        "晒太阳 / 活动身体",
        "写下今天最重要的一件事",
      ],
      score: 10,
      cue: "起床，开始 Morning Routine。",
    },
    {
      id: "prep",
      title: "出门准备",
      subtitle: "Get Ready",
      type: "prep",
      start: wake + 30,
      end: wake + 60,
      checklist: ["洗澡", "换衣服", "准备去 office"],
      score: 5,
      cue: "出门准备，洗澡换衣服。",
    },
    {
      id: "work-am",
      title: "Deep Work — Morning",
      subtitle: "上午专注",
      type: "work",
      start: H(9),
      end: H(12),
      pomodoro: true,
      score: 0,
      cue: "进入 Deep Work Mode。",
    },
    {
      id: "lunch",
      title: "Lunch & Recharge",
      subtitle: "午饭充电",
      type: "meal",
      start: H(12),
      end: H(13),
      checklist: ["吃饭", "短暂离开屏幕", "补充水分"],
      score: 5,
      cue: "午饭时间。",
    },
    {
      id: "work-pm",
      title: "Deep Work — Afternoon",
      subtitle: "下午专注",
      type: "work",
      start: H(13),
      end: H(18),
      pomodoro: true,
      score: 0,
      cue: "下午 Deep Work Mode。",
    },
    {
      id: "fitness",
      title: "Fitness & Movement",
      subtitle: "训练时间",
      type: "fitness",
      start: H(18, 30),
      end: H(20),
      score: 40,
      cue: "训练开始。",
    },
    {
      id: "dinner",
      title: "Cook & Eat",
      subtitle: "做饭 + 吃饭",
      type: "meal",
      start: H(20),
      end: H(21),
      checklist: ["做饭 30 分钟", "吃饭 30 分钟"],
      score: 5,
      cue: "做饭吃饭。",
    },
    {
      id: "winddown",
      title: "Wind Down",
      subtitle: "降低刺激，准备休息",
      type: "winddown",
      start: H(21),
      end: sleep,
      checklist: [
        "洗澡",
        "简单拉伸",
        "护肤",
        "复盘今天",
        "准备明天",
        "降低刺激",
      ],
      score: 10,
      cue: "进入 Wind Down Mode。",
    },
    {
      id: "sleep",
      title: "Day Complete",
      subtitle: "睡觉，今天结束",
      type: "sleep",
      start: sleep,
      end: 1440,
      score: 20,
      cue: "睡觉，今天结束。",
    },
  ];
}

/** @deprecated kept as an alias; the live schedule now lives in the store. */
export const buildSchedule = defaultSchedule;

export interface ScheduleState {
  now: TimeBlock | null;
  next: TimeBlock | null;
  /** Minutes remaining in the current block. */
  minutesLeft: number;
  /** 0–1 progress through the current block. */
  progress: number;
  /** True before the first block of the day. */
  beforeDay: boolean;
}

export function resolveSchedule(
  blocks: TimeBlock[],
  min = nowMinutes()
): ScheduleState {
  const sorted = [...blocks].sort((a, b) => a.start - b.start);
  const current = sorted.find((b) => min >= b.start && min < b.end) ?? null;
  const next = sorted.find((b) => b.start > min) ?? null;

  let minutesLeft = 0;
  let progress = 0;
  if (current) {
    minutesLeft = current.end - min;
    progress = (min - current.start) / (current.end - current.start);
  }

  return {
    now: current,
    next,
    minutesLeft,
    progress: Math.min(1, Math.max(0, progress)),
    beforeDay: !current && !!next && min < sorted[0].start,
  };
}

/**
 * Distribute AI-sorted tasks across the available work blocks as pomodoros.
 * Returns a per-block plan: which tasks occupy which work window.
 */
export interface WorkSlot {
  blockId: string;
  blockTitle: string;
  start: number;
  taskId: string;
  taskTitle: string;
  pomodoros: number;
  startMin: number;
  endMin: number;
}

export function packTasksIntoWork(
  tasks: Task[],
  blocks: TimeBlock[],
  focusLen: number,
  breakLen: number
): WorkSlot[] {
  const work = blocks
    .filter((b) => b.pomodoro)
    .sort((a, b) => a.start - b.start);
  const slotMin = focusLen + breakLen;

  const slots: WorkSlot[] = [];
  // cursor per block
  const cursors = work.map((b) => ({ block: b, t: b.start }));

  const ordered = [...tasks].sort((a, b) => a.rank - b.rank);
  for (const task of ordered) {
    if (task.done) continue;
    // Fill work blocks in time order, strictly by priority: your #1 task takes
    // the earliest Deep Work slot, #2 the next, and so on. Timeline order now
    // matches plan priority — no reshuffling by deep/morning flags.
    const target =
      cursors.find((c) => c.t + task.pomodoros * slotMin <= c.block.end) ??
      cursors.find((c) => c.t + slotMin <= c.block.end);
    if (!target) continue;

    const startMin = target.t;
    const endMin = Math.min(
      target.block.end,
      startMin + task.pomodoros * slotMin
    );
    slots.push({
      blockId: target.block.id,
      blockTitle: target.block.title,
      start: target.block.start,
      taskId: task.id,
      taskTitle: task.title,
      pomodoros: task.pomodoros,
      startMin,
      endMin,
    });
    target.t = endMin;
  }
  return slots;
}

export function todaysWorkout(date = new Date()): Task["title"] {
  // simple rotating split keyed on day-of-week
  const map: Record<number, string> = {
    1: "Push Day", // Mon
    2: "Pull Day", // Tue
    3: "Cardio Day", // Wed
    4: "Leg Day", // Thu
    5: "Push Day", // Fri
    6: "Active Recovery", // Sat
    0: "Pull Day", // Sun
  };
  return map[date.getDay()];
}
