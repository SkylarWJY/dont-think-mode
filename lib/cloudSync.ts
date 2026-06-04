import { supabase } from "./supabase";
import { useLife } from "./store";

// Last-write-wins sync of the whole app state to a single Supabase row per user.
// We reuse the existing export/import snapshot so the synced payload is exactly
// the backup format — no separate schema to keep in step.

const SYNCED_AT_KEY = "lifeos_synced_at";
let inFlight = false;
// While we're applying a remote snapshot, the store fires a few writes — don't
// echo those straight back up. Suppress pushes for a short window after apply.
let suppressPushUntil = 0;

function localSyncedAt(): string | null {
  try {
    return localStorage.getItem(SYNCED_AT_KEY);
  } catch {
    return null;
  }
}
function setLocalSyncedAt(at: string) {
  try {
    localStorage.setItem(SYNCED_AT_KEY, at);
  } catch {}
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Push the local state up, stamping a fresh updated_at. */
export async function pushState(): Promise<void> {
  if (!supabase) return;
  const uid = await currentUserId();
  if (!uid) return;
  const payload = JSON.parse(useLife.getState().exportData());
  const at = new Date().toISOString();
  const { error } = await supabase
    .from("app_state")
    .upsert({ user_id: uid, data: payload, updated_at: at });
  if (!error) setLocalSyncedAt(at);
}

/**
 * Pull the remote row; if it's newer than what we last synced, apply it to the
 * store. Otherwise push our (newer) local state up. Called on open + on focus.
 */
export async function pullAndReconcile(): Promise<"applied" | "pushed" | "noop"> {
  if (!supabase || inFlight) return "noop";
  const uid = await currentUserId();
  if (!uid) return "noop";
  inFlight = true;
  try {
    const { data, error } = await supabase
      .from("app_state")
      .select("data, updated_at")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) return "noop";

    if (!data) {
      await pushState(); // first sync — seed remote from local
      return "pushed";
    }

    const remoteAt = data.updated_at as string;
    const localAt = localSyncedAt();
    if (!localAt || remoteAt > localAt) {
      // Remote is newer (another device) → adopt it without re-pushing.
      suppressPushUntil = Date.now() + 2500;
      useLife.getState().importData(JSON.stringify(data.data));
      setLocalSyncedAt(remoteAt);
      return "applied";
    }
    // Local is current or ahead → push it up.
    await pushState();
    return "pushed";
  } finally {
    inFlight = false;
  }
}

/** True while we're still settling a just-applied remote snapshot. */
export function isPushSuppressed(): boolean {
  return Date.now() < suppressPushUntil;
}
