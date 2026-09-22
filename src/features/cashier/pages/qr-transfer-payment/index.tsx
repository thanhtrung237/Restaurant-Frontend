import * as React from "react";
import { useNavigate, useParams, generatePath } from "react-router-dom";
import { Banknote, QrCode, Loader2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { usePageHeader } from "@/hooks/use-page-header";
import { CASHIER_PATHS, BRANCH_MANAGER_PATHS } from "@/app/router/paths";
import { getBankLabel } from "@/config/banks";
import { useGoBack } from "@/hooks/use-go-back";
import { useBill } from "@/hooks/useBill";
import { ApiError, getErrorMessage, isApiStatus } from "@/lib/http";
import { APP_ROLE } from "@/config/roles";
import {
  useTableSession,
  useOrderDetailsBySession,
  useCreateInvoice,
  useCreateManualDiscount,
  useInvoiceBySession,
  useInvoiceQrCode,
  useCreatePayment,
  useBranch,
} from "@/features/cashier/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth.store";
import { useCheckoutStore } from "@/features/cashier/store/checkout.store";

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

// Poll hóa đơn mỗi 1s để biết khi nào khách đã chuyển khoản xong — CÙNG cơ chế
// với trang khách hàng (`payment-qr`), để 2 màn hình luôn phản ánh đúng 1 nguồn
// sự thật duy nhất là dữ liệu trên backend, thay vì tự suy đoán ở mỗi phía.
const POLL_INTERVAL_MS = 1000;

/**
 * Tạo hoạ tiết QR giả lập (không gọi thư viện ngoài) — pattern tất định dựa trên
 * seed để mỗi hoá đơn có 1 mã QR "trông giống thật" nhưng ổn định giữa các lần render.
 */
function PseudoQrCode({ seed, size = 220 }: { seed: string; size?: number }) {
  const GRID = 21;
  const cell = size / GRID;

  const modules = React.useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++)
      h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const rand = () => {
      h = (h * 1664525 + 1013904223) >>> 0;
      return h / 0xffffffff;
    };
    const grid: boolean[][] = Array.from({ length: GRID }, () =>
      Array.from({ length: GRID }, () => rand() > 0.55),
    );
    const clearCorner = (r0: number, c0: number) => {
      for (let r = r0; r < r0 + 7; r++)
        for (let c = c0; c < c0 + 7; c++) grid[r][c] = false;
    };
    clearCorner(0, 0);
    clearCorner(0, GRID - 7);
    clearCorner(GRID - 7, 0);
    return grid;
  }, [seed]);

  const Finder = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x * cell}, ${y * cell})`}>
      <rect width={cell * 7} height={cell * 7} fill="#111111" />
      <rect x={cell} y={cell} width={cell * 5} height={cell * 5} fill="#ffffff" />
      <rect x={cell * 2} y={cell * 2} width={cell * 3} height={cell * 3} fill="#111111" />
    </g>
  );

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Mã QR chuyển khoản">
      <rect width={size} height={size} fill="#ffffff" />
      {modules.map((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#111111" />
          ) : null,
        ),
      )}
      <Finder x={0} y={0} />
      <Finder x={GRID - 7} y={0} />
      <Finder x={0} y={GRID - 7} />
    </svg>
  );
}

/**
 * Thanh toán · Chuyển khoản QR
 * Nguồn: Desktop / Thanh toán · Chuyển khoản QR
 *
 * SỬA LỖI ĐỒNG BỘ (09/2026): trước đây màn này dùng 1 `setTimeout` 4 giây để TỰ
 * COI NHƯ khách đã chuyển khoản xong, hoàn toàn không liên quan gì tới việc
 * khách có thực sự thao tác ở trang `payment-qr` (`/ban/:code/thanh-toan-qr`)
 * hay chưa → Thu ngân thấy "Đã nhận chuyển khoản" dù khách chưa làm gì cả.
 *
 * Luồng ĐÚNG bây giờ (đồng bộ qua backend, không có state giả ở FE):
 * 1. Vào màn này → tạo Invoice NGAY (POST /invoices) thay vì đợi tới lúc bấm nút
 *    cuối cùng — để trang khách hàng có hóa đơn để GET và thanh toán vào.
 * 2. Poll GET /invoices/session/{id} (giống hệt trang khách hàng).
 * 3. Khi khách thao tác xong ở trang `payment-qr` (tạo `Payment` đủ tiền),
 *    backend (`PaymentServiceImpl.processPayment`) tự set Invoice.status = PAID
 *    và tự đóng phiên bàn.
 * 4. Thu ngân CHỈ thấy "Đã nhận chuyển khoản" khi poll thấy invoice.status thực
 *    sự = PAID. Nút "Thu tiền & phát hành hoá đơn" lúc đó chỉ còn tác dụng điều
 *    hướng sang trang hoá đơn điện tử.
 *
 * Số tiền hiển thị lấy từ `useBill` / invoice của BE — FE KHÔNG tự tính.
 */
export default function QrTransferPaymentPage() {
  const navigate = useNavigate();
  const { tableSessionId: sessionIdParam } = useParams<{ tableSessionId: string }>();
  const { toast } = useToast();

  const tableSessionId = sessionIdParam ? parseInt(sessionIdParam, 10) : undefined;
  const currentUser = useAuthStore((s) => s.account);
  const branchId = useAuthStore((s) => s.branchId);
  const role = useAuthStore((s) => s.role);
  // Chuyển khoản QR chỉ có route dưới /thu-ngan (xem app/router/index.tsx) → fallback cố định.
  const goBack = useGoBack(CASHIER_PATHS.TABLE_MAP);
  // Chỉ QL chi nhánh / Quản trị NH mới vào được trang Cấu hình chi nhánh (FR-BRN-02).
  // Thu ngân thấy cảnh báo nhưng không thấy nút — bấm vào cũng chỉ ra trang 403.
  const canConfigBranch =
    role === APP_ROLE.BRANCH_MANAGER || role === APP_ROLE.RESTAURANT_ADMIN;

  const { data: session, isLoading: sessionLoading } = useTableSession(tableSessionId);
  const { data: orderDetails = [], isLoading: orderDetailsLoading } = useOrderDetailsBySession(tableSessionId);
  const { data: branch } = useBranch(branchId ?? undefined);

  // Lấy bill từ BE
  const { data: bill } = useBill(tableSessionId);

  const createInvoiceMutation = useCreateInvoice();
  const createManualDiscountMutation = useCreateManualDiscount();

  // Đọc state từ trang checkout (nếu đi từ trang đó)
  const storedManualDiscount = useCheckoutStore((s) => s.manualDiscount);
  const storedPromotion = useCheckoutStore((s) => s.selectedPromotion);
  const setPaymentMethod = useCheckoutStore((s) => s.setPaymentMethod);

  // Nguồn sự thật DUY NHẤT cho việc "đã nhận chuyển khoản hay chưa": hóa đơn
  // thật lấy từ backend, poll liên tục — không dùng state cục bộ nào khác.
  const { data: invoice, isFetched: invoiceFetched } = useInvoiceBySession(tableSessionId, {
    refetchInterval: POLL_INTERVAL_MS,
  });
  const qrPaid = invoice?.status === "PAID";

  // Lấy dữ liệu VietQR chính thức từ backend
  const { data: qrData, isLoading: qrLoading, error: qrError } = useInvoiceQrCode(invoice?.id);

  /**
   * Tạo hoá đơn ĐÚNG MỘT LẦN cho mỗi phiên.
   *
   * Bản trước: nhánh `catch` đặt lại cờ "đã thử" về `false`, mà effect lại phụ thuộc vào
   * `invoice` / `session` (đang poll 1 giây/lần) và vào chính đối tượng mutation (đổi mỗi lần
   * render) ⇒ lỗi là gọi lại ngay, lỗi tiếp là gọi lại tiếp. Đo được **444 lần `POST /invoices`
   * trong 6 giây** khi backend trả lỗi.
   *
   * Nay: cờ ref giữ ID phiên đã thử và KHÔNG bao giờ tự đặt lại — chỉ Thu ngân bấm "Thử lại"
   * mới gọi lần nữa. Mọi thứ hay đổi (dữ liệu poll, mutation) đọc qua `liveRef` nên effect chỉ
   * phụ thuộc vào ID phiên / ID chi nhánh.
   */
  const invoiceAttemptedForSessionRef = React.useRef<number | null>(null);
  const [invoiceCreating, setInvoiceCreating] = React.useState(false);
  const [invoiceCreateError, setInvoiceCreateError] = React.useState<string | null>(null);

  // Số tiền: ưu tiên invoice thật, sau đó tới bill preview của BE
  const grandTotal = invoice?.grandTotal ?? bill?.grandTotal ?? 0;
  const remainingAmount = qrData?.remainingAmount ?? invoice?.remainingAmount ?? grandTotal;
  const amountToCollect = remainingAmount > 0 ? remainingAmount : grandTotal;

  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const createPaymentMutation = useCreatePayment();

  /**
   * Chi nhánh CHƯA cấu hình tài khoản thì KHÔNG được hiện mã QR.
   *
   * Hai lớp, cố ý giữ cả hai:
   *  1. Dữ liệu chi nhánh — chặn được NGAY, không phải đợi gọi API sinh QR, và hiện được
   *     nút mở màn Cấu hình chi nhánh.
   *  2. Mã **409** từ `GET /invoices/{id}/qr-code` — backend nay từ chối sinh QR khi chi
   *     nhánh chưa cấu hình (be-issues mục 5, đã bỏ tài khoản hardcode). Lớp này bắt cả
   *     trường hợp dữ liệu chi nhánh ở FE đã cũ.
   */
  const isBankAccountNotConfigured = qrError instanceof ApiError && qrError.status === 409;
  const hasBankConfig =
    Boolean(branch?.bankAccountNo && branch?.bankName) && !isBankAccountNotConfigured;

  const bankAccountLabel = hasBankConfig
    ? `${getBankLabel(branch?.bankName)} · ${branch?.bankAccountNo}`
    : "";
  const bankAccountOwner = hasBankConfig
    ? (qrData?.accountName || branch?.restaurantName || branch?.name || "")
    : "";
  const transferContent = qrData?.transferContent || (invoice?.invoiceNumber ? `TT ${invoice.invoiceNumber.replace(/-/g, "")}` : "");

  React.useEffect(() => {
    setPaymentMethod("BANK_TRANSFER");
  }, [setPaymentMethod]);

  // Mọi giá trị HAY ĐỔI mà việc tạo hoá đơn cần đọc — để ngoài danh sách phụ thuộc của effect.
  // Gán ngay trong thân render: lần gọi nào cũng thấy giá trị mới nhất, mà không kích hoạt effect.
  const liveRef = React.useRef({
    invoice,
    session,
    storedManualDiscount,
    storedPromotion,
    createInvoice: createInvoiceMutation.mutateAsync,
    createManualDiscount: createManualDiscountMutation.mutateAsync,
    toast,
  });
  // Cập nhật sau MỖI lần render (effect không có mảng phụ thuộc), và effect này khai trước
  // effect tạo hoá đơn nên luôn chạy trước nó — `liveRef` không bao giờ đọc phải giá trị cũ.
  React.useEffect(() => {
    liveRef.current = {
      invoice,
      session,
      storedManualDiscount,
      storedPromotion,
      createInvoice: createInvoiceMutation.mutateAsync,
      createManualDiscount: createManualDiscountMutation.mutateAsync,
      toast,
    };
  });

  const syncedPromoIdRef = React.useRef<number | null | undefined>(undefined);

  /** Tạo hoặc đồng bộ hoá đơn cho phiên này. */
  const createInvoiceForSession = React.useCallback(async () => {
    if (!tableSessionId || !branchId) return;
    const live = liveRef.current;
    const targetPromoId = live.storedPromotion?.id ?? null;

    if (live.invoice) {
      if (live.invoice.status !== "PENDING") return;
      // Không có KM chọn thủ công ở trang checkout → BE đã quyết định KM, không cần đồng bộ.
      if (!live.storedPromotion) return;
      if (live.invoice.promotionId === targetPromoId && syncedPromoIdRef.current === targetPromoId) {
        return;
      }
      if (live.invoice.promotionId === targetPromoId) {
        syncedPromoIdRef.current = targetPromoId;
        return;
      }
    }

    // Phiên không ở CHỜ THANH TOÁN thì backend từ chối — đừng gọi cho phí một request.
    if (live.session && live.session.status !== "WAITING_FOR_PAY") return;

    setInvoiceCreating(true);
    setInvoiceCreateError(null);
    try {
      const created = await live.createInvoice({
        branchId,
        tableSessionId,
        promotionId: targetPromoId ?? undefined,
      });
      syncedPromoIdRef.current = targetPromoId;
      if (live.storedManualDiscount && !live.invoice) {
        await live.createManualDiscount({
          invoiceId: created.id,
          type: live.storedManualDiscount.type,
          value: live.storedManualDiscount.value,
          reason: live.storedManualDiscount.reason,
        });
      }
    } catch (error) {
      const errMsg = getErrorMessage(error);
      // Hoá đơn đã có sẵn (người khác vừa tạo, hoặc nhịp poll chưa kịp về) — không phải lỗi.
      if (isApiStatus(error, 409) || errMsg.includes("đã tồn tại")) return;
      setInvoiceCreateError(errMsg);
      live.toast({
        title: "Chưa tạo được hoá đơn",
        description: `${errMsg} — bấm "Thử lại" để gọi lại.`,
        variant: "danger",
      });
    } finally {
      setInvoiceCreating(false);
    }
  }, [tableSessionId, branchId]);

  /**
   * Tạo hoặc đồng bộ khuyến mãi hoá đơn ngay khi vào màn QR — không đợi khách chuyển khoản xong.
   */
  React.useEffect(() => {
    if (!tableSessionId || !branchId || !invoiceFetched) return;
    const targetPromoId = storedPromotion?.id ?? null;
    const needsPromoSync =
      Boolean(storedPromotion) &&
      invoice &&
      invoice.status === "PENDING" &&
      invoice.promotionId !== targetPromoId &&
      syncedPromoIdRef.current !== targetPromoId;

    if (invoiceAttemptedForSessionRef.current !== tableSessionId || needsPromoSync) {
      invoiceAttemptedForSessionRef.current = tableSessionId;
      void createInvoiceForSession();
    }
  }, [tableSessionId, branchId, invoiceFetched, createInvoiceForSession, storedPromotion, invoice?.status, invoice?.promotionId]);

  /** Thu ngân bấm "Thử lại" — lần gọi lại DUY NHẤT do người dùng chủ động. */
  function handleRetryCreateInvoice() {
    void createInvoiceForSession();
  }

  // Báo cho Thu ngân biết ngay khi backend xác nhận đã nhận đủ tiền
  const wasQrPaidRef = React.useRef(false);
  React.useEffect(() => {
    if (qrPaid && !wasQrPaidRef.current) {
      wasQrPaidRef.current = true;
      toast({
        title: "Đã nhận chuyển khoản",
        description: `Đã nhận đủ ${formatVnd(grandTotal)}.`,
        variant: "success",
      });
    }
  }, [qrPaid, grandTotal, toast]);

  function goBackToCash() {
    if (!tableSessionId) return;
    setPaymentMethod("CASH");
    navigate(generatePath(CASHIER_PATHS.CHECKOUT, { tableSessionId: String(tableSessionId) }));
  }

  function handleIssueInvoice() {
    if (!invoice) return;
    navigate(generatePath(CASHIER_PATHS.E_INVOICE, { invoiceId: String(invoice.id) }));
  }

  // Thu ngân bấm xác nhận khách đã chuyển khoản thành công trong Modal
  async function handleConfirmPaymentAndIssue() {
    if (!tableSessionId) return;

    try {
      setIsConfirming(true);

      // 1. Đảm bảo có invoice
      let currentInvoice = invoice;
      if (!currentInvoice?.id) {
        currentInvoice = await createInvoiceMutation.mutateAsync({
          branchId: branchId || 1,
          tableSessionId,
          promotionId: storedPromotion?.id, // Từ store
        });

        // Áp manual discount nếu có từ store
        if (storedManualDiscount) {
          await createManualDiscountMutation.mutateAsync({
            invoiceId: currentInvoice.id,
            type: storedManualDiscount.type,
            value: storedManualDiscount.value,
            reason: storedManualDiscount.reason,
          });
        }
      }

      // 2. Thu tiền (tạo Payment record BANK_TRANSFER) — DÙNG AMOUNT TỪ INVOICE
      await createPaymentMutation.mutateAsync({
        invoiceId: currentInvoice.id,
        method: "BANK_TRANSFER",
        amount: currentInvoice.remainingAmount || currentInvoice.grandTotal, // ← TỪ BE
      });

      toast({
        title: "Xác nhận chuyển khoản thành công",
        description: `Đã thu ${formatVnd(amountToCollect)} và đóng bàn thành công.`,
        variant: "success",
      });

      setConfirmModalOpen(false);

      // 3. Chuyển sang màn hóa đơn điện tử
      navigate(generatePath(CASHIER_PATHS.E_INVOICE, { invoiceId: String(currentInvoice.id) }));
    } catch (error) {
      console.error("Lỗi khi xác nhận thanh toán:", error);
      toast({
        title: "Lỗi xác nhận thanh toán",
        description: error instanceof Error ? error.message : "Vui lòng thử lại",
        variant: "danger",
      });
    } finally {
      setIsConfirming(false);
    }
  }

  // Màn con — gọi TRƯỚC các nhánh return sớm (quy tắc hook).
  usePageHeader({
    title: session
      ? `${session.tableName || `Bàn #${session.tableId}`} · Chuyển khoản`
      : "Thanh toán chuyển khoản",
    subtitle: session
      ? `${session.guestCount || 0} khách · Phiên #${session.id}`
      : undefined,
  });

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
          <h2 className="text-lg font-bold text-text-primary">Không tìm thấy phiên bàn</h2>
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

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page lg:flex-row">
      {/* CỘT TRÁI: DANH SÁCH MÓN */}
      <div className="flex-1 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* Ẩn ở <md: tiêu đề đã lên MobileHeader (màn con, biến thể "back") */}
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {tableName} · Chốt bàn
            </h1>
            <p className="mt-1 text-sm text-text-tertiary">
              {guestCount} khách · Phiên #{session.id} · Thu ngân: {waiterName}
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
            orderDetails.map((detail) => (
              <div key={detail.id} className="flex items-start gap-4 px-5 py-4">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-text-secondary">
                  {detail.quantity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-text-primary">{detail.dishName}</p>
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
                    <p className="mt-0.5 text-xs text-text-tertiary">{detail.note}</p>
                  ) : null}
                  <div className="mt-1">
                    <StatusBadge type="orderDetail" status={detail.status} />
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  {detail.promotionDiscountAmount && detail.promotionDiscountAmount > 0 ? (
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
                    <span className="shrink-0 text-sm font-bold text-text-primary">
                      {formatVnd(detail.price || 0)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CỘT PHẢI: THANH TOÁN QR */}
      <div className="w-full shrink-0 border-t border-border-default bg-surface-card p-6 sm:p-8 lg:w-[380px] lg:border-t-0 lg:border-l">
        <h2 className="text-xl font-bold text-text-primary">Thanh toán</h2>

        <div className="mt-5 space-y-3">
          {bill && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Tiền hàng</span>
                <span className="font-medium text-text-primary">
                  {formatVnd(bill.grossSubTotal - bill.itemPromotionDiscount)}
                </span>
              </div>

              {bill.orderPromotionDiscount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-status-success">
                    Khuyến mãi đơn{bill.orderPromotionName ? ` (${bill.orderPromotionName})` : ""}
                  </span>
                  <span className="font-medium text-status-success">
                    −{formatVnd(bill.orderPromotionDiscount)}
                  </span>
                </div>
              )}

              {bill.manualDiscount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Chiết khấu tay</span>
                  <span className="font-medium text-text-primary">
                    −{formatVnd(bill.manualDiscount)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  Phí dịch vụ ({bill.serviceFeeRate.toFixed(0)}%)
                </span>
                <span className="font-medium text-text-primary">
                  {formatVnd(bill.serviceFee)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  VAT ({bill.vatRate.toFixed(0)}%)
                </span>
                <span className="font-medium text-text-primary">
                  {formatVnd(bill.vatAmount)}
                </span>
              </div>
            </>
          )}
        </div>

        <Divider className="my-4" />

        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-text-primary">Tổng cộng</span>
          <span className="text-2xl font-bold text-brand-primary">{formatVnd(grandTotal)}</span>
        </div>

        <p className="mt-6 text-xs font-semibold tracking-wide text-text-tertiary">HÌNH THỨC THANH TOÁN</p>
        <div className="mt-2.5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={goBackToCash}
            className="flex flex-col items-center gap-2 rounded-md border border-border-default bg-surface-card py-4 text-sm font-semibold text-text-secondary transition-colors hover:border-border-strong"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-surface-muted text-text-tertiary">
              <Banknote className="size-4" />
            </span>
            Tiền mặt
          </button>
          <button
            type="button"
            className="flex flex-col items-center gap-2 rounded-md border-2 border-brand-primary bg-surface-card py-4 text-sm font-semibold text-text-primary"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-brand-primary text-text-on-brand">
              <QrCode className="size-4" />
            </span>
            Chuyển khoản QR
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center">
          <p className="text-sm font-semibold text-text-primary">Quét mã để chuyển khoản</p>
          <div className="mt-3 rounded-card border border-border-default p-2 bg-white flex items-center justify-center min-h-[220px]">
            {!hasBankConfig ? (
              <div className="flex max-w-[260px] flex-col items-center gap-3 px-3 py-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-status-warning-subtle text-status-warning">
                  <AlertTriangle className="size-6" />
                </span>
                <p className="text-sm font-semibold text-text-primary">
                  Chi nhánh chưa cấu hình tài khoản ngân hàng
                </p>
                <p className="text-xs text-text-tertiary">
                  Vào Cấu hình chi nhánh để thiết lập, rồi quay lại màn này.
                </p>
                {canConfigBranch ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 px-4 text-xs"
                    onClick={() => navigate(BRANCH_MANAGER_PATHS.CONFIG)}
                  >
                    Mở Cấu hình chi nhánh
                  </Button>
                ) : null}
              </div>
            ) : invoiceCreateError && !invoice ? (
              /* Tạo hoá đơn hỏng: DỪNG hẳn, nói lý do, chờ Thu ngân bấm "Thử lại".
                 Không tự gọi lại — đó chính là cái đã gây vòng lặp ~74 request/giây. */
              <div className="flex max-w-[260px] flex-col items-center gap-3 px-3 py-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-status-danger-subtle text-status-danger">
                  <AlertTriangle className="size-6" />
                </span>
                <p className="text-sm font-semibold text-text-primary">Chưa tạo được hoá đơn</p>
                <p className="text-xs text-text-tertiary">{invoiceCreateError}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-4 text-xs"
                  onClick={handleRetryCreateInvoice}
                  disabled={invoiceCreating}
                >
                  {invoiceCreating ? "Đang thử lại..." : "Thử lại"}
                </Button>
              </div>
            ) : invoiceCreating && !invoice ? (
              <div className="flex h-[200px] w-[200px] flex-col items-center justify-center gap-2">
                <Loader2 className="size-7 animate-spin text-brand-primary" />
                <span className="text-xs text-text-tertiary">Đang tạo hoá đơn...</span>
              </div>
            ) : qrData?.qrImageUrl ? (
              <img
                src={qrData.qrImageUrl}
                alt="VietQR Chuyển khoản"
                className="w-[230px] max-w-full rounded-md object-contain"
              />
            ) : qrLoading ? (
              <div className="flex h-[200px] w-[200px] flex-col items-center justify-center gap-2">
                <Loader2 className="size-7 animate-spin text-brand-primary" />
                <span className="text-xs text-text-tertiary">Đang tạo mã VietQR...</span>
              </div>
            ) : (
              <PseudoQrCode seed={`${session.id}-${grandTotal}`} />
            )}
          </div>
          <p className="mt-4 text-xl font-bold text-brand-primary">{formatVnd(amountToCollect)}</p>
          <p className="mt-1 text-sm font-medium text-text-primary">{bankAccountLabel}</p>
          {bankAccountOwner ? <p className="text-xs text-text-tertiary">{bankAccountOwner}</p> : null}
          {transferContent ? (
            <p className="mt-2 text-xs font-semibold text-text-secondary bg-surface-muted px-3 py-1 rounded-md">
              Nội dung CK: <span className="font-bold text-brand-primary">{transferContent}</span>
            </p>
          ) : null}

          <div className="mt-4">
            {qrPaid ? (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-status-success-subtle px-3 py-1.5 text-xs font-semibold text-status-success">
                <span className="size-1.5 rounded-full bg-status-success" />
                Đã nhận chuyển khoản
              </span>
            ) : invoiceCreateError && !invoice ? (
              /* Chưa có hoá đơn thì chưa có gì để khách chuyển — đừng báo "đang chờ khách". */
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-status-danger-subtle px-3 py-1.5 text-xs font-semibold text-status-danger">
                <AlertTriangle className="size-3.5" />
                Chưa tạo được hoá đơn
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-status-warning-subtle px-3 py-1.5 text-xs font-semibold text-status-warning">
                <Loader2 className="size-3.5 animate-spin" />
                Đang chờ khách chuyển khoản...
              </span>
            )}
          </div>
        </div>

        <div className="mt-8">
          {qrPaid ? (
            <Button
              className="w-full bg-status-success hover:bg-status-success-hover text-white font-bold"
              size="lg"
              onClick={handleIssueInvoice}
            >
              Phát hành hoá đơn điện tử
            </Button>
          ) : invoiceCreateError && !invoice ? (
            <Button
              className="w-full"
              variant="outline"
              size="lg"
              onClick={handleRetryCreateInvoice}
              disabled={invoiceCreating}
            >
              {invoiceCreating ? "Đang thử lại..." : "Thử lại tạo hoá đơn"}
            </Button>
          ) : (
            <Button
              className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold shadow-sm"
              size="lg"
              onClick={() => setConfirmModalOpen(true)}
            >
              Khách hàng đã chuyển khoản xong
            </Button>
          )}
        </div>
      </div>

      {/* Modal xác nhận khách hàng đã chuyển khoản xong */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-text-primary">
              Xác nhận đã nhận chuyển khoản
            </DialogTitle>
            <DialogDescription className="text-text-secondary text-sm">
              Kiểm tra thông tin chuyển khoản trước khi xác nhận thu tiền và phát hành hóa đơn cho bàn.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 rounded-[16px] border border-border-default bg-[#F8F9FA] p-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-text-tertiary">Bàn &amp; Phiên:</span>
              <span className="font-bold text-text-primary">{tableName} · Phiên #{session.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-tertiary">Số tiền cần thu:</span>
              <span className="text-xl font-extrabold text-brand-primary">{formatVnd(amountToCollect)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-tertiary">Tài khoản nhận:</span>
              <span className="font-medium text-text-primary">{bankAccountLabel}</span>
            </div>
            {transferContent ? (
              <div className="flex justify-between items-center pt-2 border-t border-border-default/50">
                <span className="text-text-tertiary">Nội dung CK:</span>
                <span className="font-mono font-bold text-brand-primary">{transferContent}</span>
              </div>
            ) : null}
          </div>

          <div className="rounded-[12px] bg-status-warning-subtle/60 p-3 text-xs text-[#B54708] leading-relaxed">
            ⚠️ <strong>Lưu ý:</strong> Vui lòng kiểm tra thông báo biến động số dư hoặc ứng dụng ngân hàng của quán để chắc chắn đã nhận đủ tiền trước khi xác nhận.
          </div>

          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isConfirming}
              onClick={() => setConfirmModalOpen(false)}
            >
              Chưa nhận được
            </Button>
            <Button
              type="button"
              className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold"
              disabled={isConfirming}
              onClick={handleConfirmPaymentAndIssue}
            >
              {isConfirming ? "Đang xử lý..." : "Xác nhận & Thu tiền"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}