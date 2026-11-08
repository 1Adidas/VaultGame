"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useGames, useCategories } from "@/hooks/useGames";
import { GameCard, GameGrid, type GameListItem } from "@/components/game/GameCard";
import { formatPrice, resolveImageUrl } from "@/lib/utils";
import {
  Play,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Zap,
  ShieldCheck,
  Trophy,
  Flame,
  Layers,
  Gamepad2
} from "lucide-react";

export default function HomePage() {
  const locale = useLocale();
  const isVi = locale === "vi";
  const isZh = locale === "zh";

  // Data Queries
  const { data: featuredData } = useGames({ featured: true, pageSize: 6 });
  const { data: discountedGamesData } = useGames({ discounted: true, pageSize: 6 });
  const { data: newReleasesData } = useGames({ sort: "newest", pageSize: 6 });
  const { data: topRatedData } = useGames({ sort: "rating", pageSize: 5 });
  const { data: demoGamesData } = useGames({ hasDemo: true, pageSize: 4 });
  const { data: categories } = useCategories();

  // Hero Carousel State & Auto-play Configuration
  const HERO_AUTOPLAY_INTERVAL = 6000;
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [rotationKey, setRotationKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const heroGames: GameListItem[] =
    featuredData?.games && featuredData.games.length > 0
      ? featuredData.games.slice(0, 5)
      : newReleasesData?.games?.slice(0, 5) ?? [];

  const currentHero = heroGames[activeHeroIndex] ?? heroGames[0];

  const progressBarRef = useRef<HTMLDivElement>(null);

  // Smooth, frame-accurate progress bar animation & slide rotation
  useEffect(() => {
    if (heroGames.length <= 1) return;

    let animationFrameId: number;
    let startTime: number | null = null;
    let elapsedBeforePause = 0;

    const step = (timestamp: number) => {
      if (isPaused) {
        startTime = null;
        animationFrameId = requestAnimationFrame(step);
        return;
      }

      if (startTime === null) {
        startTime = timestamp - elapsedBeforePause;
      }

      const elapsed = timestamp - startTime;
      elapsedBeforePause = elapsed;
      const progress = Math.min(elapsed / HERO_AUTOPLAY_INTERVAL, 1);

      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${progress})`;
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setActiveHeroIndex((prev) => (prev + 1) % heroGames.length);
        setRotationKey((k) => k + 1);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = "scaleX(0)";
      }
    };
  }, [activeHeroIndex, isPaused, heroGames.length]);

  // Keep active index in bounds if heroGames change dynamically
  useEffect(() => {
    if (heroGames.length > 0 && activeHeroIndex >= heroGames.length) {
      setActiveHeroIndex(0);
    }
  }, [heroGames.length, activeHeroIndex]);

  const nextHero = () => {
    if (heroGames.length <= 1) return;
    setActiveHeroIndex((prev) => (prev + 1) % heroGames.length);
    setRotationKey((k) => k + 1);
  };

  const prevHero = () => {
    if (heroGames.length <= 1) return;
    setActiveHeroIndex((prev) => (prev - 1 + heroGames.length) % heroGames.length);
    setRotationKey((k) => k + 1);
  };

  const selectHero = (idx: number) => {
    if (idx === activeHeroIndex) return;
    setActiveHeroIndex(idx);
    setRotationKey((k) => k + 1);
  };

  // Top 5 Leaderboard items
  const leaderboardGames =
    topRatedData?.games && topRatedData.games.length > 0
      ? topRatedData.games.slice(0, 5)
      : heroGames.slice(0, 5);

  return (
    <div className="space-y-16 pb-20">

      {/* =========================================================================
          1. ULTRA-WIDE CINEMATIC HERO SHOWCASE & LIVE QUEUE (SMOOTH SLIDER)
      ========================================================================= */}
      {currentHero ? (
        <div className="relative group/hero">
          {/* Dynamic Ambient Aura Behind the Hero Stage */}
          <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-violet-600/25 via-cyan-500/20 to-indigo-600/25 blur-3xl rounded-[36px] -z-10 pointer-events-none transition-all duration-1000 opacity-70 group-hover/hero:opacity-100" />

          <section
            className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0A0D15] shadow-2xl"
          >
            {/* Cinematic Optical Flare Wipe Sweep on Slide Change */}
            <div
              key={`flare-${activeHeroIndex}-${rotationKey}`}
              className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
            >
              <div className="absolute inset-y-0 w-64 bg-gradient-to-r from-transparent via-cyan-400/35 via-violet-500/20 to-transparent blur-2xl animate-hero-flare" />
            </div>

            {/* Bottom Edge Master Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 sm:h-1.5 bg-white/10 z-20 overflow-hidden pointer-events-none">
              <div
                ref={progressBarRef}
                style={{ transform: "scaleX(0)", transformOrigin: "left" }}
                className="h-full w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 shadow-[0_0_12px_rgba(0,242,254,0.9)] will-change-transform"
              />
            </div>

            {/* Hardware-Accelerated Sliding Carousel Artwork Stage */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              {heroGames.map((game, idx) => {
                const isCurrent = idx === activeHeroIndex;
                if (!game.primaryImageUrl) return null;

                // Calculate relative wrapped offset for flawless directional sliding
                let offset = (idx - activeHeroIndex + heroGames.length) % heroGames.length;
                if (offset > heroGames.length / 2) offset -= heroGames.length;

                let slideClass = "translate-x-full opacity-0 pointer-events-none scale-105";
                if (offset === 0) {
                  slideClass = "translate-x-0 opacity-100 scale-100 z-10";
                } else if (offset === -1 || offset < 0) {
                  slideClass = "-translate-x-full opacity-0 pointer-events-none scale-95";
                } else {
                  slideClass = "translate-x-full opacity-0 pointer-events-none scale-105";
                }

                return (
                  <div
                    key={game.id}
                    className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${slideClass}`}
                  >
                    <img
                      src={resolveImageUrl(game.primaryImageUrl)}
                      crossOrigin="anonymous"
                      alt={game.title}
                      className="size-full object-cover object-center"
                    />
                    {/* Directional contrast mask: dark on left for text legibility, clear on center & right */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#070A10]/95 via-[#070A10]/80 via-40% to-transparent w-full lg:w-3/5" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070A10]/95 via-[#070A10]/30 to-transparent h-40 bottom-0 top-auto" />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#070A10]/60 via-transparent to-transparent h-24 top-0" />
                  </div>
                );
              })}
            </div>

            {/* Main Stage Grid: Hero Spotlight + Live Queue */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 min-h-[520px] lg:min-h-[580px]">
              
              {/* Left 8 Columns: Hero Feature Details with Fluid Entrance */}
              <div
                key={`${currentHero.id}-${rotationKey}`}
                className="lg:col-span-8 p-6 sm:p-10 md:p-14 flex flex-col justify-end space-y-5 relative z-10"
              >
                
                {/* Cinema Editorial Stamp: Pure Typographic Craft (Zero icons, zero pulsing dots, zero generic pill badges) */}
                <div className="flex flex-wrap items-center gap-3 text-xs tracking-[0.2em] uppercase font-bold text-zinc-400 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <span className="text-cyan-400 font-black tracking-[0.25em]">
                    {isVi ? "TÂM ĐIỂM TUẦN" : isZh ? "本周首发" : "FEATURED PREMIERE"}
                  </span>
                  <span className="text-zinc-600 select-none">/</span>
                  <span className="text-zinc-200">
                    {currentHero.categoryName || (isVi ? "Game Hành Động" : "Action")}
                  </span>
                  {currentHero.hasDemo && (
                    <>
                      <span className="text-zinc-600 select-none">/</span>
                      <span className="text-emerald-400 font-semibold tracking-wider">
                        {isVi ? "Bản Chơi Thử Trực Tiếp" : isZh ? "免安装试玩" : "Instant WebGL Demo"}
                      </span>
                    </>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-normal text-white uppercase tracking-wider leading-[1.05] drop-shadow-[0_12px_28px_rgba(0,0,0,0.9)] animate-in fade-in slide-in-from-left-4 duration-600 font-gaming">
                  {currentHero.title}
                </h1>

                {/* Pitch */}
                <p className="text-xs sm:text-sm md:text-base text-zinc-300 font-normal leading-relaxed line-clamp-2 max-w-xl animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
                  {currentHero.shortDescription ||
                    (isVi
                      ? "Trải nghiệm tựa game bản quyền đỉnh cao với đồ họa vượt trội và cơ chế gameplay độc bản trên GameVault."
                      : isZh
                      ? "在 GameVault 畅享顶尖正版数字力作，感受震撼画面与沉浸式玩法体验。"
                      : "Experience premier authentic digital gaming with captivating gameplay and state-of-the-art visuals.")}
                </p>

                {/* Price & Primary CTA Cluster */}
                <div className="pt-2 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150">
                  {/* Fixed-width price slot so buttons to the right never shift when text length varies */}
                  <div className="w-36 sm:w-44 shrink-0 flex items-center">
                    {typeof currentHero.discountPrice === "number" && currentHero.discountPrice < currentHero.price ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                          {formatPrice(currentHero.discountPrice, currentHero.currency)}
                        </span>
                        <span className="text-xs text-zinc-400 line-through">
                          {formatPrice(currentHero.price, currentHero.currency)}
                        </span>
                      </div>
                    ) : currentHero.price === 0 ? (
                      <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                        {isVi ? "Miễn Phí" : isZh ? "免费" : "Free"}
                      </span>
                    ) : (
                      <span className="text-2xl sm:text-3xl font-black text-white">
                        {formatPrice(currentHero.price, currentHero.currency)}
                      </span>
                    )}
                  </div>

                  {/* Fixed-position Action Button Cluster */}
                  <div className="flex items-center gap-3">
                    {currentHero.hasDemo ? (
                      <Link href={`/${locale}/game/${currentHero.slug}`}>
                        <button className="h-11 px-6 min-w-[185px] justify-center rounded-full bg-white text-black font-bold text-xs hover:bg-zinc-200 transition active:scale-[0.98] shadow-xl flex items-center gap-2 cursor-pointer shrink-0">
                          <Play className="size-3.5 fill-black" />
                          <span>{isVi ? "Chơi Thử WebGL Ngay" : isZh ? "即刻试玩 WebGL" : "Play WebGL Demo"}</span>
                        </button>
                      </Link>
                    ) : (
                      <Link href={`/${locale}/game/${currentHero.slug}`}>
                        <button className="h-11 px-6 min-w-[185px] justify-center rounded-full bg-white text-black font-bold text-xs hover:bg-zinc-200 transition active:scale-[0.98] shadow-xl flex items-center gap-2 cursor-pointer shrink-0">
                          <span>{isVi ? "Khám Phá & Mua" : isZh ? "探索并购买" : "Explore Game"}</span>
                        </button>
                      </Link>
                    )}

                    <Link href={`/${locale}/game/${currentHero.slug}`}>
                      <button className="h-11 px-5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white font-medium text-xs transition active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shrink-0">
                        <span>{isVi ? "Chi Tiết" : isZh ? "详情" : "Details"}</span>
                        <ArrowRight className="size-3.5" />
                      </button>
                    </Link>

                    {/* Prev / Next tactile arrow navigation */}
                    <div className="hidden sm:flex items-center gap-1.5 ml-1 shrink-0">
                      <button
                        type="button"
                        onClick={prevHero}
                        className="size-9 rounded-full bg-white/[0.06] hover:bg-white/[0.18] border border-white/10 text-white flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md"
                        title={isVi ? "Game trước" : "Previous"}
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={nextHero}
                        className="size-9 rounded-full bg-white/[0.06] hover:bg-white/[0.18] border border-white/10 text-white flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md"
                        title={isVi ? "Game tiếp theo" : "Next"}
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right 4 Columns: Live Interactive Queue Rail */}
              <div
                className="lg:col-span-4 p-6 lg:p-8 flex flex-col justify-end border-t lg:border-t-0 lg:border-l border-white/[0.06] bg-[#070A11]/60 backdrop-blur-md relative z-10"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      {isVi ? "Danh Sách Nổi Bật Tiếp Theo" : isZh ? "轮播队列" : "Featured Queue"}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {activeHeroIndex + 1} / {heroGames.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {heroGames.map((g, idx) => {
                      const isCurrent = idx === activeHeroIndex;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => selectHero(idx)}
                          className={`group relative w-full p-2.5 rounded-2xl border text-left transition-all duration-300 flex items-center gap-3 cursor-pointer select-none ${
                            isCurrent
                              ? "bg-gradient-to-r from-cyan-500/15 via-white/[0.08] to-violet-500/10 border-cyan-400/50 shadow-[0_0_28px_rgba(0,242,254,0.2)] scale-[1.03] translate-x-1.5"
                              : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.12] hover:translate-x-1"
                          }`}
                        >
                          {/* Active Neon Accent Left Indicator */}
                          {isCurrent && (
                            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-cyan-400 via-indigo-500 to-violet-500 shadow-[0_0_12px_rgba(0,242,254,0.7)]" />
                          )}

                          <span className={`text-[10px] font-mono font-bold shrink-0 transition-colors ${
                            isCurrent ? "text-cyan-400" : "text-zinc-600 group-hover:text-zinc-400"
                          }`}>
                            0{idx + 1}
                          </span>

                          <div className={`size-11 rounded-xl overflow-hidden bg-zinc-900 shrink-0 border relative transition-all duration-300 ${
                            isCurrent ? "border-cyan-400/80 ring-2 ring-cyan-400/50 shadow-md shadow-cyan-400/20" : "border-white/10"
                          }`}>
                            {g.primaryImageUrl && (
                              <img
                                src={resolveImageUrl(g.primaryImageUrl)}
                                crossOrigin="anonymous"
                                alt={g.title}
                                className="size-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className={`text-xs font-semibold truncate transition-colors ${
                              isCurrent ? "text-cyan-300 font-bold" : "text-white group-hover:text-cyan-300"
                            }`}>
                              {g.title}
                            </h4>
                            <span className="text-[10px] text-zinc-400 block truncate mt-0.5">
                              {g.categoryName || "Game PC"}
                            </span>
                          </div>

                          <span className="text-xs font-bold text-zinc-300 shrink-0">
                            {g.price === 0
                              ? (isVi ? "Miễn Phí" : "Free")
                              : formatPrice(g.discountPrice ?? g.price, g.currency)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          </section>
        </div>
      ) : null}

      {/* =========================================================================
          2. BENTO STOREFRONT ARCHITECTURE: FLAGSHIP SPOTLIGHT + TOP 5 LEADERBOARD
      ========================================================================= */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-white/[0.06] pb-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-400">
              {isVi ? "Bảng Vinh Danh & Đề Cử" : isZh ? "排行榜与精选" : "Top Charts & Picks"}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mt-1">
              {isVi ? "Tâm Điểm Cửa Hàng" : isZh ? "热销风向标" : "Storefront Showcase"}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {isVi
                ? "Những trò chơi được cộng đồng game thủ săn đón và tải nhiều nhất"
                : isZh
                ? "玩家社区最受追捧、下载量最高的热门力作"
                : "Top recommended titles trending across the GameVault community"}
            </p>
          </div>
          <Link
            href={`/${locale}/games`}
            className="group text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors px-3 py-1.5 rounded-full hover:bg-white/[0.06]"
          >
            <span>{isVi ? "Xem toàn bộ kho game" : isZh ? "查看全部" : "Explore Catalog"}</span>
            <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Bento Flagship Spotlight Card (8 Cols) */}
          {heroGames[0] && (
            <div className="lg:col-span-8 rounded-3xl border border-white/[0.08] bg-[#0A0E18] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30">
                    {isVi ? "Siêu Phẩm Tuần Này" : "Weekly Flagship"}
                  </span>
                  {heroGames[0].hasDemo && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      WebGL Demo
                    </span>
                  )}
                </div>

                <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black/60 border border-white/10 relative shadow-2xl">
                  {heroGames[0].primaryImageUrl && (
                    <img
                      src={resolveImageUrl(heroGames[0].primaryImageUrl)}
                      alt={heroGames[0].title}
                      className="size-full object-cover group-hover:scale-102 transition-transform duration-700"
                    />
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {heroGames[0].title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                    {heroGames[0].shortDescription || "Khám phá tựa game đỉnh cao với công nghệ đồ họa mới nhất."}
                  </p>
                </div>
              </div>

              <div className="relative z-10 pt-6 mt-4 border-t border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Giá bán</span>
                  <span className="text-lg font-bold text-white">
                    {heroGames[0].price === 0
                      ? (isVi ? "Miễn Phí" : "Free")
                      : formatPrice(heroGames[0].discountPrice ?? heroGames[0].price, heroGames[0].currency)}
                  </span>
                </div>
                <Link href={`/${locale}/game/${heroGames[0].slug}`}>
                  <button className="h-10 px-5 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition active:scale-[0.98] cursor-pointer">
                    {isVi ? "Xem Chi Tiết →" : "View Details →"}
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* Bento Top 5 Leaderboard Column (4 Cols) */}
          <div className="lg:col-span-4 rounded-3xl border border-white/[0.08] bg-[#0A0E18] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="size-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {isVi ? "Bảng Xếp Hạng Đánh Giá" : isZh ? "好评风云榜" : "Top Rated Games"}
                  </h3>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">TOP 5</span>
              </div>

              <div className="space-y-2.5">
                {leaderboardGames.map((game, index) => {
                  const rankColors = [
                    "bg-amber-400 text-black", // #1 Gold
                    "bg-zinc-300 text-black",  // #2 Silver
                    "bg-amber-700 text-white", // #3 Bronze
                    "bg-white/10 text-zinc-400", // #4
                    "bg-white/10 text-zinc-400", // #5
                  ];

                  return (
                    <Link
                      key={game.id}
                      href={`/${locale}/game/${game.slug}`}
                      className="group flex items-center gap-3 p-2 rounded-2xl hover:bg-white/[0.06] transition"
                    >
                      {/* Rank Badge */}
                      <span className={`size-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${rankColors[index] || "bg-white/10 text-zinc-400"}`}>
                        {index + 1}
                      </span>

                      {/* Thumbnail */}
                      <div className="size-10 rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-white/10">
                        {game.primaryImageUrl && (
                          <img
                            src={resolveImageUrl(game.primaryImageUrl)}
                            alt={game.title}
                            className="size-full object-cover group-hover:scale-105 transition-transform"
                          />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate group-hover:text-zinc-200">
                          {game.title}
                        </h4>
                        <span className="text-[10px] text-zinc-500 block truncate">
                          {game.categoryName || "Game PC"}
                        </span>
                      </div>

                      {/* Price / Demo Badge */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-zinc-200 block">
                          {game.price === 0
                            ? (isVi ? "Miễn Phí" : "Free")
                            : formatPrice(game.discountPrice ?? game.price, game.currency)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-white/[0.06]">
              <Link href={`/${locale}/games?sort=rating`} className="block">
                <button className="w-full py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition text-center cursor-pointer">
                  {isVi ? "Xem bảng xếp hạng đầy đủ →" : "View Full Leaderboard →"}
                </button>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          3. INSTANT WEBGL DEMO ARENA (CHƠI THỬ TRỰC TIẾP TRÊN TRÌNH DUYỆT)
      ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-[#081515] via-[#070A10] to-[#0A0D18] p-6 sm:p-10 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-white/[0.06] pb-6 mb-8">
          <div className="space-y-1.5 max-w-xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Zap className="size-3.5 text-emerald-400" />
              {isVi ? "Đấu Trường WebGL" : isZh ? "WebGL 试玩专区" : "Instant WebGL Arena"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {isVi ? "Chơi Thử Tức Thì Không Cần Cài Đặt" : isZh ? "即刻试玩，无需下载" : "Zero-Install Instant Demos"}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              {isVi
                ? "Khởi chạy trải nghiệm gameplay trực tiếp trên Chrome, Edge, Safari hoặc Firefox với đồ họa 3D thời gian thực."
                : isZh
                ? "直接在主流浏览器中体验即时 3D 游戏操作与核心玩法，完全免费免下载。"
                : "Launch full 3D interactive gameplay directly inside your web browser. Completely free, no disk installation."}
            </p>
          </div>

          <Link href={`/${locale}/games?hasDemo=true`}>
            <button className="h-11 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition active:scale-[0.98] shadow-lg shadow-emerald-500/20 cursor-pointer">
              {isVi ? "Khám Phá Tất Cả Bản Demo →" : isZh ? "浏览全部试玩 →" : "Browse All Demos →"}
            </button>
          </Link>
        </div>

        {/* Demo Games Grid */}
        {demoGamesData?.games && demoGamesData.games.length > 0 ? (
          <GameGrid games={demoGamesData.games} />
        ) : (
          <div className="p-8 text-center text-zinc-500 text-xs">
            {isVi ? "Đang đồng bộ danh sách game có WebGL Demo..." : "Syncing WebGL demos..."}
          </div>
        )}
      </section>

      {/* =========================================================================
          4. SPECIAL DEALS & PROMOTIONS (ƯU ĐÃI TUẦN NÀY)
      ========================================================================= */}
      {discountedGamesData?.games && discountedGamesData.games.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between border-b border-white/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">
                {isVi ? "Cơ Hội Tiết Kiệm" : isZh ? "本周特惠" : "Promotions"}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mt-1">
                {isVi ? "Ưu Đãi Đặc Biệt & Giảm Giá" : isZh ? "特别优惠" : "Special Offers"}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {isVi
                  ? "Các tựa game bản quyền đang áp dụng chính sách giảm giá tốt nhất"
                  : isZh
                  ? "限时特惠折扣中的正版游戏精选"
                  : "Authentic digital game licenses on limited-time discounts"}
              </p>
            </div>
            <Link
              href={`/${locale}/games?discounted=true`}
              className="group text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors px-3 py-1.5 rounded-full hover:bg-white/[0.06]"
            >
              <span>{isVi ? "Xem tất cả ưu đãi" : isZh ? "查看全部特惠" : "View all deals"}</span>
              <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <GameGrid games={discountedGamesData.games.slice(0, 4)} />
        </section>
      )}

      {/* =========================================================================
          5. NEW ARRIVALS (MỚI PHÁT HÀNH)
      ========================================================================= */}
      {newReleasesData?.games && newReleasesData.games.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between border-b border-white/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                {isVi ? "Mới Lên Sàn" : isZh ? "最新发布" : "Just Added"}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mt-1">
                {isVi ? "Mới Cập Nhật & Phát Hành" : isZh ? "最新上架" : "New Releases"}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {isVi
                  ? "Những tựa game bản quyền mới nhất vừa cập bến kho lưu trữ GameVault"
                  : isZh
                  ? "刚刚登陆 GameVault 的正版力作"
                  : "Latest authentic titles recently added to GameVault"}
              </p>
            </div>
            <Link
              href={`/${locale}/games?sort=newest`}
              className="group text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors px-3 py-1.5 rounded-full hover:bg-white/[0.06]"
            >
              <span>{isVi ? "Xem tất cả game mới" : isZh ? "查看全部新品" : "View all new"}</span>
              <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <GameGrid games={newReleasesData.games.slice(0, 4)} />
        </section>
      )}

      {/* =========================================================================
          6. BROWSE BY GENRE CAPSULES (KHÁM PHÁ THEO THỂ LOẠI)
      ========================================================================= */}
      {categories && categories.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between border-b border-white/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {isVi ? "Danh Mục Trò Chơi" : isZh ? "游戏分类" : "Categories"}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mt-1">
                {isVi ? "Khám Phá Theo Phong Cách Game" : isZh ? "按类型探索" : "Browse by Genre"}
              </h2>
            </div>
            <Link
              href={`/${locale}/games`}
              className="group text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors px-3 py-1.5 rounded-full hover:bg-white/[0.06]"
            >
              <span>{isVi ? "Xem cửa hàng" : "Go to store"}</span>
              <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/${locale}/games?categoryId=${cat.id}`}
                className="group relative overflow-hidden p-4 rounded-2xl bg-[#0A0E18] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.18] transition-all text-left flex flex-col justify-between min-h-[96px] active:scale-[0.98] shadow-sm hover:shadow-xl"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {isVi ? "Thể loại" : "Genre"}
                </span>
                <span className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors line-clamp-1">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          7. PLATFORM QUALITY PILLARS & GUARANTEES
      ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        <div className="p-5 rounded-2xl bg-[#0A0D15] border border-white/[0.06] space-y-2">
          <span className="text-xs font-bold text-white block">
            {isVi ? "Bản Quyền 100% Chính Hãng" : isZh ? "100% 正版官方授权" : "100% Genuine Digital License"}
          </span>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {isVi
              ? "Phân phối bản quyền kỹ thuật số trực tiếp từ nhà phát triển và đối tác được ủy quyền."
              : isZh
              ? "直接由游戏开发商及官方授权合作伙伴分发正版数字版权。"
              : "Direct digital distribution authorized by developers and verified publishers."}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0A0D15] border border-white/[0.06] space-y-2">
          <span className="text-xs font-bold text-white block">
            {isVi ? "Thanh Toán VietQR Tự Động" : isZh ? "VietQR 自动极速支付" : "Automated VietQR Payment"}
          </span>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {isVi
              ? "Quét mã QR chuyển khoản ngân hàng 24/7, kích hoạt trò chơi tức thì vào kho cá nhân."
              : isZh
              ? "24/7 全天候银行二维码极速转账，游戏即时秒级激活入库。"
              : "Instant 24/7 banking QR transfer, activating games to your library immediately."}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0A0D15] border border-white/[0.06] space-y-2">
          <span className="text-xs font-bold text-white block">
            {isVi ? "Chơi Thử WebGL Không Cài Đặt" : isZh ? "WebGL 免安装即时试玩" : "No-Install WebGL Demo Play"}
          </span>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {isVi
              ? "Trải nghiệm gameplay thời gian thực trực tiếp trên trình duyệt web chỉ bằng 1 cú nhấp chuột."
              : isZh
              ? "只需一键点击，即可在网页浏览器中直接体验实时游戏玩法。"
              : "Experience real-time gameplay directly in your web browser with a single click."}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0A0D15] border border-white/[0.06] space-y-2">
          <span className="text-xs font-bold text-white block">
            {isVi ? "Bảo Hành Bản Quyền Trọn Đời" : isZh ? "正版授权永久质保" : "Lifetime License Guarantee"}
          </span>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {isVi
              ? "Trò chơi gắn liền vĩnh viễn với tài khoản của bạn, tải lại không giới hạn số lần trên mọi thiết bị."
              : isZh
              ? "数字游戏授权永久绑定至您的个人账户，支持无限次多设备下载与自动更新。"
              : "Digital licenses are permanently tied to your account with unlimited downloads on all devices."}
          </p>
        </div>
      </section>

    </div>
  );
}
