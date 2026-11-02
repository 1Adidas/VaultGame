"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Zap, Headphones } from "lucide-react";

export function Footer() {
  const locale = useLocale();
  const pathname = usePathname();
  const isVi = locale === "vi";
  const isZh = locale === "zh";

  return (
    <footer className="w-full border-t border-white/[0.07] bg-[#080B11] mt-auto">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          
          {/* Brand & Commercial Intro */}
          <div className="space-y-3 col-span-2 md:col-span-1">
            <Link href={`/${locale}`} className="text-base font-bold text-white tracking-tight">
              Game Vault
            </Link>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
              {isVi
                ? "Nền tảng phân phối trò chơi bản quyền hàng đầu. Khám phá hàng trăm tựa game đỉnh cao, chơi thử trực tiếp trên trình duyệt và nhận game ngay lập tức."
                : isZh
                ? "领先的正版数字游戏分发平台。探索海量精品大作，支持浏览器即时免下载试玩，极速交付到库。"
                : "The premier digital game distribution platform. Discover high-caliber titles, instant playable browser demos, and instant delivery."}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              {isVi ? "Cửa Hàng" : isZh ? "游戏商城" : "Storefront"}
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li><Link href={`/${locale}`} className="hover:text-white transition-colors">{isVi ? "Trang chủ" : isZh ? "首页" : "Home"}</Link></li>
              <li><Link href={`/${locale}/games`} className="hover:text-white transition-colors">{isVi ? "Tất cả trò chơi" : isZh ? "所有游戏" : "Browse All"}</Link></li>
              <li><Link href={`/${locale}/games?discounted=true`} className="hover:text-white transition-colors">{isVi ? "Ưu đãi giảm giá" : isZh ? "特惠促销" : "Special Deals"}</Link></li>
            </ul>
          </div>

          {/* Member Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              {isVi ? "Tài Khoản" : isZh ? "用户中心" : "Account"}
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li><Link href={`/${locale}/library`} className="hover:text-white transition-colors">{isVi ? "Thư viện game" : isZh ? "我的游戏库" : "My Library"}</Link></li>
              <li><Link href={`/${locale}/orders`} className="hover:text-white transition-colors">{isVi ? "Lịch sử mua hàng" : isZh ? "购买记录" : "Order History"}</Link></li>
              <li><Link href={`/${locale}/wishlist`} className="hover:text-white transition-colors">{isVi ? "Danh sách yêu thích" : isZh ? "愿望单" : "Wishlist"}</Link></li>
            </ul>
          </div>

          {/* Commercial Standards & Trust */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              {isVi ? "Dịch Vụ & Bảo Hành" : isZh ? "服务与品质保障" : "Guarantees"}
            </h4>
            <div className="space-y-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-zinc-300 flex-shrink-0" />
                <span>{isVi ? "Bản quyền chính hãng 100%" : isZh ? "100% 正版官方数字授权" : "100% Genuine Digital License"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="size-3.5 text-zinc-300 flex-shrink-0" />
                <span>{isVi ? "Kích hoạt game tức thì" : isZh ? "极速即时激活入库" : "Instant Game Activation"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Headphones className="size-3.5 text-zinc-300 flex-shrink-0" />
                <span>{isVi ? "Hỗ trợ khách hàng 24/7" : isZh ? "24/7 全天候客户支持" : "24/7 Customer Support"}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Commercial Bottom Legal Credits */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/[0.06] pt-8 text-[11px] text-zinc-500 gap-4">
          <p>© 2026 Game Vault Corporation. {isVi ? "Tất cả các quyền được bảo lưu." : isZh ? "版权所有，保留一切权利。" : "All rights reserved."}</p>
          <div className="flex items-center gap-6 text-zinc-500">
            <Link href={`/${locale}/support/terms`} className="hover:text-zinc-400 transition-colors">
              {isVi ? "Điều khoản dịch vụ" : isZh ? "服务条款" : "Terms of Service"}
            </Link>
            <span>•</span>
            <Link href={`/${locale}/support/privacy`} className="hover:text-zinc-400 transition-colors">
              {isVi ? "Chính sách bảo mật" : isZh ? "隐私政策" : "Privacy Policy"}
            </Link>
            <span>•</span>
            <Link href={`/${locale}/support/refund`} className="hover:text-zinc-400 transition-colors">
              {isVi ? "Chính sách hoàn tiền" : isZh ? "退款政策" : "Refund Policy"}
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
