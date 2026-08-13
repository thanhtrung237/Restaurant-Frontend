import React from "react"
import { Filter, MapPin, User, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { StaffStatusFilter } from "../types"

interface StaffFilterBarProps {
  statusFilter: StaffStatusFilter
  onStatusFilterChange: (status: StaffStatusFilter) => void
  selectedBranch: string
  onBranchChange: (branch: string) => void
  selectedRole: string
  onRoleChange: (role: string) => void
  onToggleFilter?: () => void
}

const STATUS_OPTIONS: { id: StaffStatusFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "ACTIVE", label: "Đang hoạt động" },
  { id: "LOCKED", label: "Tạm khoá" },
]

const BRANCH_OPTIONS = [
  "Tất cả chi nhánh",
  "Quận 1",
  "Quận 3",
  "Thủ Đức",
]

const ROLE_OPTIONS = [
  "Tất cả vai trò",
  "Phục vụ",
  "Thu ngân",
  "Quản lý chi nhánh",
]

export const StaffFilterBar: React.FC<StaffFilterBarProps> = ({
  statusFilter,
  onStatusFilterChange,
  selectedBranch,
  onBranchChange,
  selectedRole,
  onRoleChange,
  onToggleFilter,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
      {/* Status pills */}
      <div className="flex items-center gap-2">
        {STATUS_OPTIONS.map((option) => {
          const isActive = statusFilter === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onStatusFilterChange(option.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-[#EA4A2A] text-white shadow-xs"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {/* Filter controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Bộ lọc button */}
        <button
          type="button"
          onClick={onToggleFilter}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <Filter className="size-4 text-gray-500" />
          <span>Bộ lọc</span>
        </button>

        {/* Dropdown Chi nhánh */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <MapPin className="size-4 text-gray-500" />
              <span>{selectedBranch}</span>
              <ChevronDown className="size-3.5 text-gray-400 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="right" className="w-44">
            {BRANCH_OPTIONS.map((branch) => (
              <DropdownMenuItem
                key={branch}
                onClick={() => onBranchChange(branch)}
                className="cursor-pointer text-sm"
              >
                {branch}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dropdown Vai trò */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <User className="size-4 text-gray-500" />
              <span>{selectedRole}</span>
              <ChevronDown className="size-3.5 text-gray-400 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="right" className="w-44">
            {ROLE_OPTIONS.map((role) => (
              <DropdownMenuItem
                key={role}
                onClick={() => onRoleChange(role)}
                className="cursor-pointer text-sm"
              >
                {role}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
