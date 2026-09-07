import React from "react"
import { Pencil, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import type { PromotionItem, PromotionStatus } from "../types"

interface PromotionTableProps {
  promotions: PromotionItem[]
  onToggleStatus?: (id: number, newStatus: boolean) => void
  onEditPromotion?: (promotion: PromotionItem) => void
  onDeletePromotion?: (promotion: PromotionItem) => void
}

/**
 * Bảng hiển thị danh sách chương trình khuyến mãi
 * Nguồn: QuanLy/Khuyến mãi.png
 */
export const PromotionTable: React.FC<PromotionTableProps> = ({
  promotions,
  onToggleStatus,
  onEditPromotion,
  onDeletePromotion,
}) => {
  // Render badge trạng thái với dot tương ứng
  const renderStatusBadge = (status: PromotionStatus) => {
    switch (status) {
      case "RUNNING":
        return (
          <Badge dot variant="success">
            Đang chạy
          </Badge>
        )
      case "PAUSED":
        return (
          <Badge dot variant="warning">
            Tạm dừng
          </Badge>
        )
      case "EXPIRED":
        return (
          <Badge dot variant="reserved">
            Hết hạn
          </Badge>
        )
    }
  }

  return (
    <div className="overflow-hidden rounded-card border border-border-default bg-surface-card shadow-2xs">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-muted/40 hover:bg-surface-muted/40 border-b border-border-default">
            <TableHead className="py-3.5 pl-6 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
              CHƯƠNG TRÌNH
            </TableHead>
            <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
              LOẠI
            </TableHead>
            <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
              PHẠM VI
            </TableHead>
            <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
              ĐIỀU KIỆN
            </TableHead>
            <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase text-center">
              ƯU TIÊN
            </TableHead>
            <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
              TRẠNG THÁI
            </TableHead>
            <TableHead className="py-3.5 pr-6 pl-4 text-right text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
              THAO TÁC
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {promotions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center text-text-tertiary">
                Chưa có chương trình khuyến mãi nào được tạo
              </TableCell>
            </TableRow>
          ) : (
            promotions.map((promo) => (
              <TableRow
                key={promo.id}
                className="hover:bg-surface-muted/30 transition-colors border-b border-border-default last:border-b-0"
              >
                {/* 1. Cột CHƯƠNG TRÌNH (Tên + thời gian áp dụng) */}
                <TableCell className="py-4 pl-6">
                  <div>
                    <p className="font-semibold text-text-primary text-sm tracking-tight leading-snug">
                      {promo.name}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {promo.timeRange}
                    </p>
                  </div>
                </TableCell>

                {/* 2. Cột LOẠI */}
                <TableCell className="py-4 px-4 text-sm text-text-secondary">
                  {promo.type}
                </TableCell>

                {/* 3. Cột PHẠM VI (Badge phạm vi) */}
                <TableCell className="py-4 px-4">
                  {promo.isSystemScope ? (
                    <span className="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium bg-brand-primary-subtle text-brand-primary">
                      {promo.scope}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium bg-surface-muted text-text-secondary">
                      {promo.scope}
                    </span>
                  )}
                </TableCell>

                {/* 4. Cột ĐIỀU KIỆN */}
                <TableCell className="py-4 px-4 text-sm text-text-secondary">
                  {promo.condition}
                </TableCell>

                {/* 5. Cột ƯU TIÊN (Badge số tròn) */}
                <TableCell className="py-4 px-4">
                  <div className="flex justify-center">
                    <span className="size-6 rounded-full bg-brand-primary-subtle text-brand-primary font-semibold text-xs flex items-center justify-center">
                      {promo.priority}
                    </span>
                  </div>
                </TableCell>

                {/* 6. Cột TRẠNG THÁI */}
                <TableCell className="py-4 px-4">
                  {renderStatusBadge(promo.status)}
                </TableCell>

                {/* 7. Cột THAO TÁC (Switch + Nút sửa + Nút xoá) */}
                <TableCell className="py-4 pr-6 pl-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {/* Switch bật / tắt */}
                    <Switch
                      checked={promo.isActive}
                      onCheckedChange={(checked) => onToggleStatus?.(promo.id, checked)}
                      className="cursor-pointer data-[state=checked]:bg-status-success"
                      aria-label={`Bật tắt khuyến mãi ${promo.name}`}
                    />

                    {/* Nút chỉnh sửa */}
                    <button
                      type="button"
                      onClick={() => onEditPromotion?.(promo)}
                      className="size-8 rounded-lg border border-border-default bg-surface-card text-text-secondary hover:text-text-primary hover:bg-surface-muted flex items-center justify-center transition-colors cursor-pointer"
                      title="Chỉnh sửa khuyến mãi"
                      aria-label="Chỉnh sửa khuyến mãi"
                    >
                      <Pencil className="size-3.5" />
                    </button>

                    {/* Nút xoá */}
                    <button
                      type="button"
                      onClick={() => onDeletePromotion?.(promo)}
                      className="size-8 rounded-lg border border-border-default bg-surface-card text-status-danger hover:bg-status-danger-subtle hover:border-status-danger/30 flex items-center justify-center transition-colors cursor-pointer"
                      title="Xoá khuyến mãi"
                      aria-label="Xoá khuyến mãi"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
