"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; icon: string }[] = [
  { href: "/", label: "Today", icon: "◎" },
  { href: "/plan", label: "Plan", icon: "❑" },
  { href: "/pomodoro", label: "Focus", icon: "◷" },
  { href: "/review", label: "Review", icon: "▦" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-line bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2">
        {ITEMS.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-1.5"
            >
              <span
                className={`text-lg leading-none transition-colors ${
                  active ? "text-sage" : "text-mist-faint"
                }`}
              >
                {it.icon}
              </span>
              <span
                className={`text-[10px] tracking-wide transition-colors ${
                  active ? "text-mist" : "text-mist-faint"
                }`}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
