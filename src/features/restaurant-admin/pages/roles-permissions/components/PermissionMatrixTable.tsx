import React from "react"
import { PermissionBadge } from "./PermissionBadge"
import type { PermissionMatrixSection } from "../types"

interface PermissionMatrixTableProps {
  section: PermissionMatrixSection
}

/**
 * Ma trận quyền dạng BẢNG — dùng ở md+.
 *
 * CHỈ ĐỌC: không có nút sửa quyền trên đầu cột. Backend không có bảng quyền nên không có
 * gì để lưu; quyền cố định theo đặc tả (xem `permission-matrix.ts`).
 */
export const PermissionMatrixTable: React.FC<PermissionMatrixTableProps> = ({ section }) => {
  const rowNotes = section.rows.filter((row) => row.cellNotes)

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 bg-[#F9FAFB] px-6 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
        <span className="text-xs text-gray-500">{section.source}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-3.5 pl-6 pr-4 text-[11px] font-semibold tracking-wider text-gray-500">
                CHỨC NĂNG
              </th>
              {section.columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3.5 text-center text-sm font-semibold whitespace-nowrap text-gray-700"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {section.rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-gray-50/70">
                <td className="py-3.5 pl-6 pr-4">
                  <span className="font-semibold text-gray-900">{row.feature}</span>
                  {row.note ? (
                    <span className="mt-0.5 block text-xs font-normal text-gray-400">
                      {row.note}
                    </span>
                  ) : null}
                </td>
                {section.columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5 text-center">
                    <PermissionBadge level={row.cells[col.key]} note={row.cellNotes?.[col.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chú thích của những ô có dấu * — đặc tả ghi thêm điều kiện ngay trong ô */}
      {rowNotes.length > 0 ? (
        <div className="space-y-1 border-t border-gray-100 bg-[#F9FAFB] px-6 py-3 text-xs text-gray-500">
          {rowNotes.map((row) =>
            section.columns
              .filter((col) => row.cellNotes?.[col.key])
              .map((col) => (
                <p key={`${row.id}-${col.key}`}>
                  <span className="font-bold text-[#EA4A2A]">*</span> {row.feature} · {col.label}:{" "}
                  {row.cellNotes?.[col.key]}
                </p>
              )),
          )}
        </div>
      ) : null}
    </div>
  )
}
