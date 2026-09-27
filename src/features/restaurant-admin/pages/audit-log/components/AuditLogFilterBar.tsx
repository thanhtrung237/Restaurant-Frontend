import React from "react"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AUDIT_ACTION_TYPE, AUDIT_ACTION_TYPE_LABEL } from "@/types/models"
import { AUDIT_DATE_RANGES } from "../lib"
import type {
  AuditActionFilter,
  AuditDateRangeId,
  AuditPerformerFilter,
} from "../types"

export interface AuditPerformerOption {
  value: AuditPerformerFilter
  label: string
}

interface AuditLogFilterBarProps {
  selectedAction: AuditActionFilter
  onActionChange: (action: AuditActionFilter) => void
  performerOptions: AuditPerformerOption[]
  selectedPerformer: AuditPerformerFilter
  onPerformerChange: (performer: AuditPerformerFilter) => void
  selectedDateRange: AuditDateRangeId
  onDateRangeChange: (range: AuditDateRangeId) => void
}

const ACTION_OPTIONS: { value: AuditActionFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả thao tác" },
  // Danh sách lấy từ hằng của BE (AuditAction) — không tự khai thêm giá trị nào.
  ...AUDIT_ACTION_TYPE.map((action) => ({
    value: action as AuditActionFilter,
    label: AUDIT_ACTION_TYPE_LABEL[action],
  })),
]

function FilterDropdown<T extends string | number>({
  label,
  options,
  selected,
  onSelect,
  width,
}: {
  label: string
  options: { value: T; label: string }[]
  selected: T
  onSelect: (value: T) => void
  width: string
}) {
  const current = options.find((option) => option.value === selected)?.label ?? label
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-gray-700 transition-colors hover:bg-gray-50"
        >
          <span>{current}</span>
          <ChevronDown className="ml-0.5 size-3.5 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      {/*
        `align` của `DropdownMenuContent` tự viết trong repo chỉ nhận "left" | "right" | "center"
        (mặc định "right"). Ba bộ lọc này nằm ở mép trái nên neo "left".
      */}
      <DropdownMenuContent align="left" className={width}>
        {options.map((option) => (
          <DropdownMenuItem
            key={String(option.value)}
            onClick={() => onSelect(option.value)}
            className="cursor-pointer text-sm"
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Ba bộ lọc bắt buộc của FR-LOG-01: loại thao tác, người thực hiện, khoảng thời gian. */
export const AuditLogFilterBar: React.FC<AuditLogFilterBarProps> = ({
  selectedAction,
  onActionChange,
  performerOptions,
  selectedPerformer,
  onPerformerChange,
  selectedDateRange,
  onDateRangeChange,
}) => {
  return (
    // <md: cuộn ngang thay vì xuống dòng, giữ đủ 3 bộ lọc
    <div className="flex items-center gap-3 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden">
      <FilterDropdown
        label="Tất cả thao tác"
        options={ACTION_OPTIONS}
        selected={selectedAction}
        onSelect={onActionChange}
        width="w-48"
      />
      <FilterDropdown
        label="Mọi nhân viên"
        options={performerOptions}
        selected={selectedPerformer}
        onSelect={onPerformerChange}
        width="w-56"
      />
      <FilterDropdown
        label="Khoảng thời gian"
        options={AUDIT_DATE_RANGES.map((range) => ({ value: range.id, label: range.label }))}
        selected={selectedDateRange}
        onSelect={onDateRangeChange}
        width="w-44"
      />
    </div>
  )
}
