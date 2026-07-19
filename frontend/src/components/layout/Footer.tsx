"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, MessageSquare, Gamepad, ShieldCheck, CreditCard, Heart, Code } from "lucide-react";

export function Footer() {
  const locale = useLocale();
  const pathname = usePathname();
  const isVi = locale === "vi";
  
  if (pathname?.endsWith("/ai-chat")) {
    return null;
  }

  return (
    <footer className="w-full border-t border-white/5 bg-zinc-900/30 backdrop-blur-md mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
          {/* Brand Info */}
          <div className="space-y-4 col-span-2 md:col-span-1">
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500 bg-clip-text text-xl font-black tracking-wider text-transparent uppercase">
                GameVault
              </span>
            </Link>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs font-normal">
              {isVi
                ? "Nền tảng phân phối game bản quyền hàng đầu, cung cấp các sản phẩm chất lượng cao, chơi thử trực tiếp trên trình duyệt WebGL và hỗ trợ thanh toán QR tự động siêu tốc."
                : "The leading digital game store providing high-quality games, live browser WebGL demos, and ultra-fast automated bank transfer QR checkouts."}
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-4 pt-2">
              <a href="#" className="text-zinc-500 hover:text-white transition-colors duration-200" title="Steam">
                <Gamepad className="size-4.5" />
              </a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors duration-200" title="Discord">
                <MessageSquare className="size-4.5" />
              </a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors duration-200" title="Source Code">
                <Code className="size-4.5" />
              </a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors duration-200" title="Website">
                <Globe className="size-4.5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-300">
              {isVi ? "Cửa Hàng" : "Storefront"}
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400 font-medium">
              <li>
                <Link href={`/${locale}`} className="hover:text-violet-400 transition-colors">
                  {isVi ? "Trang chủ" : "Home"}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/games`} className="hover:text-violet-400 transition-colors">
                  {isVi ? "Khám phá Game" : "Browse Games"}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/ai-chat`} className="hover:text-violet-400 transition-colors">
                  {isVi ? "Trò chuyện AI" : "AI Assistant"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support & Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-300">
              {isVi ? "Điều Khoản & Hỗ Trợ" : "Support & Policies"}
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400 font-medium">
              <li>
                <Link href={`/${locale}/support/refund`} className="hover:text-violet-400 transition-colors">
                  {isVi ? "Chính sách hoàn tiền" : "Refund Policy"}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/support/terms`} className="hover:text-violet-400 transition-colors">
                  {isVi ? "Điều khoản dịch vụ" : "Terms of Service"}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/support/privacy`} className="hover:text-violet-400 transition-colors">
                  {isVi ? "Chính sách bảo mật" : "Privacy Policy"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-300">
              {isVi ? "Tài Khoản" : "User Portal"}
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400 font-medium">
              <li>
                <Link href={`/${locale}/library`} className="hover:text-violet-400 transition-colors">
                  {isVi ? "Thư viện game" : "My Library"}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/orders`} className="hover:text-violet-400 transition-colors">
                  {isVi ? "Lịch sử mua hàng" : "Purchase History"}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/wishlist`} className="hover:text-violet-400 transition-colors">
                  {isVi ? "Danh sách yêu thích" : "Wishlist"}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Separator line */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright Info */}
          <div className="text-[11px] text-zinc-500 flex flex-wrap items-center justify-center md:justify-start gap-x-1.5 gap-y-1 text-center md:text-left">
            <span>&copy; {new Date().getFullYear()} GameVault Store.</span>
            <span>{isVi ? "Bảo lưu mọi quyền." : "All rights reserved."}</span>
            <span className="mx-1 hidden md:inline">|</span>
            <div className="flex items-center gap-1 justify-center">
              <span>
                {isVi ? "Thiết kế bởi" : "Designed by"}
              </span>
              <span>Team GameVault.</span>
              <Heart className="size-3 text-red-500 fill-red-500 inline animate-pulse" />
            </div>
          </div>

          {/* Safe Payments Badges */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-500 font-medium">
            <span className="flex items-center gap-1 text-zinc-400">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              {isVi ? "Thanh toán QR tự động" : "Automated QR Pay"}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
