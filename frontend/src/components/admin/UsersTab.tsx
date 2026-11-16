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

export default function UsersTab() {
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

