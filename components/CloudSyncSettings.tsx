"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { pullAndReconcile, pushState } from "@/lib/cloudSync";

/** Cloud-sync controls: email + password (no email verification needed). */
export default function CloudSyncSettings() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        云同步即将上线 —— 配好后,登录一次就自动云端同步、换设备自动恢复。
      </p>
    );
  }

  async function go() {
    const e = email.trim();
    const p = password;
    if (!e.includes("@") || p.length < 6) {
      setMsg("邮箱填对,密码至少 6 位");
      return;
    }
    setBusy(true);
    setMsg(null);
    // Try to sign in; if that fails, register (no email confirmation needed).
    const signIn = await supabase!.auth.signInWithPassword({
      email: e,
      password: p,
    });
    if (signIn.error) {
      const signUp = await supabase!.auth.signUp({ email: e, password: p });
      if (signUp.error) {
        setMsg(
          /already registered/i.test(signUp.error.message)
            ? "这个邮箱已注册过,密码不对"
            : signUp.error.message
        );
        setBusy(false);
        return;
      }
      if (!signUp.data.session) {
        setMsg('注册成功,但需在 Supabase 关掉"Confirm email"才能直接登录');
        setBusy(false);
        return;
      }
    }
    await pullAndReconcile();
    setBusy(false);
    setMsg("✓ 云同步已开,数据自动保存");
    setPassword("");
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
        用邮箱 + 密码登录,数据自动云端同步,换设备登录同一账号自动恢复,再也不用手动保存。第一次填即注册。
      </p>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="邮箱"
        className="w-full rounded-lg border border-ink-line bg-ink-soft px-3 py-2 text-sm text-mist placeholder:text-mist-faint focus:border-sage/50 focus:outline-none"
      />
      <div className="flex gap-2">
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码（≥6 位,自己设)"
          className="flex-1 rounded-lg border border-ink-line bg-ink-soft px-3 py-2 text-sm text-mist placeholder:text-mist-faint focus:border-sage/50 focus:outline-none"
        />
        <button
          onClick={go}
          disabled={busy}
          className="shrink-0 rounded-lg bg-mist px-4 text-sm font-medium text-ink disabled:opacity-50"
        >
          {busy ? "…" : "登录 / 注册"}
        </button>
      </div>
      {msg && <p className="text-[11px] text-mist-faint">{msg}</p>}
    </div>
  );
}
