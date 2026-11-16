"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useAdminStats, useCategories } from "@/hooks/useGames";
import { useAuthStore } from "@/lib/auth/store";
import { api, type ApiResponse } from "@/lib/api/client";
import { formatPrice, formatDate, formatDateTime, resolveImageUrl } from "@/lib/utils";
import { Button, Card, Input } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Gamepad2, ShoppingBag, Users as UsersIcon,
  DollarSign, HelpCircle, Upload, Trash2, Edit, CheckCircle2,
  XCircle, ToggleLeft, ToggleRight, Info, PlusCircle, Save, ExternalLink,
  Bot, AlertTriangle, BarChart3, TrendingUp, Clock, ArrowUpRight, Download, Settings,
  Sparkles, Globe, Loader2, Languages, Image as ImageIcon, Film, HardDrive,
  Package, CreditCard, Shield, RefreshCw
} from "lucide-react";

export default function OrdersTab() {
  const locale = useLocale();
  const { data: ordersList, isLoading, refetch: refetchOrders } = useQuery({
    queryKey: ["admin-orders-list"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any[]>>("/admin/orders");
      return data.data;
    }
  });

  const [cancelingOrder, setCancelingOrder] = useState<{ id: string; code: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const [deletingOrder, setDeletingOrder] = useState<{ id: string; code: string } | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const [approvingOrder, setApprovingOrder] = useState<{ id: string; code: string } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [submittingApprove, setSubmittingApprove] = useState(false);

  const [rejectingOrder, setRejectingOrder] = useState<{ id: string; code: string } | null>(null);
  const [submittingReject, setSubmittingReject] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "normal" | "cancellation">("all");

  const submitDeleteOrder = async () => {
    if (!deletingOrder) return;
    setSubmittingDelete(true);
    try {
      await api.delete(`/admin/orders/${deletingOrder.id}`);
      alert(locale === "vi" ? "Xóa đơn hàng thành công!" : "Order deleted successfully!");
      setDeletingOrder(null);
      refetchOrders();
    } catch (err: any) {
      console.error("Failed to delete order", err);
      alert(locale === "vi" ? "Xóa đơn hàng thất bại." : "Failed to delete order.");
    } finally {
      setSubmittingDelete(false);
    }
  };

  const submitCancelOrder = async () => {
    if (!cancelingOrder) return;
    setSubmittingCancel(true);
    try {
      await api.post(`/admin/orders/${cancelingOrder.id}/cancel`, null, {
        params: { reason: cancelReason.trim() || undefined }
      });
      alert(locale === "vi" ? "Hủy đơn hàng thành công!" : "Order cancelled successfully!");
      setCancelingOrder(null);
      setCancelReason("");
      refetchOrders();
    } catch (err: any) {
      console.error("Failed to cancel order", err);
      alert(locale === "vi" ? "Hủy đơn hàng thất bại." : "Failed to cancel order.");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const submitApproveCancellation = async () => {
    if (!approvingOrder) return;
    setSubmittingApprove(true);
    try {
      await api.post(`/admin/orders/${approvingOrder.id}/approve-cancellation`, {
        adminNote: adminNote.trim() || undefined
      });
      alert(locale === "vi" ? "Duyệt yêu cầu hủy đơn hàng thành công!" : "Order cancellation approved successfully!");
      setApprovingOrder(null);
      setAdminNote("");
      refetchOrders();
    } catch (err: any) {
      console.error("Failed to approve cancellation", err);
      alert(locale === "vi" ? "Duyệt yêu cầu hủy thất bại." : "Failed to approve cancellation.");
    } finally {
      setSubmittingApprove(false);
    }
  };

  const submitRejectCancellation = async () => {
    if (!rejectingOrder) return;
    setSubmittingReject(true);
    try {
      await api.post(`/admin/orders/${rejectingOrder.id}/reject-cancellation`, {
        adminNote: adminNote.trim() || undefined
      });
      alert(locale === "vi" ? "Từ chối yêu cầu hủy đơn hàng thành công!" : "Order cancellation request rejected successfully!");
      setRejectingOrder(null);
      setAdminNote("");
      refetchOrders();
    } catch (err: any) {
      console.error("Failed to reject cancellation", err);
      alert(locale === "vi" ? "Từ chối yêu cầu hủy thất bại." : "Failed to reject cancellation request.");
    } finally {
      setSubmittingReject(false);
    }
  };

  if (isLoading) return <p className="text-zinc-500">Đang tải danh sách đơn hàng...</p>;

  const orders = ordersList ?? [];

  const filteredOrders = orders.filter((o: any) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "cancellation") return o.status === "CancellationPending";
    if (statusFilter === "normal") return o.status !== "CancellationPending" && o.status !== "CancellationApproved";
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Quản Lý Đơn Hàng</h1>
          <p className="text-sm text-zinc-400 mt-1">Theo dõi toàn bộ đơn hàng, đối soát trạng thái giao dịch và phê duyệt yêu cầu hủy đơn.</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2.5">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              statusFilter === "all"
                ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/20"
                : "bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Tất cả đơn hàng
          </button>
          <button
            onClick={() => setStatusFilter("normal")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              statusFilter === "normal"
                ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/20"
                : "bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Đơn hàng thông thường
          </button>
          <button
            onClick={() => setStatusFilter("cancellation")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-2 cursor-pointer ${
              statusFilter === "cancellation"
                ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/20"
                : "bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Đơn hàng chờ duyệt hủy
            {orders.some((o: any) => o.status === "CancellationPending") && (
              <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-zinc-950 font-bold rounded-full animate-pulse">
                {orders.filter((o: any) => o.status === "CancellationPending").length}
              </span>
            )}
          </button>
        </div>
      </div>

      <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-semibold">
                <th className="py-3 px-2">Mã Đơn Hàng</th>
                <th className="py-3 px-2">Khách Hàng</th>
                <th className="py-3 px-2">Trò Chơi Đã Mua</th>
                <th className="py-3 px-2">Tổng Thanh Toán</th>
                <th className="py-3 px-2">Trạng Thái</th>
                <th className="py-3 px-2">Thời Gian Mua</th>
                <th className="py-3 px-2 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.map((o: any) => {
                const statusColors =
                  o.status === "Paid" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                    o.status === "Pending" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                      o.status === "Cancelled" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        o.status === "CancellationPending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          o.status === "CancellationApproved" ? "bg-teal-500/10 text-teal-400 border-teal-500/20" :
                            "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";

                const getStatusLabel = (status: string) => {
                  if (locale === "vi") {
                    switch (status) {
                      case "Paid": return "Đã thanh toán";
                      case "Pending": return "Chờ thanh toán";
                      case "Cancelled": return "Đã hủy trực tiếp";
                      case "CancellationPending": return "Chờ duyệt hủy";
                      case "CancellationApproved": return "Đã duyệt hủy";
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

                return (
                  <tr key={o.id} className="hover:text-white transition">
                    <td className="py-4 font-mono font-semibold text-zinc-200">{o.orderCode}</td>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-300">{o.buyerFullName}</span>
                        <span className="text-xs text-zinc-500">{o.buyerEmail}</span>
                      </div>
                    </td>
                    <td className="py-4 max-w-[280px]">
                      <div className="flex flex-col gap-1">
                        {o.items?.map((item: any, i: number) => (
                          <span key={i} className="text-xs text-zinc-300 truncate" title={item.gameTitle}>
                            • {item.gameTitle}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 font-bold text-violet-300">{formatPrice(o.totalAmount)}</td>
                    <td className="py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColors}`}>
                          {getStatusLabel(o.status)}
                        </span>
                        {o.status === "CancellationPending" && o.cancelReason && (
                          <span className="text-[10px] text-zinc-400 mt-1 max-w-[200px] leading-relaxed break-words font-medium">
                            {locale === "vi" ? "Lý do: " : "Reason: "}{o.cancelReason}
                          </span>
                        )}
                        {o.status === "CancellationApproved" && (
                          <div className="flex flex-col mt-1 max-w-[200px] gap-0.5 text-[10px] leading-relaxed break-words font-medium text-zinc-400">
                            {o.cancelReason && <span>{locale === "vi" ? "Lý do: " : "Reason: "}{o.cancelReason}</span>}
                            {o.adminNote && <span>Ghi chú: {o.adminNote}</span>}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 text-xs text-zinc-500">{formatDateTime(o.createdAt)}</td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {o.status === "CancellationPending" && (
                          <>
                            <button
                              onClick={() => setApprovingOrder({ id: o.id, code: o.orderCode })}
                              className="rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white px-2 py-1 text-xs transition border border-emerald-500/25 font-semibold cursor-pointer"
                            >
                              {locale === "vi" ? "Duyệt hủy" : "Approve"}
                            </button>
                            <button
                              onClick={() => setRejectingOrder({ id: o.id, code: o.orderCode })}
                              className="rounded bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white px-2 py-1 text-xs transition border border-rose-500/25 font-semibold cursor-pointer"
                            >
                              {locale === "vi" ? "Từ chối" : "Reject"}
                            </button>
                          </>
                        )}
                        {(o.status === "Paid" || o.status === "Pending") && (
                          <button
                            onClick={() => setCancelingOrder({ id: o.id, code: o.orderCode })}
                            className="rounded bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-2 py-1 text-xs transition border border-red-500/25 font-semibold cursor-pointer"
                          >
                            {locale === "vi" ? "Hủy đơn" : "Cancel"}
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingOrder({ id: o.id, code: o.orderCode })}
                          className="rounded bg-zinc-800 text-zinc-400 hover:bg-red-600 hover:text-white p-1.5 text-xs transition border border-white/5 cursor-pointer flex items-center justify-center"
                          title={locale === "vi" ? "Xóa vĩnh viễn" : "Delete permanently"}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {cancelingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">
                {locale === "vi" ? `Hủy đơn hàng ${cancelingOrder.code}` : `Cancel Order ${cancelingOrder.code}`}
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {locale === "vi"
                  ? "Các tựa game trong đơn hàng này sẽ bị thu hồi và xóa khỏi thư viện của người mua. Bạn có muốn điền lý do hủy đơn hàng?"
                  : "The purchased games in this order will be revoked and deleted from the buyer's library. Would you like to specify a cancellation reason?"}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                {locale === "vi" ? "Lý do hủy đơn (Tùy chọn)" : "Reason for cancellation (Optional)"}
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={locale === "vi" ? "Nhập lý do hủy..." : "Enter reason..."}
                className="w-full h-24 rounded-lg border border-white/10 bg-zinc-950 px-4 py-2 text-sm text-white outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelingOrder(null);
                  setCancelReason("");
                }}
                disabled={submittingCancel}
                className="text-xs border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                {locale === "vi" ? "Bỏ qua" : "Dismiss"}
              </Button>
              <Button
                onClick={submitCancelOrder}
                disabled={submittingCancel}
                className="text-xs bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-1.5"
              >
                {submittingCancel && <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />}
                {locale === "vi" ? "Hủy đơn hàng" : "Confirm Cancel"}
              </Button>
            </div>
          </Card>
        </div>
      )}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-500" />
                {locale === "vi" ? `Xóa vĩnh viễn đơn hàng ${deletingOrder.code}` : `Delete Permanently Order ${deletingOrder.code}`}
              </h3>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                {locale === "vi"
                  ? "Hành động này sẽ xóa vĩnh viễn lịch sử đơn hàng khỏi hệ thống và thu hồi game khỏi thư viện của người mua. Hành động này KHÔNG thể hoàn tác."
                  : "This action will permanently delete the order history from the system and revoke game access from the buyer's library. This action CANNOT be undone."}
              </p>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeletingOrder(null)}
                className="text-xs border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                disabled={submittingDelete}
              >
                {locale === "vi" ? "Hủy bỏ" : "Cancel"}
              </Button>
              <Button
                onClick={submitDeleteOrder}
                disabled={submittingDelete}
                className="text-xs bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-1.5"
              >
                {submittingDelete && <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />}
                {locale === "vi" ? "Xác nhận xóa" : "Confirm Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}
      {approvingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">
                {locale === "vi" ? `Duyệt yêu cầu hủy đơn ${approvingOrder.code}` : `Approve Cancellation Order ${approvingOrder.code}`}
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {locale === "vi"
                  ? "Hành động này sẽ chấp nhận yêu cầu hủy đơn hàng của khách hàng, hoàn tiền và thu hồi trò chơi khỏi thư viện của họ. Bạn có muốn gửi lời nhắn phản hồi?"
                  : "This action will approve the customer's cancellation request, refund their purchase, and revoke games from their library. Do you want to include a response message?"}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                {locale === "vi" ? "Lời nhắn từ Admin (Tùy chọn)" : "Admin Response Note (Optional)"}
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={locale === "vi" ? "Nhập lời nhắn phản hồi cho khách..." : "Enter reply message for customer..."}
                className="w-full h-24 rounded-lg border border-white/10 bg-zinc-950 px-4 py-2 text-sm text-white outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setApprovingOrder(null);
                  setAdminNote("");
                }}
                disabled={submittingApprove}
                className="text-xs border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                {locale === "vi" ? "Bỏ qua" : "Dismiss"}
              </Button>
              <Button
                onClick={submitApproveCancellation}
                disabled={submittingApprove}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5"
              >
                {submittingApprove && <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />}
                {locale === "vi" ? "Xác nhận duyệt" : "Confirm Approve"}
              </Button>
            </div>
          </Card>
        </div>
      )}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <XCircle className="size-5 text-red-500" />
                {locale === "vi" ? `Từ chối yêu cầu hủy đơn ${rejectingOrder.code}` : `Reject Cancellation Request Order ${rejectingOrder.code}`}
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {locale === "vi"
                  ? "Hành động này sẽ từ chối yêu cầu hủy đơn của khách hàng. Đơn hàng sẽ khôi phục về trạng thái hoạt động bình thường. Bạn có muốn gửi kèm lời nhắn giải thích lý do từ chối?"
                  : "This action will reject the customer's cancellation request. The order status will revert to its active state. Do you want to include an explanation note?"}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                {locale === "vi" ? "Lý do từ chối / Lời nhắn (Tùy chọn)" : "Rejection Reason / Note (Optional)"}
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={locale === "vi" ? "Nhập lời nhắn phản hồi cho khách..." : "Enter reply message for customer..."}
                className="w-full h-24 rounded-lg border border-white/10 bg-zinc-950 px-4 py-2 text-sm text-white outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectingOrder(null);
                  setAdminNote("");
                }}
                disabled={submittingReject}
                className="text-xs border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                {locale === "vi" ? "Bỏ qua" : "Dismiss"}
              </Button>
              <Button
                onClick={submitRejectCancellation}
                disabled={submittingReject}
                className="text-xs bg-red-650 hover:bg-red-600 text-white font-semibold flex items-center gap-1.5"
              >
                {submittingReject && <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />}
                {locale === "vi" ? "Từ chối yêu cầu" : "Confirm Reject"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

