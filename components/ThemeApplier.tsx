"use client";

import { useEffect } from "react";
import { useLife } from "@/lib/store";

/**
 * Reflects settings.theme onto <html> by toggling the `.light` class (the dark
 * palette is the default in :root). Also keeps the PWA / iOS status-bar color
 * in sync. The pre-paint flash is handled by an inline script in the layout;
 * this keeps it live as the user toggles.
 */
export default function ThemeApplier() {
  const theme = useLife((s) => s.settings.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "light" ? "#f7f7f5" : "#0a0a0b");
    }
  }, [theme]);
  return null;
}
