import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import {
  ChevronLeft,
  Plus,
  Trash2,
  ShoppingCart,
  Lock,
  Info,
  Tag,
  Check,
  Lightbulb,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/common/EmptyState"
import { QuantityStepper } from "@/components/common/QuantityStepper"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/http"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { useCreateOrder, useOutOfStock, useBranchMenu } from "@/features/customer/api"
import { useActivePromotionsByBranch } from "@/api/promotions.api"
import { evaluateItemPromotion } from "@/lib/promotion-display"
import {
  useCustomerCartStore,
  selectCartSubtotal,
  type CartLine,
} from "@/features/customer/store/cart.store"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { useBillLocked } from "@/features/customer/hooks/use-bill-locked"
import { useGoBack } from "@/hooks/use-go-back"

type CartModal =
  | { kind: "none" }
  | { kind: "confirmSend" }
  // Giỏ có món vừa hết tại chi nhánh — phải bỏ khỏi giỏ trước khi gửi được order
  | { kind: "outOfStock" }
  | { kind: "sendSuccess"; orderNumber: number }
  // FR-CUS-05: Khuyến mãi vừa hết lượt trước lúc gửi order
  | { kind: "promoExpired"; message: string }

/**
 * Giỏ hàng — Gửi order xuống bếp
 * Nguồn: Mobile / Giỏ hàng · Mobile / Giỏ hàng trống · Mobile / Xác nhận gửi order · Mobile / Gửi order thành công
 *
 * API: POST /orders với OrderAddRequest { tableSessionId, items }
 * Gộp chung các màn hình: giỏ trống, xác nhận gửi order, gửi order thành công
 */
export default function CartPage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  // Fallback cho nút "Quay lại": mở thẳng màn này (link/bookmark/F5) thì về Thực đơn của
  // đúng bàn, chứ không rơi ra ngoài ứng dụng.
  const goBack = useGoBack(generatePath(CUSTOMER_PATHS.MENU, { qrCode: qrCode ?? "" }))
  const { toast } = useToast()

  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const tableName = tableSession?.tableName || "Bàn"

  const items = useCustomerCartStore((s) => s.items)
  const updateQuantity = useCustomerCartStore((s) => s.updateQuantity)
  const removeLine = useCustomerCartStore((s) => s.removeLine)
  const clear = useCustomerCartStore((s) => s.clear)
  const subtotal = selectCartSubtotal(items)

  const billLocked = useBillLocked()
  const [modal, setModal] = React.useState<CartModal>({ kind: "none" })

  const createOrderMutation = useCreateOrder()

  // Món hết tại chi nhánh này (FR-MNU-03). Chặn ở FE là cần thiết vì
  // `OrderServiceImpl.buildDetail()` KHÔNG kiểm tra tồn kho khi tạo order — nếu không
  // chặn, khách gửi được món đã hết và bếp mới phát hiện.
  const branchId = tableSession?.branchId
  const { data: outOfStockRows = [], refetch: refetchOutOfStock } = useOutOfStock(branchId)

  // `CartLine.dishId` là string, `BranchDishStock.dishId` là number → so sánh theo number.
  const outOfStockDishIds = React.useMemo(
    () => new Set(outOfStockRows.map((row) => row.dishId)),
    [outOfStockRows],
  )
  const outOfStockLines = React.useMemo(
    () => items.filter((line) => outOfStockDishIds.has(Number(line.dishId))),
    [items, outOfStockDishIds],
  )

  const { data: menuItems = [] } = useBranchMenu(branchId ?? 1)
  const { data: activePromotions = [] } = useActivePromotionsByBranch(branchId)

  // Đánh giá khuyến mãi cấp MÓN cho từng dòng trong giỏ (dùng chung hàm evaluateItemPromotion với menu)
  const lineEvaluations = React.useMemo(() => {
    return items.map((line) => {
      const menuItem = menuItems.find((m) => String(m.dishId) === String(line.dishId))
      const evalResult = evaluateItemPromotion(
        {
          dishId: line.dishId,
          categoryId: menuItem?.categoryId,
          effectivePrice: line.unitPrice,
        },
        line.quantity,
        activePromotions,
      )
      return {
        line,
        ...evalResult,
      }
    })
  }, [items, menuItems, activePromotions])

  // Tổng giảm giá món từ các dòng trong giỏ (khuyến mãi cấp MÓN)
  const itemPromotionDiscount = React.useMemo(() => {
    return lineEvaluations.reduce((sum, item) => sum + (item.discountAmount || 0), 0)
  }, [lineEvaluations])

  // Tiền các món trong giỏ hàng (sau khi trừ khuyến mãi cấp món nếu có)
  const grandTotal = Math.max(0, subtotal - itemPromotionDiscount)

  function goToMenu() {
    navigate(generatePath(CUSTOMER_PATHS.MENU, { qrCode: qrCode ?? "" }))
  }

  function handleSendOrderClick() {
    // Có món đã hết → buộc xử lý trước, không cho gửi cả giỏ.
    if (outOfStockLines.length > 0) {
      setModal({ kind: "outOfStock" })
      return
    }
    setModal({ kind: "confirmSend" })
  }

  /** Bỏ các món đã hết khỏi giỏ rồi gửi phần còn lại. */
  async function handleRemoveOutOfStockAndSend() {
    const remaining = items.filter((line) => !outOfStockDishIds.has(Number(line.dishId)))
    outOfStockLines.forEach((line) => removeLine(line.cartItemId))

    if (remaining.length === 0) {
      setModal({ kind: "none" })
      toast({
        title: "Giỏ hàng đã trống",
        description: "Tất cả món trong giỏ đều đã hết. Vui lòng chọn món khác.",
        variant: "info",
      })
      return
    }

    await sendOrder(remaining)
  }

  async function handleConfirmSend() {
    await sendOrder(items)
  }

  async function sendOrder(lines: CartLine[]) {
    if (!tableSession?.id) {
      toast({ title: "Lỗi", description: "Không tìm thấy phiên bàn", variant: "danger" })
      return
    }

    try {
      const order = await createOrderMutation.mutateAsync({
        tableSessionId: tableSession.id,
        items: lines.map((line) => ({
          dishId: parseInt(line.dishId, 10),
          quantity: line.quantity,
          note: line.note,
          // Gửi danh sách option item IDs đã chọn
          optionItemIds: line.selectedOptions?.map((opt) => opt.itemId) || [],
        })),
      })

      // Clear cart và hiển thị success
      clear({ qrCode: qrCode ?? null, tableSession })
      setModal({ kind: "sendSuccess", orderNumber: order.id })
    } catch (error: any) {
      const errorMsg = getErrorMessage(error)

      // FR-CUS-05: Kiểm tra nếu KM vừa hết lượt (BE ném ConflictException HTTP 409)
      if (
        error?.response?.status === 409 ||
        error?.status === 409 ||
        errorMsg.toLowerCase().includes("hết lượt")
      ) {
        setModal({
          kind: "promoExpired",
          message:
            errorMsg || "Chương trình khuyến mãi vừa hết lượt. Đơn hàng sẽ được tính theo giá gốc.",
        })
        return
      }

      // Gửi thất bại có thể vì món vừa bị báo hết giữa lúc khách đang xem giỏ.
      // Kiểm tra lại tồn kho: nếu đúng là do món hết thì mở sheet để khách bỏ món,
      // thay vì chỉ báo lỗi chung rồi bấm lại vẫn thất bại.
      const blocked = await findOutOfStockLines(lines)
      if (blocked.length > 0) {
        setModal({ kind: "outOfStock" })
        return
      }

      toast({
        title: "Lỗi gửi order",
        description: errorMsg,
        variant: "danger",
      })
      setModal({ kind: "none" })
    }
  }

  /** Hỏi lại server những dòng nào trong `lines` đang hết. */
  async function findOutOfStockLines(lines: CartLine[]): Promise<CartLine[]> {
    if (typeof branchId !== "number") return []
    const result = await refetchOutOfStock()
    const freshIds = new Set((result.data ?? []).map((row) => row.dishId))
    return lines.filter((line) => freshIds.has(Number(line.dishId)))
  }

  // ---- Trạng thái: Phiên đã khoá (phiên đang CHỜ THANH TOÁN) — không cho gửi thêm món ----
  // TODO(phase-tiếp theo): áp cùng điều kiện này ở Thực đơn / Chi tiết món để chặn
  // "Thêm vào giỏ" ngay từ đầu (xem docs/todo.md).
  if (billLocked) {
    return (
      <div className="flex flex-1 flex-col bg-surface-page">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-default bg-surface-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Quay lại"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="min-w-0 truncate text-lg font-bold text-text-primary">
            Giỏ hàng · {tableName}
          </h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <EmptyState
            icon={Lock}
            title="Phiên đã khoá"
            description="Bạn đã yêu cầu tính tiền nên không thể gọi thêm món. Vui lòng chờ thu ngân đến bàn."
            action={{
              label: "Xem lại hoá đơn",
              onClick: () =>
                navigate(generatePath(CUSTOMER_PATHS.REQUEST_BILL, { qrCode: qrCode ?? "" })),
            }}
          />
        </div>
      </div>
    )
  }

  // ---- Trạng thái: Đã gửi order thành công (thay thế toàn bộ nội dung Giỏ hàng) ----
  if (modal.kind === "sendSuccess") {
    return (
      <div className="flex flex-1 flex-col bg-surface-page">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-default bg-surface-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <h1 className="min-w-0 truncate text-lg font-bold text-text-primary">
            Giỏ hàng · {tableName}
          </h1>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-status-success-subtle">
            <Check aria-hidden="true" className="size-9 text-status-success" />
          </div>

          <h1 className="text-2xl font-bold text-text-primary">Đã gửi món!</h1>
          <p className="mt-2 max-w-xs text-center text-sm text-text-secondary">
            Nhà bếp đã nhận order #{modal.orderNumber} của {tableName}. Món sẽ được phục vụ trong ít
            phút.
          </p>

          <div className="mt-8 flex w-full max-w-sm gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() =>
                navigate(generatePath(CUSTOMER_PATHS.ORDERED_ITEMS, { qrCode: qrCode ?? "" }))
              }
              className="flex-1"
            >
              Xem món đã gọi
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={() => {
                setModal({ kind: "none" })
                goToMenu()
              }}
              className="flex-1"
            >
              Gọi thêm món
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ---- Trạng thái mặc định: Giỏ hàng có món (hoặc trống, xử lý bằng ternary bên dưới) ----
  return (
    <div className="flex flex-1 flex-col bg-surface-page min-h-dvh w-full">
      {/* ---- Header ---- */}
      <div className="sticky top-0 z-10 w-full border-b border-border-default/60 bg-white">
        <div className="flex items-center gap-3 px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 w-full max-w-2xl mx-auto">
          <button
            type="button"
            onClick={goBack}
            aria-label="Quay lại"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F1F3F5] text-text-primary transition-colors hover:bg-border-default"
          >
            <ChevronLeft className="size-5" strokeWidth={2.5} />
          </button>
          <h1 className="min-w-0 truncate text-lg sm:text-xl font-bold text-text-primary tracking-tight">
            Giỏ hàng · {tableName}
          </h1>
        </div>
      </div>

      {items.length === 0 ? (
        // ---- Giỏ hàng trống ----
        <div className="flex flex-1 flex-col items-center justify-center w-full max-w-2xl mx-auto px-4">
          <EmptyState
            icon={ShoppingCart}
            title="Giỏ hàng đang trống"
            description={`Thêm món từ thực đơn để bắt đầu gọi món cho ${tableName}.`}
            action={{ label: "Xem thực đơn", onClick: goToMenu }}
          />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto w-full">
            <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-3">
              {lineEvaluations.map((itemEval) => (
                <CartLineRow
                  key={itemEval.line.cartItemId}
                  itemEval={itemEval}
                  onQuantityChange={(qty) => updateQuantity(itemEval.line.cartItemId, qty)}
                  onRemove={() => removeLine(itemEval.line.cartItemId)}
                />
              ))}

              <button
                type="button"
                onClick={goToMenu}
                className="flex h-12 w-full items-center justify-center gap-1.5 rounded-[16px] border border-dashed border-[#F9BCAF] bg-white text-sm font-bold text-brand-primary transition-all hover:bg-brand-primary-subtle/30 active:scale-[0.99]"
              >
                <Plus className="size-4" strokeWidth={2.5} />
                <span>Thêm món</span>
              </button>
            </div>
          </div>

          {/* ---- Tóm tắt tiền & Nút gửi món (cố định dưới) ---- */}
          <div className="border-t border-border-default/40 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.04)] w-full">
            <div className="w-full max-w-2xl mx-auto px-5 sm:px-6 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="space-y-2 text-sm">
                {itemPromotionDiscount > 0 ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-text-tertiary">
                      <span>Tiền món gốc</span>
                      <span className="line-through">{subtotal.toLocaleString("vi-VN")}đ</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-status-success font-medium">
                      <span>Ưu đãi theo món</span>
                      <span>-{itemPromotionDiscount.toLocaleString("vi-VN")}đ</span>
                    </div>
                    <div className="my-1.5 border-t border-border-default/50" />
                  </>
                ) : null}

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-base font-bold text-text-primary">Tạm tính giỏ hàng</span>
                    <p className="text-[11px] text-text-tertiary">
                      Khuyến mãi theo hóa đơn sẽ tự động áp dụng khi thanh toán
                    </p>
                  </div>
                  <span className="text-xl font-bold text-brand-primary">
                    {grandTotal.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>

              <Button
                size="lg"
                className="mt-3.5 h-[52px] w-full rounded-[16px] bg-brand-primary text-base font-bold text-white shadow-none transition-transform hover:bg-brand-primary-hover active:scale-[0.99]"
                onClick={handleSendOrderClick}
              >
                Gửi món
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ---- Bottom sheet: Xác nhận gửi order ---- */}
      {modal.kind === "confirmSend" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-send-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-text-primary/40"
          onClick={() => setModal({ kind: "none" })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl bg-surface-card px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lg"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-default" />
            <div className="flex flex-col items-center text-center">
              <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-brand-primary-subtle text-brand-primary">
                <ShoppingCart className="size-5" />
              </span>
              <h2 id="confirm-send-title" className="text-lg font-bold text-text-primary">
                Gửi món xuống bếp?
              </h2>
              <p className="mt-1.5 text-sm text-text-secondary">
                {items.length} món sẽ được gửi tới bếp. Món đang chế biến sẽ không thể tự huỷ.
              </p>
            </div>

            <div className="mt-5 space-y-2">
              <Button
                size="lg"
                className="w-full"
                onClick={handleConfirmSend}
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? "Đang gửi..." : "Gửi món"}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={() => setModal({ kind: "none" })}
                disabled={createOrderMutation.isPending}
              >
                Quay lại
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- Bottom sheet: Một số món đã hết ----
          Dùng Radix Dialog (focus trap + Esc + khoá scroll) và ghi đè lớp định vị để
          hiện dạng bottom sheet. Sheet "Xác nhận gửi order" ở trên là overlay tự viết
          từ trước — chưa đổi để không vượt phạm vi task. */}
      <Dialog
        open={modal.kind === "outOfStock"}
        onOpenChange={(open) => !open && setModal({ kind: "none" })}
      >
        <DialogContent
          showCloseButton={false}
          className="top-auto bottom-0 left-1/2 max-w-md translate-y-0 gap-0 rounded-card rounded-b-none border-b-0 px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-md"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-default" />

          <DialogHeader className="flex-row items-center gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-status-warning-subtle text-status-warning">
              <Info className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-bold text-text-primary">
                Một số món đã hết
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm text-text-tertiary">
                Cần xử lý trước khi gửi món
              </DialogDescription>
            </div>
          </DialogHeader>

          <p className="mt-3 text-sm text-text-secondary">
            Các món dưới đây vừa hết tại chi nhánh này. Bỏ khỏi giỏ để tiếp tục gửi những món còn
            lại.
          </p>

          <ul className="mt-4 space-y-5 rounded-card border border-brand-primary/20 bg-brand-primary-subtle/25 px-4 py-5">
            {outOfStockLines.map((line) => (
              <li key={line.cartItemId} className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-[15px] text-text-primary">
                  <span className="font-bold">{line.name}</span>
                  <span className="text-text-tertiary"> × {line.quantity}</span>
                </span>
                <Badge
                  variant="danger"
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                >
                  Đã hết
                </Badge>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2">
            <Button
              size="lg"
              className="w-full"
              onClick={() => void handleRemoveOutOfStockAndSend()}
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? "Đang gửi..." : "Bỏ món đã hết & gửi order"}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => setModal({ kind: "none" })}
              disabled={createOrderMutation.isPending}
            >
              Quay lại giỏ hàng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Bottom sheet: Khuyến mãi vừa hết lượt (FR-CUS-05) ---- */}
      <Dialog
        open={modal.kind === "promoExpired"}
        onOpenChange={(open) => !open && setModal({ kind: "none" })}
      >
        <DialogContent
          showCloseButton={false}
          className="top-auto bottom-0 left-1/2 max-w-md translate-y-0 gap-0 rounded-card rounded-b-none border-b-0 px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-md"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-default" />

          <DialogHeader className="flex-row items-center gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-status-warning-subtle text-status-warning">
              <Info className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-bold text-text-primary">
                Khuyến mãi vừa hết lượt
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm text-text-tertiary">
                Xác nhận thay đổi giá trước khi gửi bếp (FR-CUS-05)
              </DialogDescription>
            </div>
          </DialogHeader>

          <p className="mt-3 text-sm text-text-secondary leading-relaxed">
            {modal.kind === "promoExpired" ? modal.message : ""}
          </p>

          <div className="mt-5 space-y-2">
            <Button
              size="lg"
              className="w-full"
              onClick={() => void handleConfirmSend()}
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? "Đang gửi..." : "Đồng ý giá gốc & gửi món"}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => setModal({ kind: "none" })}
              disabled={createOrderMutation.isPending}
            >
              Quay lại giỏ hàng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** 1 dòng món trong Giỏ hàng: ảnh, tên, tuỳ chọn/ghi chú, giá, stepper số lượng, thông tin KM và lời nhắc điều kiện. */
function CartLineRow({
  itemEval,
  onQuantityChange,
  onRemove,
}: {
  itemEval: {
    line: CartLine
    appliedPromotion?: any
    discountAmount: number
    discountPercent: number
    hint?: string
  }
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}) {
  const { line, appliedPromotion, discountAmount, hint } = itemEval
  const grossPrice = (line.unitPrice + (line.optionsTotalPrice ?? 0)) * line.quantity
  const finalPrice = Math.max(0, grossPrice - discountAmount)
  const promoName = appliedPromotion?.name || line.promotionName

  return (
    <div className="flex flex-col gap-2 rounded-[18px] bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3.5">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-[12px] bg-[#F1F3F5]">
          {line.imageUrl ? (
            <img src={line.imageUrl} alt={line.name} className="size-full object-cover" />
          ) : (
            <div className="size-full bg-[#F1F3F5]" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <h4 className="truncate text-sm font-bold text-text-primary">{line.name}</h4>
          {line.optionsSummary ? (
            <p className="truncate text-xs text-text-tertiary">{line.optionsSummary}</p>
          ) : null}

          {/* Dòng khuyến mãi đã áp dụng (FR-CUS-09) */}
          {discountAmount > 0 && promoName ? (
            <div className="flex items-center gap-1.5">
              <Tag className="size-3 text-status-success shrink-0" />
              <span className="truncate text-xs font-semibold text-status-success">
                {promoName}
              </span>
              <span className="shrink-0 text-xs font-bold text-status-success">
                -{discountAmount.toLocaleString("vi-VN")}đ
              </span>
            </div>
          ) : null}

          {/* Dòng giá: gạch ngang giá gốc nếu có KM, hiện giá thực tế */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-brand-primary">
              {finalPrice.toLocaleString("vi-VN")}đ
            </span>
            {discountAmount > 0 ? (
              <span className="text-xs text-text-tertiary line-through">
                {grossPrice.toLocaleString("vi-VN")}đ
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <QuantityStepper
            value={line.quantity}
            onChange={onQuantityChange}
            min={1}
            max={99}
            variant="pill"
          />

          <button
            type="button"
            onClick={onRemove}
            aria-label={`Xoá ${line.name} khỏi giỏ`}
            className="flex size-7 items-center justify-center rounded-full text-text-tertiary/60 transition-colors hover:text-status-danger active:scale-90"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Lời nhắc điều kiện KM chưa đủ (FR-CUS-09: ví dụ 'Thêm 1 ly nữa để được giảm 10%') */}
      {hint ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-status-warning-subtle/50 px-2.5 py-1 border border-status-warning/20">
          <Lightbulb aria-hidden="true" className="size-3.5 shrink-0 text-status-warning" />
          <p className="text-xs text-[#B54708] font-medium leading-tight">{hint}</p>
        </div>
      ) : null}
    </div>
  )
}
