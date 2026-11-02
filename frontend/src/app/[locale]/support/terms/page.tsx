"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";

export default function TermsOfServicePage() {
  const locale = useLocale();
  const isVi = locale === "vi";

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8 px-4">
      <Link 
        href={`/${locale}/support`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        <span>{isVi ? "Quay lại Trung tâm hỗ trợ" : "Back to Support Hub"}</span>
      </Link>

      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs font-semibold text-zinc-300">
          <FileText className="size-3.5" />
          <span>{isVi ? "Quy định & Thỏa thuận" : "Legal & Agreement"}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          {isVi ? "Điều Khoản Dịch Vụ" : "Terms of Service"}
        </h1>
        <p className="text-xs text-zinc-500">
          {isVi ? "Cập nhật lần cuối: Tháng 10, 2026 • Áp dụng cho mọi tài khoản trên Game Vault" : "Last updated: October 2026 • Applies to all Game Vault accounts"}
        </p>
      </div>
      
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-6 sm:p-8 space-y-6 text-sm text-zinc-300 leading-relaxed shadow-xl">
        {isVi ? (
          <>
            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">1</span>
                Chấp thuận điều khoản
              </h2>
              <p className="text-zinc-400">Chào mừng bạn đến với Game Vault. Bằng việc đăng ký tài khoản, truy cập hoặc sử dụng trang web của chúng tôi, bạn đồng ý tuân thủ và chịu sự ràng buộc bởi các điều khoản này.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">2</span>
                Tài khoản người dùng
              </h2>
              <p className="text-zinc-400">Bạn có trách nhiệm bảo mật thông tin đăng nhập và quản lý mọi hoạt động diễn ra dưới tài khoản của mình. Việc chia sẻ tài khoản cho người khác sử dụng trái phép có thể dẫn đến việc khóa tài khoản vĩnh viễn.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">3</span>
                Bản quyền game và Live WebGL Demo
              </h2>
              <p className="text-zinc-400">Mọi nội dung bao gồm mã nguồn game, bản chơi thử WebGL Demo, hình ảnh, âm thanh, video trên cửa hàng đều thuộc bản quyền của Game Vault hoặc đối tác phân phối. Bạn không được sao chép, trích xuất, hoặc phân phối lại các nội dung này dưới mọi hình thức thương mại.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">4</span>
                Quy chế giao dịch và thanh toán
              </h2>
              <p className="text-zinc-400">Các giao dịch mua game được thực hiện thông qua hình thức chuyển khoản ngân hàng bằng mã QR tự động (VietQR). Sau khi ngân hàng xác nhận, game sẽ được thêm vào thư viện của bạn ngay lập tức.</p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">1</span>
                Acceptance of Terms
              </h2>
              <p className="text-zinc-400">Welcome to Game Vault. By creating an account, browsing, or using our storefront services, you agree to comply with and be bound by these Terms of Service.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">2</span>
                User Account Responsibilities
              </h2>
              <p className="text-zinc-400">You are solely responsible for keeping your password secure and managing all activities under your account. Unauthorized sharing of user accounts may result in suspension or termination.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">3</span>
                Intellectual Property & Demos
              </h2>
              <p className="text-zinc-400">All assets including game binaries, WebGL Demos, screenshots, videos, and titles are protected under copyright laws. Redistribution, cracking, or commercial reverse engineering is strictly prohibited.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">4</span>
                Payment and Transactions
              </h2>
              <p className="text-zinc-400">All checkout transactions are completed via automated bank transfer QR codes (VietQR). Games will be unlocked and added to your library as soon as the bank notification is verified.</p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
