import { create } from "zustand"
import type { PaymentMethod } from "@/types/enums"

export type CustomerPaymentStatus = "PENDING" | "PAID" | "FAILED"

interface CustomerPaymentState {
  /** Số hoá đơn hiển thị cho khách (vd "#1042") — sinh 1 lần khi vào Thanh toán QR, giữ
   * nguyên xuyên suốt Thanh toán QR -> Thành công/Thất bại để 2 màn sau hiển thị đúng cùng 1 số. */
  invoiceNumber: string | null
  status: CustomerPaymentStatus | null
  /** Số tiền phải thu tại thời điểm bắt đầu thanh toán — chốt lại 1 lần, không tính lại theo
   * orders.store nữa (tránh trường hợp orders.store đổi giữa chừng làm lệch số đã hiển thị QR). */
  amount: number | null
  method: PaymentMethod | null
  /** Nhãn giờ:phút lúc thanh toán thành công, hiển thị ở Thanh toán thành công */
  paidAtLabel: string | null

  /** Bắt đầu 1 lượt thanh toán mới (vào Thanh toán QR) — sinh số hoá đơn + chốt số tiền */
  startPayment: (payload: { amount: number }) => string
  markPaid: (method: PaymentMethod) => void
  markFailed: () => void
  /** Huỷ thanh toán đang chờ (khách bấm "Huỷ và quay lại hoá đơn tạm tính") — không phải lỗi */
  reset: () => void
}

function genInvoiceNumber() {
  // TODO(api): thay bằng invoiceNumber thật do BE cấp (đánh số riêng theo chi nhánh, xem Invoice.model.ts)
  return `#${1000 + Math.floor(Math.random() * 9000)}`
}

export const useCustomerPaymentStore = create<CustomerPaymentState>((set) => ({
  invoiceNumber: null,
  status: null,
  amount: null,
  method: null,
  paidAtLabel: null,

  startPayment: ({ amount }) => {
    const invoiceNumber = genInvoiceNumber()
    set({ invoiceNumber, amount, status: "PENDING", method: null, paidAtLabel: null })
    return invoiceNumber
  },

  markPaid: (method) =>
    set({
      status: "PAID",
      method,
      paidAtLabel: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    }),

  markFailed: () => set({ status: "FAILED" }),

  reset: () => set({ invoiceNumber: null, status: null, amount: null, method: null, paidAtLabel: null }),
}))