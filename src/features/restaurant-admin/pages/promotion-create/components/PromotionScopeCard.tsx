import React from "react"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import type { BranchListItem } from "@/types/models"

interface PromotionScopeCardProps {
  isAllBranches: boolean
  onToggleAllBranches: (checked: boolean) => void
  selectedBranchIds: number[]
  onToggleBranch: (branchId: number, checked: boolean) => void
  priority: string
  onPriorityChange: (val: string) => void
  isActiveNow: boolean
  onIsActiveNowChange: (val: boolean) => void
  branches: BranchListItem[]
  isLoadingBranches?: boolean
}

/**
 * Card "Phạm vi & ưu tiên"
 * Nguồn: QuanLy/Tạo khuyến mãi.png (Cột phải - Card 2)
 */
export const PromotionScopeCard: React.FC<PromotionScopeCardProps> = ({
  isAllBranches,
  onToggleAllBranches,
  selectedBranchIds,
  onToggleBranch,
  priority,
  onPriorityChange,
  isActiveNow,
  onIsActiveNowChange,
  branches,
  isLoadingBranches,
}) => {
  return (
    <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-6">
      <h2 className="text-base font-bold text-text-primary tracking-tight">Phạm vi & ưu tiên</h2>

      {/* Chi nhánh áp dụng */}
      <FormField label="Chi nhánh áp dụng" required>
        <div className="space-y-3 pt-1">
          {/* Checkbox Toàn hệ thống */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="branch-all"
              checked={isAllBranches}
              onCheckedChange={(checked) => onToggleAllBranches(checked === true)}
              className="cursor-pointer"
            />
            <label
              htmlFor="branch-all"
              className="text-sm font-bold text-text-primary cursor-pointer select-none"
            >
              Toàn hệ thống (tất cả chi nhánh)
            </label>
          </div>

          {/* Danh sách từng chi nhánh */}
          {isLoadingBranches ? (
            <div className="pl-7 text-sm text-text-tertiary">Đang tải...</div>
          ) : branches.length === 0 ? (
            <div className="pl-7 text-sm text-text-tertiary">Không có chi nhánh nào</div>
          ) : (
            <div className="space-y-2.5 pl-7">
              {branches.map((branch) => {
                const isChecked = selectedBranchIds.includes(branch.id)
                return (
                  <div key={branch.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`branch-${branch.id}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => onToggleBranch(branch.id, checked === true)}
                      className="cursor-pointer"
                    />
                    <label
                      htmlFor={`branch-${branch.id}`}
                      className="text-sm font-medium text-text-secondary cursor-pointer select-none"
                    >
                      {branch.name}
                    </label>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </FormField>

      {/* Độ ưu tiên (số lớn = ưu tiên cao) */}
      <FormField
        label="Độ ưu tiên (số lớn = ưu tiên cao)"
        htmlFor="promo-priority"
        helperText="Mặc định = 0. Số càng lớn càng ưu tiên áp dụng trước."
      >
        <Input
          id="promo-priority"
          type="number"
          min={0}
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value)}
          placeholder="0"
        />
      </FormField>

      {/* Switch Kích hoạt ngay */}
      <div className="flex items-center gap-3 pt-2">
        <Switch
          id="is-active-now"
          checked={isActiveNow}
          onCheckedChange={onIsActiveNowChange}
          className="cursor-pointer data-[state=checked]:bg-status-success"
        />
        <label
          htmlFor="is-active-now"
          className="text-sm font-medium text-text-primary cursor-pointer select-none"
        >
          Kích hoạt ngay
        </label>
      </div>
    </div>
  )
}
