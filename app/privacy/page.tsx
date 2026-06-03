import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · Don't Think Mode",
  description: "How Don't Think Mode handles your data — local-first, no tracking.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <Link href="/" className="text-sm text-mist-faint">
        ← 返回 Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-mist">
        隐私政策 · Privacy Policy
      </h1>
      <p className="mt-1 text-xs text-mist-faint">最后更新 Last updated: 2026-06-03</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-mist-dim">
        <section>
          <h2 className="mb-1 font-medium text-mist">本地优先 · Local-first</h2>
          <p>
            Don&apos;t Think Mode 把你的全部数据（计划、任务、番茄记录、历史、设置）
            <strong className="text-mist"> 只存在你这台设备的本地存储里</strong>。
            我们没有服务器账号系统，<strong className="text-mist">不会收集、上传或出售你的任何个人数据</strong>，
            也没有任何分析、追踪或广告 SDK。
          </p>
          <p className="mt-2 text-mist-faint">
            All your data (plans, tasks, pomodoro logs, history, settings) is stored only
            in local storage on your own device. We have no accounts and no server that
            collects it. We do not track you or run analytics/ads.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-medium text-mist">可选的 AI 功能 · Optional AI</h2>
          <p>
            如果你在设置里<strong className="text-mist">主动填入自己的 OpenAI / Gemini API Key</strong>，
            那么你输入的任务文字（智能排序）或语音（转文字）会发送到你选择的那家服务商进行处理，
            受其各自的隐私政策约束。不填 Key 时，排序完全在本地完成，不发送任何数据。
          </p>
          <p className="mt-2 text-mist-faint">
            Only if you provide your own API key, the relevant text or audio is sent
            directly to that provider (OpenAI / Google) for sorting or transcription,
            under their privacy policy. Without a key, sorting runs fully on-device.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-medium text-mist">备份 · Backups</h2>
          <p>
            「导出备份」生成的文件保存到<strong className="text-mist">你自己选择的位置</strong>
            （文件 App / iCloud Drive）。文件归你所有，我们收不到、也接触不到它。
          </p>
          <p className="mt-2 text-mist-faint">
            Exported backups are saved wherever you choose (Files / iCloud). They stay
            yours — we never receive them.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-medium text-mist">联系 · Contact</h2>
          <p>
            有任何问题：
            <a href="mailto:skylar.expansio@gmail.com" className="text-sage">
              skylar.expansio@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
