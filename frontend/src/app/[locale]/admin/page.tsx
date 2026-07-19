"use client";

import { useState, useEffect, Fragment } from "react";
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
  Bot, AlertTriangle, BarChart3, TrendingUp, Clock, ArrowUpRight, Download, Settings
} from "lucide-react";


import { useSearchParams } from "next/navigation";

export default function AdminPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Nav Tabs list
  const tabs = [
    { id: "overview", label: locale === "vi" ? "Tổng quan" : "Overview", icon: LayoutDashboard },
    { id: "analytics", label: locale === "vi" ? "Thống kê chi tiết" : "Detailed Analytics", icon: BarChart3 },
    { id: "games", label: locale === "vi" ? "Trò chơi" : "Games", icon: Gamepad2 },
    { id: "orders", label: locale === "vi" ? "Đơn hàng" : "Orders", icon: ShoppingBag },
    { id: "users", label: locale === "vi" ? "Người dùng" : "Users", icon: UsersIcon },
    { id: "revenue", label: locale === "vi" ? "Doanh thu" : "Revenue", icon: DollarSign },
    { id: "ai", label: locale === "vi" ? "Cài đặt AI" : "AI Settings", icon: Bot },
    { id: "help", label: locale === "vi" ? "Hướng dẫn" : "Help Guide", icon: HelpCircle },
  ];

  return (
    <div className="w-[100vw] max-w-[1600px] relative left-1/2 -translate-x-1/2 px-4 md:px-8 py-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar Nav */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="sticky top-24 rounded-2xl border border-white/5 bg-zinc-900/50 p-4 backdrop-blur shadow-xl space-y-2">
          <h2 className="px-3 py-2 text-xs font-semibold text-zinc-500 tracking-wider uppercase">
            Admin Panel
          </h2>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
        {activeTab === "ai" && <AiTab />}
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
        alert(
          locale === "vi"
            ? `Đồng bộ thành công!\n- Ảnh: ${m.images} tệp\n- Video: ${m.videos} tệp\n- Tệp cài đặt: ${m.files} tệp\n- WebGL Demo: ${m.demos} tệp\n- Avatar: ${m.avatars} tệp\n- AI Avatar: ${m.aiAvatars} tệp`
            : `Sync successful!\n- Images: ${m.images}\n- Videos: ${m.videos}\n- Installers: ${m.files}\n- WebGL Demos: ${m.demos}\n- Avatars: ${m.avatars}\n- AI Avatars: ${m.aiAvatars}`
        );
      }
    } catch (error) {
      console.error(error);
      alert(locale === "vi" ? "Đồng bộ thất bại hoặc xảy ra lỗi kết nối." : "Sync failed or connection error.");
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

  if (isLoading) return <p className="text-zinc-500">Loading Stats...</p>;

  const s = stats as any;
  const cards = [
    { label: locale === "vi" ? "Tổng Doanh Thu" : "Total Revenue", value: formatPrice(s.totalRevenue ?? 0), color: "text-violet-400" },
    { label: locale === "vi" ? "Tổng Đơn Hàng" : "Orders Completed", value: s.totalOrders ?? 0, color: "text-green-400" },
    { label: locale === "vi" ? "Người Dùng" : "Users Registered", value: s.totalUsers ?? 0, color: "text-blue-400" },
    { label: locale === "vi" ? "Trò Chơi" : "Published Games", value: s.totalGames ?? 0, color: "text-amber-400" },
    { label: locale === "vi" ? "Lượt Tải Game" : "Total Downloads", value: s.totalDownloads ?? 0, color: "text-emerald-400" },
    { label: locale === "vi" ? "Lượt Chơi Thử" : "Total Demo Plays", value: s.totalDemoPlays ?? 0, color: "text-pink-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">Real-time statistics of GameVault store.</p>
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
          <h3 className="text-lg font-bold text-white mb-4">{locale === "vi" ? "Top Trò Chơi Tải Nhiều" : "Top Downloaded Games"}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead>
                <tr className="border-b border-white/5 text-zinc-500 font-semibold">
                  <th className="py-2">Game Title</th>
                  <th className="py-2 text-right">Downloads</th>
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
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Settings className="size-5 text-violet-400" />
              {locale === "vi" ? "Thao Tác & Đồng Bộ" : "System & Migration"}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {locale === "vi"
                ? "Thực hiện đồng bộ các tệp từ máy chủ local lên Google Drive hoặc khôi phục dữ liệu hệ thống."
                : "Synchronize local server uploads to Google Drive or perform database resets."}
            </p>
          </div>
          <div className="space-y-3 mt-6">
            <Button
              onClick={handleMigrateToDrive}
              disabled={isMigrating}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white border-none gap-2 font-medium"
            >
              <Upload className="size-4" />
              {isMigrating 
                ? (locale === "vi" ? "Đang đồng bộ..." : "Syncing...") 
                : (locale === "vi" ? "Đồng bộ wwwroot lên Drive" : "Sync wwwroot to Drive")}
            </Button>
            <Button
              onClick={handleSyncDriveToLocal}
              disabled={isSyncingFromDrive}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white border-none gap-2 font-medium"
            >
              <Download className="size-4" />
              {isSyncingFromDrive
                ? (locale === "vi" ? "Đang tải xuống..." : "Downloading...")
                : (locale === "vi" ? "Đồng bộ Drive xuống Local" : "Sync Drive to Local")}
            </Button>
            <Button
              onClick={handleResetDemoPlays}
              className="w-full bg-orange-600/20 hover:bg-orange-600 text-orange-300 hover:text-white border border-orange-500/20 hover:border-transparent gap-2 font-medium"
            >
              <Trash2 className="size-4" />
              {locale === "vi" ? "Xóa Hết Lượt Chơi Thử" : "Reset Demo Plays"}
            </Button>
            <Button
              onClick={handleResetData}
              className="w-full bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/20 hover:border-transparent gap-2 font-medium"
            >
              <Trash2 className="size-4" />
              {locale === "vi" ? "Khôi Phục Dữ Liệu Game" : "Reset Game Database"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent Demo Plays */}
      <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur">
        <h3 className="text-lg font-bold text-white mb-4">{locale === "vi" ? "Lượt Chơi Thử Gần Đây" : "Recent Demo Plays"}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-semibold">
                <th className="py-2 px-3">{locale === "vi" ? "Tên Trò Chơi" : "Game Title"}</th>
                <th className="py-2 px-3">{locale === "vi" ? "Người Chơi" : "Player"}</th>
                <th className="py-2 px-3">{locale === "vi" ? "Thời Lượng" : "Duration"}</th>
                <th className="py-2 px-3 text-right">{locale === "vi" ? "Thời Gian" : "Played At"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(s.recentDemoPlays ?? []).map((log: any) => {
                const formatDuration = (sec: number | null) => {
                  if (sec === null || sec === undefined) return "—";
                  if (sec < 60) return locale === "vi" ? `${sec} giây` : `${sec}s`;
                  const mins = Math.floor(sec / 60);
                  const secs = sec % 60;
                  return locale === "vi" 
                    ? `${mins} phút ${secs} giây` 
                    : `${mins}m ${secs}s`;
                };

                return (
                  <tr key={log.id} className="hover:text-white transition">
                    <td className="py-3 px-3 font-medium text-zinc-200">{log.gameTitle}</td>
                    <td className="py-3 px-3 text-zinc-300">
                      {log.userFullName ? `${log.userFullName} (${log.userEmail})` : (locale === "vi" ? "Khách vãng lai" : "Guest")}
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
                    {locale === "vi" ? "Chưa có lượt chơi thử nào." : "No demo plays recorded yet."}
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
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [shortDescriptionEn, setShortDescriptionEn] = useState("");
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

  // Upload fields
  const [fileType, setFileType] = useState("image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const startEdit = (g: any) => {
    // Load full details via admin endpoint (works for any status)
    api.get(`/admin/games/${g.id}`).then((res) => {
      const fullGame = res.data.data;
      setEditingGame(fullGame);
      setIsCreating(false);

      setTitle(fullGame.title || "");
      setTitleEn(fullGame.titleEn || "");
      setSlug(fullGame.slug || "");
      setDescription(fullGame.description || "");
      setDescriptionEn(fullGame.descriptionEn || "");
      setShortDescription(fullGame.shortDescription || "");
      setShortDescriptionEn(fullGame.shortDescriptionEn || "");

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

    setTitle(""); setTitleEn(""); setSlug("");
    setDescription(""); setDescriptionEn("");
    setShortDescription(""); setShortDescriptionEn("");
    setSelectedCategoryIds([]);
    setDeveloper(""); setPublisher(""); setReleaseDate("");
    setPrice(0); setDiscountPrice(undefined); setMinAge(0);
    setIsFeatured(false); setStatus("Draft");
    setOs(""); setCpu(""); setRam(""); setGpu(""); setStorage("");
    setSelectedTagIds([]);
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqJson = JSON.stringify({
      os, cpu, ram_gb: ram ? parseInt(ram) : null, gpu, storage_gb: storage ? parseInt(storage) : null
    });

    const payload = {
      title, slug, description, shortDescription,
      titleEn: titleEn || null, descriptionEn: descriptionEn || null, shortDescriptionEn: shortDescriptionEn || null,
      categoryIds: selectedCategoryIds, developer, publisher: publisher || null,
      releaseDate: releaseDate || null, price, discountPrice: discountPrice || null,
      minAge, isFeatured, status, systemRequirements: reqJson, tagIds: selectedTagIds
    };

    try {
      if (isCreating) {
        await api.post("/admin/games", payload);
        alert("Game created successfully!");
      } else {
        await api.put(`/admin/games/${editingGame.id}`, payload);
        alert("Game details saved successfully!");
      }
      setIsCreating(false);
      setEditingGame(null);
      refetchGames();
    } catch (error) {
      console.error(error);
      alert("Error saving game. Ensure slug is unique and fields are correct.");
    }
  };

  const handleDeleteGame = async (id: string) => {
    if (!window.confirm("Are you sure you want to archive/delete this game?")) return;
    try {
      await api.delete(`/admin/games/${id}`);
      refetchGames();
      alert("Game archived successfully.");
    } catch (error) {
      console.error(error);
    }
  };

  const handleAssetUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedGameForUpload) return;
    setUploading(true);

    const form = new FormData();
    form.append("file", selectedFile);
    form.append("type", fileType);

    try {
      await api.post(`/admin/games/${selectedGameForUpload.id}/upload`, form);
      alert("File uploaded and linked successfully!");
      setSelectedFile(null);
      setSelectedGameForUpload(null);
      refetchGames();
    } catch (error) {
      console.error(error);
      alert("Error uploading asset.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAsset = async (gameId: string, assetType: string) => {
    const assetNames: Record<string, string> = {
      cover: locale === "vi" ? "ảnh bìa" : "cover image",
      trailer: locale === "vi" ? "trailer video" : "trailer video",
      demo: locale === "vi" ? "bản chơi thử WebGL" : "WebGL demo build",
      installer: locale === "vi" ? "tệp cài đặt game" : "installer files"
    };

    const confirmMsg = locale === "vi"
      ? `Bạn có chắc chắn muốn gỡ bỏ hoàn toàn ${assetNames[assetType]} của trò chơi này?`
      : `Are you sure you want to completely remove the ${assetNames[assetType]} of this game?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete(`/admin/games/${gameId}/${assetType}`);
      alert(locale === "vi" ? "Gỡ bỏ thành công!" : "Asset removed successfully!");
      
      // Update local drawer state so checklist and actions sync immediately
      setSelectedGameForUpload((prev: any) => {
        if (!prev) return prev;
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
          <h1 className="text-3xl font-bold text-white">Games Catalog</h1>
          <p className="text-sm text-zinc-500 mt-1">Create, edit, and upload files for games.</p>
        </div>
        {!isCreating && !editingGame && (
          <Button onClick={startCreate} className="bg-violet-600 hover:bg-violet-500 text-white gap-2 font-medium">
            <PlusCircle className="size-4" />
            {locale === "vi" ? "Thêm game mới" : "Add New Game"}
          </Button>
        )}
      </div>

      {/* Forms Area */}
      {(isCreating || editingGame) && (
        <Card className="p-6 bg-zinc-900/40 border-violet-500/10 backdrop-blur">
          <h2 className="text-xl font-bold text-white mb-6">
            {isCreating ? (locale === "vi" ? "Thêm Trò Chơi Mới" : "Add New Game Entry") : `Editing: ${editingGame.title}`}
          </h2>
          <form onSubmit={handleSaveGame} className="space-y-6">

            {/* Translations */}
            <div className="grid gap-6 md:grid-cols-2 p-4 bg-zinc-950/40 rounded-2xl border border-white/5">
              <div className="space-y-4">
                <h3 className="font-semibold text-violet-400 text-sm">Tiếng Việt (Default)</h3>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Tên game (Title)</label>
                  <Input required value={title} onChange={(e) => { setTitle(e.target.value); if (isCreating) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")); }} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Mô tả chi tiết (Description)</label>
                  <textarea required className="w-full h-32 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-300 outline-none focus:border-violet-500" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-violet-400 text-sm">English Translation (Optional)</h3>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 font-mono">Title (EN)</label>
                  <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Bilingual title" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 font-mono">Description (EN)</label>
                  <textarea className="w-full h-32 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-300 outline-none focus:border-violet-500" value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} placeholder="Bilingual narrative..." />
                </div>
              </div>
            </div>

            {/* General Metadata */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Game Slug (Unique Path)</label>
                <Input required value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="grand-theft-auto-v" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Trạng thái (Status)</label>
                <select className="w-full rounded-md border border-zinc-700 bg-zinc-950 p-2 text-sm text-zinc-300" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 font-semibold">{locale === "vi" ? "Chọn thể loại (Categories)" : "Select Categories"}</label>
              <div className="flex flex-wrap gap-2">
                {(categories ?? []).map((cat: any) => {
                  const selected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${selected
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
                <label className="text-xs text-zinc-400">Giá gốc (Price - VND)</label>
                <Input type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Giá giảm (Discount Price - VND)</label>
                <Input type="number" value={discountPrice ?? ""} onChange={(e) => setDiscountPrice(e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Nhà phát triển (Developer)</label>
                <Input required value={developer} onChange={(e) => setDeveloper(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Nhà phát hành (Publisher)</label>
                <Input value={publisher} onChange={(e) => setPublisher(e.target.value)} />
              </div>
            </div>

            {/* Limits & Flags */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Ngày phát hành (Release Date)</label>
                <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="[color-scheme:dark]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Tuổi tối thiểu (Min Age)</label>
                <Input type="number" value={minAge} onChange={(e) => setMinAge(parseInt(e.target.value))} />
              </div>
              <div className="flex flex-col gap-1 pt-8">
                <div className="flex items-center gap-2">
                  <input id="isFeatured" type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="size-4 rounded text-violet-600 bg-zinc-950 border-white/10" />
                  <label htmlFor="isFeatured" className="text-sm text-zinc-400 select-none cursor-pointer">Game nổi bật (Featured)</label>
                </div>
                {isFeatured && status !== "Published" && (
                  <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                    <Info className="size-3" /> Game phải ở trạng thái <strong>Published</strong> để hiển thị nổi bật.
                  </p>
                )}
              </div>

            </div>

            {/* System Requirements */}
            <div className="p-4 bg-zinc-950/40 rounded-2xl border border-white/5 space-y-4">
              <h3 className="font-semibold text-violet-400 text-sm">System Requirements</h3>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">OS</label>
                  <Input value={os} onChange={(e) => setOs(e.target.value)} placeholder="Windows 10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">CPU</label>
                  <Input value={cpu} onChange={(e) => setCpu(e.target.value)} placeholder="Intel i5" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">RAM (GB)</label>
                  <Input type="number" value={ram} onChange={(e) => setRam(e.target.value)} placeholder="8" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">GPU</label>
                  <Input value={gpu} onChange={(e) => setGpu(e.target.value)} placeholder="NVIDIA GTX 1060" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Storage (GB)</label>
                  <Input type="number" value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="50" />
                </div>
              </div>
            </div>

            {/* Tags Selection */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 font-semibold">Chọn nhãn (Tags)</label>
              <div className="flex flex-wrap gap-2">
                {(tagsList ?? []).map((tag: any) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${selected
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

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button type="button" variant="outline" onClick={() => { setIsCreating(false); setEditingGame(null); }}>
                Cancel
              </Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white gap-2 font-medium">
                <Save className="size-4" />
                {locale === "vi" ? "Lưu thông tin" : "Save Game Details"}
              </Button>
            </div>

          </form>
        </Card>
      )}

      {/* Asset Upload Drawer/Modal */}
      {selectedGameForUpload && (
        <Card className="p-6 bg-zinc-900/40 border-violet-500/10 backdrop-blur">
          <h2 className="text-xl font-bold text-white mb-2">Upload Assets</h2>
          <p className="text-xs text-zinc-500 mb-6">Linking files to game: <span className="font-semibold text-violet-400">{selectedGameForUpload.title}</span></p>
          <form onSubmit={handleAssetUpload} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">
                  {locale === "vi" ? "Loại tệp đính kèm" : "Asset Type"}
                </label>
                <select className="w-full rounded-md border border-zinc-700 bg-zinc-950 p-2 text-sm text-zinc-300 cursor-pointer" value={fileType} onChange={(e) => setFileType(e.target.value)}>
                  <option value="image">{locale === "vi" ? "Ảnh bìa / Ảnh minh họa (image)" : "Cover Image / Artwork"}</option>
                  <option value="trailer">{locale === "vi" ? "Video Trailer (.mp4) (trailer)" : "Trailer video (.mp4)"}</option>
                  <option value="installer">{locale === "vi" ? "File cài đặt game (zip/exe) (installer)" : "Actual Game Installer (zip/exe)"}</option>
                  <option value="demo">{locale === "vi" ? "Bản chơi thử Unity WebGL (zip) (demo)" : "Unity WebGL Demo (zip / index.html)"}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Select File</label>
                <Input type="file" required onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setSelectedGameForUpload(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white gap-2" disabled={uploading}>
                <Upload className="size-4" />
                {uploading ? "Uploading..." : "Upload File"}
              </Button>
            </div>
          </form>

          {/* Current Assets Status & Deletion */}
          <div className="border-t border-white/5 pt-6 mt-8">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">
              {locale === "vi" ? "Quản lý tệp hiện tại của game" : "Current Assets Management"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Cover Image */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-medium">{locale === "vi" ? "Ảnh bìa:" : "Cover Image:"}</span>
                  {selectedGameForUpload.hasCover ? (
                    <span className="text-xs text-green-400 font-semibold">{locale === "vi" ? "Đã úp" : "Available"}</span>
                  ) : (
                    <span className="text-xs text-zinc-500">{locale === "vi" ? "Chưa có" : "Not available"}</span>
                  )}
                </div>
                {selectedGameForUpload.hasCover && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleRemoveAsset(selectedGameForUpload.id, "cover")}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 h-8 w-8 rounded-lg transition"
                    title="Delete Cover Image"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>

              {/* Trailer */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-medium">Trailer Video:</span>
                  {selectedGameForUpload.hasTrailer ? (
                    <span className="text-xs text-green-400 font-semibold">{locale === "vi" ? "Đã úp" : "Available"}</span>
                  ) : (
                    <span className="text-xs text-zinc-500">{locale === "vi" ? "Chưa có" : "Not available"}</span>
                  )}
                </div>
                {selectedGameForUpload.hasTrailer && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleRemoveAsset(selectedGameForUpload.id, "trailer")}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 h-8 w-8 rounded-lg transition"
                    title="Delete Trailer"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>

              {/* WebGL Demo */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-medium">WebGL Demo:</span>
                  {selectedGameForUpload.hasDemo ? (
                    <span className="text-xs text-green-400 font-semibold">{locale === "vi" ? "Đã úp" : "Available"}</span>
                  ) : (
                    <span className="text-xs text-zinc-500">{locale === "vi" ? "Chưa có" : "Not available"}</span>
                  )}
                </div>
                {selectedGameForUpload.hasDemo && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleRemoveAsset(selectedGameForUpload.id, "demo")}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 h-8 w-8 rounded-lg transition"
                    title="Delete WebGL Demo"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>

              {/* Game installer file */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-medium">{locale === "vi" ? "File cài đặt:" : "Installer File:"}</span>
                  {selectedGameForUpload.hasFile ? (
                    <span className="text-xs text-green-400 font-semibold">{locale === "vi" ? "Đã úp" : "Available"}</span>
                  ) : (
                    <span className="text-xs text-zinc-500">{locale === "vi" ? "Chưa có" : "Not available"}</span>
                  )}
                </div>
                {selectedGameForUpload.hasFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleRemoveAsset(selectedGameForUpload.id, "installer")}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 h-8 w-8 rounded-lg transition"
                    title="Delete Game Installer"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Games Table List */}
      {!isCreating && !editingGame && !selectedGameForUpload && (
        <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur overflow-hidden">
          <div className="w-full">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead>
                <tr className="border-b border-white/5 text-zinc-500 font-semibold">
                  <th className="py-3 px-4">{locale === "vi" ? "Tên Game" : "Game Title"}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{locale === "vi" ? "Thể Loại" : "Category"}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{locale === "vi" ? "Giá" : "Price"}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{locale === "vi" ? "Lượt Tải" : "Downloads"}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{locale === "vi" ? "Chơi Thử" : "Demo Plays"}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{locale === "vi" ? "Theo Dõi" : "Wishlists"}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{locale === "vi" ? "Trạng Thái" : "Status"}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{locale === "vi" ? "Tệp Đính Kèm" : "Attached Assets"}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">{locale === "vi" ? "Hành Động" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {games.map((g: any) => (
                  <tr key={g.id} className="hover:text-white transition group">
                    <td className="py-4 px-4 font-semibold text-zinc-200">
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
                        <div className="flex flex-col min-w-[150px]">
                          <span>{g.title}</span>
                          <span className="text-xs text-zinc-500 font-mono font-light select-all">{g.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">{g.categoryName || (locale === "vi" ? "Chưa phân loại" : "Uncategorized")}</td>
                    <td className="py-4 px-4 font-medium text-violet-300 whitespace-nowrap">{formatPrice(g.price, g.currency)}</td>
                    <td className="py-4 px-4">{g.downloadCount}</td>
                    <td className="py-4 px-4">{g.demoPlayCount || 0}</td>
                    <td className="py-4 px-4">{g.wishlistCount}</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${g.status === "Published" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                        g.status === "Draft" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                          "bg-zinc-800 text-zinc-400 border-zinc-700"
                        }`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col gap-1.5 text-xs text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          {g.hasCover ? (
                            <span className="inline-flex items-center gap-1 text-green-400 font-medium">
                              <CheckCircle2 className="size-3 text-green-400" />
                              {locale === "vi" ? "Ảnh bìa" : "Cover"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-zinc-500 font-light">
                              <XCircle className="size-3 text-zinc-600" />
                              {locale === "vi" ? "Ảnh bìa" : "Cover"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {g.hasTrailer ? (
                            <span className="inline-flex items-center gap-1 text-green-400 font-medium">
                              <CheckCircle2 className="size-3 text-green-400" />
                              Trailer
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-zinc-500 font-light">
                              <XCircle className="size-3 text-zinc-600" />
                              Trailer
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {g.hasDemo ? (
                            <span className="inline-flex items-center gap-1 text-green-400 font-medium">
                              <CheckCircle2 className="size-3 text-green-400" />
                              Demo WebGL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-zinc-500 font-light">
                              <XCircle className="size-3 text-zinc-600" />
                              Demo WebGL
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {g.hasFile ? (
                            <span className="inline-flex items-center gap-1 text-green-400 font-medium">
                              <CheckCircle2 className="size-3 text-green-400" />
                              {locale === "vi" ? "Bản cài đặt" : "Installer"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-zinc-500 font-light">
                              <XCircle className="size-3 text-zinc-600" />
                              {locale === "vi" ? "Bản cài đặt" : "Installer"}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition">
                        {g.status === "Published" ? (
                          <Link href={`/${locale}/game/${g.slug}`} target="_blank">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View Game Page"
                              className="hover:bg-emerald-500/10 hover:text-emerald-400 p-2"
                            >
                              <ExternalLink className="size-4" />
                            </Button>
                          </Link>
                        ) : (
                          <Button variant="ghost" size="sm" className="p-2 opacity-30 cursor-not-allowed" disabled title="Only visible when Published">
                            <ExternalLink className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedGameForUpload(g)}
                          title="Upload Assets"
                          className="hover:bg-violet-500/10 hover:text-violet-400 p-2"
                        >
                          <Upload className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(g)}
                          title="Edit Info"
                          className="hover:bg-violet-500/10 hover:text-violet-400 p-2"
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGame(g.id)}
                          title="Archive Game"
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

  if (isLoading) return <p className="text-zinc-500">Loading Orders...</p>;

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
          <h1 className="text-3xl font-bold text-white">Purchase Orders</h1>
          <p className="text-sm text-zinc-500 mt-1">Audit platform orders and transaction statuses.</p>
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
            {locale === "vi" ? "Tất cả đơn" : "All Orders"}
          </button>
          <button
            onClick={() => setStatusFilter("normal")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              statusFilter === "normal"
                ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/20"
                : "bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            {locale === "vi" ? "Đơn hàng bình thường" : "Normal Orders"}
          </button>
          <button
            onClick={() => setStatusFilter("cancellation")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-2 cursor-pointer ${
              statusFilter === "cancellation"
                ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/20"
                : "bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            {locale === "vi" ? "Đơn hàng cần xử lý hủy" : "Cancellation Requests"}
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
                <th className="py-3">Order Code</th>
                <th className="py-3">Buyer</th>
                <th className="py-3">Purchased Items</th>
                <th className="py-3">Total Paid</th>
                <th className="py-3">Status</th>
                <th className="py-3">Purchase Date</th>
                <th className="py-3 text-right">Actions</th>
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
                          <span className="text-[10px] text-amber-500/80 mt-1 max-w-[200px] leading-relaxed break-words font-medium">
                            ⚠️ {locale === "vi" ? "Lý do: " : "Reason: "}{o.cancelReason}
                          </span>
                        )}
                        {o.status === "CancellationApproved" && (
                          <div className="flex flex-col mt-1 max-w-[200px] gap-0.5 text-[10px] leading-relaxed break-words font-medium">
                            {o.cancelReason && <span className="text-amber-500/85">⚠️ {locale === "vi" ? "Lý do: " : "Reason: "}{o.cancelReason}</span>}
                            {o.adminNote && <span className="text-teal-500/85">💬 {locale === "vi" ? "Admin: " : "Admin: "}{o.adminNote}</span>}
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

  if (isLoading) return <p className="text-zinc-500">Loading Users...</p>;

  const users = usersList ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Platform Users</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage user access control and roles.</p>
      </div>

      <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-semibold">
                <th className="py-3">Name</th>
                <th className="py-3">Email</th>
                <th className="py-3">{locale === "vi" ? "Ngày sinh" : "Date of Birth"}</th>
                <th className="py-3">Roles</th>
                <th className="py-3">Joined Date</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u: any) => {
                const badgeColor = u.isActive
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20";

                return (
                  <tr key={u.id} className="hover:text-white transition">
                    <td className="py-4 font-semibold text-zinc-200">{u.fullName}</td>
                    <td className="py-4">{u.email}</td>
                    <td className="py-4 text-sm text-zinc-300">
                      {u.dateOfBirth ? (() => {
                        const p = u.dateOfBirth.split("T")[0].split("-");
                        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : u.dateOfBirth;
                      })() : "—"}
                    </td>
                    <td className="py-4 text-xs font-mono text-zinc-400">{u.roles.join(", ")}</td>
                    <td className="py-4 text-xs text-zinc-500">{formatDate(u.createdAt)}</td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                        {u.isActive ? "Active" : "Blocked"}
                      </span>
                    </td>
                    <td className="py-4 text-right flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(u.id, u.isActive, u.fullName)}
                        className={`p-2 transition ${u.isActive ? "hover:bg-red-500/10 hover:text-red-400" : "hover:bg-green-500/10 hover:text-green-400"}`}
                        title={u.isActive ? "Block Account" : "Unblock Account"}
                      >
                        {u.isActive ? (
                          <div className="flex items-center gap-1 text-red-400 text-xs">
                            <ToggleLeft className="size-5" />
                            Block
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-400 text-xs">
                            <ToggleRight className="size-5" />
                            Activate
                          </div>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(u.id, u.fullName)}
                        className="p-2 transition hover:bg-red-500/20 text-red-500 hover:text-red-400"
                        title={locale === "vi" ? "Xóa người dùng" : "Delete User"}
                      >
                        <div className="flex items-center gap-1 text-xs">
                          <Trash2 className="size-4" />
                          {locale === "vi" ? "Xóa" : "Delete"}
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

  if (isLoading) return <p className="text-zinc-500">Loading Revenue Data...</p>;

  const r = revenueData ?? { totalRevenue: 0, dailyRevenue: [], monthlyRevenue: [], gameRevenue: [] };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Financial Auditing</h1>
        <p className="text-sm text-zinc-500 mt-1">Review breakdown of sales and earnings.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Metric Card */}
        <Card className="p-6 bg-zinc-900/40 border-violet-500/20 backdrop-blur md:col-span-3 flex justify-between items-center h-24">
          <span className="text-zinc-400 text-sm font-semibold uppercase tracking-wider">
            {locale === "vi" ? "Tổng Doanh Thu Hợp Lệ" : "Validated Gross Income"}
          </span>
          <span className="text-4xl font-extrabold text-violet-300">{formatPrice(r.totalRevenue)}</span>
        </Card>

        {/* Daily Breakdown */}
        <Card className="p-5 bg-zinc-900/40 border-white/5 backdrop-blur">
          <h3 className="text-md font-bold text-zinc-200 mb-4">{locale === "vi" ? "Doanh thu theo ngày" : "Daily Earning Points"}</h3>
          <div className="max-h-80 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {r.dailyRevenue.length === 0 ? (
              <p className="text-zinc-500 text-xs text-center py-4">No daily data</p>
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
          <h3 className="text-md font-bold text-zinc-200 mb-4">{locale === "vi" ? "Doanh thu theo tháng" : "Monthly Revenue Points"}</h3>
          <div className="max-h-80 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {r.monthlyRevenue.length === 0 ? (
              <p className="text-zinc-500 text-xs text-center py-4">No monthly data</p>
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
          <h3 className="text-md font-bold text-zinc-200 mb-4">{locale === "vi" ? "Doanh thu theo từng game" : "Earnings by Game Title"}</h3>
          <div className="max-h-80 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {r.gameRevenue.length === 0 ? (
              <p className="text-zinc-500 text-xs text-center py-4">No game data</p>
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
            {locale === "vi" ? "Thống Kê Chi Tiết" : "Detailed Analytics"}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {locale === "vi" 
              ? "Phân tích doanh thu, lượt tải, lượt chơi thử và hành vi người dùng theo khoảng thời gian." 
              : "Analyze revenue, downloads, demo plays, and customer behavior over selected timeframes."}
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
                {r === "today" ? (locale === "vi" ? "Hôm nay" : "Today") :
                 r === "week" ? (locale === "vi" ? "Tuần này" : "This Week") :
                 r === "month" ? (locale === "vi" ? "Tháng này" : "This Month") :
                 r === "year" ? (locale === "vi" ? "Năm nay" : "This Year") :
                 (locale === "vi" ? "Tự chọn" : "Custom")}
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
            <span className="p-2 bg-violet-500/10 text-violet-400 rounded-lg text-xs font-semibold">📁</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[26px] font-black text-violet-400 tracking-tight">{a.selectedPeriod.downloads.toLocaleString()}</span>
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
            <span className="p-2 bg-pink-500/10 text-pink-400 rounded-lg text-xs font-semibold">🎮</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[26px] font-black text-pink-400 tracking-tight">{a.selectedPeriod.demoPlays.toLocaleString()}</span>
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
                  <td colSpan={5} className="py-8 text-center text-zinc-600 italic">No trend data available for this range</td>
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
                      <td colSpan={2} className="py-4 text-center text-zinc-605">No data</td>
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
                      <td colSpan={3} className="py-4 text-center text-zinc-650">No data</td>
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
                  <td colSpan={3} className="py-6 text-center text-zinc-650 italic">No conversions tracked yet</td>
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
                  <td colSpan={8} className="py-6 text-center text-zinc-650 italic">No game data available</td>
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
                  <td colSpan={7} className="py-6 text-center text-zinc-650 italic">No user data available</td>
                </tr>
              ) : (
                a.userStats.map((u: any, index: number) => {
                  const segmentColors = 
                    u.customerSegment === "VIP" ? "bg-violet-600/10 text-violet-400 border-violet-500/20" :
                    u.customerSegment.includes("Active") || u.customerSegment.includes("Mua Hàng") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    u.customerSegment.includes("Trial") || u.customerSegment.includes("Chơi Thử") ? "bg-pink-500/10 text-pink-400 border-pink-500/20" :
                    "bg-zinc-850 text-zinc-400 border-zinc-700";

                  return (
                    <tr key={u.id || index} className="hover:bg-white/2 hover:text-white transition">
                      <td className="py-3 px-2 font-bold text-zinc-200">{u.fullName}</td>
                      <td className="py-3 px-2 font-mono text-zinc-400 select-all">{u.email}</td>
                      <td className="py-3 px-2 text-zinc-400">{formatDate(u.createdAt)}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${segmentColors}`}>
                          {u.customerSegment}
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Help & Onboarding</h1>
        <p className="text-sm text-zinc-500 mt-1">Learn how to upload and manage game content step-by-step.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur space-y-4">
          <h3 className="text-lg font-bold text-violet-400">
            {locale === "vi" ? "Quy trình đăng tải game mới" : "New Game Publishing Guide"}
          </h3>
          <ol className="space-y-3 text-sm text-zinc-300 list-decimal pl-4 leading-relaxed">
            <li>
              <span className="font-semibold text-white">Tạo entry game:</span> Bấm vào nút <span className="text-violet-400">"Thêm game mới"</span> ở tab Trò chơi. Nhập đầy đủ thông tin mô tả chi tiết, giá tiền, nhà phát triển bằng cả 2 ngôn ngữ (Việt và Anh). Game mới tạo sẽ có trạng thái <span className="bg-yellow-500/10 text-yellow-400 px-1 border border-yellow-500/10 text-xs rounded">Draft</span>.
            </li>
            <li>
              <span className="font-semibold text-white">Tải ảnh bìa:</span> Tìm game vừa tạo ở danh sách, bấm vào biểu tượng <span className="text-violet-400">Upload (hình đám mây có mũi tên đi lên)</span>. Chọn loại file là <span className="italic">Cover Image</span> để upload hình ảnh đại diện.
            </li>
            <li>
              <span className="font-semibold text-white">Tải file cài đặt & chơi thử:</span> Tương tự bước 2, bạn chọn loại file là <span className="italic">Installer</span> (.zip, .exe) hoặc <span className="italic">WebGL Demo</span> (.zip) để upload mã nguồn game. <span className="text-zinc-500 font-light">(Có thể upload sau bất cứ lúc nào, game chưa có file sẽ có nhãn "Sắp ra mắt" ở cửa hàng).</span>
            </li>
            <li>
              <span className="font-semibold text-white">Công khai game:</span> Khi đã hoàn tất nội dung, chỉnh trạng thái game từ <span className="text-yellow-400">Draft</span> sang <span className="text-green-400">Published</span> trong bảng chỉnh sửa game. Game sẽ chính thức hiển thị ngoài cửa hàng cho người dùng mua.
            </li>
          </ol>
        </Card>

        <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur space-y-4">
          <h3 className="text-lg font-bold text-violet-400">
            {locale === "vi" ? "Quản trị & Khóa tài khoản" : "Platform Moderation & Security"}
          </h3>
          <ul className="space-y-3 text-sm text-zinc-300 list-disc pl-4 leading-relaxed">
            <li>
              <span className="font-semibold text-white">Khóa người dùng:</span> Trong tab <span className="text-violet-400">Người dùng</span>, admin có thể xem toàn bộ danh sách khách hàng. Bấm nút <span className="text-red-400">"Block"</span> để khóa tài khoản vi phạm. Người dùng bị khóa sẽ bị đăng xuất ngay lập tức và không thể đăng nhập lại.
            </li>
            <li>
              <span className="font-semibold text-white">Dữ liệu thống kê thực:</span> Toàn bộ doanh số, đơn hàng, lượt chơi thử demo, và số lượt tải file trong dashboard đều liên kết trực tiếp với database thực.
            </li>
            <li>
              <span className="font-semibold text-white">Mô tả song ngữ (VI - EN):</span> Hệ thống hỗ trợ đa ngôn ngữ. Khi chỉnh sửa thông tin game, hãy điền đầy đủ cả 2 cột ngôn ngữ để hiển thị chuẩn xác nhất theo ngôn ngữ trình duyệt của khách hàng.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function AiTab() {
  const locale = useLocale();
  const [avatar, setAvatar] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data } = await api.get<ApiResponse<any[]>>("/admin/ai/logs");
      if (data?.data) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error("Failed to load AI logs", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data } = await api.get<ApiResponse<{ avatarUrl: string }>>("/ai/settings");
        if (data?.data?.avatarUrl) {
          setAvatar(data.data.avatarUrl);
          setPreviewUrl(data.data.avatarUrl);
        }
      } catch (err) {
        console.error("Failed to load AI settings", err);
      }
    }
    loadSettings();
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    const confirmMsg = locale === "vi"
      ? "Bạn có chắc chắn muốn xóa toàn bộ lịch sử log của Groq AI API không?"
      : "Are you sure you want to clear all Groq AI API call history logs?";
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete("/admin/ai/logs");
      setLogs([]);
      setSelectedLog(null);
      alert(locale === "vi" ? "Đã xóa toàn bộ log thành công!" : "All logs cleared successfully!");
    } catch (err) {
      console.error(err);
      alert(locale === "vi" ? "Lỗi xóa log" : "Failed to clear logs");
    }
  };

  const getAbsoluteUrl = (url: string) => {
    return resolveImageUrl(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post<ApiResponse<{ url: string }>>("/admin/ai/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setAvatar(data.data.url);
      setPreviewUrl(data.data.url);
      alert(locale === "vi" ? "Cập nhật avatar AI thành công!" : "AI avatar updated successfully!");
    } catch (err) {
      console.error(err);
      alert(locale === "vi" ? "Lỗi tải ảnh lên" : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Configuration Card */}
      <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur space-y-6">
        <div>
          <h3 className="text-lg font-bold text-violet-400">
            {locale === "vi" ? "Cấu hình Trợ lý AI" : "AI Assistant Configuration"}
          </h3>
          <p className="text-sm text-zinc-400">
            {locale === "vi"
              ? "Thay đổi hình ảnh hiển thị cho Trợ lý AI khi trò chuyện với khách hàng."
              : "Change the profile picture of the AI Assistant when chatting with customers."}
          </p>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-zinc-300">
            {locale === "vi" ? "Avatar hiện tại của AI" : "Current AI Avatar"}
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-zinc-950/40 border border-white/5">
            <div className="relative size-24 rounded-full overflow-hidden border-2 border-violet-500/50 bg-zinc-800 flex items-center justify-center shrink-0 shadow-lg">
              {previewUrl ? (
                <img
                  src={getAbsoluteUrl(previewUrl)}
                  alt="AI Chatbot Preview"
                  className="size-full object-cover"
                />
              ) : (
                <div className="size-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
                  No Avatar
                </div>
              )}
            </div>
            <div className="space-y-3 text-center sm:text-left">
              <input
                type="file"
                id="bot-avatar-upload"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <label htmlFor="bot-avatar-upload" className="inline-block">
                <span className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-900/20">
                  <Upload className="size-4" />
                  {uploading
                    ? (locale === "vi" ? "Đang tải lên..." : "Uploading...")
                    : (locale === "vi" ? "Tải lên ảnh mới" : "Upload new image")}
                </span>
              </label>
              <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                {locale === "vi"
                  ? "Khuyên dùng ảnh có định dạng vuông (1:1), định dạng JPG, PNG hoặc WebP."
                  : "Recommended to use square (1:1) ratio images. Supports JPG, PNG or WebP."}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Logs Card */}
      <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-violet-400">
              {locale === "vi" ? "Lịch sử cuộc gọi Groq AI API" : "Groq AI API Call History"}
            </h3>
            <p className="text-sm text-zinc-400">
              {locale === "vi"
                ? "Giám sát số lượng yêu cầu, thông tin API key được sử dụng và nội dung prompt thực tế."
                : "Monitor API requests, key usage, and actual prompt/response data."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loadingLogs}>
              {loadingLogs ? (locale === "vi" ? "Đang tải..." : "Loading...") : (locale === "vi" ? "Tải lại" : "Refresh")}
            </Button>
            {logs.length > 0 && (
              <Button onClick={handleClearLogs} className="bg-red-600 hover:bg-red-500 text-white text-xs" size="sm">
                <Trash2 className="size-3.5 mr-1" />
                {locale === "vi" ? "Xóa hết log" : "Clear All Logs"}
              </Button>
            )}
          </div>
        </div>

        {/* Counter Widget */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="bg-zinc-950/40 p-4 rounded-xl border border-white/5 text-center">
            <span className="text-zinc-500 text-xs font-semibold block uppercase">Total Calls</span>
            <span className="text-2xl font-bold text-violet-400 mt-1 block">{logs.length}</span>
          </div>
          <div className="bg-zinc-950/40 p-4 rounded-xl border border-white/5 text-center">
            <span className="text-zinc-500 text-xs font-semibold block uppercase">Success Rate</span>
            <span className="text-2xl font-bold text-green-400 mt-1 block">
              {logs.length > 0
                ? `${Math.round((logs.filter(x => x.isSuccess !== undefined ? x.isSuccess : x.IsSuccess).length / logs.length) * 100)}%`
                : "0%"}
            </span>
          </div>
          <div className="bg-zinc-950/40 p-4 rounded-xl border border-white/5 text-center">
            <span className="text-zinc-500 text-xs font-semibold block uppercase">Active Key</span>
            <span className="text-sm font-semibold text-zinc-300 mt-2 block truncate">
              {logs[0]?.apiKeyMasked || logs[0]?.ApiKeyMasked || "—"}
            </span>
          </div>
          <div className="bg-zinc-950/40 p-4 rounded-xl border border-white/5 text-center">
            <span className="text-zinc-500 text-xs font-semibold block uppercase">Last Request</span>
            <span className="text-xs text-zinc-400 mt-2 block">
              {logs[0]?.timestamp || logs[0]?.Timestamp ? formatDateTime(logs[0].timestamp || logs[0].Timestamp) : "—"}
            </span>
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-semibold">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">{locale === "vi" ? "Thời gian" : "Time"}</th>
                <th className="py-2.5 px-3">API Key Prefix</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {logs.map((log: any, idx: number) => {
                const callNum = logs.length - idx;
                const isSuccess = log.isSuccess !== undefined ? log.isSuccess : log.IsSuccess;
                const timestamp = log.timestamp || log.Timestamp;
                const apiKeyMasked = log.apiKeyMasked || log.ApiKeyMasked;
                const model = log.model || log.Model;

                const statusColor = isSuccess
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20";

                return (
                  <tr key={idx} className="hover:text-white transition">
                    <td className="py-3 px-3 font-mono text-zinc-500">{callNum}</td>
                    <td className="py-3 px-3 text-zinc-400">{formatDateTime(timestamp)}</td>
                    <td className="py-3 px-3 font-mono text-zinc-300">{apiKeyMasked}</td>
                    <td className="py-3 px-3 text-zinc-400">{model}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColor}`}>
                        {isSuccess ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer font-medium underline"
                      >
                        {locale === "vi" ? "Xem chi tiết" : "View Details"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-zinc-500 italic">
                    {locale === "vi" ? "Chưa có log cuộc gọi nào." : "No API call logs recorded yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Selected Log Drawer/Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-4xl max-h-[85vh] bg-zinc-900 border-zinc-800 p-6 shadow-2xl space-y-4 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bot className="size-5 text-violet-400" />
                  {locale === "vi" ? "Chi tiết cuộc gọi Groq AI API" : "Groq AI API Request details"}
                </h3>
                <span className="text-xs text-zinc-500 block mt-0.5">
                  {formatDateTime(selectedLog.timestamp || selectedLog.Timestamp)} | Key: {selectedLog.apiKeyMasked || selectedLog.ApiKeyMasked} | Model: {selectedLog.model || selectedLog.Model}
                </span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-white font-bold text-xl px-2 py-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {/* Status banner */}
              {!(selectedLog.isSuccess !== undefined ? selectedLog.isSuccess : selectedLog.IsSuccess) && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl flex items-start gap-2 text-xs text-red-400">
                  <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Error Message:</span>
                    <p className="mt-1 font-mono break-all bg-zinc-950/50 p-2 rounded border border-red-500/10 whitespace-pre-wrap">
                      {selectedLog.errorMessage || selectedLog.ErrorMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* System Instruction */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                  System Instruction
                </span>
                <pre className="bg-zinc-950 border border-white/5 p-3 rounded-xl text-xs font-mono text-zinc-400 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                  {selectedLog.systemPrompt || selectedLog.SystemPrompt || "—"}
                </pre>
              </div>

              {/* User Prompt */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-violet-400 uppercase tracking-wider block">
                  User Prompt
                </span>
                <pre className="bg-zinc-950 border border-violet-500/10 p-3 rounded-xl text-xs font-mono text-zinc-300 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                  {selectedLog.userPrompt || selectedLog.UserPrompt}
                </pre>
              </div>

              {/* Groq Response */}
              {(selectedLog.isSuccess !== undefined ? selectedLog.isSuccess : selectedLog.IsSuccess) && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-green-400 uppercase tracking-wider block">
                    Groq AI Response
                  </span>
                  <pre className="bg-zinc-950 border border-green-500/10 p-3 rounded-xl text-xs font-mono text-green-300 max-h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                    {selectedLog.response || selectedLog.Response}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-white/5">
              <Button onClick={() => setSelectedLog(null)} className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs">
                {locale === "vi" ? "Đóng" : "Close"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
