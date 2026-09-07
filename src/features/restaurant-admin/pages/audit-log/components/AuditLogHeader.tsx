import React from "react"
import { Download } from "lucide-react"

interface AuditLogHeaderProps {
  onExportLog?: () => void
}

export const AuditLogHeader: React.FC<AuditLogHeaderProps> = ({ onExportLog }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Nhật ký hoạt động</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Ghi vết mọi thao tác đổi tiền / trạng thái — giá trị trước, sau, người duyệt (BR-12)
        </p>
      </div>

      <button
        type="button"
        onClick={onExportLog}
        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium text-sm rounded-xl transition-all shadow-2xs cursor-pointer shrink-0 self-start sm:self-auto"
      >
        <Download className="size-4 text-gray-500" />
        <span>Xuất log</span>
      </button>
    </div>
  )
}
