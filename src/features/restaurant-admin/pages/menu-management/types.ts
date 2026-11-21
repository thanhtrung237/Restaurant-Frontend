/**
 * Các tab trong màn hình Thực đơn
 */
export type MenuTabType = "mon" | "danh-muc" | "menu-chi-nhanh" | "tuy-chon"

/**
 * Món ăn trong thực đơn gốc (Tab Món)
 */
export interface DishItem {
  id: number
  name: string
  description?: string
  categoryId?: number
  category: string
  price: number
  isAvailable: boolean
  image?: string
}

/**
 * Danh mục thực đơn (Tab Danh mục)
 */
export interface CategoryItem {
  id: number
  order: number
  name: string
  /** Đếm ở FE — CategoryResponse của BE không trả về. */
  dishCount: number
  /** Tổng số món kể cả món RIÊNG chi nhánh — dùng để chặn xoá (BE xoá kéo theo cả). */
  totalDishCount: number
  isActive: boolean
}

/**
 * Món ăn trong menu chi nhánh (Tab Menu chi nhánh)
 */
export interface BranchDishItem {
  id: number
  name: string
  category: string
  originalPrice: number | null
  branchPrice: number | null
  diffText: string
  isAvailable: boolean
  isCustom?: boolean
}

/**
 * Nhóm tùy chọn món (Tab Tùy chọn món)
 */
export interface OptionGroupItem {
  id: number
  name: string
  selectionType: "REQUIRED" | "OPTIONAL"
  minSelect: number
  maxSelect: number
  itemCount: number
  dishCount: number
  dishNames: string[]
}

