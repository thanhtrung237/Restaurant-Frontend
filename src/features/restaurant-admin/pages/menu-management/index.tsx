import { useState, useMemo, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import { SearchInput } from "@/components/common/SearchInput"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
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
import { useBranch, useBranchesByRestaurant } from "@/api/branches.api"
import { APP_ROLE } from "@/config/roles"
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
  const role = useAuthStore((s) => s.role)
  const isRestaurantAdmin = role === APP_ROLE.RESTAURANT_ADMIN
  const isBranchManager = role === APP_ROLE.BRANCH_MANAGER

  const tabParam = searchParams.get("tab")
  const isOptionsTab = tabParam === "tuy-chon" || tabParam === "options"
  const activeTab: MenuTabType =
    isOptionsTab && (isRestaurantAdmin || isBranchManager)
      ? "tuy-chon"
      : !isRestaurantAdmin
        ? "menu-chi-nhanh"
        : tabParam === "danh-muc" || tabParam === "categories"
          ? "danh-muc"
          : tabParam === "menu-chi-nhanh" || tabParam === "branch-menu"
            ? "menu-chi-nhanh"
            : "mon"
  const [optionSearch, setOptionSearch] = useState("")
  const [localBranchId, setLocalBranchId] = useState<number | null>(null)

  const { toast } = useToast()
  const restaurantId = useAuthStore((s) => s.account?.restaurantId)
  const scopeBranchId = useAuthStore((s) => s.branchId)

  // ---- Dữ liệu thật ----
  const categoriesQuery = useCategoriesByRestaurant(restaurantId)
  const optionGroupsQuery = useOptionGroupsByRestaurant(
    activeTab === "tuy-chon" ? restaurantId : undefined,
  )
  const branchesQuery = useBranchesByRestaurant(isRestaurantAdmin ? restaurantId : undefined)
  const ownBranchQuery = useBranch(isRestaurantAdmin ? undefined : (scopeBranchId ?? undefined))
  const branchQuery = isRestaurantAdmin ? branchesQuery : ownBranchQuery
  const branches = isRestaurantAdmin
    ? (branchesQuery.data ?? [])
    : ownBranchQuery.data
      ? [ownBranchQuery.data]
      : []
  const targetBranchId = scopeBranchId ?? (isRestaurantAdmin ? localBranchId : null)
  const selectedBranch = branches.find((branch) => branch.id === targetBranchId)
  // Lấy một trang lớn thay vì phân trang: màn này cần đếm & lọc trên toàn bộ danh sách.
  // Nếu vượt DISH_PAGE_SIZE thì cảnh báo trên UI (xem docs/todo.md).
  const dishesQuery = useDishesByRestaurant(isRestaurantAdmin ? restaurantId : undefined, {
    page: 0,
    size: DISH_PAGE_SIZE,
  })

  const apiCategories: Category[] = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  )
  const optionGroups: OptionGroup[] = useMemo(
    () => optionGroupsQuery.data ?? [],
    [optionGroupsQuery.data],
  )
  const allApiDishes: Dish[] = useMemo(() => dishesQuery.data?.content ?? [], [dishesQuery.data])
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
  const [categoryModal, setCategoryModal] = useState<{ open: boolean; data: Category | null }>({
    open: false,
    data: null,
  })
  const [dishModal, setDishModal] = useState<{
    open: boolean
    data: Dish | null
    branchId?: number
  }>({
    open: false,
    data: null,
  })
  const [isSavingDish, setIsSavingDish] = useState(false)
  const savingDish = useRef(false)
  const [optionGroupModal, setOptionGroupModal] = useState<{
    open: boolean
    data: OptionGroup | null
  }>({
    open: false,
    data: null,
  })
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [dishToStop, setDishToStop] = useState<Dish | null>(null)
  const [optionGroupToDelete, setOptionGroupToDelete] = useState<OptionGroup | null>(null)

  const affectedBranchesQuery = useCountAffectedBranches(
    dishToStop?.id,
    Boolean(dishToStop && dishToStop.branchId == null),
  )

  // ---- Map sang kiểu hiển thị của các tab ----
  const dishes: DishItem[] = useMemo(
    () =>
      restaurantDishes.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        categoryId: d.categoryId,
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
  async function updateDishSaleStatus(dish: Dish, status: "ACTIVE" | "INACTIVE") {
    await changeDishStatus.mutateAsync({ id: dish.id, status })
    setDishModal((current) =>
      current.data?.id === dish.id ? { ...current, data: { ...current.data, status } } : current,
    )
  }

  async function handleToggleDishStatus(dish: Dish) {
    if (dish.status === "ACTIVE") {
      setDishToStop(dish)
      return
    }
    try {
      await updateDishSaleStatus(dish, "ACTIVE")
      toast({ title: `Đã bán lại "${dish.name}"`, variant: "success" })
    } catch (error) {
      notifyError("Không đổi được trạng thái món", error)
    }
  }

  async function handleConfirmStopSelling() {
    if (!dishToStop) return
    try {
      await updateDishSaleStatus(dishToStop, "INACTIVE")
      toast({ title: `Đã ngừng bán "${dishToStop.name}"`, variant: "success" })
      setDishToStop(null)
    } catch (error) {
      notifyError("Không ngừng bán được món", error)
    }
  }

  const handleAddDish = () => {
    if (isRestaurantAdmin) setDishModal({ open: true, data: null })
  }

  const handleEditDish = (dish: DishItem) => {
    if (!isRestaurantAdmin) return
    const found = restaurantDishes.find((d) => d.id === dish.id) ?? null
    setDishModal({ open: true, data: found })
  }

  // Handler for editing branch-specific dish (GĐ3)
  const handleEditBranchDish = async (item: { dishId: number; dishName: string }) => {
    try {
      // Fetch full dish details
      const dishDetails = await getDish(item.dishId)
      if (!selectedBranch || dishDetails.branchId !== selectedBranch.id) return
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
    if (!restaurantId || savingDish.current) return
    if (!isRestaurantAdmin && (!scopeBranchId || data.branchId !== scopeBranchId)) {
      toast({ title: "Chỉ được lưu món riêng của chi nhánh đang quản lý", variant: "danger" })
      return
    }
    savingDish.current = true
    setIsSavingDish(true)
    const editing = dishModal.data
    const { optionGroupIds, ...dishData } = data
    try {
      if (editing) {
        await updateDish.mutateAsync({ id: editing.id, body: dishData })

        // Đồng bộ các nhóm tùy chọn (Requirement 5)
        if (optionGroupIds !== undefined) {
          const currentLinks = await getDishOptionGroupsByDish(editing.id)
          const currentGroupIds = new Set(currentLinks.map((link) => link.optionGroupId))
          const selectedGroupIds = new Set(optionGroupIds)

          for (const groupId of selectedGroupIds) {
            if (!currentGroupIds.has(groupId)) {
              await linkDishToOptionGroup.mutateAsync({
                dishId: editing.id,
                optionGroupId: groupId,
              })
            }
          }
          for (const link of currentLinks) {
            if (!selectedGroupIds.has(link.optionGroupId)) {
              await unlinkDishFromOptionGroup.mutateAsync(link.id)
            }
          }
        }

        toast({ title: "Đã lưu thay đổi món", variant: "success" })
      } else {
        const created = await createDish.mutateAsync({ restaurantId, ...dishData })

        // Liên kết các nhóm tùy chọn cho món mới (Requirement 5)
        if (optionGroupIds && optionGroupIds.length > 0 && created?.id) {
          await Promise.all(
            optionGroupIds.map((groupId) =>
              linkDishToOptionGroup.mutateAsync({ dishId: created.id, optionGroupId: groupId }),
            ),
          )
        }

        toast({ title: `Đã thêm món "${data.name}"`, variant: "success" })
      }
      setDishModal({ open: false, data: null })
    } catch (error) {
      // KHÔNG đóng modal: giữ nguyên dữ liệu người dùng đã nhập để sửa và thử lại
      notifyError(editing ? "Không lưu được món" : "Không thêm được món", error)
    } finally {
      savingDish.current = false
      setIsSavingDish(false)
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
            }),
          ),
          ...toUpdate.map((i) =>
            updateOptionItem.mutateAsync({
              id: i.id!,
              body: {
                name: i.name,
                extraPrice: i.extraPrice,
              },
            }),
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
              }),
            ),
          )
        }

        toast({ title: `Đã tạo nhóm tùy chọn "${data.name}"`, variant: "success" })
      }
      setOptionGroupModal({ open: false, data: null })
    } catch (error) {
      notifyError(editing ? "Không lưu được nhóm tùy chọn" : "Không tạo được nhóm tùy chọn", error)
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
  const headerMeta = (() => {
    if (activeTab === "danh-muc") {
      return {
        title: "Danh mục",
        subtitle: `${categories.length} danh mục · dùng chung mọi chi nhánh`,
      }
    }
    if (activeTab === "tuy-chon") {
      return {
        title: "Tùy chọn món",
        subtitle: isRestaurantAdmin
          ? `${optionGroups.length} nhóm tùy chọn · dùng chung cho các món`
          : "Nhóm tùy chọn dùng chung của nhà hàng",
      }
    }
    if (activeTab === "menu-chi-nhanh") {
      return {
        title: isRestaurantAdmin ? "Thực đơn" : "Thực đơn chi nhánh",
        subtitle: selectedBranch ? `Chi nhánh · ${selectedBranch.name}` : "Chọn chi nhánh",
      }
    }
    return {
      title: "Thực đơn",
      // Số liệu tính từ API, không còn hard-code
      subtitle: dishesQuery.isLoading
        ? "Đang tải..."
        : `Toàn nhà hàng · ${dishes.length} món · ${activeDishCount} đang bán`,
    }
  })()
  const headerActions =
    activeTab === "menu-chi-nhanh" ? (
      <div className="flex min-w-0 items-center gap-2">
        {isRestaurantAdmin && scopeBranchId == null && branches.length > 0 ? (
          <Select
            value={selectedBranch ? String(selectedBranch.id) : ""}
            onValueChange={(value) => setLocalBranchId(Number(value))}
          >
            <SelectTrigger
              aria-label="Chọn chi nhánh"
              className="h-10 min-w-0 flex-1 md:w-48 [&>span]:truncate"
            >
              <SelectValue placeholder="Chọn chi nhánh" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={String(branch.id)}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {isBranchManager ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 px-3"
            onClick={() => handleTabChange("tuy-chon")}
          >
            Tùy chọn món
          </Button>
        ) : null}
        {selectedBranch ? (
          <Button
            type="button"
            className="h-10 px-4"
            onClick={() => setDishModal({ open: true, data: null, branchId: selectedBranch.id })}
          >
            <Plus aria-hidden="true" />
            Thêm món riêng
          </Button>
        ) : null}
      </div>
    ) : isBranchManager ? (
      <Button
        type="button"
        variant="outline"
        className="h-10"
        onClick={() => handleTabChange("menu-chi-nhanh")}
      >
        Về thực đơn chi nhánh
      </Button>
    ) : (
      <MenuHeaderActions
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAdd={
          activeTab === "mon"
            ? handleAddDish
            : activeTab === "danh-muc"
              ? handleAddCategory
              : handleAddOptionGroup
        }
      />
    )
  const editingDish =
    restaurantDishes.find((dish) => dish.id === dishModal.data?.id) ?? dishModal.data

  return (
    <div className="flex min-h-full flex-col bg-surface-page">
      <PageHeader
        title={headerMeta.title}
        subtitle={
          <span className="block truncate" title={headerMeta.subtitle}>
            {headerMeta.subtitle}
          </span>
        }
        mobileSubtitle={headerMeta.subtitle}
        actions={headerActions}
        tabs={
          isRestaurantAdmin ? (
            <MenuTabs activeTab={activeTab} onTabChange={handleTabChange} />
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
        <div className="space-y-3 md:hidden">
          {isRestaurantAdmin ? (
            <MenuTabs activeTab={activeTab} onTabChange={handleTabChange} />
          ) : null}
          {headerActions}
        </div>

        {activeTab === "mon" ? (
          <MonTab
            dishes={dishes}
            categories={categories}
            onEditDish={handleEditDish}
            isLoading={dishesQuery.isLoading}
            loadError={dishesQuery.isError ? getErrorMessage(dishesQuery.error) : undefined}
            onRetry={() => void dishesQuery.refetch()}
          />
        ) : activeTab === "danh-muc" ? (
          <DanhMucTab
            categories={categories}
            onToggleStatus={handleToggleCategoryStatus}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        ) : activeTab === "tuy-chon" ? (
          <>
            <div className="w-full sm:max-w-xs">
              <SearchInput
                aria-label="Tìm nhóm tùy chọn"
                value={optionSearch}
                onChange={(e) => setOptionSearch(e.target.value)}
                onClear={() => setOptionSearch("")}
                placeholder="Tìm nhóm tùy chọn…"
              />
            </div>
            <OptionGroupTab
              groups={optionGroups}
              searchTerm={optionSearch}
              onEditGroup={isRestaurantAdmin ? handleEditOptionGroup : undefined}
              onDeleteGroup={isRestaurantAdmin ? handleDeleteOptionGroup : undefined}
              onAddGroup={isRestaurantAdmin ? handleAddOptionGroup : undefined}
              isLoading={optionGroupsQuery.isLoading}
              loadError={
                optionGroupsQuery.isError ? getErrorMessage(optionGroupsQuery.error) : undefined
              }
              onRetry={() => void optionGroupsQuery.refetch()}
            />
          </>
        ) : selectedBranch ? (
          <BranchMenuManagementTab
            key={selectedBranch.id}
            branchId={selectedBranch.id}
            editable
            onEditBranchDish={handleEditBranchDish}
          />
        ) : (
          <div className="rounded-card border border-border-default bg-surface-card px-4 py-10 text-center text-sm text-text-tertiary">
            {branchQuery.isLoading ? (
              "Đang tải chi nhánh…"
            ) : branchQuery.isError ? (
              <>
                <p>Không tải được chi nhánh</p>
                <Button type="button" variant="link" onClick={() => void branchQuery.refetch()}>
                  Thử lại
                </Button>
              </>
            ) : !isRestaurantAdmin ? (
              "Chọn chi nhánh được phân công để xem thực đơn."
            ) : branches.length === 0 ? (
              "Nhà hàng chưa có chi nhánh."
            ) : scopeBranchId != null ? (
              "Chi nhánh hiện tại không có trong danh sách. Hãy đổi chi nhánh ở thanh điều hướng."
            ) : (
              "Chọn chi nhánh để xem giá và trạng thái còn món."
            )}
          </div>
        )}
      </div>

      {activeTab === "mon" && isTruncated ? (
        <p className="rounded-lg bg-status-warning-subtle px-3.5 py-2.5 text-xs font-medium text-status-warning">
          Đang hiển thị {allApiDishes.length}/{totalDishElements} món. Danh sách vượt quá giới hạn
          tải một lần — cần bổ sung phân trang.
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
        isSaving={isSavingDish}
        currentBranchId={dishModal.data?.branchId ?? dishModal.branchId}
        branchName={
          branches.find((branch) => branch.id === (dishModal.data?.branchId ?? dishModal.branchId))
            ?.name
        }
        saleStatus={
          editingDish
            ? {
                isSelling: editingDish.status === "ACTIVE",
                isUpdating: changeDishStatus.isPending,
                onChange: () => void handleToggleDishStatus(editingDish),
              }
            : undefined
        }
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
    </div>
  )
}
