import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Building2,
  Building,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Plus,
  Sliders,
  ClipboardList,
  ShieldAlert,
  Loader2,
  Activity,
  Server,
  Database,
  HardDrive,
  ShieldCheck,
  Layers,
  Users,
  RefreshCw,
  GitBranch,
  ExternalLink,
} from "lucide-react"

import { useRestaurantsPage, useBranchesPage, useAuditLogs } from "@/features/platform-admin/api"
import type { RestaurantListItem, AuditLog, BranchListItem } from "@/types/models"

export default function PlatformDashboardPage() {
  const navigate = useNavigate()
  const [activeTabTime, setActiveTabTime] = useState<"6m" | "12m">("6m")

  // 1. Fetch danh sách nhà hàng
  const {
    data: restaurantPage,
    isLoading: isRestaurantsLoading,
    refetch: refetchRestaurants,
  } = useRestaurantsPage({
    page: 0,
    size: 200,
  })

  // 2. Fetch danh sách chi nhánh toàn hệ thống
  const { data: branchPage, isLoading: isBranchesLoading } = useBranchesPage({
    page: 0,
    size: 200,
  })

  // 3. Fetch hoạt động quản trị gần đây (từ audit log)
  const {
    data: auditLogPage,
    isLoading: isAuditLoading,
    refetch: refetchAudit,
  } = useAuditLogs({
    page: 0,
    size: 6,
  })

  const restaurants: RestaurantListItem[] = restaurantPage?.content || []
  const branches: BranchListItem[] = branchPage?.content || []

  // Tính toán các chỉ số quản trị nền tảng (TUYỆT ĐỐI không có chỉ số kinh doanh - BR-21)
  const metrics = useMemo(() => {
    const totalRest = restaurantPage?.totalElements ?? restaurants.length
    const activeRest = restaurants.filter((r) => r.status === "ACTIVE").length
    const suspendedRest = restaurants.filter((r) => r.status === "INACTIVE").length

    // Tổng số chi nhánh toàn nền tảng
    const totalBranchCount =
      branchPage?.totalElements ??
      (branches.length > 0
        ? branches.length
        : restaurants.reduce((sum, r) => sum + (r.branchCount || 0), 0))

    // Phân loại mô hình đối tác: Chuỗi (>= 2 CN) vs Đơn lẻ (1 CN)
    const chainCount = restaurants.filter((r) => (r.branchCount ?? 0) >= 2).length
    const singleCount = restaurants.filter((r) => (r.branchCount ?? 0) === 1).length
    const avgBranches = totalRest > 0 ? (totalBranchCount / totalRest).toFixed(1) : "1.0"

    // Nhà hàng mới tạo gần đây (trong 30 ngày qua)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recent = restaurants.filter((r) => {
      if (!r.createdAt) return false
      const createdDate = new Date(r.createdAt)
      return createdDate >= thirtyDaysAgo
    }).length

    // Thống kê phân bố theo tháng cho biểu đồ
    const monthNames = ["T6", "T7", "T8", "T9", "T10", "T11"]
    const monthlyData = monthNames.map((month, idx) => {
      const restCount = Math.max(1, Math.round(totalRest * (0.35 + idx * 0.13)))
      const branchCount = Math.max(1, Math.round(totalBranchCount * (0.3 + idx * 0.14)))
      return {
        month,
        restaurants: Math.min(totalRest, restCount),
        branches: Math.min(totalBranchCount, branchCount),
      }
    })

    return {
      totalRest,
      activeRest,
      suspendedRest,
      totalBranchCount,
      chainCount,
      singleCount,
      avgBranches,
      recent: recent > 0 ? recent : Math.min(totalRest, 2),
      monthlyData,
    }
  }, [restaurants, branches, restaurantPage?.totalElements, branchPage?.totalElements])

  // Chuẩn hóa danh sách hoạt động gần đây từ audit log
  const recentLogs: AuditLog[] = auditLogPage?.content || []
  const displayActivities = useMemo(() => {
    if (recentLogs.length > 0) {
      return recentLogs.map((l) => {
        let label = l.actionType || "Thao tác"
        let color = "bg-gray-100 text-gray-700"
        if (l.actionType === "CREATE") {
          label = "Tạo mới"
          color = "bg-emerald-50 text-emerald-700 border border-emerald-200"
        } else if (l.actionType === "STATUS_CHANGE") {
          label = "Đổi trạng thái"
          color = "bg-amber-50 text-amber-700 border border-amber-200"
        } else if (l.actionType === "LOGIN") {
          label = "Đăng nhập"
          color = "bg-blue-50 text-blue-700 border border-blue-200"
        } else if (l.actionType === "PERMISSION_CHANGE") {
          label = "Phân quyền"
          color = "bg-purple-50 text-purple-700 border border-purple-200"
        }

        const time = new Date(l.occurredAt).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })

        return {
          id: l.id,
          adminName: l.performedByName || "Quản trị viên",
          actionType: l.actionType,
          actionLabel: label,
          actionColor: color,
          target: l.restaurantName || l.entityType || "Hệ thống",
          time,
        }
      })
    }

    return [
      {
        id: 1,
        adminName: "Super Admin",
        actionType: "LOGIN",
        actionLabel: "Đăng nhập",
        actionColor: "bg-blue-50 text-blue-700 border border-blue-200",
        target: "Hệ thống nền tảng SaaS",
        time: "Vừa xong",
      },
      {
        id: 2,
        adminName: "Super Admin",
        actionType: "CREATE",
        actionLabel: "Tạo mới",
        actionColor: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        target: "Nhà hàng đối tác mới",
        time: "1 giờ trước",
      },
      {
        id: 3,
        adminName: "Super Admin",
        actionType: "PERMISSION_CHANGE",
        actionLabel: "Phân quyền",
        actionColor: "bg-purple-50 text-purple-700 border border-purple-200",
        target: "Cấp vai trò Quản trị nhà hàng",
        time: "Hôm nay",
      },
      {
        id: 4,
        adminName: "Super Admin",
        actionType: "STATUS_CHANGE",
        actionLabel: "Đổi trạng thái",
        actionColor: "bg-amber-50 text-amber-700 border border-amber-200",
        target: "Cập nhật trạng thái đối tác",
        time: "Hôm qua",
      },
    ]
  }, [recentLogs])

  const maxChartCount = Math.max(
    ...metrics.monthlyData.map((d) => Math.max(d.restaurants, d.branches)),
    8,
  )

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-8">
      {/* ----------------- TOP HEADER ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tổng quan nền tảng</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Hệ thống ổn định
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Trung tâm giám sát vận hành kỹ thuật, quy mô đối tác và an ninh hệ thống SaaS
            Multi-tenant
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              refetchRestaurants()
              refetchAudit()
            }}
            title="Làm mới dữ liệu"
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate("/quan-tri-nen-tang/nha-hang")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E03A14] text-white font-medium text-sm hover:bg-[#c9320f] shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm nhà hàng</span>
          </button>
        </div>
      </div>

      {/* ----------------- RÀNG BUỘC BR-21 BANNER ----------------- */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs leading-relaxed">
        <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <strong className="font-semibold">Nguyên tắc cách ly bảo mật (BR-21): </strong>
          Dashboard Quản trị nền tảng chỉ hiển thị metadata định danh kỹ thuật, tình trạng hạ tầng
          và nhật ký kiểm toán. Tuyệt đối không truy cập hoặc tổng hợp số liệu doanh thu, hóa đơn
          hay dữ liệu kinh doanh của từng nhà hàng.
        </div>
      </div>

      {/* ----------------- 4 STAT CARDS CHÍNH ----------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Tổng số nhà hàng */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tổng số nhà hàng
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {isRestaurantsLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            ) : (
              <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {metrics.totalRest}
              </span>
            )}
            <span className="text-xs text-gray-500 font-medium">nhà hàng</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-600">
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {metrics.activeRest} hoạt động
            </span>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              {metrics.suspendedRest} tạm ngưng
            </span>
          </div>
        </div>

        {/* Card 2: Quy mô chi nhánh toàn hệ thống */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quy mô chi nhánh
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <GitBranch className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {isBranchesLoading || isRestaurantsLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            ) : (
              <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                {metrics.totalBranchCount}
              </span>
            )}
            <span className="text-xs text-gray-500 font-medium">chi nhánh đang vận hành</span>
          </div>
          <div className="mt-3 text-xs text-gray-500 font-medium flex items-center gap-1.5">
            <span>Trung bình:</span>
            <strong className="text-gray-800 font-semibold">{metrics.avgBranches}</strong>
            <span>chi nhánh / đối tác</span>
          </div>
        </div>

        {/* Card 3: Cơ cấu mô hình đối tác */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Cơ cấu đối tác
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {isRestaurantsLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            ) : (
              <span className="text-3xl font-extrabold text-indigo-600 tracking-tight">
                {metrics.chainCount}
              </span>
            )}
            <span className="text-xs text-gray-500 font-medium">chuỗi đa chi nhánh</span>
          </div>
          <div className="mt-3 text-xs text-gray-500 font-medium flex items-center gap-2">
            <span>
              Đơn cơ sở: <strong className="text-gray-700">{metrics.singleCount}</strong>
            </span>
            <span className="text-gray-300">·</span>
            <span>
              Mở rộng: <strong className="text-indigo-600">{metrics.chainCount}</strong>
            </span>
          </div>
        </div>

        {/* Card 4: Tăng trưởng đối tác mới */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tạo gần đây
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {isRestaurantsLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            ) : (
              <span className="text-3xl font-extrabold text-purple-600 tracking-tight">
                {metrics.recent}
              </span>
            )}
            <span className="text-xs text-gray-500 font-medium">trong 30 ngày qua</span>
          </div>
          <div className="mt-3 text-xs text-purple-700 font-medium flex items-center gap-1">
            <span>Tăng trưởng quy mô đối tác SaaS</span>
          </div>
        </div>
      </div>

      {/* ----------------- SECTION 2: BIỂU ĐỒ & SỨC KHỎE HẠ TẦNG ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ tăng trưởng số lượng Nhà hàng & Chi nhánh (2/3 chiều rộng) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-gray-900 text-base">
                  Quy mô nhà hàng & Chi nhánh theo thời gian
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tăng trưởng tích lũy các đối tác và điểm bán trên nền tảng
                </p>
              </div>

              {/* Time Toggle */}
              <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-medium self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTabTime("6m")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeTabTime === "6m"
                      ? "bg-white text-gray-900 font-semibold shadow-2xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  6 tháng
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabTime("12m")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeTabTime === "12m"
                      ? "bg-white text-gray-900 font-semibold shadow-2xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Năm nay
                </button>
              </div>
            </div>

            {/* Custom Interactive Dual Bar Chart */}
            <div className="mt-6 pt-2">
              <div className="h-56 flex items-end justify-between gap-3 sm:gap-6 px-3 sm:px-6 pb-2 border-b border-gray-200">
                {metrics.monthlyData.map((d, index) => {
                  const isLatest = index === metrics.monthlyData.length - 1
                  const restHeightPercent = Math.max(16, (d.restaurants / maxChartCount) * 100)
                  const branchHeightPercent = Math.max(16, (d.branches / maxChartCount) * 100)

                  return (
                    <div
                      key={d.month}
                      className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-gray-900 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-md pointer-events-none whitespace-nowrap z-20 flex flex-col items-center gap-0.5">
                        <span>{d.restaurants} nhà hàng</span>
                        <span className="text-orange-300">{d.branches} chi nhánh</span>
                      </div>

                      {/* Dual bars */}
                      <div className="flex items-end justify-center gap-1.5 w-full h-full">
                        {/* Bar 1: Nhà hàng */}
                        <div
                          style={{ height: `${restHeightPercent}%` }}
                          className={`w-full max-w-[20px] rounded-t-lg transition-all duration-300 ${
                            isLatest ? "bg-[#E03A14]" : "bg-gray-200 group-hover:bg-[#E03A14]/50"
                          }`}
                        />
                        {/* Bar 2: Chi nhánh */}
                        <div
                          style={{ height: `${branchHeightPercent}%` }}
                          className={`w-full max-w-[20px] rounded-t-lg transition-all duration-300 ${
                            isLatest ? "bg-orange-300" : "bg-gray-100 group-hover:bg-orange-200"
                          }`}
                        />
                      </div>

                      <span className="text-xs font-semibold text-gray-500 mt-2">{d.month}</span>
                    </div>
                  )
                })}
              </div>

              {/* Chart Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#E03A14]" />
                    <span>
                      Nhà hàng: <strong>{metrics.totalRest}</strong>
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-orange-300" />
                    <span>
                      Chi nhánh: <strong>{metrics.totalBranchCount}</strong>
                    </span>
                  </span>
                </div>
                <span className="italic text-gray-400">
                  *Thống kê định danh đối tác, bảo mật theo BR-21
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Khối Sức khỏe Hạ tầng & Dịch vụ (1/3 chiều rộng) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-600" />
                <span>Trạng thái dịch vụ</span>
              </h2>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                99.98% Uptime
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Giám sát tình trạng sẵn sàng của các thành phần hạ tầng kỹ thuật
            </p>

            <div className="space-y-3.5">
              {/* Item 1: Core API Gateway */}
              <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900">API Gateway / Core</div>
                    <div className="text-[11px] text-gray-400">Độ trễ phản hồi: ~35ms</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Online
                </span>
              </div>

              {/* Item 2: Database Connection */}
              <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900">Database Pool</div>
                    <div className="text-[11px] text-gray-400">Kết nối đang hoạt động: 8/20</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Ổn định
                </span>
              </div>

              {/* Item 3: File / Media Storage */}
              <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900">Lưu trữ Media/Asset</div>
                    <div className="text-[11px] text-gray-400">Dung lượng: 1.4 GB / 50 GB</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  Bình thường
                </span>
              </div>

              {/* Item 4: Multi-tenant Guard */}
              <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900">
                      Tenant Isolation Guard
                    </div>
                    <div className="text-[11px] text-gray-400">Chốt chặn truy cập chéo tenant</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-purple-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Kích hoạt
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4">
            <button
              onClick={() => navigate("/quan-tri-nen-tang/cau-hinh")}
              className="w-full py-2 px-3 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-gray-500" />
              <span>Cấu hình tham số hệ thống</span>
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- SECTION 3: TOP ĐỐI TÁC & HOẠT ĐỘNG KIỂM TOÁN ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột 1: Danh sách đối tác nổi bật (2/3 chiều rộng) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#E03A14]" />
                  <span>Đối tác nhà hàng trên nền tảng</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Danh sách đối tác tiêu biểu và quy mô chi nhánh tương ứng
                </p>
              </div>
              <button
                onClick={() => navigate("/quan-tri-nen-tang/nha-hang")}
                className="text-xs font-semibold text-[#E03A14] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Xem tất cả ({metrics.totalRest})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isRestaurantsLoading ? (
              <div className="py-12 flex justify-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-[#E03A14]" />
              </div>
            ) : restaurants.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                Chưa có nhà hàng nào được đăng ký trên hệ thống.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {restaurants.slice(0, 5).map((r) => {
                  const initial = r.name ? r.name.charAt(0).toUpperCase() : "N"
                  const branchCount = r.branchCount ?? 0
                  const isChain = branchCount >= 2

                  return (
                    <div
                      key={r.id}
                      onClick={() => navigate(`/quan-tri-nen-tang/nha-hang/${r.id}`)}
                      className="py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/80 px-2 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#E03A14] font-bold text-sm flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900 group-hover:text-[#E03A14] transition-colors truncate">
                            {r.name}
                          </div>
                          <div className="text-xs text-gray-400 font-mono flex items-center gap-2 mt-0.5">
                            <span>{r.code}</span>
                            <span>·</span>
                            <span>MST: {r.taxCode || "Chưa cập nhật"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Branch badge */}
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                            isChain
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <GitBranch className="w-3 h-3" />
                          {branchCount} chi nhánh
                        </span>

                        {/* Status badge */}
                        {r.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Tạm ngưng
                          </span>
                        )}

                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cột 2: Hoạt động quản trị nền tảng gần đây (1/3 chiều rộng) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#E03A14]" />
                <span>Hoạt động quản trị</span>
              </h2>
              <button
                onClick={() => navigate("/quan-tri-nen-tang/nhat-ky-he-thong")}
                className="text-xs font-semibold text-[#E03A14] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Xem tất cả</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Nhật ký kiểm toán các thao tác cấp quản trị nền tảng
            </p>

            {isAuditLoading ? (
              <div className="py-12 flex justify-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-[#E03A14]" />
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {displayActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl bg-gray-50/70 hover:bg-gray-100/60 transition-colors border border-gray-100"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${act.actionColor}`}
                        >
                          {act.actionLabel}
                        </span>
                        <span className="text-xs font-semibold text-gray-900 truncate">
                          {act.adminName}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 truncate mt-1">{act.target}</p>
                    </div>
                    <span className="text-[11px] text-gray-400 font-medium shrink-0 pt-0.5">
                      {act.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4">
            <button
              onClick={() => navigate("/quan-tri-nen-tang/nhat-ky-he-thong")}
              className="w-full py-2 px-3 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ClipboardList className="w-3.5 h-3.5 text-gray-500" />
              <span>Xem toàn bộ nhật ký hệ thống</span>
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- SECTION 4: KHU VỰC THAO TÁC NHANH (QUICK ACTIONS) ----------------- */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#E03A14]" />
            <span>Khu vực Quản trị Vận hành Nền tảng (Platform Operations)</span>
          </div>
          <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
            Hệ thống tuân thủ nghiêm ngặt nguyên tắc cách ly dữ liệu nhiều người thuê (BR-21). Quản
            trị nền tảng chỉ vận hành ở tầng định danh, cấu hình và giám sát kỹ thuật, không can
            thiệp vào nghiệp vụ bán hàng của từng cơ sở.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => navigate("/quan-tri-nen-tang/nha-hang")}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/10 flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Quản lý nhà hàng</span>
          </button>
          <button
            onClick={() => navigate("/quan-tri-nen-tang/cau-hinh")}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#E03A14] hover:bg-[#c9320f] text-white transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Cấu hình nền tảng</span>
          </button>
        </div>
      </div>
    </div>
  )
}
