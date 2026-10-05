import React from "react"
import { Plus } from "lucide-react"
import { SearchInput } from "@/components/common/SearchInput"
import { Button } from "@/components/ui/button"

interface StaffHeaderProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onAddStaff?: () => void
  /** Ẩn nút "Thêm nhân viên" ở màn chỉ xem. */
  showAddButton?: boolean
}

export const StaffHeaderActions: React.FC<StaffHeaderProps> = ({
  searchTerm,
  onSearchChange,
  onAddStaff,
  showAddButton = true,
}) => {
  return (
    // CHỈ cụm điều khiển — tiêu đề/dòng phụ do PageHeader lo.
    <>
      {/* Ô tìm là công cụ lọc bắt buộc của FR-ADM-01, giữ ở mọi kích thước */}
      <div className="w-full md:w-64 lg:w-72">
        <SearchInput
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange("")}
          placeholder="Tìm nhân viên..."
          variant="pill"
          size="default"
          className="bg-[#F3F4F6] text-sm text-gray-800 placeholder:text-gray-400 focus:bg-white"
        />
      </div>

      {/* Ở <md nút này thành FAB tại trang (xem StaffManagementPage) */}
      {showAddButton && (
        <Button
          type="button"
          onClick={onAddStaff}
          className="hidden h-10 shrink-0 gap-1.5 px-4 md:inline-flex"
        >
          <Plus className="size-4 stroke-[2.5]" />
          <span>Thêm nhân viên</span>
        </Button>
      )}
    </>
  )
}
