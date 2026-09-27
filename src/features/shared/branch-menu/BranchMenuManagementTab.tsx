import React, { useState, useMemo } from "react"
import { Pencil, Utensils, MoreVertical, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Chip } from "@/components/common/Chip"
import { IconButton } from "@/components/ui/icon-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { useBranchMenuOverview } from "@/api/branch-menu.api"
import { useDishOverridesByBranch } from "@/api/dish-overrides.api"
import { useToggleBranchDishStock } from "@/api/branch-dish-stocks.api"
import { DishOverrideModal } from "./DishOverrideModal"
import { DeleteOverrideDialog } from "./DeleteOverrideDialog"
import type { BranchMenuItem, DishOverride } from "@/types/models"
import type { StockStatus } from "@/types/enums"

/**
 * Bộ lọc nhanh của bản mobile (Figma "Menu chi nhánh · Mobile (375)"). 
 * Bản PC dùng bảng đủ cột nên nhìn ra ngay món nào đè giá / tạm ẩn, không cần lọc.
 */
type BranchMenuFilter = "all" | "overridden" | "hidden" | "custom" | "out-of-stock"

const BRANCH_MENU_FILTERS: Array<{ key: BranchMenuFilter; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "overridden", label: "Đã đè giá" },
  { key: "hidden", label: "Tạm ẩn" },
  { key: "custom", label: "Món riêng" },
  { key: "out-of-stock", label: "Hết hàng" },
]

/** View model kết hợp BranchMenuItem + DishOverride */
interface BranchMenuItemView extends BranchMenuItem {
  overrideId?: number // ID của bản đè (để PUT/DELETE)
}

/** Suy trạng thái của một món để lọc */
function matchesFilter(item: BranchMenuItemView, filter: BranchMenuFilter): boolean {
  switch (filter) {
    case "custom":
      return item.isBranchSpecific
    case "hidden":
      return item.isHidden
    case "overridden":
      return item.hasOverride && !item.isHidden // Đã đè giá (không tính món ẩn)
    case "out-of-stock":
      return item.stockStatus === "OUT_OF_STOCK"
    case "all":
    default:
      return true
  }
}

interface BranchMenuManagementTabProps {
  branchId: number
  /** Cho phép chỉnh sửa (tạo/sửa override, toggle stock). Default: false (read-only) */
  editable?: boolean
  /** Callback khi bấm nút sửa món RIÊNG của chi nhánh (GĐ3) - chỉ áp dụng cho món isBranchSpecific */
  onEditBranchDish?: (item: BranchMenuItemView) => void
}

/**
 * Tab "Menu chi nhánh" — DÙNG CHUNG cho:
 * 1. Trang Thực đơn của Quản trị NH (menu-management)
 * 2. Tab "Menu chi nhánh" trong Chi tiết chi nhánh (branch-detail)
 * 
 * GĐ1: CHỈ ĐỌC - Hiển thị từ API thật
 * - GET /branches/{id}/menu/overview → BranchMenuItemResponse
 * - GET /dish-overrides/branch/{id} → ghép để lấy overrideId
 * - Hiển thị: "Theo giá gốc / Đã đè giá / Tạm ẩn / Hết hàng / Món riêng"
 * - Lọc theo trạng thái
 * 
 * GĐ2: GHI - Tạo/sửa/xóa override, toggle hết hàng
 * - PUT /branch-dish-stocks/branch/{b}/dish/{d}/toggle
 * - POST/PUT/DELETE /dish-overrides
 * 
 * GĐ3: Món riêng chi nhánh - callback onEditBranchDish để mở DishModal với branchId
 */
export const BranchMenuManagementTab: React.FC<BranchMenuManagementTabProps> = ({
  branchId,
  editable = false,
  onEditBranchDish,
}) => {
  const [filter, setFilter] = useState<BranchMenuFilter>("all")

  // Modals state
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [deleteOverrideDialogOpen, setDeleteOverrideDialogOpen] = useState(false)
  const [selectedDish, setSelectedDish] = useState<BranchMenuItemView | null>(null)

  // Lấy menu overview (dành quản trị, có cả món ẩn)
  const { data: menuItems = [], isLoading: menuLoading } = useBranchMenuOverview(branchId)
  
  // Lấy danh sách bản đè để có overrideId (cần cho PUT/DELETE ở GĐ2)
  const { data: overrides = [], isLoading: overridesLoading } = useDishOverridesByBranch(branchId)

  // Mutations
  const toggleStockMutation = useToggleBranchDishStock()

  // Ghép overrideId vào menuItems
  const items: BranchMenuItemView[] = useMemo(() => {
    // Tạo map dishId → overrideId
    const overrideMap = new Map<number, number>()
    overrides.forEach((override) => {
      overrideMap.set(override.dishId, override.id)
    })

    return menuItems.map((item) => ({
      ...item,
      overrideId: overrideMap.get(item.dishId),
    }))
  }, [menuItems, overrides])

  // Lọc theo bộ lọc
  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [items, filter],
  )

  const isLoading = menuLoading || overridesLoading

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleToggleStock = async (dishId: number) => {
    try {
      await toggleStockMutation.mutateAsync({ branchId, dishId })
      toast.success("Đã cập nhật trạng thái hàng")
    } catch (error) {
      toast.error("Không thể cập nhật trạng thái hàng")
      console.error("Toggle stock error:", error)
    }
  }

  const handleCreateOrEditOverride = (item: BranchMenuItemView) => {
    setSelectedDish(item)
    setOverrideModalOpen(true)
  }

  const handleDeleteOverride = (item: BranchMenuItemView) => {
    setSelectedDish(item)
    setDeleteOverrideDialogOpen(true)
  }

  const handleEditBranchDish = (item: BranchMenuItemView) => {
    // GĐ3: Chỉnh sửa món riêng của chi nhánh (mở DishModal)
    onEditBranchDish?.(item)
  }

  // Format tiền
  const formatMoney = (val?: number | null) => {
    if (val === null || val === undefined) return "—"
    return `${val.toLocaleString("vi-VN")}đ`
  }

  // Render cột chênh lệch giá
  const renderDiff = (item: BranchMenuItemView) => {
    if (item.isHidden) {
      return <span className="font-medium text-status-warning">ẩn tại CN này</span>
    }
    
    if (item.isBranchSpecific) {
      return <span className="font-medium text-brand-primary">món riêng</span>
    }

    if (!item.hasOverride || !item.priceDifference) {
      return <span className="text-text-tertiary">—</span>
    }

    const diff = item.priceDifference
    if (diff < 0) {
      return <span className="font-semibold text-status-success">{formatMoney(diff)}</span>
    }
    if (diff > 0) {
      return <span className="font-semibold text-brand-primary">+{formatMoney(diff)}</span>
    }
    return <span className="text-text-tertiary">—</span>
  }

  // Render badge trạng thái
  const renderStatusBadge = (item: BranchMenuItemView) => {
    if (item.isBranchSpecific) {
      return (
        <Badge dot variant="warning" className="bg-brand-primary-subtle text-brand-primary font-medium">
          Món riêng
        </Badge>
      )
    }

    if (item.isHidden) {
      return (
        <Badge dot variant="warning" className="bg-status-warning-subtle text-status-warning font-medium">
          Tạm ẩn
        </Badge>
      )
    }

    if (item.hasOverride) {
      return (
        <Badge dot variant="info" className="bg-blue-50 text-blue-700 font-medium">
          Đã đè giá
        </Badge>
      )
    }

    return (
      <Badge dot variant="default" className="bg-surface-muted text-text-tertiary font-medium">
        Theo giá gốc
      </Badge>
    )
  }

  // Render trạng thái hết hàng
  const renderStockStatus = (item: BranchMenuItemView) => {
    const isOutOfStock = item.stockStatus === "OUT_OF_STOCK"
    
    return (
      <div className="flex items-center gap-2.5">
        <Switch
          checked={!isOutOfStock}
          onCheckedChange={() => handleToggleStock(item.dishId)}
          className="cursor-pointer data-[state=checked]:bg-status-success"
          disabled={!editable || toggleStockMutation.isPending}
        />
        <span
          className={`text-sm font-medium ${
            isOutOfStock ? "text-text-tertiary" : "text-status-success"
          }`}
        >
          {isOutOfStock ? "Hết hàng" : "Còn hàng"}
        </span>
      </div>
    )
  }

  // Render action buttons cho một món
  const renderActions = (item: BranchMenuItemView) => {
    if (!editable) return null

    // Món riêng của chi nhánh: chỉ có nút sửa món (mở DishModal)
    if (item.isBranchSpecific) {
      return (
        <IconButton
          type="button"
          variant="row"
          size="row"
          onClick={() => handleEditBranchDish(item)}
          className="cursor-pointer"
          title="Chỉnh sửa món riêng"
          aria-label={`Chỉnh sửa ${item.dishName}`}
        >
          <Pencil />
        </IconButton>
      )
    }

    // Món gốc: có menu thả xuống (tạo/sửa/xóa override)
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            type="button"
            variant="row"
            size="row"
            className="cursor-pointer"
            title="Thao tác"
            aria-label="Thao tác"
          >
            <MoreVertical />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleCreateOrEditOverride(item)}>
            <Pencil className="mr-2 size-4" />
            {item.hasOverride ? "Sửa ghi đè" : "Tạo ghi đè"}
          </DropdownMenuItem>
          {item.hasOverride && (
            <DropdownMenuItem
              onClick={() => handleDeleteOverride(item)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Xóa ghi đè
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (isLoading) {
    return (
      <div className="pt-1">
        <div className="rounded-card border border-border-default bg-surface-card py-12 text-center">
          <p className="text-sm text-text-tertiary">Đang tải menu chi nhánh...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="pt-1">
        <div className="rounded-card border border-border-default bg-surface-card py-12 text-center">
          <p className="text-sm text-text-tertiary">Chưa có món nào trong menu chi nhánh này</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-1">
      {/* ===== <md: chip lọc + danh sách card (Figma "Menu chi nhánh · Mobile") ===== */}
      <div className="space-y-4 md:hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {BRANCH_MENU_FILTERS.map((f) => (
            <Chip
              key={f.key}
              selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className="cursor-pointer"
            >
              {f.label}
            </Chip>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <div className="rounded-card border border-border-default bg-surface-card py-12 text-center text-sm text-text-tertiary">
            Không có món nào thuộc nhóm này
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredItems.map((item) => (
              <li
                key={item.dishId}
                className="rounded-card border border-border-default bg-surface-card p-4 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold leading-snug text-text-primary">
                      {item.dishName}
                    </p>
                    <p className="mt-0.5 text-xs text-text-tertiary">{item.categoryName}</p>
                    <div className="mt-2">{renderStatusBadge(item)}</div>
                  </div>
                  {renderActions(item)}
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                      Giá gốc
                    </dt>
                    <dd className="mt-1 text-text-secondary">
                      {formatMoney(item.basePrice)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                      Giá CN
                    </dt>
                    <dd className="mt-1 font-semibold text-text-primary">
                      {formatMoney(item.effectivePrice)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                      Chênh lệch
                    </dt>
                    <dd className="mt-1">{renderDiff(item)}</dd>
                  </div>
                </dl>

                {/* Hết hàng / Còn hàng (FR-MNU-03) */}
                <div className="mt-3 border-t border-border-default pt-3">
                  {renderStockStatus(item)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ===== md+: bảng đủ cột như thiết kế PC ===== */}
      <div className="hidden overflow-hidden rounded-card border border-border-default bg-surface-card shadow-2xs md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-muted/40 hover:bg-surface-muted/40 border-b border-border-default">
              <TableHead className="py-3.5 pl-6 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                MÓN
              </TableHead>
              <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                TRẠNG THÁI
              </TableHead>
              <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                GIÁ GỐC
              </TableHead>
              <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                GIÁ CHI NHÁNH
              </TableHead>
              <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                CHÊNH LỆCH
              </TableHead>
              <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                CÒN / HẾT
              </TableHead>
              {editable && (
                <TableHead className="py-3.5 pr-6 pl-4 text-right text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                  <span className="sr-only">Thao tác</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.dishId}
                className="hover:bg-surface-muted/30 transition-colors border-b border-border-default last:border-b-0"
              >
                {/* Cột Món: Ảnh + Tên + Danh mục */}
                <TableCell className="py-3.5 pl-6">
                  <div className="flex items-center gap-3">
                    <div className="size-10 shrink-0 rounded-lg bg-surface-muted flex items-center justify-center text-text-tertiary">
                      <Utensils className="size-5 stroke-[1.75]" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary text-sm tracking-tight leading-snug">
                        {item.dishName}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {item.categoryName}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Cột Trạng thái */}
                <TableCell className="py-3.5 px-4 text-sm">
                  {renderStatusBadge(item)}
                </TableCell>

                {/* Cột Giá gốc */}
                <TableCell className="py-3.5 px-4 text-sm text-text-secondary">
                  {formatMoney(item.basePrice)}
                </TableCell>

                {/* Cột Giá chi nhánh */}
                <TableCell className="py-3.5 px-4 text-sm font-semibold text-text-primary">
                  {formatMoney(item.effectivePrice)}
                </TableCell>

                {/* Cột Chênh lệch */}
                <TableCell className="py-3.5 px-4 text-sm">
                  {renderDiff(item)}
                </TableCell>

                {/* Cột Còn / Hết */}
                <TableCell className="py-3.5 px-4 text-sm">
                  {renderStockStatus(item)}
                </TableCell>

                {/* Cột Thao tác */}
                {editable && (
                  <TableCell className="py-3.5 pr-6 pl-4 text-right">
                    {renderActions(item)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      <DishOverrideModal
        open={overrideModalOpen}
        onOpenChange={setOverrideModalOpen}
        branchId={branchId}
        dish={selectedDish}
        overrideId={selectedDish?.overrideId}
      />

      <DeleteOverrideDialog
        open={deleteOverrideDialogOpen}
        onOpenChange={setDeleteOverrideDialogOpen}
        dish={selectedDish}
        overrideId={selectedDish?.overrideId ?? null}
      />
    </div>
  )
}
