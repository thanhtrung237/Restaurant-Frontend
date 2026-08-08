import { create } from "zustand"

/**
 * Giỏ hàng của Khách hàng (mobile, theo phiên bàn) — state client-side, chưa gửi bếp.
 * TODO(api): khi có backend, đồng bộ giỏ theo sessionToken (POST/PATCH /api/carts/:sessionToken)
 * thay vì chỉ giữ trong bộ nhớ trình duyệt.
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
  /** Đơn giá base (chưa tính options - BE sẽ tính khi submit order) */
  unitPrice: number
  quantity: number
  /** Các option items đã chọn (groupId, itemId) - để submit lên BE */
  selectedOptions?: Array<{ groupId: number; itemId: number }>
  /** Tóm tắt lựa chọn hiển thị dưới tên món trong giỏ, vd: "Nhỏ · thêm nước chấm" */
  optionsSummary?: string
  note?: string
}

interface CustomerCartState {
  items: CartLine[]
  /** Thêm 1 dòng mới vào giỏ (luôn tạo dòng mới — dùng cho cả "thêm nhanh" và "thêm từ chi tiết món") */
  addLine: (line: Omit<CartLine, "cartItemId">) => void
  /** Thêm nhanh từ danh sách thực đơn (không tuỳ chọn): gộp số lượng nếu đã có đúng món này ở dạng mặc định */
  quickAdd: (item: { dishId: string; name: string; imageUrl?: string; unitPrice: number }) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  removeLine: (cartItemId: string) => void
  clear: () => void
}

function genCartItemId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const INITIAL_DEMO_CART: CartLine[] = []

export const useCustomerCartStore = create<CustomerCartState>((set) => ({
  items: INITIAL_DEMO_CART,

  addLine: (line) =>
    set((state) => ({
      items: [...state.items, { ...line, cartItemId: genCartItemId() }],
    })),

  quickAdd: ({ dishId, name, imageUrl, unitPrice }) =>
    set((state) => {
      // Chỉ gộp vào dòng mặc định (không có optionsSummary/note) của đúng món này
      const existing = state.items.find(
        (i) => i.dishId === dishId && !i.optionsSummary && !i.note
      )
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.cartItemId === existing.cartItemId ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }
      }
      return {
        items: [
          ...state.items,
          { cartItemId: genCartItemId(), dishId, name, imageUrl, unitPrice, quantity: 1 },
        ],
      }
    }),

  updateQuantity: (cartItemId, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => i.cartItemId !== cartItemId)
          : state.items.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity } : i)),
    })),

  removeLine: (cartItemId) =>
    set((state) => ({ items: state.items.filter((i) => i.cartItemId !== cartItemId) })),

  clear: () => set({ items: [] }),
}))

/** Số dòng khác nhau trong giỏ (KHÔNG phải tổng số lượng) — dùng cho badge "Xem giỏ hàng" */
export function selectCartLineCount(items: CartLine[]): number {
  return items.length
}

/** Tổng số lượng tất cả món trong giỏ */
export function selectCartTotalQuantity(items: CartLine[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0)
}

/** Tổng tiền hàng (chưa gồm khuyến mãi/phí DV/VAT) */
export function selectCartSubtotal(items: CartLine[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
}
