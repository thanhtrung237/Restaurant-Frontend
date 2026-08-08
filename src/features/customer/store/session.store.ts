import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { TableSession } from "@/types/models"
import type { AppliedPromo } from "@/features/customer/lib/pricing"
import { getTableByQrCode } from "@/api/tables.api"
import { getOpenSessionByTable } from "@/api/table-sessions.api"

interface CustomerSessionState {
  qrCode: string | null
  sessionToken: string | null // token phiên cấp cho thiết bị khách sau khi Phục vụ mở bàn
  tableSession: TableSession | null
  /**
   * true kể từ khi khách bấm "Yêu cầu tính tiền" (Món đã gọi -> Yêu cầu tính tiền).
   * Theo đúng UI gốc ("Phiên đã khoá — không thể gọi thêm món"), khi cờ này bật:
   * Menu/Giỏ hàng phải chặn gọi thêm món cho tới khi thanh toán xong / phiên đóng.
   * TODO(api): khi có backend, suy ra trực tiếp từ TableSessionStatus
   * (WAITING_FOR_PAY) thay vì giữ cờ riêng ở FE.
   */
  billRequested: boolean
  /**
   * Mã khuyến mãi đang áp dụng cho CẢ PHIÊN bàn — nâng lên đây (thay vì state cục bộ ở
   * Giỏ hàng) vì Hoá đơn / Yêu cầu tính tiền / Thanh toán QR đều cần hiển thị lại đúng
   * khuyến mãi đã áp, kể cả khi khách rời trang Giỏ hàng.
   */
  appliedPromo: AppliedPromo | null
  setSession: (payload: { qrCode: string; sessionToken: string; tableSession: TableSession }) => void
  clearSession: () => void
  /** Đánh dấu đã gửi yêu cầu tính tiền — khoá phiên, không cho gọi thêm món */
  requestBill: () => void
  applyPromo: (promo: AppliedPromo) => void
  clearPromo: () => void
}

/** Store phiên của Khách hàng — không đăng nhập, sống theo token phiên bàn (mục 1.2). */
export const useCustomerSessionStore = create<CustomerSessionState>()(
  persist(
    (set) => ({
      qrCode: null,
      sessionToken: null,
      tableSession: null,
      billRequested: false,
      appliedPromo: {
        code: "COMBOTRUA",
        label: "Combo trưa",
        discountAmount: 20000,
      },
      setSession: ({ qrCode, sessionToken, tableSession }) =>
        set({ qrCode, sessionToken, tableSession }),
      clearSession: () =>
        set({
          qrCode: null,
          sessionToken: null,
          tableSession: null,
          billRequested: false,
          appliedPromo: null,
        }),
      requestBill: () => set({ billRequested: true }),
      applyPromo: (promo) => set({ appliedPromo: promo }),
      clearPromo: () => set({ appliedPromo: null }),
    }),
    {
      name: "pho-viet-customer-session",
    }
  )
)

/**
 * Tự động đồng bộ/phục hồi phiên bàn khách hàng trực tiếp từ database backend qua mã QR.
 * Trả về TableSession active nếu tìm thấy, hoặc null nếu bàn không có phiên active nào.
 */
export async function syncCustomerSessionWithBackend(qrCode: string): Promise<TableSession | null> {
  if (!qrCode) return null
  const branchMatch = qrCode.match(/(?:QR-)?B(\d+)/i)
  const branchId = branchMatch ? parseInt(branchMatch[1], 10) : 1

  try {
    const table = await getTableByQrCode(branchId, qrCode)
    if (!table?.id) return null

    const session = await getOpenSessionByTable(table.id)
    if (session && ["SERVING", "WAITING_FOR_OPEN", "WAITING_FOR_PAY"].includes(session.status)) {
      useCustomerSessionStore.getState().setSession({
        qrCode,
        sessionToken: `session-${session.id}`,
        tableSession: session,
      })
      if (session.status === "WAITING_FOR_PAY") {
        useCustomerSessionStore.getState().requestBill()
      }
      return session
    }
  } catch {
    // Không có phiên đang mở hoặc bàn chưa có phiên active
  }
  return null
}