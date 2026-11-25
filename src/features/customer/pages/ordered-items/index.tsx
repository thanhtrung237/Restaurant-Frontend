import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { ChevronLeft, Bell, ClipboardList, AlertTriangle, ReceiptText } from "lucide-react"
import { StatusBadge } from "@/components/common/StatusBadge"
import { EmptyState } from "@/components/common/EmptyState"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { useGoBack } from "@/hooks/use-go-back"
import {
  useOrderDetailsBySession,
  useCancelBeforeKitchen,
  useCallStaff,
} from "@/features/customer/api"
import { useStaffCall } from "@/api/order-details.api"
import { useCustomerWebSocket } from "@/hooks/use-customer-websocket"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { useBillLocked } from "@/features/customer/hooks/use-bill-locked"
import { isBillableDetail } from "@/lib/order-detail-billing"
import { cn } from "@/lib/utils"
import type { OrderDetail } from "@/types/models"

/**
 * Món đã gọi — Fetch từ API thực
 * Nguồn: Mobile / Món đã gọi
 *
 * API: GET /order-details/session/{tableSessionId} (polling 5s)
 * Theo dõi trạng thái từng dòng món đã gửi bếp, nhóm theo ORDER (mỗi lần bấm "Gửi món"
 * tạo 1 order mới). Khách chỉ được huỷ dòng đang "Chờ xác nhận" (AWAITING_CONFIRM).
 */
export default function OrderedItemsPage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  // Fallback cho nút "Quay lại": mở thẳng màn này (link/bookmark/F5) thì về Thực đơn của
  // đúng bàn, chứ không rơi ra ngoài ứng dụng.
  const goBack = useGoBack(generatePath(CUSTOMER_PATHS.MENU, { qrCode: qrCode ?? "" }))
  const { toast } = useToast()

  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const tableName = tableSession?.tableName || "Bàn"
  const tableSessionId = tableSession?.id

  // A3: Lắng nghe real-time qua WebSocket (FR-CUS-08, T-01: độ trễ ≤ 5s, không cần polling)
  useCustomerWebSocket(tableSessionId)

  // Fetch order details — giữ refetchInterval làm fallback
  const {
    data: orderDetails = [],
    isLoading,
    error,
  } = useOrderDetailsBySession(tableSessionId, undefined, { refetchInterval: 5000 })

  const billLocked = useBillLocked()
  const cancelBeforeKitchenMutation = useCancelBeforeKitchen()
  const staffCallMutation = useStaffCall()
  const [reportedItemIds, setReportedItemIds] = React.useState<Set<number>>(new Set())

  function handleStaffCall(detail: OrderDetail) {
    if (reportedItemIds.has(detail.id)) {
      toast({
        title: "Đã gửi yêu cầu",
        description: `Yêu cầu hỗ trợ cho món "${detail.dishName}" đã được gửi tới nhân viên.`,
        variant: "info",
      })
      return
    }

    staffCallMutation.mutate(detail.id, {
      onSuccess: () => {
        setReportedItemIds((prev) => new Set(prev).add(detail.id))
        toast({
          title: "Đã báo nhân viên",
          description: `Đã gửi thông báo hỗ trợ cho món "${detail.dishName}" tới nhân viên bàn.`,
          variant: "success",
        })
      },
      onError: (err) => {
        toast({
          title: "Lỗi gửi yêu cầu",
          description: err instanceof Error ? err.message : "Không thể gửi yêu cầu hỗ trợ lúc này.",
          variant: "danger",
        })
      },
    })
  }

  // Các dòng món còn đang "Chờ xác nhận" / "Chờ cân" — bếp chưa nhận, có thể huỷ tự do.
  // Nếu còn tồn tại khi khách bấm "Yêu cầu tính tiền", phải hỏi xác nhận huỷ trước khi khoá phiên.
  const pendingItems = React.useMemo(
    () => orderDetails.filter((d) => d.status === "PENDING" || d.status === "PENDING_WEIGHT"),
    [orderDetails],
  )

  // Con dong mon nao TINH TIEN khong - cung tieu chi voi BE (shouldChargeDetail):
  // dong chua huy thi tinh; dong da huy chi tinh khi isBillable bat (BR-24).
  const hasBillableItem = React.useMemo(() => orderDetails.some(isBillableDetail), [orderDetails])
  // Huy het cac mon dang cho xac nhan xong thi con lai gi khong?
  const billableAfterCancelPending = React.useMemo(
    () => orderDetails.some((d) => isBillableDetail(d) && !pendingItems.includes(d)),
    [orderDetails, pendingItems],
  )

  // Tính tạm tính: tổng tiền các món tính phí (chưa tính service fee & VAT)
  const subtotal = React.useMemo(
    () => orderDetails.filter(isBillableDetail).reduce((sum, d) => sum + (d.price || 0), 0),
    [orderDetails],
  )

  const [isConfirmPayOpen, setIsConfirmPayOpen] = React.useState(false)
  const [isCancellingPending, setIsCancellingPending] = React.useState(false)

  // KHÔNG khoá phiên ở đây. Trang "Yêu cầu tính tiền" mới là nơi gọi API, và chỉ khoá
  // khi API trả về thành công — trước đây khoá ngay lúc điều hướng nên API lỗi vẫn khoá.
  function goToRequestBill() {
    navigate(generatePath(CUSTOMER_PATHS.REQUEST_BILL, { qrCode: qrCode ?? "" }))
  }

  function handleRequestBillClick() {
    // Khong con mon tinh tien -> backend tra 409 "Chua co mon de tinh tien".
    // Chan ngay o day de khach khong roi vao phien 0d bi ket.
    if (!billLocked && !hasBillableItem) {
      toast({
        title: "Chưa có món để tính tiền",
        description: "Bàn chưa có món nào được xác nhận. Vui lòng gọi món trước.",
        variant: "danger",
      })
      return
    }
    // Đã gửi yêu cầu tính tiền trước đó rồi -> chỉ xem lại, không cần hỏi lại
    if (billLocked) {
      navigate(generatePath(CUSTOMER_PATHS.REQUEST_BILL, { qrCode: qrCode ?? "" }))
      return
    }
    // Mở modal xác nhận yêu cầu tính tiền
    setIsConfirmPayOpen(true)
  }

  async function handleConfirmPay() {
    if (pendingItems.length > 0) {
      setIsCancellingPending(true)
      try {
        await Promise.all(
          pendingItems.map((item) => cancelBeforeKitchenMutation.mutateAsync(item.id)),
        )
        setIsConfirmPayOpen(false)
        // Huy xong ma khong con mon nao tinh tien -> KHONG gui yeu cau tinh tien.
        // Gui se tao ra phien CHO THANH TOAN tong 0d, thu ngan khong dong duoc ban.
        if (!billableAfterCancelPending) {
          toast({
            title: "Đã huỷ các món chờ xác nhận",
            description:
              "Bàn không còn món nào để tính tiền nên chưa gửi yêu cầu. Gọi thêm món hoặc nhờ nhân viên hỗ trợ.",
            variant: "danger",
          })
          return
        }
        goToRequestBill()
      } catch (error) {
        toast({
          title: "Lỗi hủy món",
          description:
            error instanceof Error
              ? error.message
              : "Không thể hủy các món đang chờ xác nhận. Vui lòng thử lại.",
          variant: "danger",
        })
      } finally {
        setIsCancellingPending(false)
      }
    } else {
      setIsConfirmPayOpen(false)
      goToRequestBill()
    }
  }

  // Nhóm order details theo orderId
  const orderGroups = React.useMemo(() => {
    const groups = new Map<number, OrderDetail[]>()
    orderDetails.forEach((detail) => {
      const existing = groups.get(detail.orderId) || []
      groups.set(detail.orderId, [...existing, detail])
    })
    // Convert to array và sort theo orderId tăng dần (LƯỢT 1 lên trên, các lượt sau xếp xuống dưới)
    return Array.from(groups.entries())
      .map(([orderId, items]) => ({ orderId, items }))
      .sort((a, b) => a.orderId - b.orderId)
  }, [orderDetails])

  const callStaffMutation = useCallStaff()

  function handleCallStaffGeneral() {
    if (!tableSessionId) return
    callStaffMutation.mutate(tableSessionId, {
      onSuccess: () => {
        toast({
          title: "Đã gọi nhân viên",
          description: `${tableName} · Nhân viên sẽ đến hỗ trợ trong giây lát.`,
          variant: "success",
        })
      },
      onError: (err) => {
        toast({
          title: "Lỗi gọi nhân viên",
          description:
            err instanceof Error
              ? err.message
              : "Không thể gọi nhân viên lúc này. Vui lòng thử lại.",
          variant: "danger",
        })
      },
    })
  }

  // Loading state
  if (isLoading && orderDetails.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
          <p className="text-sm text-text-secondary">Đang tải món đã gọi...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-surface-page px-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-status-danger-subtle">
            <AlertTriangle aria-hidden="true" className="size-7 text-status-danger" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Không thể tải món đã gọi</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Vui lòng thử lại hoặc liên hệ nhân viên.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-[#F8F9FA] min-h-dvh w-full">
      {/* ---- Header ---- */}
      <div className="sticky top-0 z-20 w-full border-b border-border-default/50 bg-white">
        <div className="flex items-center gap-3 px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 w-full max-w-2xl mx-auto">
          <button
            type="button"
            onClick={goBack}
            aria-label="Quay lại"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F1F3F5] text-text-primary transition-colors hover:bg-border-default"
          >
            <ChevronLeft className="size-5" strokeWidth={2.5} />
          </button>
          <h1 className="min-w-0 truncate text-base sm:text-lg font-bold text-text-primary">
            Món đã gọi · {tableName}
          </h1>
        </div>
      </div>

      {orderGroups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center bg-surface-page w-full max-w-2xl mx-auto px-4">
          <EmptyState
            icon={ClipboardList}
            title="Chưa có món nào được gửi"
            description="Món bạn gửi từ Giỏ hàng sẽ hiển thị ở đây theo từng lượt gọi."
            action={{
              label: "Xem thực đơn",
              onClick: () => navigate(generatePath(CUSTOMER_PATHS.MENU, { qrCode: qrCode ?? "" })),
            }}
          />
        </div>
      ) : (
        <>
          {/* ---- Danh sách món theo từng order ---- */}
          <div className="flex-1 overflow-y-auto w-full">
            <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-12 space-y-6">
              {orderGroups.map((group, groupIndex) => (
                <div key={group.orderId}>
                  <p className="mb-2.5 text-xs font-semibold tracking-wider text-text-tertiary uppercase">
                    LƯỢT {groupIndex + 1} · ORDER #{group.orderId}
                  </p>

                  <div className="space-y-3">
                    {group.items.map((detail) => (
                      <div
                        key={detail.id}
                        className="rounded-[16px] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <p className="text-sm sm:text-base font-bold text-text-primary">
                              {detail.quantity}× <span className="ml-1">{detail.dishName}</span>
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
                          </div>
                          <div className="flex flex-col items-end shrink-0 ml-4">
                            {detail.promotionDiscountAmount &&
                            detail.promotionDiscountAmount > 0 ? (
                              <>
                                <span className="text-xs text-text-tertiary line-through">
                                  {(
                                    (detail.price || 0) + detail.promotionDiscountAmount
                                  ).toLocaleString("vi-VN")}
                                  đ
                                </span>
                                <span className="text-sm sm:text-base font-bold text-brand-primary">
                                  {(detail.price || 0).toLocaleString("vi-VN")}đ
                                </span>
                                <span className="text-[11px] font-semibold text-status-success">
                                  -{detail.promotionDiscountAmount.toLocaleString("vi-VN")}đ
                                  {detail.promotionName ? ` (${detail.promotionName})` : ""}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm sm:text-base font-bold text-text-primary">
                                {(detail.price || 0).toLocaleString("vi-VN")}đ
                              </span>
                            )}
                          </div>
                        </div>

                        {detail.note ? (
                          <p className="mt-1 text-xs text-text-tertiary">{detail.note}</p>
                        ) : null}

                        <div className="mt-3 flex items-center justify-between">
                          <StatusBadge type="orderDetail" status={detail.status} />

                          {detail.status === "PENDING" && !billLocked ? (
                            <button
                              type="button"
                              onClick={() =>
                                toast({
                                  title: "Chức năng hủy món đang phát triển",
                                  variant: "info",
                                })
                              }
                              className="inline-flex items-center justify-center rounded-full border border-border-default bg-white px-3.5 py-1.5 text-xs font-semibold text-status-danger transition-colors hover:bg-status-danger-subtle active:scale-95"
                            >
                              Hủy món
                            </button>
                          ) : detail.status === "PREPARING" ? (
                            <button
                              type="button"
                              onClick={() => handleStaffCall(detail)}
                              disabled={
                                staffCallMutation.isPending &&
                                staffCallMutation.variables === detail.id
                              }
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors active:scale-95 cursor-pointer",
                                reportedItemIds.has(detail.id)
                                  ? "bg-surface-muted text-text-tertiary"
                                  : "bg-[#FEEBE4] text-brand-primary hover:bg-[#FEDBD0]",
                              )}
                            >
                              <Bell className="size-3.5 text-brand-primary" />
                              <span>
                                {reportedItemIds.has(detail.id) ? "Đã báo NV" : "Báo nhân viên"}
                              </span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---- Vùng cố định dưới cùng: Gọi nhân viên + Tạm tính + Yêu cầu tính tiền ---- */}
          <div className="sticky bottom-0 z-30 w-full bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
            <div className="w-full max-w-2xl mx-auto px-5 sm:px-6 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {/* Nút nổi Gọi nhân viên đặt góc trên bên phải */}
              <div className="relative">
                <div className="absolute -top-9 right-0 z-10">
                  <button
                    type="button"
                    onClick={handleCallStaffGeneral}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary bg-white px-4 py-2 text-xs sm:text-sm font-bold text-brand-primary shadow-[0_4px_16px_rgba(240,82,43,0.15)] transition-all hover:bg-brand-primary-subtle/40 active:scale-95"
                  >
                    <Bell className="size-4 text-brand-primary" />
                    <span>Gọi nhân viên</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-medium text-text-tertiary">Tạm tính</span>
                <span className="text-base sm:text-lg font-bold text-text-primary">
                  {subtotal.toLocaleString("vi-VN")}đ
                </span>
              </div>

              <button
                type="button"
                onClick={handleRequestBillClick}
                disabled={!billLocked && !hasBillableItem}
                className="mt-3 flex h-12 w-full items-center justify-center rounded-[16px] border border-brand-primary bg-white text-base font-bold text-brand-primary transition-colors hover:bg-brand-primary-subtle/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:border-border-default disabled:text-text-tertiary disabled:hover:bg-white"
              >
                {billLocked ? "Xem yêu cầu tính tiền" : "Yêu cầu tính tiền"}
              </button>
              {!billLocked && !hasBillableItem ? (
                <p className="mt-2 text-center text-xs text-text-tertiary">
                  Chưa có món nào được xác nhận nên chưa tính tiền được.
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* ---- Modal xác nhận yêu cầu tính tiền ---- */}
      <Dialog open={isConfirmPayOpen} onOpenChange={setIsConfirmPayOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-[24px] p-5 sm:max-w-md sm:p-6">
          <DialogHeader className="gap-2">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FEEBE4] text-brand-primary">
                <ReceiptText className="size-5 text-brand-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold text-text-primary leading-tight">
                  Xác nhận yêu cầu tính tiền
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs text-text-tertiary">
                  {tableName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Tóm tắt tạm tính */}
            <div className="rounded-[16px] bg-[#F8F9FA] p-3.5 border border-border-default/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Tạm tính ({orderDetails.length} món)</span>
                <span className="text-base font-bold text-brand-primary">
                  {subtotal.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>

            {/* Thông báo / cảnh báo */}
            {pendingItems.length > 0 ? (
              <div className="flex items-start gap-2.5 rounded-[16px] bg-[#FEF6EE] border border-[#FEE4E2] p-3.5 text-left">
                <AlertTriangle className="size-4.5 shrink-0 text-[#D92D20] mt-0.5" />
                <div className="text-xs text-[#B42318] leading-relaxed">
                  <p className="font-semibold">Còn {pendingItems.length} món đang chờ xác nhận</p>
                  <p className="mt-0.5 text-[#7A271A]">
                    Các món chưa gửi bếp này sẽ tự động bị huỷ khi bạn xác nhận tính tiền.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-secondary leading-relaxed px-0.5">
                Sau khi xác nhận, phiên gọi món của bàn sẽ được khóa lại và nhân viên thu ngân sẽ
                đến bàn để hỗ trợ bạn thanh toán.
              </p>
            )}
          </div>

          <DialogFooter className="flex flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 rounded-[14px] h-11 text-sm font-bold bg-[#F2F4F7] text-text-primary hover:bg-[#E4E7EC]"
              onClick={() => setIsConfirmPayOpen(false)}
              disabled={isCancellingPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-[14px] h-11 text-sm font-bold bg-brand-primary text-white hover:bg-brand-primary-hover active:scale-[0.99]"
              onClick={handleConfirmPay}
              disabled={isCancellingPending}
            >
              {isCancellingPending ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
