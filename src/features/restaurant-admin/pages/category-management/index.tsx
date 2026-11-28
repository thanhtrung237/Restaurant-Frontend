import { Navigate } from "react-router-dom"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"

/**
 * Quản lý danh mục
 * Đã được hợp nhất vào màn hình Thực đơn thống nhất (tab danh mục).
 * Tự động chuyển hướng sang /restaurant-admin/menu?tab=danh-muc
 */
export default function CategoryManagementPage() {
  return <Navigate to={`${RESTAURANT_ADMIN_PATHS.MENU}?tab=danh-muc`} replace />
}
