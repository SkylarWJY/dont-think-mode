"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { useLife } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { GoalTier } from "@/lib/types";

const TIERS: { id: GoalTier; label: string; color: string }[] = [
  { id: "highest", label: "最高优先级", color: "text-amber" },
  { id: "high", label: "高优先级", color: "text-sage" },
  { id: "low", label: "低优先级", color: "text-mist-faint" },
];

export default function GoalsPage() {
  const hydrated = useHydrated();
  const goals = useLife((s) => s.goals);
  const addGoal = useLife((s) => s.addGoal);
  const updateGoal = useLife((s) => s.updateGoal);
  const removeGoal = useLife((s) => s.removeGoal);

  const [title, setTitle] = useState("");
  const [tier, setTier] = useState<GoalTier>("high");

  if (!hydrated) return <div className="pt-24 text-center text-mist-faint">…</div>;

  function add() {
    if (!title.trim()) return;
    const weight = tier === "highest" ? 9 : tier === "high" ? 6 : 3;
    addGoal({ title: title.trim(), tier, weight });
    setTitle("");
  }

  return (
    <div>
      <Header title="Life Goals" sub="长期目标决定每天任务的排序权重。" />

      {/* Add */}
      <div className="rounded-2xl border border-ink-line bg-ink-card p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="添加一个长期目标…"
          className="w-full bg-transparent text-[15px] text-mist placeholder:text-mist-faint focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {TIERS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTier(t.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  tier === t.id
                    ? "border-sage bg-sage/10 text-sage"
                    : "border-ink-line text-mist-faint"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={add}
            className="rounded-full bg-mist px-4 py-1.5 text-xs font-semibold text-ink"
          >
            添加
          </button>
        </div>
      </div>

      {/* List grouped by tier */}
      {TIERS.map((t) => {
        const group = goals.filter((g) => g.tier === t.id);
        if (group.length === 0) return null;
        return (
          <div key={t.id} className="mt-6">
            <p className={`mb-2 text-xs uppercase tracking-widest ${t.color}`}>
              {t.label}
            </p>
            <div className="space-y-2">
              {group.map((g) => (
                <div
                  key={g.id}
                  className="rounded-2xl border border-ink-line bg-ink-soft p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-mist">{g.title}</p>
                    <button
                      onClick={() => removeGoal(g.id)}
                      className="text-xs text-mist-faint hover:text-mist"
                    >
                      移除
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={g.weight}
                      onChange={(e) =>
                        updateGoal(g.id, { weight: Number(e.target.value) })
                      }
                      className="h-1 flex-1 accent-sage"
                    />
                    <span className="numeric w-10 text-right text-xs text-mist-dim">
                      权重 {g.weight}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    {TIERS.map((tt) => (
                      <button
                        key={tt.id}
                        onClick={() => updateGoal(g.id, { tier: tt.id })}
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${
                          g.tier === tt.id
                            ? "border-sage text-sage"
                            : "border-ink-line text-mist-faint"
                        }`}
                      >
                        {tt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
