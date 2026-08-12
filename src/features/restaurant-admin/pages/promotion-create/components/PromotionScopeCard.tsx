import React from "react"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"

interface PromotionScopeCardProps {
  isAllBranches: boolean
  onToggleAllBranches: (checked: boolean) => void
  selectedBranches: string[]
  onToggleBranch: (branch: string, checked: boolean) => void
  priority: string
  onPriorityChange: (val: string) => void
  isActiveNow: boolean
  onIsActiveNowChange: (val: boolean) => void
}

const AVAILABLE_BRANCHES = [
  "Chi nhánh Quận 1",
  "Chi nhánh Quận 3",
  "Chi nhánh Thủ Đức",
]

/**
 * Card "Phạm vi & ưu tiên"
 * Nguồn: QuanLy/Tạo khuyến mãi.png (Cột phải - Card 2)
 */
export const PromotionScopeCard: React.FC<PromotionScopeCardProps> = ({
  isAllBranches,
  onToggleAllBranches,
  selectedBranches,
  onToggleBranch,
  priority,
  onPriorityChange,
  isActiveNow,
  onIsActiveNowChange,
}) => {
  return (
    <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-6">
      <h2 className="text-base font-bold text-text-primary tracking-tight">
        Phạm vi & ưu tiên
      </h2>

      {/* Chi nhánh áp dụng */}
      <FormField label="Chi nhánh áp dụng">
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
          <div className="space-y-2.5 pl-7">
            {AVAILABLE_BRANCHES.map((branch) => {
              const isChecked = selectedBranches.includes(branch)
              return (
                <div key={branch} className="flex items-center gap-3">
                  <Checkbox
                    id={`branch-${branch}`}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      onToggleBranch(branch, checked === true)
                    }
                    className="cursor-pointer"
                  />
                  <label
                    htmlFor={`branch-${branch}`}
                    className="text-sm font-medium text-text-secondary cursor-pointer select-none"
                  >
                    {branch}
                  </label>
                </div>
              )
            })}
          </div>
        </div>
      </FormField>

      {/* Độ ưu tiên (số lớn = ưu tiên cao) */}
      <FormField
        label="Độ ưu tiên (số lớn = ưu tiên cao)"
        htmlFor="promo-priority"
      >
        <Input
          id="promo-priority"
          type="number"
          min={1}
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value)}
          placeholder="1"
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
