import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { ChevronLeft, Plus, Trash2, ShoppingCart, Tag, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { QuantityStepper } from "@/components/common/QuantityStepper"
import { useToast } from "@/hooks/use-toast"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { useCreateOrder } from "@/features/customer/api"
import {
  useCustomerCartStore,
  selectCartSubtotal,
  type CartLine,
} from "@/features/customer/store/cart.store"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { computePricing, MOCK_PROMOTIONS, SERVICE_FEE_RATE, VAT_RATE } from "@/features/customer/lib/pricing"

type CartModal =
  | { kind: "none" }
  | { kind: "confirmSend" }
  | { kind: "sendSuccess"; orderNumber: number }

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
  const { toast } = useToast()

  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const tableName = tableSession?.tableName || "Bàn"

  const items = useCustomerCartStore((s) => s.items)
  const updateQuantity = useCustomerCartStore((s) => s.updateQuantity)
  const removeLine = useCustomerCartStore((s) => s.removeLine)
  const clear = useCustomerCartStore((s) => s.clear)
  const subtotal = selectCartSubtotal(items)

  // Khuyến mãi + cờ khoá phiên nằm ở session.store
  const appliedPromo = useCustomerSessionStore((s) => s.appliedPromo)
  const applyPromo = useCustomerSessionStore((s) => s.applyPromo)
  const billRequested = useCustomerSessionStore((s) => s.billRequested)

  const [promoCode, setPromoCode] = React.useState("")
  const [modal, setModal] = React.useState<CartModal>({ kind: "none" })

  const createOrderMutation = useCreateOrder()

  const pricing = computePricing(subtotal, appliedPromo?.discountAmount ?? 0)
  const { discountAmount, serviceFee, vatAmount, grandTotal } = pricing

  function goToMenu() {
    navigate(generatePath(CUSTOMER_PATHS.MENU, { qrCode: qrCode ?? "" }))
  }

  function handleApplyPromo() {
    const code = promoCode.trim().toUpperCase()
    if (!code) return
    const found = MOCK_PROMOTIONS[code]
    if (!found) {
      toast({ title: "Mã khuyến mãi không hợp lệ", variant: "danger" })
      return
    }
    applyPromo({ code, ...found })
    toast({ title: "Đã áp dụng khuyến mãi", description: found.label, variant: "success" })
  }

  function handleSendOrderClick() {
    // Bỏ qua kiểm tra tồn kho (BE sẽ validate)
    setModal({ kind: "confirmSend" })
  }

  async function handleConfirmSend() {
    if (!tableSession?.id) {
      toast({ title: "Lỗi", description: "Không tìm thấy phiên bàn", variant: "danger" })
      return
    }

    try {
      const order = await createOrderMutation.mutateAsync({
        tableSessionId: tableSession.id,
        items: items.map((line) => ({
          dishId: parseInt(line.dishId, 10),
          quantity: line.quantity,
          note: line.note,
          // Gửi danh sách option item IDs đã chọn
          optionItemIds: line.selectedOptions?.map((opt) => opt.itemId) || [],
        })),
      })

      // Clear cart và hiển thị success
      clear()
      setModal({ kind: "sendSuccess", orderNumber: order.id })
    } catch (error) {
      console.error("Error creating order:", error)
      toast({
        title: "Lỗi gửi order",
        description: error instanceof Error ? error.message : "Vui lòng thử lại",
        variant: "danger",
      })
      setModal({ kind: "none" })
    }
  }

  // ---- Trạng thái: Phiên đã khoá (đã yêu cầu tính tiền) — không cho gửi thêm món ----
  // TODO(phase-tiếp theo): áp cùng điều kiện này ở Thực đơn (menu/index.tsx) để chặn "Thêm vào giỏ".
  if (billRequested) {
    return (
      <div className="flex flex-1 flex-col bg-surface-page">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-default bg-surface-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
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
            <span className="text-4xl">✓</span>
          </div>

          <h1 className="text-2xl font-bold text-text-primary">Đã gửi món!</h1>
          <p className="mt-2 max-w-xs text-center text-sm text-text-secondary">
            Nhà bếp đã nhận order #{modal.orderNumber} của {tableName}. Món sẽ được phục vụ trong ít phút.
          </p>

          <div className="mt-8 flex w-full max-w-sm gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => navigate(generatePath(CUSTOMER_PATHS.ORDERED_ITEMS, { qrCode: qrCode ?? "" }))}
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
            onClick={() => navigate(-1)}
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
              {items.map((line) => (
                <CartLineRow
                  key={line.cartItemId}
                  line={line}
                  onQuantityChange={(qty) => updateQuantity(line.cartItemId, qty)}
                  onRemove={() => removeLine(line.cartItemId)}
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

              {/* ---- Mã khuyến mãi ---- */}
              <div className="mt-3 flex items-center justify-between rounded-[16px] border border-border-default/80 bg-white p-1.5 pl-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <div className="flex flex-1 items-center gap-2">
                  <Tag className="size-4 shrink-0 text-text-tertiary" />
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Nhập mã khuyến mãi"
                    className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="rounded-[10px] bg-brand-primary-subtle px-3.5 py-2 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-primary-subtle/80 active:scale-95"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>

          {/* ---- Tóm tắt tiền & Nút gửi món (cố định dưới) ---- */}
          <div className="border-t border-border-default/40 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.04)] w-full">
            <div className="w-full max-w-2xl mx-auto px-5 sm:px-6 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Tiền hàng</span>
                <span className="font-bold text-text-primary">
                  {subtotal.toLocaleString("vi-VN")}đ
                </span>
              </div>

              {discountAmount > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#12B76A]">
                    Khuyến mãi &ldquo;{appliedPromo?.label ?? "Combo trưa"}&rdquo;
                  </span>
                  <span className="font-bold text-[#12B76A]">
                    -{discountAmount.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <span className="text-text-secondary">
                  Phí dịch vụ ({Math.round(SERVICE_FEE_RATE * 100)}%)
                </span>
                <span className="font-bold text-text-primary">
                  {serviceFee.toLocaleString("vi-VN")}đ
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-text-secondary">
                  VAT ({Math.round(VAT_RATE * 100)}%)
                </span>
                <span className="font-bold text-text-primary">
                  {vatAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>

              <div className="my-2.5 border-t border-border-default/60" />

              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-text-primary">Tổng cộng</span>
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
    </div>
  )
}

/** 1 dòng món trong Giỏ hàng: ảnh, tên, tuỳ chọn/ghi chú, giá, stepper số lượng và nút xoá riêng. */
function CartLineRow({
  line,
  onQuantityChange,
  onRemove,
}: {
  line: CartLine
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-[18px] bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
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
        <p className="text-sm font-bold text-brand-primary">
          {(line.unitPrice * line.quantity).toLocaleString("vi-VN")}đ
        </p>
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
  )
}