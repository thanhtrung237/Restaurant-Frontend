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

// ─── Nhãn tiếng Việt cho từng key trong chuỗi value backend ─────────────────

const STATUS_LABEL: Record<string, string> = {
  WAITING_FOR_OPEN: "Chờ mở bàn",
  SERVING: "Đang phục vụ",
  WAITING_FOR_PAY: "Chờ thanh toán",
  CLOSED: "Đã đóng",
  CANCELLED: "Đã hủy",
  RESERVED: "Đặt trước",
  MERGED: "Đã gộp",
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngừng hoạt động",
  PENDING: "Chờ xác nhận",
  PREPARING: "Đang chế biến",
  SERVED: "Đã phục vụ",
  PAID: "Đã thanh toán",
  ISSUED: "Đã phát hành",
}

const KEY_LABEL: Record<string, string> = {
  status: "Trạng thái",
  reservationTime: "Giờ hẹn",
  guest: "Khách",
  guestCount: "Số khách",
  openedAt: "Giờ mở",
  table: "Bàn",
  mergedInto: "Gộp vào",
  vatRate: "VAT",
  serviceFeeRate: "Phí dịch vụ",
  discountApprovalThreshold: "Ngưỡng duyệt giảm giá",
  openingTime: "Giờ mở cửa",
  closingTime: "Giờ đóng cửa",
  bankAccountNo: "Số tài khoản",
  bankName: "Ngân hàng",
  result: "Kết quả",
  restaurantCode: "Mã nhà hàng",
  username: "Tài khoản",
}

/** Định dạng giá trị theo từng key. */
function formatValue(key: string, value: string): string {
  // Trạng thái
  if (key === "status") return STATUS_LABEL[value] ?? value
  // Kết quả đăng nhập
  if (key === "result") return value === "SUCCESS" ? "Thành công" : "Thất bại"
  // Ngày giờ dạng ISO (2026-11-04T22:04)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
  }
  // Số nguyên/thập phân thuần
  if (/^\d+(\.\d+)?$/.test(value)) return value
  return value
}

/**
 * Parse chuỗi "key1=val1; key2=val2" thành map.
 * Dùng nội bộ để xây câu văn tự nhiên.
 */
function parseKV(raw: string | undefined): Record<string, string> {
  if (!raw) return {}
  const result: Record<string, string> = {}
  for (const part of raw.split(";")) {
    const eqIdx = part.indexOf("=")
    if (eqIdx === -1) continue
    result[part.slice(0, eqIdx).trim()] = part.slice(eqIdx + 1).trim()
  }
  return result
}

/** Format ISO datetime → "22:04" */
function fmtTime(iso: string | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Tạo câu mô tả tự nhiên dựa trên actionType + entityType.
 * Với các trường hợp chưa có template, fallback về format key: value.
 */
function describeChange(log: AuditLog): { description: string; detail?: string } {
  const reason = log.reason?.trim()
  const before = parseKV(log.valueBefore)
  const after = parseKV(log.valueAfter)
  const action = log.actionType
  const entity = log.entityType

  // ── Đăng nhập / đăng xuất ──────────────────────────────────────────────────
  if (action === "LOGIN") {
    const success = after.result === "SUCCESS"
    const username = after.username ?? before.username ?? ""
    return {
      description: success
        ? `Đăng nhập thành công${username ? ` (${username})` : ""}`
        : `Đăng nhập thất bại${username ? ` (${username})` : ""} — sai mật khẩu`,
    }
  }

  if (action === "LOGOUT") {
    return { description: "Đăng xuất khỏi hệ thống" }
  }

  // ── Phiên bàn ──────────────────────────────────────────────────────────────
  if (entity === "TableSession") {
    const statusBefore = STATUS_LABEL[before.status ?? ""] ?? before.status
    const statusAfter = STATUS_LABEL[after.status ?? ""] ?? after.status

    if (action === "STATUS_CHANGE") {
      // Đặt bàn trước (không có before)
      if (!before.status && after.status === "RESERVED") {
        const guest = after.guest ?? ""
        const time = fmtTime(after.reservationTime)
        return {
          description: `Đặt bàn trước cho khách ${guest}${time ? ` lúc ${time}` : ""}`,
          detail: reason,
        }
      }
      // Xác nhận khách đặt trước đến
      if (before.status === "RESERVED" && after.status === "SERVING") {
        const guests = after.guestCount ?? ""
        return {
          description: `Khách đặt trước đã đến, mở bàn phục vụ${guests ? ` (${guests} khách)` : ""}`,
          detail: reason,
        }
      }
      // Mở bàn thông thường
      if (
        (before.status === "WAITING_FOR_OPEN" || !before.status) &&
        after.status === "SERVING"
      ) {
        const guests = after.guestCount ?? ""
        const time = fmtTime(after.openedAt)
        return {
          description: `Mở bàn${guests ? ` · ${guests} khách` : ""}${time ? ` lúc ${time}` : ""}`,
          detail: reason,
        }
      }
      // Yêu cầu thanh toán
      if (after.status === "WAITING_FOR_PAY") {
        return { description: "Yêu cầu thanh toán, khóa gọi thêm món", detail: reason }
      }
      // Mở lại bàn
      if (before.status === "WAITING_FOR_PAY" && after.status === "SERVING") {
        return { description: "Mở lại bàn từ trạng thái chờ thanh toán", detail: reason }
      }
      // Chuyển bàn
      if (before.table && after.table) {
        return {
          description: `Chuyển bàn từ ${before.table} sang ${after.table}`,
          detail: reason,
        }
      }
      // Gộp bàn
      if (after.status === "MERGED") {
        return {
          description: `Gộp bàn vào phiên #${after.mergedInto ?? ""}`,
          detail: reason,
        }
      }
      // Generic: trước → sau
      if (statusBefore && statusAfter) {
        return {
          description: `${statusBefore} → ${statusAfter}`,
          detail: reason,
        }
      }
    }

    if (action === "CANCEL") {
      const fromStatus = statusBefore ? ` từ trạng thái "${statusBefore}"` : ""
      return {
        description: `Hủy phiên bàn${fromStatus}`,
        detail: reason,
      }
    }
  }

  // ── Cấu hình chi nhánh / nhà hàng ─────────────────────────────────────────
  if (action === "CONFIG_CHANGE") {
    const changes: string[] = []
    const configKeyLabel: Record<string, string> = {
      vatRate: "VAT",
      serviceFeeRate: "phí dịch vụ",
      discountApprovalThreshold: "ngưỡng duyệt giảm giá",
      openingTime: "giờ mở cửa",
      closingTime: "giờ đóng cửa",
      bankAccountNo: "số tài khoản ngân hàng",
      bankName: "tên ngân hàng",
      pendingConfirmTimeoutMinutes: "thời gian tự hủy bàn chờ",
      reservationHoldMinutes: "thời gian giữ chỗ",
    }
    for (const [key, label] of Object.entries(configKeyLabel)) {
      if (before[key] !== undefined || after[key] !== undefined) {
        const v1 = before[key] ?? "—"
        const v2 = after[key] ?? "—"
        if (v1 !== v2) changes.push(`${label}: ${v1} → ${v2}`)
      }
    }
    if (changes.length > 0) {
      return { description: `Thay đổi cấu hình: ${changes.join(", ")}`, detail: reason }
    }
    return { description: "Cập nhật cấu hình chi nhánh", detail: reason }
  }

  // ── Thanh toán ─────────────────────────────────────────────────────────────
  if (action === "PAYMENT") {
    const amount = after.amount ?? after.totalAmount
    const method = after.method === "CASH" ? "tiền mặt" : after.method === "TRANSFER" ? "chuyển khoản" : after.method
    if (amount && method) {
      return { description: `Thu tiền mặt ${Number(amount).toLocaleString("vi-VN")}đ qua ${method}`, detail: reason }
    }
    return { description: "Ghi nhận thanh toán", detail: reason }
  }

  // ── Giảm giá thủ công ──────────────────────────────────────────────────────
  if (action === "DISCOUNT") {
    const value = after.value ?? after.amount
    const type = after.type === "PERCENT" ? "%" : "đ"
    if (value) {
      return { description: `Áp chiết khấu thủ công ${value}${type}`, detail: reason }
    }
    return { description: "Áp chiết khấu thủ công", detail: reason }
  }

  // ── Phân quyền ─────────────────────────────────────────────────────────────
  if (action === "PERMISSION_CHANGE") {
    if (entity === "OperationalPermission" || entity === "BranchStaffAssignment") {
      return { description: reason ?? "Cập nhật quyền vận hành", detail: `${log.valueBefore ?? "—"} → ${log.valueAfter ?? "—"}` }
    }
    return { description: reason ?? "Thay đổi phân quyền nhân viên" }
  }

  // ── Fallback: nếu có reason thì dùng reason, không thì format key: value ──
  if (reason) return { description: reason }

  const afterKeys = Object.keys(after)
  if (afterKeys.length > 0) {
    const text = afterKeys
      .map((k) => {
        const label = KEY_LABEL[k] ?? k
        return `${label}: ${formatValue(k, after[k])}`
      })
      .join(" · ")
    return { description: text }
  }

  return { description: "—" }
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
