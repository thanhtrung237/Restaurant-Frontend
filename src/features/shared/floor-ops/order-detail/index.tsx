import * as React from "react";
import { GuestJoinCode } from "../GuestJoinCode";
import { useNavigate, useParams, generatePath } from "react-router-dom";
import {
  ChevronLeft,
  Trash2,
  Printer,
  ArrowRightLeft,
  AlertTriangle,
  RefreshCw,
  DoorClosed,
  Tag,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  HeaderOverflowMenu,
  type OverflowMenuAction,
} from "@/components/layout/HeaderOverflowMenu";
import { StickyActionBar } from "@/components/layout/StickyActionBar";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuthStore } from "@/stores/auth.store";
import { APP_ROLE } from "@/config/roles";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  useOrdersBySession,
  useOrderDetailsBySession,
  useCancelBeforeKitchen,
  useCancelAfterKitchen,
  useTableSession,
  useRequestPayment,
  useReprintKitchenTicket,
  useCloseSession,
  useCancelSession,
  useInvoiceBySession,
} from "@/features/shared/floor-ops/api";
import { isBillableDetail } from "@/lib/order-detail-billing";
import { BRANCH_MANAGER_PATHS, CASHIER_PATHS, RESTAURANT_ADMIN_PATHS, WAITER_PATHS } from "@/app/router/paths";
import { getErrorMessage } from "@/lib/http";
import { CANCEL_REASON, CANCEL_REASON_LABEL } from "@/types/enums";
import type { CancelReason } from "@/types/enums";
import type { OrderDetail } from "@/types/models";

/**
 * Huỷ món chia 2 luồng theo trạng thái dòng món (khớp điều kiện của backend):
 *  - BEFORE_KITCHEN: PENDING / PENDING_WEIGHT → `POST /order-details/{id}/cancel`,
 *    không cần lý do, BE luôn set isBillable = false.
 *  - AFTER_KITCHEN: PREPARING / SERVED → `POST /order-details/{id}/cancel-after-kitchen`,
 *    BẮT BUỘC có `cancelReason`; chính lý do quyết định món còn tính tiền hay không.
 */
type CancelPhase = "BEFORE_KITCHEN" | "AFTER_KITCHEN";

/** Hệ quả tính tiền của từng lý do — hiển thị để nhân viên chọn đúng, tránh thất thu. */
const CANCEL_REASON_EFFECT: Record<CancelReason, string> = {
  RESTAURANT_ERROR: "Món sẽ KHÔNG tính tiền cho khách — nhà hàng chịu chi phí.",
  CUSTOMER_CHANGED_MIND: "Món VẪN tính tiền cho khách vì bếp đã làm.",
};

function cancelPhaseOf(status: OrderDetail["status"]): CancelPhase | null {
  if (status === "PENDING" || status === "PENDING_WEIGHT") return "BEFORE_KITCHEN";
  if (status === "PREPARING" || status === "SERVED") return "AFTER_KITCHEN";
  return null;
}

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

/**
 * Đơn món (Order chi tiết) — Hiển thị toàn bộ order-details của 1 table session
 * Nguồn: Desktop / Order chi tiết
 *
 * API: GET /table-sessions/{id}
 *      GET /orders/session/{tableSessionId}
 *      GET /order-details/session/{tableSessionId} (poll 10s)
 *      POST /order-details/{id}/cancel
 */
export default function OrderDetailPage() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>(); // Thực chất là tableSessionId
  const { toast } = useToast();

  const tableSessionId = orderId ? Number.parseInt(orderId, 10) : undefined;

  // Fetch table session info (làm mới mỗi 1s)
  const { data: session } = useTableSession(tableSessionId, { refetchInterval: 1000 });
  const { data: sessionInvoice } = useInvoiceBySession(tableSessionId);
  const closeSessionMutation = useCloseSession();
  const cancelSessionMutation = useCancelSession();

  // Fetch all orders of this session (làm mới mỗi 1s)
  const { data: orders = [] } = useOrdersBySession(tableSessionId, undefined, { refetchInterval: 1000 });

  // Fetch order details với auto-refresh 1 giây
  const { data: orderDetails = [], isLoading } = useOrderDetailsBySession(
    tableSessionId,
    undefined,
    { refetchInterval: 1000 }
  );

  const cancelMutation = useCancelBeforeKitchen();
  const cancelAfterKitchenMutation = useCancelAfterKitchen();
  const requestPaymentMutation = useRequestPayment();
  const reprintKitchenTicketMutation = useReprintKitchenTicket();

  /**
   * Đóng phiên bàn — đặc tả mục 4.2 chỉ cho Thu ngân / QL chi nhánh / Quản trị NH.
   * Phục vụ KHÔNG được đóng bàn (cột "Phục vụ" của dòng "Đóng phiên bàn" để trống),
   * nên nút này phải ẩn với vai trò đó ở MỌI kích thước màn hình.
   */
  const role = useAuthStore((s) => s.role);
  const canCloseTable =
    role === APP_ROLE.CASHIER ||
    role === APP_ROLE.BRANCH_MANAGER ||
    role === APP_ROLE.RESTAURANT_ADMIN;
  /**
   * Huỷ phiên — Bảng 2.2: CHỈ Quản lý chi nhánh (và Quản trị nhà hàng).
   * Thu ngân và Phục vụ KHÔNG thấy. Backend cũng chặn (`@PreAuthorize` trên
   * `POST /table-sessions/{id}/cancel`), đây chỉ là lớp ẩn nút.
   */
  const canCancelSession =
    role === APP_ROLE.BRANCH_MANAGER || role === APP_ROLE.RESTAURANT_ADMIN;

  // Modal states
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);
  const [isCloseTableModalOpen, setIsCloseTableModalOpen] = React.useState(false);
  const [isCancelSessionModalOpen, setIsCancelSessionModalOpen] = React.useState(false);
  const [cancelSessionReason, setCancelSessionReason] = React.useState("");
  const [isCancellingSession, setIsCancellingSession] = React.useState(false);
  const [isConfirmPayModalOpen, setIsConfirmPayModalOpen] = React.useState(false);
  const [isProcessingPay, setIsProcessingPay] = React.useState(false);
  const [itemToCancel, setItemToCancel] = React.useState<{
    id: number;
    name: string;
    phase: CancelPhase;
  } | null>(null);
  // Chỉ dùng cho luồng AFTER_KITCHEN
  const [cancelReason, setCancelReason] = React.useState<CancelReason | null>(null);
  // Bước xác nhận thêm khi chọn "Lỗi từ nhà hàng": món không tính tiền nên cần chắc chắn
  const [isConfirmingRestaurantError, setIsConfirmingRestaurantError] =
    React.useState(false);

  // Các dòng món còn "Chờ xác nhận" / "Chờ cân" — bếp chưa nhận, có thể huỷ tự do.
  // Nếu còn tồn tại khi bấm "Thanh Toán", phải hỏi nhân viên có muốn huỷ trước khi khoá phiên.
  const pendingItems = React.useMemo(
    () => orderDetails.filter((d) => d.status === "PENDING" || d.status === "PENDING_WEIGHT"),
    [orderDetails]
  );

  const [transferType, setTransferType] = React.useState<"transfer" | "merge">("transfer");
  const [targetTable, setTargetTable] = React.useState("B02");

  // Group order details by orderId (rounds)
  const rounds = React.useMemo(() => {
    const grouped = new Map<number, OrderDetail[]>();
    orderDetails.forEach((detail) => {
      if (!grouped.has(detail.orderId)) {
        grouped.set(detail.orderId, []);
      }
      grouped.get(detail.orderId)!.push(detail);
    });

    return Array.from(grouped.entries()).map(([orderId, items], index) => {
      const order = orders.find((o) => o.id === orderId);
      return {
        id: orderId,
        label: `Lượt gọi ${index + 1}`,
        // Figma hiện giờ:phút, không có giây
        time: order?.createdAt
          ? new Date(order.createdAt).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
        items: items.filter((i) => i.status !== "CANCELLED"),
      };
    });
  }, [orderDetails, orders]);

  const totalAmount = React.useMemo(() => {
    return orderDetails
      .filter((d) => d.status !== "CANCELLED")
      .reduce((sum, d) => {
        return sum + (d.price ?? d.priceAtOrderTime * d.quantity);
      }, 0);
  }, [orderDetails]);

  function closeCancelDialog() {
    setItemToCancel(null);
    setCancelReason(null);
    setIsConfirmingRestaurantError(false);
  }

  async function handleConfirmCancel() {
    if (!itemToCancel) return;
    try {
      await cancelMutation.mutateAsync(itemToCancel.id);
      toast({
        title: "Đã hủy món",
        description: `${itemToCancel.name} đã được hủy.`,
        variant: "success",
      });
      closeCancelDialog();
    } catch (error) {
      toast({
        title: "Lỗi hủy món",
        description: error instanceof Error ? error.message : "Không thể hủy món.",
        variant: "danger",
      });
    }
  }

  /**
   * Huỷ món ĐÃ vào bếp. Với lý do "Lỗi từ nhà hàng" thì đi qua 1 bước xác nhận nữa,
   * vì món sẽ không tính tiền cho khách.
   */
  function handleSubmitCancelAfterKitchen() {
    if (!cancelReason) return;
    if (cancelReason === "RESTAURANT_ERROR" && !isConfirmingRestaurantError) {
      setIsConfirmingRestaurantError(true);
      return;
    }
    void handleConfirmCancelAfterKitchen();
  }

  async function handleConfirmCancelAfterKitchen() {
    if (!itemToCancel || itemToCancel.phase !== "AFTER_KITCHEN" || !cancelReason) return;
    try {
      // TODO(BE): `OrderDetailCancelRequest` hiện chỉ có `cancelReason` — chưa có field
      // ghi chú, nên lý do chi tiết của nhân viên không gửi được lên server.
      // Javadoc của DTO ghi RESTAURANT_ERROR "cần QL duyệt", nhưng
      // `OrderDetailServiceImpl.cancelAfterKitchen()` huỷ ngay: không có trạng thái chờ
      // duyệt trong OrderDetailStatus, không có approvedBy, `cancelled_by` cũng không
      // được set. Khi BE chốt luồng duyệt thì bổ sung tại đây.
      await cancelAfterKitchenMutation.mutateAsync({
        id: itemToCancel.id,
        body: { cancelReason },
      });
      toast({
        title: "Đã hủy món",
        description:
          cancelReason === "RESTAURANT_ERROR"
            ? `${itemToCancel.name} đã hủy, không tính tiền cho khách.`
            : `${itemToCancel.name} đã hủy, vẫn tính tiền cho khách.`,
        variant: "success",
      });
      closeCancelDialog();
    } catch (error) {
      toast({
        title: "Lỗi hủy món",
        description: getErrorMessage(error),
        variant: "danger",
      });
      setIsConfirmingRestaurantError(false);
    }
  }

  async function handlePrintKitchenSlip() {
    // Tìm tất cả các order có món đang PREPARING
    const orderIdsWithPreparing = new Set<number>();
    orderDetails
      .filter((d) => d.status === "PREPARING")
      .forEach((d) => orderIdsWithPreparing.add(d.orderId));

    if (orderIdsWithPreparing.size === 0) {
      toast({
        title: "Không có món nào đang chế biến",
        description: "Chỉ có thể in phiếu cho các món đang ở trạng thái ĐANG CHẾ BIẾN.",
        variant: "warning",
      });
      setIsPrintModalOpen(false);
      return;
    }

    try {
      // In phiếu cho tất cả các order có món PREPARING
      await Promise.all(
        Array.from(orderIdsWithPreparing).map((orderId) =>
          reprintKitchenTicketMutation.mutateAsync(orderId)
        )
      );

      setIsPrintModalOpen(false);
      toast({
        title: "Đã gửi lệnh in phiếu bếp",
        description: `Đã in phiếu chế biến cho ${orderIdsWithPreparing.size} lượt gọi món.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Lỗi in phiếu bếp",
        description: error instanceof Error ? error.message : "Không thể in phiếu bếp.",
        variant: "danger",
      });
    }
  }

  function handleTransferConfirm() {
    setIsTransferModalOpen(false);
    const actionLabel = transferType === "transfer" ? "Chuyển bàn" : "Gộp bàn";
    toast({
      title: `Đã ${actionLabel.toLowerCase()}`,
      description: `${actionLabel} sang ${targetTable} thành công.`,
      variant: "success",
    });
  }

  /**
   * MỘT nút, đổi theo trạng thái phiên và tổng tiền — bốn trường hợp:
   *
   * | Trạng thái phiên | Tổng tiền | Nhãn      | Hành vi                                  |
   * |------------------|-----------|-----------|------------------------------------------|
   * | ĐANG PHỤC VỤ     | > 0       | Đóng bàn  | sang màn Thanh toán của phiên            |
   * | ĐANG PHỤC VỤ     | 0đ        | Hủy phiên | modal bắt buộc lý do → API huỷ           |
   * | CHỜ THANH TOÁN   | 0đ        | Hủy phiên | mở lại bàn rồi huỷ, trong 1 modal        |
   * | CHỜ THANH TOÁN   | hoá đơn đã phát hành | Đóng bàn | modal xác nhận → API đóng phiên |
   *
   * Tổng tiền lấy theo ĐÚNG tiêu chí của backend (`shouldChargeDetail` ⇄
   * `isBillableDetail`): dòng chưa huỷ thì tính; dòng đã huỷ chỉ tính khi `isBillable`.
   */
  // Tính tạm tính: tổng tiền các món tính phí (chưa tính service fee & VAT)
  const billableTotal = React.useMemo(
    () => orderDetails
      .filter(isBillableDetail)
      .reduce((sum, d) => sum + (d.price || 0), 0),
    [orderDetails],
  );
  const sessionStatus = session?.status;
  const invoiceIssued = sessionInvoice?.status === "ISSUED" || sessionInvoice?.status === "PAID";

  type TableActionMode = "checkout" | "cancel-session" | "close-table" | "none";
  const tableActionMode: TableActionMode = React.useMemo(() => {
    if (sessionStatus === "SERVING") {
      if (billableTotal > 0) return "checkout";
      return canCancelSession ? "cancel-session" : "none";
    }
    if (sessionStatus === "WAITING_FOR_PAY") {
      if (invoiceIssued) return "close-table";
      if (billableTotal === 0) return canCancelSession ? "cancel-session" : "none";
      return "checkout";
    }
    return "none";
  }, [sessionStatus, billableTotal, invoiceIssued, canCancelSession]);

  const tableActionLabel =
    tableActionMode === "cancel-session" ? "Hủy phiên" : "Đóng bàn";

  function handleTableAction() {
    if (tableActionMode === "checkout") {
      handleCheckout();
      return;
    }
    if (tableActionMode === "cancel-session") {
      setCancelSessionReason("");
      setIsCancelSessionModalOpen(true);
      return;
    }
    if (tableActionMode === "close-table") {
      setIsCloseTableModalOpen(true);
    }
  }

  /**
   * Đường dẫn Sơ đồ bàn theo ĐÚNG vai trò.
   *
   * Trước đây dùng `navigate("../..")`: điều hướng tương đối của react-router tính theo cây
   * ROUTE chứ không theo đoạn URL, nên từ `/quan-ly-chi-nhanh/order/:id` nó nhảy ra `/`
   * — mà `/` lại redirect sang `/dang-nhap`. Người dùng hủy phiên xong bị ném về màn đăng
   * nhập dù vẫn còn đăng nhập. Chỉ đường tuyệt đối mới chắc.
   */
  const tableMapPath =
    role === APP_ROLE.BRANCH_MANAGER
      ? BRANCH_MANAGER_PATHS.TABLE_MAP
      : role === APP_ROLE.RESTAURANT_ADMIN
        ? RESTAURANT_ADMIN_PATHS.TABLE_MAP
        : role === APP_ROLE.CASHIER
          ? CASHIER_PATHS.TABLE_MAP
          : WAITER_PATHS.TABLE_MAP;

  /** Đóng phiên thật (CHỜ THANH TOÁN + hoá đơn đã phát hành → ĐÃ ĐÓNG). */
  async function handleCloseTable() {
    if (!tableSessionId) return;
    try {
      await closeSessionMutation.mutateAsync(tableSessionId);
      setIsCloseTableModalOpen(false);
      toast({ title: "Đã đóng bàn", description: "Bàn đã về trạng thái Trống.", variant: "success" });
      navigate(tableMapPath);
    } catch (error) {
      toast({
        title: "Không đóng được bàn",
        description: error instanceof Error ? error.message : "Vui lòng thử lại",
        variant: "danger",
      });
    }
  }

  /**
   * Huỷ phiên. Phiên đang CHỜ THANH TOÁN phải MỞ LẠI trước (backend chỉ cho huỷ từ các
   * trạng thái khác ĐÃ ĐÓNG, nhưng mở lại giữ đúng luồng ĐANG PHỤC VỤ → ĐÃ HỦY của Bảng 2.2).
   * Hai bước trong MỘT modal; bước 2 lỗi thì báo rõ để phiên không kẹt nửa chừng.
   */
  /**
   * Hủy phiên — MỘT lời gọi duy nhất (QĐ-02).
   *
   * Trước đây phiên ở CHỜ THANH TOÁN phải "mở lại bàn rồi mới hủy": hai lời gọi, và kẹt
   * nửa chừng nếu bước hai lỗi (bàn đã mở lại nhưng chưa hủy). Backend nay cho hủy thẳng khi
   * tổng tiền = 0 và chưa có hoá đơn đã phát hành / đã thu — còn lại trả 409 kèm lý do rõ.
   */
  async function handleConfirmCancelSession() {
    if (!tableSessionId || !cancelSessionReason.trim()) return;
    setIsCancellingSession(true);
    try {
      await cancelSessionMutation.mutateAsync({
        id: tableSessionId,
        reason: cancelSessionReason.trim(),
      });
      setIsCancelSessionModalOpen(false);
      toast({ title: "Đã hủy phiên", description: "Bàn đã về trạng thái Trống.", variant: "success" });
      navigate(tableMapPath);
    } catch (error) {
      toast({
        title: "Không hủy được phiên",
        description: error instanceof Error ? error.message : "Vui lòng thử lại",
        variant: "danger",
      });
    } finally {
      setIsCancellingSession(false);
    }
  }

  function handleCheckout() {
    // Còn món đang chờ xác nhận -> hỏi nhân viên có muốn huỷ các món đó để thanh toán không
    if (pendingItems.length > 0) {
      setIsConfirmPayModalOpen(true);
      return;
    }
    void proceedToCheckout();
  }

  async function proceedToCheckout() {
    if (!tableSessionId) return;
    setIsProcessingPay(true);

    // Moi vai tro co route Thanh toan rieng - dung nham la dinh trang 403.
    const checkoutPattern =
      role === APP_ROLE.BRANCH_MANAGER
        ? BRANCH_MANAGER_PATHS.CHECKOUT
        : role === APP_ROLE.RESTAURANT_ADMIN
          ? RESTAURANT_ADMIN_PATHS.CHECKOUT
          : CASHIER_PATHS.CHECKOUT;

    try {
      // Phiên đã ở WAITING_FOR_PAY: không cần requestPayment nữa, navigate thẳng
      if (sessionStatus === "WAITING_FOR_PAY") {
        navigate(generatePath(checkoutPattern, { tableSessionId: String(tableSessionId) }));
        return;
      }
      await requestPaymentMutation.mutateAsync(tableSessionId);
      navigate(generatePath(checkoutPattern, { tableSessionId: String(tableSessionId) }));
    } catch (error) {
      toast({
        title: "Lỗi chuyển sang thanh toán",
        description: error instanceof Error ? error.message : "Không thể chuyển bàn sang trạng thái chờ thanh toán.",
        variant: "danger",
      });
    } finally {
      setIsProcessingPay(false);
    }
  }

  async function handleConfirmCancelPendingAndCheckout() {
    setIsProcessingPay(true);
    try {
      await Promise.all(pendingItems.map((item) => cancelMutation.mutateAsync(item.id)));
      setIsConfirmPayModalOpen(false);
      await proceedToCheckout();
    } catch (error) {
      toast({
        title: "Lỗi hủy món",
        description: error instanceof Error ? error.message : "Không thể hủy các món đang chờ xác nhận.",
        variant: "danger",
      });
      setIsProcessingPay(false);
    }
  }

  const tableName = session?.tableName || `Bàn #${tableSessionId}`;
  const guestCount = session?.guestCount || 0;
  const sessionCode = tableSessionId?.toString() || "";

  // Đưa tiêu đề lên MobileHeader (biến thể "back" — màn này là màn con).
  // Figma còn có "· Phục vụ: <tên>" nhưng TableSessionResponse của BE KHÔNG trả về
  // người mở phiên, nên không hiển thị được — xem docs/be-issues.md.
  const headerSubtitle = `${guestCount} khách · Phiên #${sessionCode}`;

  // <md: ba nút phụ trên thanh tiêu đề chuyển vào menu "⋯". Danh sách lọc theo quyền
  // TRƯỚC khi dựng menu, nên vai trò không đủ quyền không thấy mục đó ở bất kỳ đâu.
  const overflowActions = React.useMemo<OverflowMenuAction[]>(() => {
    const actions: OverflowMenuAction[] = [
      {
        key: "print",
        label: "In lại phiếu bếp",
        icon: Printer,
        onSelect: () => setIsPrintModalOpen(true),
      },
      {
        key: "transfer",
        label: "Chuyển / Gộp bàn",
        icon: ArrowRightLeft,
        onSelect: () => {
          const transferPath =
            role === APP_ROLE.BRANCH_MANAGER
              ? BRANCH_MANAGER_PATHS.TRANSFER_MERGE_TABLE
              : role === APP_ROLE.RESTAURANT_ADMIN
                ? RESTAURANT_ADMIN_PATHS.TRANSFER_MERGE_TABLE
                : role === APP_ROLE.CASHIER
                  ? CASHIER_PATHS.TRANSFER_MERGE_TABLE
                  : WAITER_PATHS.TRANSFER_MERGE_TABLE;
          navigate(transferPath, {
            state: { sourceTableId: session?.tableId, sourceSessionId: tableSessionId },
          });
        },
      },
    ];
    if (canCloseTable && tableActionMode !== "none") {
      actions.push({
        key: "close-table",
        label: tableActionLabel,
        icon: DoorClosed,
        tone: "warning",
        onSelect: handleTableAction,
      });
    }
    return actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCloseTable, tableActionMode, tableActionLabel]);

  const headerOverflow = React.useMemo(
    () => <HeaderOverflowMenu actions={overflowActions} />,
    [overflowActions],
  );



  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page">
      {tableSessionId ? <GuestJoinCode key={tableSessionId} sessionId={tableSessionId} /> : null}
      {/* ============================================================
          1. HEADER
          ============================================================ */}
      <PageHeader
        title={`${tableName} — Đơn món`}
        subtitle={
          <span className="flex items-center gap-2">
            {headerSubtitle}
            {isLoading && (
              <RefreshCw className="size-3.5 animate-spin text-text-tertiary" />
            )}
          </span>
        }
        mobileSubtitle={headerSubtitle}
        mobileHeaderActions={headerOverflow}
        actions={
          <>
            <button
              type="button"
              onClick={() => navigate(tableMapPath)}
              className="mr-1 inline-flex items-center gap-1 text-sm font-medium text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-4" /> Về sơ đồ bàn
            </button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPrintModalOpen(true)}
              className="h-10 border-border-default px-4 text-text-secondary hover:bg-surface-muted hover:text-text-primary"
            >
              In phiếu chế biến
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const transferPath =
                  role === APP_ROLE.BRANCH_MANAGER
                    ? BRANCH_MANAGER_PATHS.TRANSFER_MERGE_TABLE
                    : role === APP_ROLE.RESTAURANT_ADMIN
                      ? RESTAURANT_ADMIN_PATHS.TRANSFER_MERGE_TABLE
                      : role === APP_ROLE.CASHIER
                        ? CASHIER_PATHS.TRANSFER_MERGE_TABLE
                        : WAITER_PATHS.TRANSFER_MERGE_TABLE;
                navigate(transferPath, {
                  state: { sourceTableId: session?.tableId, sourceSessionId: tableSessionId },
                });
              }}
              className="h-10 border-border-default px-4 text-text-secondary hover:bg-surface-muted hover:text-text-primary"
            >
              Chuyển / Gộp bàn
            </Button>
            {/* Đóng bàn / Hủy phiên — nhãn và hành vi đổi theo trạng thái phiên.
                Phục vụ không thấy; Hủy phiên chỉ QL chi nhánh + Quản trị NH. */}
            {canCloseTable && tableActionMode !== "none" ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleTableAction}
                className="h-10 border-status-warning/40 bg-status-warning-subtle px-4 text-status-warning hover:bg-status-warning/15"
              >
                {tableActionLabel}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8 lg:flex-row items-start">
        {/* ============================================================
            2. CỘT TRÁI: CÁC LƯỢT GỌI MÓN (GOM CHUNG 1 CARD DUY NHẤT)
            ============================================================ */}
        <div className="flex-1 w-full rounded-2xl border border-border-default/60 bg-surface-card p-6 shadow-xs">
          {isLoading && rounds.length === 0 ? (
            <p className="text-center text-text-tertiary py-8">Đang tải...</p>
          ) : rounds.length === 0 ? (
            <p className="text-center text-text-tertiary py-8">Chưa có món nào được gọi</p>
          ) : (
            rounds.map((round, rIndex) => (
              <div
                key={round.id}
                className={cn(rIndex > 0 && "mt-6 pt-6 border-t border-border-default/60")}
              >
                <p className="text-xs font-bold tracking-wider text-text-tertiary uppercase">
                  {round.label} · {round.time}
                </p>

                <div className="mt-4 divide-y divide-border-default/40">
                  {round.items.map((item) => {
                    // BEFORE_KITCHEN (CHỜ XÁC NHẬN / CHỜ CÂN): huỷ tự do, không tính tiền.
                    // AFTER_KITCHEN (ĐANG CHẾ BIẾN / ĐÃ PHỤC VỤ): phải chọn lý do huỷ.
                    const phase = cancelPhaseOf(item.status);
                    const itemNetTotal = item.price ?? item.priceAtOrderTime * item.quantity;
                    const itemDiscount = item.promotionDiscountAmount || 0;
                    const itemGrossTotal = itemNetTotal + itemDiscount;

                    return (
                      <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                        {/* Dòng 1: Tên món + Badge + Số lượng + Giá */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-bold text-text-primary">
                                {item.dishName}
                              </span>
                              {item.options && item.options.length > 0 ? (
                                <div className="space-y-0.5">
                                  {item.options.map((opt) => (
                                    <span key={opt.id} className="block text-xs text-text-tertiary">
                                      + {opt.optionItemName}
                                      {opt.priceSnapshot > 0
                                        ? ` +${opt.priceSnapshot.toLocaleString("vi-VN")}đ`
                                        : " (Miễn phí)"}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {itemDiscount > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-success">
                                  <Tag className="size-3" />
                                  <span>
                                    Giảm: −{formatVnd(itemDiscount)}
                                    {item.promotionName ? ` (${item.promotionName})` : ""}
                                  </span>
                                </span>
                              ) : null}
                            </div>
                            <StatusBadge type="orderDetail" status={item.status} />
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <span className="text-sm text-text-secondary">x{item.quantity}</span>
                            <div className="flex flex-col items-end shrink-0 min-w-20">
                              {itemDiscount > 0 ? (
                                <span className="text-xs text-text-tertiary line-through">
                                  {formatVnd(itemGrossTotal)}
                                </span>
                              ) : null}
                              <span className="text-sm font-bold text-text-primary">
                                {formatVnd(itemNetTotal)}
                              </span>
                            </div>
                          </div>
                        </div>


                        {/* Dòng 2: Ghi chú bên trái & Nút Hủy món bên phải */}
                        <div className="flex items-center justify-between gap-4 mt-1.5 min-h-[26px]">
                          <div>
                            {item.note ? (
                              <p className="text-xs text-text-tertiary">
                                {item.note}
                              </p>
                            ) : null}
                          </div>

                          {phase ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelReason(null);
                                setIsConfirmingRestaurantError(false);
                                setItemToCancel({
                                  id: item.id,
                                  name: item.dishName || "Món ăn",
                                  phase,
                                });
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full border border-status-danger/20 bg-status-danger-subtle/50 px-2.5 py-0.5 text-xs font-medium text-status-danger hover:bg-status-danger hover:text-white transition-colors cursor-pointer"
                            >
                              <Trash2 className="size-3" />
                              Hủy món
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Tổng cộng */}
          {rounds.length > 0 && (
            <div className="mt-6 pt-5 border-t border-border-default/60 space-y-2">
              <div className="flex items-center justify-between pt-1 border-t border-border-default/30">
                <span className="text-base font-bold text-text-secondary">Tổng cộng</span>
                <span className="text-2xl font-bold text-brand-primary">
                  {formatVnd(totalAmount)}
                </span>
              </div>
            </div>
          )}

        </div>

        {/* ============================================================
            3. CỘT PHẢI: THAO TÁC
            ============================================================ */}
        {/* Ẩn ở <md: hai nút này đã nằm ở thanh thao tác cố định đáy màn hình */}
        <div className="hidden w-full shrink-0 md:block lg:w-[380px]">
          <div className="rounded-2xl border border-border-default/60 bg-surface-card p-6 shadow-xs flex flex-col">
            <p className="text-sm font-bold text-text-primary">
              Thao tác nhanh
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                // Route con "them-mon" của chính route hiện tại (order/:orderId) — relative
                // navigate nên tự khớp đúng prefix theo vai trò (/phuc-vu, /quan-ly-chi-nhanh,
                // /quan-tri-nha-hang) mà KHÔNG cần hardcode. Xem ADD_DISH trong *.paths.ts.
                onClick={() => navigate("them-mon")}
                className="w-full h-12 rounded-xl bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.99] text-text-on-brand font-bold text-sm sm:text-base transition-all shadow-xs cursor-pointer"
              >
                + Thêm món vào bàn
              </button>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isProcessingPay}
                className="w-full h-12 rounded-xl border border-brand-primary bg-surface-card hover:bg-brand-primary-subtle/30 active:scale-[0.99] text-brand-primary font-bold text-sm sm:text-base transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessingPay ? "Đang xử lý..." : "Thanh Toán"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* <md: hai hành động CHÍNH của màn — "Thêm món" (FR-SRV-04) và "Thanh toán"
          (FR-PAY-01). Hành động phụ nằm ở menu "⋯" trên header. */}
      <StickyActionBar>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 border-brand-primary font-bold text-brand-primary"
          onClick={handleCheckout}
          disabled={isProcessingPay}
        >
          {isProcessingPay ? "Đang xử lý..." : "Thanh toán"}
        </Button>
        <Button
          type="button"
          className="h-11 flex-1 font-bold"
          onClick={() => navigate("them-mon")}
        >
          + Thêm món
        </Button>
      </StickyActionBar>

      {/* ============================================================
          MODAL: IN PHIẾU CHẾ BIẾN (IN PHIẾU BẾP)
          ============================================================ */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="size-5 text-brand-primary" />
              In phiếu chế biến — {tableName}
            </DialogTitle>
            <DialogDescription>
              Phiên {sessionCode} · {guestCount} khách
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border-default bg-surface-muted/50 p-4 font-mono text-xs space-y-2">
              <div className="flex justify-between font-bold border-b border-border-default pb-2">
                <span>MÓN CHẾ BIẾN</span>
                <span>SL</span>
              </div>
              {orderDetails
                .filter((i) => i.status === "PENDING" || i.status === "PREPARING")
                .map((item) => (
                  <div key={item.id} className="flex justify-between py-1">
                    <div>
                      <span className="font-semibold">{item.dishName}</span>
                      {item.note ? (
                        <div className="text-[11px] text-text-tertiary">
                          ({item.note})
                        </div>
                      ) : null}
                    </div>
                    <span className="font-bold">x{item.quantity}</span>
                  </div>
                ))}
            </div>
            <p className="text-xs text-text-tertiary">
              Phiếu sẽ được gửi tới máy in Bếp chính và Pha chế theo phân loại món.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsPrintModalOpen(false)}
              disabled={reprintKitchenTicketMutation.isPending}
            >
              Đóng
            </Button>
            <Button
              onClick={handlePrintKitchenSlip}
              disabled={reprintKitchenTicketMutation.isPending}
              className="gap-2"
            >
              <Printer className="size-4" />
              {reprintKitchenTicketMutation.isPending ? "Đang in..." : "In phiếu bếp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          MODAL: CHUYỂN / GỘP BÀN
          ============================================================ */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="size-5 text-brand-primary" />
              Chuyển / Gộp bàn — {tableName}
            </DialogTitle>
            <DialogDescription>
              Chọn hình thức và bàn đích để chuyển hoặc gộp đơn món.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTransferType("transfer")}
                className={cn(
                  "p-3 rounded-xl border text-sm font-semibold text-center transition-all cursor-pointer",
                  transferType === "transfer"
                    ? "border-brand-primary bg-brand-primary-subtle text-brand-primary"
                    : "border-border-default bg-surface-card text-text-secondary hover:bg-surface-muted"
                )}
              >
                Chuyển bàn
              </button>
              <button
                type="button"
                onClick={() => setTransferType("merge")}
                className={cn(
                  "p-3 rounded-xl border text-sm font-semibold text-center transition-all cursor-pointer",
                  transferType === "merge"
                    ? "border-brand-primary bg-brand-primary-subtle text-brand-primary"
                    : "border-border-default bg-surface-card text-text-secondary hover:bg-surface-muted"
                )}
              >
                Gộp bàn
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                Bàn đích
              </label>
              <select
                value={targetTable}
                onChange={(e) => setTargetTable(e.target.value)}
                className="w-full h-10 rounded-lg border border-border-default bg-surface-card px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                <option value="B02">Bàn B02 (Tầng 1 - Trống)</option>
                <option value="B03">Bàn B03 (Tầng 1 - Trống)</option>
                <option value="B04">Bàn B04 (Tầng 1 - Đang phục vụ)</option>
                <option value="B05">Bàn B05 (Tầng 2 - Trống)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsTransferModalOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleTransferConfirm}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          MODAL: HỦY PHIÊN — Bảng 2.2 bắt buộc nhập lý do
          ============================================================ */}
      <Dialog open={isCancelSessionModalOpen} onOpenChange={setIsCancelSessionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-status-danger">
              <AlertTriangle className="size-5" />
              Hủy phiên {tableName}?
            </DialogTitle>
            <DialogDescription>
              {sessionStatus === "WAITING_FOR_PAY"
                ? "Bàn đang CHỜ THANH TOÁN nhưng không có món nào tính tiền. Hệ thống sẽ mở lại bàn rồi hủy phiên trong một lần."
                : "Phiên chưa có món nào tính tiền. Hủy phiên sẽ giải phóng bàn về trạng thái Trống."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-1">
            <label htmlFor="cancel-session-reason" className="text-sm font-medium text-text-primary">
              Lý do hủy <span className="text-status-danger">*</span>
            </label>
            <Input
              id="cancel-session-reason"
              value={cancelSessionReason}
              onChange={(e) => setCancelSessionReason(e.target.value)}
              placeholder="VD: Khách đổi ý, chưa gọi món"
              autoFocus
            />
            <p className="text-xs text-text-tertiary">
              Lý do được ghi vào nhật ký hoạt động (BR-12).
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCancelSessionModalOpen(false)}
              disabled={isCancellingSession}
            >
              Giữ lại
            </Button>
            <Button
              onClick={handleConfirmCancelSession}
              disabled={!cancelSessionReason.trim() || isCancellingSession}
              className="bg-status-danger text-white hover:bg-status-danger/90"
            >
              {isCancellingSession ? "Đang hủy..." : "Xác nhận hủy phiên"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          MODAL: ĐÓNG BÀN
          ============================================================ */}
      <Dialog open={isCloseTableModalOpen} onOpenChange={setIsCloseTableModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-status-warning">
              <AlertTriangle className="size-5" />
              Xác nhận đóng {tableName}?
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn đóng phiên phục vụ hiện tại của {tableName} không?
              Bàn sẽ được giải phóng và chuyển về trạng thái sẵn sàng đón khách.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              onClick={() => setIsCloseTableModalOpen(false)}
            >
              Giữ lại
            </Button>
            <Button
              onClick={handleCloseTable}
              className="bg-brand-primary hover:bg-brand-primary-hover text-white"
            >
              Xác nhận đóng bàn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          MODAL: CÒN MÓN CHỜ XÁC NHẬN — HỎI TRƯỚC KHI CHUYỂN THANH TOÁN
          ============================================================ */}
      <Dialog
        open={isConfirmPayModalOpen}
        onOpenChange={(open) => !isProcessingPay && setIsConfirmPayModalOpen(open)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-status-warning">
              <AlertTriangle className="size-5" />
              Còn món đang chờ xác nhận
            </DialogTitle>
            <DialogDescription>
              {tableName} còn {pendingItems.length} món đang chờ xác nhận (chưa gửi bếp).
              Để chuyển bàn sang trạng thái chờ thanh toán, các món này sẽ bị huỷ và không
              tính tiền. Bạn có muốn huỷ các món này để tiếp tục thanh toán không?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-text-tertiary">
            Nếu chọn "Không hủy", bàn sẽ giữ nguyên trạng thái đang phục vụ để bạn xử lý các
            món đang chờ xác nhận trước.
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsConfirmPayModalOpen(false)}
              disabled={isProcessingPay}
            >
              Không hủy
            </Button>
            <Button
              onClick={handleConfirmCancelPendingAndCheckout}
              disabled={isProcessingPay}
            >
              {isProcessingPay ? "Đang xử lý..." : "Hủy món & Thanh toán"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          MODAL: XÁC NHẬN HỦY MÓN
          ============================================================ */}
      <Dialog
        open={itemToCancel?.phase === "BEFORE_KITCHEN"}
        onOpenChange={(open) => !open && closeCancelDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-status-danger">
              <Trash2 className="size-5" />
              Xác nhận hủy món
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn hủy món{" "}
              <strong className="text-text-primary font-bold">
                "{itemToCancel?.name}"
              </strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-text-tertiary">
            Hành động hủy món sẽ được ghi nhận vào nhật ký hệ thống và thông báo tới Bếp nếu món đang được chế biến.
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeCancelDialog}>
              Không hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Đang hủy..." : "Xác nhận hủy món"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          MODAL: HỦY MÓN ĐÃ VÀO BẾP — chọn lý do (bắt buộc)
          Bước 2 chỉ xuất hiện với lý do "Lỗi từ nhà hàng" (món không tính tiền).
          ============================================================ */}
      <Dialog
        open={itemToCancel?.phase === "AFTER_KITCHEN"}
        onOpenChange={(open) => !open && closeCancelDialog()}
      >
        <DialogContent className="sm:max-w-md">
          {isConfirmingRestaurantError ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-status-danger">
                  <AlertTriangle className="size-5" />
                  Món sẽ không tính tiền cho khách
                </DialogTitle>
                <DialogDescription>
                  Hủy{" "}
                  <strong className="text-text-primary font-bold">
                    "{itemToCancel?.name}"
                  </strong>{" "}
                  với lý do <strong className="text-text-primary font-bold">
                    {CANCEL_REASON_LABEL.RESTAURANT_ERROR}
                  </strong>{" "}
                  nghĩa là nhà hàng chịu chi phí món này.
                </DialogDescription>
              </DialogHeader>

              <div className="py-2 text-xs text-text-tertiary">
                Bếp đã chế biến món này. Hành động hủy được ghi vào nhật ký hệ thống
                kèm người thực hiện và lý do.
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setIsConfirmingRestaurantError(false)}
                  disabled={cancelAfterKitchenMutation.isPending}
                >
                  Quay lại
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void handleConfirmCancelAfterKitchen()}
                  disabled={cancelAfterKitchenMutation.isPending}
                >
                  {cancelAfterKitchenMutation.isPending
                    ? "Đang hủy..."
                    : "Xác nhận, không tính tiền"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-status-danger">
                  <Trash2 className="size-5" />
                  Hủy món đã vào bếp
                </DialogTitle>
                <DialogDescription>
                  <strong className="text-text-primary font-bold">
                    "{itemToCancel?.name}"
                  </strong>{" "}
                  đã được gửi xuống bếp. Chọn lý do hủy — lý do quyết định món có
                  tính tiền cho khách hay không.
                </DialogDescription>
              </DialogHeader>

              <RadioGroup
                className="py-1"
                value={cancelReason ?? ""}
                onValueChange={(value) => setCancelReason(value as CancelReason)}
              >
                {CANCEL_REASON.map((reason) => (
                  <label
                    key={reason}
                    htmlFor={`cancel-reason-${reason}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                      cancelReason === reason
                        ? "border-brand-primary bg-brand-primary/5"
                        : "border-border-default hover:bg-surface-muted",
                    )}
                  >
                    <RadioGroupItem
                      id={`cancel-reason-${reason}`}
                      value={reason}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-text-primary">
                        {CANCEL_REASON_LABEL[reason]}
                      </span>
                      <span className="mt-0.5 block text-xs text-text-tertiary">
                        {CANCEL_REASON_EFFECT[reason]}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={closeCancelDialog}>
                  Không hủy
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleSubmitCancelAfterKitchen}
                  disabled={!cancelReason || cancelAfterKitchenMutation.isPending}
                >
                  {cancelAfterKitchenMutation.isPending
                    ? "Đang hủy..."
                    : "Tiếp tục"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}