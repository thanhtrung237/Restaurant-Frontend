import React from "react"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AuditLogFilterBarProps {
  selectedAction: string
  onActionChange: (action: string) => void
  selectedStaff: string
  onStaffChange: (staff: string) => void
  selectedDateRange: string
  onDateRangeChange: (range: string) => void
}

const ACTION_OPTIONS = [
  "Tất cả thao tác",
  "Chiết khấu",
  "Đổi giá",
  "Hủy món",
  "Mở bàn",
  "Đổi vai trò",
  "Đóng bàn",
]

const STAFF_OPTIONS = [
  "Mọi nhân viên",
  "Lê Minh Quân",
  "Nguyễn Văn Long",
  "Trần Ngọc Anh",
  "Nguyễn Văn An",
]

const DATE_RANGE_OPTIONS = [
  "Hôm nay",
  "7 ngày qua",
  "30 ngày qua",
  "Tháng này",
]

export const AuditLogFilterBar: React.FC<AuditLogFilterBarProps> = ({
  selectedAction,
  onActionChange,
  selectedStaff,
  onStaffChange,
  selectedDateRange,
  onDateRangeChange,
}) => {
  return (
    <div className="flex items-center gap-3 py-1 flex-wrap">
      {/* 1. Thao tác dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span>{selectedAction}</span>
            <ChevronDown className="size-3.5 text-gray-400 ml-0.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="left" className="w-44">
          {ACTION_OPTIONS.map((action) => (
            <DropdownMenuItem
              key={action}
              onClick={() => onActionChange(action)}
              className="cursor-pointer text-sm"
            >
              {action}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 2. Nhân viên dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span>{selectedStaff}</span>
            <ChevronDown className="size-3.5 text-gray-400 ml-0.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="left" className="w-44">
          {STAFF_OPTIONS.map((staff) => (
            <DropdownMenuItem
              key={staff}
              onClick={() => onStaffChange(staff)}
              className="cursor-pointer text-sm"
            >
              {staff}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 3. Thời gian dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span>{selectedDateRange}</span>
            <ChevronDown className="size-3.5 text-gray-400 ml-0.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="left" className="w-40">
          {DATE_RANGE_OPTIONS.map((range) => (
            <DropdownMenuItem
              key={range}
              onClick={() => onDateRangeChange(range)}
              className="cursor-pointer text-sm"
            >
              {range}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
