import { create } from "zustand"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"

/**
 * Giỏ hàng chưa gửi bếp được lưu tạm trên trình duyệt theo phiên bàn.
 *
 * 1 dòng (CartLine) = 1 cấu hình món cụ thể (đã chọn size/topping/ghi chú), có `cartItemId`
 * riêng — vì vậy cùng 1 món nhưng khác size/topping sẽ là 2 dòng khác nhau trong giỏ.
 */
export interface CartLine {
  /** id duy nhất của DÒNG giỏ hàng (khác dishId — 1 món có thể có nhiều dòng cấu hình khác nhau) */
  cartItemId: string
  dishId: string
  name: string
  imageUrl?: string
  /** Đơn giá base của món (chưa tính options) */
  unitPrice: number
  /** Tổng giá các topping/option đã chọn (tính cho 1 suất, nhân thêm với quantity khi tính tổng) */
  optionsTotalPrice?: number
  quantity: number
  /** Các option items đã chọn (groupId, itemId) - để submit lên BE */
  selectedOptions?: Array<{ groupId: number; itemId: number }>
  /** Tóm tắt lựa chọn hiển thị dưới tên món trong giỏ, vd: "Nhỏ · thêm nước chấm" */
  optionsSummary?: string
  note?: string
  /** Promotion info - applied at menu level */
  promotionId?: number
  promotionName?: string
  promotionDiscountAmount?: number
}

type CartScope = Pick<
  ReturnType<typeof useCustomerSessionStore.getState>,
  "qrCode" | "tableSession"
>

interface CustomerCartState {
  items: CartLine[]
  /** Thêm 1 dòng mới vào giỏ (luôn tạo dòng mới — dùng cho cả "thêm nhanh" và "thêm từ chi tiết món") */
  addLine: (line: Omit<CartLine, "cartItemId">) => void
  /** Thêm nhanh từ danh sách thực đơn (không tuỳ chọn): gộp số lượng nếu đã có đúng món này ở dạng mặc định */
  quickAdd: (item: {
    dishId: string
    name: string
    imageUrl?: string
    unitPrice: number
    promotionId?: number
    promotionName?: string
    promotionDiscountAmount?: number
  }) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  removeLine: (cartItemId: string) => void
  clear: (scope?: CartScope) => void
}

function genCartItemId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const CART_STORAGE_PREFIX = "pho-viet-customer-cart:v1:"
const CART_TTL_MS = 60 * 60 * 1000

interface SavedCart {
  items: CartLine[]
  expiresAt: number
}

function getCartStorageKey({ qrCode, tableSession }: CartScope) {
  return qrCode && tableSession ? `${CART_STORAGE_PREFIX}${tableSession.id}:${qrCode}` : null
}

function removeSavedCart(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // The cart can still be used in memory when browser storage is unavailable.
  }
}

function readSavedCart(key: string | null): SavedCart | null {
  if (key === null) return null

  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null

    const saved = JSON.parse(raw) as SavedCart | null
    if (
      saved &&
      Number.isFinite(saved.expiresAt) &&
      saved.expiresAt > Date.now() &&
      Array.isArray(saved.items) &&
      saved.items.every(
        (line) =>
          line &&
          typeof line.cartItemId === "string" &&
          typeof line.dishId === "string" &&
          typeof line.name === "string" &&
          Number.isFinite(line.unitPrice) &&
          Number.isSafeInteger(line.quantity) &&
          line.quantity > 0 &&
          (line.selectedOptions === undefined ||
            (Array.isArray(line.selectedOptions) &&
              line.selectedOptions.every(
                (option) =>
                  option &&
                  Number.isSafeInteger(option.groupId) &&
                  Number.isSafeInteger(option.itemId),
              ))),
      )
    ) {
      return saved
    }
  } catch {
    // A missing or malformed snapshot should not interrupt ordering.
  }

  removeSavedCart(key)
  return null
}

let cartStorageKey = getCartStorageKey(useCustomerSessionStore.getState())
const initialCart = readSavedCart(cartStorageKey)
let expiresAt = initialCart?.expiresAt ?? null
let expiryTimer: ReturnType<typeof setTimeout> | undefined

function scheduleCartExpiry(nextExpiry: number | null) {
  clearTimeout(expiryTimer)
  expiresAt = nextExpiry
  if (nextExpiry !== null) {
    expiryTimer = setTimeout(() => restoreCart(), Math.max(0, nextExpiry - Date.now()))
  }
}

function restoreCart() {
  const saved = readSavedCart(cartStorageKey)
  scheduleCartExpiry(saved?.expiresAt ?? null)
  useCustomerCartStore.setState({ items: saved?.items ?? [] })
}

function saveCart(items: CartLine[]) {
  if (cartStorageKey === null) return
  if (items.length === 0) {
    removeSavedCart(cartStorageKey)
    scheduleCartExpiry(null)
    return
  }

  const nextExpiry = Date.now() + CART_TTL_MS
  try {
    localStorage.setItem(cartStorageKey, JSON.stringify({ items, expiresAt: nextExpiry }))
    scheduleCartExpiry(nextExpiry)
  } catch {
    removeSavedCart(cartStorageKey)
    scheduleCartExpiry(null)
  }
}

export const useCustomerCartStore = create<CustomerCartState>((set) => {
  const updateItems = (update: (items: CartLine[]) => CartLine[]) =>
    set((state) => {
      const items = update(expiresAt !== null && expiresAt <= Date.now() ? [] : state.items)
      saveCart(items)
      return { items }
    })

  return {
    items: initialCart?.items ?? [],

    addLine: (line) => updateItems((items) => [...items, { ...line, cartItemId: genCartItemId() }]),

    quickAdd: ({
      dishId,
      name,
      imageUrl,
      unitPrice,
      promotionId,
      promotionName,
      promotionDiscountAmount,
    }) =>
      updateItems((items) => {
        // Chỉ gộp vào dòng mặc định (không có optionsSummary/note) của đúng món này
        const existing = items.find((i) => i.dishId === dishId && !i.optionsSummary && !i.note)

        if (existing) {
          return items.map((i) =>
            i.cartItemId === existing.cartItemId ? { ...i, quantity: i.quantity + 1 } : i,
          )
        }
        return [
          ...items,
          {
            cartItemId: genCartItemId(),
            dishId,
            name,
            imageUrl,
            unitPrice,
            quantity: 1,
            promotionId,
            promotionName,
            promotionDiscountAmount,
          },
        ]
      }),

    updateQuantity: (cartItemId, quantity) =>
      updateItems((items) =>
        quantity <= 0
          ? items.filter((i) => i.cartItemId !== cartItemId)
          : items.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity } : i)),
      ),

    removeLine: (cartItemId) =>
      updateItems((items) => items.filter((i) => i.cartItemId !== cartItemId)),

    clear: (scope) => {
      const key = scope ? getCartStorageKey(scope) : cartStorageKey
      if (key === cartStorageKey) updateItems(() => [])
      else if (key !== null) removeSavedCart(key)
    },
  }
})

scheduleCartExpiry(expiresAt)

useCustomerSessionStore.subscribe((state, previous) => {
  const nextKey = getCartStorageKey(state)
  if (nextKey === cartStorageKey) return

  if (cartStorageKey !== null && (nextKey === null || state.qrCode === previous.qrCode)) {
    removeSavedCart(cartStorageKey)
  }
  cartStorageKey = nextKey
  restoreCart()
})

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (cartStorageKey !== null && (event.key === cartStorageKey || event.key === null)) {
      restoreCart()
    }
  })
}

/** Số dòng khác nhau trong giỏ (KHÔNG phải tổng số lượng) — dùng cho badge "Xem giỏ hàng" */
export function selectCartLineCount(items: CartLine[]): number {
  return items.length
}

/** Tổng số lượng tất cả món trong giỏ */
export function selectCartTotalQuantity(items: CartLine[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0)
}

/** Tổng tiền hàng (chưa gồm khuyến mãi/phí DV/VAT) — bao gồm cả giá topping/option */
export function selectCartSubtotal(items: CartLine[]): number {
  return items.reduce((sum, i) => sum + (i.unitPrice + (i.optionsTotalPrice ?? 0)) * i.quantity, 0)
}

/** Tổng giảm giá từ khuyến mãi món ăn */
export function selectCartItemPromotionDiscount(items: CartLine[]): number {
  return items.reduce((sum, i) => sum + (i.promotionDiscountAmount || 0) * i.quantity, 0)
}

/** Subtotal sau khi trừ khuyến mãi món */
export function selectCartSubtotalAfterPromotion(items: CartLine[]): number {
  return selectCartSubtotal(items) - selectCartItemPromotionDiscount(items)
}
