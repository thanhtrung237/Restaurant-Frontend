import * as React from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { PageHeader } from "@/components/layout/PageHeader"
import { ReportHeaderActions } from "./components/ReportHeader"
import { DailyReportTab } from "./components/DailyReportTab"
import { HourlyReportTab } from "./components/HourlyReportTab"
import { BranchCompareTab } from "./components/BranchCompareTab"
import { TimeRangeDropdown } from "./components/TimeRangeDropdown"
import { HourlyTimePicker } from "./components/HourlyTimePicker"
import { useAuthStore } from "@/stores/auth.store"
import { useBranchesByRestaurant } from "@/api/branches.api"
import { APP_ROLE } from "@/config/roles"

const TAB_HEADER_META: Record<
  string,
  { title: string; subtitle: string }
> = {
  daily: {
    title: "Báo cáo doanh thu",
    subtitle: "Hôm nay · 26/07/2026",
  },
  hourly: {
    title: "Doanh thu theo khung giờ",
    subtitle: "Phân bổ doanh thu & số bàn theo giờ · cơ sở bố trí nhân sự (FR-RPT-02)",
  },
  branch: {
    title: "So sánh chi nhánh",
    subtitle: "Tháng 07/2026 · xếp hạng & cảnh báo chỉ số bất thường (FR-RPT-04)",
  },
}

interface ReportDashboardProps {
  /** Quản trị NH: có tab "So sánh chi nhánh" (mặc định). QL chi nhánh: KHÔNG có tab này (mục 4.3). */
  showBranchCompare?: boolean
}

export function ReportDashboard({ showBranchCompare = true }: ReportDashboardProps = {}) {
  const { toast } = useToast()
  const { account, role, branchId } = useAuthStore()
  const [currentTab, setCurrentTab] = React.useState<string>("daily")
  const [selectedBranchIds, setSelectedBranchIds] = React.useState<number[]>([])
  const [selectedDate, setSelectedDate] = React.useState<string>(() => {
    // Initialize with today's date in dd/MM/yyyy format
    const today = new Date()
    const day = String(today.getDate()).padStart(2, '0')
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const year = today.getFullYear()
    return `${day}/${month}/${year}`
  })
  const [selectedMetric, setSelectedMetric] = React.useState<string>("Theo doanh thu")
  const [hourlyStartHour, setHourlyStartHour] = React.useState<number>(0)
  const [hourlyEndHour, setHourlyEndHour] = React.useState<number>(23)

  // Determine if user is Branch Manager
  const isBranchManager = role === APP_ROLE.BRANCH_MANAGER
  const restaurantId = account?.restaurantId

  // Fetch branches for Restaurant Admin
  const { data: branchesData, isLoading: branchesLoading } = useBranchesByRestaurant(
    restaurantId,
  )

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

  const handleExport = () => {
    toast({
      title: "Xuất báo cáo",
      description: `Đang tải xuống dữ liệu báo cáo [${TAB_HEADER_META[currentTab]?.title || "Doanh thu"}]...`,
    })
  }

  const headerMeta = TAB_HEADER_META[currentTab] || TAB_HEADER_META.daily

  // Handle branch selection
  const handleSelectBranches = (branchIds: number[]) => {
    if (!isBranchManager) {
      setSelectedBranchIds(branchIds)
    }
  }

  // Handle date change - receives date string in dd/MM/yyyy format
  const handleDateChange = (dateString: string) => {
    setSelectedDate(dateString)
  }

  // Convert selected date (dd/MM/yyyy) to ISO datetime string base for API
  const selectedDateBase = React.useMemo(() => {
    try {
      const [day, month, year] = selectedDate.split("/")
      const date = new Date(Number(year), Number(month) - 1, Number(day))
      const yyyy = date.getFullYear()
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}` // Returns "YYYY-MM-DD"
    } catch {
      // Fallback to today
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }
  }, [selectedDate])

  // Create full ISO datetime strings for Daily and Branch tabs
  const selectedDateFrom = React.useMemo(() => {
    return `${selectedDateBase}T00:00:00`
  }, [selectedDateBase])

  const selectedDateTo = React.useMemo(() => {
    return `${selectedDateBase}T23:59:59`
  }, [selectedDateBase])

  // Create hourly datetime range for Hourly tab
  const hourlyDateTimeRange = React.useMemo(() => {
    const startHourPadded = String(hourlyStartHour).padStart(2, '0')
    const endHourPadded = String(hourlyEndHour).padStart(2, '0')
    return {
      from: `${selectedDateBase}T${startHourPadded}:00:00`,
      to: `${selectedDateBase}T${endHourPadded}:59:59`,
    }
  }, [selectedDateBase, hourlyStartHour, hourlyEndHour])

  // Figma "Báo cáo · Mobile (375)": bộ chọn kỳ nằm TRONG header, cạnh chip chi nhánh.
  // Phải memo hoá — usePageHeader so sánh headerActions bằng tham chiếu.
  const headerActions = React.useMemo(
    () => (
      <div className="flex items-center gap-2">
        <TimeRangeDropdown
          variant="chip"
          value={selectedDate}
          onChange={handleDateChange}
        />
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
    [selectedDate, currentTab, hourlyStartHour, hourlyEndHour],
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
        subtitle={headerMeta.subtitle}
        mobileSubtitle=""
        mobileHeaderActions={headerActions}
        actions={
          <ReportHeaderActions
            currentTab={currentTab}
            branches={branchesData || []}
            selectedBranchIds={selectedBranchIds}
            onSelectBranchIds={handleSelectBranches}
            isBranchManager={isBranchManager}
            selectedTime={selectedDate}
            onSelectTime={handleDateChange}
            selectedMetric={selectedMetric}
            onSelectMetric={setSelectedMetric}
            onExport={handleExport}
            hourlyStartHour={hourlyStartHour}
            hourlyEndHour={hourlyEndHour}
            onHourlyStartHourChange={setHourlyStartHour}
            onHourlyEndHourChange={setHourlyEndHour}
          />
        }
      />

      <div className="flex flex-col gap-6 p-6 lg:p-8">
      {/* 2. Tabs Navigation & Content */}
      <Tabs
        value={currentTab}
        onValueChange={setCurrentTab}
        className="w-full space-y-6"
      >
        <TabsList className="w-full justify-start gap-8 border-b border-border-default/80 bg-transparent p-0 rounded-none">
          <TabsTrigger
            value="daily"
            className="pb-3 text-sm font-medium text-text-tertiary transition-colors data-[state=active]:font-semibold data-[state=active]:text-brand-primary after:h-0.5 after:bg-transparent data-[state=active]:after:bg-brand-primary"
          >
            Theo ngày
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
          <DailyReportTab
            branchIds={selectedBranchIds}
            from={selectedDateFrom}
            to={selectedDateTo}
            groupBy="DAY"
          />
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
            <BranchCompareTab
              restaurantId={restaurantId}
              from={selectedDateFrom}
              to={selectedDateTo}
            />
          </TabsContent>
        )}
      </Tabs>
      </div>
    </div>
  )
}

export default ReportDashboard
