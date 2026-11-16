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
  Package, CreditCard, Shield, RefreshCw
} from "lucide-react";

export default function OverviewTab() {
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
      const msg = error.response?.data?.error?.message || error.response?.data?.message || (locale === "vi" ? "Đồng bộ thất bại hoặc xảy ra lỗi kết nối." : "Sync failed or connection error.");
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

