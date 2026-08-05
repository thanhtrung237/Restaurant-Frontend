/**
 * Base cho các model FE.
 *
 * QUAN TRỌNG (Phase 3): FE **không bao giờ nhận Entity JPA** từ backend, mà luôn nhận
 * `*Response.java` (DTO). Vì vậy các model dưới đây được viết để mirror **Response DTO**,
 * không mirror Entity. Hệ quả:
 *
 * 1. Response DTO **không trả** các field audit của `BaseEntity.java`
 *    (`createBy`, `modifiedBy`, `deletedAt`, `deletedBy`, `isDeleted`) → FE đã bỏ hẳn.
 * 2. Response DTO **không có object lồng** (`restaurant`, `branch`, `dish`, ...).
 *    Backend làm phẳng thành cặp `xxxId` + `xxxName` → FE cũng dùng dạng phẳng.
 *    Nếu cần object đầy đủ thì phải gọi thêm endpoint riêng.
 * 3. Field thời gian được serialize thành chuỗi ISO (`LocalDateTime` / `LocalDate` /
 *    `LocalTime`) → FE khai báo `string`.
 * 4. `BigDecimal` được serialize thành number JSON → FE khai báo `number`.
 *
 * LƯU Ý về tên field thời gian — backend **không nhất quán**:
 * - Phần lớn response dùng `modifiedAt` (Dish, Order, OrderDetail, TableSession, Invoice,
 *   DiningTable, Category, Area, Promotion, DishOverride, ManualDiscount, OptionGroup,
 *   OptionItem, BranchDishStock).
 * - Nhưng `AccountResponse`, `BranchResponse`, `RestaurantResponse`, `RoleResponse`,
 *   `AssignmentResponse` lại dùng `updatedAt`.
 * Vì vậy KHÔNG gộp chung vào một base "có sẵn modifiedAt" — mỗi model tự khai báo đúng
 * tên field mà response của nó thực sự trả về.
 */

/** Mọi Response DTO đều có `id` (trừ các DTO dạng "view" như BranchMenuItem). */
export interface BaseResponse {
  id: number
}
