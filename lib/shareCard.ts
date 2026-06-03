// Render a shareable daily-summary card to a PNG, then hand it to the OS share
// sheet (iOS → "Save Image" to Photos) with a download fallback. Pure canvas,
// no dependencies — works inside the PWA.

export interface DayCardData {
  date: string; // YYYY-MM-DD
  score: number;
  pomodoros: number;
  focusMinutes: number;
  streak: number;
  completed: string[]; // finished task / block labels
  name?: string;
}

const FONT = '-apple-system, "PingFang SC", system-ui, "Segoe UI", sans-serif';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipsize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number
): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

/** Draw the card and return a PNG blob. */
export async function buildDayCard(d: DayCardData): Promise<Blob> {
  const scale = 2;
  const W = 1080;
  const padX = 84;

  const MAX_ROWS = 12;
  const shown = d.completed.slice(0, MAX_ROWS);
  const overflow = d.completed.length - shown.length;
  const rows = shown.length + (overflow > 0 ? 1 : 0);

  const headerH = 560;
  const listTop = headerH;
  const rowH = 66;
  const listH = (rows || 1) * rowH + 60;
  const footerH = 120;
  const H = listTop + listH + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#101014");
  bg.addColorStop(1, "#0a0a0c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // top hairline accent
  ctx.fillStyle = "#d8b48a";
  ctx.fillRect(0, 0, W, 6);

  // brand
  ctx.fillStyle = "#6b6b73";
  ctx.font = `600 26px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("D O N ' T   T H I N K   M O D E", padX, 96);

  // date
  const [, mm, dd] = d.date.split("-");
  ctx.fillStyle = "#e7e7ea";
  ctx.font = `700 64px ${FONT}`;
  ctx.fillText(`${mm}月${dd}日 · 今日小结`, padX, 176);

  // big score
  ctx.fillStyle = "#9db8a4";
  ctx.font = `800 220px ${FONT}`;
  ctx.fillText(String(d.score), padX - 4, 420);
  ctx.fillStyle = "#6b6b73";
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText("今日得分", padX + 4, 470);

  // streak badge (top-right)
  if (d.streak > 0) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#d8b48a";
    ctx.font = `700 56px ${FONT}`;
    ctx.fillText(`🔥 ${d.streak}`, W - padX, 200);
    ctx.fillStyle = "#6b6b73";
    ctx.font = `600 28px ${FONT}`;
    ctx.fillText("连续达标", W - padX, 244);
    ctx.textAlign = "left";
  }

  // stats row
  ctx.fillStyle = "#a1a1aa";
  ctx.font = `500 38px ${FONT}`;
  ctx.fillText(
    `🍅 ${d.pomodoros} 个番茄    ·    专注 ${d.focusMinutes} 分钟`,
    padX,
    520
  );

  // divider
  ctx.strokeStyle = "#26262c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, listTop + 4);
  ctx.lineTo(W - padX, listTop + 4);
  ctx.stroke();

  // completed header
  ctx.fillStyle = "#6b6b73";
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText(`完成 · ${d.completed.length} 项`, padX, listTop + 60);

  // list
  let y = listTop + 60 + 56;
  ctx.font = `500 40px ${FONT}`;
  for (const label of shown) {
    ctx.fillStyle = "#9db8a4";
    ctx.fillText("✓", padX, y);
    ctx.fillStyle = "#e7e7ea";
    ctx.fillText(ellipsize(ctx, label, W - padX * 2 - 64), padX + 56, y);
    y += rowH;
  }
  if (overflow > 0) {
    ctx.fillStyle = "#6b6b73";
    ctx.fillText(`…还有 ${overflow} 项`, padX + 56, y);
  }

  // footer card line
  ctx.fillStyle = "#6b6b73";
  ctx.font = `500 28px ${FONT}`;
  ctx.fillText("我打开 App 后，不需要思考，只需要执行。", padX, H - 56);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png"
    )
  );
}

export type ShareResult = "shared" | "cancelled" | "downloaded" | "error";

/** Share an already-built image blob. iOS share sheet → Save Image (Photos). */
export async function shareImageBlob(
  blob: Blob,
  filename: string
): Promise<ShareResult> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file] });
      return "shared";
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return "cancelled";
      // fall through to download
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return "downloaded";
  } catch {
    return "error";
  }
}
