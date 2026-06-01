import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface Body {
  audio: string; // base64 (no data: prefix)
  mimeType: string;
  key: string;
}

const SYSTEM = `你是语音转写引擎。把用户提供的语音逐字转写成文字（中文为主，可含英文词）。
只输出转写出来的文字本身，不要任何解释、标点修饰、前缀或思考过程。听不清就输出空字符串。`;

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const { audio, mimeType, key } = body;
  if (!key || !audio) {
    return NextResponse.json({ error: "missing key or audio" }, { status: 400 });
  }
  if (!key.startsWith("AIza")) {
    // Only Gemini supports inline audio here; OpenAI Whisper would need
    // multipart and a different route. Tell the client to fall back.
    return NextResponse.json(
      { error: "transcription requires a Gemini (AIza…) key" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [
            {
              role: "user",
              parts: [
                { text: "转写这段语音：" },
                { inline_data: { mime_type: mimeType || "audio/mp4", data: audio } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: `gemini ${res.status}: ${txt}` }, { status: 502 });
    }

    const data = await res.json();
    const text: string =
      data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
    return NextResponse.json({ text: text.trim() });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
