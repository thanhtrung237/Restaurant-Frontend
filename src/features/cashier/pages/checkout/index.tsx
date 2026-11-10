import * as React from "react";
import { useNavigate, useParams, generatePath } from "react-router-dom";
import { Banknote, QrCode, FileStack, ChevronLeft, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  HeaderOverflowMenu,
  type OverflowMenuAction,
} from "@/components/layout/HeaderOverflowMenu";
import { StickyActionBar } from "@/components/layout/StickyActionBar";
import { useToast } from "@/hooks/use-toast";
import { usePageHeader } from "@/hooks/use-page-header";
import { CASHIER_PATHS } from "@/app/router/paths";
import { ROLE_HOME } from "@/app/router/RoleHomeRedirect";
import { useGoBack } from "@/hooks/use-go-back";
import { useBill } from "@/hooks/useBill";
import {
  useTableSession,
  useOrderDetailsBySession,
  useCreateInvoice,
  useCreatePayment,
  useCreateManualDiscount,
  useCloseSession,
} from "@/features/cashier/api";
import { useAuthStore } from "@/stores/auth.store";
import { ManualDiscountModal } from "@/features/cashier/components/ManualDiscountModal";
import { PromotionSelectModal } from "@/features/cashier/components/PromotionSelectModal";
import { useActivePromotionsByBranch } from "@/api/promotions.api";
import type { Promotion } from "@/types/models";
import { useCheckoutStore, type ManualDiscountInput, type ManualDiscountState } from "@/features/cashier/store/checkout.store";
import { calculatePromoDiscount } from "@/features/cashier/components/PromotionSelectModal";
import { cn } from "@/lib/utils";
import { isBillableDetail, getCancelInfo } from "@/lib/order-detail-billing";

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

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
 * 1. Fetch table session + order details + bill (BE tính)
 * 2. Áp chiết khấu tay (POST /manual-discounts)
 * 3. Tạo invoice (POST /invoices)
 * 4. Tạo payment (POST /payments)
 *
 * FE KHÔNG tự tính tiền — mọi con số lấy từ `useBill` / invoice của BE.
 */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { tableSessionId: sessionIdParam } = useParams<{ tableSessionId: string }>();
  const { toast } = useToast();

  const tableSessionId = sessionIdParam ? parseInt(sessionIdParam, 10) : undefined;
  const currentUser = useAuthStore((s) => s.account);
  const branchId = useAuthStore((s) => s.branchId);
  const role = useAuthStore((s) => s.role);
  // Màn Thanh toán mở được bởi Thu ngân / QL chi nhánh / Quản trị NH (Bảng 4.2 "Thu tiền, đóng
  // bàn") nên fallback của nút "Quay lại" phải theo vai trò — ROLE_HOME là Sơ đồ bàn của vai trò.
  const goBack = useGoBack(role ? ROLE_HOME[role] : CASHIER_PATHS.TABLE_MAP);

  // Fetch data
  const { data: session, isLoading: sessionLoading } = useTableSession(tableSessionId);
  const { data: orderDetails = [], isLoading: orderDetailsLoading } = useOrderDetailsBySession(tableSessionId);

  // Lấy bill từ BE (invoice nếu có, preview nếu chưa)
  const { data: bill, isLoading: billLoading } = useBill(tableSessionId);

  // Mutations
  const createInvoiceMutation = useCreateInvoice();
  const createPaymentMutation = useCreatePayment();
  const createManualDiscountMutation = useCreateManualDiscount();
  const closeSessionMutation = useCloseSession();

  const effectiveBranchId = branchId || session?.branchId;
  const { data: branchPromotions = [] } = useActivePromotionsByBranch(effectiveBranchId ?? undefined);

  // Local state
  const [manualDiscount, setManualDiscount] = React.useState<ManualDiscountState | null>(null);
  // undefined: mặc định theo BE; null: thu ngân đã xóa KM; Promotion: thu ngân chọn KM cụ thể
  const [selectedPromo, setSelectedPromo] = React.useState<Promotion | null | undefined>(undefined);
  const [isPromoModalOpen, setIsPromoModalOpen] = React.useState(false);
  const [cashTendered, setCashTendered] = React.useState<number | null>(null);
  const [isDiscountModalOpen, setDiscountModalOpen] = React.useState(false);
  const [invoiceId, setInvoiceId] = React.useState<number | null>(null);
  // Chặn double-submit: React state (isPending) chỉ cập nhật sau khi re-render,
  // nên nếu bấm 2 lần liên tiếp rất nhanh (hoặc double-click) trước khi nút kịp
  // disable, handleIssueInvoice có thể chạy song song 2 lần và tạo 2 hóa đơn /
  // gọi đóng phiên 2 lần -> lỗi "Phiên bàn phải ở trạng thái CHỜ THANH TOÁN...".
  // Dùng ref để chặn ngay lập tức, đồng bộ, không phụ thuộc vào re-render.
  const isSubmittingRef = React.useRef(false);

  // Tiền hàng = tổng giá đã giảm của các món (gốc − KM món)
  const itemsSubTotal = Math.max(
    0,
    (bill?.grossSubTotal ?? 0) - (bill?.itemPromotionDiscount ?? 0),
  );

  // Xác định khuyến mãi cấp đơn đang có hiệu lực
  const effectivePromo = React.useMemo(() => {
    if (selectedPromo === null) {
      return null;
    }
    if (selectedPromo !== undefined) {
      const { discount, isEligible } = calculatePromoDiscount(selectedPromo, itemsSubTotal);
      if (isEligible && discount > 0) {
        return {
          id: selectedPromo.id,
          name: selectedPromo.name,
          discount,
          promo: selectedPromo,
        };
      }
      return null;
    }
    if ((bill?.orderPromotionDiscount ?? 0) > 0) {
      return {
        id: bill?.orderPromotionId ?? null,
        name: bill?.orderPromotionName ?? undefined,
        discount: bill?.orderPromotionDiscount ?? 0,
        promo: null,
      };
    }
    return null;
  }, [selectedPromo, itemsSubTotal, bill]);

  const effectiveOrderPromoDiscount = effectivePromo?.discount ?? 0;
  const effectiveOrderPromoName = effectivePromo?.name;
  const effectiveOrderPromoId = selectedPromo === null ? -1 : (effectivePromo?.id ?? null);

  // Cơ sở tính chiết khấu tay (sau KM đơn)
  const discountBaseAmount = Math.max(0, itemsSubTotal - effectiveOrderPromoDiscount);

  // Chiết khấu tay
  const effectiveManualDiscountAmount = React.useMemo(() => {
    if (!manualDiscount) return 0;
    if ((bill?.manualDiscount ?? 0) > 0 && selectedPromo === undefined) {
      return bill?.manualDiscount ?? 0;
    }
    if (manualDiscount.type === "PERCENTAGE") {
      return Math.round((discountBaseAmount * manualDiscount.value) / 100);
    }
    return Math.min(manualDiscount.value, discountBaseAmount);
  }, [manualDiscount, discountBaseAmount, bill?.manualDiscount, selectedPromo]);

  // Tiền sau chiết khấu (cơ sở cho phí dịch vụ & VAT)
  const baseAmount = Math.max(0, discountBaseAmount - effectiveManualDiscountAmount);

  // Phí dịch vụ
  const serviceFeeRate = bill?.serviceFeeRate ?? 0;
  const effectiveServiceFee = React.useMemo(() => {
    if (selectedPromo === undefined && !manualDiscount && bill) {
      return bill.serviceFee;
    }
    return Math.round((baseAmount * serviceFeeRate) / 100);
  }, [selectedPromo, manualDiscount, bill, baseAmount, serviceFeeRate]);

  // VAT
  const vatRate = bill?.vatRate ?? 0;
  const vatOnServiceFee = bill?.vatOnServiceFee ?? true;
  const effectiveVatAmount = React.useMemo(() => {
    if (selectedPromo === undefined && !manualDiscount && bill) {
      return bill.vatAmount;
    }
    const vatBase = vatOnServiceFee ? baseAmount + effectiveServiceFee : baseAmount;
    return Math.round((vatBase * vatRate) / 100);
  }, [selectedPromo, manualDiscount, bill, vatOnServiceFee, baseAmount, effectiveServiceFee, vatRate]);

  // Tổng cộng hiển thị
  const displayGrandTotal = React.useMemo(() => {
    if (selectedPromo === undefined && !manualDiscount && bill) {
      return bill.grandTotal;
    }
    return Math.max(0, baseAmount + effectiveServiceFee + effectiveVatAmount);
  }, [selectedPromo, manualDiscount, bill, baseAmount, effectiveServiceFee, effectiveVatAmount]);

  const grandTotal = displayGrandTotal;

  const quickAmounts = React.useMemo(
    () => buildQuickCashAmounts(displayGrandTotal),
    [displayGrandTotal]
  );
  const changeAmount = cashTendered != null ? cashTendered - displayGrandTotal : null;

  const displayOrderPromoName = effectiveOrderPromoName;

  function goToQrTransfer() {
    if (!tableSessionId) return;
    useCheckoutStore.getState().setSelectedPromotion(
      selectedPromo === null
        ? { id: -1 }
        : selectedPromo
          ? selectedPromo
          : effectivePromo
            ? { id: effectivePromo.id, name: effectivePromo.name }
            : null
    );
    navigate(
      generatePath(CASHIER_PATHS.QR_TRANSFER_PAYMENT, { tableSessionId: String(tableSessionId) })
    );
  }

  async function handleApplyDiscount(input: ManualDiscountInput) {
    if (!tableSessionId || !effectiveBranchId) return;

    try {
      // Tạo manual discount với invoiceId nếu đã có invoice
      if (invoiceId) {
        await createManualDiscountMutation.mutateAsync({
          invoiceId,
          type: input.type,
          value: input.value,
          reason: input.reason,
        });
      }

      // Lưu vào store để trang QR đọc được
      const discountState: ManualDiscountState = {
        scope: input.scope,
        type: input.type,
        value: input.value,
        reason: input.reason,
        amount: 0, // BE sẽ tính
        requiresApproval: false, // BE sẽ quyết định
      };

      setManualDiscount(discountState);
      useCheckoutStore.getState().setManualDiscount(discountState);

      toast({
        title: "Đã áp dụng chiết khấu",
        description: "Chiết khấu sẽ được tính khi tạo hóa đơn.",
        variant: "success",
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
    if (!tableSessionId || !effectiveBranchId) return;

    // Chặn double-submit (xem giải thích ở khai báo isSubmittingRef phía trên)
    if (isSubmittingRef.current) return;
    // Nếu phiên đã đóng/hủy từ trước, không cho gửi lại nữa - tránh tạo hóa đơn/thanh toán
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
      // 1. Tạo invoice với promotionId nếu có (truyền -1 nếu thu ngân đã xóa khuyến mãi)
      const promoIdToSend = effectiveOrderPromoId === -1 ? -1 : (effectiveOrderPromoId ?? undefined);
      const invoice = await createInvoiceMutation.mutateAsync({
        branchId: effectiveBranchId as number,
        tableSessionId,
        promotionId: promoIdToSend,
      });

      setInvoiceId(invoice.id);

      // 2. Áp manual discount nếu có (và chưa tạo trước đó)
      if (manualDiscount && !invoiceId) {
        await createManualDiscountMutation.mutateAsync({
          invoiceId: invoice.id,
          type: manualDiscount.type,
          value: manualDiscount.value,
          reason: manualDiscount.reason,
        });
      }

      // 3. Tạo payment — DÙNG AMOUNT TỪ INVOICE, KHÔNG TỰ TÍNH.
      // Backend (PaymentServiceImpl.processPayment) TỰ ĐỘNG đóng phiên bàn (CLOSED)
      // khi tổng tiền đã trả >= grandTotal, nên KHÔNG gọi thêm API đóng phiên ở đây.
      await createPaymentMutation.mutateAsync({
        invoiceId: invoice.id,
        method: "CASH",
        amount: invoice.grandTotal, // ← lấy từ BE
        amountTendered: cashTendered || invoice.grandTotal,
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

  const handleSplitInvoice = React.useCallback(() => {
    toast({
      title: "Tách hóa đơn",
      description: "Tính năng tách hóa đơn sẽ được triển khai ở phase tiếp theo.",
    });
  }, [toast]);

  // Header mobile — phải gọi TRƯỚC các nhánh return sớm bên dưới (quy tắc hook).
  // "Tách hóa đơn" là thao tác phụ, đặc tả không yêu cầu, nên ở <md nó vào menu "⋯".
  const checkoutOverflowActions = React.useMemo<OverflowMenuAction[]>(
    () => [
      {
        key: "split-invoice",
        label: "Tách hóa đơn",
        icon: FileStack,
        onSelect: handleSplitInvoice,
      },
    ],
    [handleSplitInvoice],
  );
  const checkoutHeaderOverflow = React.useMemo(
    () => <HeaderOverflowMenu actions={checkoutOverflowActions} />,
    [checkoutOverflowActions],
  );
  usePageHeader({
    title: session
      ? `${session.tableName || `Bàn #${session.tableId}`} · Chốt bàn`
      : "Chốt bàn",
    subtitle: session
      ? `${session.guestCount || 0} khách · Phiên #${session.id} · ${currentUser?.fullName || "Thu ngân"}`
      : undefined,
    headerActions: checkoutHeaderOverflow,
  });

  // Loading state
  if (sessionLoading || orderDetailsLoading || billLoading) {
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
          <Button className="mt-6" onClick={goBack}>
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  const tableName = session.tableName || `Bàn #${session.tableId}`;
  const guestCount = session.guestCount || 0;
  const waiterName = currentUser?.fullName || "Thu ngân";

  const isIssuingInvoice =
    createInvoiceMutation.isPending ||
    createPaymentMutation.isPending ||
    closeSessionMutation.isPending;

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page lg:flex-row">
      {/* ============================================================
          1. CỘT TRÁI: DANH SÁCH MÓN ĐÃ GỌI
          ============================================================ */}
      <div className="flex flex-1 flex-col">
        {/* Thanh tiêu đề trắng + border-bottom, CHỈ trên cột trái — Figma "Thanh toán"
            để cột thanh toán bên phải chạy suốt từ mép trên.
            Ẩn ở <md: tiêu đề đã lên MobileHeader biến thể "back". */}
        <div className="hidden flex-wrap items-center justify-between gap-3 border-b border-border-default bg-surface-card px-6 py-5 sm:px-8 md:flex">
          <div>
            <button
              type="button"
              onClick={goBack}
              className="mb-1 flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
              <span>Quay lại</span>
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {tableName} · Chốt bàn
            </h1>
            <p className="mt-1 text-sm text-text-tertiary">
              {guestCount} khách · Phiên #{session.id} · Thu ngân: {waiterName}
            </p>
          </div>
          <StatusBadge type="tableSession" status={session.status} />
        </div>

        <div className="p-6 sm:p-8">
        {/* <md: badge trạng thái tách riêng vì thanh tiêu đề trên đã ẩn */}
        <div className="mb-4 md:hidden">
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
                      <div className="mt-0.5 space-y-0.5">
                        {detail.options.map((opt) => (
                          <p key={opt.id} className="text-xs text-text-tertiary">
                            + {opt.optionItemName}
                            {opt.priceSnapshot > 0
                              ? ` +${opt.priceSnapshot.toLocaleString("vi-VN")}đ`
                              : " (Miễn phí)"}
                          </p>
                        ))}
                      </div>
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
                  <div className="flex flex-col items-end shrink-0">
                    {billable && detail.promotionDiscountAmount && detail.promotionDiscountAmount > 0 ? (
                      <>
                        <span className="text-xs text-text-tertiary line-through">
                          {formatVnd((detail.price || 0) + detail.promotionDiscountAmount)}
                        </span>
                        <span className="text-sm font-bold text-brand-primary">
                          {formatVnd(detail.price || 0)}
                        </span>
                        <span className="text-[11px] font-semibold text-status-success">
                          -{formatVnd(detail.promotionDiscountAmount)}
                          {detail.promotionName ? ` (${detail.promotionName})` : ""}
                        </span>
                      </>
                    ) : (
                      <span
                        className={cn(
                          "shrink-0 text-sm font-bold",
                          billable ? "text-text-primary" : "text-text-tertiary line-through",
                        )}
                      >
                        {formatVnd(detail.price || 0)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>
      </div>

      {/* ============================================================
          2. CỘT PHẢI: THANH TOÁN
          ============================================================ */}
      <div className="w-full shrink-0 border-t border-border-default bg-surface-card p-6 sm:p-8 lg:w-[380px] lg:border-t-0 lg:border-l">
        <h2 className="text-xl font-bold text-text-primary">Thanh toán</h2>

        <div className="mt-5 space-y-3">
          {bill && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Tiền hàng</span>
                <span className="font-medium text-text-primary">
                  {formatVnd(itemsSubTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  Khuyến mãi đơn{displayOrderPromoName ? ` (${displayOrderPromoName})` : ""}
                </span>
                {effectiveOrderPromoDiscount > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsPromoModalOpen(true)}
                      className="font-medium text-status-success underline-offset-2 hover:underline text-right"
                      title="Thay đổi khuyến mãi"
                    >
                      −{formatVnd(effectiveOrderPromoDiscount)}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPromo(null);
                        useCheckoutStore.getState().setSelectedPromotion({ id: -1 });
                      }}
                      className="rounded-full p-0.5 text-text-tertiary hover:bg-surface-muted hover:text-status-danger transition-colors"
                      title="Bỏ khuyến mãi"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPromoModalOpen(true)}
                    className="rounded-pill bg-brand-primary-subtle px-3 py-1 text-xs font-semibold text-brand-primary hover:bg-brand-primary/20"
                  >
                    + Áp khuyến mãi
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Chiết khấu tay</span>
                {manualDiscount ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDiscountModalOpen(true)}
                      className="font-medium text-status-success underline-offset-2 hover:underline"
                    >
                      −{formatVnd(effectiveManualDiscountAmount)}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setManualDiscount(null);
                        useCheckoutStore.getState().setManualDiscount(null);
                      }}
                      className="rounded-full p-0.5 text-text-tertiary hover:bg-surface-muted hover:text-status-danger transition-colors"
                      title="Bỏ chiết khấu"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
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
                <span className="text-text-secondary">
                  Phí dịch vụ ({serviceFeeRate.toFixed(0)}%)
                </span>
                <span className="font-medium text-text-primary">
                  {formatVnd(effectiveServiceFee)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  VAT ({vatRate.toFixed(0)}%)
                </span>
                <span className="font-medium text-text-primary">
                  {formatVnd(effectiveVatAmount)}
                </span>
              </div>
            </>
          )}
        </div>

        <Divider className="my-4" />

        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-text-primary">
            Tổng cộng
          </span>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold text-brand-primary">
              {formatVnd(displayGrandTotal)}
            </span>
          </div>
        </div>

        {/* Thông báo khi thu ngân đổi hoặc xóa KM */}
        {selectedPromo && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-status-success-subtle px-3 py-2">
            <Tag className="mt-0.5 size-3.5 shrink-0 text-status-success" />
            <p className="text-xs text-status-success leading-relaxed">
              <strong>{selectedPromo.name}</strong> sẽ được áp dụng khi phát hành hóa đơn.
              {effectiveOrderPromoDiscount > 0
                ? ` Giảm ${formatVnd(effectiveOrderPromoDiscount)}.`
                : " (Hóa đơn chưa đủ điều kiện.)"}
            </p>
          </div>
        )}
        {selectedPromo === null && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-surface-muted px-3 py-2">
            <Tag className="mt-0.5 size-3.5 shrink-0 text-text-tertiary" />
            <p className="text-xs text-text-secondary leading-relaxed">
              Đã bỏ áp dụng khuyến mãi đơn hàng cho lần thanh toán này.
            </p>
          </div>
        )}

        {/* Thông báo chiết khấu tay chờ áp */}
        {manualDiscount && bill && bill.manualDiscount === 0 && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-brand-primary-subtle/60 px-3 py-2">
            <Tag className="mt-0.5 size-3.5 shrink-0 text-brand-primary" />
            <p className="text-xs text-brand-primary leading-relaxed">
              Chiết khấu{" "}
              <strong>
                {manualDiscount.value}{manualDiscount.type === "PERCENTAGE" ? "%" : "đ"}
              </strong>{" "}
              ({manualDiscount.reason}) sẽ được áp khi phát hành hóa đơn.
            </p>
          </div>
        )}

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

        {/* Phiên 0đ: backend từ chối phát hành ("Số tiền thanh toán phải > 0"), nên ẩn hẳn
            nút thay vì để thu ngân bấm rồi nhận lỗi. Gỡ phiên là việc của QL chi nhánh
            (Bảng 2.2 — huỷ phiên bắt buộc lý do). */}
        {grandTotal <= 0 ? (
          <div className="mt-8 rounded-card border border-status-warning/30 bg-status-warning-subtle p-4">
            <p className="text-sm font-semibold text-status-warning">
              Phiên không có món nào tính tiền
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Không phát hành được hoá đơn 0đ. Liên hệ Quản lý chi nhánh để huỷ phiên và giải
              phóng bàn.
            </p>
          </div>
        ) : null}

        {/* md+: hai nút cuối cột phải. <md: nút chính xuống thanh cố định, "Tách hóa đơn"
            vào menu "⋯" trên header. */}
        <div className={`mt-8 space-y-3 md:block ${grandTotal <= 0 ? "hidden md:hidden" : "hidden"}`}>
          <Button
            className="w-full"
            size="lg"
            onClick={handleIssueInvoice}
            disabled={isIssuingInvoice}
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

        {/* <md: chỉ hành động CHÍNH nằm ở thanh cố định (FR-PAY-04) */}
        {grandTotal > 0 ? (
        <StickyActionBar>
          <Button
            className="h-11 w-full font-semibold"
            onClick={handleIssueInvoice}
            disabled={isIssuingInvoice}
          >
            {createInvoiceMutation.isPending || createPaymentMutation.isPending
              ? "Đang xử lý..."
              : "Thu tiền & phát hành hóa đơn"}
          </Button>
        </StickyActionBar>
        ) : null}
      </div>

      <ManualDiscountModal
        open={isDiscountModalOpen}
        onOpenChange={setDiscountModalOpen}
        tableName={tableName}
        sessionCode={`#${session.id}`}
        baseAmount={discountBaseAmount}
        onSubmit={handleApplyDiscount}
      />

      <PromotionSelectModal
        open={isPromoModalOpen}
        onOpenChange={setIsPromoModalOpen}
        branchId={effectiveBranchId ?? undefined}
        subtotal={itemsSubTotal} // BE tính KM đơn trên tiền sau KM món
        activePromotions={branchPromotions}
        currentPromotionId={effectiveOrderPromoId !== -1 ? (effectiveOrderPromoId ?? undefined) : null}
        onSelectPromotion={(promo, _discountAmount) => {
          setSelectedPromo(promo);
          useCheckoutStore.getState().setSelectedPromotion(promo ? promo : { id: -1 });
          setIsPromoModalOpen(false);
        }}
      />
    </div>
  );
}