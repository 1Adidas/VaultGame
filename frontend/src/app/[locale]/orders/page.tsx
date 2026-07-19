"use client";

import { useOrders, useLibrary } from "@/hooks/useGames";
import { formatPrice, formatDateTimeShort, resolveImageUrl } from "@/lib/utils";
import { useLocale } from "next-intl";
import { Gamepad2, ShoppingBag, Mail, AlertOctagon } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { QRPaymentModal } from "@/components/payment/QRPaymentModal";

export default function OrdersPage() {
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data, isLoading, refetch } = useOrders();
  const { data: libraryData } = useLibrary();

  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [activePayOrderId, setActivePayOrderId] = useState<string | null>(null);

  const handleCancelPending = async (orderId: string) => {
    if (!window.confirm(locale === "vi" ? "Bạn có chắc chắn muốn hủy đơn hàng này?" : "Are you sure you want to cancel this order?")) {
      return;
    }
    setSubmittingCancel(true);
    try {
      await api.post(`/orders/${orderId}/cancel`);
      alert(locale === "vi" ? "Đã hủy đơn hàng thành công!" : "Order cancelled successfully!");
      refetch();
    } catch (e) {
      console.error(e);
      alert(locale === "vi" ? "Hủy đơn hàng thất bại. Vui lòng thử lại!" : "Failed to cancel order. Please try again!");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleResendReceipt = async (orderId: string) => {
    setResendingEmailId(orderId);
    try {
      await api.post(`/orders/${orderId}/resend`);
      alert(locale === "vi" ? "Đã gửi lại email hóa đơn thành công!" : "Receipt email resent successfully!");
    } catch (e) {
      console.error(e);
      alert(locale === "vi" ? "Gửi lại hóa đơn thất bại. Vui lòng thử lại!" : "Failed to resend receipt. Please try again!");
    } finally {
      setResendingEmailId(null);
    }
  };

  const handleCancelRequest = async (orderId: string) => {
    if (!cancelReason.trim()) {
      alert(locale === "vi" ? "Vui lòng nhập lý do hủy đơn!" : "Please provide a reason for cancellation!");
      return;
    }
    setSubmittingCancel(true);
    try {
      await api.post(`/orders/${orderId}/cancel-request`, { reason: cancelReason });
      alert(
        locale === "vi"
          ? "Đã gửi yêu cầu hủy đơn hàng & hoàn tiền thành công! Admin sẽ kiểm tra và liên hệ hỗ trợ bạn."
          : "Cancellation & refund request submitted successfully! Admin will review and contact you."
      );
      setCancellingOrderId(null);
      setCancelReason("");
    } catch (e) {
      console.error(e);
      alert(locale === "vi" ? "Gửi yêu cầu thất bại. Vui lòng thử lại!" : "Failed to submit request. Please try again!");
    } finally {
      setSubmittingCancel(false);
    }
  };

  useEffect(() => {
    if (user?.roles.includes("Admin")) {
      router.replace(`/${locale}/admin`);
    }
  }, [user, locale, router]);

  if (isLoading || user?.roles.includes("Admin")) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Title skeleton */}
        <div className="mb-8 h-9 w-48 rounded bg-zinc-900/50 animate-pulse" />
        
        {/* Stack skeleton */}
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 p-6 space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-zinc-800" />
                  <div className="h-3.5 w-24 rounded bg-zinc-800" />
                </div>
                <div className="h-7 w-20 rounded-full bg-zinc-800" />
              </div>
              <div className="border-t border-white/5 pt-4 flex gap-4">
                <div className="size-16 rounded-xl bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-zinc-800" />
                  <div className="h-3.5 w-1/4 rounded bg-zinc-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const orders = data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-white">{locale === "vi" ? "Lịch sử mua hàng" : "Order History"}</h1>
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500 border border-white/5 bg-zinc-900/20 rounded-2xl">
          <ShoppingBag className="mb-4 size-16 opacity-10" />
          <p className="text-zinc-400">{locale === "vi" ? "Bạn chưa thực hiện đơn hàng nào." : "You have no orders yet."}</p>
          <Link href={`/${locale}/games`} className="mt-4 text-sm font-semibold text-violet-400 hover:text-violet-300">
            {locale === "vi" ? "Khám phá game mới" : "Browse Store"}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((item) => {
            const o = item as Record<string, any>;
            const dateStr = formatDateTimeShort(o.createdAt);
            const statusColors = 
              o.status === "Paid" ? "bg-green-500/10 text-green-400 border-green-500/20" :
              o.status === "Pending" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
              o.status === "CancellationPending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              o.status === "CancellationApproved" ? "bg-teal-500/10 text-teal-400 border-teal-500/20" :
              "bg-red-500/10 text-red-400 border-red-500/20";

            const getStatusLabel = (status: string) => {
              if (locale === "vi") {
                switch (status) {
                  case "Paid": return "Đã thanh toán";
                  case "Pending": return "Chờ thanh toán";
                  case "Cancelled": return "Đã hủy";
                  case "CancellationPending": return "Đang xử lý yêu cầu hủy";
                  case "CancellationApproved": return "Đã xử lý yêu cầu hủy";
                  default: return status;
                }
              } else {
                switch (status) {
                  case "Paid": return "Paid";
                  case "Pending": return "Pending";
                  case "Cancelled": return "Cancelled";
                  case "CancellationPending": return "Cancellation Pending";
                  case "CancellationApproved": return "Cancellation Approved";
                  default: return status;
                }
              }
            };

            // Tính toán tổng tiền gốc và mức tiết kiệm
            const totalOriginal = o.items?.reduce((acc: number, g: any) => acc + (g.unitPrice ?? 0), 0) ?? 0;
            const totalPaid = o.totalAmount ?? 0;
            const savings = totalOriginal - totalPaid;

            const isEligibleForRefund = (() => {
              if (o.status === "Pending") return true;
              if (o.status !== "Paid") return false;
              
              // 1. Check if paid within 14 days
              const diffTime = new Date().getTime() - new Date(o.createdAt).getTime();
              const isUnder14Days = diffTime <= 14 * 24 * 60 * 60 * 1000;
              if (!isUnder14Days) return false;

              // 2. Check if any game in this order has been downloaded
              const hasDownloaded = o.items?.some((item: any) => {
                const libGame = libraryData?.find((lg: any) => lg.gameId === item.gameId);
                return libGame && libGame.lastDownloadAt !== null;
              });
              if (hasDownloaded) return false;

              return true;
            })();

            return (
              <div key={o.id} className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur shadow-2xl transition duration-300 hover:border-white/10">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 bg-zinc-950/50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                      <ShoppingBag className="size-4.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{locale === "vi" ? "MÃ ĐƠN HÀNG" : "ORDER CODE"}</p>
                      <span className="font-mono text-sm font-bold text-zinc-200 select-all">{o.orderCode}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:block space-y-0.5 text-right">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{locale === "vi" ? "NGÀY GIAO DỊCH" : "ORDER DATE"}</p>
                      <span className="text-xs text-zinc-400 font-medium">{dateStr}</span>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusColors}`}>
                      {getStatusLabel(o.status)}
                    </span>
                  </div>
                </div>
                
                {o.cancelReason && (o.status === "CancellationPending" || o.status === "CancellationApproved" || o.status === "Cancelled") && (
                  <div className={`mx-6 mt-4 p-3.5 rounded-xl border text-xs leading-relaxed ${
                    o.status === "CancellationPending" ? "bg-amber-500/5 border-amber-500/10 text-amber-400/90" :
                    o.status === "CancellationApproved" ? "bg-teal-500/5 border-teal-500/10 text-teal-400/90" :
                    "bg-red-500/5 border-red-500/10 text-red-400/90"
                  }`}>
                    <span className="font-bold">{locale === "vi" ? "Lý do hủy đơn: " : "Reason for cancellation: "}</span>
                    {o.cancelReason}
                  </div>
                )}

                {o.adminNote && (
                  <div className="mx-6 mt-2 p-3.5 rounded-xl bg-green-500/5 border border-green-500/10 text-xs text-green-400/90 leading-relaxed">
                    <span className="font-bold">{locale === "vi" ? "Phản hồi từ Admin: " : "Admin response: "}</span>
                    {o.adminNote}
                  </div>
                )}

                {/* Items List */}
                <div className="divide-y divide-white/5 px-6">
                  {o.items?.map((g: any, index: number) => {
                    const coverUrl = resolveImageUrl(g.gameCoverUrl);
                    const isDiscounted = g.lineTotal < g.unitPrice;

                    return (
                      <div key={index} className="flex flex-wrap items-center justify-between gap-4 py-5">
                        <div className="flex items-center gap-4 flex-1 min-w-[240px]">
                          <div className="h-16 w-28 overflow-hidden rounded-xl bg-zinc-800 border border-white/5 flex-shrink-0 shadow">
                            {coverUrl ? (
                              <img src={coverUrl} alt={g.gameTitle} className="size-full object-cover" />
                            ) : (
                              <div className="flex size-full items-center justify-center text-zinc-700">
                                <Gamepad2 className="size-7" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <Link href={`/${locale}/game/${g.gameSlug}`} className="font-bold text-zinc-100 hover:text-violet-400 transition text-sm sm:text-base truncate block">
                              {g.gameTitle}
                            </Link>
                            <p className="text-xs text-zinc-500 font-medium">{locale === "vi" ? "Số lượng: 1" : "Qty: 1"}</p>
                          </div>
                        </div>
                        
                        {/* Price rendering per game */}
                        <div className="text-right space-y-1">
                          {isDiscounted ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-xs text-zinc-500 line-through">
                                {formatPrice(g.unitPrice, o.currency)}
                              </span>
                              <span className="font-bold text-emerald-400 text-sm">
                                {formatPrice(g.lineTotal, o.currency)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-zinc-200 text-sm">
                              {formatPrice(g.unitPrice, o.currency)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer / Summary */}
                <div className="flex flex-wrap justify-between items-center gap-4 border-t border-white/5 bg-zinc-950/20 px-6 py-4.5">
                  <div className="flex flex-wrap gap-2 items-center">
                    {savings > 0 && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 select-none mr-2">
                        🎉 {locale === "vi" ? `Tiết kiệm ${formatPrice(savings, o.currency)}` : `Saved ${formatPrice(savings, o.currency)}`}
                      </span>
                    )}

                    {o.status === "Paid" && (
                      <button
                        onClick={() => handleResendReceipt(o.id)}
                        disabled={resendingEmailId === o.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-650 border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-300 transition disabled:opacity-50"
                      >
                        <Mail className="size-3.5" />
                        {resendingEmailId === o.id
                          ? (locale === "vi" ? "Đang gửi..." : "Sending...")
                          : (locale === "vi" ? "Gửi lại hóa đơn" : "Resend Receipt")}
                      </button>
                    )}

                    {o.status === "Paid" && isEligibleForRefund && (
                      <button
                        onClick={() => {
                          setCancellingOrderId(cancellingOrderId === o.id ? null : o.id);
                          setCancelReason("");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 active:bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-400 transition"
                      >
                        <AlertOctagon className="size-3.5" />
                        {locale === "vi" ? "Yêu cầu hủy & hoàn tiền" : "Request Cancel & Refund"}
                      </button>
                    )}

                    {o.status === "Pending" && (
                      <>
                        <button
                          onClick={() => setActivePayOrderId(o.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-750 px-3 py-1.5 text-xs font-bold text-white transition shadow-md shadow-violet-900/10 cursor-pointer"
                        >
                          <ShoppingBag className="size-3.5" />
                          {locale === "vi" ? "Thanh toán ngay" : "Pay Now"}
                        </button>
                        <button
                          onClick={() => handleCancelPending(o.id)}
                          disabled={submittingCancel}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 active:bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-400 transition disabled:opacity-50 cursor-pointer"
                        >
                          <AlertOctagon className="size-3.5" />
                          {locale === "vi" ? "Hủy đơn hàng" : "Cancel Order"}
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">{locale === "vi" ? "Tổng cộng" : "Total amount"}</span>
                    <span className="text-xl font-black text-violet-400 bg-violet-500/5 border border-violet-500/10 px-3 py-1 rounded-xl shadow-inner">
                      {formatPrice(o.totalAmount, o.currency)}
                    </span>
                  </div>
                </div>

                {/* Inline cancellation reason form */}
                {cancellingOrderId === o.id && (
                  <div className="border-t border-white/5 bg-zinc-950/40 p-6 space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        {locale === "vi" ? "Lý do hủy đơn & hoàn tiền" : "Reason for Cancellation & Refund"}
                      </label>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder={
                          locale === "vi"
                            ? "Vui lòng nhập lý do chi tiết để Admin kiểm tra và hỗ trợ hoàn tiền..."
                            : "Please enter details for Admin to review and process your refund..."
                        }
                        rows={3}
                        className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm text-zinc-200 placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setCancellingOrderId(null);
                          setCancelReason("");
                        }}
                        className="rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-xs font-bold text-zinc-300 transition"
                      >
                        {locale === "vi" ? "Hủy bỏ" : "Cancel"}
                      </button>
                      <button
                        onClick={() => handleCancelRequest(o.id)}
                        disabled={submittingCancel}
                        className="rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-red-900/20 disabled:opacity-50"
                      >
                        {submittingCancel
                          ? (locale === "vi" ? "Đang gửi..." : "Submitting...")
                          : (locale === "vi" ? "Gửi yêu cầu hỗ trợ" : "Submit Request")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activePayOrderId && (
        <QRPaymentModal
          orderId={activePayOrderId}
          onClose={() => setActivePayOrderId(null)}
          onSuccess={() => {
            setActivePayOrderId(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
