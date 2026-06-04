"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useLife } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { packTasksIntoWork } from "@/lib/schedule";
import { fmtClock } from "@/lib/time";
import { parseTasks, sortTasks } from "@/lib/ai";
import { API_BASE } from "@/lib/apiBase";

const EXAMPLE =
  "今天想做：给潜在用户发消息，写落地页第一版，录一条产品 demo。";

export default function PlanPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const tasks = useLife((s) => s.tasks);
  const goals = useLife((s) => s.goals);
  const settings = useLife((s) => s.settings);
  const openaiKey = useLife((s) => s.settings.openaiKey);
  const aiSource = useLife((s) => s.aiSource);
  const planConfirmed = useLife((s) => s.planConfirmed);
  const appendTasks = useLife((s) => s.appendTasks);
  const clearTasks = useLife((s) => s.clearTasks);
  const reorderTask = useLife((s) => s.reorderTask);
  const toggleOptional = useLife((s) => s.toggleTaskOptional);
  const toggleDone = useLife((s) => s.toggleTaskDone);
  const addTask = useLife((s) => s.addTask);
  const removeTask = useLife((s) => s.removeTask);
  const editTaskTitle = useLife((s) => s.editTaskTitle);
  const setTaskPomodoros = useLife((s) => s.setTaskPomodoros);
  const confirmPlan = useLife((s) => s.confirmPlan);

  // ── input state ─────────────────────────────────────────────
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false); // Web Speech (desktop) active
  const [recording, setRecording] = useState(false); // audio recording active
  const [transcribing, setTranscribing] = useState(false);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<any>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const parsed = parseTasks(text);

  // ── manual edit state ───────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newTask, setNewTask] = useState("");

  function startEdit(id: string, title: string) {
    setEditingId(id);
    setDraft(title);
  }
  function commitEdit() {
    if (editingId) editTaskTitle(editingId, draft);
    setEditingId(null);
    setDraft("");
  }
  function commitNewTask() {
    if (newTask.trim()) {
      addTask(newTask);
      setNewTask("");
    }
  }

  // Finished tasks sink to the bottom; unfinished stay on top (each group by rank).
  const ordered = useMemo(
    () =>
      [...tasks].sort(
        (a, b) => Number(a.done) - Number(b.done) || a.rank - b.rank
      ),
    [tasks]
  );
  const blocks = useLife((s) => s.schedule);
  const slots = useMemo(
    () =>
      packTasksIntoWork(
        ordered.filter((t) => !t.optional),
        blocks,
        settings.focusLength,
        settings.breakLength
      ),
    [ordered, blocks, settings.focusLength, settings.breakLength]
  );

  const micActive = listening || recording || transcribing;

  // Mic button → use audio-recording + Gemini transcription when a Gemini key
  // is set (works on iPhone PWA, where Web Speech is dead). Otherwise fall back
  // to the browser Web Speech API (desktop Chrome).
  function handleMic() {
    if (transcribing) return;
    if (openaiKey.startsWith("AIza")) {
      recording ? stopRecording() : startRecording();
    } else {
      toggleWebSpeech();
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const types = ["audio/mp4", "audio/webm", "audio/aac", "audio/ogg"];
      const mimeType =
        types.find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t)) ||
        "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/mp4",
        });
        await transcribe(blob, mr.mimeType || "audio/mp4");
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      alert("无法访问麦克风。请在弹出的权限提示里允许使用麦克风。");
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
    setTranscribing(true);
  }

  async function transcribe(blob: Blob, mimeType: string) {
    try {
      const buf = await blob.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const base64 = btoa(bin);
      const res = await fetch(`${API_BASE}/api/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64, mimeType, key: openaiKey }),
      });
      const data = await res.json();
      if (data.text) {
        setText((prev) => (prev ? prev.trim() + " " : "") + data.text);
      } else {
        alert("没听清，再说一遍试试。");
      }
    } catch {
      alert("转写失败，请检查网络或 Settings 里的 key。");
    } finally {
      setTranscribing(false);
    }
  }

  function toggleWebSpeech() {
    const SR =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition)) ||
      null;
    if (!SR) {
      alert(
        "此设备的浏览器不支持实时语音。请在 Settings 里填入 Gemini（AIza…）key，即可用录音转文字；或直接用键盘的听写。"
      );
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.interimResults = true;
    rec.continuous = true;
    let base = text ? text + " " : "";
    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) base += final;
      setText(base + interim);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function organize() {
    if (parsed.length === 0) return;
    setBusy(true);
    const { tasks: sorted, source } = await sortTasks(parsed, goals, openaiKey);
    appendTasks(sorted, source);
    setBusy(false);
    setText("");
  }

  if (!hydrated)
    return <div className="pt-24 text-center text-mist-faint">…</div>;

  const totalPomodoros = ordered
    .filter((t) => !t.optional)
    .reduce((n, t) => n + t.pomodoros, 0);
  const doneCount = ordered.filter((t) => t.done).length;
  const activeCount = ordered.filter((t) => !t.optional).length;

  return (
    <div>
      <Header
        title="今日计划"
        sub="说出来，或写下来。AI 会结合你的目标排序。"
      />

      {/* ── input ───────────────────────────────────────────── */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE}
          rows={4}
          className="w-full resize-none rounded-2xl border border-ink-line bg-ink-card p-4 text-[15px] leading-relaxed text-mist placeholder:text-mist-faint focus:border-sage/50 focus:outline-none"
        />
        <button
          onClick={handleMic}
          disabled={transcribing}
          aria-label="语音输入"
          className={`absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
            micActive
              ? "animate-breathe border-sage bg-sage/20 text-sage"
              : "border-ink-line bg-ink-soft text-mist-dim"
          }`}
        >
          <span className="text-lg">
            {transcribing ? "…" : listening || recording ? "■" : "🎙"}
          </span>
        </button>
      </div>

      {(listening || recording) && (
        <p className="mt-2 text-center text-xs text-sage">
          正在录音… 说完点 ■ 停止
        </p>
      )}
      {transcribing && (
        <p className="mt-2 text-center text-xs text-mist-faint">
          转写中…
        </p>
      )}

      {parsed.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-widest text-mist-faint">
            识别到 {parsed.length} 个任务
          </p>
          <ul className="space-y-2">
            {parsed.map((t, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-ink-line bg-ink-soft px-3 py-2.5 text-sm text-mist"
              >
                <span className="numeric text-mist-faint">{i + 1}</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={organize}
        disabled={parsed.length === 0 || busy}
        className="mt-4 w-full rounded-2xl bg-mist py-3.5 text-sm font-semibold text-ink transition-opacity disabled:opacity-30"
      >
        {busy
          ? "AI 排序中…"
          : tasks.length > 0
          ? "AI 整理并加入计划 →"
          : "AI 整理并排序 →"}
      </button>

      {!openaiKey && parsed.length > 0 && (
        <p className="mt-3 text-center text-xs text-mist-faint">
          未配置 OpenAI Key — 使用本地智能排序。可在 Settings 添加 Key 启用 GPT。
        </p>
      )}

      {tasks.length === 0 && parsed.length === 0 && (
        <button
          onClick={() => setText(EXAMPLE)}
          className="mt-4 w-full text-center text-xs text-mist-faint underline-offset-2 hover:underline"
        >
          用示例填充
        </button>
      )}

      {/* ── sorted plan ─────────────────────────────────────── */}
      {tasks.length > 0 && (
        <>
          <div className="my-7 h-px bg-ink-line" />

          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-xs uppercase tracking-widest text-mist-faint">
              {aiSource === "ai"
                ? "GPT 已结合你的目标排序"
                : "本地智能排序（结合目标权重）"}
            </p>
            <div className="flex items-center gap-3">
              <p className="numeric text-xs text-mist-faint">
                完成 {doneCount}/{activeCount} · {totalPomodoros} 🍅
              </p>
              <button
                onClick={() => {
                  if (confirm("清空今天全部任务？此操作无法撤销。")) clearTasks();
                }}
                className="text-[11px] text-mist-faint underline-offset-2 hover:underline"
              >
                清空全部
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {ordered.map((t, i) => (
              <div
                key={t.id}
                className={`rounded-2xl border bg-ink-card p-4 transition-opacity ${
                  t.optional || t.done
                    ? "border-ink-line opacity-50"
                    : "border-ink-line"
                } ${i < 3 && !t.optional && !t.done ? "ring-1 ring-sage/30" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {/* done checkbox */}
                    <button
                      onClick={() => toggleDone(t.id)}
                      aria-label={t.done ? "标记未完成" : "标记完成"}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                        t.done
                          ? "border-sage bg-sage text-ink"
                          : "border-ink-line text-mist-dim"
                      }`}
                    >
                      {t.done ? "✓" : t.rank}
                    </button>
                    <div className="min-w-0 flex-1">
                      {editingId === t.id ? (
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") {
                              setEditingId(null);
                              setDraft("");
                            }
                          }}
                          className="w-full rounded-lg border border-sage/50 bg-ink-soft px-2 py-1 text-[15px] font-medium text-mist focus:outline-none"
                        />
                      ) : (
                        <p
                          onClick={() => startEdit(t.id, t.title)}
                          className={`cursor-text font-medium text-mist ${
                            t.optional || t.done ? "line-through" : ""
                          }`}
                        >
                          {t.title}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs leading-relaxed text-mist-faint">
                        {t.reason}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {/* pomodoro stepper */}
                        <div className="flex items-center gap-1.5 rounded-full border border-ink-line px-1.5 py-0.5">
                          <button
                            onClick={() => setTaskPomodoros(t.id, -1)}
                            className="text-mist-dim"
                            aria-label="减少番茄钟"
                          >
                            −
                          </button>
                          <span className="numeric text-[11px] text-mist">
                            {t.pomodoros} 🍅
                          </span>
                          <button
                            onClick={() => setTaskPomodoros(t.id, 1)}
                            className="text-mist-dim"
                            aria-label="增加番茄钟"
                          >
                            +
                          </button>
                        </div>
                        {t.carriedOver && !t.done && <Tag tone="amber">↩ 顺延</Tag>}
                        {t.deep && <Tag>深度专注</Tag>}
                        {t.morning && <Tag>上午</Tag>}
                        {t.revenue && <Tag tone="amber">收入</Tag>}
                        {t.product && <Tag tone="amber">产品</Tag>}
                        {t.health && <Tag tone="sage">健康</Tag>}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      onClick={() => reorderTask(t.id, -1)}
                      aria-label="上移"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-line bg-ink-soft text-base text-mist-dim active:bg-sage/15"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => reorderTask(t.id, 1)}
                      aria-label="下移"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-line bg-ink-soft text-base text-mist-dim active:bg-sage/15"
                    >
                      ↓
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <button
                    onClick={() => toggleDone(t.id)}
                    className={`text-[11px] font-medium underline-offset-2 hover:underline ${
                      t.done ? "text-sage" : "text-mist-dim"
                    }`}
                  >
                    {t.done ? "↩ 标记未完成" : "✓ 标记完成"}
                  </button>
                  <button
                    onClick={() => toggleOptional(t.id)}
                    className="text-[11px] text-mist-faint underline-offset-2 hover:underline"
                  >
                    {t.optional ? "↩ 放回今天" : "今天可以不做"}
                  </button>
                  <button
                    onClick={() => startEdit(t.id, t.title)}
                    className="text-[11px] text-mist-faint underline-offset-2 hover:underline"
                  >
                    ✎ 改名
                  </button>
                  <button
                    onClick={() => removeTask(t.id)}
                    className="text-[11px] text-mist-faint underline-offset-2 hover:underline"
                  >
                    ✕ 删除
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* add a task manually */}
          <div className="mt-3 flex gap-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNewTask();
              }}
              placeholder="+ 手动加一个任务"
              className="flex-1 rounded-xl border border-ink-line bg-ink-soft px-3 py-2.5 text-sm text-mist placeholder:text-mist-faint focus:border-sage/50 focus:outline-none"
            />
            <button
              onClick={commitNewTask}
              disabled={!newTask.trim()}
              className="shrink-0 rounded-xl bg-ink-soft px-4 text-sm text-mist-dim transition-opacity disabled:opacity-30"
            >
              添加
            </button>
          </div>

          {/* Pomodoro schedule */}
          <p className="mb-2 mt-7 text-xs uppercase tracking-widest text-mist-faint">
            自动排进番茄钟 · 共 {totalPomodoros} 个
          </p>
          <div className="space-y-2">
            {slots.length === 0 && (
              <p className="text-sm text-mist-faint">
                所有任务都被标记为可不做。
              </p>
            )}
            {slots.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-ink-line bg-ink-soft px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-mist">{s.taskTitle}</p>
                  <p className="numeric text-xs text-mist-faint">
                    {fmtClock(s.startMin)} – {fmtClock(s.endMin)} · {s.pomodoros}{" "}
                    番茄钟
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-amber">
                  {s.start < 12 * 60 ? "AM" : "PM"}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              confirmPlan();
              router.push("/");
            }}
            className={`mt-7 w-full rounded-2xl py-3.5 text-sm font-semibold transition-colors ${
              planConfirmed
                ? "border border-sage/40 bg-sage/10 text-sage"
                : "bg-mist text-ink"
            }`}
          >
            {planConfirmed ? "✓ 计划已确认 — 进入执行" : "确认计划，进入执行模式 →"}
          </button>
        </>
      )}
    </div>
  );
}

function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "amber" | "sage";
}) {
  const cls =
    tone === "amber"
      ? "border-amber/30 text-amber"
      : tone === "sage"
      ? "border-sage/30 text-sage"
      : "border-ink-line text-mist-faint";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${cls}`}>
      {children}
    </span>
  );
}
