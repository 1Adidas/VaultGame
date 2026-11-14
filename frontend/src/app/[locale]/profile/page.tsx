"use client";

import { useEffect, useRef, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth/store";
import { api } from "@/lib/api/client";
import { useLocale } from "next-intl";
import { formatDate, resolveImageUrl } from "@/lib/utils";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  roles: string[];
  isLibraryPublic: boolean;
  isPurchaseHistoryPublic: boolean;
}

interface LibraryGame {
  gameId: string;
  title: string;
  slug: string;
  coverUrl: string | null;
  acquiredAt: string;
}

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return resolveImageUrl(url);
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[70vh] items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const { user, updateUser } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isZh = locale === "zh";
  const isVi = locale === "vi";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetId = searchParams.get("id");
  const isOwnProfile = !targetId || targetId === user?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [games, setGames] = useState<LibraryGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"library" | "settings" | "notifications">("library");
  const [gameSearch, setGameSearch] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isLibraryPublic, setIsLibraryPublic] = useState(false);
  const [isPurchaseHistoryPublic, setIsPurchaseHistoryPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Avatar states
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarRetry, setAvatarRetry] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Notifications states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  useEffect(() => {
    setAvatarError(false);
    setAvatarRetry(0);
  }, [previewAvatar]);

  // Cropper states
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const viewportSize = 250;
    let width = 0;
    let height = 0;
    if (naturalWidth > naturalHeight) {
      height = viewportSize;
      width = (naturalWidth / naturalHeight) * viewportSize;
    } else {
      width = viewportSize;
      height = (naturalHeight / naturalWidth) * viewportSize;
    }
    setImgSize({ width, height });
    setPosition({ x: 0, y: 0 });
    setScale(1);
  };

  const cropAndUpload = async () => {
    if (!cropperImageSrc) return;

    const canvas = document.createElement("canvas");
    const canvasSize = 400;
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = cropperImageSrc;

    setUploadingAvatar(true);
    setIsCropperOpen(false);

    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const viewportSize = 250;
      const ratio = canvasSize / viewportSize;

      const drawWidth = imgSize.width * ratio * scale;
      const drawHeight = imgSize.height * ratio * scale;
      const dx = position.x * ratio;
      const dy = position.y * ratio;

      const x = canvasSize / 2 - drawWidth / 2 + dx;
      const y = canvasSize / 2 - drawHeight / 2 + dy;

      ctx.clearRect(0, 0, canvasSize, canvasSize);
      ctx.drawImage(img, x, y, drawWidth, drawHeight);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert(isVi ? "Lỗi xử lý ảnh." : "Image processing error.");
          setUploadingAvatar(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", blob, "avatar.png");

        try {
          const res = await api.post("/users/avatar", formData);
          const url = res.data.data.url as string;
          const absoluteUrl = resolveUrl(url) ?? url;

          setPreviewAvatar(absoluteUrl);
          setProfile(prev => prev ? { ...prev, avatarUrl: absoluteUrl } : null);
          updateUser({ avatarUrl: absoluteUrl });
        } catch (error) {
          console.error("Failed to upload avatar", error);
          alert(isVi ? "Upload ảnh thất bại. Vui lòng thử lại." : "Failed to upload avatar. Please try again.");
        } finally {
          setUploadingAvatar(false);
        }
      }, "image/png");
    } catch (err) {
      console.error("Failed to load image for cropping", err);
      alert(isVi ? "Lỗi tải ảnh để cắt." : "Error loading image to crop.");
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== "undefined" ? (localStorage.getItem("gv_access") || sessionStorage.getItem("gv_access")) : null;
    if (!token && !user) {
      router.push(`/${locale}/login`);
      return;
    }

    const fetchProfileData = async () => {
      try {
        const profileUrl = isOwnProfile ? "/users/profile" : `/users/profile/${targetId}`;
        if (isOwnProfile) {
          const [profileRes, libraryRes] = await Promise.all([
            api.get(profileUrl),
            api.get("/library")
          ]);
          const p = profileRes.data.data as UserProfile;
          setProfile(p);
          setFullName(p.fullName);
          setDateOfBirth(p.dateOfBirth || "");
          setPreviewAvatar(resolveUrl(p.avatarUrl));
          setIsLibraryPublic(p.isLibraryPublic);
          setIsPurchaseHistoryPublic(p.isPurchaseHistoryPublic);
          setGames(Array.isArray(libraryRes.data?.data) ? libraryRes.data.data : []);
        } else {
          const profileRes = await api.get(profileUrl);
          const p = profileRes.data.data as UserProfile;
          setProfile(p);
          setFullName(p.fullName);
          setDateOfBirth(p.dateOfBirth || "");
          setPreviewAvatar(resolveUrl(p.avatarUrl));
          setIsLibraryPublic(p.isLibraryPublic);
          setIsPurchaseHistoryPublic(p.isPurchaseHistoryPublic);
          if (p.isLibraryPublic) {
            const libraryRes = await api.get(`/library?userId=${targetId}`);
            setGames(Array.isArray(libraryRes.data?.data) ? libraryRes.data.data : []);
          } else {
            setGames([]);
          }
        }
      } catch (error: any) {
        console.error("Failed to fetch profile", error);
        if (error?.response?.status === 401) {
          router.push(`/${locale}/login`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user, router, locale, targetId, isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile || activeTab !== "notifications") return;

    const fetchNotifs = async () => {
      setLoadingNotifs(true);
      try {
        const res = await api.get("/notifications");
        if (res.data?.data) {
          setNotifications(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch notifications on profile page", err);
      } finally {
        setLoadingNotifs(false);
      }
    };

    fetchNotifs();
  }, [isOwnProfile, activeTab]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setCropperImageSrc(localUrl);
    setIsCropperOpen(true);
    setPosition({ x: 0, y: 0 });
    setScale(1);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put("/users/profile", {
        fullName,
        dateOfBirth: dateOfBirth || null,
        avatarUrl: profile?.avatarUrl || null,
        isLibraryPublic,
        isPurchaseHistoryPublic
      });
      const updated = res.data.data as UserProfile;
      setProfile(updated);
      setIsLibraryPublic(updated.isLibraryPublic);
      setIsPurchaseHistoryPublic(updated.isPurchaseHistoryPublic);
      updateUser({ fullName, avatarUrl: updated.avatarUrl || undefined });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (error) {
      console.error("Failed to update profile", error);
      alert(isVi ? "Lưu thông tin thất bại. Vui lòng thử lại." : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const copyProfileLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const markNotifRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  const clearAllNotifs = async () => {
    try {
      await api.delete("/notifications");
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  const parseNotifText = (text: string | null | undefined): string => {
    if (!text) return "";
    if (!text.includes(" / ")) return text;
    const parts = text.split(" / ");
    if (locale === "vi") return parts[0]?.trim() || text;
    if (locale === "zh") return parts[2]?.trim() || parts[1]?.trim() || parts[0]?.trim() || text;
    return parts[1]?.trim() || parts[0]?.trim() || text;
  };

  const filteredGames = useMemo(() => {
    if (!gameSearch.trim()) return games;
    return games.filter((g) =>
      g.title.toLowerCase().includes(gameSearch.toLowerCase().trim())
    );
  }, [games, gameSearch]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  const isAdmin = profile.roles.includes("Admin");
  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:py-14 text-zinc-100">

      {/* ===================== EDITORIAL PROFILE HEADER ===================== */}
      <header className="pb-8 border-b border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">

          {/* Left: Avatar & Identity Details */}
          <div className="flex items-center gap-5">
            {/* Avatar with subtle upload trigger */}
            <div className="relative group shrink-0">
              <div className="size-20 sm:size-24 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900">
                {previewAvatar && !avatarError ? (
                  <img
                    src={
                      avatarRetry > 0
                        ? previewAvatar.includes("?")
                          ? `${previewAvatar}&r=${avatarRetry}`
                          : `${previewAvatar}?r=${avatarRetry}`
                        : previewAvatar
                    }
                    alt={profile.fullName}
                    className="size-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => {
                      if (avatarRetry < 3) {
                        setTimeout(() => setAvatarRetry((prev) => prev + 1), 1000);
                      } else {
                        setAvatarError(true);
                      }
                    }}
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-zinc-400 font-semibold text-xl">
                    {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : "U"}
                  </div>
                )}

                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
              </div>

              {isOwnProfile && (
                <label
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-xs text-white font-medium"
                  title={isVi ? "Đổi ảnh đại diện" : "Change avatar"}
                >
                  <span>{isVi ? "Đổi ảnh" : "Edit"}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarFileChange}
                  />
                </label>
              )}
            </div>

            {/* User Meta */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                  {profile.fullName}
                </h1>
                {isAdmin ? (
                  <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300">
                    Admin
                  </span>
                ) : (
                  <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded border border-zinc-800 text-zinc-400">
                    {isVi ? "Thành viên" : "Member"}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                <span>{profile.email}</span>
                <span>•</span>
                <span>
                  {isVi ? "Tham gia " : isZh ? "加入于 " : "Joined "}
                  {formatDate(profile.createdAt)}
                </span>
                {profile.dateOfBirth && (
                  <>
                    <span>•</span>
                    <span>
                      {isVi ? "Sinh ngày " : isZh ? "出生于 " : "Born "}
                      {formatDate(profile.dateOfBirth)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Primary & Secondary Actions */}
          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <button
              type="button"
              onClick={copyProfileLink}
              className="px-3.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-300 hover:text-white transition"
            >
              {copiedLink ? (isVi ? "Đã sao chép" : "Copied") : (isVi ? "Chia sẻ" : "Share")}
            </button>

            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === "settings" ? "library" : "settings")}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === "settings"
                    ? "bg-zinc-100 text-zinc-950 font-semibold"
                    : "border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 text-white"
                }`}
              >
                {activeTab === "settings"
                  ? (isVi ? "Đóng cài đặt" : "Close")
                  : (isVi ? "Chỉnh sửa hồ sơ" : isZh ? "编辑资料" : "Edit Profile")}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ===================== MINIMAL TAB NAVIGATION ===================== */}
      <nav className="flex items-center gap-8 border-b border-zinc-800 text-sm mt-6">
        <button
          type="button"
          onClick={() => setActiveTab("library")}
          className={`pb-3 font-medium transition -mb-px flex items-center gap-2 ${
            activeTab === "library"
              ? "border-b-2 border-white text-white"
              : "border-b-2 border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <span>{isVi ? "Thư viện trò chơi" : isZh ? "游戏库" : "Games Library"}</span>
          <span className="text-xs text-zinc-400 font-normal">
            ({games.length})
          </span>
        </button>

        {isOwnProfile && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`pb-3 font-medium transition -mb-px ${
                activeTab === "settings"
                  ? "border-b-2 border-white text-white"
                  : "border-b-2 border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {isVi ? "Cài đặt & Quyền riêng tư" : isZh ? "设置与隐私" : "Settings & Privacy"}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("notifications")}
              className={`pb-3 font-medium transition -mb-px flex items-center gap-2 ${
                activeTab === "notifications"
                  ? "border-b-2 border-white text-white"
                  : "border-b-2 border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>{isVi ? "Thông báo" : isZh ? "通知" : "Notifications"}</span>
              {unreadNotifCount > 0 && (
                <span className="size-1.5 rounded-full bg-rose-500" />
              )}
            </button>
          </>
        )}
      </nav>

      {/* ===================== TAB CONTENT ===================== */}
      <main className="pt-6">

        {/* TAB 1: GAMES LIBRARY */}
        {activeTab === "library" && (
          <div className="space-y-6">
            {/* Library Subheader with Inline Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs text-zinc-400">
                {isVi
                  ? `Hiển thị ${filteredGames.length} trên tổng số ${games.length} trò chơi đã kích hoạt.`
                  : `Showing ${filteredGames.length} of ${games.length} activated games.`}
              </p>

              {games.length > 0 && (
                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    placeholder={isVi ? "Lọc theo tên trò chơi..." : "Filter by title..."}
                    value={gameSearch}
                    onChange={(e) => setGameSearch(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-zinc-600 transition"
                  />
                </div>
              )}
            </div>

            {/* Privacy state if viewing another user */}
            {!isOwnProfile && !profile.isLibraryPublic ? (
              <div className="py-16 text-center text-zinc-400 border border-zinc-800 rounded-xl bg-zinc-900/30">
                <p className="text-sm font-medium text-zinc-300">
                  {isVi ? "Thư viện trò chơi đang ở chế độ riêng tư" : "This library is private"}
                </p>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  {isVi
                    ? `${profile.fullName} đã ẩn danh sách trò chơi khỏi chế độ xem công khai.`
                    : `${profile.fullName} keeps their owned games private.`}
                </p>
              </div>
            ) : games.length === 0 ? (
              /* Empty Library */
              <div className="py-16 text-center border border-zinc-800 rounded-xl bg-zinc-900/20 space-y-3">
                <p className="text-sm font-medium text-zinc-300">
                  {isVi ? "Chưa có trò chơi nào trong thư viện" : "No games in library"}
                </p>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  {isVi
                    ? "Các tựa game đã mua hoặc nhận mã kích hoạt sẽ xuất hiện tại đây và có thể chơi trên Launcher."
                    : "Games purchased or redeemed will appear here and can be launched."}
                </p>
                <div className="pt-2">
                  <Link
                    href={`/${locale}/games`}
                    className="inline-block px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium text-xs transition"
                  >
                    {isVi ? "Xem danh mục cửa hàng" : "Browse Store"}
                  </Link>
                </div>
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400 border border-zinc-800 rounded-xl">
                {isVi
                  ? `Không có trò chơi nào khớp với từ khóa "${gameSearch}".`
                  : `No games match "${gameSearch}".`}
              </div>
            ) : (
              /* Games Grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredGames.map((game) => (
                  <Link
                    key={game.gameId}
                    href={`/${locale}/game/${game.slug}`}
                    className="group block space-y-2"
                  >
                    {/* Poster */}
                    <div className="aspect-[16/10] w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition-colors group-hover:border-zinc-700">
                      {game.coverUrl ? (
                        <img
                          src={resolveUrl(game.coverUrl) ?? ""}
                          referrerPolicy="no-referrer"
                          alt={game.title}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-xs text-zinc-400">
                          {game.title}
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="space-y-0.5">
                      <h3 className="text-xs sm:text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                        {game.title}
                      </h3>
                      {(isOwnProfile || profile.isPurchaseHistoryPublic) && (
                        <p className="text-[11px] text-zinc-400">
                          {isVi ? "Sở hữu " : isZh ? "获得于 " : "Acquired "}
                          {formatDate(game.acquiredAt)}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SETTINGS & PRIVACY */}
        {activeTab === "settings" && isOwnProfile && (
          <div className="max-w-2xl space-y-8">
            {saveSuccess && (
              <div className="p-3 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/60 rounded-lg">
                {isVi ? "Đã lưu thay đổi thành công." : "Profile updated successfully."}
              </div>
            )}

            {/* Section 1: Personal Info */}
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {isVi ? "Thông tin cá nhân" : "Personal Information"}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isVi ? "Tên hiển thị công khai trên hồ sơ và bình luận." : "Public identity across the platform."}
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    {isVi ? "Họ và tên" : "Display Name"}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-600 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    {isVi ? "Ngày sinh" : "Date of Birth"}
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth ? dateOfBirth.split("T")[0] : ""}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Email
                  </label>
                  <input
                    type="text"
                    value={profile.email}
                    disabled
                    className="w-full px-3 py-2 rounded-lg border border-zinc-800/80 bg-zinc-900/40 text-xs text-zinc-400 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-zinc-400">
                    {isVi ? "Email tài khoản đã liên kết cố định để bảo vệ bản quyền game." : "Email cannot be edited directly."}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Privacy Preferences */}
            <div className="space-y-4 pt-6 border-t border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {isVi ? "Quyền riêng tư" : "Privacy Settings"}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isVi
                    ? "Kiểm soát những gì người khác có thể thấy khi xem trang hồ sơ của bạn."
                    : "Control what other visitors see on your public profile."}
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLibraryPublic}
                    onChange={(e) => setIsLibraryPublic(e.target.checked)}
                    className="mt-0.5 size-4 rounded border-zinc-700 bg-zinc-900 accent-zinc-200 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-medium text-zinc-200">
                      {isVi ? "Công khai thư viện trò chơi" : "Public Game Library"}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {isVi
                        ? "Cho phép mọi người xem danh sách các tựa game bạn sở hữu."
                        : "Allow anyone visiting your profile to view your games."}
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPurchaseHistoryPublic}
                    onChange={(e) => setIsPurchaseHistoryPublic(e.target.checked)}
                    className="mt-0.5 size-4 rounded border-zinc-700 bg-zinc-900 accent-zinc-200 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-medium text-zinc-200">
                      {isVi ? "Công khai ngày sở hữu game" : "Public Acquisition Date"}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {isVi
                        ? "Hiển thị thời gian bạn đã mua hoặc nhận game trong thư viện."
                        : "Display the timestamp of when each game was acquired."}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-6 border-t border-zinc-800">
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="px-5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium text-xs transition disabled:opacity-50"
              >
                {saving
                  ? (isVi ? "Đang lưu..." : "Saving...")
                  : (isVi ? "Lưu thay đổi" : isZh ? "保存修改" : "Save Changes")}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className="px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-400 hover:text-white transition"
              >
                {isVi ? "Hủy" : "Cancel"}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS */}
        {activeTab === "notifications" && isOwnProfile && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <p className="text-xs text-zinc-400">
                {isVi ? "Lịch sử thông báo hệ thống và giao dịch." : "Recent account notifications."}
              </p>
              {notifications.length > 0 && (
                <div className="flex items-center gap-4 text-xs">
                  <button
                    type="button"
                    onClick={async () => {
                      const unreads = notifications.filter((x) => !x.isRead);
                      for (const n of unreads) {
                        await markNotifRead(n.id);
                      }
                    }}
                    className="text-zinc-400 hover:text-white transition"
                  >
                    {isVi ? "Đọc tất cả" : "Mark all read"}
                  </button>
                  <button
                    type="button"
                    onClick={clearAllNotifs}
                    className="text-zinc-400 hover:text-rose-400 transition"
                  >
                    {isVi ? "Xóa hết" : "Clear all"}
                  </button>
                </div>
              )}
            </div>

            {loadingNotifs ? (
              <div className="py-12 text-center text-xs text-zinc-400">
                {isVi ? "Đang tải thông báo..." : "Loading..."}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400">
                {isVi ? "Không có thông báo nào." : "No notifications."}
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/80">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && markNotifRead(n.id)}
                    className={`py-3 flex items-start justify-between gap-4 cursor-pointer transition ${
                      n.isRead ? "opacity-60 hover:opacity-100" : "opacity-100"
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!n.isRead && (
                          <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
                        )}
                        <h4 className="text-xs font-medium text-white truncate">
                          {parseNotifText(n.title)}
                        </h4>
                      </div>
                      <p className="text-xs text-zinc-400">
                        {parseNotifText(n.message)}
                      </p>
                    </div>
                    <span className="text-[11px] text-zinc-400 shrink-0">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ===================== AVATAR CROPPER MODAL ===================== */}
      {isCropperOpen && cropperImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm border border-zinc-800 bg-zinc-950 p-6 rounded-xl text-center flex flex-col items-center">
            <h3 className="text-sm font-semibold text-white mb-1">
              {isVi ? "Căn chỉnh ảnh đại diện" : "Adjust Avatar"}
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              {isVi ? "Kéo để căn vị trí và dùng thanh trượt để phóng to" : "Drag to position and slide to zoom"}
            </p>

            {/* Viewport Circle Mask */}
            <div
              className="relative size-[220px] overflow-hidden rounded-full border border-zinc-700 bg-zinc-900 cursor-grab select-none active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              <img
                src={cropperImageSrc}
                alt="Crop avatar"
                onLoad={onImageLoad}
                style={{
                  width: imgSize.width,
                  height: imgSize.height,
                  transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  left: "50%",
                  top: "50%",
                  position: "absolute",
                  maxWidth: "none"
                }}
                draggable={false}
              />
            </div>

            {/* Slider zoom */}
            <div className="mt-4 flex w-full items-center gap-3">
              <span className="text-xs text-zinc-400 font-medium">1x</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-zinc-200"
              />
              <span className="text-xs text-zinc-400 font-medium">3x</span>
            </div>

            {/* Actions */}
            <div className="mt-6 flex w-full gap-2.5">
              <button
                type="button"
                onClick={() => setIsCropperOpen(false)}
                className="flex-1 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-300"
              >
                {isVi ? "Hủy" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={cropAndUpload}
                className="flex-1 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium text-xs transition"
              >
                {isVi ? "Lưu ảnh" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
