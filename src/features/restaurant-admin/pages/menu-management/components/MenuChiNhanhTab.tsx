import React, { useState } from "react"
import { Pencil, Utensils } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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

  const handleToggle = (id: number, newStatus: boolean) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isAvailable: newStatus } : it))
    )
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
        <Badge dot variant="warning" className="bg-brand-primary-subtle text-brand-primary font-medium">
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
      <div className="overflow-hidden rounded-card border border-border-default bg-surface-card shadow-2xs">
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
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {item.category}
                      </p>
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
                <TableCell className="py-3.5 px-4 text-sm">
                  {renderDiff(item)}
                </TableCell>

                {/* Cột Trạng thái */}
                <TableCell className="py-3.5 px-4 text-sm">
                  {renderStatus(item)}
                </TableCell>

                {/* Cột Thao tác */}
                <TableCell className="py-3.5 pr-6 pl-4 text-right">
                  <IconButton
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={() => onEditDish?.(item)}
                    className="rounded-xl text-text-secondary hover:text-text-primary cursor-pointer size-8.5"
                    title="Chỉnh sửa món"
                    aria-label="Chỉnh sửa món"
                  >
                    <Pencil className="size-3.5" />
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
