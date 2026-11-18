"use client";

import { useLibrary } from "@/hooks/useGames";
import { api } from "@/lib/api/client";
import { LayoutGrid, List, MoreHorizontal } from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { formatDate, formatDateTimeShort, resolveImageUrl } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth/store";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LaunchInLauncherModal,
  triggerGameVaultLauncher,
} from "@/components/launcher/LaunchInLauncherModal";

type SortMode = "recent" | "az" | "downloaded";
type ViewMode = "grid" | "list";

interface LibraryItem {
  gameId: string;
  title: string;
  slug?: string;
  coverUrl?: string | null;
  acquiredAt?: string;
  version?: string;
  lastDownloadAt?: string | null;
}

export default function LibraryPage() {
  const locale = useLocale();
  const isVi = locale === "vi";
  const isZh = locale === "zh";
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { data, isLoading, refetch } = useLibrary();

  const [sortBy, setSortBy] = useState<SortMode>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [launcherTarget, setLauncherTarget] = useState<{ id: string; title: string } | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace(`/${locale}/login`);
      return;
    }
    if (user.roles.includes("Admin")) {
      router.replace(`/${locale}/admin`);
    }
  }, [user, isHydrated, locale, router]);

  useEffect(() => {
    if (!openMenuId) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuId(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  const openInLauncher = (gameId: string, title: string) => {
    setOpenMenuId(null);
    triggerGameVaultLauncher(gameId);
    setLauncherTarget({ id: gameId, title });
  };

  const removeFromLibrary = async (gameId: string, title: string) => {
    setOpenMenuId(null);
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

  const items = useMemo(() => (data ?? []) as unknown as LibraryItem[], [data]);

  const sortedItems = useMemo(() => {
    const list = [...items];
    if (sortBy === "az") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || "", locale));
    } else if (sortBy === "downloaded") {
      list.sort((a, b) => {
        const ta = a.lastDownloadAt ? new Date(a.lastDownloadAt).getTime() : 0;
        const tb = b.lastDownloadAt ? new Date(b.lastDownloadAt).getTime() : 0;
        if (tb !== ta) return tb - ta;
        return new Date(b.acquiredAt || 0).getTime() - new Date(a.acquiredAt || 0).getTime();
      });
    } else {
      list.sort(
        (a, b) => new Date(b.acquiredAt || 0).getTime() - new Date(a.acquiredAt || 0).getTime()
      );
    }
    return list;
  }, [items, sortBy, locale]);

  if (!isHydrated || !user || isLoading || user?.roles.includes("Admin")) {
    return (
      <div className="w-full space-y-8 animate-pulse">
        <div className="space-y-2 border-b border-white/[0.08] pb-5">
          <div className="h-8 w-44 rounded bg-white/[0.06]" />
          <div className="h-4 w-72 rounded bg-white/[0.04]" />
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2.5">
              <div className="aspect-video rounded-md bg-white/[0.05]" />
              <div className="h-4 w-2/3 rounded bg-white/[0.05]" />
              <div className="h-3 w-1/3 rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-7">
      {/* Epic-style Clean Header & Toolbar */}
      <header className="space-y-5 border-b border-white/[0.08] pb-5">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-[-0.02em]">
            {isVi ? "Thư Viện" : isZh ? "游戏库" : "Library"}
          </h1>
          <span className="text-sm font-medium text-zinc-400 tabular-nums">
            {items.length}
          </span>
        </div>

        {items.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Sort Selector */}
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="library-sort" className="text-zinc-400">
                {isVi ? "Sắp xếp:" : isZh ? "排序：" : "Sort by:"}
              </label>
              <select
                id="library-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortMode)}
                className="bg-transparent text-xs font-medium text-zinc-100 outline-none cursor-pointer pr-1 py-1 rounded hover:text-white focus-visible:ring-1 focus-visible:ring-white/30"
              >
                <option value="recent" className="bg-[#0D111A] text-zinc-100">
                  {isVi ? "Mới thêm gần đây" : isZh ? "最近添加" : "Recently Added"}
                </option>
                <option value="az" className="bg-[#0D111A] text-zinc-100">
                  {isVi ? "Tên A – Z" : isZh ? "名称 A – Z" : "Alphabetical A – Z"}
                </option>
                <option value="downloaded" className="bg-[#0D111A] text-zinc-100">
                  {isVi ? "Tải gần nhất" : isZh ? "最近下载" : "Recently Downloaded"}
                </option>
              </select>
            </div>

            {/* Grid / List View Switcher */}
            <div
              role="group"
              aria-label={isVi ? "Chế độ hiển thị" : isZh ? "视图切换" : "View mode"}
              className="flex items-center gap-1"
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
                aria-label={isVi ? "Dạng lưới" : isZh ? "网格视图" : "Grid view"}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "text-white bg-white/[0.1]"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
                }`}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                aria-label={isVi ? "Dạng danh sách" : isZh ? "列表视图" : "List view"}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "list"
                    ? "text-white bg-white/[0.1]"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
                }`}
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Empty State */}
      {items.length === 0 ? (
        <section className="py-16 max-w-md space-y-4">
          <h2 className="text-lg font-semibold text-white tracking-[-0.01em]">
            {isVi ? "Thư viện của bạn chưa có trò chơi nào" : isZh ? "您的游戏库暂无游戏" : "Your library is empty"}
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {isVi
              ? "Trò chơi sau khi mua hoặc nhận miễn phí trên cửa hàng sẽ hiển thị tại đây để bạn cài đặt và chơi qua GameVault Launcher."
              : isZh
              ? "在商城购买或领取免费游戏后，游戏将显示在此处并通过 GameVault 启动器安装运行。"
              : "Games you buy or claim on the store appear here so you can install and launch them in GameVault Launcher."}
          </p>
          <div className="pt-2">
            <Link
              href={`/${locale}/games`}
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-100 px-5 text-sm font-semibold text-zinc-950 hover:bg-white transition-colors"
            >
              {isVi ? "Khám phá cửa hàng" : isZh ? "浏览游戏商城" : "Browse Store"}
            </Link>
          </div>
        </section>
      ) : viewMode === "grid" ? (
        /* Epic-style Borderless Grid View */
        <section className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedItems.map((g) => {
            const coverUrl = resolveImageUrl(g.coverUrl);
            const isMenuOpen = openMenuId === g.gameId;
            const statusText = g.lastDownloadAt
              ? `${isVi ? "Tải " : isZh ? "下载于 " : "Downloaded "}${formatDateTimeShort(g.lastDownloadAt)}`
              : g.acquiredAt
              ? `${isVi ? "Đã sở hữu " : isZh ? "入库于 " : "Added "}${formatDate(g.acquiredAt)}`
              : null;

            return (
              <article key={g.gameId} className="group flex flex-col">
                {/* Artwork: Click directly to launch in Launcher (Epic pattern) */}
                <button
                  type="button"
                  onClick={() => openInLauncher(g.gameId, g.title)}
                  className="relative block aspect-video w-full overflow-hidden rounded-md bg-zinc-900 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      referrerPolicy="no-referrer"
                      alt={g.title}
                      className="size-full object-cover transition duration-200 ease-out group-hover:scale-[1.03] group-hover:brightness-110"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-zinc-500">
                      {g.title}
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/75 via-black/25 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-end px-3 pb-2.5">
                    <span className="text-xs font-medium text-white">
                      {isVi ? "Mở trong Launcher" : isZh ? "在启动器中打开" : "Open in Launcher"}
                    </span>
                  </div>
                </button>

                {/* Title + Epic-style ··· Overflow Menu */}
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link
                      href={`/${locale}/game/${g.slug || ""}`}
                      className="block truncate text-sm font-semibold text-zinc-100 hover:text-white transition-colors"
                    >
                      {g.title}
                    </Link>

                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <button
                        type="button"
                        onClick={() => openInLauncher(g.gameId, g.title)}
                        className="font-medium text-zinc-300 hover:text-white underline-offset-4 hover:underline transition-colors cursor-pointer"
                      >
                        {isVi ? "Cài đặt / Chơi" : isZh ? "安装 / 启动" : "Install / Play"}
                      </button>
                      <span className="text-zinc-600" aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                        v{g.version ?? "1.0.0"}
                      </span>
                    </div>

                    {statusText && (
                      <p className="text-[11px] text-zinc-500 truncate">{statusText}</p>
                    )}
                  </div>

                  {/* Overflow Menu */}
                  <div
                    className="relative shrink-0"
                    ref={isMenuOpen ? menuContainerRef : null}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(isMenuOpen ? null : g.gameId)}
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen}
                      aria-label={isVi ? `Tùy chọn cho ${g.title}` : `Options for ${g.title}`}
                      className="p-1.5 -mr-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>

                    {isMenuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 mt-1.5 w-48 rounded-lg border border-white/[0.1] bg-[#121622] py-1 shadow-xl z-30"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => openInLauncher(g.gameId, g.title)}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-zinc-100 hover:bg-white/[0.07] transition-colors cursor-pointer"
                        >
                          {isVi ? "Mở trong Launcher" : isZh ? "在启动器中打开" : "Open in Launcher"}
                        </button>
                        <Link
                          role="menuitem"
                          href={`/${locale}/game/${g.slug || ""}`}
                          onClick={() => setOpenMenuId(null)}
                          className="block w-full px-3 py-2 text-left text-xs text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-colors"
                        >
                          {isVi ? "Xem trang cửa hàng" : isZh ? "前往商店页面" : "Go to Store Page"}
                        </Link>
                        <div className="my-1 border-t border-white/[0.07]" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => removeFromLibrary(g.gameId, g.title)}
                          className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          {isVi ? "Gỡ khỏi thư viện" : isZh ? "移出游戏库" : "Remove from Library"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        /* Epic-style Clean List View */
        <section className="divide-y divide-white/[0.07]">
          {sortedItems.map((g) => {
            const coverUrl = resolveImageUrl(g.coverUrl);
            const isMenuOpen = openMenuId === g.gameId;
            const statusText = g.lastDownloadAt
              ? `${isVi ? "Tải gần nhất " : isZh ? "上次下载 " : "Downloaded "}${formatDateTimeShort(g.lastDownloadAt)}`
              : g.acquiredAt
              ? `${isVi ? "Đã sở hữu " : isZh ? "入库于 " : "Added "}${formatDate(g.acquiredAt)}`
              : "";

            return (
              <article
                key={g.gameId}
                className="flex items-center justify-between gap-4 py-3.5 hover:bg-white/[0.02] -mx-3 px-3 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => openInLauncher(g.gameId, g.title)}
                    className="w-24 sm:w-28 aspect-video shrink-0 overflow-hidden rounded bg-zinc-900 cursor-pointer"
                  >
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        referrerPolicy="no-referrer"
                        alt={g.title}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-[10px] text-zinc-500">
                        {g.title}
                      </div>
                    )}
                  </button>

                  <div className="min-w-0 space-y-0.5">
                    <Link
                      href={`/${locale}/game/${g.slug || ""}`}
                      className="block truncate text-sm font-semibold text-zinc-100 hover:text-white transition-colors"
                    >
                      {g.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-zinc-400">
                      <span className="font-mono text-[11px] tabular-nums">v{g.version ?? "1.0.0"}</span>
                      {statusText && (
                        <>
                          <span className="text-zinc-600" aria-hidden="true">·</span>
                          <span>{statusText}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => openInLauncher(g.gameId, g.title)}
                    className="h-8 px-3.5 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-xs font-medium text-white transition-colors cursor-pointer"
                  >
                    {isVi ? "Mở trong Launcher" : isZh ? "在启动器中打开" : "Open in Launcher"}
                  </button>

                  <div
                    className="relative"
                    ref={isMenuOpen ? menuContainerRef : null}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(isMenuOpen ? null : g.gameId)}
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen}
                      aria-label={isVi ? `Tùy chọn cho ${g.title}` : `Options for ${g.title}`}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>

                    {isMenuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 mt-1.5 w-48 rounded-lg border border-white/[0.1] bg-[#121622] py-1 shadow-xl z-30"
                      >
                        <Link
                          role="menuitem"
                          href={`/${locale}/game/${g.slug || ""}`}
                          onClick={() => setOpenMenuId(null)}
                          className="block w-full px-3 py-2 text-left text-xs text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-colors"
                        >
                          {isVi ? "Xem trang cửa hàng" : isZh ? "前往商店页面" : "Go to Store Page"}
                        </Link>
                        <div className="my-1 border-t border-white/[0.07]" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => removeFromLibrary(g.gameId, g.title)}
                          className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          {isVi ? "Gỡ khỏi thư viện" : isZh ? "移出游戏库" : "Remove from Library"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {launcherTarget && (
        <LaunchInLauncherModal
          gameId={launcherTarget.id}
          gameTitle={launcherTarget.title}
          onClose={() => setLauncherTarget(null)}
        />
      )}
    </div>
  );
}
