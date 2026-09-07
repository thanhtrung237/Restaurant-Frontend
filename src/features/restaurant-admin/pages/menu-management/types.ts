/**
 * Các tab trong màn hình Thực đơn
 */
export type MenuTabType = "mon" | "danh-muc" | "menu-chi-nhanh"

/**
 * Món ăn trong thực đơn gốc (Tab Món)
 */
export interface DishItem {
  id: number
  name: string
  description?: string
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
  description: string
  dishCount: number
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
