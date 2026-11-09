"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth/store";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import {
  UserCircle, Mail, Calendar, Settings, Gamepad2, Camera, Loader2, CheckCircle,
  Shield, LayoutDashboard, DollarSign, ShoppingBag, Users, ArrowUpRight
} from "lucide-react";
import { useLocale } from "next-intl";
import { formatDate, formatPrice, resolveImageUrl } from "@/lib/utils";

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return resolveImageUrl(url);
}



export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex h-[80vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    }>
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetId = searchParams.get("id");
  const isOwnProfile = !targetId || targetId === user?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [games, setGames] = useState<LibraryGame[]>([]);
  const [adminStats, setAdminStats] = useState<{
    totalRevenue?: number;
    totalOrders?: number;
    totalUsers?: number;
    totalGames?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isLibraryPublic, setIsLibraryPublic] = useState(false);
  const [isPurchaseHistoryPublic, setIsPurchaseHistoryPublic] = useState(false);
  // avatarUrl is kept internally but not exposed as text input — only via file upload
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarRetry, setAvatarRetry] = useState(0);

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
          alert(locale === "vi" ? "Lỗi xử lý ảnh." : "Image processing error.");
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
          alert(locale === "vi" ? "Upload ảnh thất bại. Vui lòng thử lại." : "Failed to upload avatar. Please try again.");
        } finally {
          setUploadingAvatar(false);
        }
      }, "image/png");
    } catch (err) {
      console.error("Failed to load image for cropping", err);
      alert(locale === "vi" ? "Lỗi tải ảnh để cắt." : "Error loading image to crop.");
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

          if (p.roles?.includes("Admin")) {
            try {
              const statsRes = await api.get("/admin/dashboard/stats");
              setAdminStats(statsRes.data?.data || null);
            } catch (err) {
              console.error("Failed to load admin stats for profile page:", err);
            }
          }
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

  // Open cropper on selecting avatar file
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setCropperImageSrc(localUrl);
    setIsCropperOpen(true);
    setPosition({ x: 0, y: 0 });
    setScale(1);

    // Reset input so the same file can be re-selected
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
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (error) {
      console.error("Failed to update profile", error);
      alert(locale === "vi" ? "Lưu thông tin thất bại. Thử lại!" : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-12">
      <div className="grid gap-6 md:gap-8 md:grid-cols-[300px_1fr]">

        {/* Profile Sidebar */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 p-4 md:p-6 backdrop-blur shadow-xl">
          <div className="flex flex-col items-center text-center">

            {/* Avatar with upload button */}
            <div className="relative mb-6">
              {previewAvatar && !avatarError ? (
                <div className="size-32 overflow-hidden rounded-full ring-4 ring-violet-500/20 relative">
                  <img 
                    src={avatarRetry > 0 ? (previewAvatar.includes("?") ? `${previewAvatar}&r=${avatarRetry}` : `${previewAvatar}?r=${avatarRetry}`) : previewAvatar} 
                    alt={profile.fullName} 
                    className="size-full object-cover" 
                    referrerPolicy="no-referrer"
                    onError={() => {
                      if (avatarRetry < 3) {
                        setTimeout(() => {
                          setAvatarRetry(prev => prev + 1);
                        }, 1000);
                      } else {
                        setAvatarError(true);
                      }
                    }}
                  />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                      <Loader2 className="size-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <UserCircle className="size-32 text-zinc-600" strokeWidth={1} />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                      <Loader2 className="size-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
              )}

              {/* Camera upload button — only visible on own profile */}
              {isOwnProfile && (
                <label
                  className="absolute -bottom-2 -right-2 rounded-full bg-violet-600 p-2 text-white shadow-lg cursor-pointer hover:bg-violet-500 transition-colors"
                  title={locale === "vi" ? "Đổi ảnh đại diện" : isZh ? "更换头像" : "Change avatar"}
                >
                  <Camera className="size-5" />
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

            <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">{profile.fullName}</h1>
            <p className="mb-4 text-sm text-zinc-400">{profile.email}</p>

            <div className="w-full space-y-3 rounded-xl bg-zinc-950/50 p-4 text-left">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <Calendar className="size-4 text-violet-400 shrink-0" />
                <span>{locale === "vi" ? "Tham gia: " : isZh ? "注册时间：" : "Joined: "} {formatDate(profile.createdAt)}</span>
              </div>
              {profile.dateOfBirth && (
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <Calendar className="size-4 text-violet-400 shrink-0" />
                  <span>
                    {locale === "vi" ? "Ngày sinh: " : isZh ? "出生日期：" : "Date of Birth: "}
                    {formatDate(profile.dateOfBirth)}
                  </span>
                </div>
              )}
              {isOwnProfile && (
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <Gamepad2 className="size-4 text-violet-400 shrink-0" />
                  <span>{games.length} {locale === "vi" ? "game đang sở hữu" : isZh ? "款已拥有游戏" : "Games Owned"}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <Settings className="size-4 text-violet-400 shrink-0" />
                <span>Role: {profile.roles.join(", ")}</span>
              </div>
              {profile.roles.includes("Admin") && (
                <div className="pt-1">
                  <Link
                    href={`/${locale}/admin`}
                    className="w-full py-2 px-3 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                  >
                    <Shield className="size-3.5 text-violet-400" />
                    <span>{locale === "vi" ? "Vào Trang Quản Trị" : isZh ? "进入管理控制台" : "Go to Admin Panel"}</span>
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {saveSuccess && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2 w-full justify-center">
                <CheckCircle className="size-4" />
                {locale === "vi" ? "Đã lưu thành công!" : isZh ? "保存成功！" : "Saved successfully!"}
              </div>
            )}

            {isOwnProfile && (
              <Button
                className="mt-4 w-full"
                variant={editing ? "outline" : "default"}
                onClick={() => setEditing(!editing)}
              >
                {editing
                  ? (locale === "vi" ? "Hủy chỉnh sửa" : isZh ? "取消编辑" : "Cancel Editing")
                  : (locale === "vi" ? "Chỉnh sửa hồ sơ" : isZh ? "编辑个人资料" : "Edit Profile")}
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6 md:space-y-8">

          {/* Edit Form */}
          {editing && (
            <div className="rounded-2xl border border-violet-500/20 bg-zinc-900/50 p-6 backdrop-blur shadow-xl">
              <h2 className="mb-6 text-xl font-semibold text-white">
                {locale === "vi" ? "Chỉnh sửa thông tin" : isZh ? "编辑个人信息" : "Profile Details"}
              </h2>

              {/* Avatar upload hint */}
              <div className="mb-5 flex items-start gap-3 rounded-xl bg-violet-500/5 border border-violet-500/10 p-4">
                <Camera className="size-5 text-violet-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-violet-300">
                    {locale === "vi" ? "Đổi ảnh đại diện" : isZh ? "更换头像" : "Change Avatar"}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {locale === "vi"
                      ? "Bấm vào biểu tượng 📷 ở ảnh đại diện bên trái để tải ảnh mới lên ngay lập tức."
                      : isZh
                        ? "点击左侧头像上的 📷 相机图标即可立即上传新头像。"
                        : "Click the 📷 camera icon on your avatar photo (left panel) to upload a new image instantly."}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">
                    {locale === "vi" ? "Họ và tên" : isZh ? "姓名 / 昵称" : "Full Name"}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-2 text-white outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">
                    {locale === "vi" ? "Ngày sinh" : isZh ? "出生日期" : "Date of Birth"}
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-2 text-white outline-none focus:border-violet-500 [color-scheme:dark] transition-colors"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isLibraryPublic"
                    checked={isLibraryPublic}
                    onChange={e => setIsLibraryPublic(e.target.checked)}
                    className="size-4 rounded border-white/10 bg-zinc-950 text-violet-600 focus:ring-violet-500"
                  />
                  <label htmlFor="isLibraryPublic" className="text-sm text-zinc-300 cursor-pointer">
                    {locale === "vi" ? "Công khai thư viện game" : isZh ? "公开游戏库" : "Make game library public"}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPurchaseHistoryPublic"
                    checked={isPurchaseHistoryPublic}
                    onChange={e => setIsPurchaseHistoryPublic(e.target.checked)}
                    className="size-4 rounded border-white/10 bg-zinc-950 text-violet-600 focus:ring-violet-500"
                  />
                  <label htmlFor="isPurchaseHistoryPublic" className="text-sm text-zinc-300 cursor-pointer">
                    {locale === "vi" ? "Công khai lịch sử mua" : isZh ? "公开购买记录" : "Make purchase history public"}
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  {locale === "vi" ? "Hủy" : isZh ? "取消" : "Cancel"}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-violet-600 hover:bg-violet-500 gap-2"
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {locale === "vi" ? "Lưu thay đổi" : isZh ? "保存修改" : "Save Changes"}
                </Button>
              </div>
            </div>
          )}

          {/* Admin Dashboard Overview OR Normal User Library */}
          {profile.roles.includes("Admin") ? (
            <div className="space-y-6">
              {/* Admin Hero Capsule Card */}
              <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-[#0F1422] via-[#13192B] to-[#0A0D16] p-5 sm:p-6 shadow-2xl backdrop-blur">
                {/* Decorative ambient glow */}
                <div className="absolute -top-16 -right-16 size-48 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 size-48 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                        <Shield className="size-3 text-violet-400" />
                        {locale === "vi" ? "Đặc Quyền Quản Trị Viên" : isZh ? "最高管理员特权" : "Super Administrator"}
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                      <LayoutDashboard className="size-6 text-violet-400" />
                      {locale === "vi" ? "Bảng Điều Khiển Quản Trị Hệ Thống" : isZh ? "系统管理总控制台" : "System Admin Control Center"}
                    </h2>
                    <p className="text-xs text-zinc-400">
                      {locale === "vi"
                        ? "Bạn có toàn quyền quản lý trò chơi, đơn hàng, doanh thu và người dùng trên sàn GameVault."
                        : isZh
                          ? "您对 GameVault 平台上的游戏、订单、收入和用户拥有全部管理权限。"
                          : "Full management authority over games, orders, revenue, and users across GameVault."}
                    </p>
                  </div>

                  <Link
                    href={`/${locale}/admin`}
                    className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition active:scale-[0.98] shadow-lg shadow-violet-600/25 cursor-pointer whitespace-nowrap"
                  >
                    <span>{locale === "vi" ? "Mở Trang Quản Trị Toàn Diện" : isZh ? "打开全功能管理后台" : "Open Full Admin Console"}</span>
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>

                {/* Admin Fast Stats Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 transition">
                    <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
                      <span>{locale === "vi" ? "Tổng Doanh Thu" : isZh ? "平台总营业额" : "Total Revenue"}</span>
                      <DollarSign className="size-3.5 text-violet-400" />
                    </div>
                    <div className="text-lg md:text-xl font-black text-violet-300 truncate">
                      {formatPrice(adminStats?.totalRevenue ?? 0)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/30 transition">
                    <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
                      <span>{locale === "vi" ? "Đơn Hàng Đã Xử Lý" : isZh ? "已完成订单数" : "Completed Orders"}</span>
                      <ShoppingBag className="size-3.5 text-emerald-400" />
                    </div>
                    <div className="text-lg md:text-xl font-black text-emerald-300">
                      {adminStats?.totalOrders ?? 0}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-blue-500/30 transition">
                    <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
                      <span>{locale === "vi" ? "Người Dùng Đăng Ký" : isZh ? "注册玩家总数" : "Registered Users"}</span>
                      <Users className="size-3.5 text-blue-400" />
                    </div>
                    <div className="text-lg md:text-xl font-black text-blue-300">
                      {adminStats?.totalUsers ?? 0}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/30 transition">
                    <div className="flex items-center justify-between text-zinc-400 text-xs mb-1.5">
                      <span>{locale === "vi" ? "Trò Chơi Trên Sàn" : isZh ? "平台收录游戏" : "Published Games"}</span>
                      <Gamepad2 className="size-3.5 text-amber-400" />
                    </div>
                    <div className="text-lg md:text-xl font-black text-amber-300">
                      {adminStats?.totalGames ?? 0}
                    </div>
                  </div>
                </div>

                {/* Quick Action Shortcuts for Admin */}
                <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-zinc-400 font-medium mr-1">
                    {locale === "vi" ? "Lối tắt quản lý:" : isZh ? "快捷通道：" : "Quick shortcuts:"}
                  </span>
                  <Link
                    href={`/${locale}/admin?tab=games`}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white border border-white/[0.06] transition flex items-center gap-1.5"
                  >
                    <Gamepad2 className="size-3.5 text-amber-400" />
                    <span>{locale === "vi" ? "Quản lý trò chơi" : "Manage Games"}</span>
                  </Link>
                  <Link
                    href={`/${locale}/admin?tab=orders`}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white border border-white/[0.06] transition flex items-center gap-1.5"
                  >
                    <ShoppingBag className="size-3.5 text-emerald-400" />
                    <span>{locale === "vi" ? "Xem đơn hàng" : "Orders"}</span>
                  </Link>
                  <Link
                    href={`/${locale}/admin?tab=users`}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white border border-white/[0.06] transition flex items-center gap-1.5"
                  >
                    <Users className="size-3.5 text-blue-400" />
                    <span>{locale === "vi" ? "Người dùng" : "Users"}</span>
                  </Link>
                  <Link
                    href={`/${locale}/admin?tab=revenue`}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white border border-white/[0.06] transition flex items-center gap-1.5"
                  >
                    <DollarSign className="size-3.5 text-violet-400" />
                    <span>{locale === "vi" ? "Báo cáo doanh thu" : "Revenue"}</span>
                  </Link>
                </div>
              </div>

              {/* Admin Test Library (collapsible / compact) */}
              <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 md:p-6 backdrop-blur shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-white/[0.06] pb-3">
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <Gamepad2 className="size-4 text-violet-400" />
                      {locale === "vi" ? "Thư viện game cá nhân (Tài khoản thử nghiệm)" : isZh ? "个人测试游戏库" : "Personal Test Library"}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {locale === "vi"
                        ? "Các tựa game đã được mua hoặc kích hoạt riêng cho tài khoản Admin này để chơi thử nghiệm."
                        : "Games directly activated for this Admin account for testing purposes."}
                    </p>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/[0.04] text-zinc-400 self-start sm:self-auto">
                    {games.length} game
                  </span>
                </div>

                {games.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-500">
                    <Gamepad2 className="mb-2 size-8 opacity-20" />
                    <p className="text-xs">
                      {locale === "vi"
                        ? "Tài khoản Admin chưa mua game nào để test. Bạn có thể mở Store để thử nghiệm quy trình mua game."
                        : "No games in personal test library."}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-violet-400 text-xs"
                      onClick={() => router.push(`/${locale}/games`)}
                    >
                      {locale === "vi" ? "Thử nghiệm mua game tại Store" : "Test Store"}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
                    {games.map(game => (
                      <div
                        key={game.gameId}
                        className="group relative overflow-hidden rounded-xl border border-white/5 bg-zinc-950 transition-colors hover:border-violet-500/50 cursor-pointer"
                        onClick={() => router.push(`/${locale}/game/${game.slug}`)}
                      >
                        <div className="aspect-video w-full overflow-hidden bg-zinc-900">
                          {game.coverUrl ? (
                            <img
                              src={resolveUrl(game.coverUrl) ?? ""}
                              alt={game.title}
                              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <Gamepad2 className="size-10 text-zinc-700" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="truncate font-semibold text-zinc-200">{game.title}</h3>
                          <p className="mt-1 text-xs text-zinc-500">
                            {locale === "vi" ? "Mua lúc: " : isZh ? "购买时间：" : "Acquired: "}
                            {formatDate(game.acquiredAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Normal User Library */
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 md:p-6 backdrop-blur shadow-xl">
              <h2 className="mb-6 text-xl font-semibold text-white">
                {locale === "vi" ? "Lịch sử mua & Thư viện game" : isZh ? "购买记录与游戏库" : "Purchase History & Library"}
              </h2>

              {!isOwnProfile && !profile.isLibraryPublic ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                  <Gamepad2 className="mb-4 size-12 opacity-20" />
                  <p>{locale === "vi" ? `Thư viện game của ${profile.fullName} đang để chế độ riêng tư.` : isZh ? `${profile.fullName} 的游戏库已设为私密。` : `${profile.fullName}'s library is private.`}</p>
                </div>
              ) : games.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                  <Gamepad2 className="mb-4 size-12 opacity-20" />
                  <p>{locale === "vi" ? "Bạn chưa có game nào trong thư viện." : isZh ? "您的游戏库中暂无游戏。" : "No games in your library yet."}</p>
                  <Button
                    variant="ghost"
                    className="mt-2 text-violet-400"
                    onClick={() => router.push(`/${locale}/games`)}
                  >
                    {locale === "vi" ? "Khám phá cửa hàng" : isZh ? "浏览商城" : "Browse Store"}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
                  {games.map(game => (
                    <div
                      key={game.gameId}
                      className="group relative overflow-hidden rounded-xl border border-white/5 bg-zinc-950 transition-colors hover:border-violet-500/50 cursor-pointer"
                      onClick={() => router.push(`/${locale}/game/${game.slug}`)}
                    >
                      <div className="aspect-video w-full overflow-hidden bg-zinc-900">
                        {game.coverUrl ? (
                          <img
                            src={resolveUrl(game.coverUrl) ?? ""}
                            alt={game.title}
                            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <Gamepad2 className="size-10 text-zinc-700" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="truncate font-semibold text-zinc-200">{game.title}</h3>
                        {(isOwnProfile || profile.isPurchaseHistoryPublic) && (
                          <p className="mt-1 text-xs text-zinc-500">
                            {locale === "vi" ? "Mua lúc: " : isZh ? "购买时间：" : "Acquired: "}
                            {formatDate(game.acquiredAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Avatar Cropper Modal (Facebook-style reposition & zoom) */}
      {isCropperOpen && cropperImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl text-center flex flex-col items-center">
            <h3 className="mb-2 text-xl font-bold text-white">
              {locale === "vi" ? "Chỉnh sửa ảnh đại diện" : isZh ? "调整头像图片" : "Edit Profile Picture"}
            </h3>
            <p className="mb-6 text-xs text-zinc-400">
              {locale === "vi" 
                ? "Kéo để di chuyển và sử dụng thanh trượt để phóng to/thu nhỏ" 
                : isZh
                  ? "拖动以移动位置，滑动滑块进行缩放"
                  : "Drag to reposition and use the slider to zoom"}
            </p>

            {/* Viewport Circle Mask */}
            <div 
              className="relative size-[250px] overflow-hidden rounded-full border-2 border-violet-500/50 bg-zinc-950 cursor-grab select-none active:cursor-grabbing"
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
                alt="Reposition avatar" 
                onLoad={onImageLoad}
                style={{
                  width: imgSize.width,
                  height: imgSize.height,
                  transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  left: "50%",
                  top: "50%",
                  position: "absolute",
                  maxWidth: "none",
                }}
                draggable={false}
              />
            </div>

            {/* Slider zoom controls */}
            <div className="mt-6 flex w-full items-center gap-3">
              <span className="text-xs text-zinc-500">A</span>
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.01" 
                value={scale} 
                onChange={(e) => setScale(parseFloat(e.target.value))} 
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500" 
              />
              <span className="text-lg font-bold text-zinc-400">A</span>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex w-full gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsCropperOpen(false)}
                className="flex-1"
              >
                {locale === "vi" ? "Hủy" : isZh ? "取消" : "Cancel"}
              </Button>
              <Button 
                onClick={cropAndUpload}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-medium"
              >
                {locale === "vi" ? "Lưu" : isZh ? "保存" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
