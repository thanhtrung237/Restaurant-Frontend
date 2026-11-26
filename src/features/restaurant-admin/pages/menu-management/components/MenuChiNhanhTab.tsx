import React, { useState, useMemo } from "react"
import { Pencil, Utensils } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Chip } from "@/components/common/Chip"
import { IconButton } from "@/components/ui/icon-button"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import type { BranchDishItem } from "../types"

/**
 * Bộ lọc nhanh của bản mobile (Figma "Menu chi nhánh · Mobile (375)"). Bản PC dùng bảng
 * đủ cột nên nhìn ra ngay món nào đè giá / tạm ẩn, không cần lọc.
 */
type BranchMenuFilter = "all" | "overridden" | "hidden" | "custom"

const BRANCH_MENU_FILTERS: Array<{ key: BranchMenuFilter; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "overridden", label: "Đã đè giá" },
  { key: "hidden", label: "Tạm ẩn" },
  { key: "custom", label: "Món riêng" },
]

/** Suy trạng thái của một món từ `diffText` / `isCustom` — cùng nguồn với cột bảng. */
function matchesFilter(item: BranchDishItem, filter: BranchMenuFilter): boolean {
  switch (filter) {
    case "custom":
      return Boolean(item.isCustom) || item.diffText === "món riêng"
    case "hidden":
      return item.diffText === "ẩn tại CN này"
    case "overridden":
      return item.diffText.startsWith("+") || item.diffText.startsWith("-")
    case "all":
    default:
      return true
  }
}

interface MenuChiNhanhTabProps {
  branchDishes: BranchDishItem[]
  selectedBranch: string
  onToggleStatus?: (id: number, status: boolean) => void
  onEditDish?: (dish: BranchDishItem) => void
}

/**
 * Tab "Menu chi nhánh"
 * Chuẩn theo file: QuanLy/Menu chi nhánh.png
 */
export const MenuChiNhanhTab: React.FC<MenuChiNhanhTabProps> = ({
  branchDishes,
  onToggleStatus,
  onEditDish,
}) => {
  const [items, setItems] = useState<BranchDishItem[]>(branchDishes)
  const [filter, setFilter] = useState<BranchMenuFilter>("all")

  // Chỉ dùng cho bản card ở <md; bản bảng ở md+ vẫn hiện đủ để không đổi thiết kế PC.
  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [items, filter],
  )

  const handleToggle = (id: number, newStatus: boolean) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, isAvailable: newStatus } : it)))
    onToggleStatus?.(id, newStatus)
  }

  const formatMoney = (val: number | null) => {
    if (val === null || val === undefined) return "—"
    return `${val.toLocaleString("vi-VN")}đ`
  }

  // Render cột chênh lệch giá
  const renderDiff = (item: BranchDishItem) => {
    if (item.diffText === "—") {
      return <span className="text-text-tertiary">—</span>
    }
    if (item.diffText.startsWith("-")) {
      return <span className="font-semibold text-status-success">{item.diffText}</span>
    }
    if (item.diffText.startsWith("+")) {
      return <span className="font-semibold text-brand-primary">{item.diffText}</span>
    }
    if (item.diffText === "ẩn tại CN này") {
      return <span className="font-medium text-status-warning">{item.diffText}</span>
    }
    if (item.diffText === "món riêng") {
      return <span className="font-medium text-brand-primary">{item.diffText}</span>
    }
    return <span className="text-text-secondary">{item.diffText}</span>
  }

  // Render cột trạng thái
  const renderStatus = (item: BranchDishItem) => {
    if (item.isCustom) {
      return (
        <Badge
          dot
          variant="warning"
          className="bg-brand-primary-subtle text-brand-primary font-medium"
        >
          Món riêng
        </Badge>
      )
    }

    return (
      <div className="flex items-center gap-2.5">
        <Switch
          checked={item.isAvailable}
          onCheckedChange={(checked) => handleToggle(item.id, checked)}
          className="cursor-pointer data-[state=checked]:bg-status-success"
        />
        <span
          className={`text-sm font-medium ${
            item.isAvailable ? "text-status-success" : "text-text-tertiary"
          }`}
        >
          {item.isAvailable ? "Còn hàng" : "Hết hàng"}
        </span>
      </div>
    )
  }

  return (
    <div className="pt-1">
      {/* ===== <md: chip lọc + danh sách card (Figma "Menu chi nhánh · Mobile") ===== */}
      <div className="space-y-4 md:hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-md:flex-wrap max-md:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                key={item.id}
                className="rounded-card border border-border-default bg-surface-card p-4 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold leading-snug text-text-primary">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-tertiary">{item.category}</p>
                  </div>
                  <IconButton
                    type="button"
                    variant="row"
                    size="row"
                    onClick={() => onEditDish?.(item)}
                    className="size-8.5 shrink-0 rounded-xl text-text-secondary hover:text-text-primary cursor-pointer"
                    title="Chỉnh sửa món"
                    aria-label={`Chỉnh sửa ${item.name}`}
                  >
                    <Pencil />
                  </IconButton>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                      Giá gốc
                    </dt>
                    <dd className="mt-1 text-text-secondary">{formatMoney(item.originalPrice)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                      Giá CN
                    </dt>
                    <dd className="mt-1 font-semibold text-text-primary">
                      {formatMoney(item.branchPrice)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                      Chênh lệch
                    </dt>
                    <dd className="mt-1">{renderDiff(item)}</dd>
                  </div>
                </dl>

                {/* Báo hết / mở bán lại tại chi nhánh (FR-MNU-03) — giữ ngay trong card */}
                <div className="mt-3 border-t border-border-default pt-3">{renderStatus(item)}</div>
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
                GIÁ GỐC
              </TableHead>
              <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                GIÁ CHI NHÁNH
              </TableHead>
              <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                CHÊNH LỆCH
              </TableHead>
              <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                TRẠNG THÁI
              </TableHead>
              <TableHead className="py-3.5 pr-6 pl-4 text-right text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
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
                        {item.name}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">{item.category}</p>
                    </div>
                  </div>
                </TableCell>

                {/* Cột Giá gốc */}
                <TableCell className="py-3.5 px-4 text-sm text-text-secondary">
                  {formatMoney(item.originalPrice)}
                </TableCell>

                {/* Cột Giá chi nhánh */}
                <TableCell className="py-3.5 px-4 text-sm font-semibold text-text-primary">
                  {formatMoney(item.branchPrice)}
                </TableCell>

                {/* Cột Chênh lệch */}
                <TableCell className="py-3.5 px-4 text-sm">{renderDiff(item)}</TableCell>

                {/* Cột Trạng thái */}
                <TableCell className="py-3.5 px-4 text-sm">{renderStatus(item)}</TableCell>

                {/* Cột Thao tác */}
                <TableCell className="py-3.5 pr-6 pl-4 text-right">
                  <IconButton
                    type="button"
                    variant="row"
                    size="row"
                    onClick={() => onEditDish?.(item)}
                    className="cursor-pointer"
                    title="Chỉnh sửa món"
                    aria-label="Chỉnh sửa món"
                  >
                    <Pencil />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
