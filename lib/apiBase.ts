// Where the server endpoints (/api/sort, /api/transcribe) live.
//  • Web build → "" (same-origin, relative).
//  • Native iOS build → the Vercel URL, set via NEXT_PUBLIC_API_BASE at build
//    time, because the bundled static app has no server of its own.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
