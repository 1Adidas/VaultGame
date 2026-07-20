"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useAuthStore } from "@/lib/auth/store";
import { Button } from "@/components/ui/button";
import { UserCircle, Bell, Menu, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api, type ApiResponse } from "@/lib/api/client";
import { formatDateTimeShort, resolveImageUrl } from "@/lib/utils";

export function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefix = `/${locale}`;

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarUrl]);

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
    if (!user) return;
    fetchNotifications();
    const intervalMs = 15000;
    const interval = setInterval(fetchNotifications, intervalMs);
    return () => clearInterval(interval);
  }, [user]);

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
        router.push(`/${locale}/game/${slug}${hash}`);
      } catch {
        router.push(`/${locale}/game/${n.metadata}`);
      }
    } else if (n.relatedEntityType === "Order" || n.relatedEntityType === "Payment") {
      if (user?.roles.includes("Admin")) {
        router.push(`/${locale}/admin?tab=orders`);
      } else {
        router.push(`/${locale}/orders`);
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

  const switchedLocale = locale === "vi" ? "en" : "vi";
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const switchedPath = `${pathname.replace(
    new RegExp(`^/${locale}(/|$)`),
    `/${switchedLocale}$1`
  )}${search}`;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href={prefix} className="text-xl font-bold text-violet-400">GameVault</Link>
        <nav className="hidden gap-6 md:flex">
          <Link href={prefix} className="text-sm hover:text-violet-300">{t("home")}</Link>
          <Link href={`${prefix}/games`} className="text-sm hover:text-violet-300">{t("games")}</Link>
          {user && (
            <>
              {!user.roles.includes("Admin") && (
                <>
                  <Link href={`${prefix}/library`} className="text-sm hover:text-violet-300">{t("library")}</Link>
                  <Link href={`${prefix}/wishlist`} className="text-sm hover:text-violet-300">{t("wishlist")}</Link>
                  <Link href={`${prefix}/orders`} className="text-sm hover:text-violet-300">{t("orders")}</Link>
                </>
              )}
              {user.roles.includes("Admin") && (
                <Link href={`${prefix}/admin`} className="text-sm hover:text-violet-300">{t("admin")}</Link>
              )}
            </>
          )}
          <Link href={`${prefix}/ai-chat`} className="text-sm hover:text-violet-300">{t("ai")}</Link>
        </nav>
        <div className="flex items-center gap-2">
          {/* Hamburger menu button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-zinc-400 hover:text-violet-400 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Menu"
          >
            {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <Link
            href={switchedPath}
            className="rounded-md border border-white/10 px-2 py-0.5 text-xs text-zinc-400 hover:border-violet-500/50 hover:text-violet-300 transition-colors"
          >
            {locale === "vi" ? "EN" : "VI"}
          </Link>

          {user && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative text-zinc-400 hover:text-violet-400 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer flex items-center justify-center"
                title={locale === "vi" ? "Thông báo" : "Notifications"}
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-zinc-950">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div className="fixed top-16 right-4 left-4 md:absolute md:top-auto md:right-0 md:left-auto md:w-80 mt-2 rounded-xl border border-zinc-800 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur-xl z-50 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                    <span className="text-xs font-bold text-zinc-200">
                      {locale === "vi" ? "Thông báo mới" : "Notifications"}
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
                          className="text-[10px] text-violet-400 hover:text-violet-300 cursor-pointer"
                        >
                          {locale === "vi" ? "Đọc tất cả" : "Mark all read"}
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <>
                          {unreadCount > 0 && <span className="text-[10px] text-zinc-700">|</span>}
                          <button
                            onClick={clearAllNotifications}
                            className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            {locale === "vi" ? "Xóa tất cả" : "Clear all"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-900 mt-1 max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-zinc-600 italic">
                        {locale === "vi" ? "Không có thông báo nào" : "No notifications"}
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const rawTitle = n.title || "";
                        const rawMessage = n.message || "";
                        let displayTitle = rawTitle;
                        let displayMessage = rawMessage;

                        if (rawTitle.includes(" / ")) {
                          const parts = rawTitle.split(" / ");
                          displayTitle = locale === "vi" ? parts[0] : parts[1];
                        } else {
                          if (locale === "vi") {
                            if (rawTitle === "Payment successful") displayTitle = "Thanh toán thành công";
                            if (rawTitle === "Payment failed") displayTitle = "Thanh toán thất bại";
                            if (rawTitle === "Order Cancelled") displayTitle = "Đơn hàng bị hủy";
                          }
                        }

                        if (rawMessage.includes(" / ")) {
                          const parts = rawMessage.split(" / ");
                          displayMessage = locale === "vi" ? parts[0] : parts[1];
                        } else {
                          if (locale === "vi") {
                            if (rawMessage.startsWith("Order ") && rawMessage.endsWith(" paid. Games added to library.")) {
                              const orderCode = rawMessage.substring(6, rawMessage.length - 30).trim();
                              displayMessage = `Đơn hàng ${orderCode} đã được thanh toán. Trò chơi đã được thêm vào thư viện của bạn.`;
                            }
                            if (rawMessage.startsWith("Payment for order ") && rawMessage.endsWith(" failed.")) {
                              const orderCode = rawMessage.substring(18, rawMessage.length - 8).trim();
                              displayMessage = `Giao dịch thanh toán cho đơn hàng ${orderCode} đã thất bại.`;
                            }
                          }
                        }

                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3 text-xs transition-colors rounded-lg cursor-pointer my-0.5 ${
                              n.isRead
                                ? "text-zinc-500 hover:bg-zinc-900/50"
                                : "bg-violet-950/20 text-zinc-200 hover:bg-violet-950/30"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <span className="font-semibold truncate max-w-[180px]">{displayTitle}</span>
                              <span className="text-[9px] text-zinc-600 shrink-0">
                                {formatDateTimeShort(n.createdAt)}
                              </span>
                            </div>
                            <p className="leading-relaxed text-zinc-400 text-[11px] whitespace-pre-line">{displayMessage}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {user ? (
            <>
              <Link href={`${prefix}/profile`} className="text-zinc-400 hover:text-violet-400 flex items-center justify-center">
                {user.avatarUrl && !avatarError ? (
                  <img
                    src={resolveImageUrl(user.avatarUrl)}
                    alt={user.fullName}
                    className="size-7 rounded-full object-cover border border-violet-500/50"
                    referrerPolicy="no-referrer"
                    onError={() => {
                      setAvatarError(true);
                    }}
                  />
                ) : (
                  <UserCircle className="size-6" />
                )}
              </Link>
              <Button variant="outline" size="sm" onClick={() => logout()}>{t("logout")}</Button>
            </>
          ) : (
            <>
              <Link href={`${prefix}/login`}><Button variant="ghost" size="sm">{t("login")}</Button></Link>
              <Link href={`${prefix}/register`}><Button size="sm">{t("register")}</Button></Link>
            </>
          )}
        </div>
      </div>
      {/* Mobile navigation links */}
      {isMobileMenuOpen && (
        <nav className="md:hidden border-t border-zinc-900 bg-zinc-950/95 px-4 py-4 space-y-3 flex flex-col">
          <Link href={prefix} onClick={() => setIsMobileMenuOpen(false)} className="text-sm hover:text-violet-300 py-1 transition-colors">{t("home")}</Link>
          <Link href={`${prefix}/games`} onClick={() => setIsMobileMenuOpen(false)} className="text-sm hover:text-violet-300 py-1 transition-colors">{t("games")}</Link>
          {user && (
            <>
              {!user.roles.includes("Admin") && (
                <>
                  <Link href={`${prefix}/library`} onClick={() => setIsMobileMenuOpen(false)} className="text-sm hover:text-violet-300 py-1 transition-colors">{t("library")}</Link>
                  <Link href={`${prefix}/wishlist`} onClick={() => setIsMobileMenuOpen(false)} className="text-sm hover:text-violet-300 py-1 transition-colors">{t("wishlist")}</Link>
                  <Link href={`${prefix}/orders`} onClick={() => setIsMobileMenuOpen(false)} className="text-sm hover:text-violet-300 py-1 transition-colors">{t("orders")}</Link>
                </>
              )}
              {user.roles.includes("Admin") && (
                <Link href={`${prefix}/admin`} onClick={() => setIsMobileMenuOpen(false)} className="text-sm hover:text-violet-300 py-1 transition-colors">{t("admin")}</Link>
              )}
            </>
          )}
          <Link href={`${prefix}/ai-chat`} onClick={() => setIsMobileMenuOpen(false)} className="text-sm hover:text-violet-300 py-1 transition-colors">{t("ai")}</Link>
        </nav>
      )}
    </header>
  );
}
