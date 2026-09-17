/**
 * Công thức tính tiền đã được di chuyển sang BE.
 * FE chỉ format và hiển thị số liệu từ BE trả về.
 *
 * File này giữ lại chỉ để format số tiền và type AppliedPromo.
 */

/** Format số tiền theo chuẩn hiển thị của app: "408.240đ" */
export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN")}đ`
}

/**
 * 1 mã khuyến mãi đã áp dụng cho phiên bàn hiện tại.
 *
 * Kiểu này được giữ lại để sẵn sàng cho API thật, nhưng HIỆN KHÔNG CÓ NGUỒN nào sinh ra
 * nó: backend chưa có endpoint tra mã / áp mã cho khách, và `InvoiceServiceImpl` đang
 * hard-code `totalPromotionDiscount = 0`. Bảng mã demo client-side (`MOCK_PROMOTIONS`,
 * chỉ có "COMBOTRUA" giảm 20.000đ) đã bị xoá vì nó làm tổng tiền khách thấy lệch hẳn
 * với hoá đơn Thu ngân thu.
 */
export interface AppliedPromo {
  code: string
  label: string
  discountAmount: number
}
