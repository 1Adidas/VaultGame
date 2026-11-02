import type { Metadata } from "next";
import { AppLocaleProvider } from "@/components/i18n/AppLocaleProvider";
import { notFound } from "next/navigation";
import { locales } from "@/i18n/request";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/layout/AppShell";
import "../globals.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isVi = locale === "vi";
  const isZh = locale === "zh";
  return {
    title: isVi
      ? "Game Vault • Cửa Hàng Trò Chơi Kỹ Thuật Số Bản Quyền"
      : isZh
      ? "Game Vault • 正版数字游戏专营店"
      : "Game Vault • Premium Digital Game Store",
    description: isVi
      ? "Khám phá thế giới trò chơi bản quyền đỉnh cao, trải nghiệm chơi thử WebGL tức thì không cần cài đặt và giao dịch an toàn tại Game Vault."
      : isZh
      ? "探索顶级正版数字游戏，免安装即玩网页端 WebGL Demo 演示，并在 Game Vault 享受极速安全交易。"
      : "Discover premium digital games, play instant WebGL browser demos with no installation, and enjoy secure checkout at Game Vault.",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as typeof locales[number])) notFound();

  return (
    <html lang={locale} className="dark">
      <head>
        <meta name="referrer" content="no-referrer" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Russo+One&family=Outfit:wght@500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#070A10] text-zinc-100 antialiased selection:bg-cyan-500/30 selection:text-white">
        {/* Global Providers with seamless in-place locale switching */}
        <AppLocaleProvider initialLocale={locale as "vi" | "en" | "zh"}>
          <Providers>
            <AppShell>
              {children}
            </AppShell>
          </Providers>
        </AppLocaleProvider>
      </body>
    </html>
  );
}
