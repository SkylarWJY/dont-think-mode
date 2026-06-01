import { redirect } from "next/navigation";

// Input was merged into the Plan page (输入 + 语音 + AI 排序 + 确认 一页走完).
export default function InputRedirect() {
  redirect("/plan");
}
