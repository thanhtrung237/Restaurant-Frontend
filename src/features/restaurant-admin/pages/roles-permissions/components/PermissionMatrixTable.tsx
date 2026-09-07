import React from "react"
import { Check, Pencil } from "lucide-react"
import type { PermissionFeatureRow, PermissionLevel } from "../types"
import { ROLE_COLUMNS } from "../mock-data"

interface PermissionMatrixTableProps {
  data: PermissionFeatureRow[]
  onEditRolePermissions?: (roleKey: string) => void
}

function PermissionBadge({ level }: { level: PermissionLevel }) {
  switch (level) {
    case "allow":
      return (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#E6F9EE] text-[#12B76A] shadow-2xs">
          <Check className="size-3.5 stroke-[2.5]" />
        </span>
      )
    case "approval":
      return (
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-[#FFF4ED] text-[#EA4A2A] font-bold text-xs">
          A
        </span>
      )
    case "readonly":
      return (
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-[#F2F4F7] text-[#667085] font-bold text-xs">
          R
        </span>
      )
    case "none":
    default:
      return <span className="text-gray-300 text-sm font-light select-none">—</span>
  }
}

export const PermissionMatrixTable: React.FC<PermissionMatrixTableProps> = ({
  data,
  onEditRolePermissions,
}) => {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-[#F9FAFB]">
              <th className="py-4 pl-6 pr-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                CHỨC NĂNG
              </th>
              {ROLE_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="py-4 px-4 text-center text-sm font-semibold text-gray-700 whitespace-nowrap"
                >
                  <div className="inline-flex items-center justify-center gap-1.5">
                    <span>{col.label}</span>
                    {col.canEdit && (
                      <button
                        type="button"
                        onClick={() => onEditRolePermissions?.(col.key)}
                        className="text-[#EA4A2A] hover:text-[#c4381b] p-0.5 rounded transition-colors cursor-pointer"
                        title={`Chỉnh sửa quyền ${col.label}`}
                      >
                        <Pencil className="size-3.5 stroke-[2.2]" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {data.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-gray-50/70 transition-colors"
              >
                {/* Tên chức năng */}
                <td className="py-3.5 pl-6 pr-4 font-semibold text-gray-900">
                  {row.feature}
                </td>

                {/* Các vai trò */}
                {ROLE_COLUMNS.map((col) => (
                  <td key={col.key} className="py-3.5 px-4 text-center">
                    <PermissionBadge level={row.roles[col.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
