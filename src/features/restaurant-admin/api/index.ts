/**
 * API cho Quản trị nhà hàng (toàn bộ chi nhánh của 1 nhà hàng).
 *
 * ⚠️ THIẾU API Ở BACKEND:
 * - Màn "Báo cáo" (3 tab theo ngày/giờ/so sánh chi nhánh): chưa có endpoint tổng hợp.
 */
export { useRestaurant, useUpdateRestaurant } from "@/api/restaurants.api"
export {
  useBranch, useBranchesByRestaurant, useCopyBranchConfig, useCreateBranch,
  useUpdateBranch, useUpdateBranchAdminConfig, useUpdateBranchManagerConfig,
} from "@/api/branches.api"
export { useChangeBranchStatus } from "./branches-status"
export { useAreasByBranch } from "@/api/areas.api"
export { useTablesByBranch, useCreateTable, useUpdateTable, useGenerateTableQrCode } from "@/api/tables.api"
export {
  useCategoriesByRestaurant, useCreateCategory, useDeleteCategory, useUpdateCategory,
} from "@/api/categories.api"
export {
  useChangeDishStatus, useCreateDish, useDish, useDishesByBranch, useDishesByRestaurant, useUpdateDish,
} from "@/api/dishes.api"
export { useDishOverridesByBranch } from "@/api/dish-overrides.api"
export { useBranchMenuOverview } from "@/api/branch-menu.api"
export { useCreateOptionGroup, useOptionGroupsByRestaurant, useUpdateOptionGroup } from "@/api/option-groups.api"
export { useCreateOptionItem, useDeleteOptionItem, useOptionItemsByGroup, useUpdateOptionItem } from "@/api/option-items.api"
export { useDishOptionGroups, useLinkDishToOptionGroup, useUnlinkDishFromOptionGroup } from "@/api/dish-option-groups.api"
export {
  useChangePromotionStatus, useCreatePromotion, usePromotionsByRestaurant, useUpdatePromotion,
} from "@/api/promotions.api"
export {
  useAccountsByRestaurant, useChangeAccountStatus, useCreateAccount, useDeleteAccount,
  useResetPassword, useUpdateAccount,
} from "@/api/accounts.api"
export { useCreateAssignment, useDeleteAssignment } from "@/api/assignments.api"
export { useCreateRole, useDeleteRole, useRolesByRestaurant, useUpdateRole } from "@/api/roles.api"
export {
  useAuditLogs, useAuditLogsByBranch, useAuditLogsByPerformedBy, useAuditLogsByRestaurant,
} from "@/api/audit-logs.api"
export { useUploadDishImage, useUploadRestaurantLogo } from "@/api/upload.api"
