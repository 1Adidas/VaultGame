"use client";

import { useLocale } from "next-intl";
import { Card } from "@/components/ui/button";

export default function TermsOfServicePage() {
  const locale = useLocale();
  const isVi = locale === "vi";

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
        {isVi ? "Điều Khoản Dịch Vụ" : "Terms of Service"}
      </h1>
      
      <Card className="p-6 md:p-8 bg-zinc-900/60 border-zinc-800 backdrop-blur-md space-y-6 text-sm text-zinc-300 leading-relaxed">
        {isVi ? (
          <>
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. Chấp thuận điều khoản</h2>
              <p>Chào mừng bạn đến với GameVault. Bằng việc đăng ký tài khoản, truy cập hoặc sử dụng trang web của chúng tôi, bạn đồng ý tuân thủ và chịu sự ràng buộc bởi các điều khoản này.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">2. Tài khoản người dùng</h2>
              <p>Bạn có trách nhiệm bảo mật thông tin đăng nhập và quản lý mọi hoạt động diễn ra dưới tài khoản của mình. Việc chia sẻ tài khoản cho người khác sử dụng trái phép có thể dẫn đến việc khóa tài khoản vĩnh viễn.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. Bản quyền game và Live WebGL Demo</h2>
              <p>Mọi nội dung bao gồm mã nguồn game, bản chơi thử WebGL Demo, hình ảnh, âm thanh, video trên cửa hàng đều thuộc bản quyền của GameVault hoặc đối tác phân phối. Bạn không được sao chép, trích xuất, hoặc phân phối lại các nội dung này dưới mọi hình thức thương mại.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">4. Quy chế giao dịch và thanh toán</h2>
              <p>Các giao dịch mua game được thực hiện thông qua hình thức chuyển khoản ngân hàng bằng mã QR tự động (SePay). Sau khi ngân hàng xác nhận, game sẽ được thêm vào thư viện của bạn ngay lập tức.</p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. Acceptance of Terms</h2>
              <p>Welcome to GameVault. By creating an account, browsing, or using our storefront services, you agree to comply with and be bound by these Terms of Service.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">2. User Account Responsibilities</h2>
              <p>You are solely responsible for keeping your password secure and managing all activities under your account. Unauthorized sharing of user accounts may result in suspension or termination.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. Intellectual Property & Demos</h2>
              <p>All assets including game binaries, WebGL Demos, screenshots, videos, and titles are protected under copyright laws. Redistribution, cracking, or commercial reverse engineering is strictly prohibited.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">4. Payment and Transactions</h2>
              <p>All checkout transactions are completed via automated bank transfer QR codes (SePay). Games will be unlocked and added to your library as soon as the bank notification is verified.</p>
            </section>
          </>
        )}
      </Card>
    </div>
  );
}
