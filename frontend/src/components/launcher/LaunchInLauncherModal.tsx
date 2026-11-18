"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { X } from "lucide-react";
import { getStoredTokens } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";

interface LaunchInLauncherModalProps {
  gameId: string;
  gameTitle: string;
  onClose: () => void;
}

export function buildGameVaultDeepLink(gameId: string): string {
  const base = `gamevault://open/${gameId}`;
  if (typeof window === "undefined") return base;

  const user = useAuthStore.getState().user;
  const { accessToken, refreshToken } = getStoredTokens();
  if (!user || !accessToken || user.roles?.includes("Admin")) {
    return base;
  }

  const params = new URLSearchParams();
  params.set("userId", user.id);
  params.set("token", accessToken);
  if (refreshToken) {
    params.set("refreshToken", refreshToken);
  }
  return `${base}?${params.toString()}`;
}

export function triggerGameVaultLauncher(gameId: string) {
  if (typeof window === "undefined") return;
  window.location.href = buildGameVaultDeepLink(gameId);
}

export function LaunchInLauncherModal({
  gameId,
  gameTitle,
  onClose,
}: LaunchInLauncherModalProps) {
  const locale = useLocale();
  const isVi = locale === "vi";
  const isZh = locale === "zh";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const deepLink = buildGameVaultDeepLink(gameId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="launcher-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-white/[0.1] bg-[#0C1018] p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h3
              id="launcher-modal-title"
              className="text-base font-semibold tracking-[-0.02em] text-white"
            >
              {isVi
                ? "Mở trong GameVault Launcher"
                : isZh
                ? "在 GameVault 启动器中打开"
                : "Open in GameVault Launcher"}
            </h3>
            <p className="text-sm text-zinc-400 truncate">{gameTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isVi ? "Đóng" : isZh ? "关闭" : "Close"}
            className="rounded-md p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed">
          {isVi
            ? "Nếu trình duyệt hiện thông báo xác nhận, hãy chọn mở GameVault Launcher để tải xuống và khởi chạy trò chơi. Ứng dụng hỗ trợ Windows."
            : isZh
            ? "如果浏览器弹出确认提示，请选择打开 GameVault 启动器以下载并运行游戏。支持 Windows 系统。"
            : "If your browser prompts you, allow it to open GameVault Launcher to install and play this title. Available for Windows."}
        </p>

        <div className="flex flex-col gap-3 pt-1">
          <a
            href={deepLink}
            className="h-10 w-full rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 text-sm font-semibold flex items-center justify-center transition-colors"
          >
            {isVi
              ? "Mở lại Launcher"
              : isZh
              ? "重新打开启动器"
              : "Open Launcher Again"}
          </a>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-xs text-zinc-400">
            <span>
              {isVi
                ? "Chưa cài đặt Launcher?"
                : isZh
                ? "尚未安装启动器？"
                : "Don't have the Launcher yet?"}
            </span>
            <a
              href="/download/GameVault-Launcher.exe"
              download="GameVault-Launcher.exe"
              className="font-medium text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors"
            >
              {isVi
                ? "Tải bản Windows (.exe)"
                : isZh
                ? "下载 Windows 版 (.exe)"
                : "Download for Windows (.exe)"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
