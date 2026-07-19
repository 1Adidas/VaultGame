"use client";

import { useWishlist } from "@/hooks/useGames";
import { formatPrice, resolveImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Trash2, Gamepad2 } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { api } from "@/lib/api/client";

export default function WishlistPage() {
  const locale = useLocale();
  const { data, isLoading, refetch } = useWishlist();

  const removeFromWishlist = async (gameId: string) => {
    try {
      await api.delete(`/wishlist/${gameId}`);
      refetch();
    } catch (error) {
      console.error("Failed to remove from wishlist", error);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Title skeleton */}
        <div className="mb-8 h-9 w-48 rounded bg-zinc-900/50 animate-pulse" />
        
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 p-4 space-y-4 animate-pulse">
              <div className="aspect-video w-full rounded-xl bg-zinc-800" />
              <div className="h-5 w-2/3 rounded bg-zinc-800" />
              <div className="flex gap-2 justify-between">
                <div className="h-9 w-24 rounded-lg bg-zinc-800" />
                <div className="h-9 w-24 rounded-lg bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const items = data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-white">{locale === "vi" ? "Danh sách yêu thích" : "Wishlist"} ({items.length})</h1>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500 border border-white/5 bg-zinc-900/20 rounded-2xl">
          <Gamepad2 className="mb-4 size-16 opacity-10" />
          <p className="text-zinc-400">{locale === "vi" ? "Danh sách yêu thích của bạn đang trống." : "Your wishlist is empty."}</p>
          <Link href={`/${locale}/games`} className="mt-4 text-sm font-semibold text-violet-400 hover:text-violet-300">
            {locale === "vi" ? "Khám phá cửa hàng" : "Browse Store"}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((game) => {
            const imageUrl = resolveImageUrl(game.primaryImageUrl);
            return (
              <div key={game.id} className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 p-3 transition hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-950/20">
                <Link href={`/${locale}/game/${game.slug}`} className="block">
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-zinc-800">
                    {imageUrl ? (
                      <img src={imageUrl} alt={game.title} className="size-full object-cover transition duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-zinc-600">No image</div>
                    )}
                  </div>
                  <div className="mt-4">
                    <h3 className="font-semibold text-white truncate group-hover:text-violet-300 transition">{game.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1">{game.categoryName}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
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
                      <span className="text-xs text-yellow-400 flex items-center gap-1 flex-shrink-0">★ {game.avgRating.toFixed(1)}</span>
                    </div>
                  </div>
                </Link>
                <div className="mt-4 pt-3 border-t border-white/5">
                  <Button
                    variant="outline"
                    className="w-full text-xs hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 gap-2"
                    onClick={() => removeFromWishlist(game.id)}
                  >
                    <Trash2 className="size-3.5" />
                    {locale === "vi" ? "Gỡ khỏi yêu thích" : "Remove"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
