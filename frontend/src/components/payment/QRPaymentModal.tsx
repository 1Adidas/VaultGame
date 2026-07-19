"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { api, type ApiResponse } from "@/lib/api/client";
import { Button, Card } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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
  const startedRef = useRef(false);

  const startPayment = async () => {
    setLoading(true);
    try {
      const { data } = await api.post<ApiResponse<{ id: string; qrImageUrl?: string; expiresAt?: string; orderCode?: string; amount?: number }>>(`/orders/${orderId}/pay`);
      setPayment(data.data);
      poll(data.data.id);

      // Giả lập SEPAY v1 đợi 8s là xong khi không sử dụng webhook thật (qua ngrok)
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

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startPayment();
  }, [orderId]);

  const poll = (paymentId: string) => {
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get<ApiResponse<{ status: string }>>(`/payments/${paymentId}/status`);
        if (data.data.status === "Success") {
          setStatus("success");
          clearInterval(interval);
          onSuccess();
        }
      } catch { /* keep polling */ }
    }, 2000);
    setTimeout(() => clearInterval(interval), 15 * 60 * 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <Card className="max-w-md w-full">
        <h2 className="text-lg font-bold text-center">{t("scanQr")}</h2>
        
        {loading ? (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            <p className="text-sm text-zinc-400">{t("loading")}</p>
          </div>
        ) : status === "success" ? (
          <p className="mt-4 text-green-400 text-center font-bold text-lg">🎉 {t("success")}</p>
        ) : payment?.qrImageUrl ? (
          <div className="mt-4 flex flex-col items-center gap-4">
            <img src={payment.qrImageUrl} alt="QR" className="h-64 w-64 rounded-xl border border-white/10 shadow-lg bg-white p-2" />
            <div className="text-sm space-y-1.5 text-center bg-zinc-900/80 p-3.5 rounded-xl border border-white/5 w-full">
              <div className="flex justify-between items-center gap-2">
                <span className="text-zinc-500 text-xs font-medium">MÃ ĐƠN HÀNG:</span>
                <span className="font-mono font-bold text-violet-400 select-all text-sm bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">{payment.orderCode}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-zinc-500 text-xs font-medium">SỐ TIỀN:</span>
                <span className="font-bold text-emerald-400 text-sm">{payment.amount?.toLocaleString()} VND</span>
              </div>
            </div>
            <p className="text-sm text-zinc-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
              {t("waiting")}
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-4">
            <p className="text-sm text-red-400 text-center">{t("error")}</p>
            <Button className="w-full" onClick={startPayment}>Thử lại</Button>
          </div>
        )}
        
        <div className="flex gap-3 mt-4 w-full">
          <Button variant="outline" className="flex-1 text-zinc-300 hover:text-white" onClick={onClose}>Close</Button>
          <Button 
            variant="outline" 
            className="flex-1 bg-red-950/20 text-red-400 border border-red-500/25 hover:bg-red-600 hover:text-white transition"
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
