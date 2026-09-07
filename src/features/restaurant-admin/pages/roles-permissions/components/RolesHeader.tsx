import React from "react"
import { Plus } from "lucide-react"

interface RolesHeaderProps {
  totalRoles?: number
  onCreateRole?: () => void
}

export const RolesHeader: React.FC<RolesHeaderProps> = ({
  totalRoles = 6,
  onCreateRole,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vai trò & phân quyền</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {totalRoles} vai trò mặc định · chỉnh quyền theo chức năng
        </p>
      </div>

      <button
        type="button"
        onClick={onCreateRole}
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#EA4A2A] hover:bg-[#d93f20] text-white font-medium text-sm rounded-xl transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
      >
        <Plus className="size-4 stroke-[2.5]" />
        <span>Tạo vai trò</span>
      </button>
    </div>
  )
}
