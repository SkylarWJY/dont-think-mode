import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import RegisterSW from "@/components/RegisterSW";
import BlockReminders from "@/components/BlockReminders";
import PomoEngine from "@/components/PomoEngine";
import AutoBackup from "@/components/AutoBackup";
import NightlyBackup from "@/components/NightlyBackup";
import CloudSync from "@/components/CloudSync";
import ThemeApplier from "@/components/ThemeApplier";

// Apply the saved theme before first paint so there's no dark→light flash.
const THEME_INIT = `(function(){try{var s=JSON.parse(localStorage.getItem('dont-think-mode'));if(s&&s.state&&s.state.settings&&s.state.settings.theme==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Don't Think Mode",
  description: "我打开 App 后，不需要思考，只需要执行。",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Don't Think",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <RegisterSW />
        <BlockReminders />
        <PomoEngine />
        <AutoBackup />
        <NightlyBackup />
        <CloudSync />
        <ThemeApplier />
        <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
