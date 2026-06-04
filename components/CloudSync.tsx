"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useLife } from "@/lib/store";
import { pullAndReconcile, pushState, isPushSuppressed } from "@/lib/cloudSync";

/**
 * The cloud-sync engine. Inert unless Supabase is configured AND the user is
 * signed in. Then: pulls on open / focus, and pushes (debounced) on every local
 * change — so you never have to "save" again, and devices stay in step.
 */
export default function CloudSync() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggedIn = useRef(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      loggedIn.current = !!data.session;
      if (data.session) pullAndReconcile();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      loggedIn.current = !!session;
      if (session) pullAndReconcile();
    });

    const unsub = useLife.subscribe(() => {
      if (!loggedIn.current || isPushSuppressed()) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => pushState(), 2500);
    });

    const onVis = () => {
      if (document.visibilityState === "visible" && loggedIn.current) {
        pullAndReconcile();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      sub.subscription.unsubscribe();
      unsub();
      document.removeEventListener("visibilitychange", onVis);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return null;
}
