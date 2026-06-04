"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { pullAndReconcile, pushState } from "@/lib/cloudSync";

/** Cloud-sync controls for Settings: passwordless email-code login + status. */
export default function CloudSyncSettings() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUser(s?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!supabaseConfigured) {
    return (
      <p className="text-[11px] leading-relaxed text-mist-faint">
        云同步即将上线 —— 配好后,登录一次就自动云端同步、换设备自动恢复,再也不用手动导出。
      </p>
    );
  }

  async function sendCode() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase!.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setMsg("发送失败:" + error.message);
    else {
      setStage("code");
      setMsg("验证码已发到邮箱,填进来 ↓");
    }
  }

  async function verify() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase!.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) {
      setMsg("验证码不对或已过期,重发一次");
      return;
    }
    setMsg("已登录,正在同步…");
    await pullAndReconcile();
    setMsg("✓ 云同步已开,数据自动保存");
    setStage("email");
    setCode("");
  }

  if (user) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-sage">☁️ 云同步已开</p>
            <p className="truncate text-[11px] text-mist-faint">
              {user.email} · 每次改动自动云端保存,不用再手动导出
            </p>
          </div>
          <button
            onClick={() => supabase!.auth.signOut()}
            className="shrink-0 rounded-full border border-ink-line px-3 py-1.5 text-xs text-mist-faint"
          >
            退出
          </button>
        </div>
        <button
          onClick={async () => {
            await pushState();
            setMsg("✓ 已同步");
            setTimeout(() => setMsg(null), 2000);
          }}
          className="w-full rounded-xl border border-ink-line bg-ink-soft py-2 text-xs text-mist-dim"
        >
          {msg ?? "立即同步一次"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-relaxed text-mist-faint">
        登录后数据自动云端同步,换设备自动恢复,再也不用手动保存。用邮箱收个验证码即可,无需密码。
      </p>
      {stage === "email" ? (
        <div className="flex gap-2">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="你的邮箱"
            className="flex-1 rounded-lg border border-ink-line bg-ink-soft px-3 py-2 text-sm text-mist placeholder:text-mist-faint focus:border-sage/50 focus:outline-none"
          />
          <button
            onClick={sendCode}
            disabled={busy || !email.includes("@")}
            className="shrink-0 rounded-lg bg-mist px-4 text-sm font-medium text-ink disabled:opacity-50"
          >
            {busy ? "…" : "发码"}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6 位验证码"
            className="flex-1 rounded-lg border border-ink-line bg-ink-soft px-3 py-2 text-sm text-mist placeholder:text-mist-faint focus:border-sage/50 focus:outline-none"
          />
          <button
            onClick={verify}
            disabled={busy || code.trim().length < 4}
            className="shrink-0 rounded-lg bg-mist px-4 text-sm font-medium text-ink disabled:opacity-50"
          >
            {busy ? "…" : "登录"}
          </button>
        </div>
      )}
      {msg && <p className="text-[11px] text-mist-faint">{msg}</p>}
    </div>
  );
}
