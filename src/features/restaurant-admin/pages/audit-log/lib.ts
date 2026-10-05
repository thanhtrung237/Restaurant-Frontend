import { AUDIT_ACTION_TYPE_LABEL, type Account, type AuditLog } from "@/types/models"
import type { AuditActionFilter, AuditDateRangeId, AuditLogRow } from "./types"

export const AUDIT_DATE_RANGES: { id: AuditDateRangeId; label: string }[] = [
  { id: "TODAY", label: "Hôm nay" },
  { id: "LAST_7_DAYS", label: "7 ngày qua" },
  { id: "LAST_30_DAYS", label: "30 ngày qua" },
  { id: "THIS_MONTH", label: "Tháng này" },
  { id: "ALL", label: "Tất cả thời gian" },
]

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Mốc đầu / cuối của khoảng thời gian; `null` = không giới hạn. */
export function dateRangeBounds(range: AuditDateRangeId): { start: Date | null; end: Date | null } {
  const now = new Date()
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  switch (range) {
    case "TODAY":
      return { start: startOfDay(now), end: endOfToday }
    case "LAST_7_DAYS": {
      const start = startOfDay(now)
      start.setDate(start.getDate() - 6)
      return { start, end: endOfToday }
    }
    case "LAST_30_DAYS": {
      const start = startOfDay(now)
      start.setDate(start.getDate() - 29)
      return { start, end: endOfToday }
    }
    case "THIS_MONTH": {
      const start = startOfDay(now)
      start.setDate(1)
      return { start, end: endOfToday }
    }
    case "ALL":
    default:
      return { start: null, end: null }
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

/**
 * `LocalDateTime` cho query param — KHÔNG có hậu tố `Z` và không đổi sang UTC.
 *
 * `AuditLogController` nhận `@DateTimeFormat(iso = ISO.DATE_TIME)` map vào
 * `java.time.LocalDateTime`: gửi kèm offset (`toISOString()`) là 400, mà gửi giờ UTC thì
 * lệch múi giờ so với `occurred_at` đang lưu theo giờ máy chủ.
 */
export function toLocalDateTimeParam(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

/** Tham số ngày cho `GET /audit-logs`; rỗng khi không giới hạn thời gian. */
export function dateRangeParams(range: AuditDateRangeId): { startDate?: string; endDate?: string } {
  const { start, end } = dateRangeBounds(range)
  if (!start || !end) return {}
  return { startDate: toLocalDateTimeParam(start), endDate: toLocalDateTimeParam(end) }
}

function formatDateLabel(occurredAt: Date): string {
  const today = startOfDay(new Date())
  const day = startOfDay(occurredAt)
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000)
  if (diffDays === 0) return "Hôm nay"
  if (diffDays === 1) return "Hôm qua"
  return `${pad(day.getDate())}/${pad(day.getMonth() + 1)}/${day.getFullYear()}`
}

/** Mô tả thay đổi theo BR-12: giá trị trước → giá trị sau. */
function describeChange(log: AuditLog): { description: string; detail?: string } {
  const before = log.valueBefore?.trim()
  const after = log.valueAfter?.trim()
  const reason = log.reason?.trim()
  const target = log.entityType
    ? `${log.entityType}${log.entityId != null ? ` #${log.entityId}` : ""}`
    : undefined

  if (before && after) {
    return { description: `${before} → ${after}`, detail: reason ?? target }
  }
  if (after) {
    return { description: after, detail: reason ?? target }
  }
  if (reason) {
    return { description: reason, detail: target }
  }
  return { description: target ?? "—" }
}

/**
 * `AuditLogResponse` → một dòng của bảng.
 *
 * `roleOf` tra vai trò của người thực hiện từ danh sách tài khoản: BE không trả vai trò trong
 * `AuditLogResponse`.
 *
 * `performedByName` / `branchName` có thể **null** một cách hợp lệ: khách quét QR không đăng
 * nhập (không có người thực hiện), sự kiện cấp nhà hàng không gắn chi nhánh, và bản ghi trỏ
 * tới thực thể đã bị xoá mềm (be-issues mục 19 — mapper của BE nay trả null cho đúng trường
 * đó thay vì làm sập cả API).
 */
export function toAuditLogRow(log: AuditLog, roleOf: (accountId?: number) => string): AuditLogRow {
  const occurredAt = new Date(log.occurredAt)
  const { description, detail } = describeChange(log)

  return {
    id: log.id,
    time: `${pad(occurredAt.getHours())}:${pad(occurredAt.getMinutes())}`,
    date: formatDateLabel(occurredAt),
    performedByName: log.performedByName ?? "Khách / hệ thống",
    performedByRole: roleOf(log.performedById),
    branchName: log.branchName ?? "Toàn nhà hàng",
    actionType: log.actionType,
    actionLabel: log.actionType ? AUDIT_ACTION_TYPE_LABEL[log.actionType] : "—",
    changeDescription: description,
    changeDetail: detail,
    approvedByName: log.approvedByName ?? null,
  }
}

/** Lọc phía client: loại thao tác (BE chưa có tham số) và khoảng thời gian. */
export function filterAuditLogs(
  logs: AuditLog[],
  options: { action: AuditActionFilter; range?: AuditDateRangeId },
): AuditLog[] {
  const bounds = options.range ? dateRangeBounds(options.range) : { start: null, end: null }

  return logs.filter((log) => {
    if (options.action !== "ALL" && log.actionType !== options.action) return false
    if (bounds.start && bounds.end) {
      const occurredAt = new Date(log.occurredAt).getTime()
      if (occurredAt < bounds.start.getTime() || occurredAt > bounds.end.getTime()) return false
    }
    return true
  })
}

/**
 * Tra vài trò của ngưối thực hiện từ danh sách tài khoản.
 *
 * `AuditLogResponse` không trả vai trò, mà cột "Ngưối thực hiện" cần nó để đọc được
 * ai làm gì. Một tài khoản nhiều vai trò thì nối bằng " · ".
 */
export function buildRoleLookup(accounts: Account[]): (accountId?: number) => string {
  const byId = new Map<number, string>()
  for (const account of accounts) {
    const names = [
      ...new Set(
        (account.assignments ?? [])
          .map((assignment) => assignment.roleName ?? assignment.roleCode)
          .filter((name): name is string => Boolean(name)),
      ),
    ]
    byId.set(account.id, names.length > 0 ? names.join(" · ") : "Chưa phân công")
  }
  return (accountId?: number) => {
    if (accountId == null) return "—"
    return byId.get(accountId) ?? "—"
  }
}
