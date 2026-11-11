"use client";

import { useOrders, useLibrary } from "@/hooks/useGames";
import { formatPrice, formatDateTimeShort, resolveImageUrl } from "@/lib/utils";
import { useLocale } from "next-intl";
import {
  Gamepad2,
  ShoppingBag,
  Mail,
  AlertOctagon,
  XCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { QRPaymentModal } from "@/components/payment/QRPaymentModal";

export default function OrdersPage() {
  const locale = useLocale();
  const isVi = locale === "vi";
  const isZh = locale === "zh";
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { data, isLoading, refetch } = useOrders();
  const { data: libraryData } = useLibrary();

  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [activePayOrderId, setActivePayOrderId] = useState<string | null>(null);

  const handleCancelPending = async (orderId: string) => {
    if (!window.confirm(isVi ? "Bạn có chắc chắn muốn hủy đơn hàng này?" : isZh ? "您确定要取消此订单吗？" : "Are you sure you want to cancel this order?")) {
      return;
    }
    setSubmittingCancel(true);
    try {
      await api.post(`/orders/${orderId}/cancel`);
      alert(isVi ? "Đã hủy đơn hàng thành công!" : isZh ? "订单已成功取消！" : "Order cancelled successfully!");
      refetch();
    } catch (e) {
      console.error(e);
      alert(isVi ? "Hủy đơn hàng thất bại. Vui lòng thử lại!" : isZh ? "取消订单失败，请稍后重试！" : "Failed to cancel order. Please try again!");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleResendReceipt = async (orderId: string) => {
    setResendingEmailId(orderId);
    try {
      await api.post(`/orders/${orderId}/resend`);
      alert(isVi ? "Đã gửi lại email hóa đơn thành công!" : isZh ? "收据邮件已成功重新发送！" : "Receipt email resent successfully!");
    } catch (e) {
      console.error(e);
      alert(isVi ? "Gửi lại hóa đơn thất bại. Vui lòng thử lại!" : isZh ? "重新发送收据失败，请稍后重试！" : "Failed to resend receipt. Please try again!");
    } finally {
      setResendingEmailId(null);
    }
  };

  const handleCancelRequest = async (orderId: string) => {
    if (!cancelReason.trim()) {
      alert(isVi ? "Vui lòng nhập lý do hủy đơn!" : isZh ? "请输入取消/退款理由！" : "Please provide a reason for cancellation!");
      return;
    }
    setSubmittingCancel(true);
    try {
      await api.post(`/orders/${orderId}/cancel-request`, { reason: cancelReason });
      alert(
        isVi
          ? "Đã gửi yêu cầu hủy đơn hàng & hoàn tiền thành công! Admin sẽ kiểm tra và liên hệ hỗ trợ bạn."
          : isZh
          ? "已成功提交退款申请！管理员将审核并联系处理。"
          : "Cancellation & refund request submitted successfully! Admin will review and contact you."
      );
      setCancellingOrderId(null);
      setCancelReason("");
    } catch (e) {
      console.error(e);
      alert(isVi ? "Gửi yêu cầu thất bại. Vui lòng thử lại!" : isZh ? "提交申请失败，请稍后重试！" : "Failed to submit request. Please try again!");
    } finally {
      setSubmittingCancel(false);
    }
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace(`/${locale}/login`);
    } else if (user.roles.includes("Admin")) {
      router.replace(`/${locale}/admin`);
    }
  }, [user, isHydrated, locale, router]);

  if (!isHydrated || !user || isLoading || user?.roles.includes("Admin")) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-[#0E131E]" />
        {[1, 2].map((i) => (
          <div key={i} className="h-56 rounded-2xl bg-[#0E131E] border border-white/5" />
        ))}
      </div>
    );
  }

  const orders = data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs font-semibold text-zinc-300">
            <ShoppingBag className="size-3.5" />
            <span>{isVi ? "Lịch Sử Giao Dịch" : isZh ? "账单与购买记录" : "Billing & Purchases"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isVi ? "Lịch Sử Mua Hàng" : isZh ? "订单记录" : "Order History"}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {isVi
              ? `Xem lại tất cả hóa đơn thanh toán và quản lý các tựa game đã kích hoạt.`
              : isZh
              ? `查看所有付款账单并管理已激活入库的数字游戏授权。`
              : `Review all purchase invoices and manage activated digital licenses.`}
          </p>
        </div>
      </div>

      {/* ─── Orders List or Empty ─── */}
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-16 text-center space-y-4 shadow-xl">
          <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
            <ShoppingBag className="size-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">
              {isVi ? "Bạn chưa có đơn hàng nào" : isZh ? "您尚无任何订单" : "You have no orders yet"}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {isVi
                ? "Các giao dịch mua game bản quyền của bạn sẽ xuất hiện tại đây cùng hóa đơn chi tiết."
                : isZh
                ? "您购买的正版游戏交易与电子发票收据将展示在此处。"
                : "Your purchased games and payment receipts will appear here."}
            </p>
          </div>
          <Link href={`/${locale}/games`} className="inline-block pt-2">
            <button className="btn-primary flex items-center gap-2">
              <span>{isVi ? "Khám Phá Cửa Hàng" : isZh ? "探索游戏商城" : "Browse Games Store"}</span>
              <ArrowRight className="size-4" />
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((item) => {
            const o = item as Record<string, any>;
            const dateStr = formatDateTimeShort(o.createdAt);
            
            const statusConfig = (() => {
              if (o.status === "Paid") {
                return {
                  label: isVi ? "Đã Thanh Toán" : isZh ? "已付款" : "Paid",
                  badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                };
              }
              if (o.status === "Pending") {
                return {
                  label: isVi ? "Chờ Thanh Toán" : isZh ? "待付款" : "Pending",
                  badge: "bg-amber-500/10 text-amber-400 border-amber-500/20"
                };
              }
              if (o.status === "CancellationPending") {
                return {
                  label: isVi ? "Đang Xử Lý Hủy" : isZh ? "退款处理中" : "Cancellation Pending",
                  badge: "bg-purple-500/10 text-purple-400 border-purple-500/20"
                };
              }
              if (o.status === "CancellationApproved") {
                return {
                  label: isVi ? "Đã Hoàn Tiền" : isZh ? "已退款" : "Refunded",
                  badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                };
              }
              return {
                label: isVi ? "Đã Hủy" : isZh ? "已取消" : "Cancelled",
                badge: "bg-rose-500/10 text-rose-400 border-rose-500/20"
              };
            })();

            const totalOriginal = o.items?.reduce((acc: number, g: any) => acc + (g.unitPrice ?? 0), 0) ?? 0;
            const totalPaid = o.totalAmount ?? 0;
            const savings = totalOriginal - totalPaid;

            const isEligibleForRefund = (() => {
              if (o.status === "Pending") return true;
              if (o.status !== "Paid") return false;
              
              const diffTime = new Date().getTime() - new Date(o.createdAt).getTime();
              const isUnder14Days = diffTime <= 14 * 24 * 60 * 60 * 1000;
              if (!isUnder14Days) return false;

              const hasDownloaded = o.items?.some((it: any) => {
                const libGame = libraryData?.find((lg: any) => lg.gameId === it.gameId);
                return libGame && libGame.lastDownloadAt !== null;
              });
              if (hasDownloaded) return false;

              return true;
            })();

            return (
              <div
                key={o.id}
                className="rounded-2xl border border-white/[0.08] bg-[#0E131E] overflow-hidden shadow-xl"
              >
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] bg-[#080B11] px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-300">
                      <ShoppingBag className="size-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        {isVi ? "MÃ ĐƠN HÀNG" : isZh ? "订单编号" : "ORDER CODE"}
                      </p>
                      <span className="font-mono text-xs sm:text-sm font-bold text-white select-all">
                        {o.orderCode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="hidden sm:block text-right">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        {isVi ? "THỜI GIAN" : isZh ? "交易时间" : "DATE"}
                      </p>
                      <span className="text-xs text-zinc-400 font-medium">{dateStr}</span>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusConfig.badge}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                {/* Items in this order */}
                <div className="divide-y divide-white/[0.04] px-6">
                  {o.items?.map((g: any, index: number) => {
                    const coverUrl = resolveImageUrl(g.gameCoverUrl);
                    const isDiscounted = g.lineTotal < g.unitPrice;

                    return (
                      <div key={index} className="flex flex-wrap items-center justify-between gap-4 py-4">
                        <div className="flex items-center gap-4 flex-1 min-w-[240px]">
                          <div className="h-14 w-24 overflow-hidden rounded-xl bg-[#080B11] border border-white/5 flex-shrink-0">
                            {coverUrl ? (
                              <img
                                src={coverUrl}
                                referrerPolicy="no-referrer"
                                alt={g.gameTitle}
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-zinc-700">
                                <Gamepad2 className="size-6" />
                              </div>
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/${locale}/game/${g.gameSlug}`}
                              className="font-bold text-white hover:underline text-sm truncate block"
                            >
                              {g.gameTitle}
                            </Link>
                            <span className="text-[11px] text-zinc-500">
                              {isVi ? "Bản quyền kỹ thuật số • Số lượng: 1" : isZh ? "数字游戏授权 • 数量: 1" : "Digital License • Qty: 1"}
                            </span>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          {isDiscounted ? (
                            <div className="flex flex-col items-end">
                              <span className="text-[11px] text-zinc-500 line-through">
                                {formatPrice(g.unitPrice, o.currency)}
                              </span>
                              <span className="font-bold text-emerald-400 text-sm">
                                {formatPrice(g.lineTotal, o.currency)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-white text-sm">
                              {formatPrice(g.unitPrice, o.currency)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Total & Actions */}
                <div className="flex flex-wrap justify-between items-center gap-4 border-t border-white/[0.06] bg-[#080B11]/50 px-6 py-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    {savings > 0 && (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 mr-2">
                        {isVi ? `Tiết kiệm ${formatPrice(savings, o.currency)}` : isZh ? `节省 ${formatPrice(savings, o.currency)}` : `Saved ${formatPrice(savings, o.currency)}`}
                      </span>
                    )}

                    {o.status === "Paid" && (
                      <button
                        onClick={() => handleResendReceipt(o.id)}
                        disabled={resendingEmailId === o.id}
                        className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-3"
                      >
                        <Mail className="size-3.5" />
                        <span>
                          {resendingEmailId === o.id
                            ? (isVi ? "Đang gửi..." : isZh ? "正在发送..." : "Sending...")
                            : (isVi ? "Gửi Lại Hóa Đơn" : isZh ? "重发电子收据" : "Resend Receipt")}
                        </span>
                      </button>
                    )}

                    {o.status === "Paid" && isEligibleForRefund && (
                      <button
                        onClick={() => {
                          setCancellingOrderId(cancellingOrderId === o.id ? null : o.id);
                          setCancelReason("");
                        }}
                        className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-3 text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
                      >
                        <AlertOctagon className="size-3.5" />
                        <span>{isVi ? "Yêu Cầu Hoàn Tiền" : isZh ? "申请退款" : "Request Refund"}</span>
                      </button>
                    )}

                    {o.status === "Pending" && (
                      <>
                        <button
                          onClick={() => setActivePayOrderId(o.id)}
                          className="btn-primary text-xs flex items-center gap-1.5 py-1 px-3"
                        >
                          <Zap className="size-3.5" />
                          <span>{isVi ? "Thanh Toán Ngay" : isZh ? "立即支付" : "Pay Now"}</span>
                        </button>
                        <button
                          onClick={() => handleCancelPending(o.id)}
                          disabled={submittingCancel}
                          className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-3 text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
                        >
                          <span>{isVi ? "Hủy Đơn" : isZh ? "取消" : "Cancel"}</span>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                      {isVi ? "Tổng tiền:" : isZh ? "总金额:" : "Total:"}
                    </span>
                    <span className="text-xl font-black text-white">
                      {formatPrice(o.totalAmount, o.currency)}
                    </span>
                  </div>
                </div>

                {/* Inline Cancel Reason Box */}
                {cancellingOrderId === o.id && (
                  <div className="border-t border-white/[0.08] bg-[#080B11] p-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white">
                        {isVi ? "Lý do gửi yêu cầu hủy đơn & hoàn tiền:" : isZh ? "申请退款及取消订单理由:" : "Reason for refund request:"}
                      </label>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder={isVi ? "Vui lòng nêu rõ lý do..." : isZh ? "请详细说明退款原因..." : "Please specify why..."}
                        rows={3}
                        className="w-full rounded-xl border border-white/10 bg-[#0E131E] p-3 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/30"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setCancellingOrderId(null);
                          setCancelReason("");
                        }}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        {isVi ? "Hủy Bỏ" : isZh ? "取消" : "Cancel"}
                      </button>
                      <button
                        onClick={() => handleCancelRequest(o.id)}
                        disabled={submittingCancel}
                        className="btn-primary text-xs py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white"
                      >
                        {submittingCancel
                          ? (isVi ? "Đang gửi..." : isZh ? "正在发送..." : "Submitting...")
                          : (isVi ? "Gửi Yêu Cầu" : isZh ? "提交申请" : "Submit Request")}
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
