"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useAdminStats, useCategories } from "@/hooks/useGames";
import { useAuthStore } from "@/lib/auth/store";
import { api, type ApiResponse } from "@/lib/api/client";
import { formatPrice, formatDate, formatDateTime, formatAnalyticsTime, resolveImageUrl } from "@/lib/utils";
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

export default function AnalyticsTab() {
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
                      <td className="py-3 px-2 font-mono text-zinc-300">{formatAnalyticsTime(pt.time)}</td>
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

