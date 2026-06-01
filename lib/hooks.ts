"use client";

import { useEffect, useState } from "react";
import { useLife } from "./store";

/** Ticks every `ms` and returns the current Date. */
export function useTick(ms = 1000): Date {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return new Date();
}

/** True once the persisted store has rehydrated (avoids SSR mismatch). */
export function useHydrated(): boolean {
  const hydrated = useLife((s) => s.hydrated);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && hydrated;
}
