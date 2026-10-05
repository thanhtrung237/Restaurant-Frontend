import React from "react"
import { ChevronDown, MapPin, User } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ACCOUNT_STATUS_LABEL, type StaffStatusFilter } from "../types"

/** "ALL" = không lọc. Số = id chi nhánh / vai trò lấy từ API. */
export type StaffFilterValue = "ALL" | number

export interface StaffFilterOption {
  value: StaffFilterValue
  label: string
}

interface StaffFilterBarProps {
  statusFilter: StaffStatusFilter
  onStatusFilterChange: (status: StaffStatusFilter) => void
  branchOptions: StaffFilterOption[]
  selectedBranch: StaffFilterValue
  onBranchChange: (value: StaffFilterValue) => void
  roleOptions: StaffFilterOption[]
  selectedRole: StaffFilterValue
  onRoleChange: (value: StaffFilterValue) => void
}

const STATUS_OPTIONS: { id: StaffStatusFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "ACTIVE", label: ACCOUNT_STATUS_LABEL.ACTIVE },
  { id: "INACTIVE", label: ACCOUNT_STATUS_LABEL.INACTIVE },
]

function labelOf(options: StaffFilterOption[], value: StaffFilterValue, fallback: string): string {
  return options.find((option) => option.value === value)?.label ?? fallback
}

/**
 * Thanh lọc của bảng Nhân viên.
 *
 * Hai dropdown lấy danh sách TỪ API (`useBranchesByRestaurant`, `useRolesByRestaurant`) và
 * lọc theo **id**, không theo chuỗi nhãn: lọc theo chuỗi sẽ hỏng ngay khi một tài khoản có
 * nhiều chi nhánh.
 *
 * Đã bỏ nút "Bộ lọc" cũ: `onToggleFilter` là prop optional mà không trang nào truyền vào và
 * cũng chưa có panel nào để mở.
 */
export const StaffFilterBar: React.FC<StaffFilterBarProps> = ({
  statusFilter,
  onStatusFilterChange,
  branchOptions,
  selectedBranch,
  onBranchChange,
  roleOptions,
  selectedRole,
  onRoleChange,
}) => {
  return (
    <div className="flex flex-col justify-between gap-3 py-1 sm:flex-row sm:items-center">
      {/* Chip trạng thái */}
      <div className="flex items-center gap-2">
        {STATUS_OPTIONS.map((option) => {
          const isActive = statusFilter === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onStatusFilterChange(option.id)}
              aria-pressed={isActive}
              className={cn(
                "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#EA4A2A] text-white shadow-xs"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Dropdown Chi nhánh */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <MapPin className="size-4 text-gray-500" />
              <span>{labelOf(branchOptions, selectedBranch, "Tất cả chi nhánh")}</span>
              <ChevronDown className="ml-0.5 size-3.5 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          {/*
            `DropdownMenuContent` ở repo này là component TỰ VIẾT (components/ui/dropdown-menu.tsx),
            KHÔNG phải Radix: `align` chỉ nhận "left" | "right" | "center" và mặc định "right".
            Nên "right" là giá trị ĐÚNG, còn "start"/"end" kiểu Radix là lỗi kiểu.
          */}
          <DropdownMenuContent align="right" className="w-56">
            {branchOptions.map((option) => (
              <DropdownMenuItem
                key={String(option.value)}
                onClick={() => onBranchChange(option.value)}
                className="cursor-pointer text-sm"
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dropdown Vai trò */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <User className="size-4 text-gray-500" />
              <span>{labelOf(roleOptions, selectedRole, "Tất cả vai trò")}</span>
              <ChevronDown className="ml-0.5 size-3.5 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="right" className="w-56">
            {roleOptions.map((option) => (
              <DropdownMenuItem
                key={String(option.value)}
                onClick={() => onRoleChange(option.value)}
                className="cursor-pointer text-sm"
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
