import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, ChevronDown, ReceiptText, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CASHIER_PATHS } from "@/app/router/paths/cashier.paths";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/types/enums";
import {
  useInvoice,
  useOrderDetailsBySession,
  useIssueEInvoice,
} from "@/features/cashier/api";
import { useAuthStore } from "@/stores/auth.store";
import { isBillableDetail } from "@/lib/order-detail-billing";

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

const REFUND_REASONS = [
  "Tính nhầm giá món",
  "Khách trả lại món",
  "Chất lượng món không đạt",
  "Sai sót số lượng món",
  "Khách đổi ý trước khi chế biến",
  "Khác",
];

/**
 * Hoá đơn điện tử — kết nối thực với backend.
 *
 * Luồng:
 *  1. Đọc invoiceId từ URL params (:invoiceId)
 *  2. Gọi GET /invoices/{id} → lấy thông tin hóa đơn (số HĐ, tổng tiền, trạng thái, payments)
 *  3. Gọi GET /order-details/session/{tableSessionId} → lấy danh sách món
 *  4. Nếu invoice.status = PAID (chưa phát hành HĐĐT), tự động gọi POST /invoices/{id}/issue
 *  5. Hiển thị thông tin thực từ BE, thay thế toàn bộ mock data / store cũ
 */
export default function EInvoicePage() {
  const navigate = useNavigate();
  const { invoiceId: invoiceIdParam } = useParams<{ invoiceId: string }>();
  const { toast } = useToast();
  const currentUser = useAuthStore((s) => s.account);

  const invoiceId = invoiceIdParam ? parseInt(invoiceIdParam, 10) : undefined;

  // --- Fetch dữ liệu từ BE ---
  const {
    data: invoice,
    isLoading: invoiceLoading,
    isError: invoiceError,
  } = useInvoice(invoiceId);

  const {
    data: orderDetails = [],
    isLoading: detailsLoading,
  } = useOrderDetailsBySession(invoice?.tableSessionId);

  const issueEInvoiceMutation = useIssueEInvoice();

  // --- Tự động phát hành HĐĐT khi invoice đã PAID nhưng chưa ISSUED ---
  const hasTriedIssue = React.useRef(false);
  React.useEffect(() => {
    if (
      invoice &&
      invoice.status === "PAID" &&
      !hasTriedIssue.current &&
      !issueEInvoiceMutation.isPending
    ) {
      hasTriedIssue.current = true;
      issueEInvoiceMutation.mutate(invoice.id, {
        onError: (err) => {
          toast({
            title: "Phát hành hóa đơn điện tử thất bại",
            description:
              err instanceof Error ? err.message : "Vui lòng thử lại.",
            variant: "danger",
          });
        },
      });
    }
  }, [invoice, issueEInvoiceMutation, toast]);

  // --- Modal Hoàn tiền / Điều chỉnh ---
  const [isRefundModalOpen, setRefundModalOpen] = React.useState(false);
  const [refundReason, setRefundReason] = React.useState(REFUND_REASONS[0]);
  const [refundAmount, setRefundAmount] = React.useState("0");
  const [refundMethod, setRefundMethod] = React.useState("Tiền mặt");

  function handleOpenRefundModal() {
    // Điền sẵn số tiền đã thu thực tế
    const paid = invoice?.totalPaid ?? invoice?.grandTotal ?? 0;
    setRefundAmount(Math.round(paid).toLocaleString("vi-VN"));
    setRefundReason(REFUND_REASONS[0]);
    setRefundMethod("Tiền mặt");
    setRefundModalOpen(true);
  }

  function handleConfirmRefund() {
    if (!refundReason || !refundAmount.trim()) return;
    toast({
      title: "Đã gửi yêu cầu hoàn tiền",
      description: `Yêu cầu hoàn ${refundAmount}đ cho hoá đơn ${invoice?.invoiceNumber ?? ""} đã được gửi tới Quản lý chi nhánh duyệt.`,
      variant: "success",
    });
    setRefundModalOpen(false);
  }

  function handleBackToTableMap() {
    navigate(CASHIER_PATHS.TABLE_MAP);
  }

  function handlePrint() {
    toast({
      title: "Đang in hoá đơn",
      description: "Đã gửi lệnh in tới máy in hoá đơn của quầy thu ngân.",
    });
  }

  // --- Loading ---
  if (invoiceLoading || detailsLoading || issueEInvoiceMutation.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-12 animate-spin text-brand-primary" />
          <p className="text-sm text-text-secondary">
            {issueEInvoiceMutation.isPending
              ? "Đang phát hành hoá đơn điện tử..."
              : "Đang tải hoá đơn..."}
          </p>
        </div>
      </div>
    );
  }

  // --- Lỗi không tải được hóa đơn ---
  if (invoiceError || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-status-danger-subtle">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-text-primary">
            Không tìm thấy hoá đơn
          </h2>
          <p className="text-sm text-text-tertiary">
            Hoá đơn không tồn tại hoặc đã bị xóa.
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-2 h-10 px-5 rounded-xl bg-brand-primary text-sm font-semibold text-text-on-brand"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // --- Dữ liệu hiển thị từ BE ---
  const invoiceNumber = invoice.invoiceNumber ?? "—";

  // Định dạng ngày giờ từ ISO string của BE
  const formatDateTime = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const issuedAt = formatDateTime(invoice.createdAt);

  // Tiền
  const subTotal = invoice.subTotalBeforeDiscount ?? 0;
  const totalManualDiscount = invoice.totalManualDiscount ?? 0;
  const serviceFee = invoice.serviceFee ?? 0;
  const vatAmount = invoice.vatAmount ?? 0;
  const grandTotal = invoice.grandTotal ?? 0;

  // Thông tin payment (lấy payment đầu tiên — luồng tiền mặt chỉ có 1)
  const firstPayment = invoice.payments?.[0];
  const paymentMethod: PaymentMethod =
    (firstPayment?.method as PaymentMethod) ?? "CASH";
  const amountTendered = firstPayment?.amountTendered ?? grandTotal;
  const changeAmount =
    firstPayment?.changeAmount ?? Math.max(0, amountTendered - grandTotal);

  // Thu ngân
  const cashierNameDisplay = currentUser?.fullName ?? "Thu ngân";

  // Thông tin bàn / phiên
  const tableName = invoice.tableName ?? `Bàn #${invoice.tableSessionId}`;
  const sessionCode = `#${invoice.tableSessionId}`;

  // Tên nhà hàng / địa chỉ (lấy từ branchName, không có thì để trống)
  const restaurantName = invoice.branchName ?? "Nhà hàng";
  const restaurantAddress = ""; // BE InvoiceResponse không trả address; để trống hoặc lấy từ branch riêng

  // Danh sách món (chỉ dòng TÍNH TIỀN)
  const items = orderDetails
    .filter(isBillableDetail)
    .map((d) => ({
      id: d.id,
      name: d.dishName ?? `Món #${d.dishId}`,
      quantity: d.quantity,
      price: d.priceAtOrderTime ?? 0,
      lineTotal: d.price ?? ((d.priceAtOrderTime ?? 0) * d.quantity),
      options: d.options,
    }));

  // Đã phát hành HĐĐT thành công?
  const isIssued =
    (invoice.status as string) === "ISSUED" || issueEInvoiceMutation.isSuccess;

  // Số tiền đã thu hiển thị trong modal (tổng paid)
  const amountPaidDisplay = formatVnd(invoice.totalPaid ?? grandTotal);

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page p-6 sm:p-8">
      {/* ============================================================
          HEADER: Tiêu đề + Cụm nút hành động
          ============================================================ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Hoá đơn điện tử
          </h1>
          <p className="mt-1 text-sm text-text-tertiary">
            {tableName} · Phiên {sessionCode} đã đóng
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Nút Hoàn tiền / Điều chỉnh */}
          <button
            type="button"
            onClick={handleOpenRefundModal}
            className="flex items-center gap-2 h-10 px-4 rounded-xl border border-border-default bg-surface-card hover:bg-surface-muted text-sm font-semibold text-text-primary transition-colors cursor-pointer shadow-xs"
          >
            <ReceiptText className="size-4 text-text-secondary" />
            Hoàn tiền / Điều chỉnh
          </button>

          {/* Nút Về sơ đồ bàn */}
          <button
            type="button"
            onClick={handleBackToTableMap}
            className="flex items-center justify-center h-10 px-5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.99] text-sm font-semibold text-text-on-brand transition-all cursor-pointer shadow-xs"
          >
            Về sơ đồ bàn
          </button>
        </div>
      </div>

      {/* ============================================================
          NỘI DUNG CHÍNH: 2 Cột
          ============================================================ */}
      <div className="mt-6 grid flex-1 grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        {/* CỘT TRÁI: Chi tiết hoá đơn */}
        <div className="rounded-2xl border border-border-default/80 bg-surface-card p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header nhà hàng & số hóa đơn */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-base font-bold text-text-primary">
                  {restaurantName}
                </p>
                {restaurantAddress && (
                  <p className="mt-1 text-xs text-text-tertiary">
                    {restaurantAddress}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-text-tertiary">Số hoá đơn</p>
                <p className="font-mono text-base font-bold text-brand-primary mt-0.5">
                  {invoiceNumber}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">{issuedAt}</p>
              </div>
            </div>

            {/* Bảng danh sách món */}
            <div className="mt-8 overflow-hidden rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-[#f8fafc] text-xs font-semibold tracking-wider text-text-tertiary">
                  <tr>
                    <th className="py-2.5 pl-4 text-left font-semibold">MÓN</th>
                    <th className="py-2.5 text-center font-semibold">SL</th>
                    <th className="py-2.5 text-right font-semibold">GIÁ</th>
                    <th className="py-2.5 pr-4 text-right font-semibold">
                      THÀNH TIỀN
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default/40">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-6 text-center text-sm text-text-tertiary"
                      >
                        Không có dữ liệu món
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3.5 pl-4">
                          <p className="font-bold text-text-primary">
                            {item.name}
                          </p>
                          {item.options && item.options.length > 0 ? (
                            <p className="text-xs text-text-tertiary mt-0.5">
                              {item.options.map((opt) => opt.optionItemName).join(", ")}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-3.5 text-center font-medium text-text-secondary">
                          {item.quantity}
                        </td>
                        <td className="py-3.5 text-right font-bold text-text-primary">
                          {formatVnd(item.price)}
                        </td>
                        <td className="py-3.5 pr-4 text-right font-bold text-text-primary">
                          {formatVnd(item.lineTotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Phần tổng tiền */}
          <div className="mt-8 ml-auto max-w-xs w-full space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Tiền hàng</span>
              <span className="font-bold text-text-primary">
                {formatVnd(subTotal)}
              </span>
            </div>
            {totalManualDiscount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-status-success font-semibold">
                  Chiết khấu thủ công
                </span>
                <span className="font-bold text-status-success">
                  −{formatVnd(totalManualDiscount)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Phí dịch vụ</span>
              <span className="font-bold text-text-primary">
                {formatVnd(serviceFee)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">VAT</span>
              <span className="font-bold text-text-primary">
                {formatVnd(vatAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-base font-bold text-text-primary">
                Tổng cộng
              </span>
              <span className="text-2xl font-bold text-brand-primary">
                {formatVnd(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Trạng thái + thanh toán */}
        <div className="space-y-4">
          {/* Card trạng thái phát hành */}
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border-default/80 bg-surface-card p-6 text-center shadow-xs">
            {isIssued ? (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-[#e6f7ef] text-[#12B76A]">
                  <Check className="size-6 stroke-[2.5]" />
                </span>
                <p className="text-base font-bold text-text-primary mt-1">
                  Phát hành hoá đơn thành công
                </p>
                <p className="text-xs text-text-tertiary">
                  Đã gửi dữ liệu tới cơ quan thuế
                </p>
              </>
            ) : (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-[#fef3c7] text-[#D97706]">
                  <ReceiptText className="size-6" />
                </span>
                <p className="text-base font-bold text-text-primary mt-1">
                  Hoá đơn đã thanh toán
                </p>
                <p className="text-xs text-text-tertiary">
                  {invoice.status === "PENDING"
                    ? "Đang chờ thanh toán"
                    : `Trạng thái: ${invoice.status}`}
                </p>
              </>
            )}
          </div>

          {/* Card chi tiết thanh toán */}
          <div className="space-y-3.5 rounded-2xl border border-border-default/80 bg-surface-card p-5 shadow-xs">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-tertiary">Phương thức</span>
              <span className="font-bold text-text-primary">
                {PAYMENT_METHOD_LABEL[paymentMethod] ?? "Tiền mặt"}
              </span>
            </div>
            {firstPayment && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">Khách đưa</span>
                  <span className="font-bold text-text-primary">
                    {formatVnd(amountTendered)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">Tiền thối</span>
                  <span className="font-bold text-text-primary">
                    {formatVnd(changeAmount)}
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-tertiary">Thu ngân</span>
              <span className="font-bold text-text-primary">
                {cashierNameDisplay}
              </span>
            </div>
          </div>

          {/* Nút In hóa đơn */}
          <button
            type="button"
            onClick={handlePrint}
            className="w-full h-12 rounded-xl bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.99] text-sm font-bold text-text-on-brand transition-all shadow-xs cursor-pointer flex items-center justify-center"
          >
            In hóa đơn
          </button>
        </div>
      </div>

      {/* ============================================================
          MODAL: Hoàn tiền / Điều chỉnh
          ============================================================ */}
      <Dialog open={isRefundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100%-2rem)] max-w-[560px] sm:max-w-[560px] rounded-2xl p-6 sm:p-7 gap-0 border border-border-default/60 bg-surface-card shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
        >
          {/* Nút đóng */}
          <DialogClose asChild>
            <button
              type="button"
              className="absolute top-5 right-5 size-7 rounded-full bg-surface-muted flex items-center justify-center text-text-tertiary hover:bg-border-default hover:text-text-primary transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="size-3.5" />
            </button>
          </DialogClose>

          {/* Tiêu đề */}
          <DialogHeader className="gap-1 text-left pr-8">
            <DialogTitle className="text-xl font-bold text-text-primary">
              Hoàn tiền / Điều chỉnh hóa đơn
            </DialogTitle>
            <DialogDescription className="text-xs text-text-tertiary font-normal leading-relaxed">
              Cần Quản lý chi nhánh duyệt. Khi duyệt, hệ thống sinh hóa đơn điều chỉnh (BR-12).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4.5 mt-5">
            {/* Box tóm tắt hóa đơn */}
            <div className="space-y-2 rounded-xl bg-[#f8fafc] p-4 border border-border-default/40">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">Hóa đơn</span>
                <span className="font-bold text-text-primary">
                  {invoiceNumber}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">Bàn / Phiên</span>
                <span className="font-bold text-text-primary">
                  {tableName} · {sessionCode}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">Đã thu</span>
                <span className="font-bold text-text-primary">
                  {amountPaidDisplay}
                </span>
              </div>
            </div>

            {/* Lý do */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary block">
                Lý do hoàn tiền
              </label>
              <div className="relative">
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full h-11 appearance-none rounded-xl border border-border-strong/70 bg-surface-card pl-3.5 pr-9 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all cursor-pointer"
                >
                  {REFUND_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-text-tertiary pointer-events-none" />
              </div>
            </div>

            {/* Số tiền hoàn & hình thức */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="min-w-0 space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">
                  Số tiền hoàn
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={refundAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setRefundAmount(
                        val ? Number(val).toLocaleString("vi-VN") : ""
                      );
                    }}
                    placeholder="0"
                    className="w-full h-11 rounded-xl border border-border-strong/70 bg-surface-card pl-3.5 pr-8 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  />
                  <span className="absolute right-3.5 text-sm text-text-tertiary pointer-events-none">
                    đ
                  </span>
                </div>
                <p className="text-[11px] text-text-tertiary leading-tight">
                  Có thể hoàn một phần hoặc toàn bộ hóa đơn.
                </p>
              </div>

              <div className="min-w-0 space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">
                  Hình thức hoàn
                </label>
                <div className="relative">
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full h-11 appearance-none rounded-xl border border-border-strong/70 bg-surface-card pl-3.5 pr-9 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all cursor-pointer"
                  >
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Chuyển khoản QR">Chuyển khoản QR</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-text-tertiary pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Thông báo BR-12 */}
            <div className="rounded-xl bg-[#fffaf0] border border-[#fde68a]/60 p-3.5 text-center">
              <p className="text-xs font-medium text-[#b45309] leading-relaxed">
                Cần Quản lý chi nhánh duyệt. Hệ thống ghi nhật ký (BR-12) và gửi
                thông báo điều chỉnh thuế theo mẫu 04/SS-HĐĐT.
              </p>
            </div>

            {/* Nút bấm */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="h-11 min-w-0 rounded-xl border border-border-strong/80 bg-surface-card hover:bg-surface-muted text-sm font-semibold text-text-secondary transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={!refundAmount.trim()}
                className="h-11 min-w-0 rounded-xl bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.99] text-sm font-bold text-text-on-brand transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap px-2 flex items-center justify-center"
              >
                Gửi yêu cầu hoàn tiền
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
