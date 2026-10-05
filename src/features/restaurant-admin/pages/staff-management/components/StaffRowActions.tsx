import React from "react"
import { KeyRound, MoreHorizontal, Pencil, ShieldCheck, ShieldOff } from "lucide-react"
import { IconButton } from "@/components/ui/icon-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { StaffRow } from "../types"

export interface StaffRowActionHandlers {
  onEdit: (staff: StaffRow) => void
  onToggleStatus: (staff: StaffRow) => void
  onResetPassword: (staff: StaffRow) => void
  /**
   * Lý do KHÔNG được vô hiệu hoá tài khoản này; `null` = cho phép.
   * Dùng làm tooltip luôn, để người dùng biết vì sao nút bị khoá.
   */
  disableReasonOf: (staff: StaffRow) => string | null
}

/**
 * Cụm thao tác trên một dòng nhân viên: sửa + menu "⋯".
 *
 * KHÔNG có mục "Xoá" — FR-ADM-01: *"KHÔNG xóa cứng tài khoản đã phát sinh giao dịch — chỉ
 * vô hiệu hóa, giữ truy vết."* Vô hiệu hoá là thao tác đảo ngược được nên không hỏi xác nhận;
 * bù lại có nút "Kích hoạt lại" ngay tại chỗ.
 */
export const StaffRowActions: React.FC<{ staff: StaffRow } & StaffRowActionHandlers> = ({
  staff,
  onEdit,
  onToggleStatus,
  onResetPassword,
  disableReasonOf,
}) => {
  const isActive = staff.status === "ACTIVE"
  // Chỉ chặn chiều VÔ HIỆU HOÁ. Kích hoạt lại thì không bao giờ nguy hiểm.
  const blockedReason = isActive ? disableReasonOf(staff) : null

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <IconButton
        variant="row"
        size="row"
        onClick={() => onEdit(staff)}
        className="cursor-pointer"
        title="Chỉnh sửa nhân viên"
        aria-label={`Chỉnh sửa ${staff.fullName}`}
      >
        <Pencil />
      </IconButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            variant="row"
            size="row"
            className="cursor-pointer"
            title="Thao tác khác"
            aria-label={`Thao tác khác cho ${staff.fullName}`}
          >
            <MoreHorizontal />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="right" className="w-60">
          {/* `title` đặt trên thẻ bọc để tooltip vẫn hiện khi mục bị khoá */}
          <span title={blockedReason ?? undefined} className="block">
            <DropdownMenuItem
              onClick={() => onToggleStatus(staff)}
              disabled={Boolean(blockedReason)}
              variant={isActive ? "danger" : "default"}
              icon={isActive ? <ShieldOff /> : <ShieldCheck />}
              className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isActive ? "Vô hiệu hoá" : "Kích hoạt lại"}
            </DropdownMenuItem>
          </span>

          <DropdownMenuItem
            onClick={() => onResetPassword(staff)}
            icon={<KeyRound />}
            className="cursor-pointer"
          >
            Đặt lại mật khẩu
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
