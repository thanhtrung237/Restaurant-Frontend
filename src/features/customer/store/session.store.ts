import { getGuestCredential, clearGuestCredential } from "@/lib/guest-credential"
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
   * Khoá TẠM ngay sau khi `POST /table-sessions/{id}/request-payment` thành công, để UI
   * không phải chờ vòng polling kế tiếp. Gắn theo đúng `sessionId` và **KHÔNG persist**.
   *
   * Nguồn sự thật của "phiên đã khoá" là `tableSession.status === "WAITING_FOR_PAY"` lấy
   * từ backend — xem `useBillLocked`. Cờ này chỉ lấp khoảng trống vài giây.
   */
  pendingBillSessionId: number | null
  /**
   * Mã khuyến mãi đang áp dụng cho CẢ PHIÊN bàn — nâng lên đây (thay vì state cục bộ ở
   * Giỏ hàng) vì Hoá đơn / Yêu cầu tính tiền / Thanh toán QR đều cần hiển thị lại đúng
   * khuyến mãi đã áp, kể cả khi khách rời trang Giỏ hàng.
   */
  appliedPromo: AppliedPromo | null
  setSession: (payload: { qrCode: string; tableSession: TableSession }) => void
  clearSession: () => void
  /** Gọi SAU khi API request-payment trả về thành công — API lỗi thì KHÔNG gọi. */
  markBillRequested: (sessionId: number) => void
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
      pendingBillSessionId: null,
      // Không gán sẵn khuyến mãi nào. Trước đây field này mặc định là mã demo
      // "COMBOTRUA" (-20.000đ), nghĩa là MỌI khách vừa quét QR đã được giảm 20k
      // mà không nhập mã — và số tiền đó KHÔNG tồn tại ở backend
      // (`InvoiceServiceImpl` đang hard-code `totalPromotionDiscount = 0`),
      // nên tổng tiền khách nhìn thấy lệch hẳn với hoá đơn Thu ngân thu.
      appliedPromo: null,
      setSession: ({ qrCode, tableSession }) =>
        set((state) => {
          // Phiên KHÁC phiên cũ (quét bàn khác, hoặc bàn cũ đã đóng và mở phiên mới)
          // ⇒ bỏ mọi thứ gắn với phiên cũ. Thiếu bước này thì khuyến mãi và khoá tạm
          // của bàn trước dính sang bàn sau trên cùng một trình duyệt.
          const isDifferentSession = state.tableSession?.id !== tableSession.id
          const credential = getGuestCredential()
          return {
            qrCode,
            sessionToken: credential?.sessionId === tableSession.id ? credential.token : null,
            tableSession,
            appliedPromo: isDifferentSession ? null : state.appliedPromo,
            pendingBillSessionId: isDifferentSession ? null : state.pendingBillSessionId,
          }
        }),
      clearSession: () => {
        clearGuestCredential()
        set({
          qrCode: null,
          sessionToken: null,
          tableSession: null,
          pendingBillSessionId: null,
          appliedPromo: null,
        })
      },
      markBillRequested: (sessionId) => set({ pendingBillSessionId: sessionId }),
      applyPromo: (promo) => set({ appliedPromo: promo }),
      clearPromo: () => set({ appliedPromo: null }),
    }),
    {
      name: "pho-viet-customer-session",
      /**
       * v1: bỏ cờ `billRequested` khỏi bộ nhớ trình duyệt.
       *
       * Cờ cũ được persist nhưng chỉ reset ở 2 trang (Thanh toán thành công, Đánh giá).
       * Thu ngân thu tiền mặt và đóng bàn thì máy của khách KHÔNG đi qua hai trang đó,
       * nên cờ kẹt lại vĩnh viễn: quét bàn khác vẫn thấy "Phiên đã khoá".
       */
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2)
          return { qrCode: null, sessionToken: null, tableSession: null, appliedPromo: null }
        return persisted
      },
      // `pendingBillSessionId` cố ý KHÔNG nằm trong danh sách: khoá tạm chỉ sống trong
      // phiên làm việc hiện tại của tab, không được sống dai qua F5.
      partialize: (state) => ({
        qrCode: state.qrCode,
        tableSession: state.tableSession,
        appliedPromo: state.appliedPromo,
      }),
    },
  ),
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
      // Chỉ lưu phiên. KHÔNG bật cờ khoá ở đây nữa: trạng thái khoá suy ra từ
      // `session.status`, nên bật cờ là thừa — và trước đây hàm này chỉ biết BẬT, không
      // bao giờ TẮT, nên phiên quay lại SERVING vẫn kẹt khoá.
      useCustomerSessionStore.getState().setSession({
        qrCode,

        tableSession: session,
      })
      return session
    }
  } catch {
    // Không có phiên đang mở hoặc bàn chưa có phiên active
  }
  return null
}
