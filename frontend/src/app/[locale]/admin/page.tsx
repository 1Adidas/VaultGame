"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useAdminStats, useCategories } from "@/hooks/useGames";
import { useAuthStore } from "@/lib/auth/store";
import { api, type ApiResponse } from "@/lib/api/client";
import { formatPrice, formatDate, formatDateTime, resolveImageUrl } from "@/lib/utils";
import { Button, Card, Input } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Gamepad2, ShoppingBag, Users as UsersIcon,
  DollarSign, HelpCircle, Upload, Trash2, Edit, CheckCircle2,
  XCircle, ToggleLeft, ToggleRight, Info, PlusCircle, Save, ExternalLink,
  Bot, AlertTriangle, BarChart3, TrendingUp, Clock, ArrowUpRight, Download, Settings,
  Sparkles, Globe, Loader2, Languages, Image as ImageIcon, Film, HardDrive,
  Package, CreditCard, Shield
} from "lucide-react";


import { useSearchParams, useRouter } from "next/navigation";

// Hàm tự động chuẩn hóa chuỗi tiếng Việt thành Game Slug thân thiện với URL (SEO)
function generateSlug(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Xóa toàn bộ dấu thanh tiếng Việt
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Bỏ ký tự đặc biệt
    .replace(/[\s_]+/g, "-") // Thay khoảng trắng hoặc gạch dưới bằng gạch ngang
    .replace(/-+/g, "-") // Bỏ nhiều gạch ngang liên tiếp
    .replace(/^-+|-+$/g, ""); // Xóa gạch ngang thừa ở đầu và cuối
}

// Custom Dropzone File Input - Thay thế Choose File mặc định của trình duyệt
function DropzoneFileInput({
  accept,
  multiple = false,
  files,
  onSelect,
  onClear,
  label = "Nhấp để chọn tệp hoặc kéo thả vào đây",
  formatHint = "",
  disabled = false,
  maxSize = 3 * 1024 * 1024 * 1024, // 3GB default limit
}: {
  accept: string;
  multiple?: boolean;
  files: File | File[] | null;
  onSelect: (f: FileList | null) => void;
  onClear?: () => void;
  label?: string;
  formatHint?: string;
  disabled?: boolean;
  maxSize?: number;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes?: number) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const validateAndSelect = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    for (let i = 0; i < fileList.length; i++) {
      if (fileList[i].size > maxSize) {
        const sizeGb = (maxSize / (1024 * 1024 * 1024)).toFixed(0);
        alert(`Tệp "${fileList[i].name}" (${formatFileSize(fileList[i].size)}) vượt quá dung lượng tối đa cho phép là ${sizeGb}GB! Vui lòng chọn tệp nhỏ hơn.`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }
    onSelect(fileList);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files);
    }
  };

  const hasFiles = Boolean(
    Array.isArray(files) ? files.length > 0 : files
  );

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => validateAndSelect(e.target.files)}
      />

      {!hasFiles ? (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`group rounded-xl border border-dashed transition p-3 text-center flex flex-col items-center justify-center cursor-pointer select-none ${
            isDragOver
              ? "border-cyan-400 bg-cyan-500/[0.08]"
              : "border-white/15 bg-white/[0.015] hover:border-cyan-400/50 hover:bg-white/[0.03]"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span className="text-xs font-medium text-zinc-300 group-hover:text-cyan-300 transition">
            {label}
          </span>
          {formatHint && (
            <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
              {formatHint}
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {Array.isArray(files) ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-300 font-medium px-1">
                <span>Đã chọn {files.length} ảnh gameplay mới:</span>
                {onClear && (
                  <button
                    type="button"
                    onClick={onClear}
                    className="text-[10px] text-zinc-400 hover:text-red-400 transition cursor-pointer font-medium"
                  >
                    Hủy tất cả
                  </button>
                )}
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {files.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[10px] text-cyan-300 font-mono bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-md"
                  >
                    <span className="truncate max-w-[200px]">{f.name}</span>
                    <span className="text-zinc-500 ml-2">{formatFileSize(f.size)}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[10px] text-zinc-400 hover:text-cyan-300 transition cursor-pointer"
              >
                + Chọn thêm ảnh khác
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-cyan-300 font-mono bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1.5 rounded-lg">
              <div className="flex items-center gap-1.5 truncate">
                <span className="truncate max-w-[170px]">{files?.name}</span>
                <span className="text-zinc-500 text-[10px] font-sans">
                  {files?.size ? `(${formatFileSize(files.size)})` : ""}
                </span>
              </div>
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  className="text-zinc-400 hover:text-red-400 ml-1.5 transition cursor-pointer text-xs font-semibold"
                >
                  Hủy
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && (!user || !user.roles?.includes("Admin"))) {
      router.replace(`/${locale}`);
    }
  }, [user, isLoading, locale, router]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`/${locale}/admin?tab=${tabId}`, { scroll: false });
  };

  // Danh sách các tab điều hướng trang quản trị (100% Tiếng Việt)
  const tabs = [
    { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
    { id: "analytics", label: "Thống kê chi tiết", icon: BarChart3 },
    { id: "games", label: "Trò chơi", icon: Gamepad2 },
    { id: "orders", label: "Đơn hàng", icon: ShoppingBag },
    { id: "users", label: "Người dùng", icon: UsersIcon },
    { id: "revenue", label: "Doanh thu", icon: DollarSign },
    { id: "help", label: "Hướng dẫn & Hỗ trợ", icon: HelpCircle },
  ];

  if (isLoading || !user || !user.roles?.includes("Admin")) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col md:flex-row gap-8">
      {/* Sidebar Nav */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="sticky top-24 rounded-2xl border border-white/5 bg-zinc-900/50 p-4 backdrop-blur shadow-xl space-y-2">
          <h2 className="px-3 py-2 text-xs font-semibold text-zinc-400 tracking-wider uppercase">
            BẢNG QUẢN TRỊ GAMEVAULT
          </h2>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${isActive
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-900/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main View Area */}
      <main className="flex-1 min-w-0">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "games" && <GamesTab />}
        {activeTab === "orders" && <OrdersTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "revenue" && <RevenueTab />}
        {activeTab === "help" && <HelpTab />}
      </main>
    </div>
  );
}

/* ============================================================================
   OVERVIEW TAB
   ============================================================================ */
function OverviewTab() {
  const locale = useLocale();
  const { data: stats, isLoading, refetch: refetchStats } = useAdminStats();
  const [isMigrating, setIsMigrating] = useState(false);
  const [isSyncingFromDrive, setIsSyncingFromDrive] = useState(false);

  const handleMigrateToDrive = async () => {
    setIsMigrating(true);
    try {
      const { data } = await api.post("/admin/migrate-uploads-to-drive");
      if (data.success) {
        const m = data.data.migrated;
        const total = (m.images || 0) + (m.videos || 0) + (m.files || 0) + (m.demos || 0) + (m.avatars || 0) + (m.aiAvatars || 0);
        if (total === 0) {
          alert(
            locale === "vi"
              ? "Không có tệp cục bộ nào cần đồng bộ lên Drive (hoặc tất cả đã ở trên Drive)."
              : "No local files needed migration to Drive."
          );
        } else {
          alert(
            locale === "vi"
              ? `Đồng bộ thành công ${total} tệp lên Drive!\n- Ảnh: ${m.images} tệp\n- Video: ${m.videos} tệp\n- Tệp cài đặt: ${m.files} tệp\n- WebGL Demo: ${m.demos} tệp\n- Avatar: ${m.avatars} tệp`
              : `Sync successful! ${total} files migrated.\n- Images: ${m.images}\n- Videos: ${m.videos}\n- Installers: ${m.files}\n- WebGL Demos: ${m.demos}\n- Avatars: ${m.avatars}`
          );
        }
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || (locale === "vi" ? "Đồng bộ thất bại hoặc xảy ra lỗi kết nối." : "Sync failed or connection error.");
      alert(msg);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSyncDriveToLocal = async () => {
    setIsSyncingFromDrive(true);
    try {
      const { data } = await api.post("/admin/sync-drive-to-local");
      if (data.success) {
        const s = data.data.synced;
        alert(
          locale === "vi"
            ? `Đồng bộ Drive → Local thành công!\n- Ảnh: ${s.images} tệp\n- Video: ${s.videos} tệp\n- Tệp cài đặt: ${s.files} tệp\n- Demo: ${s.demos} tệp\n- Avatar: ${s.avatars} tệp`
            : `Drive → Local sync successful!\n- Images: ${s.images}\n- Videos: ${s.videos}\n- Installers: ${s.files}\n- Demos: ${s.demos}\n- Avatars: ${s.avatars}`
        );
      }
    } catch (error) {
      console.error(error);
      alert(locale === "vi" ? "Đồng bộ thất bại hoặc xảy ra lỗi kết nối." : "Sync failed or connection error.");
    } finally {
      setIsSyncingFromDrive(false);
    }
  };

  const handleResetData = async () => {
    const confirmMsg = locale === "vi"
      ? "CẢNH BÁO: Hành động này sẽ xóa toàn bộ trò chơi, đơn hàng, nhận xét, lượt tải... trên hệ thống. Bạn có thực sự muốn tiếp tục?"
      : "WARNING: This will wipe all game data, orders, reviews, downloads, etc. Do you want to continue?";

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.post("/admin/reset-data");
      alert(locale === "vi" ? "Đã đặt lại dữ liệu thành công!" : "Data reset successful!");
      refetchStats();
    } catch (error) {
      console.error(error);
      alert("Failed to reset data.");
    }
  };

  const handleResetDemoPlays = async () => {
    const confirmMsg = locale === "vi"
      ? "CẢNH BÁO: Hành động này sẽ xóa toàn bộ lịch sử chơi thử và đặt số lượt chơi thử của tất cả game về 0. Bạn có muốn tiếp tục?"
      : "WARNING: This will delete all demo play history and reset the demo play count of all games to 0. Do you want to continue?";

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.post("/admin/reset-demo-plays");
      alert(locale === "vi" ? "Đã xóa toàn bộ lượt chơi thử thành công!" : "Demo plays reset successfully!");
      refetchStats();
    } catch (error) {
      console.error(error);
      alert("Failed to reset demo plays.");
    }
  };

  if (isLoading) return <p className="text-zinc-500">Đang tải dữ liệu thống kê...</p>;

  const s = stats as any;
  const cards = [
    { label: "Tổng Doanh Thu", value: formatPrice(s.totalRevenue ?? 0), color: "text-violet-400" },
    { label: "Đơn Hàng Hoàn Tất", value: s.totalOrders ?? 0, color: "text-green-400" },
    { label: "Người Dùng Đăng Ký", value: s.totalUsers ?? 0, color: "text-blue-400" },
    { label: "Trò Chơi Đã Đăng", value: s.totalGames ?? 0, color: "text-amber-400" },
    { label: "Lượt Tải Game", value: s.totalDownloads ?? 0, color: "text-emerald-400" },
    { label: "Lượt Chơi Thử WebGL", value: s.totalDemoPlays ?? 0, color: "text-pink-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Tổng Quan Bảng Điều Khiển
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Thống kê thời gian thực toàn bộ hoạt động của cửa hàng GameVault.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <Card key={i} className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur flex flex-col justify-between h-32">
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">{c.label}</span>
            <span className={`text-3xl font-bold ${c.color} mt-2`}>{c.value}</span>
          </Card>
        ))}
      </div>

      {/* Top Games & Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6 bg-zinc-900/40 border-white/5 backdrop-blur">
          <h3 className="text-lg font-bold text-white mb-4">Top Trò Chơi Tải Nhiều Nhất</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead>
                <tr className="border-b border-white/5 text-zinc-500 font-semibold">
                  <th className="py-2">Tên Trò Chơi</th>
                  <th className="py-2 text-right">Lượt Tải Về</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(s.topGames ?? []).map((game: any) => (
                  <tr key={game.id} className="hover:text-white transition">
                    <td className="py-3 font-medium text-zinc-200">{game.title}</td>
                    <td className="py-3 text-right">{game.downloadCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Dangerous & System Operations */}
        <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">
              Thao tác hệ thống & đồng bộ
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mt-1">
              Đồng bộ hóa các tệp media giữa máy chủ cục bộ và Google Drive, hoặc khôi phục dữ liệu ban đầu.
            </p>
          </div>
          <div className="space-y-2.5 mt-5">
            <button
              onClick={handleMigrateToDrive}
              disabled={isMigrating}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-white bg-white/[0.1] hover:bg-white/[0.16] disabled:opacity-40 border border-white/[0.08] transition active:scale-[0.98] cursor-pointer"
            >
              {isMigrating ? "Đang đồng bộ..." : "Đồng bộ wwwroot lên Google Drive"}
            </button>
            <button
              onClick={handleSyncDriveToLocal}
              disabled={isSyncingFromDrive}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 border border-white/[0.08] transition active:scale-[0.98] cursor-pointer"
            >
              {isSyncingFromDrive ? "Đang tải xuống..." : "Đồng bộ Google Drive về máy chủ"}
            </button>
            <button
              onClick={handleResetDemoPlays}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-zinc-400 hover:text-orange-300 hover:bg-orange-500/10 border border-white/[0.04] hover:border-orange-500/20 transition active:scale-[0.98] cursor-pointer"
            >
              Xóa lịch sử chơi thử WebGL
            </button>
            <button
              onClick={handleResetData}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-zinc-400 hover:text-red-300 hover:bg-red-500/10 border border-white/[0.04] hover:border-red-500/20 transition active:scale-[0.98] cursor-pointer"
            >
              Khôi phục dữ liệu trò chơi ban đầu
            </button>
          </div>
        </Card>
      </div>

      {/* Recent Demo Plays */}
      <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur">
        <h3 className="text-lg font-bold text-white mb-4">Lượt Chơi Thử WebGL Gần Đây</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-semibold">
                <th className="py-2 px-3">Tên Trò Chơi</th>
                <th className="py-2 px-3">Người Chơi</th>
                <th className="py-2 px-3">Thời Lượng Chơi</th>
                <th className="py-2 px-3 text-right">Thời Gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(s.recentDemoPlays ?? []).map((log: any) => {
                const formatDuration = (sec: number | null) => {
                  if (sec === null || sec === undefined) return "—";
                  if (sec < 60) return `${sec} giây`;
                  const mins = Math.floor(sec / 60);
                  const secs = sec % 60;
                  return `${mins} phút ${secs} giây`;
                };

                return (
                  <tr key={log.id} className="hover:text-white transition">
                    <td className="py-3 px-3 font-medium text-zinc-200">{log.gameTitle}</td>
                    <td className="py-3 px-3 text-zinc-300">
                      {log.userFullName ? `${log.userFullName} (${log.userEmail})` : "Khách vãng lai"}
                    </td>
                    <td className="py-3 px-3 text-zinc-300">
                      {formatDuration(log.playDurationSeconds)}
                    </td>
                    <td className="py-3 px-3 text-right text-zinc-500">
                      {formatDateTime(log.playedAt)}
                    </td>
                  </tr>
                );
              })}
              {(s.recentDemoPlays ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-zinc-500">
                    Chưa có lượt chơi thử nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================================
   GAMES TAB (CRUD + Uploads)
   ============================================================================ */
function GamesTab() {
  const locale = useLocale();
  const { data: categories } = useCategories();

  // Queries
  const { data: gamesList, refetch: refetchGames } = useQuery({
    queryKey: ["admin-games-list"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any[]>>("/admin/games");
      return data.data;
    }
  });

  const { data: tagsList } = useQuery({
    queryKey: ["admin-tags-list"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any[]>>("/games/tags");
      return data.data;
    }
  });

  // Editor states
  const [editingGame, setEditingGame] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGameForUpload, setSelectedGameForUpload] = useState<any | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleZh, setTitleZh] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionZh, setDescriptionZh] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [shortDescriptionEn, setShortDescriptionEn] = useState("");
  const [shortDescriptionZh, setShortDescriptionZh] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeLangTab, setActiveLangTab] = useState<"vi" | "en" | "zh">("vi");
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(true);
  const [multilangViewMode, setMultilangViewMode] = useState<"columns" | "tabs">("columns");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [developer, setDeveloper] = useState("");
  const [publisher, setPublisher] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [price, setPrice] = useState(0);
  const [discountPrice, setDiscountPrice] = useState<number | undefined>(undefined);
  const [minAge, setMinAge] = useState(0);
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState("Draft");

  // Requirements
  const [os, setOs] = useState("");
  const [cpu, setCpu] = useState("");
  const [ram, setRam] = useState("");
  const [gpu, setGpu] = useState("");
  const [storage, setStorage] = useState("");

  // Selected Tags
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Upload fields - separate per asset type
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [assetFiles, setAssetFiles] = useState<{
    image: File | null;
    screenshots: File[];
    trailer: File | null;
    demo: File | null;
    installer: File | null;
  }>({ image: null, screenshots: [], trailer: null, demo: null, installer: null });

  // Direct asset upload state during Create/Edit
  const [isSubmittingGame, setIsSubmittingGame] = useState(false);
  const [submittingProgress, setSubmittingProgress] = useState("");
  const [newGameAssets, setNewGameAssets] = useState<{
    cover: File | null;
    screenshots: File[];
    trailer: File | null;
    demo: File | null;
    installer: File | null;
  }>({ cover: null, screenshots: [], trailer: null, demo: null, installer: null });

  const openUploadModal = (g: any) => {
    setSelectedGameForUpload(g);
    setAssetFiles({ image: null, screenshots: [], trailer: null, demo: null, installer: null });
    api.get(`/admin/games/${g.id}`).then((res) => {
      const fullGame = res.data.data;
      const primaryImage = fullGame.images?.find((i: any) => i.isPrimary) || fullGame.images?.[0];
      const screenshots = fullGame.images?.filter((i: any) => !i.isPrimary && i.id !== primaryImage?.id) || [];
      setSelectedGameForUpload((prev: any) => {
        if (!prev || prev.id !== g.id) return prev;
        return {
          ...prev,
          ...fullGame,
          hasCover: !!primaryImage?.url,
          coverUrl: primaryImage?.url,
          screenshots: screenshots,
          hasTrailer: g.hasTrailer ?? (fullGame.videos && fullGame.videos.length > 0),
          hasDemo: g.hasDemo ?? (fullGame.demo != null),
          hasFile: fullGame.hasFile ?? g.hasFile,
        };
      });
    }).catch((err) => console.error("Failed to load game assets for modal:", err));
  };

  const startEdit = (g: any) => {
    // Load full details via admin endpoint (works for any status)
    api.get(`/admin/games/${g.id}`).then((res) => {
      const fullGame = res.data.data;
      const primaryImage = fullGame.images?.find((i: any) => i.isPrimary) || fullGame.images?.[0];
      const screenshots = fullGame.images?.filter((i: any) => !i.isPrimary && i.id !== primaryImage?.id) || [];
      setEditingGame({
        ...fullGame,
        hasCover: !!primaryImage?.url,
        hasTrailer: g.hasTrailer ?? (fullGame.videos && fullGame.videos.length > 0),
        hasDemo: g.hasDemo ?? (fullGame.demo != null),
        hasFile: fullGame.hasFile ?? g.hasFile,
        coverUrl: primaryImage?.url,
        screenshots: screenshots,
        trailerUrl: fullGame.videos?.[0]?.url,
        demoUrl: fullGame.demo?.buildUrl,
      });
      setIsCreating(false);
      setNewGameAssets({ cover: null, screenshots: [], trailer: null, demo: null, installer: null });

      setTitle(fullGame.title || "");
      setTitleEn(fullGame.titleEn || "");
      setTitleZh(fullGame.titleZh || "");
      setSlug(fullGame.slug || "");
      setDescription(fullGame.description || "");
      setDescriptionEn(fullGame.descriptionEn || "");
      setDescriptionZh(fullGame.descriptionZh || "");
      setShortDescription(fullGame.shortDescription || "");
      setShortDescriptionEn(fullGame.shortDescriptionEn || "");
      setShortDescriptionZh(fullGame.shortDescriptionZh || "");

      // Find Category IDs by names
      const categoryNames = fullGame.categoryName
        ? fullGame.categoryName.split(",").map((name: string) => name.trim())
        : [];
      const currentCategoryIds = (categories ?? [])
        .filter((c: any) => categoryNames.includes(c.name))
        .map((c: any) => c.id);
      setSelectedCategoryIds(currentCategoryIds);

      setDeveloper(fullGame.developer || "");
      setPublisher(fullGame.publisher || "");
      setReleaseDate(fullGame.releaseDate || "");
      setPrice(fullGame.price || 0);
      setDiscountPrice(fullGame.discountPrice ?? undefined);
      setMinAge(fullGame.minAge || 0);
      setIsFeatured(fullGame.isFeatured || false);
      setStatus(fullGame.status || "Draft");

      // Parse requirements
      try {
        const reqs = JSON.parse(fullGame.systemRequirements || "{}");
        setOs(reqs.os || "");
        setCpu(reqs.cpu || "");
        setRam(reqs.ram_gb?.toString() || "");
        setGpu(reqs.gpu || "");
        setStorage(reqs.storage_gb?.toString() || "");
      } catch {
        setOs(""); setCpu(""); setRam(""); setGpu(""); setStorage("");
      }

      // Map tags
      const currentTagIds = (tagsList ?? [])
        .filter((t: any) => fullGame.tags?.includes(t.name))
        .map((t: any) => t.id);
      setSelectedTagIds(currentTagIds);
    }).catch(() => {
      alert("Failed to load game details. Try again.");
    });
  };

  const startCreate = () => {
    setEditingGame(null);
    setIsCreating(true);
    setNewGameAssets({ cover: null, screenshots: [], trailer: null, demo: null, installer: null });

    setTitle(""); setTitleEn(""); setTitleZh(""); setSlug("");
    setDescription(""); setDescriptionEn(""); setDescriptionZh("");
    setShortDescription(""); setShortDescriptionEn(""); setShortDescriptionZh("");
    setSelectedCategoryIds([]);
    setDeveloper(""); setPublisher(""); setReleaseDate("");
    setPrice(0); setDiscountPrice(undefined); setMinAge(0);
    setIsFeatured(false); setStatus("Draft");
    setOs(""); setCpu(""); setRam(""); setGpu(""); setStorage("");
    setSelectedTagIds([]);
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();

    let curTitleEn = titleEn || title;
    let curTitleZh = titleZh || title;
    let curDescEn = descriptionEn;
    let curDescZh = descriptionZh;
    let curShortEn = shortDescriptionEn;
    let curShortZh = shortDescriptionZh;

    // Auto-translate before save if fields are missing
    if (autoTranslateEnabled && (description.trim() || shortDescription.trim()) && (!curDescEn || !curDescZh || !curShortEn || !curShortZh)) {
      setSubmittingProgress("Đang tự động dịch mô tả game sang Tiếng Anh & Tiếng Trung...");
      try {
        const { data } = await api.post<ApiResponse<{
          vi: { title: string; description: string; shortDescription: string };
          en: { title: string; description: string; shortDescription: string };
          zh: { title: string; description: string; shortDescription: string };
        }>>("/admin/games/translate", {
          sourceLocale: "vi",
          title,
          description,
          shortDescription
        });
        if (data?.data) {
          const t = data.data;
          if (!curDescEn && t.en?.description) curDescEn = t.en.description;
          if (!curShortEn && t.en?.shortDescription) curShortEn = t.en.shortDescription;
          if (!curDescZh && t.zh?.description) curDescZh = t.zh.description;
          if (!curShortZh && t.zh?.shortDescription) curShortZh = t.zh.shortDescription;

          if (t.en?.description) setDescriptionEn(t.en.description);
          if (t.en?.shortDescription) setShortDescriptionEn(t.en.shortDescription);
          if (t.zh?.description) setDescriptionZh(t.zh.description);
          if (t.zh?.shortDescription) setShortDescriptionZh(t.zh.shortDescription);
        }
      } catch (err) {
        console.warn("Auto translate pre-save error:", err);
      }
    }

    const reqJson = JSON.stringify({
      os, cpu, ram_gb: ram ? parseInt(ram) : null, gpu, storage_gb: storage ? parseInt(storage) : null
    });

    const payload = {
      title, slug, description, shortDescription,
      titleEn: curTitleEn || null, descriptionEn: curDescEn || null, shortDescriptionEn: curShortEn || null,
      titleZh: curTitleZh || null, descriptionZh: curDescZh || null, shortDescriptionZh: curShortZh || null,
      categoryIds: selectedCategoryIds, developer, publisher: publisher || null,
      releaseDate: releaseDate || null, price, discountPrice: discountPrice || null,
      minAge, isFeatured, status: status || "Draft", systemRequirements: reqJson, tagIds: selectedTagIds
    };

    const MAX_GAME_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB
    if (newGameAssets.installer && newGameAssets.installer.size > MAX_GAME_FILE_SIZE) {
      alert(locale === "vi" 
        ? `Tệp cài đặt game "${newGameAssets.installer.name}" vượt quá dung lượng tối đa cho phép là 3GB!` 
        : `Game installer "${newGameAssets.installer.name}" exceeds 3GB limit!`);
      return;
    }
    if (newGameAssets.demo && newGameAssets.demo.size > MAX_GAME_FILE_SIZE) {
      alert(locale === "vi" 
        ? `Tệp demo WebGL "${newGameAssets.demo.name}" vượt quá dung lượng tối đa cho phép là 3GB!` 
        : `WebGL demo "${newGameAssets.demo.name}" exceeds 3GB limit!`);
      return;
    }

    setIsSubmittingGame(true);
    setSubmittingProgress("Đang lưu thông tin trò chơi...");

    try {
      let savedGameId: string | null = null;
      if (isCreating) {
        const res = await api.post<ApiResponse<any>>("/admin/games", payload);
        savedGameId = res?.data?.data?.id;
      } else {
        await api.put(`/admin/games/${editingGame.id}`, payload);
        savedGameId = editingGame.id;
      }

      // Upload selected game assets directly to Drive
      if (savedGameId) {
        if (newGameAssets.cover) {
          setSubmittingProgress("Đang tải ảnh bìa lên Google Drive...");
          const form = new FormData();
          form.append("file", newGameAssets.cover);
          form.append("type", "cover");
          await api.post(`/admin/games/${savedGameId}/upload`, form);
        }
        if (newGameAssets.screenshots && newGameAssets.screenshots.length > 0) {
          for (let s = 0; s < newGameAssets.screenshots.length; s++) {
            setSubmittingProgress(`Đang tải ảnh gameplay ${s + 1}/${newGameAssets.screenshots.length} lên Google Drive...`);
            const form = new FormData();
            form.append("file", newGameAssets.screenshots[s]);
            form.append("type", "screenshot");
            await api.post(`/admin/games/${savedGameId}/upload`, form);
          }
        }
        if (newGameAssets.trailer) {
          setSubmittingProgress("Đang tải video trailer lên Google Drive...");
          const form = new FormData();
          form.append("file", newGameAssets.trailer);
          form.append("type", "trailer");
          await api.post(`/admin/games/${savedGameId}/upload`, form);
        }
        if (newGameAssets.demo) {
          setSubmittingProgress("Đang xử lý & tải demo WebGL lên Google Drive...");
          const form = new FormData();
          form.append("file", newGameAssets.demo);
          form.append("type", "demo");
          await api.post(`/admin/games/${savedGameId}/upload`, form);
        }
        if (newGameAssets.installer) {
          setSubmittingProgress("Đang tải tệp cài đặt lên Google Drive...");
          const form = new FormData();
          form.append("file", newGameAssets.installer);
          form.append("type", "installer");
          await api.post(`/admin/games/${savedGameId}/upload`, form);
        }
      }

      alert(isCreating ? "Đã tạo trò chơi và tải lên tài nguyên thành công!" : "Đã lưu thông tin trò chơi và tài nguyên thành công!");
      setIsCreating(false);
      setEditingGame(null);
      setNewGameAssets({ cover: null, screenshots: [], trailer: null, demo: null, installer: null });
      refetchGames();
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.message || error?.message || "Lỗi khi lưu trò chơi. Vui lòng đảm bảo Game Slug là duy nhất.";
      alert(`Lỗi: ${msg}`);
    } finally {
      setIsSubmittingGame(false);
      setSubmittingProgress("");
    }
  };

  const handleAutoTranslate = async (sourceLang: "vi" | "en" | "zh", silent = false) => {
    let srcTitle = "";
    let srcDesc = "";
    let srcShort = "";

    if (sourceLang === "vi") {
      srcTitle = title;
      srcDesc = description;
      srcShort = shortDescription;
    } else if (sourceLang === "en") {
      srcTitle = titleEn;
      srcDesc = descriptionEn;
      srcShort = shortDescriptionEn;
    } else if (sourceLang === "zh") {
      srcTitle = titleZh;
      srcDesc = descriptionZh;
      srcShort = shortDescriptionZh;
    }

    if (!srcDesc.trim() && !srcShort.trim()) {
      if (!silent) {
        alert("Vui lòng nhập mô tả ngắn hoặc mô tả chi tiết trước khi dịch tự động!");
      }
      return;
    }

    // Giữ nguyên tên game gốc không dịch thương hiệu
    if (srcTitle) {
      if (!title) setTitle(srcTitle);
      if (!titleEn) setTitleEn(srcTitle);
      if (!titleZh) setTitleZh(srcTitle);
    }

    if (sourceLang === "vi" && srcTitle && !slug) {
      setSlug(generateSlug(srcTitle));
    }

    setIsTranslating(true);
    try {
      const { data } = await api.post<ApiResponse<{
        vi: { title: string; description: string; shortDescription: string };
        en: { title: string; description: string; shortDescription: string };
        zh: { title: string; description: string; shortDescription: string };
      }>>("/admin/games/translate", {
        sourceLocale: sourceLang,
        title: srcTitle,
        description: srcDesc,
        shortDescription: srcShort
      });

      if (data?.data) {
        const t = data.data;
        // Điền chính xác vào từng khung ngôn ngữ tương ứng
        if (sourceLang !== "vi" && t.vi) {
          if (t.vi.description) setDescription(t.vi.description);
          if (t.vi.shortDescription) setShortDescription(t.vi.shortDescription);
        }
        if (sourceLang !== "en" && t.en) {
          if (t.en.description) setDescriptionEn(t.en.description);
          if (t.en.shortDescription) setShortDescriptionEn(t.en.shortDescription);
        }
        if (sourceLang !== "zh" && t.zh) {
          if (t.zh.description) setDescriptionZh(t.zh.description);
          if (t.zh.shortDescription) setShortDescriptionZh(t.zh.shortDescription);
        }

        if (!silent) {
          alert("Đã dịch tự động mô tả game thành công sang các ngôn ngữ còn lại!");
        }
      }
    } catch (err: any) {
      console.error("Auto-translate error:", err);
      if (!silent) {
        alert(`Lỗi dịch tự động: ${err?.response?.data?.message || err?.message || "Không thể kết nối dịch vụ AI"}`);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDeleteGame = async (id: string, gameTitle?: string) => {
    const confirmMsg = locale === "vi"
      ? `Bạn có chắc chắn muốn xóa vĩnh viễn tựa game "${gameTitle || id}" khỏi hệ thống không? Toàn bộ dữ liệu liên quan sẽ bị xóa sạch.`
      : locale === "zh"
      ? `您确定要从系统中彻底删除游戏 "${gameTitle || id}" 吗？所有关联数据将被永久删除。`
      : `Are you sure you want to permanently delete "${gameTitle || id}" from the system? All associated data will be removed.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete(`/admin/games/${id}`);
      refetchGames();
      alert(
        locale === "vi"
          ? "Đã xóa trò chơi thành công!"
          : locale === "zh"
          ? "游戏删除成功！"
          : "Game deleted successfully."
      );
    } catch (error: any) {
      console.error("Delete game error:", error);
      const errMsg = error?.response?.data?.message || error?.message || "Unknown error";
      alert(
        locale === "vi"
          ? `Lỗi khi xóa trò chơi: ${errMsg}`
          : locale === "zh"
          ? `删除游戏失败: ${errMsg}`
          : `Failed to delete game: ${errMsg}`
      );
    }
  };

  const handleUploadSingleAsset = async (type: "image" | "trailer" | "demo" | "installer") => {
    const file = assetFiles[type];
    if (!file || !selectedGameForUpload) {
      alert(locale === "vi" ? "Vui lòng chọn tệp trước khi bấm Tải lên!" : "Please select a file to upload first!");
      return;
    }

    const MAX_GAME_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB
    if (file.size > MAX_GAME_FILE_SIZE) {
      alert(locale === "vi" 
        ? `Tệp "${file.name}" vượt quá dung lượng tối đa cho phép là 3GB!` 
        : `File "${file.name}" exceeds the 3GB limit!`);
      return;
    }

    setUploadingType(type);
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);

    try {
      const res = await api.post(`/admin/games/${selectedGameForUpload.id}/upload`, form);
      alert(locale === "vi" ? "Tải lên tài nguyên thành công!" : "Asset uploaded successfully!");
      
      // Clear file for this type
      setAssetFiles(prev => ({ ...prev, [type]: null }));

      // Sync local drawer state immediately
      setSelectedGameForUpload((prev: any) => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (type === "image") {
          updated.hasCover = true;
          if (res?.data?.data?.url) updated.coverUrl = res.data.data.url;
        } else if (type === "trailer") {
          updated.hasTrailer = true;
        } else if (type === "demo") {
          updated.hasDemo = true;
        } else if (type === "installer") {
          updated.hasFile = true;
        }
        return updated;
      });

      refetchGames();
    } catch (error: any) {
      console.error("Upload asset error:", error);
      const msg = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || "Lỗi tải tệp lên";
      alert(locale === "vi" ? `Lỗi tải lên tài nguyên: ${msg}` : `Error uploading asset: ${msg}`);
    } finally {
      setUploadingType(null);
    }
  };

  const handleUploadScreenshots = async () => {
    if (!assetFiles.screenshots || assetFiles.screenshots.length === 0 || !selectedGameForUpload) {
      alert(locale === "vi" ? "Vui lòng chọn ít nhất một ảnh gameplay!" : "Please select at least one gameplay screenshot!");
      return;
    }

    setUploadingType("screenshot");
    try {
      for (let i = 0; i < assetFiles.screenshots.length; i++) {
        const file = assetFiles.screenshots[i];
        const form = new FormData();
        form.append("file", file);
        form.append("type", "screenshot");
        await api.post(`/admin/games/${selectedGameForUpload.id}/upload`, form);
      }
      alert(locale === "vi" ? `Đã tải lên thành công ${assetFiles.screenshots.length} ảnh gameplay!` : `Successfully uploaded ${assetFiles.screenshots.length} screenshots!`);
      setAssetFiles(prev => ({ ...prev, screenshots: [] }));

      // Reload screenshots list for modal
      const res = await api.get(`/admin/games/${selectedGameForUpload.id}`);
      const fullGame = res.data.data;
      const primaryImage = fullGame.images?.find((i: any) => i.isPrimary) || fullGame.images?.[0];
      const screenshots = fullGame.images?.filter((i: any) => !i.isPrimary && i.id !== primaryImage?.id) || [];
      setSelectedGameForUpload((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          screenshots: screenshots,
        };
      });
      refetchGames();
    } catch (error: any) {
      console.error("Upload screenshots error:", error);
      const msg = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || "Lỗi tải ảnh";
      alert(locale === "vi" ? `Lỗi tải lên ảnh gameplay: ${msg}` : `Error uploading screenshots: ${msg}`);
    } finally {
      setUploadingType(null);
    }
  };

  const handleRemoveAsset = async (gameId: string, assetType: string, extraId?: string) => {
    const assetNames: Record<string, string> = {
      cover: locale === "vi" ? "ảnh bìa" : "cover image",
      trailer: locale === "vi" ? "trailer video" : "trailer video",
      demo: locale === "vi" ? "bản chơi thử WebGL" : "WebGL demo build",
      installer: locale === "vi" ? "tệp cài đặt game" : "installer files",
      screenshot: locale === "vi" ? "ảnh gameplay này" : "this gameplay screenshot"
    };

    const confirmMsg = locale === "vi"
      ? `Bạn có chắc chắn muốn gỡ bỏ hoàn toàn ${assetNames[assetType] || assetType} khỏi hệ thống và Google Drive?`
      : `Are you sure you want to completely remove ${assetNames[assetType] || assetType} from the system and Google Drive?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (assetType === "screenshot" && extraId) {
        await api.delete(`/admin/games/${gameId}/images/${extraId}`);
      } else {
        await api.delete(`/admin/games/${gameId}/${assetType}`);
      }
      alert(locale === "vi" ? "Gỡ bỏ thành công khỏi máy và Google Drive!" : "Asset removed successfully from server & Drive!");
      
      // Update editingGame if open
      setEditingGame((prev: any) => {
        if (!prev || prev.id !== gameId) return prev;
        const updated = { ...prev };
        if (assetType === "cover") {
          updated.hasCover = false;
          updated.coverUrl = null;
        } else if (assetType === "screenshot" && extraId) {
          updated.screenshots = (updated.screenshots || []).filter((s: any) => s.id !== extraId);
        } else if (assetType === "trailer") {
          updated.hasTrailer = false;
          updated.trailerUrl = null;
        } else if (assetType === "demo") {
          updated.hasDemo = false;
          updated.demoUrl = null;
        } else if (assetType === "installer") {
          updated.hasFile = false;
        }
        return updated;
      });

      // Update local drawer state so checklist and actions sync immediately
      setSelectedGameForUpload((prev: any) => {
        if (!prev || prev.id !== gameId) return prev;
        const updated = { ...prev };
        if (assetType === "cover") {
          updated.hasCover = false;
          updated.coverUrl = null;
        } else if (assetType === "trailer") {
          updated.hasTrailer = false;
        } else if (assetType === "demo") {
          updated.hasDemo = false;
        } else if (assetType === "installer") {
          updated.hasFile = false;
        }
        return updated;
      });

      refetchGames();
    } catch (error) {
      console.error(error);
      alert(locale === "vi" ? "Không thể gỡ bỏ tệp." : "Failed to remove asset.");
    }
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const games = gamesList ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Danh Mục Trò Chơi</h1>
          <p className="text-sm text-zinc-400 mt-1">Tạo mới, chỉnh sửa thông tin và quản lý tài nguyên game (ảnh bìa, trailer, bản chơi thử, file cài đặt).</p>
        </div>
        {!isCreating && !editingGame && (
          <Button onClick={startCreate} className="bg-violet-600 hover:bg-violet-500 text-white gap-2 font-medium">
            <PlusCircle className="size-4" />
            Thêm trò chơi mới
          </Button>
        )}
      </div>

      {/* Forms Area */}
      {(isCreating || editingGame) && (
        <Card className="p-6 bg-zinc-900/40 border-violet-500/10 backdrop-blur">
          <h2 className="text-xl font-bold text-white mb-6">
            {isCreating ? "Thêm Trò Chơi Mới" : `Chỉnh sửa trò chơi: ${editingGame.title}`}
          </h2>
          <form onSubmit={handleSaveGame} className="space-y-6">

            {/* Multilingual Content */}
            <div className="space-y-4 p-5 bg-[#0C1019] rounded-2xl border border-white/[0.08]">
              {/* Header & Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                    Nội dung đa ngôn ngữ
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Nhập tiếng Việt, AI sẽ tự động tạo bản dịch tiếng Anh và tiếng Trung tương ứng.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoTranslateEnabled}
                      onChange={(e) => setAutoTranslateEnabled(e.target.checked)}
                      className="accent-violet-500 rounded size-3.5 cursor-pointer"
                    />
                    <span>Tự động dịch khi nhập xong</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleAutoTranslate("vi", false)}
                    disabled={isTranslating}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-white/[0.08] hover:bg-white/[0.12] text-zinc-100 border border-white/[0.1] transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin text-zinc-400" />
                        <span>Đang dịch...</span>
                      </>
                    ) : (
                      <span>Dịch sang Tiếng Anh & Tiếng Trung</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Language Selector Segmented Control */}
              <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setActiveLangTab("vi")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeLangTab === "vi" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Tiếng Việt
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLangTab("en")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeLangTab === "en" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLangTab("zh")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeLangTab === "zh" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    中文
                  </button>
                </div>

                {/* View Mode Toggle */}
                <div className="hidden lg:flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setMultilangViewMode("columns")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      multilangViewMode === "columns" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    3 Cột
                  </button>
                  <button
                    type="button"
                    onClick={() => setMultilangViewMode("tabs")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      multilangViewMode === "tabs" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Từng Tab
                  </button>
                </div>
              </div>

              {/* Active Tab View OR 3-Column View */}
              {multilangViewMode === "columns" ? (
                <div className="grid gap-4 lg:grid-cols-3">
                  {/* Column 1: Tiếng Việt */}
                  <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <span className="text-xs font-semibold text-zinc-200">Tiếng Việt</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Bản gốc</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-zinc-400 font-medium">Tên game (Title)</label>
                        <span className="text-[10px] text-zinc-500 italic">Giữ nguyên gốc</span>
                      </div>
                      <Input
                        required
                        value={title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTitle(val);
                          if (!titleEn || titleEn === title) setTitleEn(val);
                          if (!titleZh || titleZh === title) setTitleZh(val);
                          if (isCreating) {
                            setSlug(generateSlug(val));
                          }
                        }}
                        placeholder="Ví dụ: Survival On Earth"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 font-medium">Mô tả ngắn</label>
                      <Input
                        value={shortDescription}
                        onChange={(e) => setShortDescription(e.target.value)}
                        onBlur={() => {
                          if (autoTranslateEnabled && shortDescription.trim() && (!shortDescriptionEn || !shortDescriptionZh)) {
                            handleAutoTranslate("vi", true);
                          }
                        }}
                        placeholder="Tóm tắt ngắn gọn hiển thị trên thẻ game..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 font-medium">Mô tả chi tiết</label>
                      <textarea
                        required
                        className="w-full h-36 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none focus:border-white/30"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={() => {
                          if (autoTranslateEnabled && description.trim() && (!descriptionEn || !descriptionZh)) {
                            handleAutoTranslate("vi", true);
                          }
                        }}
                        placeholder="Giới thiệu chi tiết cốt truyện, gameplay..."
                      />
                    </div>
                  </div>

                  {/* Column 2: English */}
                  <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <span className="text-xs font-semibold text-zinc-200">English</span>
                      <span className="text-[10px] text-zinc-500 font-mono">EN</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-zinc-400 font-medium">Title (EN)</label>
                        <span className="text-[10px] text-zinc-500 italic">Same brand name</span>
                      </div>
                      <Input
                        value={titleEn}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTitleEn(val);
                          if (!title) setTitle(val);
                          if (!titleZh) setTitleZh(val);
                        }}
                        placeholder="e.g. Survival On Earth"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 font-medium">Short Description (EN)</label>
                      <Input
                        value={shortDescriptionEn}
                        onChange={(e) => setShortDescriptionEn(e.target.value)}
                        onBlur={() => {
                          if (autoTranslateEnabled && shortDescriptionEn.trim() && (!shortDescription || !shortDescriptionZh)) {
                            handleAutoTranslate("vi", true);
                          }
                        }}
                        placeholder="Brief summary for game cards..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 font-medium">Description (EN)</label>
                      <textarea
                        className="w-full h-36 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none focus:border-white/30"
                        value={descriptionEn}
                        onChange={(e) => setDescriptionEn(e.target.value)}
                        onBlur={() => {
                          if (autoTranslateEnabled && descriptionEn.trim() && (!description || !descriptionZh)) {
                            handleAutoTranslate("vi", true);
                          }
                        }}
                        placeholder="English narrative and gameplay details..."
                      />
                    </div>
                  </div>

                  {/* Column 3: Chinese */}
                  <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <span className="text-xs font-semibold text-zinc-200">中文</span>
                      <span className="text-[10px] text-zinc-500 font-mono">ZH</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-zinc-400 font-medium">游戏名称 (Title ZH)</label>
                        <span className="text-[10px] text-zinc-500 italic">保持原名称</span>
                      </div>
                      <Input
                        value={titleZh}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTitleZh(val);
                          if (!title) setTitle(val);
                          if (!titleEn) setTitleEn(val);
                        }}
                        placeholder="保持游戏原英文名，如：Survival On Earth"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 font-medium">简短描述 (Short Description ZH)</label>
                      <Input
                        value={shortDescriptionZh}
                        onChange={(e) => setShortDescriptionZh(e.target.value)}
                        onBlur={() => {
                          if (autoTranslateEnabled && shortDescriptionZh.trim() && (!shortDescription || !shortDescriptionEn)) {
                            handleAutoTranslate("vi", true);
                          }
                        }}
                        placeholder="游戏卡片简要概览..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 font-medium">详细描述 (Description ZH)</label>
                      <textarea
                        className="w-full h-36 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none focus:border-white/30"
                        value={descriptionZh}
                        onChange={(e) => setDescriptionZh(e.target.value)}
                        onBlur={() => {
                          if (autoTranslateEnabled && descriptionZh.trim() && (!description || !descriptionEn)) {
                            handleAutoTranslate("vi", true);
                          }
                        }}
                        placeholder="中文游戏背景故事及玩法介绍..."
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Tabbed View */
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-4">
                  {activeLangTab === "vi" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <span className="text-xs font-semibold text-zinc-200">Tiếng Việt (Bản gốc)</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-zinc-400 font-medium">Tên game (Title)</label>
                          <span className="text-[10px] text-zinc-500 italic">Giữ nguyên gốc</span>
                        </div>
                        <Input
                          required
                          value={title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTitle(val);
                            if (!titleEn || titleEn === title) setTitleEn(val);
                            if (!titleZh || titleZh === title) setTitleZh(val);
                            if (isCreating) {
                              setSlug(generateSlug(val));
                            }
                          }}
                          placeholder="Ví dụ: Survival On Earth"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-medium">Mô tả ngắn</label>
                        <Input
                          value={shortDescription}
                          onChange={(e) => setShortDescription(e.target.value)}
                          onBlur={() => {
                            if (autoTranslateEnabled && shortDescription.trim() && (!shortDescriptionEn || !shortDescriptionZh)) {
                              handleAutoTranslate("vi", true);
                            }
                          }}
                          placeholder="Mô tả tóm tắt hiển thị trên card..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-medium">Mô tả chi tiết</label>
                        <textarea
                          required
                          className="w-full h-36 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none focus:border-white/30"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          onBlur={() => {
                            if (autoTranslateEnabled && description.trim() && (!descriptionEn || !descriptionZh)) {
                              handleAutoTranslate("vi", true);
                            }
                          }}
                          placeholder="Mô tả chi tiết về thế giới game, cốt truyện..."
                        />
                      </div>
                    </div>
                  )}

                  {activeLangTab === "en" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <span className="text-xs font-semibold text-zinc-200">English (EN)</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-zinc-400 font-medium">Title (EN)</label>
                          <span className="text-[10px] text-zinc-500 italic">Same brand name</span>
                        </div>
                        <Input
                          value={titleEn}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTitleEn(val);
                            if (!title) setTitle(val);
                            if (!titleZh) setTitleZh(val);
                          }}
                          placeholder="English game title..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-medium">Short Description (EN)</label>
                        <Input
                          value={shortDescriptionEn}
                          onChange={(e) => setShortDescriptionEn(e.target.value)}
                          onBlur={() => {
                            if (autoTranslateEnabled && shortDescriptionEn.trim() && (!shortDescription || !shortDescriptionZh)) {
                              handleAutoTranslate("vi", true);
                            }
                          }}
                          placeholder="Summary in English..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-medium">Description (EN)</label>
                        <textarea
                          className="w-full h-36 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none focus:border-white/30"
                          value={descriptionEn}
                          onChange={(e) => setDescriptionEn(e.target.value)}
                          onBlur={() => {
                            if (autoTranslateEnabled && descriptionEn.trim() && (!description || !descriptionZh)) {
                              handleAutoTranslate("vi", true);
                            }
                          }}
                          placeholder="Full narrative in English..."
                        />
                      </div>
                    </div>
                  )}

                  {activeLangTab === "zh" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <span className="text-xs font-semibold text-zinc-200">中文 (ZH)</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-zinc-400">游戏名称 (Title ZH)</label>
                          <span className="text-[10px] text-zinc-500 italic">保持原名称</span>
                        </div>
                        <Input
                          value={titleZh}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTitleZh(val);
                            if (!title) setTitle(val);
                            if (!titleEn) setTitleEn(val);
                          }}
                          placeholder="保持游戏原英文名，如：Survival On Earth"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400">简短描述 (Short Description ZH)</label>
                        <Input
                          value={shortDescriptionZh}
                          onChange={(e) => setShortDescriptionZh(e.target.value)}
                          onBlur={() => {
                            if (autoTranslateEnabled && shortDescriptionZh.trim() && (!shortDescription || !shortDescriptionEn)) {
                              handleAutoTranslate("zh", true);
                            }
                          }}
                          placeholder="中文简短描述..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400">详细描述 (Description ZH)</label>
                        <textarea
                          className="w-full h-36 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-300 outline-none focus:border-emerald-500"
                          value={descriptionZh}
                          onChange={(e) => setDescriptionZh(e.target.value)}
                          onBlur={() => {
                            if (autoTranslateEnabled && descriptionZh.trim() && (!description || !descriptionEn)) {
                              handleAutoTranslate("zh", true);
                            }
                          }}
                          placeholder="详细中文游戏介绍..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* General Metadata - Game Slug */}
            <div className="p-5 bg-zinc-950/60 rounded-2xl border border-white/5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <span>Đường dẫn URL (Game Slug)</span>
                    <span className="text-zinc-500">*</span>
                  </label>
                  <span className="text-[11px] text-zinc-500">Tự động sinh từ tên game, có thể tùy chỉnh</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs text-zinc-500 font-mono">
                    /game/
                  </div>
                  <Input
                    required
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                    placeholder="survival-on-earth"
                    className="pl-16 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-300 font-semibold">Chọn thể loại trò chơi</label>
              <div className="flex flex-wrap gap-2">
                {(categories ?? []).map((cat: any) => {
                  const selected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${selected
                        ? "bg-violet-600 border-violet-500 text-white"
                        : "border-white/5 bg-zinc-950 text-zinc-400 hover:text-white"
                        }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Financials & Developer details */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Giá bán gốc (VNĐ)</label>
                <Input type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Giá khuyến mãi (VNĐ - Tùy chọn)</label>
                <Input type="number" value={discountPrice ?? ""} onChange={(e) => setDiscountPrice(e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="Không có" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Nhà phát triển (Developer)</label>
                <Input required value={developer} onChange={(e) => setDeveloper(e.target.value)} placeholder="Tên studio hoặc cá nhân" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Nhà phát hành (Publisher - Tùy chọn)</label>
                <Input value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="Tên nhà phát hành" />
              </div>
            </div>

            {/* Limits & Flags */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Ngày phát hành (Release Date)</label>
                <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="[color-scheme:dark]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Độ tuổi tối thiểu (Tuổi)</label>
                <Input type="number" value={minAge} onChange={(e) => setMinAge(parseInt(e.target.value))} placeholder="0" />
              </div>
              <div className="flex flex-col gap-1 pt-6">
                <div className="flex items-center gap-2">
                  <input id="isFeatured" type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="size-4 rounded text-violet-600 bg-zinc-950 border-white/10 cursor-pointer" />
                  <label htmlFor="isFeatured" className="text-sm text-zinc-300 select-none cursor-pointer">Đánh dấu là Game Nổi Bật (Featured)</label>
                </div>
                {isFeatured && status !== "Published" && (
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Trò chơi cần ở trạng thái Đã phát hành (Published) để hiển thị tại mục nổi bật.
                  </p>
                )}
              </div>
            </div>

            {/* System Requirements */}
            <div className="p-4 bg-zinc-950/40 rounded-2xl border border-white/5 space-y-4">
              <h3 className="font-semibold text-violet-400 text-sm">Yêu Cầu Cấu Hình Hệ Thống (Khuyến nghị)</h3>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Hệ điều hành (OS)</label>
                  <Input value={os} onChange={(e) => setOs(e.target.value)} placeholder="Windows 10 / 11" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Vi xử lý (CPU)</label>
                  <Input value={cpu} onChange={(e) => setCpu(e.target.value)} placeholder="Intel Core i5 / AMD Ryzen 5" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Bộ nhớ RAM (GB)</label>
                  <Input type="number" value={ram} onChange={(e) => setRam(e.target.value)} placeholder="8" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Card đồ họa (GPU)</label>
                  <Input value={gpu} onChange={(e) => setGpu(e.target.value)} placeholder="NVIDIA GTX 1060" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Ổ cứng trống (GB)</label>
                  <Input type="number" value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="20" />
                </div>
              </div>
            </div>

            {/* Tags Selection */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-300 font-semibold">Chọn nhãn đính kèm (Tags)</label>
              <div className="flex flex-wrap gap-2">
                {(tagsList ?? []).map((tag: any) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${selected
                        ? "bg-violet-600 border-violet-500 text-white"
                        : "border-white/5 bg-zinc-950 text-zinc-400 hover:text-white"
                        }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Game Assets Section */}
            <div className="space-y-4 p-5 bg-[#0C1019] rounded-2xl border border-white/[0.08]">
              <div>
                <h4 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  Tệp tài nguyên game
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Đính kèm tệp để tự động tải lên Google Drive ngay khi tạo hoặc lưu trò chơi. Xóa tệp sẽ đồng thời gỡ khỏi máy chủ và đám mây.
                </p>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Cover Image */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.14] transition space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">Ảnh bìa chính</span>
                      <span className="text-[10px] text-zinc-500 font-mono">JPG, PNG, WebP</span>
                    </div>

                    {/* Existing Cover Image Preview */}
                    {editingGame?.hasCover && editingGame?.coverUrl ? (
                      <div className="flex items-center justify-between gap-2.5 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={resolveImageUrl(editingGame.coverUrl)}
                            alt={editingGame.title || "Ảnh bìa"}
                            className="size-9 rounded-md object-cover border border-white/10 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-[11px] font-medium text-emerald-400 block truncate">Đã có ảnh bìa</span>
                            <span className="text-[10px] text-zinc-500 block truncate">Google Drive</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(editingGame.id, "cover")}
                          className="text-[11px] font-medium text-red-400 hover:text-red-300 hover:underline shrink-0 cursor-pointer"
                        >
                          Gỡ bỏ
                        </button>
                      </div>
                    ) : (
                      <div className="py-1 text-[11px] text-zinc-500">
                        Chưa có ảnh bìa
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/[0.06]">
                    <span className="text-[10px] text-zinc-400 block mb-1.5">
                      {editingGame?.hasCover ? "Tải lên ảnh mới để thay thế:" : "Chọn ảnh từ máy tính:"}
                    </span>
                    <DropzoneFileInput
                      accept="image/*"
                      files={newGameAssets.cover}
                      formatHint="PNG, JPG, WebP"
                      onSelect={(files) => setNewGameAssets(prev => ({ ...prev, cover: files?.[0] || null }))}
                      onClear={() => setNewGameAssets(prev => ({ ...prev, cover: null }))}
                    />
                  </div>
                </div>

                {/* 2. Trailer Video */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.14] transition space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">Video trailer</span>
                      <span className="text-[10px] text-zinc-500 font-mono">MP4, WebM</span>
                    </div>

                    {/* Existing Trailer Video Info */}
                    {editingGame?.hasTrailer ? (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="min-w-0">
                          <span className="text-[11px] font-medium text-emerald-400 block truncate">Đã có video trailer</span>
                          <span className="text-[10px] text-zinc-500 block truncate">Google Drive</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(editingGame.id, "trailer")}
                          className="text-[11px] font-medium text-red-400 hover:text-red-300 hover:underline shrink-0 cursor-pointer"
                        >
                          Gỡ bỏ
                        </button>
                      </div>
                    ) : (
                      <div className="py-1 text-[11px] text-zinc-500">
                        Chưa có trailer
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/[0.06]">
                    <span className="text-[10px] text-zinc-400 block mb-1.5">
                      {editingGame?.hasTrailer ? "Tải lên trailer mới để thay thế:" : "Chọn tệp từ máy tính:"}
                    </span>
                    <DropzoneFileInput
                      accept="video/mp4,video/webm"
                      files={newGameAssets.trailer}
                      formatHint="MP4, WebM (H.264)"
                      onSelect={(files) => setNewGameAssets(prev => ({ ...prev, trailer: files?.[0] || null }))}
                      onClear={() => setNewGameAssets(prev => ({ ...prev, trailer: null }))}
                    />
                  </div>
                </div>

                {/* 3. WebGL Demo */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.14] transition space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">Bản chơi thử WebGL</span>
                      <span className="text-[10px] text-zinc-500 font-mono">ZIP build</span>
                    </div>

                    {/* Existing Demo Build Info */}
                    {editingGame?.hasDemo ? (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="min-w-0">
                          <span className="text-[11px] font-medium text-emerald-400 block truncate">Build WebGL sẵn sàng</span>
                          <span className="text-[10px] text-zinc-500 block truncate">Chơi thử trên web</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(editingGame.id, "demo")}
                          className="text-[11px] font-medium text-red-400 hover:text-red-300 hover:underline shrink-0 cursor-pointer"
                        >
                          Gỡ bỏ
                        </button>
                      </div>
                    ) : (
                      <div className="py-1 text-[11px] text-zinc-500">
                        Chưa có bản demo
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/[0.06]">
                    <span className="text-[10px] text-zinc-400 block mb-1.5">
                      {editingGame?.hasDemo ? "Tải lên build .zip mới để cập nhật:" : "Chọn tệp .zip từ máy tính:"}
                    </span>
                    <DropzoneFileInput
                      accept=".zip,application/zip"
                      files={newGameAssets.demo}
                      formatHint="ZIP build chứa index.html (Tối đa 3GB)"
                      onSelect={(files) => setNewGameAssets(prev => ({ ...prev, demo: files?.[0] || null }))}
                      onClear={() => setNewGameAssets(prev => ({ ...prev, demo: null }))}
                    />
                  </div>
                </div>

                {/* 4. Installer Package */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.14] transition space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">Gói cài đặt game</span>
                      <span className="text-[10px] text-zinc-500 font-mono">EXE, ZIP (Tối đa 3GB)</span>
                    </div>

                    {/* Existing Installer Info */}
                    {editingGame?.hasFile ? (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="min-w-0">
                          <span className="text-[11px] font-medium text-emerald-400 block truncate">Đã có gói cài đặt</span>
                          <span className="text-[10px] text-zinc-500 block truncate">Google Drive</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(editingGame.id, "installer")}
                          className="text-[11px] font-medium text-red-400 hover:text-red-300 hover:underline shrink-0 cursor-pointer"
                        >
                          Gỡ bỏ
                        </button>
                      </div>
                    ) : (
                      <div className="py-1 text-[11px] text-zinc-500">
                        Chưa có gói cài đặt
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/[0.06]">
                    <span className="text-[10px] text-zinc-400 block mb-1.5">
                      {editingGame?.hasFile ? "Tải lên bộ cài mới để thay thế:" : "Chọn tệp từ máy tính:"}
                    </span>
                    <DropzoneFileInput
                      accept=".zip,.exe,.rar,.7z"
                      files={newGameAssets.installer}
                      formatHint="EXE, ZIP, RAR, 7Z (Tối đa 3GB)"
                      onSelect={(files) => setNewGameAssets(prev => ({ ...prev, installer: files?.[0] || null }))}
                      onClear={() => setNewGameAssets(prev => ({ ...prev, installer: null }))}
                    />
                  </div>
                </div>
              </div>

              {/* 5. Steam-Style Gameplay Screenshots Gallery */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3 pt-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                  <div>
                    <h5 className="text-xs font-semibold text-zinc-200">
                      Bộ sưu tập ảnh Gameplay (Steam Gallery)
                    </h5>
                    <p className="text-[11px] text-zinc-500">
                      Hiển thị trong thanh trình chiếu ảnh khi người chơi xem chi tiết trò chơi. Bấm xem từng ảnh dạng carousel.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/[0.04] self-start sm:self-auto">
                    {editingGame?.screenshots?.length || 0} ảnh hiện có
                  </span>
                </div>

                {/* Existing Screenshots Grid */}
                {editingGame?.screenshots && editingGame.screenshots.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                    {editingGame.screenshots.map((s: any, idx: number) => (
                      <div
                        key={s.id || idx}
                        className="group relative aspect-video rounded-lg overflow-hidden border border-white/[0.08] bg-[#0E131E]"
                      >
                        <img
                          src={resolveImageUrl(s.url)}
                          alt={`Gameplay ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveAsset(editingGame.id, "screenshot", s.id)}
                            className="px-2 py-1 rounded text-[10px] font-medium bg-red-600/90 hover:bg-red-600 text-white cursor-pointer transition shadow-md"
                          >
                            Gỡ ảnh
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new screenshots dropzone */}
                <div className="pt-2">
                  <span className="text-[10px] text-zinc-400 block mb-1.5">
                    Thêm ảnh chụp màn hình gameplay mới (có thể chọn nhiều ảnh cùng lúc):
                  </span>
                  <DropzoneFileInput
                    accept="image/*"
                    multiple={true}
                    files={newGameAssets.screenshots}
                    label="Nhấp hoặc kéo thả nhiều ảnh gameplay vào đây"
                    formatHint="PNG, JPG, WebP"
                    onSelect={(files) => {
                      if (!files) return;
                      const arr = Array.from(files);
                      setNewGameAssets(prev => ({
                        ...prev,
                        screenshots: [...prev.screenshots, ...arr],
                      }));
                    }}
                    onClear={() => setNewGameAssets(prev => ({ ...prev, screenshots: [] }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => { setIsCreating(false); setEditingGame(null); }}
                disabled={isSubmittingGame}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition active:scale-[0.98] cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmittingGame}
                className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 shadow-sm transition active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingGame ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-white" />
                    <span>{submittingProgress || "Đang xử lý..."}</span>
                  </>
                ) : (
                  <span>{isCreating ? "Tạo trò chơi & Tải tài nguyên" : "Lưu thông tin trò chơi"}</span>
                )}
              </button>
            </div>

          </form>
        </Card>
      )}

      {/* Dedicated Asset Upload Manager - macOS Media Inspector */}
      {selectedGameForUpload && (
        <Card className="p-6 bg-[#0E121B] border border-white/[0.08] backdrop-blur-xl shadow-2xl space-y-6 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Quản lý tài nguyên game
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Tải lên và đồng bộ từng tệp lưu trữ trên Google Drive cho tựa game:{" "}
                <span className="font-medium text-white">{selectedGameForUpload.title}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedGameForUpload(null)}
              className="self-start sm:self-auto px-4 py-1.5 rounded-full text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition active:scale-[0.98] cursor-pointer"
            >
              Hoàn tất
            </button>
          </div>

          {/* 4 Separate Asset Upload Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            
            {/* 1. Cover Image */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Ảnh bìa</h4>
                    <p className="text-[11px] text-zinc-500 font-mono">JPG, PNG, WebP</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    selectedGameForUpload.hasCover
                      ? "bg-white/[0.08] text-white/90 border border-white/[0.12]"
                      : "text-zinc-600 bg-white/[0.02] border border-white/[0.04]"
                  }`}>
                    {selectedGameForUpload.hasCover ? "Đã có tệp" : "Chưa có"}
                  </span>
                </div>

                {selectedGameForUpload.hasCover && selectedGameForUpload.coverUrl && (
                  <div className="relative w-full h-28 rounded-lg overflow-hidden border border-white/[0.08] my-2 group">
                    <img
                      src={resolveImageUrl(selectedGameForUpload.coverUrl)}
                      alt="Cover preview"
                      className="size-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveAsset(selectedGameForUpload.id, "cover")}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-300 hover:text-white bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 transition cursor-pointer"
                      >
                        Gỡ bỏ ảnh bìa
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                <DropzoneFileInput
                  accept="image/png,image/jpeg,image/webp"
                  files={assetFiles.image}
                  formatHint="PNG, JPG, WebP"
                  onSelect={(files) => setAssetFiles(prev => ({ ...prev, image: files?.[0] ?? null }))}
                  onClear={() => setAssetFiles(prev => ({ ...prev, image: null }))}
                />
                <button
                  type="button"
                  onClick={() => handleUploadSingleAsset("image")}
                  disabled={uploadingType === "image" || !assetFiles.image}
                  className="w-full py-2 rounded-xl text-xs font-medium text-white bg-white/[0.1] hover:bg-white/[0.15] disabled:opacity-40 disabled:hover:bg-white/[0.1] border border-white/[0.08] transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploadingType === "image" ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Đang tải ảnh lên...</span>
                    </>
                  ) : (
                    <span>Tải lên ảnh bìa</span>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Video Trailer */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Video trailer</h4>
                    <p className="text-[11px] text-zinc-500 font-mono">MP4, WebM</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    selectedGameForUpload.hasTrailer
                      ? "bg-white/[0.08] text-white/90 border border-white/[0.12]"
                      : "text-zinc-600 bg-white/[0.02] border border-white/[0.04]"
                  }`}>
                    {selectedGameForUpload.hasTrailer ? "Đã có tệp" : "Chưa có"}
                  </span>
                </div>

                {selectedGameForUpload.hasTrailer && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] my-2">
                    <span className="text-xs text-zinc-300">
                      Video trailer đã sẵn sàng
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAsset(selectedGameForUpload.id, "trailer")}
                      className="text-xs font-medium text-red-400 hover:text-red-300 px-2 py-1 rounded transition cursor-pointer"
                    >
                      Gỡ bỏ
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                <DropzoneFileInput
                  accept="video/mp4,video/webm"
                  files={assetFiles.trailer}
                  formatHint="MP4, WebM"
                  onSelect={(files) => setAssetFiles(prev => ({ ...prev, trailer: files?.[0] ?? null }))}
                  onClear={() => setAssetFiles(prev => ({ ...prev, trailer: null }))}
                />
                <button
                  type="button"
                  onClick={() => handleUploadSingleAsset("trailer")}
                  disabled={uploadingType === "trailer" || !assetFiles.trailer}
                  className="w-full py-2 rounded-xl text-xs font-medium text-white bg-white/[0.1] hover:bg-white/[0.15] disabled:opacity-40 disabled:hover:bg-white/[0.1] border border-white/[0.08] transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploadingType === "trailer" ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Đang tải video lên...</span>
                    </>
                  ) : (
                    <span>Tải lên trailer</span>
                  )}
                </button>
              </div>
            </div>

            {/* 3. Unity WebGL Demo */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Bản chơi thử WebGL</h4>
                    <p className="text-[11px] text-zinc-500 font-mono">ZIP build WebGL (Unity, Godot, HTML5 — index.html hoặc *.html)</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    selectedGameForUpload.hasDemo
                      ? "bg-white/[0.08] text-white/90 border border-white/[0.12]"
                      : "text-zinc-600 bg-white/[0.02] border border-white/[0.04]"
                  }`}>
                    {selectedGameForUpload.hasDemo ? "Đã có tệp" : "Chưa có"}
                  </span>
                </div>

                {selectedGameForUpload.hasDemo && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] my-2">
                    <span className="text-xs text-zinc-300">
                      WebGL Demo sẵn sàng để chơi thử
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAsset(selectedGameForUpload.id, "demo")}
                      className="text-xs font-medium text-red-400 hover:text-red-300 px-2 py-1 rounded transition cursor-pointer"
                    >
                      Gỡ bỏ
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-zinc-400 mt-1">
                  Hệ thống tự động giải nén file .zip và cấu hình để khách hàng chơi thử ngay trên trình duyệt.
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                <DropzoneFileInput
                  accept=".zip"
                  files={assetFiles.demo}
                  formatHint="ZIP build WebGL (Tối đa 3GB)"
                  onSelect={(files) => setAssetFiles(prev => ({ ...prev, demo: files?.[0] ?? null }))}
                  onClear={() => setAssetFiles(prev => ({ ...prev, demo: null }))}
                />
                <button
                  type="button"
                  onClick={() => handleUploadSingleAsset("demo")}
                  disabled={uploadingType === "demo" || !assetFiles.demo}
                  className="w-full py-2 rounded-xl text-xs font-medium text-white bg-white/[0.1] hover:bg-white/[0.15] disabled:opacity-40 disabled:hover:bg-white/[0.1] border border-white/[0.08] transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploadingType === "demo" ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Đang tải và giải nén demo...</span>
                    </>
                  ) : (
                    <span>Tải lên WebGL demo</span>
                  )}
                </button>
              </div>
            </div>

            {/* 4. Game Installer */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Gói cài đặt game</h4>
                    <p className="text-[11px] text-zinc-500 font-mono">ZIP, EXE, RAR, 7Z, MSI (Tối đa 3GB)</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    selectedGameForUpload.hasFile
                      ? "bg-white/[0.08] text-white/90 border border-white/[0.12]"
                      : "text-zinc-600 bg-white/[0.02] border border-white/[0.04]"
                  }`}>
                    {selectedGameForUpload.hasFile ? "Đã có tệp" : "Chưa có"}
                  </span>
                </div>

                {selectedGameForUpload.hasFile && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] my-2">
                    <span className="text-xs text-zinc-300">
                      Gói cài đặt đã sẵn sàng tải về
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAsset(selectedGameForUpload.id, "installer")}
                      className="text-xs font-medium text-red-400 hover:text-red-300 px-2 py-1 rounded transition cursor-pointer"
                    >
                      Gỡ bỏ
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-zinc-400 mt-1">
                  Khách hàng mua game thành công sẽ được mở khóa tải về tệp này trong Thư viện cá nhân.
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                <DropzoneFileInput
                  accept=".zip,.exe,.rar,.7z,.msi"
                  files={assetFiles.installer}
                  formatHint="EXE, ZIP, RAR, 7Z (Tối đa 3GB)"
                  onSelect={(files) => setAssetFiles(prev => ({ ...prev, installer: files?.[0] ?? null }))}
                  onClear={() => setAssetFiles(prev => ({ ...prev, installer: null }))}
                />
                <button
                  type="button"
                  onClick={() => handleUploadSingleAsset("installer")}
                  disabled={uploadingType === "installer" || !assetFiles.installer}
                  className="w-full py-2 rounded-xl text-xs font-medium text-white bg-white/[0.1] hover:bg-white/[0.15] disabled:opacity-40 disabled:hover:bg-white/[0.1] border border-white/[0.08] transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploadingType === "installer" ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Đang tải file cài đặt...</span>
                    </>
                  ) : (
                    <span>Tải lên gói cài đặt</span>
                  )}
                </button>
              </div>
            </div>

            {/* 5. Gameplay Screenshots (Steam Gallery) */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4 md:col-span-2">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5 mb-3">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">
                      Bộ sưu tập ảnh Gameplay (Steam Gallery)
                    </h4>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      PNG, JPG, WebP - Cho phép tải lên nhiều ảnh gameplay để tạo thanh trượt chuyển ảnh và dải thumbnail như Steam
                    </p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    selectedGameForUpload.screenshots && selectedGameForUpload.screenshots.length > 0
                      ? "bg-white/[0.08] text-white/90 border border-white/[0.12]"
                      : "text-zinc-600 bg-white/[0.02] border border-white/[0.04]"
                  }`}>
                    {selectedGameForUpload.screenshots?.length || 0} ảnh hiện có
                  </span>
                </div>

                {/* Existing Screenshots Grid */}
                {selectedGameForUpload.screenshots && selectedGameForUpload.screenshots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pb-2">
                    {selectedGameForUpload.screenshots.map((s: any, idx: number) => (
                      <div
                        key={s.id || idx}
                        className="group relative aspect-video rounded-lg overflow-hidden border border-white/[0.08] bg-[#0E131E]"
                      >
                        <img
                          src={resolveImageUrl(s.url)}
                          alt={`Gameplay ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveAsset(selectedGameForUpload.id, "screenshot", s.id)}
                            className="px-2 py-1 rounded text-[10px] font-medium bg-red-600/90 hover:bg-red-600 text-white cursor-pointer transition shadow-md"
                          >
                            Gỡ ảnh
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-dashed border-white/[0.06] text-center text-xs text-zinc-500 mb-2">
                    Chưa có ảnh gameplay nào. Hãy chọn nhiều ảnh chụp trò chơi bên dưới để tạo thanh trượt ảnh giống Steam!
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                <DropzoneFileInput
                  accept="image/png,image/jpeg,image/webp"
                  multiple={true}
                  files={assetFiles.screenshots}
                  label="Nhấp hoặc kéo thả nhiều ảnh gameplay vào đây (chọn nhiều ảnh cùng lúc)"
                  formatHint="PNG, JPG, WebP"
                  onSelect={(files) => {
                    if (!files) return;
                    const arr = Array.from(files);
                    setAssetFiles(prev => ({ ...prev, screenshots: [...prev.screenshots, ...arr] }));
                  }}
                  onClear={() => setAssetFiles(prev => ({ ...prev, screenshots: [] }))}
                />
                <button
                  type="button"
                  onClick={handleUploadScreenshots}
                  disabled={uploadingType === "screenshot" || !assetFiles.screenshots || assetFiles.screenshots.length === 0}
                  className="w-full py-2.5 rounded-xl text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 border border-violet-500/30 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/20"
                >
                  {uploadingType === "screenshot" ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Đang tải ảnh gameplay lên...</span>
                    </>
                  ) : (
                    <span>Tải lên {assetFiles.screenshots?.length ? `${assetFiles.screenshots.length} ảnh gameplay đã chọn` : "ảnh gameplay"}</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </Card>
      )}

      {/* Games Table List */}
      {!isCreating && !editingGame && !selectedGameForUpload && (
        <Card className="p-4 sm:p-6 bg-zinc-900/40 border-white/5 backdrop-blur">
          <div className="w-full overflow-x-auto scrollbar-thin pb-2">
            <table className="w-full min-w-[1020px] text-left text-sm text-zinc-400">
              <thead>
                <tr className="border-b border-white/5 text-zinc-500 font-semibold">
                  <th className="py-3 px-3 min-w-[220px]">Tên Trò Chơi</th>
                  <th className="py-3 px-3 whitespace-nowrap">Thể Loại</th>
                  <th className="py-3 px-3 whitespace-nowrap">Giá Bán</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">Lượt Tải</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">Chơi Thử</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">Yêu Thích</th>
                  <th className="py-3 px-3 whitespace-nowrap">Trạng Thái</th>
                  <th className="py-3 px-3 whitespace-nowrap">Tài Nguyên</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap min-w-[140px]">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {games.map((g: any) => (
                  <tr key={g.id} className="hover:text-white transition group">
                    <td className="py-4 px-3 font-semibold text-zinc-200">
                      <div className="flex items-center gap-3">
                        {g.coverUrl ? (
                          <img
                            src={resolveImageUrl(g.coverUrl)}
                            alt={g.title}
                            className="size-12 rounded-lg object-cover border border-white/10 flex-shrink-0"
                          />
                        ) : (
                          <div className="size-12 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center flex-shrink-0">
                            <Gamepad2 className="size-5 text-zinc-600" />
                          </div>
                        )}
                        <div className="min-w-[140px] max-w-[220px]">
                          <span className="font-semibold text-zinc-100 block truncate" title={g.title}>{g.title}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">{g.categoryName || "Chưa phân loại"}</td>
                    <td className="py-4 px-3 font-medium text-violet-300 whitespace-nowrap">{formatPrice(g.price, g.currency)}</td>
                    <td className="py-4 px-2 text-center">{g.downloadCount}</td>
                    <td className="py-4 px-2 text-center">{g.demoPlayCount || 0}</td>
                    <td className="py-4 px-2 text-center">{g.wishlistCount}</td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <select
                        value={g.status || "Draft"}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          try {
                            await api.patch(`/admin/games/${g.id}/status`, { status: newStatus });
                            refetchGames();
                          } catch (err: any) {
                            alert("Lỗi khi cập nhật trạng thái: " + (err?.response?.data?.message || err?.message));
                          }
                        }}
                        className={`text-xs font-medium px-3 py-1 rounded-full border outline-none cursor-pointer transition appearance-none text-center ${
                          g.status === "Published"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:border-emerald-500/40"
                            : g.status === "Draft"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/25 hover:border-amber-500/40"
                            : "bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        <option value="Draft" className="bg-[#18181b] text-amber-300">Bản nháp</option>
                        <option value="Published" className="bg-[#18181b] text-emerald-300">Đã phát hành</option>
                        <option value="Archived" className="bg-[#18181b] text-zinc-400">Lưu trữ</option>
                      </select>
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { label: "Bìa", active: g.hasCover },
                          { label: "Trailer", active: g.hasTrailer },
                          { label: "Demo", active: g.hasDemo },
                          { label: "Bộ cài", active: g.hasFile },
                        ].map((res) => (
                          <span
                            key={res.label}
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors ${
                              res.active
                                ? "bg-white/[0.08] text-white/90 border border-white/[0.12]"
                                : "text-zinc-600 bg-white/[0.02] border border-white/[0.04]"
                            }`}
                          >
                            {res.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-3 text-right whitespace-nowrap min-w-[150px]">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition">
                        {g.status === "Published" ? (
                          <Link href={`/${locale}/game/${g.slug}`} target="_blank">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Xem trang game ngoài Store"
                              className="hover:bg-emerald-500/10 hover:text-emerald-400 p-2"
                            >
                              <ExternalLink className="size-4" />
                            </Button>
                          </Link>
                        ) : (
                          <Button variant="ghost" size="sm" className="p-2 opacity-30 cursor-not-allowed" disabled title="Chỉ xem được khi đã Published">
                            <ExternalLink className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openUploadModal(g)}
                          title="Tải lên tài nguyên (Ảnh bìa, Ảnh gameplay, Demo, Installer)"
                          className="hover:bg-violet-500/10 hover:text-violet-400 p-2"
                        >
                          <Upload className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(g)}
                          title="Chỉnh sửa thông tin"
                          className="hover:bg-violet-500/10 hover:text-violet-400 p-2"
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGame(g.id, g.title)}
                          title="Xóa trò chơi"
                          className="hover:bg-red-500/10 hover:text-red-400 p-2"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================================
   ORDERS TAB
   ============================================================================ */
function OrdersTab() {
  const locale = useLocale();
  const { data: ordersList, isLoading, refetch: refetchOrders } = useQuery({
    queryKey: ["admin-orders-list"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any[]>>("/admin/orders");
      return data.data;
    }
  });

  const [cancelingOrder, setCancelingOrder] = useState<{ id: string; code: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const [deletingOrder, setDeletingOrder] = useState<{ id: string; code: string } | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const [approvingOrder, setApprovingOrder] = useState<{ id: string; code: string } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [submittingApprove, setSubmittingApprove] = useState(false);

  const [rejectingOrder, setRejectingOrder] = useState<{ id: string; code: string } | null>(null);
  const [submittingReject, setSubmittingReject] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "normal" | "cancellation">("all");

  const submitDeleteOrder = async () => {
    if (!deletingOrder) return;
    setSubmittingDelete(true);
    try {
      await api.delete(`/admin/orders/${deletingOrder.id}`);
      alert(locale === "vi" ? "Xóa đơn hàng thành công!" : "Order deleted successfully!");
      setDeletingOrder(null);
      refetchOrders();
    } catch (err: any) {
      console.error("Failed to delete order", err);
      alert(locale === "vi" ? "Xóa đơn hàng thất bại." : "Failed to delete order.");
    } finally {
      setSubmittingDelete(false);
    }
  };

  const submitCancelOrder = async () => {
    if (!cancelingOrder) return;
    setSubmittingCancel(true);
    try {
      await api.post(`/admin/orders/${cancelingOrder.id}/cancel`, null, {
        params: { reason: cancelReason.trim() || undefined }
      });
      alert(locale === "vi" ? "Hủy đơn hàng thành công!" : "Order cancelled successfully!");
      setCancelingOrder(null);
      setCancelReason("");
      refetchOrders();
    } catch (err: any) {
      console.error("Failed to cancel order", err);
      alert(locale === "vi" ? "Hủy đơn hàng thất bại." : "Failed to cancel order.");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const submitApproveCancellation = async () => {
    if (!approvingOrder) return;
    setSubmittingApprove(true);
    try {
      await api.post(`/admin/orders/${approvingOrder.id}/approve-cancellation`, {
        adminNote: adminNote.trim() || undefined
      });
      alert(locale === "vi" ? "Duyệt yêu cầu hủy đơn hàng thành công!" : "Order cancellation approved successfully!");
      setApprovingOrder(null);
      setAdminNote("");
      refetchOrders();
    } catch (err: any) {
      console.error("Failed to approve cancellation", err);
      alert(locale === "vi" ? "Duyệt yêu cầu hủy thất bại." : "Failed to approve cancellation.");
    } finally {
      setSubmittingApprove(false);
    }
  };

  const submitRejectCancellation = async () => {
    if (!rejectingOrder) return;
    setSubmittingReject(true);
    try {
      await api.post(`/admin/orders/${rejectingOrder.id}/reject-cancellation`, {
        adminNote: adminNote.trim() || undefined
      });
      alert(locale === "vi" ? "Từ chối yêu cầu hủy đơn hàng thành công!" : "Order cancellation request rejected successfully!");
      setRejectingOrder(null);
      setAdminNote("");
      refetchOrders();
    } catch (err: any) {
      console.error("Failed to reject cancellation", err);
      alert(locale === "vi" ? "Từ chối yêu cầu hủy thất bại." : "Failed to reject cancellation request.");
    } finally {
      setSubmittingReject(false);
    }
  };

  if (isLoading) return <p className="text-zinc-500">Đang tải danh sách đơn hàng...</p>;

  const orders = ordersList ?? [];

  const filteredOrders = orders.filter((o: any) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "cancellation") return o.status === "CancellationPending";
    if (statusFilter === "normal") return o.status !== "CancellationPending" && o.status !== "CancellationApproved";
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Quản Lý Đơn Hàng</h1>
          <p className="text-sm text-zinc-400 mt-1">Theo dõi toàn bộ đơn hàng, đối soát trạng thái giao dịch và phê duyệt yêu cầu hủy đơn.</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2.5">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              statusFilter === "all"
                ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/20"
                : "bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Tất cả đơn hàng
          </button>
          <button
            onClick={() => setStatusFilter("normal")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              statusFilter === "normal"
                ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/20"
                : "bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Đơn hàng thông thường
          </button>
          <button
            onClick={() => setStatusFilter("cancellation")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-2 cursor-pointer ${
              statusFilter === "cancellation"
                ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/20"
                : "bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Đơn hàng chờ duyệt hủy
            {orders.some((o: any) => o.status === "CancellationPending") && (
              <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-zinc-950 font-bold rounded-full animate-pulse">
                {orders.filter((o: any) => o.status === "CancellationPending").length}
              </span>
            )}
          </button>
        </div>
      </div>

      <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-semibold">
                <th className="py-3 px-2">Mã Đơn Hàng</th>
                <th className="py-3 px-2">Khách Hàng</th>
                <th className="py-3 px-2">Trò Chơi Đã Mua</th>
                <th className="py-3 px-2">Tổng Thanh Toán</th>
                <th className="py-3 px-2">Trạng Thái</th>
                <th className="py-3 px-2">Thời Gian Mua</th>
                <th className="py-3 px-2 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.map((o: any) => {
                const statusColors =
                  o.status === "Paid" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                    o.status === "Pending" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                      o.status === "Cancelled" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        o.status === "CancellationPending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          o.status === "CancellationApproved" ? "bg-teal-500/10 text-teal-400 border-teal-500/20" :
                            "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";

                const getStatusLabel = (status: string) => {
                  if (locale === "vi") {
                    switch (status) {
                      case "Paid": return "Đã thanh toán";
                      case "Pending": return "Chờ thanh toán";
                      case "Cancelled": return "Đã hủy trực tiếp";
                      case "CancellationPending": return "Chờ duyệt hủy";
                      case "CancellationApproved": return "Đã duyệt hủy";
                      default: return status;
                    }
                  } else {
                    switch (status) {
                      case "Paid": return "Paid";
                      case "Pending": return "Pending";
                      case "Cancelled": return "Cancelled";
                      case "CancellationPending": return "Cancellation Pending";
                      case "CancellationApproved": return "Cancellation Approved";
                      default: return status;
                    }
                  }
                };

                return (
                  <tr key={o.id} className="hover:text-white transition">
                    <td className="py-4 font-mono font-semibold text-zinc-200">{o.orderCode}</td>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-300">{o.buyerFullName}</span>
                        <span className="text-xs text-zinc-500">{o.buyerEmail}</span>
                      </div>
                    </td>
                    <td className="py-4 max-w-[280px]">
                      <div className="flex flex-col gap-1">
                        {o.items?.map((item: any, i: number) => (
                          <span key={i} className="text-xs text-zinc-300 truncate" title={item.gameTitle}>
                            • {item.gameTitle}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 font-bold text-violet-300">{formatPrice(o.totalAmount)}</td>
                    <td className="py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColors}`}>
                          {getStatusLabel(o.status)}
                        </span>
                        {o.status === "CancellationPending" && o.cancelReason && (
                          <span className="text-[10px] text-zinc-400 mt-1 max-w-[200px] leading-relaxed break-words font-medium">
                            {locale === "vi" ? "Lý do: " : "Reason: "}{o.cancelReason}
                          </span>
                        )}
                        {o.status === "CancellationApproved" && (
                          <div className="flex flex-col mt-1 max-w-[200px] gap-0.5 text-[10px] leading-relaxed break-words font-medium text-zinc-400">
                            {o.cancelReason && <span>{locale === "vi" ? "Lý do: " : "Reason: "}{o.cancelReason}</span>}
                            {o.adminNote && <span>Ghi chú: {o.adminNote}</span>}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 text-xs text-zinc-500">{formatDateTime(o.createdAt)}</td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {o.status === "CancellationPending" && (
                          <>
                            <button
                              onClick={() => setApprovingOrder({ id: o.id, code: o.orderCode })}
                              className="rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white px-2 py-1 text-xs transition border border-emerald-500/25 font-semibold cursor-pointer"
                            >
                              {locale === "vi" ? "Duyệt hủy" : "Approve"}
                            </button>
                            <button
                              onClick={() => setRejectingOrder({ id: o.id, code: o.orderCode })}
                              className="rounded bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white px-2 py-1 text-xs transition border border-rose-500/25 font-semibold cursor-pointer"
                            >
                              {locale === "vi" ? "Từ chối" : "Reject"}
                            </button>
                          </>
                        )}
                        {(o.status === "Paid" || o.status === "Pending") && (
                          <button
                            onClick={() => setCancelingOrder({ id: o.id, code: o.orderCode })}
                            className="rounded bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-2 py-1 text-xs transition border border-red-500/25 font-semibold cursor-pointer"
                          >
                            {locale === "vi" ? "Hủy đơn" : "Cancel"}
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingOrder({ id: o.id, code: o.orderCode })}
                          className="rounded bg-zinc-800 text-zinc-400 hover:bg-red-600 hover:text-white p-1.5 text-xs transition border border-white/5 cursor-pointer flex items-center justify-center"
                          title={locale === "vi" ? "Xóa vĩnh viễn" : "Delete permanently"}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {cancelingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">
                {locale === "vi" ? `Hủy đơn hàng ${cancelingOrder.code}` : `Cancel Order ${cancelingOrder.code}`}
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {locale === "vi"
                  ? "Các tựa game trong đơn hàng này sẽ bị thu hồi và xóa khỏi thư viện của người mua. Bạn có muốn điền lý do hủy đơn hàng?"
                  : "The purchased games in this order will be revoked and deleted from the buyer's library. Would you like to specify a cancellation reason?"}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                {locale === "vi" ? "Lý do hủy đơn (Tùy chọn)" : "Reason for cancellation (Optional)"}
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={locale === "vi" ? "Nhập lý do hủy..." : "Enter reason..."}
                className="w-full h-24 rounded-lg border border-white/10 bg-zinc-950 px-4 py-2 text-sm text-white outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelingOrder(null);
                  setCancelReason("");
                }}
                disabled={submittingCancel}
                className="text-xs border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                {locale === "vi" ? "Bỏ qua" : "Dismiss"}
              </Button>
              <Button
                onClick={submitCancelOrder}
                disabled={submittingCancel}
                className="text-xs bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-1.5"
              >
                {submittingCancel && <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />}
                {locale === "vi" ? "Hủy đơn hàng" : "Confirm Cancel"}
              </Button>
            </div>
          </Card>
        </div>
      )}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-500" />
                {locale === "vi" ? `Xóa vĩnh viễn đơn hàng ${deletingOrder.code}` : `Delete Permanently Order ${deletingOrder.code}`}
              </h3>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                {locale === "vi"
                  ? "Hành động này sẽ xóa vĩnh viễn lịch sử đơn hàng khỏi hệ thống và thu hồi game khỏi thư viện của người mua. Hành động này KHÔNG thể hoàn tác."
                  : "This action will permanently delete the order history from the system and revoke game access from the buyer's library. This action CANNOT be undone."}
              </p>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeletingOrder(null)}
                className="text-xs border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                disabled={submittingDelete}
              >
                {locale === "vi" ? "Hủy bỏ" : "Cancel"}
              </Button>
              <Button
                onClick={submitDeleteOrder}
                disabled={submittingDelete}
                className="text-xs bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-1.5"
              >
                {submittingDelete && <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />}
                {locale === "vi" ? "Xác nhận xóa" : "Confirm Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}
      {approvingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">
                {locale === "vi" ? `Duyệt yêu cầu hủy đơn ${approvingOrder.code}` : `Approve Cancellation Order ${approvingOrder.code}`}
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {locale === "vi"
                  ? "Hành động này sẽ chấp nhận yêu cầu hủy đơn hàng của khách hàng, hoàn tiền và thu hồi trò chơi khỏi thư viện của họ. Bạn có muốn gửi lời nhắn phản hồi?"
                  : "This action will approve the customer's cancellation request, refund their purchase, and revoke games from their library. Do you want to include a response message?"}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                {locale === "vi" ? "Lời nhắn từ Admin (Tùy chọn)" : "Admin Response Note (Optional)"}
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={locale === "vi" ? "Nhập lời nhắn phản hồi cho khách..." : "Enter reply message for customer..."}
                className="w-full h-24 rounded-lg border border-white/10 bg-zinc-950 px-4 py-2 text-sm text-white outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setApprovingOrder(null);
                  setAdminNote("");
                }}
                disabled={submittingApprove}
                className="text-xs border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                {locale === "vi" ? "Bỏ qua" : "Dismiss"}
              </Button>
              <Button
                onClick={submitApproveCancellation}
                disabled={submittingApprove}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5"
              >
                {submittingApprove && <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />}
                {locale === "vi" ? "Xác nhận duyệt" : "Confirm Approve"}
              </Button>
            </div>
          </Card>
        </div>
      )}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <XCircle className="size-5 text-red-500" />
                {locale === "vi" ? `Từ chối yêu cầu hủy đơn ${rejectingOrder.code}` : `Reject Cancellation Request Order ${rejectingOrder.code}`}
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {locale === "vi"
                  ? "Hành động này sẽ từ chối yêu cầu hủy đơn của khách hàng. Đơn hàng sẽ khôi phục về trạng thái hoạt động bình thường. Bạn có muốn gửi kèm lời nhắn giải thích lý do từ chối?"
                  : "This action will reject the customer's cancellation request. The order status will revert to its active state. Do you want to include an explanation note?"}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                {locale === "vi" ? "Lý do từ chối / Lời nhắn (Tùy chọn)" : "Rejection Reason / Note (Optional)"}
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={locale === "vi" ? "Nhập lời nhắn phản hồi cho khách..." : "Enter reply message for customer..."}
                className="w-full h-24 rounded-lg border border-white/10 bg-zinc-950 px-4 py-2 text-sm text-white outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectingOrder(null);
                  setAdminNote("");
                }}
                disabled={submittingReject}
                className="text-xs border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                {locale === "vi" ? "Bỏ qua" : "Dismiss"}
              </Button>
              <Button
                onClick={submitRejectCancellation}
                disabled={submittingReject}
                className="text-xs bg-red-650 hover:bg-red-600 text-white font-semibold flex items-center gap-1.5"
              >
                {submittingReject && <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />}
                {locale === "vi" ? "Từ chối yêu cầu" : "Confirm Reject"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   USERS TAB
   ============================================================================ */
function UsersTab() {
  const locale = useLocale();
  const { user } = useAuthStore();
  const { data: usersList, isLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any[]>>("/admin/users");
      return data.data;
    }
  });

  const handleToggleActive = async (userId: string, active: boolean, name: string) => {
    const action = active ? "BLOCK" : "UNBLOCK";
    const confirmMsg = locale === "vi"
      ? `Bạn có chắc chắn muốn ${active ? "KHÓA" : "MỞ KHÓA"} tài khoản của ${name}?`
      : `Are you sure you want to ${action} ${name}'s account?`;

    if (!window.confirm(confirmMsg)) return;

    if (user?.id === userId) {
      alert(locale === "vi"
        ? "Không thể tự khóa tài khoản của chính mình!"
        : "Cannot lock your own account!");
      return;
    }

    try {
      await api.post(`/admin/users/${userId}/toggle-active`);
      refetchUsers();
      alert(locale === "vi" ? "Thay đổi trạng thái tài khoản thành công!" : "Account status toggled!");
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    const confirmMsg = locale === "vi"
      ? `HÀNH ĐỘNG NÀY SẼ XÓA VĨNH VIỄN người dùng ${name} và toàn bộ lịch sử chơi, đơn hàng, hóa đơn liên quan! Bạn có thực sự muốn xóa?`
      : `THIS ACTION WILL PERMANENTLY DELETE user ${name} and all associated orders, invoices, and play history! Are you sure?`;

    if (!window.confirm(confirmMsg)) return;

    if (user?.id === userId) {
      alert(locale === "vi"
        ? "Không thể tự xóa tài khoản của chính mình!"
        : "Cannot delete your own account!");
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      refetchUsers();
      alert(locale === "vi" ? "Xóa người dùng thành công!" : "User deleted successfully!");
    } catch (error) {
      console.error(error);
      alert(locale === "vi" ? "Xóa người dùng thất bại!" : "Failed to delete user!");
    }
  };

  if (isLoading) return <p className="text-zinc-500">Đang tải danh sách người dùng...</p>;

  const users = usersList ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Quản Lý Người Dùng</h1>
        <p className="text-sm text-zinc-400 mt-1">Quản lý danh sách thành viên, phân quyền và kiểm soát khóa tài khoản vi phạm.</p>
      </div>

      <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-semibold">
                <th className="py-3 px-2">Họ và Tên</th>
                <th className="py-3 px-2">Email</th>
                <th className="py-3 px-2">Ngày Sinh</th>
                <th className="py-3 px-2">Vai Trò</th>
                <th className="py-3 px-2">Ngày Tham Gia</th>
                <th className="py-3 px-2">Trạng Thái</th>
                <th className="py-3 px-2 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u: any) => {
                const badgeColor = u.isActive
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20";

                return (
                  <tr key={u.id} className="hover:text-white transition">
                    <td className="py-4 px-2 font-semibold text-zinc-200">{u.fullName}</td>
                    <td className="py-4 px-2 font-mono text-zinc-300 select-all">{u.email}</td>
                    <td className="py-4 px-2 text-sm text-zinc-300">
                      {u.dateOfBirth ? (() => {
                        const p = u.dateOfBirth.split("T")[0].split("-");
                        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : u.dateOfBirth;
                      })() : "—"}
                    </td>
                    <td className="py-4 px-2 text-xs font-mono text-zinc-400">{u.roles.join(", ")}</td>
                    <td className="py-4 px-2 text-xs text-zinc-500">{formatDate(u.createdAt)}</td>
                    <td className="py-4 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                        {u.isActive ? "Hoạt động" : "Đã khóa"}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(u.id, u.isActive, u.fullName)}
                        className={`p-2 transition ${u.isActive ? "hover:bg-red-500/10 hover:text-red-400" : "hover:bg-green-500/10 hover:text-green-400"}`}
                        title={u.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                      >
                        {u.isActive ? (
                          <div className="flex items-center gap-1 text-red-400 text-xs">
                            <ToggleLeft className="size-5" />
                            Khóa
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-400 text-xs">
                            <ToggleRight className="size-5" />
                            Mở khóa
                          </div>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(u.id, u.fullName)}
                        className="p-2 transition hover:bg-red-500/20 text-red-500 hover:text-red-400"
                        title="Xóa người dùng"
                      >
                        <div className="flex items-center gap-1 text-xs">
                          <Trash2 className="size-4" />
                          Xóa
                        </div>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================================
   REVENUE TAB
   ============================================================================ */
function RevenueTab() {
  const locale = useLocale();
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ["admin-revenue-details"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>("/admin/revenue");
      return data.data;
    }
  });

  if (isLoading) return <p className="text-zinc-500">Đang tải dữ liệu doanh thu...</p>;

  const r = revenueData ?? { totalRevenue: 0, dailyRevenue: [], monthlyRevenue: [], gameRevenue: [] };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Kiểm Toán &amp; Doanh Thu</h1>
        <p className="text-sm text-zinc-400 mt-1">Xem xét chi tiết các nguồn thu, doanh số bán game theo ngày, theo tháng và theo từng tựa game.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Metric Card */}
        <Card className="p-6 bg-zinc-900/40 border-violet-500/20 backdrop-blur md:col-span-3 flex justify-between items-center h-24">
          <span className="text-zinc-400 text-sm font-semibold uppercase tracking-wider">
            Tổng Doanh Thu Hợp Lệ
          </span>
          <span className="text-4xl font-extrabold text-violet-300">{formatPrice(r.totalRevenue)}</span>
        </Card>

        {/* Daily Breakdown */}
        <Card className="p-5 bg-zinc-900/40 border-white/5 backdrop-blur">
          <h3 className="text-md font-bold text-zinc-200 mb-4">Doanh thu theo ngày</h3>
          <div className="max-h-80 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {r.dailyRevenue.length === 0 ? (
              <p className="text-zinc-500 text-xs text-center py-4">Chưa có dữ liệu ngày</p>
            ) : (
              r.dailyRevenue.map((pt: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-xs py-1">
                  <span className="font-mono text-zinc-400">{pt.time}</span>
                  <span className="font-bold text-zinc-200">{formatPrice(pt.amount)}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Monthly Breakdown */}
        <Card className="p-5 bg-zinc-900/40 border-white/5 backdrop-blur">
          <h3 className="text-md font-bold text-zinc-200 mb-4">Doanh thu theo tháng</h3>
          <div className="max-h-80 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {r.monthlyRevenue.length === 0 ? (
              <p className="text-zinc-500 text-xs text-center py-4">Chưa có dữ liệu tháng</p>
            ) : (
              r.monthlyRevenue.map((pt: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-xs py-1">
                  <span className="font-mono text-zinc-400">{pt.time}</span>
                  <span className="font-bold text-zinc-200">{formatPrice(pt.amount)}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Game Specific Earnings */}
        <Card className="p-5 bg-zinc-900/40 border-white/5 backdrop-blur">
          <h3 className="text-md font-bold text-zinc-200 mb-4">Doanh thu theo từng game</h3>
          <div className="max-h-80 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {r.gameRevenue.length === 0 ? (
              <p className="text-zinc-500 text-xs text-center py-4">Chưa có dữ liệu game</p>
            ) : (
              r.gameRevenue.map((pt: any, i: number) => (
                <div key={i} className="flex justify-between items-start gap-4 text-xs py-1">
                  <span className="text-zinc-400 font-medium truncate flex-1" title={pt.gameTitle}>
                    {pt.gameTitle}
                  </span>
                  <span className="font-bold text-zinc-200 shrink-0">{formatPrice(pt.amount)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================================
   ANALYTICS & BUSINESS INTELLIGENCE TAB
   ============================================================================ */
function AnalyticsTab() {
  const locale = useLocale();
  const [trendTab, setTrendTab] = useState<"daily" | "weekly" | "monthly">("daily");
  
  // Date Filtering State
  const [range, setRange] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [filterDates, setFilterDates] = useState({ startDate: "", endDate: "" });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin-analytics-details", range, filterDates],
    queryFn: async () => {
      const params: Record<string, string> = { range };
      if (range === "custom" && filterDates.startDate && filterDates.endDate) {
        // format local input date to ISO string
        params.startDate = new Date(filterDates.startDate).toISOString();
        params.endDate = new Date(filterDates.endDate).toISOString();
      }
      const { data } = await api.get<ApiResponse<any>>("/admin/analytics", { params });
      return data.data;
    }
  });

  // Automatically update trendTab resolution based on range selection
  useEffect(() => {
    if (range === "today" || range === "week" || range === "month") {
      setTrendTab("daily");
    } else if (range === "year") {
      setTrendTab("monthly");
    }
  }, [range]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  const a = analytics ?? {
    selectedPeriod: { revenue: 0, orders: 0, downloads: 0, registrations: 0, demoPlays: 0 },
    previousPeriod: { revenue: 0, orders: 0, downloads: 0, registrations: 0, demoPlays: 0 },
    dailyTrend: [],
    weeklyTrend: [],
    monthlyTrend: [],
    topDownloadedGames: [],
    topDemoPlayedGames: [],
    gameConversions: [],
    userStats: [],
    gameStats: []
  };

  const trendData = trendTab === "daily" ? a.dailyTrend : trendTab === "weekly" ? a.weeklyTrend : a.monthlyTrend;

  const maxRevenue = Math.max(...trendData.map((d: any) => d.revenue), 1);
  const maxDownloads = Math.max(...trendData.map((d: any) => d.downloads), 1);
  const maxPlays = Math.max(...trendData.map((d: any) => d.demoPlays), 1);

  // Compute growth / trend percentage compared to previous period
  const calcGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const pct = ((current - previous) / previous) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
  };

  const isGrowthPositive = (current: number, previous: number) => {
    return current >= previous;
  };

  const revenueGrowth = calcGrowth(Number(a.selectedPeriod.revenue), Number(a.previousPeriod.revenue));
  const downloadsGrowth = calcGrowth(a.selectedPeriod.downloads, a.previousPeriod.downloads);
  const demoPlaysGrowth = calcGrowth(a.selectedPeriod.demoPlays, a.previousPeriod.demoPlays);

  return (
    <div className="space-y-8">
      {/* HEADER SECTION WITH FILTER */}
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">
            Thống Kê Chi Tiết &amp; Phân Tích
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Phân tích doanh thu, lượt tải, lượt chơi thử WebGL và hành vi khách hàng theo khoảng thời gian.
          </p>
        </div>

        {/* Date Filters Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-zinc-950 p-1 border border-white/5 text-xs">
            {["today", "week", "month", "year", "custom"].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRange(r);
                  if (r !== "custom") {
                    setFilterDates({ startDate: "", endDate: "" });
                  }
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer font-bold text-xs uppercase tracking-wider ${
                  range === r ? "bg-violet-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {r === "today" ? "Hôm nay" :
                 r === "week" ? "Tuần này" :
                 r === "month" ? "Tháng này" :
                 r === "year" ? "Năm nay" :
                 "Tự chọn"}
              </button>
            ))}
          </div>

          {range === "custom" && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right duration-200">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 outline-none focus:border-violet-500"
              />
              <span className="text-zinc-500 text-xs">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 outline-none focus:border-violet-500"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (customStart && customEnd) {
                    setFilterDates({ startDate: customStart, endDate: customEnd });
                  } else {
                    alert(locale === "vi" ? "Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc!" : "Please select both start and end dates!");
                  }
                }}
                className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs px-3.5 py-1.5 h-auto rounded-lg transition"
              >
                {locale === "vi" ? "Lọc" : "Filter"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Doanh Thu Card */}
        <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur rounded-2xl relative overflow-hidden flex flex-col justify-between h-40 shadow-xl">
          <div className="flex justify-between items-start">
            <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">{locale === "vi" ? "Doanh Thu" : "Revenue"}</span>
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold">VND</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[26px] font-black text-emerald-400 tracking-tight">{formatPrice(a.selectedPeriod.revenue)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                isGrowthPositive(Number(a.selectedPeriod.revenue), Number(a.previousPeriod.revenue))
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}>
                {revenueGrowth}
              </span>
              <span className="text-zinc-500 text-[10px]">
                {locale === "vi" ? "so với kỳ trước" : "vs previous period"}
              </span>
            </div>
          </div>
        </Card>

        {/* Lượt Tải Card */}
        <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur rounded-2xl relative overflow-hidden flex flex-col justify-between h-40 shadow-xl">
          <div className="flex justify-between items-start">
            <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">{locale === "vi" ? "Lượt Tải Game" : "Game Downloads"}</span>
            <span className="p-2 bg-white/5 text-zinc-400 rounded-lg"><Download className="size-4" /></span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[26px] font-black text-white tracking-tight">{a.selectedPeriod.downloads.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                isGrowthPositive(a.selectedPeriod.downloads, a.previousPeriod.downloads)
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}>
                {downloadsGrowth}
              </span>
              <span className="text-zinc-500 text-[10px]">
                {locale === "vi" ? "so với kỳ trước" : "vs previous period"}
              </span>
            </div>
          </div>
        </Card>

        {/* Lượt Chơi Thử Card */}
        <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur rounded-2xl relative overflow-hidden flex flex-col justify-between h-40 shadow-xl">
          <div className="flex justify-between items-start">
            <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">{locale === "vi" ? "Lượt Chơi Thử Demo" : "WebGL Demo Plays"}</span>
            <span className="p-2 bg-white/5 text-zinc-400 rounded-lg"><Gamepad2 className="size-4" /></span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[26px] font-black text-white tracking-tight">{a.selectedPeriod.demoPlays.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                isGrowthPositive(a.selectedPeriod.demoPlays, a.previousPeriod.demoPlays)
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}>
                {demoPlaysGrowth}
              </span>
              <span className="text-zinc-500 text-[10px]">
                {locale === "vi" ? "so với kỳ trước" : "vs previous period"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Trend Analysis Section */}
      <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur rounded-2xl shadow-xl">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-zinc-200">{locale === "vi" ? "Phân tích xu hướng kinh doanh" : "Trend Analysis"}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{locale === "vi" ? "Báo cáo chi tiết biểu diễn sự phát triển của hệ thống qua thời gian." : "Historical breakdown of metrics over time."}</p>
          </div>
          <div className="flex rounded-xl bg-zinc-950 p-1 border border-white/5 text-xs">
            <button 
              onClick={() => setTrendTab("daily")} 
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${trendTab === "daily" ? "bg-violet-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {locale === "vi" ? "30 Ngày" : "30 Days"}
            </button>
            <button 
              onClick={() => setTrendTab("weekly")} 
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${trendTab === "weekly" ? "bg-violet-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {locale === "vi" ? "12 Tuần" : "12 Weeks"}
            </button>
            <button 
              onClick={() => setTrendTab("monthly")} 
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${trendTab === "monthly" ? "bg-violet-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {locale === "vi" ? "12 Tháng" : "12 Months"}
            </button>
          </div>
        </div>

        {/* Detailed Timeline Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-400">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-2">{locale === "vi" ? "Thời gian" : "Time period"}</th>
                <th className="py-3 px-2 text-right">{locale === "vi" ? "Doanh thu" : "Revenue"}</th>
                <th className="py-3 px-2 text-right">{locale === "vi" ? "Lượt tải" : "Downloads"}</th>
                <th className="py-3 px-2 text-right">{locale === "vi" ? "Chơi thử" : "Demo Plays"}</th>
                <th className="py-3 px-2 text-right">{locale === "vi" ? "Đăng ký mới" : "Registrations"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {trendData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-600 italic">
                    {locale === "vi" ? "Không có dữ liệu xu hướng trong khoảng thời gian này" : "No trend data available for this range"}
                  </td>
                </tr>
              ) : (
                trendData.slice(0, 15).map((pt: any, i: number) => {
                  const revPct = Math.min((pt.revenue / maxRevenue) * 100, 100);
                  const dlPct = Math.min((pt.downloads / maxDownloads) * 100, 100);
                  const playPct = Math.min((pt.demoPlays / maxPlays) * 100, 100);

                  return (
                    <tr key={i} className="hover:bg-white/2 hover:text-white transition">
                      <td className="py-3 px-2 font-mono text-zinc-300">{pt.time}</td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-zinc-200 font-bold">{formatPrice(pt.amount || pt.revenue)}</span>
                          <div className="w-20 h-1 bg-zinc-850 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${revPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-zinc-300">{pt.downloads}</span>
                          <div className="w-16 h-1 bg-zinc-850 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${dlPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-zinc-300">{pt.demoPlays}</span>
                          <div className="w-16 h-1 bg-zinc-850 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500 rounded-full" style={{ width: `${playPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right text-zinc-300 font-bold">{pt.registrations}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Top Performing & User Engagement grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Downloaded Games */}
        <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Download className="size-4.5 text-violet-400" />
              {locale === "vi" ? "Top Trò Chơi Tải Nhiều Nhất" : "Top Downloaded Games"}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">{locale === "vi" ? "Các sản phẩm được người dùng tải về nhiều nhất." : "Games with the highest counts of acquisition."}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-400">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500 font-semibold uppercase">
                    <th className="py-2">Game</th>
                    <th className="py-2 text-right">{locale === "vi" ? "Lượt Tải" : "Downloads"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {a.topDownloadedGames.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-zinc-500 italic">{locale === "vi" ? "Chưa có dữ liệu" : "No data"}</td>
                    </tr>
                  ) : (
                    a.topDownloadedGames.slice(0, 8).map((g: any, index: number) => (
                      <tr key={g.gameId || index} className="hover:text-white transition">
                        <td className="py-2.5 font-bold text-zinc-200">
                          <span className="inline-block w-4 text-zinc-500">{index + 1}.</span> {g.title}
                        </td>
                        <td className="py-2.5 text-right font-mono text-violet-300 font-bold">{g.downloadCount.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Top Played WebGL Demos */}
        <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Gamepad2 className="size-4.5 text-pink-400" />
              {locale === "vi" ? "Top Demo Chơi Thử Nhiều Nhất" : "Top Played Demos (WebGL)"}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">{locale === "vi" ? "Thống kê lượt chơi thử bản web kèm thời gian chơi trung bình." : "WebGL demo play statistics with average play times."}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-400">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500 font-semibold uppercase">
                    <th className="py-2">Game</th>
                    <th className="py-2 text-center">{locale === "vi" ? "Lượt Chơi" : "Plays"}</th>
                    <th className="py-2 text-right">{locale === "vi" ? "TG Chơi TB" : "Avg Time"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {a.topDemoPlayedGames.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-zinc-500 italic">{locale === "vi" ? "Chưa có dữ liệu" : "No data"}</td>
                    </tr>
                  ) : (
                    a.topDemoPlayedGames.slice(0, 8).map((g: any, index: number) => {
                      const mins = Math.floor(g.averagePlayTimeSeconds / 60);
                      const secs = g.averagePlayTimeSeconds % 60;
                      const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

                      return (
                        <tr key={g.gameId || index} className="hover:text-white transition">
                          <td className="py-2.5 font-bold text-zinc-200">
                            <span className="inline-block w-4 text-zinc-500">{index + 1}.</span> {g.title}
                          </td>
                          <td className="py-2.5 text-center font-mono text-zinc-300 font-bold">{g.demoPlayCount.toLocaleString()}</td>
                          <td className="py-2.5 text-right font-mono text-pink-300 font-bold">{timeStr}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>

      {/* Conversion Rate Funnels */}
      <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur rounded-2xl shadow-xl">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Clock className="size-4.5 text-indigo-400" />
          {locale === "vi" ? "Tỷ Lệ Chuyển Đổi Nhu Cầu & Mua Game" : "Customer Needs & Conversion Analysis"}
        </h3>
        <p className="text-xs text-zinc-500 mb-6">
          {locale === "vi" 
            ? "Đo lường tỷ lệ người dùng chuyển đổi từ Chơi Thử bản Demo -> Mua game, và Thêm Yêu Thích -> Mua game thực tế." 
            : "Measure conversion funnels of players trying WebGL demos then purchasing, or wishlisting games then checking out."}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-400">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-semibold uppercase">
                <th className="py-3 px-2">Game</th>
                <th className="py-3 px-2 text-center">{locale === "vi" ? "Chơi thử -> Mua" : "Demo to Purchase"}</th>
                <th className="py-3 px-2 text-center">{locale === "vi" ? "Wishlist -> Mua" : "Wishlist to Purchase"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {a.gameConversions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-zinc-500 italic">
                    {locale === "vi" ? "Chưa ghi nhận dữ liệu chuyển đổi" : "No conversions tracked yet"}
                  </td>
                </tr>
              ) : (
                a.gameConversions.slice(0, 10).map((g: any, index: number) => {
                  return (
                    <tr key={g.gameId || index} className="hover:bg-white/2 hover:text-white transition">
                      <td className="py-3.5 px-2 font-bold text-zinc-200">{g.title}</td>
                      <td className="py-3.5 px-2">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="text-violet-300 font-mono font-bold text-xs">{g.playToPurchaseRate}%</span>
                          <div className="w-28 h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-600 rounded-full" style={{ width: `${g.playToPurchaseRate}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="text-rose-300 font-mono font-bold text-xs">{g.wishlistToPurchaseRate}%</span>
                          <div className="w-28 h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-600 rounded-full" style={{ width: `${g.wishlistToPurchaseRate}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DETAILED GAMES REPORT */}
      <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur rounded-2xl shadow-xl">
        <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Gamepad2 className="size-4.5 text-violet-400" />
              {locale === "vi" ? "Bảng Phân Tích Chi Tiết Hiệu Suất Trò Chơi" : "Detailed Games Performance Breakdown"}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              {locale === "vi" 
                ? "Số liệu chi tiết về doanh thu, lượt tải, lượt chơi thử demo, số lượng yêu thích và tỷ lệ chuyển đổi của từng game." 
                : "Detailed records on revenue, downloads, demo plays, wishlist additions, and purchase conversions per game."}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-400">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-semibold uppercase">
                <th className="py-3 px-2">{locale === "vi" ? "Tựa Game" : "Game Title"}</th>
                <th className="py-3 px-2 text-right">{locale === "vi" ? "Giá gốc" : "Base Price"}</th>
                <th className="py-3 px-2 text-center">{locale === "vi" ? "Trạng thái" : "Status"}</th>
                <th className="py-3 px-2 text-right">{locale === "vi" ? "Lượt tải" : "Downloads"}</th>
                <th className="py-3 px-2 text-right">{locale === "vi" ? "Lượt chơi thử" : "Demo Plays"}</th>
                <th className="py-3 px-2 text-right">{locale === "vi" ? "Yêu thích" : "Wishlist"}</th>
                <th className="py-3 px-2 text-right">{locale === "vi" ? "Doanh Thu" : "Total Revenue"}</th>
                <th className="py-3 px-2 text-center">{locale === "vi" ? "Chuyển Đổi Chơi thử -> Mua" : "Demo to Purchase"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {a.gameStats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-zinc-500 italic">
                    {locale === "vi" ? "Chưa có dữ liệu trò chơi" : "No game data available"}
                  </td>
                </tr>
              ) : (
                a.gameStats.map((g: any, index: number) => {
                  return (
                    <tr key={g.id || index} className="hover:bg-white/2 hover:text-white transition">
                      <td className="py-3 px-2 font-bold text-zinc-200">{g.title}</td>
                      <td className="py-3 px-2 text-right font-mono text-zinc-300">{formatPrice(g.price)}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          g.status === "Published" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          g.status === "Draft" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                          "bg-zinc-850 text-zinc-400 border-zinc-700"
                        }`}>
                          {g.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono">{g.downloads.toLocaleString()}</td>
                      <td className="py-3 px-2 text-right font-mono text-zinc-300">{g.demoPlays.toLocaleString()}</td>
                      <td className="py-3 px-2 text-right font-mono text-zinc-350">{g.wishlistCount.toLocaleString()}</td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-emerald-400">{formatPrice(g.totalRevenue)}</td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="text-violet-300 font-mono font-bold text-[11px]">{g.demoToPurchaseRate}%</span>
                          <div className="w-24 h-1 bg-zinc-950 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-600 rounded-full" style={{ width: `${g.demoToPurchaseRate}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DETAILED USERS REPORT */}
      <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur rounded-2xl shadow-xl">
        <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UsersIcon className="size-4.5 text-indigo-400" />
              {locale === "vi" ? "Bảng Phân Tích Phân Khúc Người Dùng" : "User Segments & Demographics Breakdown"}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              {locale === "vi" 
                ? "Danh sách khách hàng, phân hạng người dùng, số lượng game đã mua, tổng chi tiêu và số lượt chơi thử để phân tích nhu cầu." 
                : "Registered users details, segments, games purchased, total amount spent, and demo play counts for behavior analysis."}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-400">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-semibold uppercase">
                <th className="py-3 px-2">{locale === "vi" ? "Họ và Tên" : "Full Name"}</th>
                <th className="py-3 px-2">{locale === "vi" ? "Email" : "Email"}</th>
                <th className="py-3 px-2">{locale === "vi" ? "Ngày Đăng Ký" : "Date Joined"}</th>
                <th className="py-3 px-2 text-center">{locale === "vi" ? "Phân Khúc" : "Segment"}</th>
                <th className="py-3 px-2 text-right">{locale === "vi" ? "Game Đã Mua" : "Games Purchased"}</th>
                <th className="py-3 px-2 text-right">{locale === "vi" ? "Chơi Thử Demo" : "Demo Plays"}</th>
                <th className="py-3 px-2 text-right">{locale === "vi" ? "Tổng Chi Tiêu" : "Total Spent"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {a.userStats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-zinc-500 italic">
                    {locale === "vi" ? "Chưa có dữ liệu người dùng" : "No user data available"}
                  </td>
                </tr>
              ) : (
                a.userStats.map((u: any, index: number) => {
                  const segmentColors = 
                    u.customerSegment === "VIP" ? "bg-violet-600/10 text-violet-400 border-violet-500/20" :
                    u.customerSegment.includes("Active") || u.customerSegment.includes("Mua Hàng") || u.customerSegment.includes("Đang mua") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    u.customerSegment.includes("Trial") || u.customerSegment.includes("Chơi Thử") || u.customerSegment.includes("Chơi thử") ? "bg-pink-500/10 text-pink-400 border-pink-500/20" :
                    "bg-zinc-850 text-zinc-400 border-zinc-700";

                  const formatSegmentLabel = (seg: string) => {
                    if (!seg) return "";
                    if (seg === "VIP") return "VIP";
                    if (seg.includes("Active") || seg.includes("Mua Hàng") || seg.includes("Đang mua")) {
                      return locale === "vi" ? "ĐANG MUA" : "ACTIVE";
                    }
                    if (seg.includes("Trial") || seg.includes("Chơi Thử") || seg.includes("Chơi thử")) {
                      return locale === "vi" ? "CHƠI THỬ" : "TRIAL";
                    }
                    return locale === "vi" ? "MỚI" : "NEW";
                  };

                  return (
                    <tr key={u.id || index} className="hover:bg-white/2 hover:text-white transition">
                      <td className="py-3 px-2 font-bold text-zinc-200">{u.fullName}</td>
                      <td className="py-3 px-2 font-mono text-zinc-400 select-all">{u.email}</td>
                      <td className="py-3 px-2 text-zinc-400">{formatDate(u.createdAt)}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${segmentColors}`}>
                          {formatSegmentLabel(u.customerSegment)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-zinc-300">{u.gamesPurchased}</td>
                      <td className="py-3 px-2 text-right font-mono text-zinc-300">{u.demoPlays}</td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-emerald-400">{formatPrice(u.totalSpent)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================================
   HELP GUIDE TAB
   ============================================================================ */
function HelpTab() {
  const locale = useLocale();

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          {locale === "vi" ? "Trung Tâm Hướng Dẫn & Vận Hành GameVault" : "GameVault Operations & Help Center"}
        </h1>
        <p className="text-sm text-zinc-400 mt-1 max-w-3xl">
          {locale === "vi"
            ? "Tài liệu hướng dẫn quản trị chi tiết dành cho Quản trị viên: quy trình phát hành game, cơ chế định danh URL (Slug), quản lý gói tài nguyên, duyệt đơn hàng hoàn tiền và bảo mật hệ thống."
            : "Complete administrative documentation: game publishing lifecycle, SEO Slug mechanics, asset package management, order refunds, and platform security."}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Game Publishing Lifecycle */}
        <Card className="p-6 bg-zinc-900/60 border border-white/10 rounded-2xl shadow-xl backdrop-blur space-y-4">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="size-5 text-zinc-400" />
            <h3 className="text-base font-bold text-white">
              {locale === "vi" ? "1. Quy trình 4 bước đăng tải & phát hành trò chơi" : "1. 4-Step Game Publishing Lifecycle"}
            </h3>
          </div>
          <ol className="space-y-3.5 text-xs text-zinc-300 list-decimal pl-4 leading-relaxed">
            <li>
              <span className="font-semibold text-white">
                {locale === "vi" ? "Tạo bản ghi game & Dịch tự động bằng AI:" : "Create entry & AI Auto-Translate:"}
              </span>{" "}
              {locale === "vi"
                ? "Bấm nút \"Thêm game mới\". Nhập tên game, nhà phát triển, giá bán và mô tả chi tiết bằng Tiếng Việt. Sau đó bấm nút \"Dịch tự động sang EN & ZH\", AI sẽ lập tức dịch chính xác sang tiếng Anh và tiếng Trung vào đúng các ô ngôn ngữ tương ứng, đồng thời tự động chuẩn hóa đường dẫn Slug."
                : "Click \"Add Game\". Fill in Vietnamese title, dev, price and description, then click \"AI Auto-Translate to EN & ZH\" to populate English and Chinese fields accurately and generate the Slug."}
            </li>
            <li>
              <span className="font-semibold text-white">
                {locale === "vi" ? "Tải lên Ảnh bìa đại diện & Video Trailer:" : "Upload Cover Art & Trailer Video:"}
              </span>{" "}
              {locale === "vi"
                ? "Trong danh sách game, bấm nút biểu tượng Đám mây (Tải tệp lên). Chọn Cover Image để đăng ảnh đại diện chính (tỉ lệ khuyến nghị 16:9), và Trailer Video (.mp4 / .webm) để khách hàng xem video xem trước mượt mà ngoài gian hàng."
                : "In the game table, click the Upload icon. Choose Cover Image for the store thumbnail and Trailer Video (.mp4/.webm) for storefront video previews."}
            </li>
            <li>
              <span className="font-semibold text-white">
                {locale === "vi" ? "Tải file WebGL Demo & Gói cài đặt Installer:" : "Upload WebGL Demo & Installer:"}
              </span>{" "}
              {locale === "vi"
                ? "Chọn WebGL Demo (.zip) để tải lên bản chơi thử trực tiếp trên web (hệ thống tự động giải nén). Chọn Installer (.zip, .exe) cho bản cài đặt đầy đủ mà khách hàng sẽ nhận được sau khi thanh toán thành công."
                : "Upload WebGL Demo (.zip) for in-browser instant play. Upload Installer (.zip, .exe) for full downloads after purchase."}
            </li>
            <li>
              <span className="font-semibold text-white">
                {locale === "vi" ? "Chuyển trạng thái sang Công khai (Published):" : "Publish to Storefront:"}
              </span>{" "}
              {locale === "vi"
                ? "Khi đã kiểm tra đầy đủ hình ảnh, video và file tải về, chuyển trạng thái từ \"Draft\" (Bản nháp) sang \"Published\" (Công khai). Game sẽ xuất hiện ngay lập tức trên trang chủ và sẵn sàng để khách thanh toán VietQR."
                : "Once media and builds are verified, switch status from \"Draft\" to \"Published\". The game will be immediately purchasable via VietQR."}
            </li>
          </ol>
        </Card>

        {/* Card 2: 4 Media Asset Types */}
        <Card className="p-6 bg-zinc-900/60 border border-white/10 rounded-2xl shadow-xl backdrop-blur space-y-4">
          <div className="flex items-center gap-2.5">
            <Package className="size-5 text-zinc-400" />
            <h3 className="text-base font-bold text-white">
              {locale === "vi" ? "2. Quản lý 4 loại tệp tài nguyên (Media Assets)" : "2. Managing the 4 Media Asset Types"}
            </h3>
          </div>
          <div className="space-y-2.5 text-xs text-zinc-300 leading-relaxed">
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/5">
              <span className="font-semibold text-white block mb-0.5">{locale === "vi" ? "1. Ảnh Bìa (Cover Image):" : "1. Cover Image:"}</span>
              <p className="text-zinc-400">{locale === "vi" ? "Định dạng JPG, PNG, WEBP (tối ưu dưới 5MB). Dùng làm poster chính ngoài trang chủ và banner chi tiết game." : "JPG, PNG, WEBP (under 5MB). Main storefront poster and header banner."}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/5">
              <span className="font-semibold text-white block mb-0.5">{locale === "vi" ? "2. Video Trailer:" : "2. Video Trailer:"}</span>
              <p className="text-zinc-400">{locale === "vi" ? "Định dạng MP4, WEBM. Video trailer xem trước tự động kích hoạt khi khách hàng rê chuột vào game card ngoài gian hàng." : "MP4, WEBM. Auto-plays interactive gameplay preview on card hover."}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/5">
              <span className="font-semibold text-white block mb-0.5">{locale === "vi" ? "3. WebGL Demo (.zip):" : "3. WebGL Demo (.zip):"}</span>
              <p className="text-zinc-400">{locale === "vi" ? "Tệp nén .zip chứa sản phẩm xuất WebGL đa engine (Unity, Godot, HTML5 — index.html hoặc *.html). Hệ thống tự giải nén để người chơi click 'Chơi thử ngay' trên trình duyệt mà không cần cài đặt." : "ZIP package containing multi-engine WebGL build (Unity, Godot, HTML5 — index.html or *.html). System unzips automatically for instant browser demo plays."}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/5">
              <span className="font-semibold text-white block mb-0.5">{locale === "vi" ? "4. Gói Cài Đặt Game (Installer):" : "4. Game Installer:"}</span>
              <p className="text-zinc-400">{locale === "vi" ? "File cài đặt thực tế (.zip, .exe, .dmg). Được lưu trữ bảo mật và chỉ cấp quyền tải về cho khách hàng đã mua game thành công." : "Full game build (.zip, .exe, .dmg). Protected and strictly accessible to paying customers in their Library."}</p>
            </div>
          </div>
        </Card>

        {/* Card 3: Orders & Refund Flow */}
        <Card className="p-6 bg-zinc-900/60 border border-white/10 rounded-2xl shadow-xl backdrop-blur space-y-4">
          <div className="flex items-center gap-2.5">
            <CreditCard className="size-5 text-zinc-400" />
            <h3 className="text-base font-bold text-white">
              {locale === "vi" ? "3. Xử lý Đơn hàng & Cơ chế Duyệt Hủy / Hoàn tiền" : "3. Order Management & Refund Approval"}
            </h3>
          </div>
          <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <p>
              {locale === "vi"
                ? "Hệ thống hỗ trợ quy trình xử lý đơn hàng tự động và bảo vệ người tiêu dùng:"
                : "Automated payment reconciliation and consumer dispute workflow:"}
            </p>
            <ul className="space-y-2 list-disc pl-4 text-zinc-400">
              <li>
                <strong className="text-zinc-200">{locale === "vi" ? "Thanh toán VietQR:" : "VietQR Auto-Check:"}</strong>{" "}
                {locale === "vi" ? "Webhook VietQR tự động cập nhật đơn hàng sang Đã Hoàn Tất (Completed) và tự động kích hoạt game vào Thư viện của khách." : "VietQR webhook reconciles payments to Completed and assigns game licenses to user libraries."}
              </li>
              <li>
                <strong className="text-zinc-200">{locale === "vi" ? "Yêu cầu hủy (CancellationPending):" : "Pending Cancellations:"}</strong>{" "}
                {locale === "vi" ? "Khi người dùng yêu cầu hoàn tiền hoặc hủy giao dịch, đơn hàng sẽ hiển thị trạng thái 'Chờ Duyệt Hủy' tại tab Đơn hàng." : "Customer refund requests trigger a 'CancellationPending' status in the Orders tab."}
              </li>
              <li>
                <strong className="text-zinc-200">{locale === "vi" ? "Duyệt Hủy & Thu hồi giấy phép:" : "Approve & Revoke License:"}</strong>{" "}
                {locale === "vi" ? "Bấm nút 'Duyệt Hủy' để xác nhận. Hệ thống sẽ tự động thu hồi game trong Thư viện của khách hàng và gửi email thông báo qua Resend API." : "Clicking 'Approve' revokes the game from the user library and sends an email notification via Resend."}
              </li>
            </ul>
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/5 text-[11px] text-zinc-400">
              <strong className="text-zinc-300">{locale === "vi" ? "Gợi ý Quản trị:" : "Admin Tip:"}</strong>{" "}
              {locale === "vi" ? "Luôn đối soát sao kê ngân hàng trước khi bấm Duyệt Hoàn Tiền cho các giao dịch chuyển khoản VietQR lớn." : "Always verify banking ledger receipts before issuing large VietQR refunds."}
            </div>
          </div>
        </Card>

        {/* Card 4: Moderation & Storage Engine */}
        <Card className="p-6 bg-zinc-900/60 border border-white/10 rounded-2xl shadow-xl backdrop-blur space-y-4 md:col-span-2">
          <div className="flex items-center gap-2.5">
            <Shield className="size-5 text-zinc-400" />
            <h3 className="text-base font-bold text-white">
              {locale === "vi" ? "4. An ninh người dùng & Cơ chế Lưu trữ Đám mây" : "4. User Moderation & Storage Engine"}
            </h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-xs text-zinc-300 leading-relaxed">
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/5 space-y-2">
              <h4 className="font-bold text-white">
                {locale === "vi" ? "Khóa tài khoản vi phạm (Ban / Block):" : "Account Suspension (Ban):"}
              </h4>
              <p className="text-zinc-400">
                {locale === "vi"
                  ? "Tại tab Người Dùng, quản trị viên có thể xem danh sách thành viên và phân khúc (VIP, Đang Mua, Chơi Thử). Khi phát hiện hành vi gian lận hoặc spam, bấm nút Khóa. Hệ thống sẽ thu hồi ngay lập tức JWT Token, buộc người dùng đăng xuất và chặn mọi quyền truy cập hoặc thanh toán tiếp theo."
                  : "In Users tab, inspect customers and segments (VIP, Active, Trial). Suspending an account instantly invalidates active JWT tokens, forces logout, and blocks future checkout attempts."}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/5 space-y-2">
              <h4 className="font-bold text-white">
                {locale === "vi" ? "Cơ chế Lưu trữ Tệp tin (Storage Engine):" : "Storage Engine & Fallback:"}
              </h4>
              <p className="text-zinc-400">
                {locale === "vi"
                  ? "GameVault hỗ trợ lưu trữ tệp tin trên Google Drive Cloud Storage cho môi trường phân tán. Nếu chưa cấu hình Google Cloud Credentials hoặc trong môi trường máy chủ cục bộ (Local Development), hệ thống tự động kích hoạt cơ chế Local Fallback lưu trữ an toàn tại thư mục wwwroot/uploads của máy chủ để không làm gián đoạn vận hành."
                  : "Supports Google Drive Cloud Storage for distributed scale. In local environments or when cloud credentials are missing, system seamlessly falls back to wwwroot/uploads to ensure zero operational downtime."}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}


