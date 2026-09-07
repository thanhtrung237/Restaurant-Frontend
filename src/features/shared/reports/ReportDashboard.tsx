import * as React from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ReportHeader } from "./components/ReportHeader"
import { DailyReportTab } from "./components/DailyReportTab"
import { HourlyReportTab } from "./components/HourlyReportTab"
import { BranchCompareTab } from "./components/BranchCompareTab"
import { MOCK_BRANCHES, MOCK_TIME_RANGES } from "./mock-data"

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
  const [currentTab, setCurrentTab] = React.useState<string>("daily")
  const [selectedBranch, setSelectedBranch] = React.useState<string>(MOCK_BRANCHES[0].name)
  const [selectedTime, setSelectedTime] = React.useState<string>(MOCK_TIME_RANGES[0].label)
  const [selectedMetric, setSelectedMetric] = React.useState<string>("Theo doanh thu")

  const handleExport = () => {
    toast({
      title: "Xuất báo cáo",
      description: `Đang tải xuống dữ liệu báo cáo [${TAB_HEADER_META[currentTab]?.title || "Doanh thu"}]...`,
    })
  }

  const headerMeta = TAB_HEADER_META[currentTab] || TAB_HEADER_META.daily

  // Khi chuyển sang tab so sánh chi nhánh, tự động đổi thời gian mặc định sang "Tháng này" nếu đang ở "Hôm nay"
  const activeTimeLabel = currentTab === "branch" && selectedTime === "Hôm nay" ? "Tháng này" : selectedTime

  return (
    <div className="min-h-screen bg-surface-page p-8 space-y-6">
      {/* 1. Top Header Component dùng chung */}
      <ReportHeader
        title={headerMeta.title}
        subtitle={headerMeta.subtitle}
        currentTab={currentTab}
        selectedBranch={selectedBranch}
        onSelectBranch={setSelectedBranch}
        selectedTime={activeTimeLabel}
        onSelectTime={setSelectedTime}
        selectedMetric={selectedMetric}
        onSelectMetric={setSelectedMetric}
        onExport={handleExport}
      />

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
          <DailyReportTab />
        </TabsContent>

        {/* Tab 2: Theo khung giờ */}
        <TabsContent value="hourly" className="outline-none">
          <HourlyReportTab />
        </TabsContent>

        {/* Tab 3: So sánh chi nhánh — chỉ Quản trị NH (mục 4.3) */}
        {showBranchCompare && (
          <TabsContent value="branch" className="outline-none">
            <BranchCompareTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default ReportDashboard
