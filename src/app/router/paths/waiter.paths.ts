const WAITER_BASE = "/phuc-vu"

/**
 * URI cho Phục vụ (mục 4.1: phạm vi Chi nhánh).
 * Nhóm "vận hành sàn/bếp" (TABLE_MAP..TRANSFER_MERGE_TABLE) dùng chung component với
 * QL chi nhánh và Quản trị NH ở @/features/shared/floor-ops (mục 4.2 — cùng có quyền X).
 * Phục vụ KHÔNG có quyền báo cáo / quản lý nhân viên / menu / khuyến mãi / chi nhánh /
 * cấu hình (mục 4.2, 4.3) — đã bỏ các path đó khỏi file này.
 */
export const WAITER_PATHS = {
  TABLE_MAP: `${WAITER_BASE}/so-do-ban`, // Sơ đồ bàn — trang chủ của Phục vụ
  ORDER_AND_PREP: `${WAITER_BASE}/order-che-bien`, // Gọi món & Chế biến
  // ORDER_CONFIRM removed: kitchen staff now confirms items directly in KDS (PENDING → PREPARING)
  ORDER_DETAIL: `${WAITER_BASE}/order/:orderId`, // Order chi tiết
  ADD_DISH: `${WAITER_BASE}/order/:orderId/them-mon`, // Thêm món vào bàn (orderId ở đây thực chất là tableSessionId)
  KITCHEN_DISPLAY: `${WAITER_BASE}/bep`, // Bếp (KDS) — phiếu bếp theo trạng thái
  TRANSFER_MERGE_TABLE: `${WAITER_BASE}/chuyen-gop-ban`, // Chuyển / Gộp bàn (cần duyệt — quyền A)
} as const
