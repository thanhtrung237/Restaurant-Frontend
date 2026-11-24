import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import {
  useDish,
  useDishOptionGroups,
  useOptionItemsByGroup,
  useBranchMenu,
} from "@/features/customer/api"
import { useCustomerCartStore } from "@/features/customer/store/cart.store"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { useBillLocked } from "@/features/customer/hooks/use-bill-locked"
import { useGoBack } from "@/hooks/use-go-back"
import { useActivePromotionsByBranch } from "@/api/promotions.api"
import { evaluateItemPromotion } from "@/lib/promotion-display"
import type { DishOptionGroup } from "@/types/models"
import { cn } from "@/lib/utils"

/**
 * Chi tiết món — Fetch từ API thực
 * Nguồn: Mobile / Chi tiết món
 *
 * API:
 * - GET /dishes/{id} - Lấy thông tin món
 * - GET /dish-option-groups/dish/{dishId} - Lấy các option groups (size, topping, etc.)
 * - GET /option-items/group/{groupId} - Lấy các items trong mỗi group
 *
 * Khách chọn options (bắt buộc nếu selectionType=REQUIRED), topping (nhiều lựa chọn nếu maxSelect>1), ghi chú và số lượng
 * trước khi thêm vào giỏ. Giá hiển thị luôn là giá đã cộng dồn theo đúng cấu hình đang chọn.
 */
export default function DishDetailPage() {
  const navigate = useNavigate()
  const { qrCode, dishId } = useParams<{ qrCode: string; dishId: string }>()
  // Fallback cho nút "Quay lại": mở thẳng màn này (link/bookmark/F5) thì về Thực đơn của
  // đúng bàn, chứ không rơi ra ngoài ứng dụng.
  const goBack = useGoBack(generatePath(CUSTOMER_PATHS.MENU, { qrCode: qrCode ?? "" }))
  const { toast } = useToast()

  const dishIdNum = dishId ? parseInt(dishId, 10) : undefined
  const { data: dish, isLoading: dishLoading, error: dishError } = useDish(dishIdNum)
  const { data: optionGroups = [], isLoading: optionGroupsLoading } = useDishOptionGroups(dishIdNum)

  // Khách có thể xem trước trang chi tiết món khi phiên còn WAITING_FOR_OPEN
  // (vào từ "Xem trước thực đơn"), nhưng chưa được thêm vào giỏ tới khi nhân
  // viên xác nhận mở bàn — chặn ở đây để không lọt qua đường vòng này.
  // QD-09: phien da yeu cau tinh tien -> khoa goi them mon (nguon: trang thai phien o BE)
  const billLocked = useBillLocked()
  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const isTableOpenConfirmed = tableSession?.status === "SERVING"

  const branchId = tableSession?.branchId
  const { data: menuItems = [] } = useBranchMenu(branchId ?? 1)
  const { data: activePromotions = [] } = useActivePromotionsByBranch(branchId)

  const branchMenuItem = React.useMemo(
    () => menuItems.find((m) => m.dishId === dishIdNum),
    [menuItems, dishIdNum],
  )
  const effectiveUnitPrice = branchMenuItem?.effectivePrice ?? dish?.basePrice ?? 0

  const [selectedOptions, setSelectedOptions] = React.useState<Map<number, Set<number>>>(new Map())
  // Store option item names and prices for building summary & total
  const [optionItemNames, setOptionItemNames] = React.useState<Map<number, string>>(new Map())
  const [optionItemPrices, setOptionItemPrices] = React.useState<Map<number, number>>(new Map())
  const [note, setNote] = React.useState("")
  const [quantity, setQuantity] = React.useState(1)

  const promoEval = React.useMemo(() => {
    if (!dish) return { discountAmount: 0, discountPercent: 0 }
    return evaluateItemPromotion(
      {
        dishId: dish.id,
        categoryId: branchMenuItem?.categoryId ?? (dish as any).categoryId,
        effectivePrice: effectiveUnitPrice,
      },
      quantity,
      activePromotions,
    )
  }, [dish, branchMenuItem, effectiveUnitPrice, quantity, activePromotions])

  // Nếu không tìm thấy món, quay lại Menu
  React.useEffect(() => {
    if (dishError || (!dishLoading && !dish)) {
      navigate(generatePath(CUSTOMER_PATHS.MENU, { qrCode: qrCode ?? "" }), { replace: true })
    }
  }, [dish, dishError, dishLoading, navigate, qrCode])

  // Loading state
  if (dishLoading || optionGroupsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
          <p className="text-sm text-text-secondary">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!dish) return null

  function toggleOptionItem(groupId: number, itemId: number, isRadio: boolean) {
    setSelectedOptions((prev) => {
      const next = new Map(prev)
      const currentItems = next.get(groupId) || new Set()

      if (isRadio) {
        // Radio behavior: only one selection (maxSelect === 1)
        next.set(groupId, new Set([itemId]))
      } else {
        // Checkbox behavior: multiple selections
        const newItems = new Set(currentItems)
        if (newItems.has(itemId)) {
          newItems.delete(itemId)
        } else {
          newItems.add(itemId)
        }
        next.set(groupId, newItems)
      }
      return next
    })
  }

  function handleAddToCart() {
    if (!dish) return
    // QĐ-09: phiên đã yêu cầu tính tiền thì không gọi thêm món được. Nút đã bị khoá ở dưới;
    // đây là chốt thứ hai phòng khi trạng thái đổi ngay lúc khách đang bấm.
    if (billLocked) {
      toast({
        title: "Đã yêu cầu tính tiền",
        description: "Không thể gọi thêm món. Cần gọi thêm, vui lòng báo nhân viên.",
        variant: "warning",
      })
      return
    }
    if (!isTableOpenConfirmed) {
      toast({
        title: "Chưa thể đặt món",
        description: "Vui lòng chờ nhân viên xác nhận mở bàn trước khi gọi món.",
        variant: "warning",
      })
      return
    }

    // Validate required option groups
    for (const group of optionGroups) {
      if (group.selectionType === "REQUIRED") {
        const selected = selectedOptions.get(group.optionGroupId)
        if (!selected || selected.size === 0) {
          toast({
            title: "Vui lòng chọn đầy đủ",
            description: `Bạn cần chọn ${group.optionGroupName}`,
            variant: "danger",
          })
          return
        }
      }
    }

    // Build selected options for order submission
    const selectedOptionsForOrder = Array.from(selectedOptions.entries()).flatMap(
      ([groupId, itemIds]) => Array.from(itemIds).map((itemId) => ({ groupId, itemId })),
    )

    // Build options summary for display in cart (e.g., "Cỡ vừa · 70% đường")
    const selectedItemIds = new Set(selectedOptionsForOrder.map((opt) => opt.itemId))
    const optionsSummary = Array.from(selectedItemIds)
      .map((itemId) => optionItemNames.get(itemId))
      .filter(Boolean)
      .join(" · ")

    // Tổng giá các option đã chọn (1 suất)
    const optionsTotalPrice = Array.from(selectedItemIds).reduce(
      (sum, itemId) => sum + (optionItemPrices.get(itemId) ?? 0),
      0,
    )

    useCustomerCartStore.getState().addLine({
      dishId: String(dish.id),
      name: dish.name,
      imageUrl: dish.imageUrl || "",
      unitPrice: effectiveUnitPrice,
      optionsTotalPrice: optionsTotalPrice > 0 ? optionsTotalPrice : undefined,
      quantity,
      selectedOptions: selectedOptionsForOrder,
      optionsSummary: optionsSummary || undefined,
      note: note.trim() || undefined,
      promotionId: promoEval.appliedPromotion?.id,
      promotionName: promoEval.appliedPromotion?.name,
      promotionDiscountAmount:
        promoEval.discountAmount > 0 ? Math.round(promoEval.discountAmount / quantity) : undefined,
    })

    toast({ title: "Đã thêm vào giỏ", description: dish.name, variant: "success" })
    goBack()
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-page min-h-dvh w-full">
      <div className="flex-1 overflow-y-auto w-full">
        <div className="w-full max-w-2xl mx-auto">
          {/* ---- Ảnh món ---- */}
          <div className="relative aspect-[4/3] w-full shrink-0 bg-surface-muted sm:aspect-[16/9] sm:rounded-b-2xl overflow-hidden">
            {dish.imageUrl ? (
              <img src={dish.imageUrl} alt={dish.name} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-4xl">🍜</div>
            )}
            <button
              type="button"
              onClick={goBack}
              aria-label="Quay lại"
              className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 flex size-9 items-center justify-center rounded-full bg-surface-card/90 text-text-primary shadow-sm backdrop-blur-sm transition-colors hover:bg-surface-card"
            >
              <ChevronLeft className="size-5" />
            </button>
          </div>

          {/* ---- Nội dung ---- */}
          <div className="-mt-4 rounded-t-2xl bg-surface-page px-5 sm:px-6 pt-5 pb-4">
            <h1 className="text-xl sm:text-2xl font-bold break-words text-text-primary">
              {dish.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-brand-primary">
                {promoEval.discountAmount > 0
                  ? Math.round(
                      (effectiveUnitPrice * quantity - promoEval.discountAmount) / quantity,
                    ).toLocaleString("vi-VN") + "đ"
                  : effectiveUnitPrice.toLocaleString("vi-VN") + "đ"}
              </span>
              {promoEval.discountAmount > 0 ||
              (branchMenuItem?.hasOverride && effectiveUnitPrice < dish.basePrice) ? (
                <span className="text-base text-text-tertiary line-through">
                  {dish.basePrice.toLocaleString("vi-VN")}đ
                </span>
              ) : null}
              {promoEval.appliedPromotion ? (
                <span className="rounded-full bg-status-success-subtle px-2.5 py-0.5 text-xs font-bold text-status-success">
                  🏷 {promoEval.appliedPromotion.name}
                </span>
              ) : null}
            </div>

            {promoEval.hint ? (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-status-warning-subtle/50 px-2.5 py-1 border border-status-warning/20">
                <span className="text-xs">💡</span>
                <p className="text-xs text-[#B54708] font-medium leading-tight">{promoEval.hint}</p>
              </div>
            ) : null}

            {dish.description ? (
              <p className="mt-3 text-sm sm:text-base text-text-secondary">{dish.description}</p>
            ) : null}

            {/* Render option groups dynamically */}
            {optionGroups.map((group) => (
              <OptionGroupSection
                key={group.id}
                group={group}
                selectedItems={selectedOptions.get(group.optionGroupId) || new Set()}
                onToggle={(itemId, itemName, itemPrice) => {
                  toggleOptionItem(group.optionGroupId, itemId, group.maxSelect === 1)
                  // Store item name and price for building summary and total
                  setOptionItemNames((prev) => new Map(prev).set(itemId, itemName))
                  setOptionItemPrices((prev) => new Map(prev).set(itemId, itemPrice))
                }}
              />
            ))}

            <div className="mt-5">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú cho nhà bếp (vd: ít cay)..."
                rows={2}
                className="w-full resize-none rounded-xl border border-border-default bg-surface-card px-4 py-2.5 text-sm sm:text-base text-text-primary placeholder:text-text-tertiary outline-none transition-colors focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---- Thanh dưới cố định: số lượng + Thêm vào giỏ ---- */}
      <div className="sticky bottom-0 z-30 w-full border-t border-border-default bg-surface-card shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 px-5 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] w-full max-w-2xl mx-auto">
          <div className="flex h-12 shrink-0 items-center gap-4 rounded-xl border border-border-default px-3 bg-white">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Giảm số lượng"
              className="flex size-6 items-center justify-center text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:text-text-tertiary"
            >
              −
            </button>
            <span className="min-w-4 text-center text-base font-bold text-text-primary">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              aria-label="Tăng số lượng"
              className="flex size-6 items-center justify-center font-bold text-brand-primary transition-colors hover:text-brand-primary-hover"
            >
              +
            </button>
          </div>

          {/* QĐ-09: `title` ở thẻ bọc vì nút disabled không tự hiện tooltip */}
          <span
            title={billLocked ? "Đã yêu cầu tính tiền — không thể gọi thêm món" : undefined}
            className="min-w-0 flex-1"
          >
            <Button
              size="lg"
              className="h-12 w-full rounded-xl text-base font-bold"
              onClick={handleAddToCart}
              disabled={billLocked}
            >
              <span className="truncate">
                {billLocked
                  ? "Đã yêu cầu tính tiền"
                  : (() => {
                      const selectedItemIds = new Set(
                        Array.from(selectedOptions.entries()).flatMap(([, ids]) => Array.from(ids)),
                      )
                      const optionsTotal = Array.from(selectedItemIds).reduce(
                        (s, id) => s + (optionItemPrices.get(id) ?? 0),
                        0,
                      )
                      const grossTotal = (effectiveUnitPrice + optionsTotal) * quantity
                      const finalTotal = Math.max(0, grossTotal - promoEval.discountAmount)
                      return `Thêm vào giỏ · ${finalTotal.toLocaleString("vi-VN")}đ`
                    })()}
              </span>
            </Button>
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Component hiển thị một option group (size, topping, etc.)
 */
function OptionGroupSection({
  group,
  selectedItems,
  onToggle,
}: {
  group: DishOptionGroup
  selectedItems: Set<number>
  onToggle: (itemId: number, itemName: string, itemPrice: number) => void
}) {
  const { data: items = [], isLoading } = useOptionItemsByGroup(group.optionGroupId)

  if (isLoading) {
    return (
      <div className="mt-5">
        <p className="text-xs font-semibold tracking-wide text-text-tertiary">
          {group.optionGroupName?.toUpperCase() || "LOADING..."}
        </p>
        <div className="mt-3 text-center text-sm text-text-tertiary">Đang tải...</div>
      </div>
    )
  }

  if (items.length === 0) return null

  const isRequired = group.selectionType === "REQUIRED"
  const isRadio = group.maxSelect === 1

  return (
    <>
      <div className="mt-5 border-t border-border-default" />
      <div className="mt-5">
        <p className="text-xs font-semibold tracking-wide text-text-tertiary">
          {group.optionGroupName?.toUpperCase()}
          {isRequired ? " · BẮT BUỘC" : ""}
        </p>
        <div className="mt-3 space-y-2.5">
          {items.map((item) => {
            const isSelected = selectedItems.has(item.id)

            if (isRadio) {
              // Radio button UI
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggle(item.id, item.name, item.extraPrice ?? 0)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md border px-4 py-3 text-left transition-colors",
                    isSelected
                      ? "border-brand-primary bg-brand-primary-subtle"
                      : "border-border-default bg-surface-card hover:border-border-strong",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "flex size-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        isSelected ? "border-brand-primary" : "border-border-strong",
                      )}
                    >
                      {isSelected ? (
                        <span className="size-2 rounded-full bg-brand-primary" />
                      ) : null}
                    </span>
                    <span className="truncate text-sm font-medium text-text-primary">
                      {item.name}
                    </span>
                  </span>
                  {item.extraPrice > 0 ? (
                    <span className="shrink-0 text-sm font-semibold text-text-secondary">
                      +{item.extraPrice.toLocaleString("vi-VN")}đ
                    </span>
                  ) : null}
                </button>
              )
            } else {
              // Checkbox UI
              return (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border-default bg-surface-card px-4 py-3 transition-colors hover:border-border-strong"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggle(item.id, item.name, item.extraPrice ?? 0)}
                    />
                    <span className="truncate text-sm font-medium text-text-primary">
                      {item.name}
                    </span>
                  </span>
                  {item.extraPrice > 0 ? (
                    <span className="shrink-0 text-sm font-semibold text-text-secondary">
                      +{item.extraPrice.toLocaleString("vi-VN")}đ
                    </span>
                  ) : null}
                </label>
              )
            }
          })}
        </div>
      </div>
    </>
  )
}
