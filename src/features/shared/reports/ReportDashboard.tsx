import * as React from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { PageHeader } from "@/components/layout/PageHeader"
import { ReportHeaderActions } from "./components/ReportHeader"
import { DailyReportTab } from "./components/DailyReportTab"
import { HourlyReportTab } from "./components/HourlyReportTab"
import { BranchCompareTab } from "./components/BranchCompareTab"
import {
  TimeRangeDropdown,
  detectActivePreset,
  PRESET_OPTIONS,
  type DateRangeValue,
} from "./components/TimeRangeDropdown"
import { HourlyTimePicker } from "./components/HourlyTimePicker"
import { useAuthStore } from "@/stores/auth.store"
import { useBranchesByRestaurant } from "@/api/branches.api"
import { downloadReportFile } from "@/api/reports.api"
import { getErrorMessage } from "@/lib/http"
import { APP_ROLE } from "@/config/roles"
import { format as formatDate } from "date-fns"

const TAB_HEADER_META: Record<string, { title: string; subtitle: string }> = {
  daily: {
    title: "Báo cáo doanh thu",
    subtitle: "Doanh thu theo thời gian (FR-RPT-01)",
  },
  hourly: {
    title: "Doanh thu theo khung giờ",
    subtitle: "Phân bổ doanh thu & số bàn theo giờ · cơ sở bố trí nhân sự (FR-RPT-02)",
  },
  branch: {
    title: "So sánh chi nhánh",
    subtitle: "Xếp hạng & cảnh báo chỉ số bất thường (FR-RPT-04)",
  },
}

interface ReportDashboardProps {
  /** Quản trị NH: có tab "So sánh chi nhánh" (mặc định). QL chi nhánh: KHÔNG có tab này (mục 4.3). */
  showBranchCompare?: boolean
  canExport?: boolean
}

export function ReportDashboard({
  showBranchCompare = true,
  canExport = true,
}: ReportDashboardProps = {}) {
  const { toast } = useToast()
  const { account, role, branchId } = useAuthStore()
  const [currentTab, setCurrentTab] = React.useState<string>("daily")
  const [selectedBranchIds, setSelectedBranchIds] = React.useState<number[]>([])

  // State quản lý khoảng thời gian (Date Range)
  const [dateRange, setDateRange] = React.useState<DateRangeValue>(() => {
    const today = new Date()
    return { from: today, to: today }
  })

  const [selectedMetric, setSelectedMetric] = React.useState<string>("Theo doanh thu")
  const [hourlyStartHour, setHourlyStartHour] = React.useState<number>(0)
  const [hourlyEndHour, setHourlyEndHour] = React.useState<number>(23)

  // Determine if user is Branch Manager
  const isBranchManager = role === APP_ROLE.BRANCH_MANAGER
  const restaurantId = account?.restaurantId

  // Fetch branches for Restaurant Admin
  const { data: branchesData, isLoading: branchesLoading } = useBranchesByRestaurant(restaurantId)

  // Initialize selectedBranchIds based on role
  React.useEffect(() => {
    if (isBranchManager && branchId) {
      // Branch Manager: lock to their branch
      setSelectedBranchIds([branchId])
    } else if (branchesData && branchesData.length > 0 && selectedBranchIds.length === 0) {
      // Restaurant Admin: default to all branches
      setSelectedBranchIds(branchesData.map((b) => b.id))
    }
  }, [branchesData, selectedBranchIds.length, isBranchManager, branchId])

  // Calculate dynamic date range (ISO strings) based on dateRange
  const { dateFrom, dateTo, dateDisplayLabel } = React.useMemo(() => {
    const now = new Date()
    const fromStr = formatDate(dateRange.from, "yyyy-MM-dd")
    const toStr = formatDate(dateRange.to, "yyyy-MM-dd")
    const fromLabel = formatDate(dateRange.from, "dd/MM/yyyy")
    const toLabel = formatDate(dateRange.to, "dd/MM/yyyy")

    const matchingKey = detectActivePreset(dateRange.from, dateRange.to, now)
    const preset = PRESET_OPTIONS.find((p) => p.key === matchingKey)

    let label = ""
    if (preset) {
      if (matchingKey === "today") {
        label = `Hôm nay · ${fromLabel}`
      } else if (matchingKey === "yesterday") {
        label = `Hôm qua · ${fromLabel}`
      } else {
        label = `${preset.label} (${fromLabel} – ${toLabel})`
      }
    } else {
      label = fromStr === toStr ? `Ngày ${fromLabel}` : `Khoảng ngày: ${fromLabel} – ${toLabel}`
    }

    return {
      dateFrom: `${fromStr}T00:00:00`,
      dateTo: `${toStr}T23:59:59`,
      dateDisplayLabel: label,
    }
  }, [dateRange])

  // Hourly datetime range for Hourly tab
  const hourlyDateTimeRange = React.useMemo(() => {
    const startHourPadded = String(hourlyStartHour).padStart(2, "0")
    const endHourPadded = String(hourlyEndHour).padStart(2, "0")
    const fromBase = dateFrom.split("T")[0]
    const toBase = dateTo.split("T")[0]
    return {
      from: `${fromBase}T${startHourPadded}:00:00`,
      to: `${toBase}T${endHourPadded}:59:59`,
    }
  }, [dateFrom, dateTo, hourlyStartHour, hourlyEndHour])

  const [isExporting, setIsExporting] = React.useState<boolean>(false)

  const handleExport = async (format: "xlsx" | "csv" = "xlsx") => {
    try {
      setIsExporting(true)
      const tabTitle = TAB_HEADER_META[currentTab]?.title || "Báo cáo"
      toast({
        title: "Đang xuất báo cáo",
        description: `Hệ thống đang chuẩn bị dữ liệu [${tabTitle}] và tạo file ${format.toUpperCase()}...`,
      })

      const type =
        currentTab === "hourly"
          ? "HOURLY"
          : currentTab === "branch"
            ? "BRANCH_COMPARISON"
            : "REVENUE"

      const from = currentTab === "hourly" ? hourlyDateTimeRange.from : dateFrom
      const to = currentTab === "hourly" ? hourlyDateTimeRange.to : dateTo

      await downloadReportFile({
        type,
        format,
        branchIds: selectedBranchIds,
        restaurantId,
        from,
        to,
        groupBy: "DAY",
      })

      toast({
        title: "Xuất báo cáo thành công",
        description: `Đã tải xuống file báo cáo [${tabTitle}] (.${format}).`,
      })
    } catch (error) {
      toast({
        variant: "danger",
        title: "Xuất báo cáo thất bại",
        description: getErrorMessage(error) || "Không thể xuất file báo cáo, vui lòng thử lại.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const headerMeta = TAB_HEADER_META[currentTab] || TAB_HEADER_META.daily

  // Handle branch selection
  const handleSelectBranches = (branchIds: number[]) => {
    if (!isBranchManager) {
      setSelectedBranchIds(branchIds)
    }
  }

  const headerActions = React.useMemo(
    () => (
      <div className="flex items-center gap-2">
        <TimeRangeDropdown variant="chip" range={dateRange} onChangeRange={setDateRange} />
        {currentTab === "hourly" && (
          <HourlyTimePicker
            variant="chip"
            startHour={hourlyStartHour}
            endHour={hourlyEndHour}
            onStartHourChange={setHourlyStartHour}
            onEndHourChange={setHourlyEndHour}
          />
        )}
      </div>
    ),
    [dateRange, currentTab, hourlyStartHour, hourlyEndHour],
  )

  // Show loading indicator while branches are being fetched for Restaurant Admin
  if (!isBranchManager && branchesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="text-center">
          <p className="text-text-secondary">Đang tải dữ liệu chi nhánh...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
      <PageHeader
        title={headerMeta.title}
        subtitle={
          currentTab === "daily"
            ? dateDisplayLabel
            : currentTab === "branch"
              ? `${dateDisplayLabel} · Xếp hạng & cảnh báo chỉ số bất thường (FR-RPT-04)`
              : headerMeta.subtitle
        }
        mobileSubtitle=""
        mobileHeaderActions={headerActions}
        actions={
          <ReportHeaderActions
            currentTab={currentTab}
            branches={branchesData || []}
            selectedBranchIds={selectedBranchIds}
            onSelectBranchIds={handleSelectBranches}
            isBranchManager={isBranchManager}
            dateRange={dateRange}
            onChangeRange={setDateRange}
            selectedMetric={selectedMetric}
            onSelectMetric={setSelectedMetric}
            onExport={canExport ? handleExport : undefined}
            isExporting={isExporting}
            hourlyStartHour={hourlyStartHour}
            hourlyEndHour={hourlyEndHour}
            onHourlyStartHourChange={setHourlyStartHour}
            onHourlyEndHourChange={setHourlyEndHour}
          />
        }
      />

      <div className="flex flex-col gap-6 p-6 lg:p-8">
        {/* Tabs Navigation & Content */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full space-y-6">
          <TabsList className="w-full justify-start gap-8 border-b border-border-default/80 bg-transparent p-0 rounded-none">
            <TabsTrigger
              value="daily"
              className="pb-3 text-sm font-medium text-text-tertiary transition-colors data-[state=active]:font-semibold data-[state=active]:text-brand-primary after:h-0.5 after:bg-transparent data-[state=active]:after:bg-brand-primary"
            >
              Theo thời gian
            </TabsTrigger>
            <TabsTrigger
              value="hourly"
              className="pb-3 text-sm font-medium text-text-tertiary transition-colors data-[state=active]:font-semibold data-[state=active]:text-brand-primary after:h-0.5 after:bg-transparent data-[state=active]:after:bg-brand-primary"
            >
              Theo khung giờ
            </TabsTrigger>
            {showBranchCompare && (
              <TabsTrigger
                value="branch"
                className="pb-3 text-sm font-medium text-text-tertiary transition-colors data-[state=active]:font-semibold data-[state=active]:text-brand-primary after:h-0.5 after:bg-transparent data-[state=active]:after:bg-brand-primary"
              >
                So sánh chi nhánh
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tab 1: Theo ngày */}
          <TabsContent value="daily" className="outline-none">
            <DailyReportTab branchIds={selectedBranchIds} from={dateFrom} to={dateTo} />
          </TabsContent>

          {/* Tab 2: Theo khung giờ */}
          <TabsContent value="hourly" className="outline-none">
            <HourlyReportTab
              branchIds={selectedBranchIds}
              from={hourlyDateTimeRange.from}
              to={hourlyDateTimeRange.to}
            />
          </TabsContent>

          {/* Tab 3: So sánh chi nhánh — chỉ Quản trị NH (mục 4.3) */}
          {showBranchCompare && restaurantId && (
            <TabsContent value="branch" className="outline-none">
              <BranchCompareTab restaurantId={restaurantId} from={dateFrom} to={dateTo} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

export default ReportDashboard
