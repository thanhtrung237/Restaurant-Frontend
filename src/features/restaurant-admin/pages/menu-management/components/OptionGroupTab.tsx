import React from "react"
import { Layers, Pencil, Trash2, ChevronDown, ChevronUp, UtensilsCrossed } from "lucide-react"
import { IconButton } from "@/components/ui/icon-button"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { useOptionItemsByGroup } from "@/api/option-items.api"
import { useDishOptionGroupsByOptionGroup } from "@/api/dish-option-groups.api"
import type { OptionGroup, OptionItem, DishOptionGroup } from "@/types/models"
import { cn } from "@/lib/utils"

interface OptionGroupTabProps {
  groups: OptionGroup[]
  searchTerm: string
  onEditGroup?: (group: OptionGroup) => void
  onDeleteGroup?: (group: OptionGroup) => void
  onAddGroup?: () => void
  isLoading?: boolean
  loadError?: string
  onRetry?: () => void
}

/**
 * Tab "Tùy chọn món" — Quản lý các nhóm tùy chọn (topping, size, đường, đá...)
 * Quản lý chi nhánh có thể xem danh mục tùy chọn dùng chung.
 */
export const OptionGroupTab: React.FC<OptionGroupTabProps> = ({
  groups,
  searchTerm,
  onEditGroup,
  onDeleteGroup,
  onAddGroup,
  isLoading,
  loadError,
  onRetry,
}) => {
  const filteredGroups = React.useMemo(() => {
    if (!searchTerm.trim()) return groups
    const term = searchTerm.toLowerCase().trim()
    return groups.filter((g) => g.name.toLowerCase().includes(term))
  }, [groups, searchTerm])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="size-8 animate-spin rounded-full border-3 border-gray-200 border-t-brand-primary" />
        <p className="text-sm text-text-tertiary">Đang tải danh sách nhóm tùy chọn...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-card border border-border-default bg-surface-card p-6 text-center">
        <p role="alert" className="text-sm text-status-danger">
          {loadError}
        </p>
        <Button type="button" variant="link" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-card border border-border-default bg-surface-card p-8">
        <EmptyState
          icon={Layers}
          title="Chưa có nhóm tùy chọn nào"
          description={
            onAddGroup ? "Tạo nhóm tùy chọn để áp dụng cho các món trong thực đơn." : undefined
          }
          action={
            onAddGroup
              ? {
                  label: "Thêm nhóm tùy chọn",
                  onClick: onAddGroup,
                }
              : undefined
          }
        />
      </div>
    )
  }

  if (filteredGroups.length === 0) {
    return (
      <div className="rounded-card border border-border-default bg-surface-card p-12 text-center">
        <p className="text-sm font-semibold text-text-primary">Không tìm thấy nhóm tùy chọn</p>
        <p className="mt-1 text-xs text-text-tertiary">
          Không có nhóm nào khớp với từ khóa "{searchTerm}".
        </p>
      </div>
    )
  }

  return (
    <div className="pt-1">
      <div className="overflow-hidden rounded-card border border-border-default bg-surface-card divide-y divide-border-default shadow-2xs">
        {filteredGroups.map((group) => (
          <OptionGroupRow
            key={group.id}
            group={group}
            onEdit={onEditGroup ? () => onEditGroup(group) : undefined}
            onDelete={onDeleteGroup ? () => onDeleteGroup(group) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

function OptionGroupRow({
  group,
  onEdit,
  onDelete,
}: {
  group: OptionGroup
  onEdit?: () => void
  onDelete?: () => void
}) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  // Fetch các lựa chọn con (items)
  const itemsQuery = useOptionItemsByGroup(group.id)
  const items = itemsQuery.data ?? []
  const showManagement = Boolean(onEdit && onDelete)

  // Fetch các món đang liên kết nhóm này (chiều ngược lại)
  const { data: linkedDishes = [], isLoading: dishesLoading } = useDishOptionGroupsByOptionGroup(
    showManagement ? group.id : undefined,
  )

  const isRequired = group.selectionType === "REQUIRED"

  return (
    <div className="transition-colors hover:bg-surface-muted/20">
      <div className="p-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Cụm trái: Icon + Tên nhóm + Badge Kiểu chọn + Tóm tắt */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="size-9 shrink-0 rounded-xl bg-brand-primary-subtle text-brand-primary font-bold text-xs flex items-center justify-center">
            <Layers className="size-4.5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-text-primary truncate">{group.name}</p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  isRequired
                    ? "bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]"
                    : "bg-[#F2F4F7] text-[#344054] border border-[#EAECF0]",
                )}
              >
                {isRequired ? "Bắt buộc" : "Tùy chọn"}
              </span>

              <span className="text-xs text-text-tertiary">
                {isRequired
                  ? `Chọn ${group.minSelect} - ${group.maxSelect}`
                  : `Tối đa ${group.maxSelect}`}
              </span>
            </div>

            {/* Danh sách các lựa chọn xem nhanh */}
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {itemsQuery.isLoading ? (
                <span className="text-xs text-text-tertiary">Đang tải lựa chọn...</span>
              ) : itemsQuery.isError ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => void itemsQuery.refetch()}
                >
                  Không tải được lựa chọn · Thử lại
                </Button>
              ) : items.length === 0 ? (
                <span className="text-xs text-status-warning">Chưa có lựa chọn nào</span>
              ) : (
                (showManagement ? items.slice(0, 4) : items).map((item: OptionItem) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center rounded-md bg-surface-muted px-2 py-0.5 text-[11px] text-text-secondary"
                  >
                    {item.name}
                    {Number(item.extraPrice) > 0 && (
                      <span className="ml-1 text-brand-primary font-semibold">
                        +{Number(item.extraPrice).toLocaleString("vi-VN")}đ
                      </span>
                    )}
                  </span>
                ))
              )}
              {showManagement && items.length > 4 && (
                <span className="text-[11px] text-text-tertiary">+{items.length - 4} mục khác</span>
              )}
            </div>
          </div>
        </div>

        {/* Cụm phải: Số món đang dùng + Nút mở rộng + Sửa / Xóa */}
        {showManagement ? (
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Nút xem số món đang dùng (Requirement 6) */}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-muted transition-colors cursor-pointer"
              title="Xem các món đang sử dụng nhóm này"
            >
              <UtensilsCrossed className="size-3.5 text-text-tertiary" />
              <span>{dishesLoading ? "..." : `${linkedDishes.length} món đang dùng`}</span>
              {isExpanded ? (
                <ChevronUp className="size-3.5 text-text-tertiary" />
              ) : (
                <ChevronDown className="size-3.5 text-text-tertiary" />
              )}
            </button>

            {/* Nút Sửa & Xóa */}
            <div className="flex items-center gap-1">
              <IconButton
                type="button"
                variant="row"
                size="row"
                onClick={onEdit}
                title="Chỉnh sửa nhóm tùy chọn"
                aria-label="Chỉnh sửa nhóm tùy chọn"
                className="cursor-pointer"
              >
                <Pencil className="size-3.5" />
              </IconButton>

              <IconButton
                type="button"
                variant="row"
                size="row"
                onClick={onDelete}
                title="Xóa nhóm tùy chọn"
                aria-label="Xóa nhóm tùy chọn"
                className="cursor-pointer hover:text-status-danger"
              >
                <Trash2 className="size-3.5" />
              </IconButton>
            </div>
          </div>
        ) : null}
      </div>

      {/* Chiều ngược lại (Requirement 6): Hiển thị chi tiết các món đang dùng */}
      {isExpanded && (
        <div className="border-t border-border-default/60 bg-[#FAFAFA] px-6 py-3.5">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
            Các món ăn đang áp dụng nhóm tùy chọn này ({linkedDishes.length}):
          </p>

          {linkedDishes.length === 0 ? (
            <p className="text-xs text-text-tertiary italic">
              Chưa có món nào sử dụng nhóm này. Bạn có thể gán nhóm này khi tạo hoặc sửa món trong
              tab "Món".
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {linkedDishes.map((link: DishOptionGroup) => (
                <span
                  key={link.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border-default bg-white px-3 py-1 text-xs font-semibold text-text-primary shadow-2xs"
                >
                  <span className="size-1.5 rounded-full bg-brand-primary" />
                  <span>{link.dishName || `Món #${link.dishId}`}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
