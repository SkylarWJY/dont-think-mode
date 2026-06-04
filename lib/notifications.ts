// Browser + PWA notifications and a soft chime.

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

export function notify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: "life-os",
    });
  } catch {
    // some browsers require notifications via the SW registration
    navigator.serviceWorker?.ready
      .then((reg) => reg.showNotification(title, { body, icon: "/icon.svg" }))
      .catch(() => {});
  }
}

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

/**
 * Unlock / resume the audio output. iOS and autoplay policies start the
 * AudioContext "suspended" and only let a user gesture resume it; once
 * resumed, later programmatic chimes (fired by the timer) can play too.
 * Safe to call often — call it from taps and on tab focus.
 */
export function primeAudio() {
  const ctx = getCtx();
  if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
}

/** Which transition just happened — picks a distinct chime for each. */
export type ChimeKind = "focusDone" | "restDone";

/**
 * Two clearly different cues so you can tell, eyes closed, whether it's time to
 * rest or time to get back to work:
 *  - focusDone → time to REST: a calm, descending phrase that winds down.
 *  - restDone  → back to FOCUS: a brighter, ascending phrase that lifts.
 */
export function chime(kind: ChimeKind = "focusDone") {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    // The timer that fires this is not a user gesture, so the context may
    // be suspended — nudge it awake before scheduling the notes.
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    const play = (
      freq: number,
      at: number,
      dur: number,
      vol = 0.2,
      type: OscillatorType = "sine"
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + at);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + at + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + dur);
    };

    if (kind === "restDone") {
      // Back to focus — bright, rising, played twice so it's hard to miss.
      for (let r = 0; r < 2; r++) {
        const t = r * 0.5;
        play(659.25, t, 0.3, 0.3, "triangle"); // E5
        play(987.77, t + 0.16, 0.34, 0.28, "triangle"); // B5
      }
    } else {
      // Time to rest — an unmissable bell, three rings. Louder, like an alarm.
      for (let r = 0; r < 3; r++) {
        const t = r * 0.46;
        play(880.0, t, 0.3, 0.32, "triangle"); // A5
        play(659.25, t + 0.18, 0.42, 0.3, "triangle"); // E5
      }
    }
  } catch {
    // ignore — audio is non-essential
  }
}
