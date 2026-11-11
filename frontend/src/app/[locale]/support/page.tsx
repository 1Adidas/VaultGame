"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import { 
  ShieldCheck, 
  HelpCircle, 
  FileText, 
  RotateCcw, 
  Lock, 
  Mail, 
  ChevronRight, 
  Zap, 
  Gamepad2 
} from "lucide-react";
import { useState } from "react";

export default function SupportHubPage() {
  const locale = useLocale();
  const isVi = locale === "vi";
  const isZh = locale === "zh";

  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: isVi
        ? "Làm sao để kích hoạt và tải game sau khi mua?"
        : isZh
          ? "购买后如何激活并下载游戏？"
          : "How do I activate and download games after purchase?",
      a: isVi 
        ? "Ngay sau khi giao dịch thành công qua VietQR hoặc nhận game miễn phí, trò chơi sẽ được tự động thêm vào 'Thư viện game' của bạn ngay lập tức. Bạn chỉ cần vào Thư viện và bấm nút 'Tải game'." 
        : isZh
          ? "通过 VietQR 支付成功或领取免费游戏后，该游戏会立即自动加入您的“游戏库”。您只需前往游戏库并点击“下载游戏”按钮即可。"
          : "Immediately after successful payment via VietQR or claiming a free game, the title is added to your 'My Library' instantaneously. Just visit your Library and click 'Download'."
    },
    {
      q: isVi
        ? "Bản chơi thử WebGL Demo hoạt động thế nào?"
        : isZh
          ? "WebGL 网页试玩版是如何运行的？"
          : "How does the WebGL Demo work?",
      a: isVi 
        ? "Game Vault tích hợp công nghệ WebGL đa nền tảng (Unity, Godot, HTML5) trực tiếp trên trình duyệt. Bạn có thể chơi thử trò chơi ngay trên trang chi tiết mà không cần tải hay cài đặt bất kỳ file nào." 
        : isZh
          ? "Game Vault 直接在浏览器中集成了多引擎 WebGL 技术（Unity、Godot、HTML5）。您可以在游戏详情页直接免下载试玩，无需安装任何额外文件。"
          : "Game Vault embeds multi-engine WebGL (Unity, Godot, HTML5) directly in your browser. You can play game demos right on the game page without downloading or installing anything."
    },
    {
      q: isVi
        ? "Chính sách hoàn tiền của Game Vault như thế nào?"
        : isZh
          ? "Game Vault 的退款政策是怎样的？"
          : "What is Game Vault's refund policy?",
      a: isVi 
        ? "Bạn có thể gửi yêu cầu hủy đơn và hoàn tiền trong mục 'Lịch sử mua hàng'. Chúng tôi hỗ trợ hoàn tiền nhanh chóng cho các đơn hàng chưa tải file game hoặc phát sinh sự cố kỹ thuật." 
        : isZh
          ? "您可以在“历史订单”中提交取消订单与退款申请。对于尚未下载游戏文件或遇到技术故障的订单，我们将尽快为您处理退款。"
          : "You can submit cancellation and refund requests in 'Order History'. We offer prompt refunds for orders that haven't been downloaded or experienced technical issues."
    },
    {
      q: isVi
        ? "Thanh toán qua mã VietQR có an toàn không?"
        : isZh
          ? "使用 VietQR 二维码付款是否安全且自动化？"
          : "Is VietQR payment safe and automated?",
      a: isVi 
        ? "Hệ thống kết nối cổng ngân hàng tự động với mã QR động và nội dung chuyển khoản riêng biệt. Khi bạn chuyển khoản đúng số tiền và nội dung, đơn hàng được kích hoạt tự động trong vòng 5-10 giây." 
        : isZh
          ? "系统通过动态二维码与专属转账备注直接对接银行网关。只要您转账金额与备注完全一致，订单会在 5-10 秒内自动激活。"
          : "Our system connects to banking gateways with dynamic VietQR codes and unique transaction notes. Your order activates automatically within 5-10 seconds upon payment."
    }
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 space-y-16">
      
      {/* Header Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-semibold text-zinc-300 backdrop-blur-md">
          <HelpCircle className="size-3.5 text-zinc-300" />
          <span>{isVi ? "Trung Tâm Trợ Giúp & Hỗ Trợ" : isZh ? "帮助与客服中心" : "Help & Support Center"}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          {isVi ? "Chúng tôi có thể giúp gì cho bạn?" : isZh ? "今天有什么可以帮您的？" : "How can we assist you today?"}
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
          {isVi
            ? "Tìm câu trả lời nhanh chóng về tài khoản, phương thức thanh toán, chính sách hoàn tiền hoặc liên hệ trực tiếp với đội ngũ hỗ trợ Game Vault."
            : isZh
              ? "快速查找关于账号、付款方式、退款政策的常见解答，或直接联系 Game Vault 客服与技术团队。"
              : "Find quick answers regarding accounts, payment methods, refund policies, or reach out directly to the Game Vault support team."}
        </p>
      </div>

      {/* Policy & Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Refund Policy */}
        <Link 
          href={`/${locale}/support/refund`}
          className="group rounded-2xl border border-white/[0.08] bg-[#0E131E] p-6 transition-all duration-300 hover:border-white/25 hover:bg-[#141B2B] hover:-translate-y-1 flex flex-col justify-between shadow-xl"
        >
          <div className="space-y-4">
            <div className="size-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-200 group-hover:scale-105 transition-transform">
              <RotateCcw className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-zinc-100 transition-colors">
                {isVi ? "Chính sách hoàn tiền" : isZh ? "退款政策" : "Refund Policy"}
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                {isVi 
                  ? "Điều kiện và quy trình yêu cầu hủy đơn hàng, hoàn trả tiền khi gặp sự cố." 
                  : isZh
                    ? "遇到故障或问题时的订单取消条件与退款流程指南。"
                    : "Terms and procedures for order cancellation and refund requests."}
              </p>
            </div>
          </div>
          <div className="pt-6 flex items-center gap-1.5 text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
            <span>{isVi ? "Xem chi tiết" : isZh ? "查看详情" : "Read policy"}</span>
            <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Terms of Service */}
        <Link 
          href={`/${locale}/support/terms`}
          className="group rounded-2xl border border-white/[0.08] bg-[#0E131E] p-6 transition-all duration-300 hover:border-white/25 hover:bg-[#141B2B] hover:-translate-y-1 flex flex-col justify-between shadow-xl"
        >
          <div className="space-y-4">
            <div className="size-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-200 group-hover:scale-105 transition-transform">
              <FileText className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-zinc-100 transition-colors">
                {isVi ? "Điều khoản dịch vụ" : isZh ? "服务条款" : "Terms of Service"}
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                {isVi 
                  ? "Quy định sử dụng dịch vụ phân phối game bản quyền và trách nhiệm người dùng." 
                  : isZh
                    ? "使用正版数字游戏分发平台的服务条款与用户责任规定。"
                    : "Rules for using our digital storefront platform and user obligations."}
              </p>
            </div>
          </div>
          <div className="pt-6 flex items-center gap-1.5 text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
            <span>{isVi ? "Xem chi tiết" : isZh ? "查看条款" : "Read terms"}</span>
            <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Privacy Policy */}
        <Link 
          href={`/${locale}/support/privacy`}
          className="group rounded-2xl border border-white/[0.08] bg-[#0E131E] p-6 transition-all duration-300 hover:border-white/25 hover:bg-[#141B2B] hover:-translate-y-1 flex flex-col justify-between shadow-xl"
        >
          <div className="space-y-4">
            <div className="size-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-200 group-hover:scale-105 transition-transform">
              <Lock className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-zinc-100 transition-colors">
                {isVi ? "Chính sách bảo mật" : isZh ? "隐私政策" : "Privacy Policy"}
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                {isVi 
                  ? "Cam kết bảo vệ dữ liệu cá nhân, thông tin thanh toán và quyền riêng tư của bạn." 
                  : isZh
                    ? "我们保护您的个人数据、支付信息及隐私权的承诺。"
                    : "Our commitment to safeguarding personal data, payments, and your privacy."}
              </p>
            </div>
          </div>
          <div className="pt-6 flex items-center gap-1.5 text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
            <span>{isVi ? "Xem chi tiết" : isZh ? "查看隐私" : "Read privacy"}</span>
            <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

      </div>

      {/* Frequently Asked Questions */}
      <div className="space-y-6">
        <div className="border-b border-white/[0.08] pb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {isVi ? "Câu hỏi thường gặp (FAQ)" : isZh ? "常见问题 (FAQ)" : "Frequently Asked Questions"}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {isVi ? "Các thắc mắc phổ biến nhất của người dùng Game Vault." : isZh ? "Game Vault 玩家最常咨询的常见问题解答。" : "Most common questions from Game Vault community."}
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx}
                className="rounded-xl border border-white/[0.06] bg-[#0E131E] overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-semibold text-white hover:text-zinc-200 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <span className={`text-zinc-400 text-lg transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}>
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-white/[0.04]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Direct Contact & Assistant Dock */}
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#0E131E] via-[#141B2B] to-[#0E131E] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-lg font-bold text-white flex items-center justify-center md:justify-start gap-2.5">
            <span className="size-6 rounded-md bg-cyan-950/70 border border-cyan-500/30 inline-flex items-center justify-center p-0.5">
              <img src="/logo.png" alt="THE VOID" className="size-full object-contain" />
            </span>
            <span>{isVi ? "Cần giải đáp ngay lập tức?" : isZh ? "需要立即解答？" : "Need instant answers?"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg">
            {isVi 
              ? "Bạn có thể hỏi trợ lý THE VOID ở góc dưới màn hình hoặc gửi thư điện tử trực tiếp cho đội ngũ kỹ thuật của chúng tôi." 
              : isZh
                ? "您可以随时咨询右下角的 THE VOID，或直接发送电子邮件联系技术团队。"
                : "Ask THE VOID located at the bottom-right corner or send an inquiry directly to our support team."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`mailto:support@gamevault.com`}>
            <button className="btn-secondary text-xs flex items-center gap-2">
              <Mail className="size-4" />
              <span>support@gamevault.com</span>
            </button>
          </Link>
          <Link href={`/${locale}/games`}>
            <button className="btn-primary text-xs flex items-center gap-2">
              <Gamepad2 className="size-4" />
              <span>{isVi ? "Xem Kho Game" : isZh ? "探索游戏库" : "Explore Games"}</span>
            </button>
          </Link>
        </div>
      </div>

    </div>
  );
}
