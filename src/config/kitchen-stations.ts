/**
 * Khu chế biến của món — dùng để TÁCH PHIẾU BẾP (FR-SRV-07).
 *
 * `code` là giá trị ghi vào `Dish.kitchenStationType`. Backend
 * (`KitchenTicketServiceImpl.printKitchenTickets`) gom phiếu theo ĐÚNG chuỗi này, thiếu thì
 * rơi vào nhóm `"DEFAULT"`:
 *
 *     groupingBy(d -> d.getDish().getKitchenStationType() != null
 *                     ? d.getDish().getKitchenStationType() : "DEFAULT")
 *
 * ⚠️ BE KHÔNG có enum và KHÔNG validate — cột là `VARCHAR(50)` tự do. Gõ sai một ký tự là
 * sinh thêm một khu mới và phiếu bếp bị tách nhầm. Vì vậy ô chọn khu phải là DROPDOWN khoá
 * theo danh sách dưới đây. Xem `docs/be-issues.md`.
 *
 * Danh sách bám ĐÚNG dữ liệu đang có trong hệ thống (chỉ `KITCHEN` và `BAR`). FR-MNU-02 có
 * nhắc thêm "bếp lạnh" nhưng chưa có mã chính thức, và chính đặc tả cho phép *"bản đầu có
 * thể chỉ dùng một khu mặc định"* — thêm khu mới cần BA cấp mã, xem `docs/todo.md`.
 */
export interface KitchenStationOption {
  /** Mã lưu xuống `Dish.kitchenStationType`. */
  code: string
  /** Tên hiển thị cho người dùng. */
  name: string
}

export const KITCHEN_STATION_OPTIONS: readonly KitchenStationOption[] = [
  { code: "KITCHEN", name: "Bếp" },
  { code: "BAR", name: "Pha chế" },
]

/**
 * Đổi mã khu chế biến sang tên hiển thị.
 *
 * Giá trị ngoài danh sách (dữ liệu cũ, hoặc ghi thẳng qua API) trả về nguyên giá trị thay
 * vì rỗng — màn quản lý món không được vỡ chỉ vì dữ liệu chưa chuẩn hoá.
 */
export function getKitchenStationLabel(code: string | null | undefined): string {
  if (!code) return ""
  const normalized = code.trim().toUpperCase()
  return (
    KITCHEN_STATION_OPTIONS.find((s) => s.code === normalized)?.name ?? code
  )
}
