import React, { useState, useMemo } from "react"
import {
  Download,
  Loader2,
  Calendar,
  CheckCircle2,
  Filter,
  Clock,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Shield,
} from "lucide-react"

import { useAuditLogs } from "@/features/platform-admin/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import type { AuditLog } from "@/types/models"

/** Bản đồ ánh xạ Windows-1252 / ISO-8859-1 sang UTF-8 để sửa các chuỗi bị lỗi font tiếng Việt trong DB cũ */
const WINDOWS_1252_MAP: Record<number, number> = {
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
}

function cleanText(str?: string | null): string {
  if (!str) return ""
  // Kiểm tra nếu chuỗi chứa dấu hiệu mojibake
  if (/(?:Ã|á»|áº|Ä|Â|É|È|á|»|‡|‘|…)/.test(str)) {
    try {
      const bytes: number[] = []
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i)
        if (WINDOWS_1252_MAP[code]) {
          bytes.push(WINDOWS_1252_MAP[code])
        } else if (code <= 255) {
          bytes.push(code)
        } else {
          return str
        }
      }
      const decoded = new TextDecoder("utf-8").decode(new Uint8Array(bytes))
      if (decoded && !decoded.includes("\ufffd")) {
        return decoded
      }
    } catch {
      return str
    }
  }
  return str
}

/** Cấu hình nhãn và màu sắc chuẩn cho các loại hành động */
const ACTION_BADGES: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  LOGIN: {
    label: "Đăng nhập",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  LOGOUT: {
    label: "Đăng xuất",
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
  },
  CREATE: {
    label: "Tạo mới",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  UPDATE: {
    label: "Cập nhật",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
  },
  DELETE: {
    label: "Xóa",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
  STATUS_CHANGE: {
    label: "Đổi trạng thái",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  CONFIG_CHANGE: {
    label: "Cập nhật cấu hình",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  PERMISSION_CHANGE: {
    label: "Phân quyền",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  PAYMENT: {
    label: "Thanh toán",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  DISCOUNT: {
    label: "Chiết khấu tay",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  CANCEL: {
    label: "Hủy",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
}

function getActionBadge(action?: string) {
  if (!action) {
    return {
      label: "Khác",
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-200",
    }
  }
  return (
    ACTION_BADGES[action] || {
      label: action,
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-200",
    }
  )
}

/** Chuyển đổi timestamp thành tiêu đề ngày thân thiện tiếng Việt */
function formatDateGroupTitle(dateStr: string): string {
  const targetDate = new Date(dateStr)
  if (isNaN(targetDate.getTime())) return dateStr

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const checkDate = new Date(targetDate)
  checkDate.setHours(0, 0, 0, 0)

  const dayOfWeekNames = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ]
  const dow = dayOfWeekNames[targetDate.getDay()]
  const dateFormatted = targetDate.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  if (checkDate.getTime() === today.getTime()) {
    return `Hôm nay · ${dow}, ${dateFormatted}`
  }
  if (checkDate.getTime() === yesterday.getTime()) {
    return `Hôm qua · ${dow}, ${dateFormatted}`
  }
  return `${dow}, ${dateFormatted}`
}

export default function SystemAuditLogPage() {
  const { toast } = useToast()

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("ALL")
  const [timeFilter, setTimeFilter] = useState<string>("7d")

  // Phân trang
  const [pageIndex, setPageIndex] = useState<number>(0)
  const [pageSize, setPageSize] = useState<number>(20)

  // Chi tiết log modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // Tính khoảng ngày cho backend API
  const dateRange = useMemo(() => {
    if (timeFilter === "all") return {}
    const now = new Date()
    let days = 7
    if (timeFilter === "today") days = 0
    else if (timeFilter === "7d") days = 7
    else if (timeFilter === "30d") days = 30
    else if (timeFilter === "90d") days = 90

    const start = new Date(now)
    if (days === 0) {
      start.setHours(0, 0, 0, 0)
    } else {
      start.setDate(start.getDate() - days)
      start.setHours(0, 0, 0, 0)
    }

    const pad = (n: number) => String(n).padStart(2, "0")
    const formatLocal = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

    return {
      startDate: formatLocal(start),
      endDate: formatLocal(now),
    }
  }, [timeFilter])

  // Param gửi lên BE
  const auditParams = useMemo(
    () => ({
      page: pageIndex,
      size: pageSize,
      actionType: actionFilter !== "ALL" ? actionFilter : undefined,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
    [pageIndex, pageSize, actionFilter, dateRange.startDate, dateRange.endDate]
  )

  // Gọi API backend (GET /api/v1/audit-logs)
  const { data: pageData, isLoading, refetch, isFetching } = useAuditLogs(auditParams)

  const rawLogs: AuditLog[] = pageData?.content || []
  const totalElements = pageData?.totalElements ?? rawLogs.length
  const totalPages = pageData?.totalPages ?? Math.max(1, Math.ceil(totalElements / pageSize))

  // Khi thay đổi bộ lọc, tự động quay về trang 0
  const handleActionChange = (action: string) => {
    setActionFilter(action)
    setPageIndex(0)
  }

  const handleTimeChange = (time: string) => {
    setTimeFilter(time)
    setPageIndex(0)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPageIndex(0)
  }

  // Lọc tìm kiếm cục bộ nếu người dùng nhập từ khóa
  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return rawLogs
    const q = searchTerm.toLowerCase().trim()
    return rawLogs.filter((log) => {
      const admin = cleanText(log.performedByName).toLowerCase()
      const entity = cleanText(log.restaurantName || log.entityType).toLowerCase()
      const action = (log.actionType || "").toLowerCase()
      const reason = (log.reason || "").toLowerCase()
      return (
        admin.includes(q) ||
        entity.includes(q) ||
        action.includes(q) ||
        reason.includes(q)
      )
    })
  }, [rawLogs, searchTerm])

  // Phân nhóm dữ liệu theo ngày (Date Grouping)
  const groupedLogs = useMemo(() => {
    const groups: { [key: string]: { dateStr: string; title: string; items: AuditLog[] } } = {}

    filteredLogs.forEach((log) => {
      const d = new Date(log.occurredAt)
      const dateKey = !isNaN(d.getTime())
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        : "other"

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateStr: log.occurredAt,
          title: dateKey !== "other" ? formatDateGroupTitle(log.occurredAt) : "Khác",
          items: [],
        }
      }
      groups[dateKey].items.push(log)
    })

    return Object.values(groups)
  }, [filteredLogs])

  // Xuất file CSV nhật ký chuẩn UTF-8
  const handleExportLog = () => {
    if (rawLogs.length === 0) {
      toast({
        variant: "danger",
        title: "Không có dữ liệu",
        description: "Hiện không có bản ghi nhật ký nào để xuất file.",
      })
      return
    }

    toast({
      variant: "success",
      title: "Đang xuất nhật ký",
      description: "Hệ thống đang tải file CSV nhật ký hệ thống...",
    })

    const header = ["Mã log", "Thời điểm", "Quản trị viên", "Thao tác", "Đối tượng", "Chi tiết / Lý do", "Kết quả"]
    const rows = rawLogs.map((log) => {
      const badge = getActionBadge(log.actionType)
      const date = new Date(log.occurredAt).toLocaleString("vi-VN")
      const admin = cleanText(log.performedByName) || "Super Admin"
      const target = cleanText(log.restaurantName || log.entityType) || "Hệ thống"
      const reason = log.reason || log.valueAfter || "—"
      return [
        log.id,
        `"${date}"`,
        `"${admin}"`,
        `"${badge.label}"`,
        `"${target}"`,
        `"${reason.replace(/"/g, '""')}"`,
        `"Thành công"`,
      ].join(",")
    })

    const csvContent = "\uFEFF" + [header.join(","), ...rows].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `system_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Tính số thứ tự đang xem
  const fromRecord = totalElements === 0 ? 0 : pageIndex * pageSize + 1
  const toRecord = Math.min((pageIndex + 1) * pageSize, totalElements)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Nhật ký hệ thống</h1>
          <p className="text-sm text-gray-500 mt-1">
            Toàn bộ thao tác quản trị cấp nền tảng · Tự động phân ngày & phân trang
          </p>
        </div>

        {/* Nút Xuất log & Làm mới */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Làm mới dữ liệu"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${isFetching ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={handleExportLog}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 text-white hover:bg-black shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất log (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Ô tìm kiếm */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo quản trị viên, đối tượng, thao tác..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
            />
          </div>

          {/* Lọc loại thao tác */}
          <div className="lg:col-span-4 relative">
            <select
              value={actionFilter}
              onChange={(e) => handleActionChange(e.target.value)}
              className="w-full appearance-none pl-9 pr-8 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14] cursor-pointer"
            >
              <option value="ALL">Mọi thao tác quản trị</option>
              <option value="LOGIN">Đăng nhập</option>
              <option value="LOGOUT">Đăng xuất</option>
              <option value="CREATE">Tạo mới</option>
              <option value="UPDATE">Cập nhật</option>
              <option value="STATUS_CHANGE">Đổi trạng thái</option>
              <option value="CONFIG_CHANGE">Cập nhật cấu hình</option>
              <option value="PERMISSION_CHANGE">Phân quyền</option>
            </select>
            <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Lọc thời gian */}
          <div className="lg:col-span-3 relative">
            <select
              value={timeFilter}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-full appearance-none pl-9 pr-8 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14] cursor-pointer"
            >
              <option value="today">Hôm nay</option>
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="90d">90 ngày qua</option>
              <option value="all">Tất cả thời gian</option>
            </select>
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#E03A14]" />
            <p className="text-sm font-medium text-gray-600">Đang tải nhật ký hệ thống...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-gray-400 space-y-2">
            <Clock className="w-10 h-10 mx-auto text-gray-300" />
            <p className="font-semibold text-gray-700 text-base">Không có dữ liệu nhật ký phù hợp</p>
            <p className="text-xs text-gray-400">
              Hãy thử chọn khoảng thời gian khác hoặc điều chỉnh lại bộ lọc tìm kiếm.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6 w-36">GIỜ THAO TÁC</th>
                  <th className="py-3.5 px-6 w-56">QUẢN TRỊ VIÊN</th>
                  <th className="py-3.5 px-6 w-44">THAO TÁC</th>
                  <th className="py-3.5 px-6">ĐỐI TƯỢNG TÁC ĐỘNG</th>
                  <th className="py-3.5 px-6 w-32 text-center">KẾT QUẢ</th>
                  <th className="py-3.5 px-6 w-20 text-right">CHI TIẾT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {groupedLogs.map((group, groupIdx) => (
                  <React.Fragment key={groupIdx}>
                    {/* Header Phân Ngày (Date Group Header) */}
                    <tr className="bg-gray-50/90 border-y border-gray-200 font-semibold text-xs text-gray-700">
                      <td colSpan={6} className="py-2.5 px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[#E03A14]" />
                            <span className="text-gray-900 font-bold">{group.title}</span>
                          </div>
                          <span className="text-xs text-gray-500 font-normal">
                            {group.items.length} thao tác trong ngày
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Danh sách bản ghi thuộc ngày */}
                    {group.items.map((log) => {
                      const badge = getActionBadge(log.actionType)
                      const timeStr = new Date(log.occurredAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                      const adminName = cleanText(log.performedByName) || "Super Admin"
                      const targetName = cleanText(log.restaurantName || log.entityType) || "Hệ thống"

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                          onClick={() => setSelectedLog(log)}
                        >
                          {/* Giờ thao tác */}
                          <td className="py-3.5 px-6 text-gray-600 font-mono text-xs flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>{timeStr}</span>
                          </td>

                          {/* Quản trị viên */}
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-orange-100 text-[#E03A14] font-bold text-xs flex items-center justify-center shrink-0">
                                {adminName.charAt(0).toUpperCase()}
                              </div>
                              <div className="font-semibold text-gray-900 truncate max-w-[180px]">
                                {adminName}
                              </div>
                            </div>
                          </td>

                          {/* Thao tác */}
                          <td className="py-3.5 px-6">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {badge.label}
                            </span>
                          </td>

                          {/* Đối tượng */}
                          <td className="py-3.5 px-6">
                            <div className="text-gray-900 font-medium truncate max-w-md">
                              {targetName}
                            </div>
                            {log.reason && (
                              <div className="text-xs text-gray-500 truncate mt-0.5 max-w-md">
                                {cleanText(log.reason)}
                              </div>
                            )}
                          </td>

                          {/* Kết quả */}
                          <td className="py-3.5 px-6 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Thành công
                            </span>
                          </td>

                          {/* Xem chi tiết */}
                          <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedLog(log)}
                              title="Xem chi tiết thao tác"
                              className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Thanh Phân Trang (Pagination Toolbar) */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Thông tin số lượng */}
          <div className="text-xs sm:text-sm text-gray-600">
            Hiển thị <strong className="text-gray-900 font-semibold">{fromRecord}</strong>–
            <strong className="text-gray-900 font-semibold">{toRecord}</strong> trong tổng số{" "}
            <strong className="text-gray-900 font-semibold">{totalElements}</strong> thao tác
          </div>

          {/* Chọn số dòng mỗi trang & Điều hướng trang */}
          <div className="flex items-center gap-4">
            {/* Chọn số dòng */}
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="py-1 px-2 border border-gray-200 rounded-lg bg-white text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 cursor-pointer"
              >
                <option value={10}>10 dòng/trang</option>
                <option value={20}>20 dòng/trang</option>
                <option value={50}>50 dòng/trang</option>
                <option value={100}>100 dòng/trang</option>
              </select>
            </div>

            {/* Nút điều hướng */}
            <div className="flex items-center gap-1">
              {/* Trang đầu */}
              <button
                type="button"
                onClick={() => setPageIndex(0)}
                disabled={pageIndex <= 0 || isLoading}
                title="Về trang đầu"
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Trang trước */}
              <button
                type="button"
                onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                disabled={pageIndex <= 0 || isLoading}
                title="Trang trước"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Trước</span>
              </button>

              {/* Hiển thị số trang */}
              <div className="px-3 py-1 text-xs font-semibold text-gray-700 whitespace-nowrap">
                Trang {pageIndex + 1} / {totalPages}
              </div>

              {/* Trang sau */}
              <button
                type="button"
                onClick={() => setPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={pageIndex >= totalPages - 1 || isLoading}
                title="Trang sau"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span className="hidden sm:inline">Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Trang cuối */}
              <button
                type="button"
                onClick={() => setPageIndex(totalPages - 1)}
                disabled={pageIndex >= totalPages - 1 || isLoading}
                title="Đến trang cuối"
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Xem chi tiết nhật ký thao tác */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <Shield className="w-5 h-5 text-[#E03A14]" />
              <span>Chi tiết thao tác nhật ký #{selectedLog?.id}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <div className="text-xs text-gray-400 font-medium">Thời điểm thực hiện</div>
                  <div className="text-gray-900 font-semibold mt-1">
                    {new Date(selectedLog.occurredAt).toLocaleString("vi-VN")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">Quản trị viên</div>
                  <div className="text-gray-900 font-semibold mt-1">
                    {cleanText(selectedLog.performedByName) || "Super Admin"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">Loại thao tác</div>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        getActionBadge(selectedLog.actionType).bg
                      } ${getActionBadge(selectedLog.actionType).text} ${
                        getActionBadge(selectedLog.actionType).border
                      }`}
                    >
                      {getActionBadge(selectedLog.actionType).label}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">Kết quả</div>
                  <div className="text-emerald-700 font-semibold mt-1 flex items-center gap-1 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Thành công</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-400 font-medium">Đối tượng tác động</div>
                  <div className="text-gray-900 font-semibold mt-0.5">
                    {cleanText(selectedLog.restaurantName || selectedLog.entityType) || "Hệ thống"}
                    {selectedLog.entityId && (
                      <span className="text-xs text-gray-400 font-normal ml-1.5">
                        (ID: {selectedLog.entityId})
                      </span>
                    )}
                  </div>
                </div>

                {selectedLog.reason && (
                  <div>
                    <div className="text-xs text-gray-400 font-medium">Lý do / Ghi chú</div>
                    <div className="text-gray-800 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs mt-1">
                      {cleanText(selectedLog.reason)}
                    </div>
                  </div>
                )}

                {selectedLog.valueBefore && (
                  <div>
                    <div className="text-xs text-gray-400 font-medium">Giá trị trước thay đổi</div>
                    <div className="text-gray-700 font-mono bg-gray-50 p-2 rounded-lg text-xs mt-1 overflow-x-auto">
                      {selectedLog.valueBefore}
                    </div>
                  </div>
                )}

                {selectedLog.valueAfter && (
                  <div>
                    <div className="text-xs text-gray-400 font-medium">Giá trị sau thay đổi</div>
                    <div className="text-gray-700 font-mono bg-gray-50 p-2 rounded-lg text-xs mt-1 overflow-x-auto">
                      {selectedLog.valueAfter}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-black transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
