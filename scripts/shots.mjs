// One-off screenshot capture for the README. Not part of the app.
// Drives system Chrome via puppeteer-core, injects a clean DEMO state into
// localStorage, and saves crisp 2x retina PNGs. Run: node scripts/shots.mjs
import puppeteer from "puppeteer-core";

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:4318";
const OUT = "docs/screenshots";

// today's key in local time (must match the app's todayKey so it doesn't roll)
const d = new Date();
const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
  2,
  "0"
)}-${String(d.getDate()).padStart(2, "0")}`;

const mk = (id, title, rank, pomodoros, donePomodoros, done, opts = {}) => ({
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
  ...opts,
});

const demo = {
  state: {
    settings: {
      name: "",
      wakeMinutes: 480,
      sleepMinutes: 1320,
      focusLength: 25,
      breakLength: 5,
      longBreakLength: 15,
      notifications: true,
      sound: true,
      openaiKey: "",
    },
    schedule: [], // empty → app regenerates the neutral default rhythm
    goals: [
      { id: "g1", title: "Ship the product", tier: "highest", weight: 10 },
      { id: "g2", title: "Grow revenue", tier: "highest", weight: 10 },
      { id: "g3", title: "Talk to users", tier: "highest", weight: 9 },
      { id: "g4", title: "Build the team", tier: "high", weight: 7 },
      { id: "g5", title: "Stay healthy", tier: "high", weight: 7 },
      { id: "g6", title: "Move every day", tier: "high", weight: 6 },
      { id: "g7", title: "Sleep on a schedule", tier: "high", weight: 5 },
    ],
    tasks: [
      mk("d1", "给 10 个潜在用户发消息", 1, 3, 1, false, { revenue: true }),
      mk("d2", "写产品落地页第一版", 2, 2, 0, false, {
        product: true,
        deep: true,
        morning: true,
      }),
      mk("d3", "录一条 90 秒产品 demo", 3, 2, 0, false, { product: true }),
      mk("d4", "回复本周用户反馈", 4, 1, 1, true, {}),
      mk("d5", "整理下周计划", 5, 1, 0, false, { optional: true }),
    ],
    planConfirmed: true,
    aiSource: "ai",
    today: {
      date: todayKey,
      completedBlocks: ["morning-upgrade"],
      pomodorosDone: 3,
      focusMinutes: 75,
      fitnessDone: false,
      danceDone: false,
      beautyDone: true,
      sleptOnTime: false,
      shiftMinutes: 0,
      score: 35,
    },
    history: [],
    streak: 6,
    sessions: [],
    pomoPhase: "focus",
    pomoRunning: true,
    pomoEndsAt: Date.now() + 1180 * 1000,
    pomoRemaining: 1180,
    pomoCycle: 3,
  },
  version: 1,
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 },
  args: ["--hide-scrollbars", "--force-color-profile=srgb"],
});

const page = await browser.newPage();
// seed localStorage before any app code runs
await page.evaluateOnNewDocument((payload) => {
  localStorage.setItem("dont-think-mode", payload);
}, JSON.stringify(demo));

const shots = [
  ["/", "today.png"],
  ["/plan", "plan.png"],
  ["/pomodoro", "focus.png"],
  ["/review", "review.png"],
];

for (const [path, file] of shots) {
  await page.goto(BASE + path, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 700)); // let the ring + tick settle
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${OUT}/${file}`, type: "png" });
  console.log("captured", file);
}

await browser.close();
console.log("done");
