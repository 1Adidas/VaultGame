"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/lib/auth/store";
import { useCategories, useGames } from "@/hooks/useGames";
import type { GameListItem } from "@/components/game/GameCard";
import { formatPrice, resolveImageUrl } from "@/lib/utils";
import {
  Gamepad2,
  Sparkles,
  Flame,
  Tag,
  Layers,
  Heart,
  ShoppingBag,
  Library,
  ShieldAlert,
  HelpCircle,
  X,
  Compass,
  Play,
  Dices,
  Shuffle,
  RefreshCw,
  ArrowRight,
  Download
} from "lucide-react";

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const prefix = `/${locale}`;
  const isVi = locale === "vi";
  const isZh = locale === "zh";

  const { data: categories } = useCategories();
  const { data: allGamesData } = useGames({ pageSize: 50 });

  const [rolledGame, setRolledGame] = useState<GameListItem | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const handleRollRoulette = () => {
    const pool = allGamesData?.games;
    if (!pool || pool.length === 0) return;
    setIsRolling(true);

    let count = 0;
    const maxIterations = 8;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * pool.length);
      setRolledGame(pool[randomIdx]);
      count++;
      if (count >= maxIterations) {
        clearInterval(interval);
        setIsRolling(false);
      }
    }, 60);
  };

  const isActive = (path: string, exact = false) => {
    if (exact || path === prefix) {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  const navItemClass = (active: boolean) =>
    `group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 ease-out select-none ${
      active
        ? "bg-gradient-to-r from-white to-zinc-100 text-black shadow-lg shadow-white/10 font-bold translate-x-1.5 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-gradient-to-b before:from-cyan-400 before:to-violet-600 before:shadow-[0_0_8px_rgba(0,242,254,0.8)]"
        : "text-zinc-400 hover:text-white hover:bg-white/[0.06] hover:translate-x-1.5 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
    }`;

  const iconClass = (active: boolean) =>
    `size-4 transition-all duration-300 ${
      active
        ? "text-black scale-105"
        : "text-zinc-400 group-hover:text-cyan-400 group-hover:scale-115 group-hover:-rotate-6"
    }`;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 lg:w-64 bg-[#070A11]/95 backdrop-blur-2xl border-r border-white/[0.06] flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.06] shrink-0">
          <Link href={prefix} onClick={onClose} className="flex items-center gap-2.5 group">
            <div className="size-9 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
              <div className="size-full rounded-[11px] bg-[#080B11] flex items-center justify-center p-1.5">
                <img src="/logo.png" alt="GameVault Logo" className="size-full object-contain" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold tracking-tight text-white">GAMEVAULT</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block -mt-0.5">
                Digital Gaming Hub
              </span>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 pb-14 space-y-6 scrollbar-thin">
          
          {/* Section 1: Storefront */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {isVi ? "Cửa Hàng Trò Chơi" : isZh ? "正版游戏商城" : "Storefront"}
            </span>

            <Link
              href={prefix}
              onClick={onClose}
              className={navItemClass(isActive(prefix, true))}
            >
              <div className="flex items-center gap-2.5">
                <Compass className={iconClass(isActive(prefix, true))} />
                <span>{isVi ? "Trang Chủ Khám Phá" : isZh ? "精选首页" : "Discover Home"}</span>
              </div>
            </Link>

            <Link
              href={`${prefix}/games`}
              onClick={onClose}
              className={navItemClass(pathname === `${prefix}/games` && !pathname.includes("?"))}
            >
              <div className="flex items-center gap-2.5">
                <Layers className={iconClass(pathname === `${prefix}/games` && !pathname.includes("?"))} />
                <span>{isVi ? "Tất Cả Trò Chơi" : isZh ? "全部游戏库" : "All Games"}</span>
              </div>
            </Link>

            <Link
              href={`${prefix}/games?hasDemo=true`}
              onClick={onClose}
              className={navItemClass(pathname.includes("hasDemo=true"))}
            >
              <div className="flex items-center gap-2.5">
                <Play className={iconClass(pathname.includes("hasDemo=true"))} />
                <span>{isVi ? "Chơi Thử WebGL" : isZh ? "WebGL 试玩" : "Instant Demos"}</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LIVE
              </span>
            </Link>

            <Link
              href={`${prefix}/games?discounted=true`}
              onClick={onClose}
              className={navItemClass(pathname.includes("discounted=true"))}
            >
              <div className="flex items-center gap-2.5">
                <Tag className={iconClass(pathname.includes("discounted=true"))} />
                <span>{isVi ? "Ưu Đãi Tuần Này" : isZh ? "本周特惠" : "Special Deals"}</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                SALE
              </span>
            </Link>

            <a
              href="/download/GameVault-Launcher.exe"
              download="GameVault-Launcher.exe"
              className={navItemClass(false)}
              title={isVi ? "Tải GameVault Launcher Client cho Windows (.exe)" : "Download GameVault Launcher Client (.exe)"}
            >
              <div className="flex items-center gap-2.5">
                <Download className={iconClass(false)} />
                <span>{isVi ? "Tải Game Launcher" : isZh ? "下载游戏启动器" : "Download Launcher"}</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                .EXE
              </span>
            </a>
          </div>

          {/* Section 2: Personal Vault (Hidden for Admin) */}
          {!user?.roles?.includes("Admin") && (
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {isVi ? "Bộ Sưu Tập Của Bạn" : isZh ? "个人空间" : "My Vault"}
              </span>

              {user ? (
                <>
                  <Link
                    href={`${prefix}/library`}
                    onClick={onClose}
                    className={navItemClass(isActive(`${prefix}/library`))}
                  >
                    <div className="flex items-center gap-2.5">
                      <Library className={iconClass(isActive(`${prefix}/library`))} />
                      <span>{isVi ? "Thư Viện Trò Chơi" : isZh ? "我的游戏库" : "Game Library"}</span>
                    </div>
                  </Link>

                  <Link
                    href={`${prefix}/wishlist`}
                    onClick={onClose}
                    className={navItemClass(isActive(`${prefix}/wishlist`))}
                  >
                    <div className="flex items-center gap-2.5">
                      <Heart className={iconClass(isActive(`${prefix}/wishlist`))} />
                      <span>{isVi ? "Danh Sách Ước" : isZh ? "愿望单" : "Wishlist"}</span>
                    </div>
                  </Link>

                  <Link
                    href={`${prefix}/orders`}
                    onClick={onClose}
                    className={navItemClass(isActive(`${prefix}/orders`))}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShoppingBag className={iconClass(isActive(`${prefix}/orders`))} />
                      <span>{isVi ? "Lịch Sử Đơn Hàng" : isZh ? "订单记录" : "Orders"}</span>
                    </div>
                  </Link>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {isVi
                      ? "Đăng nhập để lưu trữ game trong Thư viện và theo dõi ưu đãi."
                      : isZh
                      ? "登录后可将游戏永久添加入库并同步云端存档。"
                      : "Sign in to keep games in your vault and track wishlist."}
                  </p>
                  <Link
                    href={`${prefix}/login`}
                    onClick={onClose}
                    className="block text-center py-1.5 px-3 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/20 transition"
                  >
                    {isVi ? "Đăng Nhập Ngay" : isZh ? "立即登录" : "Sign In"}
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Admin Console (if Admin) */}
          {user?.roles?.includes("Admin") && (
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-violet-400">
                {isVi ? "Quản Trị Hệ Thống" : isZh ? "系统管理" : "Administration"}
              </span>

              <Link
                href={`${prefix}/admin`}
                onClick={onClose}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive(`${prefix}/admin`)
                    ? "bg-violet-600 text-white font-bold shadow-lg shadow-violet-600/30"
                    : "text-violet-300 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="size-4" />
                  <span>{isVi ? "Bảng Quản Trị" : isZh ? "管理控制台" : "Admin Console"}</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-violet-300">
                  ROOT
                </span>
              </Link>
            </div>
          )}

          {/* Section 4: Hot Categories List */}
          {categories && categories.length > 0 && (
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {isVi ? "Thể Loại Nổi Bật" : isZh ? "热门分类" : "Top Genres"}
              </span>

              <div className="space-y-0.5 pt-1">
                {categories.slice(0, 6).map((cat) => {
                  const catActive = pathname.includes(`categoryId=${cat.id}`);
                  return (
                    <Link
                      key={cat.id}
                      href={`${prefix}/games?categoryId=${cat.id}`}
                      onClick={onClose}
                      className={`group/cat flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all duration-200 select-none ${
                        catActive
                          ? "bg-white/10 text-white font-semibold translate-x-1"
                          : "text-zinc-400 hover:text-white hover:bg-white/[0.04] hover:translate-x-1"
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      <span className="text-[10px] text-zinc-600 group-hover/cat:text-cyan-400 group-hover/cat:translate-x-0.5 transition-all font-mono">→</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Interactive Vault Pod: Mystery Game Roulette ("Hôm Nay Chơi Gì?") */}
        <div className="p-3.5 pb-8 border-t border-white/[0.06] bg-[#05080E] shrink-0">
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 via-[#070A12] to-indigo-950/20 p-3 shadow-lg space-y-2.5">
            
            {/* Header / Mode Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-violet-500/30">
                  <Dices className={`size-3.5 ${isRolling ? "animate-spin" : ""}`} />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block leading-tight">
                    {isVi ? "Hôm Nay Chơi Gì?" : isZh ? "今天玩什么？" : "What To Play?"}
                  </span>
                  <span className="text-[10px] text-zinc-400 block -mt-0.5">
                    {rolledGame
                      ? (isVi ? "Tựa game đề cử" : isZh ? "专属推荐" : "Lucky Pick")
                      : (isVi ? "Khám phá ngẫu nhiên" : isZh ? "随机抽取" : "Random Roulette")}
                  </span>
                </div>
              </div>
            </div>

            {/* Content: Either Rolled Game Preview OR Call To Action */}
            {rolledGame ? (
              <div className="space-y-2 pt-1 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <div className="size-11 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                    {rolledGame.primaryImageUrl ? (
                      <img
                        src={resolveImageUrl(rolledGame.primaryImageUrl)}
                        alt={rolledGame.title}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center bg-zinc-900 text-[9px] text-zinc-500">
                        Game
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-white truncate">
                      {rolledGame.title}
                    </h5>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-bold text-emerald-400">
                        {rolledGame.price === 0
                          ? (isVi ? "Miễn Phí" : isZh ? "免费" : "Free")
                          : formatPrice(rolledGame.discountPrice ?? rolledGame.price, rolledGame.currency)}
                      </span>
                      {rolledGame.hasDemo && (
                        <span className="text-[9px] font-semibold text-cyan-300 bg-cyan-500/10 px-1 rounded border border-cyan-500/20">
                          WebGL
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    href={`${prefix}/game/${rolledGame.slug}`}
                    onClick={onClose}
                    className="flex-1 h-7 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-[11px] flex items-center justify-center gap-1 transition active:scale-[0.98] shadow-sm cursor-pointer"
                  >
                    <span>{isVi ? "Khám Phá Ngay" : isZh ? "立即前往" : "View Game"}</span>
                    <ArrowRight className="size-3" />
                  </Link>

                  <button
                    type="button"
                    onClick={handleRollRoulette}
                    disabled={isRolling}
                    title={isVi ? "Lắc đổi tựa game khác" : "Shuffle another"}
                    className="h-7 px-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-zinc-300 hover:text-white text-[11px] flex items-center justify-center transition active:scale-[0.98] cursor-pointer"
                  >
                    <Shuffle className="size-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-0.5">
                <p className="text-[11px] text-zinc-400 leading-snug">
                  {isVi
                    ? "Phân vân chưa biết chọn game nào? Hãy lắc xúc xắc để Vault chọn cho bạn!"
                    : isZh
                    ? "不知道玩什么？点击骰子让 GameVault 为您随机推荐！"
                    : "Not sure what to play? Roll the dice for a mystery game pick!"}
                </p>
                <button
                  type="button"
                  onClick={handleRollRoulette}
                  disabled={isRolling}
                  className="w-full h-8 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-md shadow-violet-600/25 cursor-pointer"
                >
                  <Dices className={`size-3.5 ${isRolling ? "animate-spin" : ""}`} />
                  <span>{isVi ? "🎲 Lắc Game Ngẫu Nhiên" : isZh ? "🎲 随机抽取游戏" : "🎲 Roll Random Game"}</span>
                </button>
              </div>
            )}

          </div>
        </div>

      </aside>
    </>
  );
}
