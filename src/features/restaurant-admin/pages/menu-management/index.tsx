import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus, MapPin } from "lucide-react"
import { SearchInput } from "@/components/common/SearchInput"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { FAB } from "@/components/common/FAB"
import { FAB_POSITION_CLASS } from "@/components/layout/StickyActionBar"
import { PageHeader } from "@/components/layout/PageHeader"
import { MenuHeaderActions } from "./components/MenuHeader"
import { MenuTabs } from "./components/MenuTabs"
import { MonTab } from "./components/MonTab"
import { DanhMucTab } from "./components/DanhMucTab"
import { OptionGroupTab } from "./components/OptionGroupTab"
import { BranchMenuManagementTab } from "@/features/shared/branch-menu"
import { useAuthStore } from "@/stores/auth.store"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/http"
import {
  useCategoriesByRestaurant,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useChangeCategoryStatus,
} from "@/api/categories.api"
import {
  getDish,
  useDishesByRestaurant,
  useCreateDish,
  useUpdateDish,
  useChangeDishStatus,
  useCountAffectedBranches,
} from "@/api/dishes.api"
import {
  useOptionGroupsByRestaurant,
  useCreateOptionGroup,
  useUpdateOptionGroup,
  useDeleteOptionGroup,
} from "@/api/option-groups.api"
import {
  useCreateOptionItem,
  useUpdateOptionItem,
  useDeleteOptionItem,
} from "@/api/option-items.api"
import {
  getDishOptionGroupsByDish,
  useLinkDishToOptionGroup,
  useUnlinkDishFromOptionGroup,
} from "@/api/dish-option-groups.api"
import { useBranchesByRestaurant } from "@/api/branches.api"
import { CategoryModal, type CategorySubmitData } from "./components/CategoryModal"
import { DishModal, type DishSubmitData } from "./components/DishModal"
import { OptionGroupModal, type OptionGroupSubmitData } from "./components/OptionGroupModal"
import {
  DeleteCategoryDialog,
  StopSellingDialog,
  DeleteOptionGroupDialog,
} from "./components/MenuConfirmDialogs"
import type { Category, Dish, OptionGroup } from "@/types/models"
import type { MenuTabType, DishItem, CategoryItem } from "./types"

/**
 * Thực đơn — Màn hình thống nhất thuộc Quản trị nhà hàng (restaurant-admin)
 * Tích hợp 3 phân hệ: Món, Danh mục, Menu chi nhánh
 * Nguồn:
 *   - QuanLy/Quản lý thực đơn.png
 *   - QuanLy/Quản lý danh mục.png
 *   - QuanLy/Menu chi nhánh.png
 */
/** Lấy một trang lớn thay vì phân trang — xem chú thích ở chỗ gọi. */
const DISH_PAGE_SIZE = 500

export default function MenuManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Đọc tab khởi tạo từ query param ?tab= (hỗ trợ redirect từ category-management)
  const initialTab = useMemo<MenuTabType>(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam === "danh-muc" || tabParam === "categories") return "danh-muc"
    if (tabParam === "menu-chi-nhanh" || tabParam === "branch-menu") return "menu-chi-nhanh"
    if (tabParam === "tuy-chon" || tabParam === "options") return "tuy-chon"
    return "mon"
  }, [searchParams])

  const [activeTab, setActiveTab] = useState<MenuTabType>(initialTab)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)

  const { toast } = useToast()
  const restaurantId = useAuthStore((s) => s.account?.restaurantId)

  // ---- Dữ liệu thật ----
  const categoriesQuery = useCategoriesByRestaurant(restaurantId)
  const optionGroupsQuery = useOptionGroupsByRestaurant(restaurantId)
  // Lấy danh sách chi nhánh để chọn
  const { data: branches = [] } = useBranchesByRestaurant(restaurantId)
  
  // Chọn chi nhánh đầu tiên mặc định
  useEffect(() => {
    if (branches.length > 0 && selectedBranchId === null) {
      setSelectedBranchId(branches[0].id)
    }
  }, [branches, selectedBranchId])
  // Lấy một trang lớn thay vì phân trang: màn này cần đếm & lọc trên toàn bộ danh sách.
  // Nếu vượt DISH_PAGE_SIZE thì cảnh báo trên UI (xem docs/todo.md).
  const dishesQuery = useDishesByRestaurant(restaurantId, { page: 0, size: DISH_PAGE_SIZE })

  const apiCategories: Category[] = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  )
  const optionGroups: OptionGroup[] = useMemo(
    () => optionGroupsQuery.data ?? [],
    [optionGroupsQuery.data],
  )
  const allApiDishes: Dish[] = useMemo(
    () => dishesQuery.data?.content ?? [],
    [dishesQuery.data],
  )
  const totalDishElements = dishesQuery.data?.totalElements ?? 0
  const isTruncated = totalDishElements > allApiDishes.length

  /** Tab "Món" của Menu NHÀ HÀNG chỉ hiện món gốc — món riêng chi nhánh thuộc FR-MNU-04. */
  const restaurantDishes = useMemo(
    () => allApiDishes.filter((d) => d.branchId == null),
    [allApiDishes],
  )

  // ---- Mutations ----
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const changeCategoryStatus = useChangeCategoryStatus()
  const createDish = useCreateDish()
  const updateDish = useUpdateDish()
  const changeDishStatus = useChangeDishStatus()
  const createOptionGroup = useCreateOptionGroup()
  const updateOptionGroup = useUpdateOptionGroup()
  const deleteOptionGroup = useDeleteOptionGroup()
  const createOptionItem = useCreateOptionItem()
  const updateOptionItem = useUpdateOptionItem()
  const deleteOptionItem = useDeleteOptionItem()
  const linkDishToOptionGroup = useLinkDishToOptionGroup()
  const unlinkDishFromOptionGroup = useUnlinkDishFromOptionGroup()

  // ---- Modal state ----
  const [categoryModal, setCategoryModal] = useState<{ open: boolean; data: Category | null }>(
    { open: false, data: null },
  )
  const [dishModal, setDishModal] = useState<{ open: boolean; data: Dish | null }>({
    open: false,
    data: null,
  })
  const [optionGroupModal, setOptionGroupModal] = useState<{ open: boolean; data: OptionGroup | null }>({
    open: false,
    data: null,
  })
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [dishToStop, setDishToStop] = useState<Dish | null>(null)
  const [optionGroupToDelete, setOptionGroupToDelete] = useState<OptionGroup | null>(null)

  const affectedBranchesQuery = useCountAffectedBranches(dishToStop?.id, Boolean(dishToStop))

  // ---- Map sang kiểu hiển thị của các tab ----
  const dishes: DishItem[] = useMemo(
    () =>
      restaurantDishes.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        category: d.categoryName ?? "",
        price: Number(d.basePrice ?? 0),
        isAvailable: d.status === "ACTIVE",
        image: d.imageUrl,
      })),
    [restaurantDishes],
  )

  const categories: CategoryItem[] = useMemo(
    () =>
      apiCategories.map((c, index) => ({
        id: c.id,
        order: c.displayOrder ?? index + 1,
        name: c.name,
        // Món gốc thuộc danh mục — dùng để hiển thị
        dishCount: restaurantDishes.filter((d) => d.categoryId === c.id).length,
        // TỔNG món kể cả món riêng chi nhánh — dùng để chặn xoá, vì BE xoá kéo theo cả
        totalDishCount: allApiDishes.filter((d) => d.categoryId === c.id).length,
        isActive: c.status === "ACTIVE",
      })),
    [apiCategories, restaurantDishes, allApiDishes],
  )

  const categoryNames = useMemo(() => apiCategories.map((c) => c.name), [apiCategories])

  /**
   * Thứ tự gợi ý cho danh mục mới = `max(displayOrder) + 1`, để danh mục vừa tạo nằm CUỐI
   * danh sách. Bỏ trống thì BE lưu `null` và danh mục nhảy lên đầu — xem `docs/todo.md`.
   */
  const nextDisplayOrder = useMemo(
    () => apiCategories.reduce((max, c) => Math.max(max, c.displayOrder ?? 0), 0) + 1,
    [apiCategories],
  )
  const activeDishCount = useMemo(
    () => restaurantDishes.filter((d) => d.status === "ACTIVE").length,
    [restaurantDishes],
  )

  // Chuyển tab và cập nhật URL query param
  const handleTabChange = (tab: MenuTabType) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  function notifyError(title: string, error: unknown) {
    toast({ title, description: getErrorMessage(error), variant: "danger" })
  }

  // ---------------- MÓN (cấp nhà hàng, FR-MNU-02) ----------------

  /**
   * Bật/tắt công tắc trạng thái món.
   * NGỪNG BÁN phải xác nhận trước (FR-MNU-04 — món biến mất ở MỌI chi nhánh);
   * BÁN LẠI thì không cần.
   */
  async function handleToggleDishStatus(dishId: number, newStatus: boolean) {
    const dish = restaurantDishes.find((d) => d.id === dishId)
    if (!dish) return

    if (!newStatus) {
      setDishToStop(dish)
      return
    }
    try {
      await changeDishStatus.mutateAsync({ id: dishId, status: "ACTIVE" })
      toast({ title: `Đã bán lại "${dish.name}"`, variant: "success" })
    } catch (error) {
      notifyError("Không đổi được trạng thái món", error)
    }
  }

  async function handleConfirmStopSelling() {
    if (!dishToStop) return
    try {
      await changeDishStatus.mutateAsync({ id: dishToStop.id, status: "INACTIVE" })
      toast({ title: `Đã ngừng bán "${dishToStop.name}"`, variant: "success" })
      setDishToStop(null)
    } catch (error) {
      notifyError("Không ngừng bán được món", error)
    }
  }

  const handleAddDish = () => setDishModal({ open: true, data: null })

  const handleEditDish = (dish: DishItem) => {
    const found = restaurantDishes.find((d) => d.id === dish.id) ?? null
    setDishModal({ open: true, data: found })
  }

  // Handler for editing branch-specific dish (GĐ3)
  const handleEditBranchDish = async (item: { dishId: number; dishName: string }) => {
    if (!selectedBranchId) return
    
    try {
      // Fetch full dish details
      const dishDetails = await getDish(item.dishId)
      setDishModal({ open: true, data: dishDetails })
    } catch (error) {
      toast({
        title: "Không tải được thông tin món",
        description: getErrorMessage(error),
        variant: "danger",
      })
    }
  }

  async function handleSaveDish(data: DishSubmitData) {
    if (!restaurantId) return
    const editing = dishModal.data
    const { optionGroupIds, ...dishData } = data
    try {
      if (editing) {
        await updateDish.mutateAsync({ id: editing.id, body: dishData })

        // Đồng bộ các nhóm tùy chọn (Requirement 5)
        if (optionGroupIds !== undefined) {
          const currentLinks = await getDishOptionGroupsByDish(editing.id)
          const currentGroupIds = currentLinks.map((l) => l.optionGroupId)

          const toAdd = optionGroupIds.filter((gid) => !currentGroupIds.includes(gid))
          const toRemove = currentLinks.filter((l) => !optionGroupIds.includes(l.optionGroupId))

          await Promise.all([
            ...toAdd.map((groupId) =>
              linkDishToOptionGroup.mutateAsync({ dishId: editing.id, optionGroupId: groupId })
            ),
            ...toRemove.map((l) => unlinkDishFromOptionGroup.mutateAsync(l.id)),
          ])
        }

        toast({ title: "Đã lưu thay đổi món", variant: "success" })
      } else {
        const created = await createDish.mutateAsync({ restaurantId, ...dishData })
        
        // Liên kết các nhóm tùy chọn cho món mới (Requirement 5)
        if (optionGroupIds && optionGroupIds.length > 0 && created?.id) {
          await Promise.all(
            optionGroupIds.map((groupId) =>
              linkDishToOptionGroup.mutateAsync({ dishId: created.id, optionGroupId: groupId })
            )
          )
        }

        toast({ title: `Đã thêm món "${data.name}"`, variant: "success" })
      }
      setDishModal({ open: false, data: null })
    } catch (error) {
      // KHÔNG đóng modal: giữ nguyên dữ liệu người dùng đã nhập để sửa và thử lại
      notifyError(editing ? "Không lưu được món" : "Không thêm được món", error)
    }
  }

  // ---------------- TÙY CHỌN MÓN (OPTION GROUPS) ----------------

  const handleAddOptionGroup = () => setOptionGroupModal({ open: true, data: null })

  const handleEditOptionGroup = (group: OptionGroup) => {
    setOptionGroupModal({ open: true, data: group })
  }

  const handleDeleteOptionGroup = (group: OptionGroup) => {
    setOptionGroupToDelete(group)
  }

  async function handleSaveOptionGroup(data: OptionGroupSubmitData) {
    if (!restaurantId) return
    const editing = optionGroupModal.data
    try {
      if (editing) {
        // 1. Cập nhật thông tin nhóm
        await updateOptionGroup.mutateAsync({
          id: editing.id,
          body: {
            name: data.name,
            selectionType: data.selectionType,
            minSelect: data.minSelect,
            maxSelect: data.maxSelect,
          },
        })

        // 2. Đồng bộ các lựa chọn (Option Items)
        const toDelete = data.items.filter((i) => i.isDeleted && i.id)
        const toCreate = data.items.filter((i) => !i.id && !i.isDeleted)
        const toUpdate = data.items.filter((i) => i.id && !i.isDeleted)

        await Promise.all([
          ...toDelete.map((i) => deleteOptionItem.mutateAsync(i.id!)),
          ...toCreate.map((i) =>
            createOptionItem.mutateAsync({
              optionGroupId: editing.id,
              name: i.name,
              extraPrice: i.extraPrice,
            })
          ),
          ...toUpdate.map((i) =>
            updateOptionItem.mutateAsync({
              id: i.id!,
              body: {
                name: i.name,
                extraPrice: i.extraPrice,
              },
            })
          ),
        ])

        toast({ title: "Đã lưu thay đổi nhóm tùy chọn", variant: "success" })
      } else {
        // 1. Tạo nhóm tùy chọn mới
        const created = await createOptionGroup.mutateAsync({
          restaurantId,
          name: data.name,
          selectionType: data.selectionType,
          minSelect: data.minSelect,
          maxSelect: data.maxSelect,
        })

        // 2. Tạo các lựa chọn trong nhóm
        const activeItems = data.items.filter((i) => !i.isDeleted)
        if (activeItems.length > 0 && created?.id) {
          await Promise.all(
            activeItems.map((item) =>
              createOptionItem.mutateAsync({
                optionGroupId: created.id,
                name: item.name,
                extraPrice: item.extraPrice,
              })
            )
          )
        }

        toast({ title: `Đã tạo nhóm tùy chọn "${data.name}"`, variant: "success" })
      }
      setOptionGroupModal({ open: false, data: null })
    } catch (error) {
      notifyError(
        editing ? "Không lưu được nhóm tùy chọn" : "Không tạo được nhóm tùy chọn",
        error
      )
    }
  }

  async function handleConfirmDeleteOptionGroup() {
    if (!optionGroupToDelete) return
    try {
      await deleteOptionGroup.mutateAsync(optionGroupToDelete.id)
      toast({
        title: `Đã xóa nhóm tùy chọn "${optionGroupToDelete.name}"`,
        variant: "success",
      })
      setOptionGroupToDelete(null)
    } catch (error) {
      notifyError("Không xóa được nhóm tùy chọn", error)
    }
  }

  // ---------------- DANH MỤC (FR-MNU-01) ----------------

  async function handleToggleCategoryStatus(categoryId: number, newStatus: boolean) {
    const category = apiCategories.find((c) => c.id === categoryId)
    try {
      await changeCategoryStatus.mutateAsync({
        id: categoryId,
        status: newStatus ? "ACTIVE" : "INACTIVE",
      })
      toast({
        title: newStatus
          ? `Đã hiện danh mục "${category?.name ?? ""}"`
          : `Đã ẩn danh mục "${category?.name ?? ""}"`,
        variant: "success",
      })
    } catch (error) {
      notifyError("Không đổi được trạng thái danh mục", error)
    }
  }

  const handleAddCategory = () => setCategoryModal({ open: true, data: null })

  const handleEditCategory = (category: CategoryItem) => {
    const found = apiCategories.find((c) => c.id === category.id) ?? null
    setCategoryModal({ open: true, data: found })
  }

  async function handleSaveCategory(data: CategorySubmitData) {
    if (!restaurantId) return
    const editing = categoryModal.data
    try {
      if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, body: data })
        toast({ title: "Đã lưu thay đổi danh mục", variant: "success" })
      } else {
        await createCategory.mutateAsync({ restaurantId, ...data })
        toast({ title: `Đã thêm danh mục "${data.name}"`, variant: "success" })
      }
      setCategoryModal({ open: false, data: null })
    } catch (error) {
      notifyError(editing ? "Không lưu được danh mục" : "Không thêm được danh mục", error)
    }
  }

  /** Nút xoá ở bảng đã khoá khi danh mục còn món, nên tới đây chắc chắn là danh mục rỗng. */
  const handleDeleteCategory = (category: CategoryItem) => {
    const found = apiCategories.find((c) => c.id === category.id) ?? null
    setCategoryToDelete(found)
  }

  async function handleConfirmDeleteCategory() {
    if (!categoryToDelete) return
    try {
      await deleteCategory.mutateAsync(categoryToDelete.id)
      toast({ title: `Đã xoá danh mục "${categoryToDelete.name}"`, variant: "success" })
      setCategoryToDelete(null)
    } catch (error) {
      notifyError("Không xoá được danh mục", error)
    }
  }

  // --- Header mobile: đổi theo tab, khớp Figma "Menu chi nhánh · Mobile (375)" ---
  const headerMeta = useMemo(() => {
    if (activeTab === "danh-muc") {
      return {
        title: "Danh mục",
        subtitle: `${categories.length} danh mục · dùng chung mọi chi nhánh`,
      }
    }
    if (activeTab === "tuy-chon") {
      return {
        title: "Tùy chọn món",
        subtitle: `${optionGroups.length} nhóm tùy chọn · dùng chung cho các món`,
      }
    }
    if (activeTab === "menu-chi-nhanh") {
      const selectedBranch = branches.find(b => b.id === selectedBranchId)
      return {
        title: "Menu chi nhánh",
        subtitle: selectedBranch ? selectedBranch.name : "Chọn chi nhánh",
      }
    }
    return {
      title: "Thực đơn",
      // Số liệu tính từ API, không còn hard-code
      subtitle: dishesQuery.isLoading
        ? "Đang tải..."
        : `${dishes.length} món · ${categories.length} danh mục · ${activeDishCount} đang bán`,
    }
  }, [
    activeTab,
    categories.length,
    optionGroups.length,
    branches,
    selectedBranchId,
    dishes.length,
    activeDishCount,
    dishesQuery.isLoading,
  ])

  return (
    <div className="flex min-h-full flex-col bg-surface-page">
      <PageHeader
        title={headerMeta.title}
        subtitle={headerMeta.subtitle}
        actions={
          <MenuHeaderActions
            activeTab={activeTab}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onAddDish={handleAddDish}
            onAddCategory={handleAddCategory}
            onAddOptionGroup={handleAddOptionGroup}
            branches={branches}
            selectedBranchId={selectedBranchId}
            onBranchChange={setSelectedBranchId}
          />
        }
        tabs={<MenuTabs activeTab={activeTab} onTabChange={handleTabChange} />}
      />

      <div className="flex flex-col gap-6 p-6 lg:p-8">
        {/* <md: thanh tab vẫn cần vì PageHeader ẩn hoàn toàn ở kích thước này */}
        <div className="md:hidden">
          <MenuTabs activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

      {/* 2b. <md: công cụ của header chuyển xuống đây (Figma mobile đặt dropdown chi
          nhánh full-width ngay dưới tiêu đề). Không bỏ vì cả hai đều bắt buộc:
          tìm món để thao tác nhanh, chọn chi nhánh là phạm vi dữ liệu (BR-18). */}
      {activeTab === "mon" ? (
        <div className="md:hidden">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm("")}
            placeholder="Tìm món..."
            variant="pill"
            size="default"
          />
        </div>
      ) : activeTab === "tuy-chon" ? (
        <div className="md:hidden">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm("")}
            placeholder="Tìm nhóm tùy chọn..."
            variant="pill"
            size="default"
          />
        </div>
      ) : activeTab === "menu-chi-nhanh" ? (
        <div className="md:hidden">
          <Select 
            value={selectedBranchId?.toString() ?? ""} 
            onValueChange={(val) => setSelectedBranchId(Number(val))}
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-border-default bg-surface-card font-medium text-text-primary">
              <div className="flex items-center gap-2 truncate">
                <MapPin className="size-4 shrink-0 text-text-tertiary" />
                <SelectValue placeholder="Chọn chi nhánh" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id.toString()} className="cursor-pointer">
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {/* 3. Nội dung theo từng tab */}
      {activeTab === "mon" ? (
        <MonTab
          dishes={dishes}
          searchTerm={searchTerm}
          categoryNames={categoryNames}
          onToggleStatus={handleToggleDishStatus}
          onEditDish={handleEditDish}
        />
      ) : activeTab === "danh-muc" ? (
        <DanhMucTab
          categories={categories}
          onToggleStatus={handleToggleCategoryStatus}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      ) : activeTab === "tuy-chon" ? (
        <OptionGroupTab
          groups={optionGroups}
          searchTerm={searchTerm}
          onEditGroup={handleEditOptionGroup}
          onDeleteGroup={handleDeleteOptionGroup}
          onAddGroup={handleAddOptionGroup}
          isLoading={optionGroupsQuery.isLoading}
        />
      ) : selectedBranchId ? (
        <BranchMenuManagementTab 
          branchId={selectedBranchId} 
          editable={true}
          onEditBranchDish={handleEditBranchDish}
        />
      ) : (
        <div className="rounded-card border border-border-default bg-surface-card py-12 text-center">
          <p className="text-sm text-text-tertiary">Chọn chi nhánh để xem menu</p>
        </div>
      )}

      </div>

      {isTruncated ? (
        <p className="rounded-lg bg-status-warning-subtle px-3.5 py-2.5 text-xs font-medium text-status-warning">
          Đang hiển thị {allApiDishes.length}/{totalDishElements} món. Danh sách vượt quá
          giới hạn tải một lần — cần bổ sung phân trang.
        </p>
      ) : null}

      <CategoryModal
        isOpen={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, data: null })}
        onSave={handleSaveCategory}
        initialData={categoryModal.data}
        nextDisplayOrder={nextDisplayOrder}
        isSaving={createCategory.isPending || updateCategory.isPending}
      />

      <DishModal
        isOpen={dishModal.open}
        onClose={() => setDishModal({ open: false, data: null })}
        onSave={handleSaveDish}
        categories={apiCategories}
        initialData={dishModal.data}
        isSaving={createDish.isPending || updateDish.isPending}
        currentBranchId={selectedBranchId ?? undefined}
        allowScopeSelection={true}
      />

      <OptionGroupModal
        isOpen={optionGroupModal.open}
        onClose={() => setOptionGroupModal({ open: false, data: null })}
        onSave={handleSaveOptionGroup}
        initialData={optionGroupModal.data}
        isSaving={createOptionGroup.isPending || updateOptionGroup.isPending}
      />

      <DeleteCategoryDialog
        open={Boolean(categoryToDelete)}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
        category={categoryToDelete}
        onConfirm={handleConfirmDeleteCategory}
        isDeleting={deleteCategory.isPending}
      />

      <DeleteOptionGroupDialog
        open={Boolean(optionGroupToDelete)}
        onOpenChange={(open) => !open && setOptionGroupToDelete(null)}
        optionGroup={optionGroupToDelete}
        onConfirm={handleConfirmDeleteOptionGroup}
        isDeleting={deleteOptionGroup.isPending}
      />

      <StopSellingDialog
        open={Boolean(dishToStop)}
        onOpenChange={(open) => !open && setDishToStop(null)}
        dish={dishToStop}
        affectedBranches={affectedBranchesQuery.data}
        isLoadingCount={affectedBranchesQuery.isLoading}
        onConfirm={handleConfirmStopSelling}
        isSaving={changeDishStatus.isPending}
      />

      {/* 4. <md: nút tạo mới của tab hiện tại thành FAB */}
      {activeTab === "mon" || activeTab === "danh-muc" || activeTab === "tuy-chon" ? (
        <FAB
          variant="circle"
          aria-label={
            activeTab === "mon"
              ? "Thêm món"
              : activeTab === "danh-muc"
              ? "Thêm danh mục"
              : "Thêm nhóm tùy chọn"
          }
          title={
            activeTab === "mon"
              ? "Thêm món"
              : activeTab === "danh-muc"
              ? "Thêm danh mục"
              : "Thêm nhóm tùy chọn"
          }
          icon={<Plus className="size-6 text-white" strokeWidth={2.5} />}
          onClick={
            activeTab === "mon"
              ? handleAddDish
              : activeTab === "danh-muc"
              ? handleAddCategory
              : handleAddOptionGroup
          }
          className={FAB_POSITION_CLASS}
        />
      ) : null}
    </div>
  )
}