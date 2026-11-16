"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import {
  LayoutDashboard, Gamepad2, ShoppingBag, Users as UsersIcon,
  DollarSign, HelpCircle, BarChart3, Loader2
} from "lucide-react";

function TabLoading() {
  return (
    <div className="flex h-64 items-center justify-center rounded-2xl border border-white/5 bg-zinc-900/30">
      <Loader2 className="size-6 animate-spin text-violet-500" />
    </div>
  );
}

const OverviewTab = dynamic(() => import("@/components/admin/OverviewTab"), {
  loading: () => <TabLoading />,
});
const AnalyticsTab = dynamic(() => import("@/components/admin/AnalyticsTab"), {
  loading: () => <TabLoading />,
});
const GamesTab = dynamic(() => import("@/components/admin/GamesTab"), {
  loading: () => <TabLoading />,
});
const OrdersTab = dynamic(() => import("@/components/admin/OrdersTab"), {
  loading: () => <TabLoading />,
});
const UsersTab = dynamic(() => import("@/components/admin/UsersTab"), {
  loading: () => <TabLoading />,
});
const RevenueTab = dynamic(() => import("@/components/admin/RevenueTab"), {
  loading: () => <TabLoading />,
});
const HelpTab = dynamic(() => import("@/components/admin/HelpTab"), {
  loading: () => <TabLoading />,
});

export default function AdminPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const { user, isLoading, isHydrated } = useAuthStore();

  useEffect(() => {
    if (isHydrated && !isLoading && (!user || !user.roles?.includes("Admin"))) {
      router.replace(`/${locale}`);
    }
  }, [user, isLoading, isHydrated, locale, router]);

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

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tabs.some((item) => item.id === tab)) {
      setActiveTab(tab);
    } else if (tab) {
      setActiveTab("overview");
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`/${locale}/admin?tab=${tabId}`, { scroll: false });
  };

  if (!isHydrated || isLoading || !user || !user.roles?.includes("Admin")) {
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  isActive
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
