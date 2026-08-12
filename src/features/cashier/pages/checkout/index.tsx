import * as React from "react";
import { useNavigate, useParams, generatePath } from "react-router-dom";
import { Banknote, QrCode, FileStack, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { CASHIER_PATHS } from "@/app/router/paths";
import {
  useTableSession,
  useOrderDetailsBySession,
  useCreateInvoice,
  useCreatePayment,
  useCreateManualDiscount,
  useCloseSession,
  useBranch,
} from "@/features/cashier/api";
import { useAuthStore } from "@/stores/auth.store";
import { ManualDiscountModal } from "@/features/cashier/components/ManualDiscountModal";
import type { ManualDiscountInput } from "@/features/cashier/store/checkout.store";
import { cn } from "@/lib/utils";
import { isBillableDetail, getCancelInfo } from "@/lib/order-detail-billing";

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

const SERVICE_FEE_RATE = 0.05;
const VAT_RATE = 0.08;

/** Gợi ý nhanh số tiền khách đưa */
function buildQuickCashAmounts(total: number): number[] {
  const roundUp = (n: number, step: number) => Math.ceil(n / step) * step;
  const exact = Math.round(total);
  const next100k = roundUp(exact, 100000);
  const next500k = roundUp(next100k + 1, 500000);
  return Array.from(new Set([exact, next100k, next500k]));
}

/**
 * Thanh toán (Checkout)
 * Nguồn: Desktop / Thanh toán
 *
 * Màn "Chốt bàn" của Thu ngân với API thực:
 * 1. Fetch table session + order details
 * 2. Áp chiết khấu tay (POST /manual-discounts)
 * 3. Tạo invoice (POST /invoices)
 * 4. Tạo payment (POST /payments)
 * 5. Đóng session (POST /table-sessions/{id}/close)
 */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { tableSessionId: sessionIdParam } = useParams<{ tableSessionId: string }>();
  const { toast } = useToast();

  const tableSessionId = sessionIdParam ? parseInt(sessionIdParam, 10) : undefined;
  const currentUser = useAuthStore((s) => s.account);
  const branchId = useAuthStore((s) => s.branchId);

  // Fetch data
  const { data: session, isLoading: sessionLoading } = useTableSession(tableSessionId);
  const { data: orderDetails = [], isLoading: orderDetailsLoading } = useOrderDetailsBySession(tableSessionId);
  const { data: branch } = useBranch(branchId ?? undefined);

  // Mutations
  const createInvoiceMutation = useCreateInvoice();
  const createPaymentMutation = useCreatePayment();
  const createManualDiscountMutation = useCreateManualDiscount();
  const closeSessionMutation = useCloseSession();

  // Local state
  const [manualDiscount, setManualDiscount] = React.useState<{
    type: "PERCENTAGE" | "FIXED_AMOUNT";
    value: number;
    amount: number;
    reason: string;
    requiresApproval: boolean;
  } | null>(null);
  const [cashTendered, setCashTendered] = React.useState<number | null>(null);
  const [isDiscountModalOpen, setDiscountModalOpen] = React.useState(false);
  const [invoiceId, setInvoiceId] = React.useState<number | null>(null);
  // Chặn double-submit: React state (isPending) chỉ cập nhật sau khi re-render,
  // nên nếu bấm 2 lần liên tiếp rất nhanh (hoặc double-click) trước khi nút kịp
  // disable, handleIssueInvoice có thể chạy song song 2 lần và tạo 2 hóa đơn /
  // gọi đóng phiên 2 lần -> lỗi "Phiên bàn phải ở trạng thái CHỜ THANH TOÁN...".
  // Dùng ref để chặn ngay lập tức, đồng bộ, không phụ thuộc vào re-render.
  const isSubmittingRef = React.useRef(false);

  // Calculations
  // Chỉ cộng dòng món tính tiền (bỏ qua món đã huỷ không tính tiền), khớp BE
  const subTotal = React.useMemo(
    () =>
      orderDetails
        .filter(isBillableDetail)
        .reduce((sum, d) => sum + (d.price || 0), 0),
    [orderDetails]
  );

  const autoPromoAmount = 0; // TODO: Tính từ promotions
  const afterAutoPromo = subTotal - autoPromoAmount;
  const afterManualDiscount = afterAutoPromo - (manualDiscount?.amount || 0);
  const serviceFee = Math.round(afterManualDiscount * SERVICE_FEE_RATE);
  const vatAmount = Math.round((afterManualDiscount + serviceFee) * VAT_RATE);
  const grandTotal = afterManualDiscount + serviceFee + vatAmount;

  const quickAmounts = React.useMemo(
    () => buildQuickCashAmounts(grandTotal),
    [grandTotal]
  );
  const changeAmount = cashTendered != null ? cashTendered - grandTotal : null;

  const discountThreshold = branch?.discountApprovalThreshold || afterAutoPromo * 0.1;

  function goToQrTransfer() {
    if (!tableSessionId) return;
    navigate(
      generatePath(CASHIER_PATHS.QR_TRANSFER_PAYMENT, { tableSessionId: String(tableSessionId) })
    );
  }

  async function handleApplyDiscount(input: ManualDiscountInput) {
    if (!tableSessionId) return;

    const base = afterAutoPromo;
    const amount =
      input.type === "PERCENTAGE"
        ? Math.round((base * input.value) / 100)
        : Math.min(input.value, base);
    const requiresApproval = amount > discountThreshold;

    try {
      // Nếu đã có invoice, tạo manual discount liên kết với invoice
      // Nếu chưa có invoice, lưu local state và gửi khi tạo invoice
      if (invoiceId) {
        await createManualDiscountMutation.mutateAsync({
          invoiceId,
          type: input.type,
          value: input.value,
          reason: input.reason,
        });
      }

      setManualDiscount({
        type: input.type,
        value: input.value,
        amount,
        reason: input.reason,
        requiresApproval,
      });

      toast({
        title: requiresApproval ? "Đã gửi yêu cầu duyệt" : "Đã áp dụng chiết khấu",
        description: requiresApproval
          ? `Chiết khấu ${formatVnd(amount)} vượt ngưỡng - đã gửi Quản lý duyệt.`
          : `Đã áp dụng chiết khấu ${formatVnd(amount)}.`,
        variant: requiresApproval ? "warning" : "success",
      });
    } catch (error) {
      console.error("Error applying discount:", error);
      toast({
        title: "Lỗi áp dụng chiết khấu",
        description: error instanceof Error ? error.message : "Vui lòng thử lại",
        variant: "danger",
      });
    }
  }

  async function handleIssueInvoice() {
    if (!tableSessionId || !branchId) return;

    // Chặn double-submit (xem giải thích ở khai báo isSubmittingRef phía trên)
    if (isSubmittingRef.current) return;
    // Nếu phiên đã đóng/hủy từ trước (ví dụ do gọi lại trang, hoặc bấm trùng
    // request cũ), không cho gửi lại nữa - tránh việc tạo hóa đơn/thanh toán
    // trùng lặp phía backend.
    if (session && session.status !== "WAITING_FOR_PAY") {
      toast({
        title: "Không thể phát hành hóa đơn",
        description: "Phiên bàn không còn ở trạng thái chờ thanh toán. Vui lòng tải lại trang.",
        variant: "danger",
      });
      return;
    }
    isSubmittingRef.current = true;

    try {
      // 1. Tạo invoice
      const invoice = await createInvoiceMutation.mutateAsync({
        branchId,
        tableSessionId,
      });

      setInvoiceId(invoice.id);

      // 2. Áp manual discount nếu có
      if (manualDiscount && !invoiceId) {
        await createManualDiscountMutation.mutateAsync({
          invoiceId: invoice.id,
          type: manualDiscount.type,
          value: manualDiscount.value,
          reason: manualDiscount.reason,
        });
      }

      // 3. Tạo payment record
      // Lưu ý: amount luôn = grandTotal (thanh toán đủ 100% trong luồng tiền mặt này).
      // Backend (PaymentServiceImpl.processPayment) TỰ ĐỘNG đóng phiên bàn (CLOSED)
      // ngay khi tổng tiền đã trả >= grandTotal của hóa đơn, nên KHÔNG được gọi thêm
      // API đóng phiên ở đây nữa — nếu gọi sẽ luôn bị 409 "Phiên này đã đóng trước đó"
      // vì phiên đã bị đóng ở bước này rồi.
      await createPaymentMutation.mutateAsync({
        invoiceId: invoice.id,
        method: "CASH",
        amount: grandTotal,
        amountTendered: cashTendered || grandTotal,
      });

      toast({
        title: "Thu tiền thành công",
        description: `Đã phát hành hóa đơn #${invoice.id}.`,
        variant: "success",
      });

      navigate(
        generatePath(CASHIER_PATHS.E_INVOICE, {
          invoiceId: String(invoice.id),
        })
      );
    } catch (error) {
      console.error("Error issuing invoice:", error);
      toast({
        title: "Lỗi phát hành hóa đơn",
        description: error instanceof Error ? error.message : "Vui lòng thử lại",
        variant: "danger",
      });
    } finally {
      isSubmittingRef.current = false;
    }
  }

  function handleSplitInvoice() {
    toast({
      title: "Tách hóa đơn",
      description: "Tính năng tách hóa đơn sẽ được triển khai ở phase tiếp theo.",
    });
  }

  // Loading state
  if (sessionLoading || orderDetailsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
          <p className="text-sm text-text-secondary">Đang tải thông tin bàn...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-status-danger-subtle">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-text-primary">
            Không tìm thấy phiên bàn
          </h2>
          <Button className="mt-6" onClick={() => navigate(-1)}>
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  const tableName = session.tableName || `Bàn #${session.tableId}`;
  const guestCount = session.guestCount || 0;
  const waiterName = currentUser?.fullName || "Thu ngân";

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page lg:flex-row">
      {/* ============================================================
          1. CỘT TRÁI: DANH SÁCH MÓN ĐÃ GỌI
          ============================================================ */}
      <div className="flex-1 p-6 sm:p-8">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
          >
            <ChevronLeft className="size-4" />
            <span>Quay lại</span>
          </button>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {tableName} · Chốt bàn
            </h1>
            <p className="mt-1 text-sm text-text-tertiary">
              {guestCount} khách · Phiên #{session.id} · Phục vụ: {waiterName}
            </p>
          </div>
          <StatusBadge type="tableSession" status={session.status} />
        </div>

        <div className="mt-6 divide-y divide-border-default rounded-card border border-border-default bg-surface-card">
          {orderDetails.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-text-tertiary">Chưa có món nào được gọi</p>
            </div>
          ) : (
            orderDetails.map((detail) => {
              const cancelInfo = getCancelInfo(detail);
              const billable = isBillableDetail(detail);

              return (
                <div key={detail.id} className="flex items-start gap-4 px-5 py-4">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-text-secondary">
                    {detail.quantity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-bold text-text-primary",
                        cancelInfo && "text-text-tertiary line-through decoration-1",
                      )}
                    >
                      {detail.dishName}
                    </p>
                    {detail.options && detail.options.length > 0 ? (
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        {detail.options.map((opt) => opt.optionItemName).join(", ")}
                      </p>
                    ) : null}
                    {detail.note ? (
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        {detail.note}
                      </p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <StatusBadge type="orderDetail" status={detail.status} />
                      {cancelInfo ? (
                        <span
                          className={cn(
                            "rounded-pill px-2 py-0.5 text-xs font-semibold",
                            cancelInfo.billable
                              ? "bg-status-warning-subtle text-status-warning"
                              : "bg-status-danger-subtle text-status-danger",
                          )}
                        >
                          {cancelInfo.label} ·{" "}
                          {cancelInfo.billable ? "vẫn tính tiền" : "không tính tiền"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-bold",
                      billable ? "text-text-primary" : "text-text-tertiary line-through",
                    )}
                  >
                    {formatVnd(detail.price || 0)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================
          2. CỘT PHẢI: THANH TOÁN
          ============================================================ */}
      <div className="w-full shrink-0 border-t border-border-default bg-surface-card p-6 sm:p-8 lg:w-[380px] lg:border-t-0 lg:border-l">
        <h2 className="text-xl font-bold text-text-primary">Thanh toán</h2>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Tiền hàng</span>
            <span className="font-medium text-text-primary">
              {formatVnd(subTotal)}
            </span>
          </div>
          {autoPromoAmount > 0 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-status-success">Khuyến mãi tự động</span>
              <span className="font-medium text-status-success">
                −{formatVnd(autoPromoAmount)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Chiết khấu tay</span>
            {manualDiscount ? (
              <button
                type="button"
                onClick={() => setDiscountModalOpen(true)}
                className="font-medium text-status-success underline-offset-2 hover:underline"
              >
                −{formatVnd(manualDiscount.amount)}
                {manualDiscount.requiresApproval ? " (chờ duyệt)" : ""}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDiscountModalOpen(true)}
                className="rounded-pill bg-brand-primary-subtle px-3 py-1 text-xs font-semibold text-brand-primary hover:bg-brand-primary/20"
              >
                + Nhập chiết khấu
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Phí dịch vụ (5%)</span>
            <span className="font-medium text-text-primary">
              {formatVnd(serviceFee)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">VAT (8%)</span>
            <span className="font-medium text-text-primary">
              {formatVnd(vatAmount)}
            </span>
          </div>
        </div>

        <Divider className="my-4" />

        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-text-primary">
            Tổng cộng
          </span>
          <span className="text-2xl font-bold text-brand-primary">
            {formatVnd(grandTotal)}
          </span>
        </div>

        <p className="mt-6 text-xs font-semibold tracking-wide text-text-tertiary">
          HÌNH THỨC THANH TOÁN
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex flex-col items-center gap-2 rounded-md border-2 border-brand-primary bg-surface-card py-4 text-sm font-semibold text-text-primary"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-brand-primary text-text-on-brand">
              <Banknote className="size-4" />
            </span>
            Tiền mặt
          </button>
          <button
            type="button"
            onClick={goToQrTransfer}
            className="flex flex-col items-center gap-2 rounded-md border border-border-default bg-surface-card py-4 text-sm font-semibold text-text-secondary transition-colors hover:border-border-strong"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-surface-muted text-text-tertiary">
              <QrCode className="size-4" />
            </span>
            Chuyển khoản QR
          </button>
        </div>

        <div className="mt-5 space-y-1.5">
          <label className="block text-xs font-semibold text-text-primary">
            Tiền khách đưa
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={
              cashTendered != null ? cashTendered.toLocaleString("vi-VN") : ""
            }
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setCashTendered(raw ? Number(raw) : null);
            }}
            placeholder="0đ"
            className="h-14 w-full rounded-md border border-border-default bg-surface-card px-4 text-xl font-bold text-text-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
          />
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setCashTendered(amount)}
              className={cn(
                "h-9 rounded-md border text-xs font-semibold transition-colors",
                cashTendered === amount
                  ? "border-brand-primary bg-brand-primary-subtle text-brand-primary"
                  : "border-border-default bg-surface-card text-text-secondary hover:border-border-strong",
              )}
            >
              {amount === Math.round(grandTotal)
                ? `Đủ ${formatVnd(amount)}`
                : formatVnd(amount)}
            </button>
          ))}
        </div>

        {changeAmount != null ? (
          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm text-text-secondary">Tiền thối lại</span>
            <span
              className={cn(
                "text-lg font-bold",
                changeAmount >= 0
                  ? "text-status-success"
                  : "text-status-danger",
              )}
            >
              {formatVnd(Math.abs(changeAmount))}
              {changeAmount < 0 ? " (thiếu)" : ""}
            </span>
          </div>
        ) : null}

        <div className="mt-8 space-y-3">
          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleIssueInvoice}
            disabled={
              createInvoiceMutation.isPending || 
              createPaymentMutation.isPending ||
              closeSessionMutation.isPending
            }
          >
            {createInvoiceMutation.isPending || createPaymentMutation.isPending
              ? "Đang xử lý..."
              : "Thu tiền & phát hành hóa đơn"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleSplitInvoice}
          >
            <FileStack className="size-4" />
            Tách hóa đơn
          </Button>
        </div>
      </div>

      <ManualDiscountModal
        open={isDiscountModalOpen}
        onOpenChange={setDiscountModalOpen}
        tableName={tableName}
        sessionCode={`#${session.id}`}
        baseAmount={afterAutoPromo}
        onSubmit={handleApplyDiscount}
      />
    </div>
  );
}