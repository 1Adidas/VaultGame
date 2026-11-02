"use client";

import { useLibrary } from "@/hooks/useGames";
import { api } from "@/lib/api/client";
import { Download, Trash2, Gamepad2, ArrowRight, Play, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "next-intl";
import Link from "next/link";
import { formatDateTimeShort, resolveImageUrl } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LibraryPage() {
  const locale = useLocale();
  const isVi = locale === "vi";
  const isZh = locale === "zh";
  const router = useRouter();
  const { user } = useAuthStore();
  const { data, isLoading, refetch } = useLibrary();

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? (localStorage.getItem("gv_access") || sessionStorage.getItem("gv_access")) : null;
    if (!token && !user) {
      router.replace(`/${locale}/login`);
      return;
    }
    if (user?.roles.includes("Admin")) {
      router.replace(`/${locale}/admin`);
    }
  }, [user, locale, router]);

  const download = async (gameId: string) => {
    try {
      const { data: res } = await api.get(`/library/${gameId}/download`);
      const url = (res as { data: { url: string } }).data.url;
      window.open(url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}${url}`, "_blank");
      refetch();
    } catch (error: any) {
      console.error("Failed to download", error);
      alert(isVi ? "Không thể tải game. Vui lòng thử lại sau." : isZh ? "获取下载链接失败，请稍后重试。" : "Failed to fetch download link. Please try again later.");
    }
  };
  const removeFromLibrary = async (gameId: string, title: string) => {
    const confirmMessage = isVi 
      ? `Bạn có chắc chắn muốn gỡ game "${title}" khỏi thư viện?`
      : isZh
      ? `确定要从您的游戏库中移除《${title}》吗？`
      : `Are you sure you want to remove "${title}" from your library?`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      await api.delete(`/library/${gameId}`);
      refetch();
      alert(isVi ? "Đã gỡ game thành công." : isZh ? "已成功移除游戏。" : "Game removed successfully.");
    } catch (error) {
      console.error("Failed to remove from library", error);
      alert(isVi ? "Có lỗi xảy ra khi gỡ game." : isZh ? "移除游戏时发生错误。" : "Failed to remove game.");
    }
  };

  if (!user || isLoading || user?.roles.includes("Admin")) {
    return (
      <div className="w-full space-y-8 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-[#0E131E]" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/3] rounded-2xl bg-[#0E131E] border border-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const items = data ?? [];
  const filteredItems = items.filter((item: any) =>
    item.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-8">
      
      {/* ─── Header & Search Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs font-semibold text-zinc-300">
            <Gamepad2 className="size-3.5" />
            <span>{isVi ? "Kho Game Của Bạn" : isZh ? "已拥有的游戏" : "Owned Collection"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isVi ? "Thư Viện Trò Chơi" : isZh ? "我的游戏库" : "My Game Library"}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {isVi
              ? `Bạn đang sở hữu ${items.length} tựa game bản quyền chính hãng.`
              : isZh
              ? `您当前拥有 ${items.length} 款官方正版数字授权游戏。`
              : `You own ${items.length} digital licensed games.`}
          </p>
        </div>

        {items.length > 0 && (
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder={isVi ? "Lọc game trong thư viện..." : isZh ? "搜索已拥有的游戏..." : "Search your library..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0E131E] px-3.5 py-2 pl-9 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-white/30"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
          </div>
        )}
      </div>

      {/* ─── Content Grid ─── */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-16 text-center space-y-4 shadow-xl">
          <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
            <Gamepad2 className="size-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">
              {isVi ? "Thư viện của bạn đang trống" : isZh ? "您的游戏库为空" : "Your library is empty"}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {isVi
                ? "Khám phá ngay hàng trăm tựa game hấp dẫn hoặc nhận game miễn phí trên Game Vault."
                : isZh
                ? "即刻探索 Game Vault 海量精彩游戏大作或免费领取正版游戏。"
                : "Explore our catalog of genuine digital titles and free games on Game Vault."}
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const g = item as Record<string, any>;
            const coverUrl = resolveImageUrl(g.coverUrl);

            return (
              <div
                key={g.gameId}
                className="group rounded-2xl border border-white/[0.08] bg-[#0E131E] overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-300 hover:border-white/20 hover:-translate-y-1"
              >
                <div>
                  {/* Media container */}
                  <div className="relative aspect-video w-full overflow-hidden bg-[#080B11]">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={g.title}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-zinc-700">
                        <Gamepad2 className="size-12" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className="rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-zinc-300 border border-white/10">
                        v{g.version ?? "1.0.0"}
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 space-y-2">
                    <Link href={`/${locale}/game/${g.slug || ""}`}>
                      <h3 className="font-bold text-white text-base truncate hover:underline">
                        {g.title}
                      </h3>
                    </Link>
                    {g.lastDownloadAt ? (
                      <p className="text-[11px] text-zinc-500">
                        {isVi ? "Lần tải gần nhất: " : isZh ? "上次下载： " : "Last download: "}{formatDateTimeShort(g.lastDownloadAt)}
                      </p>
                    ) : (
                      <p className="text-[11px] text-emerald-400 font-medium">
                        {isVi ? "Sẵn sàng để tải xuống" : isZh ? "已就绪，可随时下载" : "Ready to download"}
                      </p>
                    )}
                  </div>
                </div>
                {/* Actions bottom */}
                <div className="p-5 pt-0 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2.5">
                    <a
                      href={`gamevault://open/${g.gameId}`}
                      className="btn-primary text-xs flex items-center justify-center gap-1.5 !bg-emerald-600 hover:!bg-emerald-500 !text-white"
                      title={isVi ? "Mở GameVault Launcher trên máy tính" : "Open GameVault Launcher"}
                    >
                      <Gamepad2 className="size-3.5" />
                      <span>{isVi ? "Mở Launcher" : isZh ? "启动器打开" : "Open Launcher"}</span>
                    </a>

                    <button
                      onClick={() => download(g.gameId)}
                      className="btn-secondary text-xs flex items-center justify-center gap-1.5 hover:text-white"
                      title={isVi ? "Tải gói cài đặt trực tiếp qua trình duyệt" : "Download directly"}
                    >
                      <Download className="size-3.5" />
                      <span>{isVi ? "Tải Trực Tiếp" : isZh ? "直接下载" : "Direct Download"}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromLibrary(g.gameId, g.title)}
                    className="btn-secondary text-xs flex items-center justify-center gap-1.5 hover:text-rose-400 hover:border-rose-500/20"
                    title={isVi ? "Gỡ khỏi thư viện" : isZh ? "从游戏库移除" : "Remove from library"}
                  >
                    <Trash2 className="size-3.5" />
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
