"use client";

import { useState, useEffect } from "react";
import { useAuthStore, type User } from "@/lib/auth/store";
import { useLocale } from "next-intl";
import Link from "next/link";
import { 
  User as UserIcon, 
  ShieldCheck, 
  UserX, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Layers,
  Sparkles
} from "lucide-react";

const DEMO_USER: User = {
  id: "demo-user-gamer",
  email: "gamer@gamevault.demo",
  fullName: "Alex Rivera",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  roles: ["User"],
};

const DEMO_ADMIN: User = {
  id: "demo-admin-root",
  email: "admin@gamevault.demo",
  fullName: "Chief Admin",
  avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  roles: ["Admin", "User"],
};

export function DemoRoleSwitcher() {
  const { user } = useAuthStore();
  const locale = useLocale();
  const prefix = `/${locale}`;

  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Khôi phục vai trò đã chọn từ localStorage (nếu có) khi tải lại trang
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("gv_demo_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        useAuthStore.setState({ user: parsed });
      }
    } catch {
      localStorage.removeItem("gv_demo_user");
    }
  }, []);

  const handleSelectRole = (role: "guest" | "user" | "admin") => {
    if (role === "guest") {
      localStorage.removeItem("gv_demo_user");
      useAuthStore.setState({ user: null });
    } else if (role === "user") {
      localStorage.setItem("gv_demo_user", JSON.stringify(DEMO_USER));
      useAuthStore.setState({ user: DEMO_USER });
    } else if (role === "admin") {
      localStorage.setItem("gv_demo_user", JSON.stringify(DEMO_ADMIN));
      useAuthStore.setState({ user: DEMO_ADMIN });
    }
  };

  if (!mounted) return null;

  const currentRole = !user 
    ? "guest" 
    : user.roles?.includes("Admin") 
      ? "admin" 
      : "user";

  return (
    <aside 
      aria-label="Demo Role Switcher"
      className="fixed bottom-6 left-6 z-50 font-sans select-none print:hidden transition-all duration-300"
    >
      {/* Khung điều khiển vai trò */}
      <div className="rounded-2xl border border-white/15 bg-[#090D18]/95 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] overflow-hidden">
        
        {/* Thanh tiêu đề nhỏ / Nút đóng mở */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] transition text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold font-mono tracking-wider text-zinc-200">
              <Sparkles className="size-3.5 text-cyan-400" />
              <span>ROLE PREVIEW:</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-mono font-bold ${
                currentRole === "admin"
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : currentRole === "user"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-zinc-700/40 text-zinc-300 border border-zinc-600/30"
              }`}>
                {currentRole === "admin" ? "Admin" : currentRole === "user" ? "Người dùng" : "Khách"}
              </span>
            </div>
          </div>
          <span className="text-zinc-400 hover:text-white p-0.5 rounded">
            {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          </span>
        </button>

        {/* Nội dung danh sách chọn vai trò (khi mở rộng) */}
        {isExpanded && (
          <div className="p-3 space-y-3 w-[290px] border-t border-white/[0.08] animate-in fade-in duration-150">
            <p className="text-[11px] text-zinc-400 leading-snug">
              Chuyển nhanh vai trò để kiểm tra giao diện Navbar, Sidebar và trang nội dung:
            </p>

            {/* 3 Nút chọn vai trò */}
            <div className="grid grid-cols-3 gap-1.5">
              {/* Nút Khách */}
              <button
                type="button"
                onClick={() => handleSelectRole("guest")}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                  currentRole === "guest"
                    ? "bg-zinc-700/50 border-zinc-400 text-white shadow-sm"
                    : "bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <UserX className="size-4 mb-1 text-zinc-400" />
                <span>Khách</span>
              </button>

              {/* Nút Người Dùng */}
              <button
                type="button"
                onClick={() => handleSelectRole("user")}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                  currentRole === "user"
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/10"
                    : "bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.06] hover:text-cyan-300"
                }`}
              >
                <UserIcon className="size-4 mb-1 text-cyan-400" />
                <span>Người Dùng</span>
              </button>

              {/* Nút Admin */}
              <button
                type="button"
                onClick={() => handleSelectRole("admin")}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                  currentRole === "admin"
                    ? "bg-violet-500/25 border-violet-400 text-violet-200 shadow-sm shadow-violet-500/15"
                    : "bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.06] hover:text-violet-300"
                }`}
              >
                <ShieldCheck className="size-4 mb-1 text-violet-400" />
                <span>Admin</span>
              </button>
            </div>

            {/* Phím tắt chuyển nhanh đến các trang quan trọng */}
            <div className="pt-2 border-t border-white/[0.06] space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Layers className="size-3" /> Đường dẫn nhanh:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Link
                  href={`${prefix}`}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-white/10 text-zinc-300 hover:text-white transition"
                >
                  Trang chủ
                </Link>
                <Link
                  href={`${prefix}/library`}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-white/10 text-zinc-300 hover:text-white transition"
                >
                  Thư viện
                </Link>
                <Link
                  href={`${prefix}/orders`}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-white/10 text-zinc-300 hover:text-white transition"
                >
                  Đơn hàng
                </Link>
                <Link
                  href={`${prefix}/admin`}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 transition font-medium"
                >
                  Bảng Admin <ExternalLink className="size-2.5" />
                </Link>
              </div>
            </div>

            <p className="text-[9px] text-zinc-500 italic text-center pt-1 border-t border-white/[0.04]">
              Chỉ dùng cho mục đích xem trước UI (xem file DEMO_ROLE_SWITCHER.md để xóa)
            </p>
          </div>
        )}

      </div>
    </aside>
  );
}

