"use client";

import { useWishlist } from "@/hooks/useGames";
import { formatPrice, resolveImageUrl } from "@/lib/utils";
import { Trash2, Gamepad2, ArrowRight, Heart, Star } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { api } from "@/lib/api/client";

export default function WishlistPage() {
  const locale = useLocale();
  const isVi = locale === "vi";
  const isZh = locale === "zh";
  const { data, isLoading, refetch } = useWishlist();
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    const token = typeof window !== "undefined" ? (localStorage.getItem("gv_access") || sessionStorage.getItem("gv_access")) : null;
    if (!token && !user) {
      router.replace(`/${locale}/login`);
    }
  }, [user, locale, router]);

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
      <div className="w-full space-y-8 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-[#0E131E]" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[4/3] rounded-2xl bg-[#0E131E] border border-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const items = data ?? [];

  return (
    <div className="w-full space-y-8">
      
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs font-semibold text-zinc-300">
            <Heart className="size-3.5 text-rose-400 fill-rose-400" />
            <span>{isVi ? "Tựa Game Đang Theo Dõi" : isZh ? "关注的游戏" : "Saved Titles"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isVi ? "Danh Sách Yêu Thích" : isZh ? "愿望清单" : "My Wishlist"}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {isVi
              ? `Bạn đang theo dõi ${items.length} tựa game để nhận thông báo giảm giá và cập nhật.`
              : isZh
              ? `正在关注 ${items.length} 款游戏，第一时间接收打折通知与更新动态。`
              : `Tracking ${items.length} titles for discount notifications and updates.`}
          </p>
        </div>
      </div>

      {/* ─── Grid or Empty State ─── */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-16 text-center space-y-4 shadow-xl">
          <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
            <Heart className="size-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">
              {isVi ? "Danh sách yêu thích đang trống" : isZh ? "愿望单空空如也" : "Your wishlist is empty"}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {isVi
                ? "Dạo quanh cửa hàng và nhấn nút 'Thêm Vào Yêu Thích' để lưu lại những tựa game bạn quan tâm."
                : isZh
                ? "去游戏商城逛逛，点击“加入愿望单”收藏你喜爱的游戏吧。"
                : "Browse through the storefront and click 'Add to Wishlist' on any game you want to keep an eye on."}
            </p>
          </div>
          <Link href={`/${locale}/games`} className="inline-block pt-2">
            <button className="btn-primary flex items-center gap-2">
              <span>{isVi ? "Khám Phá Cửa Hàng" : isZh ? "探索游戏商城" : "Browse Games Store"}</span>
              <ArrowRight className="size-4" />
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((game) => {
            const imageUrl = resolveImageUrl(game.primaryImageUrl);
            const discountPct =
              typeof game.discountPrice === "number" && game.discountPrice < game.price
                ? Math.round((1 - game.discountPrice / game.price) * 100)
                : 0;

            return (
              <div
                key={game.id}
                className="group rounded-2xl border border-white/[0.08] bg-[#0E131E] overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-300 hover:border-white/20 hover:-translate-y-1"
              >
                <Link href={`/${locale}/game/${game.slug}`} className="block">
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full overflow-hidden bg-[#080B11]">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={game.title}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-zinc-700">
                        <Gamepad2 className="size-12" />
                      </div>
                    )}
                    {discountPct > 0 && (
                      <div className="absolute top-3 left-3">
                        <span className="rounded-md bg-emerald-500/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-black text-black">
                          -{discountPct}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Information */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate">
                        {game.categoryName || (isVi ? "Game PC" : isZh ? "PC 游戏" : "PC Game")}
                      </span>
                      {game.avgRating > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                          <Star className="size-3 fill-amber-400" />
                          {game.avgRating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-white text-sm truncate group-hover:underline">
                      {game.title}
                    </h3>

                    {/* Price */}
                    <div className="pt-1">
                      {discountPct > 0 ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-extrabold text-emerald-400">
                            {formatPrice(game.discountPrice as number, game.currency)}
                          </span>
                          <span className="text-xs text-zinc-500 line-through">
                            {formatPrice(game.price, game.currency)}
                          </span>
                        </div>
                      ) : game.price === 0 ? (
                        <span className="text-base font-extrabold text-emerald-400">
                          {isVi ? "Miễn Phí" : isZh ? "免费" : "Free"}
                        </span>
                      ) : (
                        <span className="text-base font-extrabold text-white">
                          {formatPrice(game.price, game.currency)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Bottom Actions */}
                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                  <Link href={`/${locale}/game/${game.slug}`} className="w-full">
                    <button className="btn-primary text-xs w-full py-1.5">
                      {isVi ? "Xem Game" : isZh ? "查看详情" : "View"}
                    </button>
                  </Link>
                  <button
                    onClick={() => removeFromWishlist(game.id)}
                    className="btn-secondary text-xs w-full py-1.5 flex items-center justify-center gap-1 hover:text-rose-400 hover:border-rose-500/20"
                    title={isVi ? "Gỡ khỏi danh sách yêu thích" : isZh ? "从愿望单中移除" : "Remove from wishlist"}
                  >
                    <Trash2 className="size-3" />
                    <span>{isVi ? "Gỡ Bỏ" : isZh ? "移除" : "Remove"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
