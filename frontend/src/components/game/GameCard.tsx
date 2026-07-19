"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { Card } from "@/components/ui/button";
import { formatPrice, resolveImageUrl } from "@/lib/utils";

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
  return (
    <Link href={`/${locale}/game/${game.slug}`}>
      <Card className="group overflow-hidden transition hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-900/20">
        <div className="aspect-video overflow-hidden rounded-lg bg-zinc-800 relative">
          {game.primaryImageUrl ? (
            <img src={resolveImageUrl(game.primaryImageUrl)} crossOrigin="anonymous" alt={game.title} className="h-full w-full object-cover transition group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-600">No image</div>
          )}
          {game.hasDemo && (
            <span className="absolute top-2 right-2 bg-violet-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow">
              WebGL Demo
            </span>
          )}
        </div>
        <div className="mt-3">
          <h3 className="font-semibold line-clamp-1">{game.title}</h3>
          <p className="text-xs text-zinc-400 h-4 line-clamp-1">{game.categoryName || "\u00A0"}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {typeof game.discountPrice === "number" && game.discountPrice < game.price ? (
                <>
                  <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded leading-none select-none">
                    -{Math.round((1 - game.discountPrice / game.price) * 100)}%
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] text-zinc-500 line-through">
                      {formatPrice(game.price, game.currency)}
                    </span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {formatPrice(game.discountPrice, game.currency)}
                    </span>
                  </div>
                </>
              ) : (
                <span className="font-bold text-violet-300 text-sm">
                  {formatPrice(game.price, game.currency)}
                </span>
              )}
            </div>
            {game.avgRating > 0 && (
              <span className="text-xs text-yellow-400 flex-shrink-0">★ {game.avgRating.toFixed(1)}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function GameGrid({ games }: { games: GameListItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {games.map((g) => <GameCard key={g.id} game={g} />)}
    </div>
  );
}
