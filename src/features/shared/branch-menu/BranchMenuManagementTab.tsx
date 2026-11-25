import { useBranchOperationalPermissions } from "@/api/operational-permissions.api"
import React, { useState, useMemo, useRef } from "react"
import { Pencil, RotateCcw } from "lucide-react"
import { DishThumbnail } from "@/components/common/DishThumbnail"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/common/SearchInput"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { DishOptionsDialog } from "./DishOptionsDialog"
import type { BranchMenuItem } from "@/types/models"

type BranchMenuFilter = "all" | "overridden" | "hidden" | "custom" | "out-of-stock"

const BRANCH_MENU_FILTERS: Array<{ key: BranchMenuFilter; label: string }> = [
  { key: "all", label: "Mọi trạng thái" },
  { key: "overridden", label: "Có giá riêng" },
  { key: "hidden", label: "Tạm ẩn" },
  { key: "custom", label: "Món riêng" },
  { key: "out-of-stock", label: "Tạm hết" },
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
      return item.hasOverride
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
  const [search, setSearch] = useState("")
  const [categoryId, setCategoryId] = useState("all")

  // Modals state
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [deleteOverrideDialogOpen, setDeleteOverrideDialogOpen] = useState(false)
  const [selectedDish, setSelectedDish] = useState<BranchMenuItemView | null>(null)
  const [optionsDish, setOptionsDish] = useState<BranchMenuItemView | null>(null)
  const optionsTrigger = useRef<HTMLButtonElement>(null)
  const dishSearch = useRef<HTMLInputElement>(null)

  // Lấy menu overview (dành quản trị, có cả món ẩn)
  const canManageStock = useBranchOperationalPermissions(branchId).can("MANAGE_STOCK")
  const menuQuery = useBranchMenuOverview(branchId)

  // Lấy danh sách bản đè để có overrideId (cần cho PUT/DELETE ở GĐ2)
  const overridesQuery = useDishOverridesByBranch(branchId)

  // Mutations
  const toggleStockMutation = useToggleBranchDishStock()

  // Ghép overrideId vào menuItems
  const items: BranchMenuItemView[] = useMemo(() => {
    // Tạo map dishId → overrideId
    const overrideMap = new Map<number, number>()
    overridesQuery.data?.forEach((override) => {
      overrideMap.set(override.dishId, override.id)
    })

    return (menuQuery.data ?? []).map((item) => ({
      ...item,
      overrideId: overrideMap.get(item.dishId),
    }))
  }, [menuQuery.data, overridesQuery.data])

  // Lọc theo bộ lọc
  const categories = new Map(
    items.flatMap((item) =>
      item.categoryName ? [[String(item.categoryId), item.categoryName] as const] : [],
    ),
  )
  const category = categories.has(categoryId) ? categoryId : "all"
  const query = search.trim().toLowerCase()
  const filteredItems = items.filter(
    (item) =>
      (category === "all" || String(item.categoryId) === category) &&
      matchesFilter(item, filter) &&
      (item.dishName.toLowerCase().includes(query) ||
        item.categoryName?.toLowerCase().includes(query)),
  )
  const isLoading = menuQuery.isLoading || overridesQuery.isLoading
  const loadFailed = menuQuery.isError || overridesQuery.isError

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
    if (!item.isBranchSpecific && !item.isHidden && !item.hasOverride) {
      return (
        <Badge dot variant="default" className="bg-surface-muted text-text-tertiary font-medium">
          Theo giá gốc
        </Badge>
      )
    }
    return (
      <div className="flex flex-wrap gap-1">
        {item.isBranchSpecific ? (
          <Badge
            dot
            variant="warning"
            className="bg-brand-primary-subtle text-brand-primary font-medium"
          >
            Món riêng
          </Badge>
        ) : null}
        {item.isHidden ? (
          <Badge
            dot
            variant="warning"
            className="bg-status-warning-subtle text-status-warning font-medium"
          >
            Tạm ẩn
          </Badge>
        ) : null}
        {item.hasOverride ? (
          <Badge dot variant="info" className="bg-blue-50 text-blue-700 font-medium">
            Có giá riêng
          </Badge>
        ) : null}
      </div>
    )
  }

  // Render trạng thái hết hàng
  const renderStockStatus = (item: BranchMenuItemView) => {
    const isOutOfStock = item.stockStatus === "OUT_OF_STOCK"

    return (
      <div className="flex items-center gap-2.5">
        <Switch
          aria-label={`Còn món: ${item.dishName}`}
          checked={!isOutOfStock}
          onCheckedChange={() => handleToggleStock(item.dishId)}
          className="cursor-pointer data-[state=checked]:bg-status-success"
          disabled={!editable || !canManageStock || toggleStockMutation.isPending}
        />
        <span
          className={`text-sm font-medium ${
            isOutOfStock ? "text-text-tertiary" : "text-status-success"
          }`}
        >
          {isOutOfStock ? "Tạm hết" : "Còn món"}
        </span>
      </div>
    )
  }

  // Render action buttons cho một món
  const renderActions = (item: BranchMenuItemView) => {
    if (!editable) return null

    // Món riêng của chi nhánh: chỉ có nút sửa món (mở DishModal)
    if (item.isBranchSpecific) {
      if (!onEditBranchDish) return null
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

    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-2"
          onClick={() => handleCreateOrEditOverride(item)}
          aria-label={`Chỉnh giá và hiển thị: ${item.dishName}`}
        >
          Chỉnh giá
        </Button>
        {item.overrideId && (item.hasOverride || item.isHidden) ? (
          <IconButton
            type="button"
            variant="row"
            size="row"
            onClick={() => handleDeleteOverride(item)}
            className="cursor-pointer"
            title="Khôi phục mặc định"
            aria-label={`Khôi phục mặc định: ${item.dishName}`}
          >
            <RotateCcw />
          </IconButton>
        ) : null}
      </div>
    )
  }

  const renderOptions = (item: BranchMenuItemView) => (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-8 px-0"
      aria-label={`Xem tùy chọn của ${item.dishName}`}
      onClick={(event) => {
        optionsTrigger.current = event.currentTarget
        setOptionsDish(item)
      }}
    >
      Xem tùy chọn
    </Button>
  )

  const showItems = !isLoading && !loadFailed && filteredItems.length > 0
  const statusContent = !showItems ? (
    <div className="px-4 py-10 text-center text-sm text-text-secondary">
      <p role={loadFailed ? "alert" : "status"}>
        {isLoading
          ? "Đang tải thực đơn chi nhánh…"
          : loadFailed
            ? "Không tải được thực đơn chi nhánh"
            : items.length === 0
              ? "Chưa có món nào trong thực đơn chi nhánh này"
              : "Không tìm thấy món phù hợp."}
      </p>
      {loadFailed ? (
        <Button
          type="button"
          variant="link"
          onClick={() => {
            if (menuQuery.isError) void menuQuery.refetch()
            if (overridesQuery.isError) void overridesQuery.refetch()
          }}
        >
          Thử lại
        </Button>
      ) : null}
    </div>
  ) : null

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-2 items-center gap-2 sm:flex sm:gap-3"
        role="group"
        aria-label="Lọc thực đơn chi nhánh"
      >
        <div className="col-span-2 min-w-0 sm:w-64">
          <SearchInput
            ref={dishSearch}
            aria-label="Tìm món tại chi nhánh"
            placeholder="Tìm món tại chi nhánh…"
            className="border-border-strong bg-surface-card placeholder:font-medium placeholder:text-text-secondary"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch("")}
          />
        </div>
        <Select value={category} onValueChange={setCategoryId}>
          <SelectTrigger
            aria-label="Danh mục tại chi nhánh"
            className="h-10 w-full min-w-0 sm:w-48"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {Array.from(categories, ([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filter} onValueChange={(value: BranchMenuFilter) => setFilter(value)}>
          <SelectTrigger
            aria-label="Trạng thái món tại chi nhánh"
            className="h-10 w-full min-w-0 sm:w-48"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BRANCH_MENU_FILTERS.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div aria-busy={isLoading} className="lg:hidden">
        {showItems ? (
          <ul className="space-y-3">
            {filteredItems.map((item) => (
              <li
                key={item.dishId}
                className="rounded-card border border-border-default bg-surface-card p-4 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <DishThumbnail imageUrl={item.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-bold leading-snug text-text-primary">
                      {item.dishName}
                    </p>
                    <p className="mt-0.5 text-xs text-text-tertiary">{item.categoryName}</p>
                    <div className="mt-2">{renderStatusBadge(item)}</div>
                    {renderOptions(item)}
                  </div>
                  {renderActions(item)}
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                      Giá gốc
                    </dt>
                    <dd className="mt-1 text-text-secondary">{formatMoney(item.basePrice)}</dd>
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
        ) : (
          <div className="rounded-card border border-border-default bg-surface-card">
            {statusContent}
          </div>
        )}
      </div>

      {/* ===== md+: bảng đủ cột như thiết kế PC ===== */}
      <div
        aria-busy={isLoading}
        className="hidden overflow-hidden rounded-card border border-border-default bg-surface-card shadow-2xs lg:block"
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-muted/40 hover:bg-surface-muted/40 border-b border-border-default">
              <TableHead className="pl-6">Món</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Giá gốc</TableHead>
              <TableHead>Giá chi nhánh</TableHead>
              <TableHead>Chênh lệch</TableHead>
              <TableHead>Còn / hết</TableHead>
              {editable && (
                <TableHead className="pr-6 text-right">
                  <span className="sr-only">Thao tác</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {showItems ? (
              filteredItems.map((item) => (
                <TableRow
                  key={item.dishId}
                  className="hover:bg-surface-muted/30 transition-colors border-b border-border-default last:border-b-0"
                >
                  {/* Cột Món: Ảnh + Tên + Danh mục */}
                  <TableCell className="py-3 pl-6">
                    <div className="flex items-center gap-3">
                      <DishThumbnail imageUrl={item.imageUrl} />
                      <div>
                        <p className="font-semibold text-text-primary text-sm tracking-tight leading-snug">
                          {item.dishName}
                        </p>
                        <p className="text-xs text-text-tertiary mt-0.5">{item.categoryName}</p>
                        {renderOptions(item)}
                      </div>
                    </div>
                  </TableCell>

                  {/* Cột Trạng thái */}
                  <TableCell className="py-3 text-sm">{renderStatusBadge(item)}</TableCell>

                  {/* Cột Giá gốc */}
                  <TableCell className="py-3 text-sm text-text-secondary">
                    {formatMoney(item.basePrice)}
                  </TableCell>

                  {/* Cột Giá chi nhánh */}
                  <TableCell className="py-3 text-sm font-semibold text-text-primary">
                    {formatMoney(item.effectivePrice)}
                  </TableCell>

                  {/* Cột Chênh lệch */}
                  <TableCell className="py-3 text-sm">{renderDiff(item)}</TableCell>

                  {/* Cột Còn / Hết */}
                  <TableCell className="py-3 text-sm">{renderStockStatus(item)}</TableCell>

                  {/* Cột Thao tác */}
                  {editable && (
                    <TableCell className="py-3 pr-6 text-right">{renderActions(item)}</TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={editable ? 7 : 6} className="whitespace-normal p-0">
                  {statusContent}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      <DishOptionsDialog
        dish={optionsDish}
        onClose={() => setOptionsDish(null)}
        onRestoreFocus={() => {
          const trigger = optionsTrigger.current
          if (trigger?.isConnected && trigger.getClientRects().length) trigger.focus()
          else dishSearch.current?.focus()
        }}
      />
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
