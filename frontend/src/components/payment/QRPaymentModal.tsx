"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { api, type ApiResponse } from "@/lib/api/client";
import { Button, Card } from "@/components/ui/button";
import { Loader2, RefreshCw, Clock, AlertTriangle } from "lucide-react";

interface Props {
  orderId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function QRPaymentModal({ orderId, onSuccess, onClose }: Props) {
  const t = useTranslations("payment");
  const locale = useLocale();
  const [payment, setPayment] = useState<{ id: string; qrImageUrl?: string; expiresAt?: string; orderCode?: string; amount?: number } | null>(null);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes (180 seconds)
  const [isExpired, setIsExpired] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startPayment = async () => {
    setLoading(true);
    setIsExpired(false);
    setTimeLeft(180);
    try {
      const { data } = await api.post<ApiResponse<{ id: string; qrImageUrl?: string; expiresAt?: string; orderCode?: string; amount?: number }>>(`/orders/${orderId}/pay`);
      setPayment(data.data);
      
      // Compute remaining time if server returns expiresAt
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

      // Simulated payment for development environment
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
      } catch { /* keep polling */ }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="max-w-md w-full p-6 bg-zinc-900 border-zinc-800 shadow-2xl space-y-5">
        <h2 className="text-lg font-bold text-center text-white">{t("scanQr")}</h2>
        
        {loading ? (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 py-10">
            <Loader2 className="h-9 w-9 animate-spin text-violet-500" />
            <p className="text-sm text-zinc-400">{t("loading")}</p>
          </div>
        ) : status === "success" ? (
          <div className="py-8 text-center space-y-3">
            <div className="text-4xl">🎉</div>
            <p className="text-green-400 font-bold text-xl">{t("success")}</p>
          </div>
        ) : payment?.qrImageUrl ? (
          <div className="flex flex-col items-center gap-4">
            {/* Live Countdown Timer Banner */}
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold border transition ${
              isExpired
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : timeLeft <= 30
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                : "bg-violet-500/10 text-violet-300 border-violet-500/20"
            }`}>
              <Clock className="size-3.5" />
              <span>
                {isExpired
                  ? (locale === "vi" ? "Mã QR đã hết hạn" : "QR Code Expired")
                  : `${locale === "vi" ? "Thời gian còn lại: " : "Expires in: "}${formatTimer(timeLeft)}`}
              </span>
            </div>

            {/* QR Code Frame with Zalo-Style Blur & Recreate Overlay */}
            <div className="relative h-64 w-64 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-white p-2 flex items-center justify-center group">
              <img
                src={payment.qrImageUrl}
                alt="QR Code"
                className={`size-full object-contain transition duration-300 ${isExpired ? "blur-md opacity-25" : ""}`}
              />

              {/* Zalo-Style Expired Overlay */}
              {isExpired && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm text-center space-y-3 animate-in fade-in duration-200">
                  <div className="p-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <AlertTriangle className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">
                      {locale === "vi" ? "Mã QR đã hết hạn" : "QR Code Expired"}
                    </p>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      {locale === "vi" ? "Đã quá 3 phút. Vui lòng lấy mã mới để tiếp tục." : "3 minutes limit reached. Please generate a new QR."}
                    </p>
                  </div>
                  <Button
                    onClick={startPayment}
                    className="mt-1 h-9 px-4 text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="size-3.5" />
                    {locale === "vi" ? "Tạo mã QR mới" : "Recreate QR Code"}
                  </Button>
                </div>
              )}
            </div>

            {/* Order Code & Amount Details */}
            <div className="text-sm space-y-2 text-center bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 w-full">
              <div className="flex justify-between items-center gap-2">
                <span className="text-zinc-500 text-xs font-semibold">{locale === "vi" ? "MÃ ĐƠN HÀNG:" : "ORDER CODE:"}</span>
                <span className="font-mono font-bold text-violet-400 select-all text-sm bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">{payment.orderCode}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-zinc-500 text-xs font-semibold">{locale === "vi" ? "SỐ TIỀN:" : "AMOUNT:"}</span>
                <span className="font-bold text-emerald-400 text-sm">{payment.amount?.toLocaleString()} VND</span>
              </div>
            </div>

            {!isExpired && (
              <p className="text-xs text-zinc-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                {t("waiting")}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-4">
            <p className="text-sm text-red-400 text-center">{t("error")}</p>
            <Button className="w-full" onClick={startPayment}>{locale === "vi" ? "Thử lại" : "Retry"}</Button>
          </div>
        )}
        
        {/* Modal Actions */}
        <div className="flex gap-3 pt-2 w-full border-t border-zinc-800">
          <Button variant="outline" className="flex-1 text-xs text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white" onClick={onClose}>
            {locale === "vi" ? "Đóng" : "Close"}
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 text-xs bg-red-950/20 text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white transition"
            onClick={async () => {
              if (window.confirm(locale === "vi" ? "Bạn có chắc chắn muốn hủy đơn hàng này?" : "Are you sure you want to cancel this order?")) {
                try {
                  await api.post(`/orders/${orderId}/cancel`);
                  onClose();
                } catch (e) {
                  console.error(e);
                  alert(locale === "vi" ? "Hủy đơn hàng thất bại. Vui lòng thử lại!" : "Failed to cancel order. Please try again!");
                }
              }
            }}
          >
            {locale === "vi" ? "Hủy đơn hàng" : "Cancel Order"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
