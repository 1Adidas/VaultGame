"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAppLocale } from "@/components/i18n/AppLocaleProvider";
import { useAuthStore } from "@/lib/auth/store";
import { UserCircle, Bell, Menu, X, Search, Globe, ChevronDown, Check, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { api, type ApiResponse } from "@/lib/api/client";
import { formatDateTimeShort, resolveImageUrl, formatPrice } from "@/lib/utils";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const t = useTranslations("nav");
  const { locale, setLocale } = useAppLocale();
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const prefix = `/${locale}`;
  const isVi = locale === "vi";
  const isZh = locale === "zh";

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isAdminPage = pathname.includes("/admin");

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveUser = mounted ? user : null;

  // OmniSearch State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarUrl]);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside search container to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live search debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await api.get<ApiResponse<any>>(`/games?q=${encodeURIComponent(searchQuery.trim())}&pageSize=5`);
        if (data?.data?.items) {
          setSearchResults(data.data.items);
        } else if (Array.isArray(data?.data)) {
          setSearchResults(data.data);
        }
      } catch (err) {
        console.error("Omni-search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`${prefix}/games?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleLogout = async () => {
    await logout();
    const { useToastStore } = await import("@/lib/toast/store");
    useToastStore.getState().success(
      isVi ? "Đã đăng xuất thành công!" : isZh ? "已成功退出登录！" : "Logged out successfully!"
    );

    const protectedPaths = ["/admin", "/profile", "/library", "/orders", "/wishlist"];
    if (protectedPaths.some((p) => pathname.includes(p))) {
      router.replace(prefix);
    }
  };

  const parseNotificationText = (text: string | null | undefined, currentLocale: string): string => {
    if (!text) return "";
    if (!text.includes(" / ")) return text;
    const parts = text.split(" / ");
    if (currentLocale === "vi") {
      return parts[0]?.trim() || text;
    }
    if (currentLocale === "zh") {
      return parts[2]?.trim() || parts[1]?.trim() || parts[0]?.trim() || text;
    }
    return parts[1]?.trim() || parts[0]?.trim() || text;
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get<ApiResponse<any[]>>("/notifications");
      if (data?.data) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    if (!effectiveUser) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [effectiveUser]);

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.isRead) {
      await markAsRead(n.id);
    }
    setShowDropdown(false);
    if (n.relatedEntityType === "Game" && n.metadata) {
      try {
        const meta = typeof n.metadata === "string" ? JSON.parse(n.metadata) : n.metadata;
        const slug = meta?.slug || n.metadata;
        const hash = meta?.reviewId ? `#review-${meta.reviewId}` : "";
        router.push(`${prefix}/game/${slug}${hash}`);
      } catch {
        router.push(`${prefix}/game/${n.metadata}`);
      }
    } else if (n.relatedEntityType === "Order" || n.relatedEntityType === "Payment") {
      if (user?.roles.includes("Admin")) {
        router.push(`${prefix}/admin?tab=orders`);
      } else {
        router.push(`${prefix}/orders`);
      }
    }
  };

  const clearAllNotifications = async () => {
    try {
      await api.delete("/notifications");
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-white/[0.06] bg-[#070A11]/85 backdrop-blur-2xl shrink-0">
      <div className="size-full px-4 sm:px-8 flex items-center justify-between gap-4">
        
        {/* Left Side: Mobile Menu Button & Quick Context */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
            title="Menu"
          >
            <Menu className="size-5" />
          </button>

          {/* Quick Breadcrumb Indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <img src="/logo.png" alt="GameVault Logo" className="size-5 object-contain drop-shadow" />
            <span className="font-semibold text-white tracking-tight">GameVault</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 font-medium">
              {pathname === prefix
                ? (isVi ? "Trang Chủ Khám Phá" : isZh ? "首页" : "Discover")
                : pathname.includes("/games")
                ? (isVi ? "Kho Game" : isZh ? "游戏商城" : "Store")
                : pathname.includes("/library")
                ? (isVi ? "Thư Viện" : isZh ? "我的游戏库" : "Library")
                : pathname.includes("/admin")
                ? (isVi ? "Bảng Quản Trị" : isZh ? "管理控制台" : "Admin Console")
                : (isVi ? "Cửa Hàng" : "Store")}
            </span>
          </div>
        </div>

        {/* Center: Live Omni-Search Bar */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-md hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder={
                isVi
                  ? "Tìm kiếm trò chơi, thể loại... (Ctrl + K)"
                  : isZh
                  ? "搜索正版游戏、分类... (Ctrl + K)"
                  : "Search games, genres... (Ctrl + K)"
              }
              className="w-full h-9 pl-9 pr-14 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] focus:bg-[#0E131E] text-xs text-white placeholder:text-zinc-500 outline-none focus:border-white/20 transition-all shadow-inner"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 pointer-events-none" />
            
            {/* Shortcut Badge */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isSearching ? (
                <Loader2 className="size-3 text-zinc-400 animate-spin" />
              ) : (
                <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded pointer-events-none">
                  ⌘K
                </span>
              )}
            </div>
          </form>

          {/* Floating Search Dropdown Results */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-11 left-0 right-0 rounded-2xl border border-white/[0.08] bg-[#0E131E] p-2 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((game: any) => (
                    <Link
                      key={game.id}
                      href={`${prefix}/game/${game.slug}`}
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition group"
                    >
                      <div className="size-10 rounded-lg overflow-hidden bg-zinc-900 shrink-0 border border-white/10">
                        {game.primaryImageUrl && (
                          <img
                            src={resolveImageUrl(game.primaryImageUrl)}
                            referrerPolicy="no-referrer"
                            alt={game.title}
                            className="size-full object-cover group-hover:scale-105 transition-transform"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate group-hover:text-zinc-200">
                          {game.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                          <span>{game.categoryName || "Game PC"}</span>
                          {game.hasDemo && (
                            <span className="text-emerald-400 font-semibold">• WebGL Demo</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-white">
                          {game.price === 0
                            ? (isVi ? "Miễn Phí" : isZh ? "免费" : "Free")
                            : formatPrice(game.discountPrice ?? game.price, game.currency || "VND")}
                        </span>
                      </div>
                    </Link>
                  ))}
                  <div className="pt-1.5 border-t border-white/[0.06] text-center">
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="text-[11px] font-medium text-zinc-400 hover:text-white transition"
                    >
                      {isVi
                        ? `Xem tất cả kết quả cho "${searchQuery}" →`
                        : `View all results for "${searchQuery}" →`}
                    </button>
                  </div>
                </div>
              ) : !isSearching ? (
                <div className="p-4 text-center text-xs text-zinc-500">
                  {isVi ? "Không tìm thấy trò chơi phù hợp" : "No games found"}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Right Tools: Language, Notifications, User Capsule */}
        <div className="flex items-center gap-3">
          
          {/* Apple Language Selector (Hidden in Admin) */}
          {!isAdminPage && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition cursor-pointer select-none"
              >
                <Globe className="size-3.5 text-zinc-400" />
                <span>{locale === "vi" ? "Tiếng Việt" : locale === "zh" ? "中文" : "English"}</span>
                <ChevronDown className="size-3 text-zinc-500" />
              </button>

              {isLangDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-36 rounded-xl border border-white/10 bg-[#0E131E] p-1.5 shadow-2xl backdrop-blur-xl z-50 text-xs"
                  onClick={() => setIsLangDropdownOpen(false)}
                >
                  <button
                    onClick={() => setLocale("vi")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition cursor-pointer text-xs ${
                      locale === "vi" ? "bg-white/[0.08] text-white font-medium" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <span>Tiếng Việt</span>
                    {locale === "vi" && <span className="text-[10px] text-zinc-400">VI</span>}
                  </button>
                  <button
                    onClick={() => setLocale("en")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition cursor-pointer text-xs ${
                      locale === "en" ? "bg-white/[0.08] text-white font-medium" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <span>English</span>
                    {locale === "en" && <span className="text-[10px] text-zinc-400">EN</span>}
                  </button>
                  <button
                    onClick={() => setLocale("zh")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition cursor-pointer text-xs ${
                      locale === "zh" ? "bg-white/[0.08] text-white font-medium" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <span>中文</span>
                    {locale === "zh" && <span className="text-[10px] text-zinc-400">ZH</span>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notifications Center */}
          {effectiveUser && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative text-zinc-400 hover:text-white size-8 rounded-full flex items-center justify-center hover:bg-white/[0.06] transition"
                title={isVi ? "Thông báo" : "Notifications"}
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 size-2 rounded-full bg-rose-500 ring-2 ring-[#070A11]" />
                )}
              </button>

              {showDropdown && (
                <div className="fixed top-16 right-4 left-4 sm:absolute sm:top-auto sm:right-0 sm:left-auto sm:w-80 mt-2 rounded-2xl border border-white/[0.08] bg-[#0E131E] p-3 shadow-2xl backdrop-blur-2xl z-50 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 px-1">
                    <span className="text-xs font-semibold text-zinc-200">
                      {isVi ? "Thông Báo" : "Notifications"}
                    </span>
                    <div className="flex gap-2 items-center">
                      {unreadCount > 0 && (
                        <button
                          onClick={async () => {
                            const unreads = notifications.filter((x) => !x.isRead);
                            for (const n of unreads) {
                              await markAsRead(n.id);
                            }
                          }}
                          className="text-[10px] text-zinc-400 hover:text-white cursor-pointer"
                        >
                          {isVi ? "Đọc tất cả" : "Mark all read"}
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <>
                          {unreadCount > 0 && <span className="text-[10px] text-zinc-700">|</span>}
                          <button
                            onClick={clearAllNotifications}
                            className="text-[10px] text-zinc-500 hover:text-rose-400 cursor-pointer"
                          >
                            {isVi ? "Xóa" : "Clear"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-white/[0.04] mt-1.5">
                    {notifications.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-zinc-500 italic">
                        {isVi ? "Không có thông báo mới" : "No new notifications"}
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-2.5 text-xs transition-colors rounded-xl cursor-pointer my-0.5 ${
                            n.isRead
                              ? "text-zinc-500 hover:bg-white/[0.02]"
                              : "bg-white/[0.04] text-zinc-200 hover:bg-white/[0.07]"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <span className="font-semibold truncate max-w-[180px]">
                              {parseNotificationText(n.title, locale)}
                            </span>
                            <span className="text-[9px] text-zinc-500 shrink-0">
                              {formatDateTimeShort(n.createdAt)}
                            </span>
                          </div>
                          <p className="leading-relaxed text-zinc-400 text-[11px] whitespace-pre-line">
                            {parseNotificationText(n.message, locale)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile Capsule or Login */}
          {effectiveUser ? (
            <div className="flex items-center gap-2 pl-1 border-l border-white/[0.06]">
              <Link
                href={`${prefix}/profile`}
                className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-white/[0.06] transition"
              >
                {effectiveUser.avatarUrl && !avatarError ? (
                  <img
                    src={resolveImageUrl(effectiveUser.avatarUrl)}
                    alt={effectiveUser.fullName}
                    className="size-7 rounded-full object-cover border border-white/10"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <UserCircle className="size-6 text-zinc-400" />
                )}
                <span className="text-xs font-semibold text-zinc-200 hidden sm:inline truncate max-w-[110px]">
                  {effectiveUser.fullName || "Gamer"}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[11px] font-medium text-zinc-400 hover:text-white px-2.5 py-1 rounded-full hover:bg-white/[0.06] transition cursor-pointer"
              >
                {t("logout")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-1 border-l border-white/[0.06]">
              <Link
                href={`${prefix}/login`}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition"
              >
                {t("login")}
              </Link>
              <Link
                href={`${prefix}/register`}
                className="px-4 py-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition active:scale-[0.98] shadow-sm"
              >
                {t("register")}
              </Link>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
