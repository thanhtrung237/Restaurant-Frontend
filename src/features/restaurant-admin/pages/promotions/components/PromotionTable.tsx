import React, { useState } from "react"
import { Pencil, Trash2, Tag, AlertTriangle } from "lucide-react"
import { IconButton } from "@/components/ui/icon-button"
import { EmptyState } from "@/components/common/EmptyState"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Promotion } from "@/types/models"
import { 
  getPromotionDisplayStatus, 
  formatUsageDisplay,
  formatDateForDisplay 
} from "@/lib/promotion-format"

interface PromotionTableProps {
  promotions: Promotion[]
  onToggleStatus?: (id: number, newStatus: boolean) => void
  onEditPromotion?: (promotion: Promotion) => void
  onDeletePromotion?: (promotion: Promotion) => void
  onCreatePromotion?: () => void
  isUpdating?: boolean
}

function formatBriefRule(promo: Promotion): string {
  const isDish = promo.applyLevel === "ITEM"
  let actionText = ""
  let conditionText = ""

  if (promo.action) {
    try {
      const act = JSON.parse(promo.action)
      const type = act.type || act.actionType
      if (type === "percentage") {
        const val = act.value ?? act.discountPercent ?? 0
        actionText = `Giảm ${val}%`
      } else if (type === "gift_dish") {
        actionText = `Mua ${act.buyQty || 2} tặng ${act.getQty || 1}`
      } else {
        const val = Number(act.value ?? act.discountAmount ?? 0)
        actionText = val > 0 ? `Giảm ${val.toLocaleString("vi-VN")}đ` : "Giảm giá"
      }
    } catch {
      actionText = ""
    }
  }

  if (promo.condition) {
    try {
      const cond = JSON.parse(promo.condition)
      if (isDish) {
        if (cond.target === "category" && Array.isArray(cond.categoryIds) && cond.categoryIds.length > 0) {
          conditionText = `${cond.categoryIds.length} danh mục`
        } else if (cond.target === "specific_dish" && Array.isArray(cond.dishIds) && cond.dishIds.length > 0) {
          conditionText = `${cond.dishIds.length} món cụ thể`
        } else {
          conditionText = "Tất cả món"
        }
        const minQ = cond.minQty || cond.minQuantity
        if (minQ && minQ > 1) {
          conditionText += ` (từ ${minQ} món)`
        }
      } else {
        const minOrder = cond.minOrderValue || cond.minTotal
        if (minOrder && Number(minOrder) > 0) {
          conditionText = `Đơn từ ${Number(minOrder).toLocaleString("vi-VN")}đ`
        } else {
          conditionText = "Toàn hóa đơn"
        }
      }
    } catch {
      conditionText = ""
    }
  }

  if (actionText && conditionText) {
    return `${actionText} · ${conditionText}`
  }
  return actionText || conditionText || (isDish ? "Khuyến mãi món" : "Khuyến mãi hóa đơn")
}

/**
 * Bảng hiển thị danh sách chương trình khuyến mãi
 * Thể hiện rõ Cấp (Món / Hóa đơn), quy tắc tóm tắt, tự làm mới lượt và hộp thoại xác nhận xóa.
 */
export const PromotionTable: React.FC<PromotionTableProps> = ({
  promotions,
  onToggleStatus,
  onEditPromotion,
  onDeletePromotion,
  onCreatePromotion,
  isUpdating,
}) => {
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null)

  const renderStatusBadge = (promotion: Promotion) => {
    const { status, label } = getPromotionDisplayStatus(promotion)
    
    const variantMap = {
      RUNNING: "success" as const,
      PAUSED: "warning" as const,
      EXPIRED: "reserved" as const,
      OUT_OF_USES: "danger" as const,
    }

    return (
      <Badge dot variant={variantMap[status]}>
        {label}
      </Badge>
    )
  }

  const handleDeleteClick = (promo: Promotion) => {
    setDeleteTarget(promo)
  }

  const handleConfirmDelete = () => {
    if (deleteTarget && onDeletePromotion) {
      onDeletePromotion(deleteTarget)
    }
    setDeleteTarget(null)
  }

  const hasUsage = deleteTarget ? (deleteTarget.usageCount ?? 0) > 0 : false

  return (
    <>
      <div className="overflow-hidden rounded-card border border-border-default bg-surface-card shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-muted/40 hover:bg-surface-muted/40 border-b border-border-default">
              <TableHead className="py-3.5 pl-6 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                CHƯƠNG TRÌNH & CẤP ÁP DỤNG
              </TableHead>
              <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                LƯỢT SỬ DỤNG
              </TableHead>
              <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                PHẠM VI
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
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={Tag}
                    title="Chưa có chương trình khuyến mãi"
                    description="Tạo chương trình đầu tiên để hệ thống tự động áp dụng khi khách đủ điều kiện."
                    action={
                      onCreatePromotion
                        ? { label: "+ Tạo khuyến mãi", onClick: onCreatePromotion }
                        : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              promotions.map((promo) => {
                const isActive = promo.status === "ACTIVE"
                const displayStatus = getPromotionDisplayStatus(promo)
                const usageDisplay = formatUsageDisplay(promo.usageCount, promo.usageLimit)
                const isDish = promo.applyLevel === "ITEM"
                const briefRule = formatBriefRule(promo)
                
                return (
                  <TableRow
                    key={promo.id}
                    className="hover:bg-surface-muted/30 transition-colors border-b border-border-default last:border-b-0"
                  >
                    {/* 1. Cột CHƯƠNG TRÌNH (Tên + Cấp + Tóm tắt quy tắc + Thời gian + Code) */}
                    <TableCell className="py-4 pl-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-text-primary text-sm tracking-tight leading-snug">
                            {promo.name}
                          </p>
                          <Badge variant={isDish ? "secondary" : "default"} className="text-[11px] py-0 px-2 font-semibold">
                            {isDish ? "Cấp Món" : "Cấp Hóa đơn"}
                          </Badge>
                          {promo.code && (
                            <span className="text-[11px] bg-brand-primary-subtle text-brand-primary font-mono px-1.5 py-0.5 rounded font-semibold">
                              {promo.code}
                            </span>
                          )}
                        </div>

                        {/* Tóm tắt quy tắc */}
                        <p className="text-xs font-medium text-brand-primary leading-tight">
                          {briefRule}
                        </p>

                        {/* Thời gian */}
                        <p className="text-[11px] text-text-tertiary">
                          {formatDateForDisplay(promo.startDate)} – {formatDateForDisplay(promo.endDate)}
                          {promo.timeWindow ? ` · ${promo.timeWindow}` : ""}
                          {promo.daysOfWeek ? ` · ${promo.daysOfWeek}` : ""}
                        </p>
                      </div>
                    </TableCell>

                    {/* 2. Cột LƯỢT SỬ DỤNG */}
                    <TableCell className="py-4 px-4 text-sm text-text-secondary font-mono">
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-primary">{usageDisplay}</span>
                        {promo.usageLimit != null && (
                          <span className="text-[11px] text-text-tertiary">
                            {Math.round(((promo.usageCount || 0) / promo.usageLimit) * 100)}% đã dùng
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* 3. Cột PHẠM VI */}
                    <TableCell className="py-4 px-4">
                      {promo.allBranches ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-brand-primary-subtle text-brand-primary">
                          Toàn hệ thống
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-surface-muted text-text-secondary">
                          {promo.branchIds?.length || 0} chi nhánh
                        </span>
                      )}
                    </TableCell>

                    {/* 4. Cột ƯU TIÊN (Badge số tròn) */}
                    <TableCell className="py-4 px-4">
                      <div className="flex justify-center">
                        <span className="size-6 rounded-full bg-brand-primary-subtle text-brand-primary font-bold text-xs flex items-center justify-center" title="Độ ưu tiên (BR-23)">
                          {promo.priority ?? 0}
                        </span>
                      </div>
                    </TableCell>

                    {/* 5. Cột TRẠNG THÁI */}
                    <TableCell className="py-4 px-4">
                      {renderStatusBadge(promo)}
                    </TableCell>

                    {/* 6. Cột THAO TÁC (Switch + Nút sửa + Nút xoá) */}
                    <TableCell className="py-4 pr-6 pl-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {/* Switch bật / tắt */}
                        <Switch
                          checked={isActive}
                          onCheckedChange={(checked) => onToggleStatus?.(promo.id, checked)}
                          className="cursor-pointer data-[state=checked]:bg-status-success"
                          aria-label={`Bật tắt khuyến mãi ${promo.name}`}
                          disabled={isUpdating || displayStatus.status === "EXPIRED"}
                          title={isActive ? "Tạm dừng chương trình" : "Kích hoạt chương trình"}
                        />

                        {/* Nút chỉnh sửa */}
                        <IconButton
                          variant="row"
                          size="row"
                          onClick={() => onEditPromotion?.(promo)}
                          className="cursor-pointer"
                          title="Chỉnh sửa khuyến mãi"
                          aria-label={`Chỉnh sửa ${promo.name}`}
                          disabled={isUpdating}
                        >
                          <Pencil />
                        </IconButton>

                        {/* Nút xoá */}
                        <IconButton
                          variant="row-danger"
                          size="row"
                          onClick={() => handleDeleteClick(promo)}
                          className="cursor-pointer"
                          title="Xoá khuyến mãi"
                          aria-label={`Xoá ${promo.name}`}
                          disabled={isUpdating}
                        >
                          <Trash2 />
                        </IconButton>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Hộp thoại xác nhận xóa khuyến mãi */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-status-danger-subtle text-status-danger">
                <AlertTriangle className="size-5" />
              </span>
              <AlertDialogTitle>
                {hasUsage ? "Không thể xóa khuyến mãi đã dùng" : "Xác nhận xóa khuyến mãi?"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2 text-sm text-text-secondary">
              {hasUsage ? (
                <>
                  Chương trình <strong className="text-text-primary">"{deleteTarget?.name}"</strong> đã phát sinh{" "}
                  <strong className="text-status-danger">{deleteTarget?.usageCount} lượt sử dụng</strong>. Để đảm bảo toàn vẹn dữ liệu lịch sử hóa đơn, bạn không thể xóa chương trình này.
                  <br /><br />
                  Vui lòng chuyển trạng thái sang <strong className="text-text-primary">Tạm dừng (tắt switch)</strong> nếu muốn ngừng áp dụng.
                </>
              ) : (
                <>
                  Bạn có chắc chắn muốn xóa chương trình khuyến mãi{" "}
                  <strong className="text-text-primary">"{deleteTarget?.name}"</strong>? Hành động này không thể hoàn tác.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {hasUsage ? "Đã hiểu" : "Huỷ"}
            </AlertDialogCancel>
            {!hasUsage && (
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-status-danger hover:bg-status-danger/90 text-white"
              >
                Xóa vĩnh viễn
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
