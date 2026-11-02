"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { formatPrice, resolveImageUrl } from "@/lib/utils";
import { Star, Gamepad2 } from "lucide-react";

export interface GameListItem {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  price: number;
  discountPrice?: number;
  currency: string;
  avgRating: number;
  primaryImageUrl?: string;
  categoryName: string;
  hasDemo?: boolean;
}

export function GameCard({ game }: { game: GameListItem }) {
  const locale = useLocale();
  const isVi = locale === "vi";
  const isZh = locale === "zh";
  const hasDiscount = typeof game.discountPrice === "number" && game.discountPrice < game.price;
  const discountPercent = hasDiscount ? Math.round((1 - (game.discountPrice! / game.price)) * 100) : 0;

  return (
    <Link href={`/${locale}/game/${game.slug}`} className="group block focus:outline-none">
      <div className="surface-card rounded-2xl p-3 flex flex-col justify-between h-full transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:shadow-black/50 hover:-translate-y-1">
        
        {/* Clean Media Container */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#080B11]">
          {game.primaryImageUrl ? (
            <img
              src={resolveImageUrl(game.primaryImageUrl)}
              crossOrigin="anonymous"
              alt={game.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-600">
              <Gamepad2 className="size-8 opacity-30" />
            </div>
          )}

          {/* Minimal Badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
            {game.hasDemo ? (
              <span className="rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-200 backdrop-blur-md border border-white/10">
                WebGL Demo
              </span>
            ) : <span />}

            {hasDiscount && (
              <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                -{discountPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Content Hierarchy */}
        <div className="mt-3 flex flex-col flex-1 justify-between pt-1">
          <div>
            {/* Category & Rating Row */}
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
              <span className="text-[11px] font-medium tracking-wide uppercase text-zinc-400 truncate max-w-[150px]">
                {game.categoryName || (isVi ? "Game PC" : isZh ? "PC 游戏" : "PC Game")}
              </span>

              {game.avgRating > 0 && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  <span>{game.avgRating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Game Title */}
            <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-zinc-200 transition-colors">
              {game.title}
            </h3>
          </div>

          {/* Price */}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              {hasDiscount ? (
                <>
                  <span className="text-base font-extrabold text-emerald-400">
                    {formatPrice(game.discountPrice!, game.currency)}
                  </span>
                  <span className="text-xs text-zinc-500 line-through">
                    {formatPrice(game.price, game.currency)}
                  </span>
                </>
              ) : game.price === 0 ? (
                <span className="text-sm font-extrabold text-zinc-100 uppercase tracking-wide">
                  {isVi ? "Miễn Phí" : isZh ? "免费" : "Free"}
                </span>
              ) : (
                <span className="text-base font-extrabold text-white">
                  {formatPrice(game.price, game.currency)}
                </span>
              )}
            </div>
          </div>
        </div>

      </div>
    </Link>
  );
}

export function GameGrid({ games }: { games: GameListItem[] }) {
  const locale = useLocale();
  const isVi = locale === "vi";
  const isZh = locale === "zh";

  if (!games || games.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#0E131E]/40 p-16 text-center text-zinc-500">
        <Gamepad2 className="mx-auto size-10 opacity-30 mb-2" />
        <p className="text-sm">
          {isVi
            ? "Hiện chưa có tựa game nào trong danh mục này."
            : isZh
            ? "该分类下暂无游戏。"
            : "No games available in this category yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {games.map((g) => (
        <GameCard key={g.id} game={g} />
      ))}
    </div>
  );
}
