import { useId, useMemo, useState } from "react"
import { ChevronDown, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  countPortions,
  dishGroupKey,
  formatTimeAgo,
  getWaitMinutes,
  groupByRound,
  groupIdenticalDishes,
  type KDSTicketItem,
} from "./kitchen-items"

const roundClock = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
})
const checkboxClass =
  "relative size-5 data-[state=indeterminate]:border-brand-primary data-[state=indeterminate]:bg-brand-primary data-[state=indeterminate]:text-text-on-brand data-[state=indeterminate]:after:absolute data-[state=indeterminate]:after:inset-x-1 data-[state=indeterminate]:after:top-1/2 data-[state=indeterminate]:after:h-0.5 data-[state=indeterminate]:after:-translate-y-1/2 data-[state=indeterminate]:after:bg-current [&[data-state=indeterminate]_svg]:hidden"

export interface BatchItemGroup {
  key: string
  item: KDSTicketItem
  items: KDSTicketItem[]
  portions: number
  oldestAt?: number
  rounds: ReturnType<typeof groupByRound>
}

export function groupItems(items: KDSTicketItem[]): BatchItemGroup[] {
  return groupIdenticalDishes(items)
    .map((lines) => {
      const item = lines[0]
      const rounds = groupByRound(lines)
      return {
        key: dishGroupKey(item),
        item,
        items: lines,
        portions: countPortions(lines),
        oldestAt: rounds[0][1][0].roundTime,
        rounds,
      }
    })
    .sort(
      (first, second) =>
        (first.oldestAt ?? Infinity) - (second.oldestAt ?? Infinity) ||
        first.item.round - second.item.round,
    )
}

function selectionState(items: KDSTicketItem[], selectedIds: ReadonlySet<number>) {
  const count = items.filter((item) => selectedIds.has(item.orderDetailId)).length
  return count === items.length ? true : count > 0 ? "indeterminate" : false
}

interface BatchReviewDialogProps {
  tableName: string
  items: KDSTicketItem[]
  selectedIds: ReadonlySet<number>
  now: number
  submitting: boolean
  onSelectionChange: (items: KDSTicketItem[], checked: boolean) => void
  onConfirm: () => void
  onClose: () => void
  onCloseAutoFocus: (event: Event) => void
}

export function BatchReviewDialog({
  tableName,
  items,
  selectedIds,
  now,
  submitting,
  onSelectionChange,
  onConfirm,
  onClose,
  onCloseAutoFocus,
}: BatchReviewDialogProps) {
  const selectAllId = useId()
  const groups = useMemo(() => groupItems(items), [items])
  const selected = groups.map((group) =>
    group.items.filter((item) => selectedIds.has(item.orderDetailId)),
  )
  const selectedGroups = selected.filter((lines) => lines.length > 0).length
  const selectedPortions = selected.reduce((total, lines) => total + countPortions(lines), 0)
  const totalPortions = countPortions(items)

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submitting) onClose()
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 transition-none sm:max-w-xl"
        showCloseButton={!submitting}
        onEscapeKeyDown={(event) => {
          if (submitting) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (submitting) event.preventDefault()
        }}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            if (selectedPortions > 0 && !submitting) onConfirm()
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              event.target instanceof HTMLElement &&
              event.target.role === "checkbox"
            ) {
              event.preventDefault()
              event.currentTarget.requestSubmit()
            }
          }}
        >
          <div className="shrink-0 border-b border-border-default px-4 pt-4 sm:px-6 sm:pt-6">
            <DialogHeader className="pr-7">
              <DialogTitle className="break-words leading-snug">
                Xác nhận món theo bàn — {tableName}
              </DialogTitle>
              <DialogDescription className="text-text-secondary">
                Chọn nhóm món hoặc mở chi tiết để chọn từng lượt.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3">
              <label
                htmlFor={selectAllId}
                className="flex min-h-12 cursor-pointer items-center gap-2.5 text-sm font-semibold"
              >
                <Checkbox
                  id={selectAllId}
                  aria-label="Chọn tất cả"
                  checked={selectionState(items, selectedIds)}
                  onCheckedChange={(checked) => onSelectionChange(items, checked === true)}
                  disabled={submitting}
                  className={checkboxClass}
                />
                Chọn tất cả
              </label>
              <span role="status" className="text-sm font-medium tabular-nums text-text-secondary">
                Đã chọn {selectedPortions}/{totalPortions} phần
              </span>
            </div>
          </div>

          <ul
            aria-label="Nhóm món chờ xác nhận"
            className="min-h-0 space-y-2 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6"
          >
            {groups.map((group) => (
              <BatchReviewGroup
                key={group.key}
                group={group}
                selectedIds={selectedIds}
                now={now}
                submitting={submitting}
                onSelectionChange={onSelectionChange}
              />
            ))}
          </ul>

          <DialogFooter className="shrink-0 border-t border-border-default bg-surface-card px-4 py-3 sm:px-6">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                className="min-h-11 border-border-strong text-text-primary hover:border-border-strong hover:bg-surface-muted hover:text-text-primary"
              >
                Hủy
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="min-h-11 whitespace-normal bg-blue-700 hover:bg-blue-800 aria-disabled:bg-surface-muted aria-disabled:text-text-secondary"
              disabled={selectedPortions === 0}
              aria-disabled={submitting || undefined}
            >
              <Printer aria-hidden="true" />
              {submitting
                ? "Đang xử lý…"
                : `Xác nhận & In ${selectedGroups} nhóm (${selectedPortions} phần)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BatchReviewGroup({
  group,
  selectedIds,
  now,
  submitting,
  onSelectionChange,
}: {
  group: BatchItemGroup
  selectedIds: ReadonlySet<number>
  now: number
  submitting: boolean
  onSelectionChange: BatchReviewDialogProps["onSelectionChange"]
}) {
  const id = useId()
  const [expanded, setExpanded] = useState(false)
  const { item, items, portions, rounds, oldestAt } = group
  const wait = getWaitMinutes(oldestAt, now)
  const checked = selectionState(items, selectedIds)
  const dishLabel = [
    item.dishName,
    ...(item.options ?? []).map((option) => option.optionItemName),
    item.note,
    item.isTakeAway ? "Mang về" : "",
  ]
    .filter(Boolean)
    .join(", ")
  const roundLabel = `${expanded ? "Ẩn" : "Xem"} ${rounds.length} lượt gọi`

  return (
    <li
      aria-label={dishLabel}
      className={cn(
        "rounded-lg border border-border-default",
        checked && "border-sky-200 bg-sky-50/60",
      )}
    >
      <label
        htmlFor={id}
        className="flex min-h-14 cursor-pointer items-start gap-3 rounded-t-lg p-3 hover:bg-surface-muted/70"
      >
        <Checkbox
          id={id}
          aria-label={`Chọn nhóm ${dishLabel}`}
          checked={checked}
          onCheckedChange={(value) => onSelectionChange(items, value === true)}
          disabled={submitting}
          className={cn(checkboxClass, "mt-0.5")}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="break-words text-sm font-bold text-text-primary">{item.dishName}</span>
          {item.options?.length ? (
            <span className="flex flex-wrap gap-1">
              {item.options.map((option) => (
                <span
                  key={option.id}
                  className="max-w-full break-words rounded-md bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-950"
                >
                  {option.optionItemName}
                </span>
              ))}
            </span>
          ) : null}
          {item.note ? (
            <span className="break-words rounded-md bg-amber-100 px-2 py-1 text-sm font-semibold text-amber-950">
              Ghi chú: {item.note}
            </span>
          ) : null}
          {item.isTakeAway ? (
            <span className="text-xs font-semibold text-text-primary">Mang về</span>
          ) : null}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-lg font-bold leading-none tabular-nums text-sky-950">
            ×{portions}
          </span>
          {oldestAt !== undefined ? (
            <span
              className={cn(
                "rounded-full bg-surface-muted px-2 py-1 text-xs font-semibold tabular-nums text-text-secondary",
                wait > 10 && "bg-amber-100 text-amber-950",
              )}
            >
              {wait < 1 ? "Vừa gửi" : `Chờ ${formatTimeAgo(wait)}`}
            </span>
          ) : null}
        </span>
      </label>
      <Button
        type="button"
        variant="ghost"
        aria-label={`${roundLabel} của ${dishLabel}`}
        aria-expanded={expanded}
        aria-controls={`${id}-rounds`}
        onClick={() => setExpanded(!expanded)}
        disabled={submitting}
        className="min-h-10 w-full justify-start rounded-none rounded-b-lg px-3 text-xs text-text-secondary"
      >
        <ChevronDown aria-hidden="true" className={cn("size-4", expanded && "rotate-180")} />{" "}
        {roundLabel}
      </Button>
      <ul
        id={`${id}-rounds`}
        hidden={!expanded}
        className="divide-y divide-border-default border-t border-border-default px-3"
      >
        {expanded &&
          rounds.map(([round, lines]) => {
            const roundId = `${id}-${round}`
            const timestamp = lines[0].roundTime
            return (
              <li key={round}>
                <label
                  htmlFor={roundId}
                  className="flex min-h-14 cursor-pointer items-center gap-3 text-sm"
                >
                  <Checkbox
                    id={roundId}
                    aria-label={`Chọn lượt gọi ${round} của ${dishLabel}`}
                    checked={selectionState(lines, selectedIds)}
                    className={checkboxClass}
                    disabled={submitting}
                    onCheckedChange={(value) => onSelectionChange(lines, value === true)}
                  />
                  <span className="flex-1 font-medium">Lượt gọi {round}</span>
                  {timestamp !== undefined ? (
                    <time
                      dateTime={new Date(timestamp).toISOString()}
                      className="text-xs text-text-secondary"
                    >
                      {roundClock.format(timestamp)}
                    </time>
                  ) : null}
                  <span className="font-semibold tabular-nums">×{countPortions(lines)}</span>
                </label>
              </li>
            )
          })}
      </ul>
    </li>
  )
}
