import React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PermissionLevel } from "../types"

interface PermissionBadgeProps {
  level?: PermissionLevel
  /** Ghi chú riêng của ô — hiện dấu * kèm tooltip, ví dụ "A nếu không tính tiền". */
  note?: string
  size?: "sm" | "md"
}

/**
 * Một ô của ma trận quyền, theo chú giải Bảng 4.2:
 * X = được phép · A = cần duyệt · R = chỉ đọc · trống = không được phép.
 *
 * Dùng chung cho bản bảng (md+) và bản danh sách (<md) để hai bản không thể lệch nhau.
 */
export const PermissionBadge: React.FC<PermissionBadgeProps> = ({
  level = "none",
  note,
  size = "sm",
}) => {
  const box = size === "sm" ? "size-6" : "size-7"

  const badge = (() => {
    switch (level) {
      case "allow":
        return (
          <span
            className={cn(
              box,
              "inline-flex items-center justify-center rounded-full bg-[#E6F9EE] text-[#12B76A]",
            )}
            title="Được phép (X)"
          >
            <Check className="size-3.5 stroke-[2.5]" />
          </span>
        )
      case "approval":
        return (
          <span
            className={cn(
              box,
              "inline-flex items-center justify-center rounded-md bg-[#FFF4ED] text-xs font-bold text-[#EA4A2A]",
            )}
            title="Được phép nhưng cần duyệt (A)"
          >
            A
          </span>
        )
      case "readonly":
        return (
          <span
            className={cn(
              box,
              "inline-flex items-center justify-center rounded-md bg-[#F2F4F7] text-xs font-bold text-[#667085]",
            )}
            title="Chỉ đọc (R)"
          >
            R
          </span>
        )
      case "never":
        return (
          <span
            className="inline-flex items-center justify-center rounded-full bg-[#FEF3F2] px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-[#B42318]"
            title="Vai trò này không có quyền thực hiện"
          >
            KHÔNG BAO GIỜ
          </span>
        )
      case "none":
      default:
        return (
          <span
            className={cn(
              box,
              "inline-flex items-center justify-center text-sm font-light text-gray-300 select-none",
            )}
            title="Không được phép"
          >
            —
          </span>
        )
    }
  })()

  if (!note) return badge

  return (
    <span className="inline-flex items-center gap-0.5">
      {badge}
      <span className="text-xs font-bold text-[#EA4A2A]" title={note} aria-label={note}>
        *
      </span>
    </span>
  )
}
