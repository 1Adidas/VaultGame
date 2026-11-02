"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { api, type ApiResponse } from "@/lib/api/client";
import { 
  Loader2, 
  RefreshCw, 
  Clock, 
  AlertTriangle, 
  Copy, 
  Check, 
  ShieldCheck, 
  Zap, 
  X,
  CreditCard
} from "lucide-react";

interface Props {
  orderId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function QRPaymentModal({ orderId, onSuccess, onClose }: Props) {
  const t = useTranslations("payment");
  const locale = useLocale();
  const isVi = locale === "vi";
  const isZh = locale === "zh";

  const [payment, setPayment] = useState<{ id: string; qrImageUrl?: string; expiresAt?: string; orderCode?: string; amount?: number } | null>(null);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const [isExpired, setIsExpired] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const startPayment = async () => {
    setLoading(true);
    setIsExpired(false);
    setTimeLeft(180);
    try {
      const { data } = await api.post<ApiResponse<{ id: string; qrImageUrl?: string; expiresAt?: string; orderCode?: string; amount?: number }>>(`/orders/${orderId}/pay`);
      setPayment(data.data);
      
      if (data.data.expiresAt) {
        const expiresTime = new Date(data.data.expiresAt).getTime();
        const now = new Date().getTime();
        const diffSeconds = Math.max(0, Math.floor((expiresTime - now) / 1000));
        if (diffSeconds > 0) {
          setTimeLeft(diffSeconds);
        }
      }

      startPolling(data.data.id);
      startCountdown();

      if (process.env.NEXT_PUBLIC_SEPAY_SIMULATE === "true") {
        setTimeout(async () => {
          try {
            await api.post(`/dev/simulate-payment/${data.data.id}`);
          } catch (error) {
            console.error("Simulated payment failed:", error);
          }
        }, 8000);
      }
    } catch (error) {
      console.error("Payment initiation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    countdownIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startPolling = (paymentId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const { data } = await api.get<ApiResponse<{ status: string }>>(`/payments/${paymentId}/status`);
        if (data.data.status === "Success") {
          setStatus("success");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          onSuccess();
        }
      } catch { /* continue polling */ }
    }, 2000);
  };

  useEffect(() => {
    startPayment();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [orderId]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="max-w-md w-full rounded-3xl border border-white/[0.1] bg-[#0E131E] p-6 sm:p-7 shadow-2xl space-y-6">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <CreditCard className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isVi ? "Thanh Toán VietQR Tự Động" : isZh ? "VietQR 自动扫码支付" : "Automated VietQR Payment"}
              </h3>
              <p className="text-[10px] text-zinc-400">
                {isVi ? "Kích hoạt bản quyền game tức thì" : isZh ? "官方数字授权即时自动入库" : "Instant license activation"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 animate-spin text-white" />
            <p className="text-xs text-zinc-400">
              {isVi ? "Đang tạo mã thanh toán VietQR..." : isZh ? "正在生成动态 VietQR 支付码..." : "Generating dynamic VietQR..."}
            </p>
          </div>
        ) : status === "success" ? (
          <div className="py-10 text-center space-y-3">
            <div className="size-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 text-2xl">
              ✓
            </div>
            <h4 className="text-lg font-bold text-white">
              {isVi ? "Giao Dịch Thành Công!" : isZh ? "交易支付成功！" : "Payment Confirmed!"}
            </h4>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              {isVi ? "Game đã được tự động thêm vào thư viện của bạn." : isZh ? "游戏已自动添加到您的个人游戏库中。" : "The game has been added to your library."}
            </p>
          </div>
        ) : payment?.qrImageUrl ? (
          <div className="flex flex-col items-center gap-5">
            
            {/* Countdown Badge */}
            <div className={`flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-semibold border transition ${
              isExpired
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : timeLeft <= 30
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                : "bg-white/5 text-zinc-300 border-white/10"
            }`}>
              <Clock className="size-3.5" />
              <span>
                {isExpired
                  ? (isVi ? "Mã QR đã hết hạn" : isZh ? "支付二维码已过期" : "QR Code Expired")
                  : `${isVi ? "Thời gian còn lại: " : isZh ? "有效剩余时间: " : "Expires in: "}${formatTimer(timeLeft)}`}
              </span>
            </div>

            {/* QR Image Container */}
            <div className="relative h-60 w-60 rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-white p-2.5 flex items-center justify-center">
              <img
                src={payment.qrImageUrl}
                alt="VietQR Code"
                className={`size-full object-contain transition duration-300 ${isExpired ? "blur-md opacity-20" : ""}`}
              />

              {isExpired && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-[#080B11]/90 backdrop-blur-sm text-center space-y-3">
                  <AlertTriangle className="size-8 text-amber-400" />
                  <p className="text-xs font-bold text-white">
                    {isVi ? "Mã QR đã hết thời gian hiệu lực" : isZh ? "支付码已超过有效支付时间" : "QR Code has expired"}
                  </p>
                  <button
                    onClick={startPayment}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <RefreshCw className="size-3" />
                    <span>{isVi ? "Tạo Mã Mới" : isZh ? "重新生成" : "Generate New"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Transaction Details with Copy Buttons */}
            <div className="w-full rounded-xl bg-[#080B11] border border-white/[0.08] p-3.5 space-y-2.5 text-xs">
              <div className="flex justify-between items-center gap-2">
                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                  {isVi ? "NỘI DUNG CHUYỂN:" : isZh ? "转账附言/备注码:" : "TRANSFER CODE:"}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-white text-xs select-all">
                    {payment.orderCode}
                  </span>
                  <button
                    onClick={() => copyToClipboard(payment.orderCode || "", "code")}
                    className="p-1 text-zinc-400 hover:text-white transition-colors"
                    title={isVi ? "Sao chép" : isZh ? "复制" : "Copy"}
                  >
                    {copiedField === "code" ? (
                      <Check className="size-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center gap-2 pt-1 border-t border-white/[0.04]">
                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                  {isVi ? "SỐ TIỀN THANH TOÁN:" : isZh ? "支付金额:" : "AMOUNT:"}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-emerald-400 text-sm">
                    {payment.amount?.toLocaleString()} VND
                  </span>
                  <button
                    onClick={() => copyToClipboard(String(payment.amount || ""), "amount")}
                    className="p-1 text-zinc-400 hover:text-white transition-colors"
                    title={isVi ? "Sao chép" : isZh ? "复制" : "Copy"}
                  >
                    {copiedField === "amount" ? (
                      <Check className="size-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {!isExpired && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="size-3 text-cyan-400 animate-spin" />
                <span>{isVi ? "Đang chờ hệ thống ngân hàng xác nhận giao dịch..." : isZh ? "正在等待银行清算系统确认入账..." : "Waiting for bank transaction settlement..."}</span>
              </div>
            )}

          </div>
        ) : (
          <div className="py-8 text-center space-y-3">
            <p className="text-xs text-rose-400">
              {isVi ? "Có lỗi xảy ra khi tạo giao dịch thanh toán." : isZh ? "创建支付订单时发生错误。" : "An error occurred initiating payment."}
            </p>
            <button onClick={startPayment} className="btn-primary text-xs">
              {isVi ? "Thử lại" : isZh ? "重试" : "Retry"}
            </button>
          </div>
        )}

        {/* Modal Bottom Actions */}
        <div className="pt-2 flex gap-3 border-t border-white/[0.08]">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 text-xs py-2"
          >
            {isVi ? "Đóng Cửa Sổ" : isZh ? "关闭窗口" : "Close Window"}
          </button>
          <button
            onClick={async () => {
              if (window.confirm(isVi ? "Bạn có chắc muốn hủy đơn hàng này?" : isZh ? "您确定要取消此订单吗？" : "Are you sure you want to cancel?")) {
                try {
                  await api.post(`/orders/${orderId}/cancel`);
                  onClose();
                } catch (e) {
                  console.error(e);
                }
              }
            }}
            className="btn-secondary flex-1 text-xs py-2 text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
          >
            {isVi ? "Hủy Đơn Hàng" : isZh ? "取消订单" : "Cancel Order"}
          </button>
        </div>

      </div>
    </div>
  );
}
