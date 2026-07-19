"use client";

import { useLibrary } from "@/hooks/useGames";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Gamepad2 } from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { formatDateTimeShort, resolveImageUrl } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LibraryPage() {
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data, isLoading, refetch } = useLibrary();

  useEffect(() => {
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
      alert(locale === "vi" ? "Không thể tải game. Vui lòng thử lại sau." : "Failed to fetch download link. Please try again later.");
    }
  };

  const removeFromLibrary = async (gameId: string, title: string) => {
    const confirmMessage = locale === "vi" 
      ? `Bạn có chắc chắn muốn gỡ game "${title}" khỏi thư viện?`
      : `Are you sure you want to remove "${title}" from your library?`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      await api.delete(`/library/${gameId}`);
      refetch();
      alert(locale === "vi" ? "Đã gỡ game thành công." : "Game removed successfully.");
    } catch (error) {
      console.error("Failed to remove from library", error);
      alert(locale === "vi" ? "Có lỗi xảy ra khi gỡ game." : "Failed to remove game.");
    }
  };

  if (isLoading || user?.roles.includes("Admin")) {
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
              <div className="h-9 w-full rounded-xl bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const items = data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-white">{locale === "vi" ? "Thư viện game" : "My Library"} ({items.length})</h1>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500 border border-white/5 bg-zinc-900/20 rounded-2xl">
          <Gamepad2 className="mb-4 size-16 opacity-10" />
          <p className="text-zinc-400">{locale === "vi" ? "Thư viện của bạn đang trống." : "Your library is empty."}</p>
          <Link href={`/${locale}/games`} className="mt-4 text-sm font-semibold text-violet-400 hover:text-violet-300">
            {locale === "vi" ? "Mua game ngay" : "Browse Store"}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const g = item as Record<string, any>;
            const coverUrl = resolveImageUrl(g.coverUrl);
            return (
              <div key={g.gameId} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 p-4 transition hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-950/10 flex flex-col justify-between">
                <div>
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-zinc-850">
                    {coverUrl ? (
                      <img src={coverUrl} alt={g.title} className="size-full object-cover transition duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-zinc-700">
                        <Gamepad2 className="size-12" />
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <h3 className="font-semibold text-white text-lg truncate">{g.title}</h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      {locale === "vi" ? "Phiên bản" : "Version"}: {g.version ?? "1.0.0"}
                    </p>
                    {g.lastDownloadAt && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {locale === "vi" ? "Lần tải cuối" : "Last download"}: {formatDateTimeShort(g.lastDownloadAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-2 pt-3 border-t border-white/5">
                  <Button
                    className="text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
                    onClick={() => download(g.gameId)}
                  >
                    <Download className="size-3.5" />
                    {locale === "vi" ? "Tải game" : "Download"}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-xs hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 gap-1.5"
                    onClick={() => removeFromLibrary(g.gameId, g.title)}
                  >
                    <Trash2 className="size-3.5" />
                    {locale === "vi" ? "Gỡ game" : "Remove"}
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
