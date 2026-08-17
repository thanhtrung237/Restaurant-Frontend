import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Trash2,
  Printer,
  ArrowRightLeft,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useToast } from "@/hooks/use-toast";
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
import {
  useOrdersBySession,
  useOrderDetailsBySession,
  useCancelBeforeKitchen,
  useTableSession,
  useRequestPayment,
  useReprintKitchenTicket,
} from "@/features/shared/floor-ops/api";
import type { OrderDetail } from "@/types/models";

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

  // Fetch all orders of this session (làm mới mỗi 1s)
  const { data: orders = [] } = useOrdersBySession(tableSessionId, undefined, { refetchInterval: 1000 });

  // Fetch order details với auto-refresh 1 giây
  const { data: orderDetails = [], isLoading } = useOrderDetailsBySession(
    tableSessionId,
    undefined,
    { refetchInterval: 1000 }
  );

  const cancelMutation = useCancelBeforeKitchen();
  const requestPaymentMutation = useRequestPayment();
  const reprintKitchenTicketMutation = useReprintKitchenTicket();

  // Modal states
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);
  const [isCloseTableModalOpen, setIsCloseTableModalOpen] = React.useState(false);
  const [isConfirmPayModalOpen, setIsConfirmPayModalOpen] = React.useState(false);
  const [isProcessingPay, setIsProcessingPay] = React.useState(false);
  const [itemToCancel, setItemToCancel] = React.useState<{
    id: number;
    name: string;
  } | null>(null);

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
        label: `Lượt ${index + 1}`,
        time: order?.createdAt ? new Date(order.createdAt).toLocaleTimeString("vi-VN") : "",
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

  async function handleConfirmCancel() {
    if (!itemToCancel) return;
    try {
      await cancelMutation.mutateAsync(itemToCancel.id);
      toast({
        title: "Đã hủy món",
        description: `${itemToCancel.name} đã được hủy.`,
        variant: "success",
      });
      setItemToCancel(null);
    } catch (error) {
      toast({
        title: "Lỗi hủy món",
        description: error instanceof Error ? error.message : "Không thể hủy món.",
        variant: "danger",
      });
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

  function handleCloseTable() {
    setIsCloseTableModalOpen(false);
    toast({
      title: "Đã đóng bàn",
      description: `Bàn đã được đóng phiên phục vụ.`,
      variant: "success",
    });
    navigate("../..");
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
    try {
      await requestPaymentMutation.mutateAsync(tableSessionId);
      navigate(`/cashier/checkout/${tableSessionId}`);
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

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page">
      {/* ============================================================
          1. HEADER
          ============================================================ */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default/60 bg-surface-card px-6 py-4 sm:px-8">
        <div>
          <button
            type="button"
            onClick={() => navigate("../..")}
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-3.5" /> Về sơ đồ bàn
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            {tableName} — Đơn món
            {isLoading && <RefreshCw className="size-4 animate-spin text-text-tertiary" />}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-text-tertiary">
            {guestCount} khách · Phiên {sessionCode}
          </p>
        </div>

        {/* 3 nút thao tác trên đỉnh khớp thiết kế */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="rounded-full border border-border-default bg-surface-card px-4 py-2 text-xs sm:text-sm font-medium text-text-secondary hover:bg-surface-muted transition-colors shadow-2xs cursor-pointer"
          >
            In phiếu chế biến
          </button>
          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="rounded-full border border-border-default bg-surface-card px-4 py-2 text-xs sm:text-sm font-medium text-text-secondary hover:bg-surface-muted transition-colors shadow-2xs cursor-pointer"
          >
            Chuyển / Gộp bàn
          </button>
          <button
            type="button"
            onClick={() => setIsCloseTableModalOpen(true)}
            className="rounded-full border border-orange-200 bg-[#fffaf5] px-4 py-2 text-xs sm:text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors shadow-2xs cursor-pointer"
          >
            Đóng bàn
          </button>
        </div>
      </div>

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
                    // Bếp chưa nhận: CHỜ XÁC NHẬN (món thường) hoặc CHỜ CÂN (món bán theo cân
                    // chưa nhập số cân) — cả 2 đều huỷ tự do được, không tính tiền (BR trước bếp).
                    const canCancel =
                      item.status === "PENDING" || item.status === "PENDING_WEIGHT";
                    const itemTotal = item.price ?? item.priceAtOrderTime * item.quantity;

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
                                <span className="text-xs text-text-tertiary">
                                  {item.options.map((opt) => opt.optionItemName).join(", ")}
                                </span>
                              ) : null}
                            </div>
                            <StatusBadge type="orderDetail" status={item.status} />
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <span className="text-sm text-text-secondary">x{item.quantity}</span>
                            <span className="w-20 shrink-0 text-right text-sm font-bold text-text-primary">
                              {formatVnd(itemTotal)}
                            </span>
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

                          {canCancel ? (
                            <button
                              type="button"
                              onClick={() =>
                                setItemToCancel({
                                  id: item.id,
                                  name: item.dishName || "Món ăn",
                                })
                              }
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
            <div className="mt-6 pt-5 border-t border-border-default/60 flex items-center justify-between">
              <span className="text-base font-bold text-text-secondary">Tổng cộng</span>
              <span className="text-2xl font-bold text-text-primary">
                {formatVnd(totalAmount)}
              </span>
            </div>
          )}
        </div>

        {/* ============================================================
            3. CỘT PHẢI: THAO TÁC
            ============================================================ */}
        <div className="w-full shrink-0 lg:w-[380px]">
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
              {reprintKitchenTicketMutation.isPending ? "Đang in..." : "In phiếu ngay"}
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
        open={Boolean(itemToCancel)}
        onOpenChange={(open) => !open && setItemToCancel(null)}
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
            <Button
              variant="outline"
              onClick={() => setItemToCancel(null)}
            >
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
    </div>
  );
}