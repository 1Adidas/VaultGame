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

export default function HelpTab() {
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


