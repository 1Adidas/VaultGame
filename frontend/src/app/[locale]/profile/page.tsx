"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { UserCircle, Mail, Calendar, Settings, Gamepad2, Camera, Loader2, CheckCircle } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetId = searchParams.get("id");
  const isOwnProfile = !targetId || targetId === user?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [games, setGames] = useState<LibraryGame[]>([]);
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
    if (!user) {
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
          setGames(libraryRes.data.data);
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
            setGames(libraryRes.data.data);
          } else {
            setGames([]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
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
                  title={locale === "vi" ? "Đổi ảnh đại diện" : "Change avatar"}
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
                <span>{locale === "vi" ? "Tham gia" : "Joined"} {formatDate(profile.createdAt)}</span>
              </div>
              {profile.dateOfBirth && (
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <Calendar className="size-4 text-violet-400 shrink-0" />
                  <span>
                    {locale === "vi" ? "Ngày sinh: " : "Date of Birth: "}
                    {formatDate(profile.dateOfBirth)}
                  </span>
                </div>
              )}
              {isOwnProfile && (
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <Gamepad2 className="size-4 text-violet-400 shrink-0" />
                  <span>{games.length} {locale === "vi" ? "game đang sở hữu" : "Games Owned"}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <Settings className="size-4 text-violet-400 shrink-0" />
                <span>Role: {profile.roles.join(", ")}</span>
              </div>
            </div>

            {saveSuccess && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2 w-full justify-center">
                <CheckCircle className="size-4" />
                {locale === "vi" ? "Đã lưu thành công!" : "Saved successfully!"}
              </div>
            )}

            {isOwnProfile && (
              <Button
                className="mt-4 w-full"
                variant={editing ? "outline" : "default"}
                onClick={() => setEditing(!editing)}
              >
                {editing
                  ? (locale === "vi" ? "Hủy chỉnh sửa" : "Cancel Editing")
                  : (locale === "vi" ? "Chỉnh sửa hồ sơ" : "Edit Profile")}
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
                {locale === "vi" ? "Chỉnh sửa thông tin" : "Profile Details"}
              </h2>

              {/* Avatar upload hint */}
              <div className="mb-5 flex items-start gap-3 rounded-xl bg-violet-500/5 border border-violet-500/10 p-4">
                <Camera className="size-5 text-violet-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-violet-300">
                    {locale === "vi" ? "Đổi ảnh đại diện" : "Change Avatar"}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {locale === "vi"
                      ? "Bấm vào biểu tượng 📷 ở ảnh đại diện bên trái để tải ảnh mới lên ngay lập tức."
                      : "Click the 📷 camera icon on your avatar photo (left panel) to upload a new image instantly."}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">
                    {locale === "vi" ? "Họ và tên" : "Full Name"}
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
                    {locale === "vi" ? "Ngày sinh" : "Date of Birth"}
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
                    {locale === "vi" ? "Công khai thư viện game" : "Make game library public"}
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
                    {locale === "vi" ? "Công khai lịch sử mua" : "Make purchase history public"}
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  {locale === "vi" ? "Hủy" : "Cancel"}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-violet-600 hover:bg-violet-500 gap-2"
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {locale === "vi" ? "Lưu thay đổi" : "Save Changes"}
                </Button>
              </div>
            </div>
          )}

          {/* Library Section */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 md:p-6 backdrop-blur shadow-xl">
            <h2 className="mb-6 text-xl font-semibold text-white">
              {locale === "vi" ? "Lịch sử mua & Thư viện game" : "Purchase History & Library"}
            </h2>

            {!isOwnProfile && !profile.isLibraryPublic ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                <Gamepad2 className="mb-4 size-12 opacity-20" />
                <p>{locale === "vi" ? `Thư viện game của ${profile.fullName} đang để chế độ riêng tư.` : `${profile.fullName}'s library is private.`}</p>
              </div>
            ) : games.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                <Gamepad2 className="mb-4 size-12 opacity-20" />
                <p>{locale === "vi" ? "Bạn chưa có game nào trong thư viện." : "No games in your library yet."}</p>
                <Button
                  variant="ghost"
                  className="mt-2 text-violet-400"
                  onClick={() => router.push(`/${locale}/games`)}
                >
                  {locale === "vi" ? "Khám phá cửa hàng" : "Browse Store"}
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
                          {locale === "vi" ? "Mua lúc: " : "Acquired: "}
                          {formatDate(game.acquiredAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Avatar Cropper Modal (Facebook-style reposition & zoom) */}
      {isCropperOpen && cropperImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl text-center flex flex-col items-center">
            <h3 className="mb-2 text-xl font-bold text-white">
              {locale === "vi" ? "Chỉnh sửa ảnh đại diện" : "Edit Profile Picture"}
            </h3>
            <p className="mb-6 text-xs text-zinc-400">
              {locale === "vi" 
                ? "Kéo để di chuyển và sử dụng thanh trượt để phóng to/thu nhỏ" 
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
                {locale === "vi" ? "Hủy" : "Cancel"}
              </Button>
              <Button 
                onClick={cropAndUpload}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-medium"
              >
                {locale === "vi" ? "Lưu" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
