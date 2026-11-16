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

export default function RevenueTab() {
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
                  <span className="font-mono text-zinc-400">{formatAnalyticsTime(pt.time)}</span>
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
                  <span className="font-mono text-zinc-400">{formatAnalyticsTime(pt.time)}</span>
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

