"use client";

import { useLocale } from "next-intl";
import { Card } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
  const locale = useLocale();
  const isVi = locale === "vi";

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
        {isVi ? "Chính Sách Bảo Mật" : "Privacy Policy"}
      </h1>
      
      <Card className="p-6 md:p-8 bg-zinc-900/60 border-zinc-800 backdrop-blur-md space-y-6 text-sm text-zinc-300 leading-relaxed">
        {isVi ? (
          <>
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. Thông tin chúng tôi thu thập</h2>
              <p>GameVault thu thập các thông tin tối giản nhằm cung cấp dịch vụ tốt nhất bao gồm:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Địa chỉ Email, Họ và tên (để nhận diện tài khoản và gửi hóa đơn mua hàng).</li>
                <li>Lịch sử mua hàng và danh sách game sở hữu.</li>
                <li>Thời gian chơi thử WebGL Demo và số lượt tải game xuống để tối ưu hóa máy chủ.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">2. Quyền riêng tư về Thư viện và Lịch sử mua hàng</h2>
              <p>Chúng tôi cung cấp các tính năng bảo vệ quyền riêng tư cá nhân của bạn trong trang quản lý hồ sơ (Profile Settings):</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Chế độ thư viện game (`IsLibraryPublic`)</strong>: Bạn có quyền bật/tắt công khai thư viện game của mình với người dùng khác.</li>
                <li><strong>Chế độ lịch sử mua hàng (`IsPurchaseHistoryPublic`)</strong>: Bạn có quyền ẩn lịch sử giao dịch khỏi hồ sơ công khai của mình.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. Dữ liệu của bạn được bảo vệ thế nào?</h2>
              <p>Mật khẩu của bạn được mã hóa một chiều bằng thuật toán băm bảo mật BCrypt trước khi lưu trữ vào cơ sở dữ liệu. Chúng tôi cam kết không bán hoặc chia sẻ thông tin cá nhân của bạn cho bên thứ ba vì mục đích tiếp thị.</p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. Information We Collect</h2>
              <p>GameVault collects minimal data required to serve game distributions and automated transactions:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Email address and Full Name (for account mapping and order invoice deliveries).</li>
                <li>Purchase history and owned library games.</li>
                <li>WebGL Demo playtime statistics and file download count tracking.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">2. Library and Purchase Privacy Options</h2>
              <p>We respect your privacy. You can configure your profile visibility inside Profile Settings:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Public Library (`IsLibraryPublic`)</strong>: Control whether other users can view your owned games.</li>
                <li><strong>Public Purchases (`IsPurchaseHistoryPublic`)</strong>: Choose to hide or reveal your purchase history on your public profile.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. Encryption & Protection</h2>
              <p>Passwords are securely hashed using BCrypt algorithms before storing in database records. We do not sell or lease user data to third-party advertisers.</p>
            </section>
          </>
        )}
      </Card>
    </div>
  );
}
