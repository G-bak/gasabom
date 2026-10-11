import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./design.css";
import "./reference.css";
import "./maintenance.css";
import { AppShell } from "@/components/AppShell";
import { PracticeProvider } from "@/lib/storage";
import { getCatalogue } from "@/lib/songs";
import { PlayerProvider } from "@/lib/player";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "가사봄 | J-POP 가사 연습",
    template: "%s | 가사봄",
  },
  description:
    "일본어 원문, 한글 발음, 한국어 뜻을 보며 J-POP 가사를 연습하는 개인용 사이트",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      {
        url: "/icons/favicon-16x16.png?v=2",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/icons/favicon-32x32.png?v=2",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icons/favicon-48x48.png?v=2",
        sizes: "48x48",
        type: "image/png",
      },
      { url: "/icons/favicon.svg?v=2", sizes: "any", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico?v=2",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { songs, issues } = await getCatalogue();
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body className={pretendard.variable}>
        <PracticeProvider>
          <PlayerProvider songs={songs}>
            <AppShell songs={songs} issues={issues}>
              {children}
            </AppShell>
          </PlayerProvider>
        </PracticeProvider>
      </body>
    </html>
  );
}
