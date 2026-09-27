import React from "react"
import { History } from "lucide-react"
import { EmptyState } from "@/components/common/EmptyState"
import type { AuditActionType } from "@/types/models"
import type { AuditLogRow } from "../types"

interface AuditLogTableProps {
  logs: AuditLogRow[]
  isLoading?: boolean
}

/** Màu theo nhóm hành động — dùng hằng của BE (AuditAction), không tự khai giá trị mới. */
const ACTION_STYLE: Record<AuditActionType, string> = {
  DISCOUNT: "bg-[#FFF4ED] text-[#D97706]",
  PAYMENT: "bg-[#ECFDF3] text-[#027A48]",
  ISSUE_EINVOICE: "bg-[#ECFDF3] text-[#027A48]",
  CANCEL: "bg-[#FEF3F2] text-[#B42318]",
  DELETE: "bg-[#FEF3F2] text-[#B42318]",
  CREATE: "bg-[#EFF8FF] text-[#175CD3]",
  UPDATE: "bg-[#EFF8FF] text-[#175CD3]",
  STATUS_CHANGE: "bg-[#EFF8FF] text-[#175CD3]",
  CONFIG_CHANGE: "bg-[#F4F3FF] text-[#5925DC]",
  PERMISSION_CHANGE: "bg-[#F4F3FF] text-[#5925DC]",
  LOGIN: "bg-[#F2F4F7] text-[#475467]",
  LOGOUT: "bg-[#F2F4F7] text-[#475467]",
}

function ActionBadge({ type, label }: { type?: AuditActionType; label: string }) {
  const style = type ? ACTION_STYLE[type] : "bg-[#F2F4F7] text-[#475467]"
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${style}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  )
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ logs, isLoading = false }) => {
  const emptyTitle = isLoading ? "Đang tải nhật ký…" : "Chưa có nhật ký hoạt động"
  const emptyDescription = isLoading
    ? "Vui lòng chờ trong giây lát."
    : "Mọi thao tác đổi tiền, đổi trạng thái sẽ được ghi vết ở đây (BR-12)."

  return (
    <>
      {/* ===== <md: danh sách card — vẫn giữ ĐỦ 6 trường mà BR-12 yêu cầu ghi vết. ===== */}
      <div className="md:hidden">
        {logs.length === 0 ? (
          <EmptyState
            icon={History}
            title={emptyTitle}
            description={emptyDescription}
            className="border border-gray-200/80"
          />
        ) : (
          <ul className="space-y-3">
            {logs.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <ActionBadge type={item.actionType} label={item.actionLabel} />
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-900">{item.time}</p>
                    <p className="text-xs text-gray-400">{item.date}</p>
                  </div>
                </div>

                <p className="mt-3 text-sm break-words text-gray-700">{item.changeDescription}</p>
                {item.changeDetail ? (
                  <p className="mt-0.5 text-xs break-words text-gray-400">{item.changeDetail}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-gray-100 pt-3 text-xs text-gray-500">
                  <span className="font-semibold text-gray-900">{item.performedByName}</span>
                  <span>· {item.performedByRole}</span>
                  <span>· {item.branchName}</span>
                  {item.approvedByName ? (
                    <span className="w-full text-gray-500">
                      Người duyệt:{" "}
                      <span className="font-medium text-gray-900">{item.approvedByName}</span>
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ===== md+: bảng đủ 6 cột như thiết kế PC ===== */}
      <div className="hidden w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F9FAFB]">
                <th className="py-4 pr-4 pl-6 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  THỜI ĐIỂM
                </th>
                <th className="px-4 py-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  NGƯỜI THỰC HIỆN
                </th>
                <th className="px-4 py-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  CHI NHÁNH
                </th>
                <th className="px-4 py-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  THAO TÁC
                </th>
                <th className="px-4 py-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  THAY ĐỔI (TRƯỚC → SAU)
                </th>
                <th className="py-4 pr-6 pl-4 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  NGƯỜI DUYỆT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState icon={History} title={emptyTitle} description={emptyDescription} />
                  </td>
                </tr>
              ) : (
                logs.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50/70">
                    <td className="py-4 pr-4 pl-6">
                      <p className="font-semibold whitespace-nowrap text-gray-900">{item.time}</p>
                      <p className="mt-0.5 text-xs whitespace-nowrap text-gray-400">{item.date}</p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900">{item.performedByName}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{item.performedByRole}</p>
                    </td>

                    <td className="px-4 py-4 font-normal text-gray-700">{item.branchName}</td>

                    <td className="px-4 py-4">
                      <ActionBadge type={item.actionType} label={item.actionLabel} />
                    </td>

                    <td className="max-w-md px-4 py-4 font-normal text-gray-700">
                      <p className="break-words">{item.changeDescription}</p>
                      {item.changeDetail ? (
                        <p className="mt-0.5 text-xs break-words text-gray-400">
                          {item.changeDetail}
                        </p>
                      ) : null}
                    </td>

                    <td className="py-4 pr-6 pl-4">
                      {item.approvedByName ? (
                        <span className="font-medium text-gray-900">{item.approvedByName}</span>
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
    </>
  )
}
