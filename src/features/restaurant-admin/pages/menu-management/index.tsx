import { useState, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { MenuHeader } from "./components/MenuHeader"
import { MenuTabs } from "./components/MenuTabs"
import { MonTab } from "./components/MonTab"
import { DanhMucTab } from "./components/DanhMucTab"
import { MenuChiNhanhTab } from "./components/MenuChiNhanhTab"
import {
  MOCK_CATEGORIES,
  MOCK_DISHES,
  MOCK_BRANCH_DISHES,
} from "./mock-data"
import type { MenuTabType, DishItem, CategoryItem, BranchDishItem } from "./types"

/**
 * Thực đơn — Màn hình thống nhất thuộc Quản trị nhà hàng (restaurant-admin)
 * Tích hợp 3 phân hệ: Món, Danh mục, Menu chi nhánh
 * Nguồn:
 *   - QuanLy/Quản lý thực đơn.png
 *   - QuanLy/Quản lý danh mục.png
 *   - QuanLy/Menu chi nhánh.png
 */
export default function MenuManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Đọc tab khởi tạo từ query param ?tab= (hỗ trợ redirect từ category-management)
  const initialTab = useMemo<MenuTabType>(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam === "danh-muc" || tabParam === "categories") return "danh-muc"
    if (tabParam === "menu-chi-nhanh" || tabParam === "branch-menu") return "menu-chi-nhanh"
    return "mon"
  }, [searchParams])

  const [activeTab, setActiveTab] = useState<MenuTabType>(initialTab)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBranch, setSelectedBranch] = useState("Chi nhánh Quận 1")

  // Dữ liệu state
  const [dishes, setDishes] = useState<DishItem[]>(MOCK_DISHES)
  const [categories, setCategories] = useState<CategoryItem[]>(MOCK_CATEGORIES)
  const [branchDishes, setBranchDishes] = useState<BranchDishItem[]>(MOCK_BRANCH_DISHES)

  // Chuyển tab và cập nhật URL query param
  const handleTabChange = (tab: MenuTabType) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  // Thao tác với món ăn (Tab Món)
  const handleToggleDishStatus = (dishId: number, newStatus: boolean) => {
    setDishes((prev) =>
      prev.map((d) => (d.id === dishId ? { ...d, isAvailable: newStatus } : d))
    )
  }

  const handleAddDish = () => {
    console.log("Mở modal thêm món mới")
  }

  const handleEditDish = (dish: DishItem) => {
    console.log("Chỉnh sửa món:", dish.name)
  }

  const handleDeleteDish = (dish: DishItem) => {
    setDishes((prev) => prev.filter((d) => d.id !== dish.id))
  }

  // Thao tác với danh mục (Tab Danh mục)
  const handleToggleCategoryStatus = (categoryId: number, newStatus: boolean) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, isActive: newStatus } : c))
    )
  }

  const handleAddCategory = () => {
    console.log("Mở modal thêm danh mục mới")
  }

  const handleEditCategory = (category: CategoryItem) => {
    console.log("Chỉnh sửa danh mục:", category.name)
  }

  const handleDeleteCategory = (category: CategoryItem) => {
    setCategories((prev) => prev.filter((c) => c.id !== category.id))
  }

  // Thao tác với món chi nhánh (Tab Menu chi nhánh)
  const handleToggleBranchDishStatus = (id: number, status: boolean) => {
    setBranchDishes((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isAvailable: status } : it))
    )
  }

  const handleEditBranchDish = (dish: BranchDishItem) => {
    console.log("Chỉnh sửa cấu hình món tại chi nhánh:", dish.name)
  }

  return (
    <div className="flex flex-col min-h-full bg-surface-page p-6 lg:p-8 space-y-6">
      {/* 1. Header thay đổi linh hoạt theo từng tab */}
      <MenuHeader
        activeTab={activeTab}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddDish={handleAddDish}
        onAddCategory={handleAddCategory}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        totalDishes={42}
        totalCategories={categories.length}
      />

      {/* 2. Thanh điều hướng 3 Tabs */}
      <MenuTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* 3. Nội dung theo từng tab */}
      {activeTab === "mon" ? (
        <MonTab
          dishes={dishes}
          searchTerm={searchTerm}
          onToggleStatus={handleToggleDishStatus}
          onEditDish={handleEditDish}
          onDeleteDish={handleDeleteDish}
        />
      ) : activeTab === "danh-muc" ? (
        <DanhMucTab
          categories={categories}
          onToggleStatus={handleToggleCategoryStatus}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      ) : (
        <MenuChiNhanhTab
          branchDishes={branchDishes}
          selectedBranch={selectedBranch}
          onToggleStatus={handleToggleBranchDishStatus}
          onEditDish={handleEditBranchDish}
        />
      )}
    </div>
  )
}
