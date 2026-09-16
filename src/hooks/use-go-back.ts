import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"

/**
 * Nút "Quay lại" an toàn — thay cho `navigate(-1)` trần.
 *
 * `navigate(-1)` chỉ đúng khi người dùng THỰC SỰ đi từ một trang khác trong ứng dụng tới đây.
 * Nhưng màn nào cũng có thể được mở TRỰC TIẾP: khách quét QR, nhân viên dán URL, mở tab mới,
 * bookmark, hoặc F5 ngay trên màn đó. Lúc đó lịch sử của ứng dụng rỗng: `-1` đưa người dùng RA
 * KHỎI ứng dụng (về trang trước của trình duyệt) hoặc không làm gì cả — nút "Quay lại" như hỏng.
 *
 * Cách nhận biết "có trang trước trong ứng dụng":
 *  - `history.state.idx` là số thứ tự entry mà react-router tự ghi vào history; `0` = entry đầu
 *    tiên, tức chưa có bước nào trước đó. Đây là mốc CHÍNH vì nó đúng cả khi màn hiện tại tới
 *    bằng `replace` — ví dụ khách quét QR rồi `/ban/:qrCode` tự `replace` sang Hoá đơn: lúc đó
 *    `location.key` đã khác `"default"` nhưng phía sau vẫn KHÔNG có trang nào của ứng dụng.
 *  - Không đọc được `idx` (router khác, history bị can thiệp) thì lùi về mốc `location.key`:
 *    react-router để `"default"` cho entry đầu tiên nó thấy.
 *
 * Không có trang trước thì đi tới `fallback` (đường dẫn TUYỆT ĐỐI) bằng `replace`, để bấm back
 * của trình duyệt không quay lại chính màn vừa rời.
 *
 * `fallback` do từng màn tự chọn (theo vai trò / theo `:qrCode` của bàn) vì chỉ màn đó biết
 * "phía trên" mình là gì; hook cố tình không đoán hộ. Luôn truyền đường dẫn tuyệt đối —
 * điều hướng tương đối của react-router tính theo cây ROUTE chứ không theo đoạn URL.
 */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate()
  const { key } = useLocation()

  return React.useCallback(() => {
    const idx = (window.history.state as { idx?: unknown } | null)?.idx
    const hasPreviousInApp = typeof idx === "number" ? idx > 0 : key !== "default"

    if (hasPreviousInApp) {
      navigate(-1)
      return
    }
    navigate(fallback, { replace: true })
  }, [key, navigate, fallback])
}
