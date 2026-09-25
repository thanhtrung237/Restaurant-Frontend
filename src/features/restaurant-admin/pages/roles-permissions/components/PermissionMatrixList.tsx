import React from "react"
import { Chip } from "@/components/common/Chip"
import { PermissionBadge } from "./PermissionBadge"
import type { PermissionMatrixSection } from "../types"

interface PermissionMatrixListProps {
  section: PermissionMatrixSection
}

/**
 * Ma trận quyền dạng DANH SÁCH MỘT CỘT — dùng ở <md.
 *
 * Bản md+ là bảng nhiều cột; ở 375px không đọc được, nên Figma
 * "Vai trò & phân quyền · Mobile (375)" đổi sang: chọn MỘT vai trò bằng chip cuộn ngang,
 * rồi liệt kê từng chức năng kèm mức quyền của riêng vai trò đó.
 *
 * Dùng cùng `section` và cùng `PermissionBadge` với bản bảng nên hai bản không thể lệch nhau.
 */
export const PermissionMatrixList: React.FC<PermissionMatrixListProps> = ({ section }) => {
  const [selectedKey, setSelectedKey] = React.useState(section.columns[0].key)

  const selectedColumn =
    section.columns.find((col) => col.key === selectedKey) ?? section.columns[0]

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
        <p className="text-xs text-gray-500">{section.source}</p>
      </div>

      {/* Chọn vai trò — cuộn ngang, ẩn thanh cuộn cho gọn */}
      <div
        aria-label={`Chọn vai trò để xem quyền — ${section.title}`}
        className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {section.columns.map((col) => (
          <Chip
            key={col.key}
            selected={col.key === selectedColumn.key}
            onClick={() => setSelectedKey(col.key)}
            className="shrink-0 cursor-pointer"
          >
            {col.label}
          </Chip>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs">
        <div className="border-b border-gray-100 bg-[#F9FAFB] px-4 py-3">
          <span className="text-[11px] font-semibold tracking-wider text-gray-500">
            QUYỀN CỦA {selectedColumn.label}
          </span>
        </div>

        <ul className="divide-y divide-gray-100">
          {section.rows.map((row) => {
            const cellNote = row.cellNotes?.[selectedColumn.key]
            return (
              <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">{row.feature}</span>
                  {row.note ? (
                    <span className="mt-0.5 block text-xs text-gray-400">{row.note}</span>
                  ) : null}
                  {cellNote ? (
                    <span className="mt-0.5 block text-xs text-[#EA4A2A]">{cellNote}</span>
                  ) : null}
                </span>
                <PermissionBadge level={row.cells[selectedColumn.key]} size="md" />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
