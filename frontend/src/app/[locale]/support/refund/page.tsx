"use client";

import { useLocale } from "next-intl";
import { Card } from "@/components/ui/button";

export default function RefundPolicyPage() {
  const locale = useLocale();
  const isVi = locale === "vi";

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
        {isVi ? "Chính Sách Hoàn Tiền" : "Refund Policy"}
      </h1>
      
      <Card className="p-6 md:p-8 bg-zinc-900/60 border-zinc-800 backdrop-blur-md space-y-6 text-sm text-zinc-300 leading-relaxed">
        {isVi ? (
          <>
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. Điều kiện yêu cầu hoàn tiền</h2>
              <p>Khách hàng có quyền gửi yêu cầu hủy đơn hàng và nhận hoàn tiền đối với các tựa game đã mua nếu thỏa mãn các điều kiện sau:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Yêu cầu được gửi trong vòng <strong>14 ngày</strong> kể từ ngày mua (đây là tiêu chuẩn vàng của các nền tảng phân phối game bản quyền hàng đầu như Steam hay Epic Games Store).</li>
                <li>Tựa game chưa được người mua thực hiện tải xuống tệp cài đặt (Game Files).</li>
                <li>Trong trường hợp game đã được tải xuống, yêu cầu hoàn tiền sẽ được Admin xem xét duyệt thủ công dựa trên lý do bạn cung cấp (do hệ thống không thể tự động đo lường thời gian chơi game offline trên máy tính cá nhân của bạn).</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">2. Quy trình gửi và xử lý yêu cầu</h2>
              <p>Quy trình hủy đơn hàng được thực hiện khép kín ngay trên hệ thống:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Gửi yêu cầu</strong>: Truy cập trang Lịch sử mua hàng, chọn đơn hàng cần hủy, nhấn "Gửi yêu cầu hỗ trợ hoàn tiền" và nhập lý do.</li>
                <li><strong>Trạng thái chờ duyệt</strong>: Trạng thái đơn hàng sẽ chuyển sang "Chờ duyệt hủy".</li>
                <li><strong>Admin phê duyệt/từ chối</strong>: Quản trị viên của GameVault sẽ xem xét lý do của bạn để quyết định Chấp nhận hoặc Từ chối yêu cầu.</li>
                <li><strong>Thông báo kết quả</strong>: Kết quả duyệt cùng lời nhắn phản hồi của Admin sẽ được gửi qua hệ thống thông báo in-app và email của bạn.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. Thu hồi game sau khi hoàn tiền</h2>
              <p>Khi yêu cầu hủy đơn được phê duyệt thành công:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Các tựa game thuộc đơn hàng bị hủy sẽ ngay lập tức được thu hồi và tự động xóa khỏi Thư viện game sở hữu của bạn.</li>
                <li>Số tiền thanh toán sẽ được hoàn trả lại cho bạn theo phương thức thỏa thuận.</li>
              </ul>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">1. Refund Eligibility</h2>
              <p>Customers have the right to request a refund and order cancellation for purchased games under the following conditions:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>The request is submitted within <strong>14 days</strong> of the purchase date (matching the industry standard of major platforms like Steam and Epic Games).</li>
                <li>The game installation files have not been downloaded yet.</li>
                <li>If the game has already been downloaded, the request will be subject to manual review and approval by GameVault administrators based on specific circumstances (since offline playtime cannot be automatically tracked after file download).</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">2. Process & Approvals</h2>
              <p>Order cancellation requests are processed directly within the GameVault portal:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Submit</strong>: Navigate to Purchase History, select your order, click "Request Cancellation & Refund" and specify your reason.</li>
                <li><strong>Pending State</strong>: Your order status changes to "Cancellation Pending".</li>
                <li><strong>Admin Review</strong>: GameVault administrators will inspect the request and choose to Approve or Reject it.</li>
                <li><strong>Feedback</strong>: You will receive real-time in-app notifications and email updates regarding the decision and the admin's note.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white">3. Game Revocation</h2>
              <p>Upon successful cancellation approval:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>The purchased games in the cancelled order will be immediately revoked and removed from your Game Library.</li>
                <li>The order payment will be refunded to you based on the configured payment settlement.</li>
              </ul>
            </section>
          </>
        )}
      </Card>
    </div>
  );
}
