"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { NextIntlClientProvider } from "next-intl";
import viMessages from "@/messages/vi.json";
import enMessages from "@/messages/en.json";
import zhMessages from "@/messages/zh.json";

export type Locale = "vi" | "en" | "zh";

interface LocaleContextType {
  locale: Locale;
  setLocale: (newLocale: Locale) => void;
  isVi: boolean;
  isZh: boolean;
  isEn: boolean;
}

const allMessages: Record<Locale, Record<string, any>> = {
  vi: viMessages,
  en: enMessages,
  zh: zhMessages,
};

const LocaleContext = createContext<LocaleContextType>({
  locale: "vi",
  setLocale: () => {},
  isVi: true,
  isZh: false,
  isEn: false,
});

export const useAppLocale = () => useContext(LocaleContext);

export function AppLocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Sync if initialLocale changes from route params
  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  // Sync on browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === "undefined") return;
      const path = window.location.pathname;
      if (path.startsWith("/zh")) {
        setLocaleState("zh");
      } else if (path.startsWith("/en")) {
        setLocaleState("en");
      } else if (path.startsWith("/vi")) {
        setLocaleState("vi");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Pure state updater - NO side effects during render
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState((prev) => (prev === newLocale ? prev : newLocale));
  }, []);

  // Perform side-effects cleanly in useEffect AFTER render commit
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      const currentHash = window.location.hash;
      const newPath = currentPath.replace(new RegExp(`^/(vi|en|zh)(/|$)`), `/${locale}$2`);

      if (currentPath !== newPath) {
        window.history.replaceState(null, "", `${newPath}${currentSearch}${currentHash}`);
      }

      document.documentElement.lang = locale === "zh" ? "zh-CN" : locale;
      document.title =
        locale === "vi"
          ? "Game Vault • Cửa Hàng Trò Chơi Kỹ Thuật Số Bản Quyền"
          : locale === "zh"
          ? "Game Vault • 正版数字游戏专营店"
          : "Game Vault • Premium Digital Game Store";

      document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    } catch (e) {
      console.error("Failed to update locale history/cookie", e);
    }
  }, [locale]);

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        isVi: locale === "vi",
        isZh: locale === "zh",
        isEn: locale === "en",
      }}
    >
      <NextIntlClientProvider
        locale={locale}
        messages={allMessages[locale]}
        timeZone="Asia/Ho_Chi_Minh"
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
