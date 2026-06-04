"use client";

import { useState } from "react";
import { useLife } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { buildDemoExport } from "@/lib/demoData";

/** Loads a generic demo dataset for showing the app off — safely. */
export default function DemoButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadDemo() {
    setBusy(true);
    // Protect the real account: sign out so the demo data never syncs up.
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    try {
      localStorage.removeItem("lifeos_synced_at");
    } catch {}
    useLife.getState().importData(buildDemoExport());
    setBusy(false);
    setMsg("✓ 演示数据已加载。真实数据安全在云端 —— 在「云同步」重新登录即可恢复。");
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-relaxed text-mist-faint">
        一键填充一套通用示例数据,用来演示给别人看(不含你的真实数据)。会覆盖当前本地数据并退出云同步以保护你的账号 —— 演示完在「云同步」重新登录就恢复了。
      </p>
      <button
        onClick={loadDemo}
        disabled={busy}
        className="w-full rounded-xl border border-amber/40 bg-amber/10 py-2.5 text-sm font-medium text-amber disabled:opacity-50"
      >
        {busy ? "加载中…" : "🎬 加载演示数据"}
      </button>
      {msg && <p className="text-[11px] leading-relaxed text-sage">{msg}</p>}
    </div>
  );
}
