"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";

export default function RefundPolicyPage() {
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
          <RotateCcw className="size-3.5" />
          <span>{isVi ? "Quyền lợi khách hàng" : "Buyer Protection"}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          {isVi ? "Chính Sách Hoàn Tiền" : "Refund Policy"}
        </h1>
        <p className="text-xs text-zinc-500">
          {isVi ? "Tiêu chuẩn bảo vệ quyền lợi người mua minh bạch và tự động hóa tại Game Vault." : "Transparent and automated buyer protection standards at Game Vault."}
        </p>
      </div>
      
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-6 sm:p-8 space-y-6 text-sm text-zinc-300 leading-relaxed shadow-xl">
        {isVi ? (
          <>
            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">1</span>
                Điều kiện yêu cầu hoàn tiền
              </h2>
              <p className="text-zinc-400">Khách hàng có quyền gửi yêu cầu hủy đơn hàng và nhận hoàn tiền đối với các tựa game đã mua nếu thỏa mãn các điều kiện sau:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
                <li>Yêu cầu được gửi trong vòng <strong className="text-white">14 ngày</strong> kể từ ngày thanh toán đơn hàng.</li>
                <li>Tựa game chưa được người mua thực hiện tải xuống tệp cài đặt (Game Files).</li>
                <li>Trong trường hợp game đã được tải xuống, yêu cầu hoàn tiền sẽ được xem xét duyệt thủ công dựa trên lý do bạn cung cấp.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">2</span>
                Quy trình gửi và xử lý yêu cầu
              </h2>
              <p className="text-zinc-400">Quy trình hủy đơn hàng được thực hiện khép kín ngay trên hệ thống Game Vault:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
                <li><strong className="text-white">Gửi yêu cầu</strong>: Truy cập trang Lịch sử mua hàng, chọn đơn hàng cần hủy, nhấn "Gửi yêu cầu hỗ trợ hoàn tiền" và nhập lý do.</li>
                <li><strong className="text-white">Trạng thái chờ duyệt</strong>: Trạng thái đơn hàng sẽ chuyển sang "Chờ duyệt hủy".</li>
                <li><strong className="text-white">Kiểm duyệt</strong>: Đội ngũ quản trị viên Game Vault sẽ xem xét lý do của bạn để quyết định Chấp nhận hoặc Từ chối yêu cầu.</li>
                <li><strong className="text-white">Thông báo kết quả</strong>: Kết quả duyệt cùng lời nhắn phản hồi sẽ được gửi qua thông báo in-app và email của bạn.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">3</span>
                Thu hồi game sau khi hoàn tiền
              </h2>
              <p className="text-zinc-400">Khi yêu cầu hủy đơn được phê duyệt thành công:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
                <li>Các tựa game thuộc đơn hàng bị hủy sẽ ngay lập tức được thu hồi và tự động xóa khỏi Thư viện game sở hữu của bạn.</li>
                <li>Số tiền thanh toán sẽ được hoàn trả lại cho bạn theo phương thức thỏa thuận.</li>
              </ul>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">1</span>
                Refund Eligibility
              </h2>
              <p className="text-zinc-400">Customers have the right to request a refund and order cancellation for purchased games under the following conditions:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
                <li>The request is submitted within <strong className="text-white">14 days</strong> of the purchase date.</li>
                <li>The game installation files have not been downloaded yet.</li>
                <li>If the game has already been downloaded, the request will be subject to manual review and approval by Game Vault administrators based on specific circumstances.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">2</span>
                Process & Approvals
              </h2>
              <p className="text-zinc-400">Order cancellation requests are processed directly within the Game Vault portal:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
                <li><strong className="text-white">Submit</strong>: Navigate to Purchase History, select your order, click "Request Cancellation & Refund" and specify your reason.</li>
                <li><strong className="text-white">Pending State</strong>: Your order status changes to "Cancellation Pending".</li>
                <li><strong className="text-white">Admin Review</strong>: Game Vault administrators will inspect the request and choose to Approve or Reject it.</li>
                <li><strong className="text-white">Feedback</strong>: You will receive real-time updates regarding the decision and the admin's note.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="size-5 rounded-full bg-white/10 text-[11px] flex items-center justify-center font-bold">3</span>
                Game Revocation
              </h2>
              <p className="text-zinc-400">Upon successful cancellation approval:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
                <li>The purchased games in the cancelled order will be immediately revoked and removed from your Game Library.</li>
                <li>The order payment will be refunded to you based on the configured settlement.</li>
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
