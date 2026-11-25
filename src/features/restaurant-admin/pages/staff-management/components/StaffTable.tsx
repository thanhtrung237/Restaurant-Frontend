import React from "react"
import { UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { StaffRowActions, type StaffRowActionHandlers } from "./StaffRowActions"
import { ACCOUNT_STATUS_LABEL, type StaffChip, type StaffRow } from "../types"

interface StaffTableProps extends StaffRowActionHandlers {
  staffMembers: StaffRow[]
  isLoading?: boolean
  /** Mở modal Sửa ngay tại phần phân công — dùng cho tài khoản chưa được gán vai trò nào. */
  onAssignRole: (staff: StaffRow) => void
}

function ChipRow({ chips }: { chips: StaffChip[] }) {
  if (chips.length === 0) {
    return <span className="text-sm text-gray-400 select-none">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center rounded-full bg-[#F2F4F7] px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-[#344054]"
        >
          {chip.label}
        </span>
      ))}
    </div>
  )
}

function StatusPill({ status }: { status: StaffRow["status"] }) {
  const isActive = status === "ACTIVE"
  return (
    <span
      // whitespace-nowrap: "Đang hoạt động" bị ngắt hai dòng trong cột hẹp trông như lỗi.
      className={
        isActive
          ? "inline-flex items-center gap-1.5 rounded-full bg-[#E6F9EE] px-3 py-1 text-xs font-medium whitespace-nowrap text-[#12B76A]"
          : "inline-flex items-center gap-1.5 rounded-full bg-[#F2F4F7] px-3 py-1 text-xs font-medium whitespace-nowrap text-[#667085]"
      }
    >
      <span
        className={
          isActive ? "size-1.5 rounded-full bg-[#12B76A]" : "size-1.5 rounded-full bg-[#98A2B3]"
        }
      />
      {ACCOUNT_STATUS_LABEL[status]}
    </span>
  )
}

/**
 * Tài khoản chưa có phân công nào.
 *
 * Gặp khi tạo tài khoản xong nhưng `POST /assignments` lỗi: BE không có endpoint gộp hai việc
 * trong một giao dịch (xem be-issues), nên tài khoản vẫn tồn tại. KHÔNG tự xoá đi — xoá là mất
 * luôn tên đăng nhập vừa đặt. Thay vào đó nói rõ và cho gán lại ngay tại dòng.
 */
function NoAssignmentCell({
  staff,
  onAssignRole,
}: {
  staff: StaffRow
  onAssignRole: (s: StaffRow) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center rounded-full bg-[#FEF0C7] px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-[#B54708]">
        Chưa gán vai trò
      </span>
      <Button type="button" variant="outline" size="sm" onClick={() => onAssignRole(staff)}>
        <UserPlus className="size-3.5" />
        Gán vai trò
      </Button>
    </div>
  )
}

/**
 * Bảng nhân viên — MỘT dòng là MỘT tài khoản.
 *
 * Vai trò và chi nhánh hiện dạng nhiều chip theo `assignments`: `waiter01` có phân công ở
 * cả Quận 1 và Quận 7 nên phải thấy đủ hai chi nhánh trên cùng một dòng, không tách thành
 * hai dòng (tách dòng thì nút xoá ở dòng nào cũng xoá cả tài khoản).
 *
 * Bỏ cột "Đăng nhập gần nhất": backend không có dữ liệu này (`AccountResponse` không có
 * trường nào tương ứng), giữ cột chỉ để hiện giá trị bịa.
 */
export const StaffTable: React.FC<StaffTableProps> = ({
  staffMembers,
  isLoading = false,
  onEdit,
  onToggleStatus,
  onResetPassword,
  onAssignRole,
  disableReasonOf,
}) => {
  const actions = { onEdit, onToggleStatus, onResetPassword, disableReasonOf }
  const emptyTitle = isLoading ? "Đang tải danh sách nhân viên…" : "Không tìm thấy nhân viên"
  const emptyDescription = isLoading
    ? "Vui lòng chờ trong giây lát."
    : "Thử đổi từ khoá tìm kiếm hoặc tắt bớt bộ lọc."

  return (
    <>
      {/* ===== <md: danh sách card. Bảng nhiều cột ở 375px đẩy cả trang tràn ngang. ===== */}
      <div className="md:hidden">
        {staffMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={emptyTitle}
            description={emptyDescription}
            className="border border-gray-200/80"
          />
        ) : (
          <ul className="space-y-3">
            {staffMembers.map((staff) => (
              <li
                key={staff.id}
                className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EA4A2A] text-sm font-semibold text-white shadow-xs select-none">
                    {staff.initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">{staff.fullName}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {staff.employeeCode} · {staff.username}
                    </p>
                  </div>

                  <StaffRowActions staff={staff} {...actions} />
                </div>

                <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                  <StatusPill status={staff.status} />
                  <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="shrink-0">Vai trò:</span>
                      {staff.roles.length === 0 ? (
                        <NoAssignmentCell staff={staff} onAssignRole={onAssignRole} />
                      ) : (
                        <ChipRow chips={staff.roles} />
                      )}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="shrink-0">Chi nhánh:</span>
                      <ChipRow chips={staff.branches} />
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ===== md+: bảng đủ cột như thiết kế PC ===== */}
      <div className="hidden w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F9FAFB]">
                <th className="py-3.5 pr-4 pl-6 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  NHÂN VIÊN
                </th>
                <th className="px-4 py-3.5 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  TÊN ĐĂNG NHẬP
                </th>
                <th className="px-4 py-3.5 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  VAI TRÒ
                </th>
                <th className="px-4 py-3.5 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  CHI NHÁNH
                </th>
                <th className="px-4 py-3.5 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  TRẠNG THÁI
                </th>
                <th className="py-3.5 pr-6 pl-4 text-right text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {staffMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState icon={Users} title={emptyTitle} description={emptyDescription} />
                  </td>
                </tr>
              ) : (
                staffMembers.map((staff) => (
                  <tr key={staff.id} className="transition-colors hover:bg-gray-50/80">
                    {/* Cột Nhân viên: avatar + tên + mã */}
                    <td className="py-4 pr-4 pl-6">
                      <div className="flex items-center gap-3.5">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EA4A2A] text-sm font-semibold text-white shadow-xs select-none">
                          {staff.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">{staff.fullName}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{staff.employeeCode}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 font-normal text-gray-700">{staff.username}</td>

                    <td className="px-4 py-4">
                      {staff.roles.length === 0 ? (
                        <NoAssignmentCell staff={staff} onAssignRole={onAssignRole} />
                      ) : (
                        <ChipRow chips={staff.roles} />
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <ChipRow chips={staff.branches} />
                    </td>

                    <td className="px-4 py-4">
                      <StatusPill status={staff.status} />
                    </td>

                    <td className="py-4 pr-6 pl-4">
                      <div className="flex items-center justify-end">
                        <StaffRowActions staff={staff} {...actions} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
