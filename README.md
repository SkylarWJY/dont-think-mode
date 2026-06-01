<div align="center">

# 🧠 Don't Think Mode

### The anti-productivity app for ADHD founders.

**Open it. Don't think. Just execute.**

![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square)
![Local-first](https://img.shields.io/badge/local--first-no%20account-9db8a4?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

**English** · [中文](./README.zh-CN.md)

</div>

---

## The problem

Every productivity app you've ever tried hands you *more* decisions. Which list? Which view? What's next? Reorder, re-plan, re-prioritize. For an ADHD brain at 2pm, that friction isn't a feature — it's exactly where the day quietly dies.

You don't need another place to **organize** your life. You need something that just tells you what to do **right now** — while the clock is already ticking.

## The answer

Don't Think Mode shows you **one thing**: what's happening now, and how much time is left.

That's the entire home screen. No inbox. No backlog. No "where do I even start."

And the moment you step into a focus block — **the timer is already running.** There is no start button. That feeling that time is moving *with or without you*? That's not a bug. That's the whole product.

## Why it works for an ADHD brain

- ⏱️ **The timer never stops.** Enter a Deep Work block and a focus session auto-starts. No decision, no ramp-up, no "I'll start in 5 minutes." Momentum is the default state.
- 🎯 **One screen, one answer.** The home screen answers a single question — *what now?* — in one glance. Everything else is one tap away, and out of sight until you need it.
- 🤖 **AI sorts your day, you don't.** Dump today's tasks in raw. They get ranked against your goals — locally, or with your own OpenAI / Gemini key. You execute top-down and never agonize over priority again.
- 📈 **A score that becomes action.** Instead of a guilt-trip streak, it surfaces the *specific* high-value moves still left on the table today, so "do better" turns into "do this."
- ↩️ **Unfinished work rolls over.** Whatever you didn't close carries to tomorrow, automatically re-ranked. No cleanup, no shame spiral.
- 🔒 **100% local. No account, no cloud, no tracking.** Everything lives in your browser. Export a JSON backup to hop devices. Your day is nobody's data.

## Design principles

1. **Remove choices, not features.** Every screen must answer *"what now?"* in one glance.
2. **Make time visible.** Countdowns over checklists. Momentum over planning.
3. **Local-first, always.** No login wall, no server round-trip, no telemetry.

## Quick start

```bash
npm install
npm run dev      # → http://localhost:4318
```

Then open it on your phone and **Add to Home Screen** — it installs as a standalone, offline-capable app.

### Optional: real LLM task sorting

The built-in heuristic ranker works with zero setup. Want an LLM instead? Paste an
OpenAI (`sk-…`) or Google Gemini (`AIza…`) key into **Settings → AI 排序**. The key
is stored only in your browser and used only to rank your task list — it never
leaves your device.

## Make it yours

The seed goals and daily rhythm are neutral defaults. Edit them in-app:

- **Goals** — your real priorities (the ranker weights tasks against these).
- **Schedule** — your blocks, deep-work windows, wake / sleep times.
- **Settings** — pomodoro lengths, display name, notifications.

Nothing you type ever leaves your device.

## Stack

- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS**
- **Zustand** — persisted, local-first state
- **Installable PWA** — offline-capable, home-screen ready

## License

[MIT](./LICENSE) — do whatever you want with it.

<div align="center">

---

*Built for the brains that have a thousand tabs open — and just need the next one.*

</div>
