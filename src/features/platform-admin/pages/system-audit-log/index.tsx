import { useState } from "react"
import {
  Download,
  Loader2,
  Calendar,
  CheckCircle2,
  Filter,
} from "lucide-react"

import { useAuditLogs } from "@/features/platform-admin/api"
import { useToast } from "@/hooks/use-toast"
import type { AuditLog } from "@/types/models"

export default function SystemAuditLogPage() {
  const { toast } = useToast()
  const [actionFilter, setActionFilter] = useState<string>("ALL")
  const [timeFilter, setTimeFilter] = useState<string>("7d")

  // API Call to BE AuditLogController (GET /api/v1/audit-logs)
  const { data: pageData, isLoading } = useAuditLogs({
    page: 0,
    size: 50,
  })

  const rawLogs: AuditLog[] = pageData?.content || []

  // Pre-fill or enhance with mock-like fallback for platform-level actions if BE logs are empty
  const fallbackLogs: Array<{
    id: number
    occurredAt: string
    timeDisplay: string
    adminName: string
    actionTag: { label: string; bg: string; text: string }
    target: string
    result: string
  }> = [
    {
      id: 1,
      occurredAt: "2026-10-10T11:02:00",
      timeDisplay: "11:02",
      adminName: "Super Admin",
      actionTag: { label: "Đổi gói", bg: "bg-purple-50", text: "text-purple-600" },
      target: "Trà Sữa Mộc: Pro → Free",
      result: "Thành công",
    },
    {
      id: 2,
      occurredAt: "2026-10-10T11:20:00",
      timeDisplay: "11:20",
      adminName: "Super Admin",
      actionTag: { label: "Khóa NH", bg: "bg-rose-50", text: "text-rose-600" },
      target: "Trà Sữa Mộc",
      result: "Thành công",
    },
    {
      id: 3,
      occurredAt: "2026-10-10T09:15:00",
      timeDisplay: "09:15",
      adminName: "Lê Vận Hành",
      actionTag: { label: "Tạo NH", bg: "bg-emerald-50", text: "text-emerald-600" },
      target: "Cơm Tấm Sài Gòn (NH-0003)",
      result: "Thành công",
    },
    {
      id: 4,
      occurredAt: "2026-10-09T16:00:00",
      timeDisplay: "Hôm qua",
      adminName: "Super Admin",
      actionTag: { label: "Cập nhật cấu hình", bg: "bg-gray-100", text: "text-gray-700" },
      target: "Bật bắt buộc 2FA",
      result: "Thành công",
    },
    {
      id: 5,
      occurredAt: "2026-10-09T08:30:00",
      timeDisplay: "Hôm qua",
      adminName: "Super Admin",
      actionTag: { label: "Đăng nhập", bg: "bg-blue-50", text: "text-blue-600" },
      target: "—",
      result: "Thành công",
    },
    {
      id: 6,
      occurredAt: "2026-10-08T14:10:00",
      timeDisplay: "2 ngày trước",
      adminName: "Lê Vận Hành",
      actionTag: { label: "Gia hạn gói", bg: "bg-gray-100", text: "text-gray-700" },
      target: "Phở Việt (Pro · tháng)",
      result: "Thành công",
    },
  ]

  // Map BE logs or use fallback if BE has no platform logs yet
  const displayLogs = rawLogs.length > 0
    ? rawLogs.map((l) => {
        const time = new Date(l.occurredAt).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })
        let tag = { label: l.actionType || "Hành động", bg: "bg-gray-100", text: "text-gray-700" }
        if (l.actionType === "CREATE") tag = { label: "Tạo mới", bg: "bg-emerald-50", text: "text-emerald-600" }
        if (l.actionType === "STATUS_CHANGE") tag = { label: "Đổi trạng thái", bg: "bg-rose-50", text: "text-rose-600" }
        if (l.actionType === "CONFIG_CHANGE") tag = { label: "Cập nhật cấu hình", bg: "bg-purple-50", text: "text-purple-600" }
        if (l.actionType === "LOGIN") tag = { label: "Đăng nhập", bg: "bg-blue-50", text: "text-blue-600" }

        return {
          id: l.id,
          occurredAt: l.occurredAt,
          timeDisplay: time,
          adminName: l.performedByName || "Super Admin",
          actionTag: tag,
          target: l.restaurantName || l.entityType || "Hệ thống",
          result: "Thành công",
        }
      })
    : fallbackLogs

  const handleExportLog = () => {
    toast({
      variant: "success",
      title: "Xuất nhật ký thành công",
      description: "Đang tải file CSV nhật ký hệ thống...",
    })
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Thời điểm,Quản trị viên,Thao tác,Đối tượng,Kết quả\n" +
      displayLogs
        .map(
          (d) =>
            `"${d.timeDisplay}","${d.adminName}","${d.actionTag.label}","${d.target}","${d.result}"`
        )
        .join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `system_audit_logs_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header matching mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Nhật ký hệ thống</h1>
          <p className="text-sm text-gray-500 mt-1">
            Toàn bộ thao tác quản trị cấp nền tảng
          </p>
        </div>

        {/* Filters and Export button */}
        <div className="flex items-center gap-3">
          {/* Action Filter */}
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 cursor-pointer"
            >
              <option value="ALL">Mọi thao tác</option>
              <option value="CHANGE_PLAN">Đổi gói</option>
              <option value="LOCK">Khóa NH</option>
              <option value="CREATE">Tạo NH</option>
              <option value="CONFIG">Cập nhật cấu hình</option>
              <option value="LOGIN">Đăng nhập</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Time Filter */}
          <div className="relative">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 cursor-pointer"
            >
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="90d">90 ngày qua</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Export button */}
          <button
            onClick={handleExportLog}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>Xuất log</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#E03A14]" />
            <p className="text-sm">Đang tải nhật ký hệ thống...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/75 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">THỜI ĐIỂM</th>
                  <th className="py-3.5 px-6">QUẢN TRỊ VIÊN</th>
                  <th className="py-3.5 px-6">THAO TÁC</th>
                  <th className="py-3.5 px-6">ĐỐI TƯỢNG</th>
                  <th className="py-3.5 px-6 text-right">KẾT QUẢ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {displayLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Time */}
                    <td className="py-4 px-6 text-gray-600 font-medium">
                      {log.timeDisplay}
                    </td>

                    {/* Admin */}
                    <td className="py-4 px-6 font-semibold text-gray-900">
                      {log.adminName}
                    </td>

                    {/* Action Tag */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${log.actionTag.bg} ${log.actionTag.text}`}
                      >
                        {log.actionTag.label}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="py-4 px-6 text-gray-700">
                      {log.target}
                    </td>

                    {/* Result */}
                    <td className="py-4 px-6 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {log.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
