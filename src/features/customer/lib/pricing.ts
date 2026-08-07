/**
 * Công thức tính tiền dùng chung cho luồng Khách hàng (mobile, theo phiên bàn).
 *
 * Trước đây công thức này (và mã khuyến mãi demo) bị viết cứng riêng trong
 * customer/pages/cart/index.tsx. Từ Hoá đơn / Yêu cầu tính tiền / Thanh toán QR trở đi,
 * nhiều màn cùng cần tính trên CÙNG một tập dữ liệu (toàn bộ orders.store của phiên,
 * không chỉ 1 lượt gửi) — nên tách ra đây để tránh sai lệch số liệu giữa các màn.
 *
 * TODO(api): thay 2 rate bên dưới bằng GET /api/branches/:branchId/config khi có backend.
 */
export const SERVICE_FEE_RATE = 0.05
export const VAT_RATE = 0.08

export interface PricingBreakdown {
  /** Tổng tiền hàng, trước khuyến mãi */
  subtotal: number
  /** Số tiền khuyến mãi thực nhận (đã kẹp trong khoảng [0, subtotal]) */
  discountAmount: number
  /** Tiền hàng sau khuyến mãi — dùng làm gốc tính phí DV rồi VAT */
  baseAfterDiscount: number
  /** Phí dịch vụ = baseAfterDiscount * SERVICE_FEE_RATE */
  serviceFee: number
  /** VAT = (baseAfterDiscount + serviceFee) * VAT_RATE */
  vatAmount: number
  /** serviceFee + vatAmount — dùng cho những màn gộp chung 1 dòng "Phí dịch vụ + VAT" */
  feePlusVat: number
  /** Số tiền cuối cùng khách phải trả */
  grandTotal: number
}

/**
 * Tính toàn bộ breakdown tiền từ tiền hàng + số tiền khuyến mãi.
 * Dùng chung cho Giỏ hàng, Yêu cầu tính tiền, Hoá đơn, Thanh toán QR để đảm bảo
 * luôn ra cùng 1 kết quả trên cùng 1 tập dữ liệu.
 */
export function computePricing(subtotal: number, discountAmount = 0): PricingBreakdown {
  const safeSubtotal = Math.max(0, subtotal)
  const safeDiscount = Math.min(Math.max(0, discountAmount), safeSubtotal)
  const baseAfterDiscount = Math.max(0, safeSubtotal - safeDiscount)
  const serviceFee = Math.round(baseAfterDiscount * SERVICE_FEE_RATE)
  const vatAmount = Math.round((baseAfterDiscount + serviceFee) * VAT_RATE)

  return {
    subtotal: safeSubtotal,
    discountAmount: safeDiscount,
    baseAfterDiscount,
    serviceFee,
    vatAmount,
    feePlusVat: serviceFee + vatAmount,
    grandTotal: baseAfterDiscount + serviceFee + vatAmount,
  }
}

/** Format số tiền theo chuẩn hiển thị của app: "408.240đ" */
export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN")}đ`
}

/** 1 mã khuyến mãi đã áp dụng cho phiên bàn hiện tại */
export interface AppliedPromo {
  code: string
  label: string
  discountAmount: number
}

// TODO(api): thay bằng POST /api/promotions/apply?code=... — hiện chỉ có 1 mã demo client-side
export const MOCK_PROMOTIONS: Record<string, { label: string; discountAmount: number }> = {
  COMBOTRUA: { label: "Combo trưa", discountAmount: 20000 },
}