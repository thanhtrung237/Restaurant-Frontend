/**
 * API cho Quản trị nền tảng.
 *
 * ⚠️ THIẾU API Ở BACKEND — 2 trong 4 màn của feature này không có gì để nối:
 * - "Cấu hình nền tảng": không có controller nào.
 * - "Gói / Thanh toán" (subscription-billing): không có entity/controller `Subscription`
 *   hay `Billing`. Module này backend chưa làm.
 * Cần làm việc với đội BE trước khi dựng UI thật cho 2 màn đó.
 *
 * 2 màn còn lại nối được ngay: danh sách/chi tiết nhà hàng và nhật ký hệ thống.
 */
export {
  useChangeRestaurantStatus, useRestaurant, useRestaurantsPage, useUpdateRestaurant,
} from "@/api/restaurants.api"
export { useBranchesByRestaurant } from "@/api/branches.api"
export { useAuditLogs } from "@/api/audit-logs.api"
