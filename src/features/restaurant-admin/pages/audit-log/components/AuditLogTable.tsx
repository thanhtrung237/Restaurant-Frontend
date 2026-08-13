import React from "react"
import type { AuditLogItem, AuditActionType } from "../types"

interface AuditLogTableProps {
  logs: AuditLogItem[]
}

function ActionBadge({ type, label }: { type: AuditActionType; label: string }) {
  switch (type) {
    case "DISCOUNT":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4ED] px-3 py-1 text-xs font-medium text-[#D97706]">
          <span className="size-1.5 rounded-full bg-[#D97706]" />
          {label}
        </span>
      )
    case "CHANGE_PRICE":
    case "CHANGE_ROLE":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF8FF] px-3 py-1 text-xs font-medium text-[#175CD3]">
          <span className="size-1.5 rounded-full bg-[#175CD3]" />
          {label}
        </span>
      )
    case "CANCEL_ITEM":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3F2] px-3 py-1 text-xs font-medium text-[#B42318]">
          <span className="size-1.5 rounded-full bg-[#D92D20]" />
          {label}
        </span>
      )
    case "OPEN_TABLE":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-medium text-[#027A48]">
          <span className="size-1.5 rounded-full bg-[#12B76A]" />
          {label}
        </span>
      )
    case "CLOSE_TABLE":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F2F4F7] px-3 py-1 text-xs font-medium text-[#475467]">
          <span className="size-1.5 rounded-full bg-[#667085]" />
          {label}
        </span>
      )
  }
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ logs }) => {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-[#F9FAFB]">
              <th className="py-4 pl-6 pr-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                THỜI ĐIỂM
              </th>
              <th className="py-4 px-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                NGƯỜI THỰC HIỆN
              </th>
              <th className="py-4 px-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                CHI NHÁNH
              </th>
              <th className="py-4 px-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                THAO TÁC
              </th>
              <th className="py-4 px-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                THAY ĐỔI (TRƯỚC → SAU)
              </th>
              <th className="py-4 pl-4 pr-6 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                NGƯỜI DUYỆT
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  Không tìm thấy nhật ký hoạt động nào phù hợp với bộ lọc
                </td>
              </tr>
            ) : (
              logs.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50/70 transition-colors"
                >
                  {/* Cột Thời điểm */}
                  <td className="py-4 pl-6 pr-4">
                    <p className="font-semibold text-gray-900">{item.time}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.date}</p>
                  </td>

                  {/* Cột Người thực hiện */}
                  <td className="py-4 px-4">
                    <p className="font-semibold text-gray-900">{item.performedByName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.performedByRole}</p>
                  </td>

                  {/* Cột Chi nhánh */}
                  <td className="py-4 px-4 text-gray-700 font-normal">
                    {item.branchName}
                  </td>

                  {/* Cột Thao tác */}
                  <td className="py-4 px-4">
                    <ActionBadge type={item.actionType} label={item.actionLabel} />
                  </td>

                  {/* Cột Thay đổi */}
                  <td className="py-4 px-4 text-gray-700 font-normal">
                    {item.changeDescription}
                  </td>

                  {/* Cột Người duyệt */}
                  <td className="py-4 pl-4 pr-6">
                    {item.approvedByName ? (
                      <span className="font-medium text-gray-900">
                        {item.approvedByName}
                      </span>
                    ) : (
                      <span className="text-gray-400 select-none">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
