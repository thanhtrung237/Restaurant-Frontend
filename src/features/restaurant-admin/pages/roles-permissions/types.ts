/**
 * Kiểu dữ liệu cho ma trận phân quyền — CHỈ ĐỌC.
 *
 * Ma trận dựng từ đặc tả (Bảng 4.2 + 4.3), không lấy từ `config/permissions.ts` và cũng
 * không lấy từ API: backend không có bảng quyền, `Role` chỉ có `name` / `code` / `scope`.
 * Xem `permission-matrix.ts` để biết nguồn từng ô.
 */

/**
 * Mức quyền theo chú giải Bảng 4.2 của đặc tả:
 *
 * > X = được phép · A = được phép nhưng cần duyệt · R = chỉ đọc · trống = không được phép
 *
 * `never` không thuộc chú giải đó — nó dành cho đúng một ô ghi chữ "KHÔNG BAO GIỜ" ở
 * Bảng 4.3 (Quản trị nền tảng xem dữ liệu kinh doanh của khách).
 */
export type PermissionLevel = "allow" | "approval" | "readonly" | "none" | "never"

export interface PermissionMatrixColumn {
  /** Khoá cột — trùng với khoá trong `PermissionMatrixRow.cells`. */
  key: string
  label: string
}

export interface PermissionMatrixRow {
  id: number
  feature: string
  /** Chú thích nhỏ dưới tên chức năng (mã FR, điều kiện...). */
  note?: string
  /**
   * Mức quyền theo từng cột. **Thiếu khoá = ô trống trong đặc tả = không được phép**,
   * giữ đúng cách đọc bảng gốc thay vì phải điền `"none"` cho hàng chục ô.
   */
  cells: Partial<Record<string, PermissionLevel>>
  /** Ghi chú riêng của một ô, ví dụ "A nếu không tính tiền". */
  cellNotes?: Partial<Record<string, string>>
}

export interface PermissionMatrixSection {
  id: string
  title: string
  columns: PermissionMatrixColumn[]
  rows: PermissionMatrixRow[]
}
