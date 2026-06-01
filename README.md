# Don't Think Mode

A local-first time-management PWA for ADHD founders.

> Open the app. Don't think. Just execute.

Most productivity tools give you *more* decisions: which list, which view, what to
do next. For an ADHD brain mid-day, that friction is where the day quietly falls
apart. **Don't Think Mode** removes the decision. You open it and it tells you the
one thing happening *now* — and the clock is already running.

## Why it's different

- **One screen, one answer.** The home screen shows your current block and a live
  countdown. No inbox, no backlog to triage.
- **The timer is always running.** Step into a Deep Work block and the focus
  pomodoro auto-starts — there is no "press start." That nagging feeling that
  time is moving *with or without you* is the point.
- **AI sorts your day, you don't.** Dump today's tasks in; they get ranked against
  your goals (locally, or with your own OpenAI/Gemini key). You execute top-down.
- **A score that turns into action.** Instead of a vague streak, it shows the
  specific high-value levers still on the table today.
- **Unfinished work rolls over.** Whatever you didn't close carries to tomorrow,
  re-ranked — no guilt, no manual cleanup.

## Design principles

1. **Remove choices, not features.** Every screen should answer "what now?" in one
   glance.
2. **Local-first.** All data lives in your browser's `localStorage`. No account,
   no server, no tracking. Export/import a JSON backup to move devices.
3. **Make time visible.** Countdowns over to-do lists; momentum over planning.

## Stack

- Next.js 14 (App Router) · TypeScript · Tailwind
- Zustand (persisted, local-first store)
- Installable PWA (offline-capable, add to iOS/Android home screen)

## Run it

```bash
npm install
npm run dev      # http://localhost:4318
```

Then **Add to Home Screen** on your phone to run it as a standalone app.

### Optional: real LLM task sorting

The local heuristic ranker works with zero setup. To use an LLM instead, paste an
OpenAI (`sk-…`) or Google Gemini (`AIza…`) key in **Settings → AI 排序**. The key is
stored only in your browser and used only to rank your task list.

## Make it yours

The seed goals and daily rhythm are neutral defaults. Edit them in-app:

- **Goals** — your real priorities (the task ranker weights against these).
- **Schedule** — your blocks, work windows, wake/sleep times.
- **Settings** — pomodoro lengths, your display name, notifications.

Nothing you enter ever leaves your device.

## License

MIT
