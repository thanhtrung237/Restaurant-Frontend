/**
 * API cho Quản lý chi nhánh (scope hẹp: chỉ chi nhánh mình).
 *
 * ⚠️ THIẾU API Ở BACKEND — màn "Báo cáo chi nhánh" và "Doanh thu theo giờ":
 * không có `ReportController`/`RevenueController` nào ở BE. Hai lựa chọn:
 *   (a) đề nghị BE bổ sung `GET /reports/...` trả số liệu đã tổng hợp (nên làm), hoặc
 *   (b) FE tự cộng dồn từ `useInvoicesByBranch()` + `useOrdersByBranch()` — chỉ nên dùng
 *       tạm cho demo vì phải kéo toàn bộ hoá đơn thô về máy khách.
 * Đừng viết API client đoán trước đường dẫn `/reports/...` khi chưa chốt với BE.
 */
export { useBranch, useUpdateBranchManagerConfig } from "@/api/branches.api"
export { useAreasByBranch, useCreateArea, useUpdateArea } from "@/api/areas.api"
export { useTablesByBranch, useCreateTable, useUpdateTable, useGenerateTableQrCode } from "@/api/tables.api"
export { useBranchMenuOverview } from "@/api/branch-menu.api"
export { useDishesByBranch } from "@/api/dishes.api"
export { useCategoriesByRestaurant } from "@/api/categories.api"
export {
  useCreateDishOverride, useDeleteDishOverride, useDishOverridesByBranch, useUpdateDishOverride,
} from "@/api/dish-overrides.api"
export {
  useOutOfStockDishes as useOutOfStock,
  useRestoreAllBranchStock as useRestoreAllStock,
  useToggleBranchDishStock as useToggleDishStock,
} from "@/api/branch-dish-stocks.api"
export {
  useAssignPromotionToBranch, useCreatePromotion, usePromotionsByBranch, usePromotionsByRestaurant,
} from "@/api/promotions.api"
export { useAccountsByRestaurant } from "@/api/accounts.api"
export { useAssignmentsByBranch } from "@/api/assignments.api"
export { useManualDiscountsByInvoice } from "@/api/manual-discounts.api"
export { useInvoicesByBranch } from "@/api/invoices.api"
export { useAuditLogsByRestaurant } from "@/api/audit-logs.api"