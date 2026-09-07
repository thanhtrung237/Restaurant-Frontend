import { CANCEL_REASON_LABEL } from "@/types/enums"
import type { OrderDetail } from "@/types/models/order-detail.model"

/**
 * Một dòng món có tính tiền hay không.
 * Đồng bộ với BE (InvoiceServiceImpl.shouldChargeDetail):
 * - Chưa huỷ (status khác CANCELLED) → luôn tính tiền.
 * - Đã huỷ → chỉ tính tiền nếu isBillable = true (khách đổi ý sau khi bếp đã làm).
 *
 * Dùng chung cho Thu ngân (checkout) và Khách hàng (hoá đơn, yêu cầu tính tiền)
 * để tổng tiền hiển thị luôn khớp với BE, kể cả TRƯỚC KHI hóa đơn (Invoice) được
 * thu ngân phát hành — lúc đó các màn phải tự tính tạm từ order details.
 */
export function isBillableDetail(d: OrderDetail): boolean {
  if (d.status !== "CANCELLED") return true
  return d.isBillable === true
}

/** Tổng tiền hàng chỉ tính các dòng món billable (bỏ qua món huỷ không tính tiền). */
export function sumBillableAmount(details: OrderDetail[]): number {
  return details.filter(isBillableDetail).reduce((sum, d) => sum + (d.price || 0), 0)
}

export interface CancelInfo {
  label: string
  /** true = đã huỷ nhưng vẫn tính tiền (khách đổi ý sau khi bếp đã làm) */
  billable: boolean
}

/**
 * Nhãn hiển thị lý do huỷ cho 1 dòng món đã CANCELLED, chia 3 trường hợp:
 * 1. Huỷ trước bếp (chưa xác nhận / chờ cân) — không có cancelReason, không tính tiền.
 * 2. Huỷ sau bếp vì lỗi nhà hàng (RESTAURANT_ERROR) — không tính tiền.
 * 3. Huỷ sau bếp vì khách đổi ý (CUSTOMER_CHANGED_MIND) — vẫn tính tiền.
 */
export function getCancelInfo(d: OrderDetail): CancelInfo | null {
  if (d.status !== "CANCELLED") return null
  if (!d.cancelReason) {
    return { label: "Huỷ trước khi vào bếp", billable: false }
  }
  return {
    label: CANCEL_REASON_LABEL[d.cancelReason],
    billable: d.isBillable === true,
  }
}