// Hand a JSON backup string to the OS share sheet (iOS → "Save to Files" →
// iCloud), with a download fallback. Reliable because the actual save is a real
// user action in the share sheet — no silent writes that could fail unnoticed.

export type ShareResult = "shared" | "cancelled" | "downloaded" | "error";

export async function shareJSONBackup(
  json: string,
  filename: string
): Promise<ShareResult> {
  const file = new File([json], filename, { type: "application/json" });
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: filename });
      return "shared";
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return "cancelled";
      // fall through to download
    }
  }
  try {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
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
