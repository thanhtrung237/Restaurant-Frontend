import * as React from "react"
import type { Account, AuditLog } from "@/types/models"
import type { AuditPerformerOption } from "./components/AuditLogFilterBar"

/**
 * Danh sách người thực hiện cho bộ lọc nhật ký.
 *
 * Hai nguồn, vì hai vai trò đọc được hai thứ khác nhau:
 *
 * 1. `accounts` — Quản trị nhà hàng đọc được `GET /accounts/restaurant/{id}`, cho danh sách
 *    đầy đủ kể cả người chưa từng thao tác gì.
 * 2. Tên xuất hiện trong chính các dòng nhật ký — nguồn DUY NHẤT của Quản lý chi nhánh:
 *    `/accounts/restaurant/{id}` và `/assignments/**` đều là `hasRole('MANAGER')`, đúng
 *    Bảng 4.3 (quản lý nhân viên là việc của Quản trị nhà hàng).
 *
 * ⚠️ `logs` truyền vào phải là danh sách KHÔNG lọc theo người thực hiện, nếu không dropdown
 * sẽ co xuống đúng người đang chọn và không đổi sang người khác được nữa.
 */
export function usePerformerOptions(
  accounts: Account[] | undefined,
  logs: AuditLog[],
): AuditPerformerOption[] {
  return React.useMemo(() => {
    const byId = new Map<number, string>()

    for (const log of logs) {
      if (log.performedById == null) continue
      const name = log.performedByName?.trim()
      if (!name) continue
      byId.set(log.performedById, name)
    }
    // Tên từ bảng tài khoản thắng: đó là tên hiện hành, còn nhật ký lưu tên lúc ghi.
    for (const account of accounts ?? []) {
      byId.set(account.id, account.fullName)
    }

    const options = [...byId]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "vi"))

    return [{ value: "ALL", label: "Mọi nhân viên" }, ...options]
  }, [accounts, logs])
}
