import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { useTableSession } from "@/api/table-sessions.api"

/** Nhịp hỏi lại backend — đủ nhanh để khách thấy đổi trạng thái gần như tức thì. */
const POLL_MS = 3000

/**
 * "Phiên đã khoá — không gọi thêm món được".
 *
 * NGUỒN SỰ THẬT là `TableSession.status === "WAITING_FOR_PAY"` lấy từ backend, hỏi lại
 * theo nhịp. Trước đây FE giữ một cờ `billRequested` lưu trong `localStorage`, chỉ được
 * reset ở 2 trang (Thanh toán thành công / Đánh giá) — Thu ngân thu tiền mặt rồi đóng bàn
 * thì máy khách không đi qua hai trang đó, cờ kẹt lại và **mọi bàn quét sau đều bị khoá**.
 *
 * `pendingBillSessionId` chỉ là lớp khoá TẠM sau khi API `request-payment` trả về thành
 * công, để không phải chờ vòng hỏi kế tiếp. Nó gắn theo đúng `sessionId` và không được
 * lưu xuống trình duyệt, nên không sống dai.
 */
export function useBillLocked(): boolean {
  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const pendingBillSessionId = useCustomerSessionStore((s) => s.pendingBillSessionId)

  const sessionId = tableSession?.id
  const { data: liveSession } = useTableSession(sessionId, { refetchInterval: POLL_MS })

  // Ưu tiên dữ liệu vừa hỏi được; chưa có thì tạm dùng bản trong store.
  const status = liveSession?.status ?? tableSession?.status
  if (status === "WAITING_FOR_PAY") return true

  return sessionId != null && pendingBillSessionId === sessionId
}
