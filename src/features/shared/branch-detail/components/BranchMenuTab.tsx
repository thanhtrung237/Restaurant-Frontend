import React, { useState, useMemo } from "react"
import { Plus, Pencil, Utensils } from "lucide-react"
import { Chip } from "@/components/common/Chip"
import { SearchInput } from "@/components/common/SearchInput"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import type { BranchMenuItem, BranchMenuStatus } from "../types"

interface BranchMenuTabProps {
  menuItems: BranchMenuItem[]
  onCreateCustomDish?: () => void
  onEditDish?: (item: BranchMenuItem) => void
}

const CATEGORIES = ["Tất cả", "Khai vị", "Món chính", "Lẩu", "Đồ uống"]

/**
 * Tab "Menu chi nhánh"
 * Chuẩn theo file: Chi tiết chi nhánh - Menu chi nhánh.png
 */
export const BranchMenuTab: React.FC<BranchMenuTabProps> = ({
  menuItems,
  onCreateCustomDish,
  onEditDish,
}) => {
  const [selectedCategory, setSelectedCategory] = useState("Tất cả")
  const [searchQuery, setSearchQuery] = useState("")

  // Lọc món theo danh mục và từ khóa tìm kiếm
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (selectedCategory !== "Tất cả" && item.category !== selectedCategory) {
        return false
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchName = item.name.toLowerCase().includes(query)
        const matchCategory = item.category.toLowerCase().includes(query)
        if (!matchName && !matchCategory) return false
      }
      return true
    })
  }, [menuItems, selectedCategory, searchQuery])

  // Format tiền tệ
  const formatMoney = (val: number | null) => {
    if (val === null || val === undefined) return "—"
    return `${val.toLocaleString("vi-VN")}đ`
  }

  // Render badge trạng thái món
  const renderStatusBadge = (status: BranchMenuStatus) => {
    switch (status) {
      case "ORIGINAL_PRICE":
        return (
          <Badge dot variant="reserved">
            Theo giá gốc
          </Badge>
        )
      case "OVERRIDDEN_PRICE":
        return (
          <Badge dot variant="info">
            Đã đè giá
          </Badge>
        )
      case "HIDDEN":
        return (
          <Badge dot variant="warning">
            Tạm ẩn
          </Badge>
        )
      case "CUSTOM":
        return (
          <Badge dot variant="warning" className="bg-brand-primary-subtle text-brand-primary">
            Món riêng
          </Badge>
        )
    }
  }

  // Render cột chênh lệch giá
  const renderDiffText = (item: BranchMenuItem) => {
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

  return (
    <div className="space-y-4 pt-1">
      {/* Thanh công cụ: Chips danh mục (trái) + Tìm kiếm & Nút Tạo món riêng (phải) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Nhóm Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              selected={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
              className="cursor-pointer text-xs"
            >
              {cat}
            </Chip>
          ))}
        </div>

        {/* Ô tìm kiếm & Nút Tạo món riêng */}
        <div className="flex items-center gap-2.5">
          <div className="w-56 sm:w-64">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Tìm món..."
              size="default"
              variant="pill"
            />
          </div>

          <Button
            type="button"
            onClick={onCreateCustomDish}
            className="cursor-pointer gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold shrink-0"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>Tạo món riêng</span>
          </Button>
        </div>
      </div>

      {/* Bảng danh sách món */}
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
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-text-tertiary">
                  Không tìm thấy món ăn nào phù hợp với bộ lọc
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-surface-muted/30 transition-colors border-b border-border-default last:border-b-0"
                >
                  {/* Cột Món: Ảnh placeholder + Tên + Danh mục */}
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
                    {renderDiffText(item)}
                  </TableCell>

                  {/* Cột Trạng thái */}
                  <TableCell className="py-3.5 px-4 text-sm">
                    {renderStatusBadge(item.status)}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
