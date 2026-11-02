"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

export default function PrivacyPolicyPage() {
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
          <Lock className="size-3.5" />
          <span>{isVi ? "Bảo vệ thông tin" : "Data Protection"}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          {isVi ? "Chính Sách Bảo Mật" : "Privacy Policy"}
        </h1>
        <p className="text-xs text-zinc-500">
          {isVi ? "Cam kết bảo mật dữ liệu và quyền riêng tư cá nhân của người dùng tại Game Vault." : "Commitment to personal data privacy and digital security at Game Vault."}
        </p>
      </div>
      
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-6 sm:p-8 space-y-6 text-sm text-zinc-300 leading-relaxed shadow-xl">
        {isVi ? (
          <>
            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">1</span>
                Thông tin chúng tôi thu thập
              </h2>
              <p className="text-zinc-400">Game Vault thu thập các thông tin tối giản nhằm cung cấp dịch vụ tốt nhất bao gồm:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
                <li>Địa chỉ Email, Họ và tên (để nhận diện tài khoản và gửi hóa đơn mua hàng).</li>
                <li>Lịch sử mua hàng và danh sách game sở hữu.</li>
                <li>Thời gian chơi thử WebGL Demo và số lượt tải game xuống để tối ưu hóa máy chủ.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">2</span>
                Quyền riêng tư về Thư viện và Lịch sử mua hàng
              </h2>
              <p className="text-zinc-400">Chúng tôi cung cấp các tính năng bảo vệ quyền riêng tư cá nhân của bạn trong trang quản lý hồ sơ (Profile Settings):</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
                <li><strong className="text-white">Chế độ thư viện game</strong>: Bạn có quyền bật/tắt công khai thư viện game của mình với người dùng khác.</li>
                <li><strong className="text-white">Chế độ lịch sử mua hàng</strong>: Bạn có quyền ẩn lịch sử giao dịch khỏi hồ sơ công khai của mình.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">3</span>
                Dữ liệu của bạn được bảo vệ thế nào?
              </h2>
              <p className="text-zinc-400">Mật khẩu của bạn được mã hóa một chiều bằng thuật toán băm bảo mật BCrypt trước khi lưu trữ vào cơ sở dữ liệu. Chúng tôi cam kết tuyệt đối không bán hoặc chia sẻ thông tin cá nhân của bạn cho bên thứ ba vì mục đích tiếp thị.</p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">1</span>
                Information We Collect
              </h2>
              <p className="text-zinc-400">Game Vault collects minimal data required to serve game distributions and automated transactions:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
                <li>Email address and Full Name (for account mapping and order invoice deliveries).</li>
                <li>Purchase history and owned library games.</li>
                <li>WebGL Demo playtime statistics and file download count tracking.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">2</span>
                Library and Purchase Privacy Options
              </h2>
              <p className="text-zinc-400">We respect your privacy. You can configure your profile visibility inside Profile Settings:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
                <li><strong className="text-white">Public Library</strong>: Control whether other users can view your owned games.</li>
                <li><strong className="text-white">Public Purchases</strong>: Choose to hide or reveal your purchase history on your public profile.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">3</span>
                Encryption & Protection
              </h2>
              <p className="text-zinc-400">Passwords are securely hashed using BCrypt algorithms before storing in database records. We do not sell or lease user data to third-party advertisers.</p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
