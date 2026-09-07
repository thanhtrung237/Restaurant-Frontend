import React from "react"
import { Pencil, MoreHorizontal } from "lucide-react"
import type { StaffMember } from "../types"

interface StaffTableProps {
  staffMembers: StaffMember[]
  onEditStaff?: (staff: StaffMember) => void
  onMoreOptions?: (staff: StaffMember) => void
  /** Quản lý chi nhánh chỉ XEM danh sách nhân viên chi nhánh mình — ẩn cột thao tác (mục 4.3). */
  readOnly?: boolean
}

export const StaffTable: React.FC<StaffTableProps> = ({
  staffMembers,
  onEditStaff,
  onMoreOptions,
  readOnly = false,
}) => {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-[#F9FAFB]">
              <th className="py-3.5 pl-6 pr-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                NHÂN VIÊN
              </th>
              <th className="py-3.5 px-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                TÊN ĐĂNG NHẬP
              </th>
              <th className="py-3.5 px-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                VAI TRÒ
              </th>
              <th className="py-3.5 px-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                CHI NHÁNH
              </th>
              <th className="py-3.5 px-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                TRẠNG THÁI
              </th>
              <th className="py-3.5 px-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                ĐĂNG NHẬP GẦN NHẤT
              </th>
              {!readOnly && (
                <th className="py-3.5 pl-4 pr-6 text-right text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  <span className="sr-only">Thao tác</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {staffMembers.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 6 : 7} className="py-12 text-center text-gray-500">
                  Không tìm thấy nhân viên nào phù hợp với bộ lọc
                </td>
              </tr>
            ) : (
              staffMembers.map((staff) => {
                const isActive = staff.status === "ACTIVE"

                return (
                  <tr
                    key={staff.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    {/* Cột Nhân viên: Avatar + Tên + Mã */}
                    <td className="py-4 pl-6 pr-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-xs select-none"
                          style={{ backgroundColor: staff.avatarBg || "#EA4A2A" }}
                        >
                          {staff.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {staff.fullName}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {staff.employeeCode}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Cột Tên đăng nhập */}
                    <td className="py-4 px-4 text-gray-700 font-normal">
                      {staff.username}
                    </td>

                    {/* Cột Vai trò */}
                    <td className="py-4 px-4 text-gray-700 font-normal">
                      {staff.role}
                    </td>

                    {/* Cột Chi nhánh */}
                    <td className="py-4 px-4 text-gray-700 font-normal">
                      {staff.branch}
                    </td>

                    {/* Cột Trạng thái */}
                    <td className="py-4 px-4">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F9EE] px-3 py-1 text-xs font-medium text-[#12B76A]">
                          <span className="size-1.5 rounded-full bg-[#12B76A]" />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F2F4F7] px-3 py-1 text-xs font-medium text-[#667085]">
                          <span className="size-1.5 rounded-full bg-[#98A2B3]" />
                          Tạm khoá
                        </span>
                      )}
                    </td>

                    {/* Cột Đăng nhập gần nhất */}
                    <td className="py-4 px-4 text-gray-500 font-normal">
                      {staff.lastLogin}
                    </td>

                    {/* Cột Thao tác — ẩn khi readOnly (Quản lý chi nhánh chỉ xem) */}
                    {!readOnly && (
                      <td className="py-4 pl-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditStaff?.(staff)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa nhân viên"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoreOptions?.(staff)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Thao tác khác"
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
