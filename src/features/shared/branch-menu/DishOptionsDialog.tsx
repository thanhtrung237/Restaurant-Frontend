import { useDishOptionGroups } from "@/api/dish-option-groups.api"
import { useOptionItemsByGroup } from "@/api/option-items.api"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/format"
import type { BranchMenuItem, DishOptionGroup } from "@/types/models"

export function DishOptionsDialog({ dish, onClose, onRestoreFocus }: {
  dish: BranchMenuItem | null
  onClose: () => void
  onRestoreFocus: () => void
}) {
  const groupsQuery = useDishOptionGroups(dish?.dishId)
  const groups = groupsQuery.data ?? []

  return (
    <Dialog open={Boolean(dish)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-4 sm:max-w-lg"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onRestoreFocus()
        }}
      >
        <DialogHeader className="pr-6">
          <DialogTitle className="break-words">Tùy chọn món · {dish?.dishName}</DialogTitle>
          <DialogDescription>{dish?.isBranchSpecific ? "Món riêng của chi nhánh" : "Món dùng chung của nhà hàng"}</DialogDescription>
        </DialogHeader>
        {groupsQuery.isLoading ? (
          <p role="status" className="text-sm text-text-secondary">Đang tải nhóm tùy chọn…</p>
        ) : groupsQuery.isError ? (
          <div>
            <p role="alert" className="text-sm text-status-danger">Không tải được nhóm tùy chọn của món.</p>
            <Button type="button" variant="link" onClick={() => void groupsQuery.refetch()}>Thử lại</Button>
          </div>
        ) : groups.length ? (
          <div className="min-h-0 divide-y divide-border-default overflow-y-auto pr-1">
            {groups.map((group) => <DishOptionGroupDetails key={group.id} group={group} />)}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Món này chưa có nhóm tùy chọn.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DishOptionGroupDetails({ group }: { group: DishOptionGroup }) {
  const itemsQuery = useOptionItemsByGroup(group.optionGroupId)
  const items = itemsQuery.data ?? []
  const required = group.selectionType === "REQUIRED"
  const limit = group.minSelect === group.maxSelect
    ? `Chọn ${group.maxSelect}`
    : required ? `Chọn ${group.minSelect}–${group.maxSelect}` : `Tối đa ${group.maxSelect}`

  return (
    <section className="space-y-2 py-3 first:pt-0">
      <h3 className="break-words text-sm font-bold text-text-primary">{group.optionGroupName || "Nhóm tùy chọn"}</h3>
      <p className="text-xs text-text-secondary">{required ? "Bắt buộc" : "Tùy chọn"} · {limit}</p>
      {itemsQuery.isLoading ? (
        <p role="status" className="text-sm text-text-secondary">Đang tải lựa chọn…</p>
      ) : itemsQuery.isError ? (
        <Button type="button" variant="link" onClick={() => void itemsQuery.refetch()}>Không tải được lựa chọn · Thử lại</Button>
      ) : items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0 break-words">{item.name}</span>
              <span className="shrink-0 tabular-nums text-text-secondary">
                {Number(item.extraPrice) > 0 ? `+${formatCurrency(item.extraPrice)}` : "Miễn phí"}
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-text-secondary">Nhóm này chưa có lựa chọn.</p>}
    </section>
  )
}
