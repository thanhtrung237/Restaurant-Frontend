import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { MOCK_BRANCHES, MOCK_TIME_RANGES, MOCK_COMPARE_METRICS } from "../mock-data"

interface ReportHeaderProps {
  title: string
  subtitle: string
  currentTab: string
  selectedBranch: string
  onSelectBranch: (branchName: string) => void
  selectedTime: string
  onSelectTime: (timeLabel: string) => void
  selectedMetric?: string
  onSelectMetric?: (metric: string) => void
  onExport: () => void
}

export function ReportHeader({
  title,
  subtitle,
  currentTab,
  selectedBranch,
  onSelectBranch,
  selectedTime,
  onSelectTime,
  selectedMetric = "Theo doanh thu",
  onSelectMetric,
  onExport,
}: ReportHeaderProps) {
  const isBranchCompareTab = currentTab === "branch"

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {title}
        </h1>
        <p className="mt-1 text-xs text-text-tertiary font-medium">
          {subtitle}
        </p>
      </div>

      {/* Toolbar Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {isBranchCompareTab ? (
          /* Tab So sánh chi nhánh: Dropdown Tiêu chí so sánh (Theo doanh thu ▾) */
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-border-default/90 bg-surface-card px-4 py-2 text-sm font-medium text-text-primary shadow-2xs hover:bg-surface-muted transition-colors"
              >
                <span>{selectedMetric}</span>
                <ChevronDown className="size-4 text-text-tertiary" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="right" className="w-48">
              {MOCK_COMPARE_METRICS.map((m) => (
                <DropdownMenuItem
                  key={m.value}
                  onClick={() => onSelectMetric?.(m.label)}
                  className="cursor-pointer"
                >
                  {m.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          /* Tab Ngày & Khung giờ: Dropdown Chọn chi nhánh */
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-border-default/90 bg-surface-card px-4 py-2 text-sm font-medium text-text-primary shadow-2xs hover:bg-surface-muted transition-colors"
              >
                <span>{selectedBranch}</span>
                <ChevronDown className="size-4 text-text-tertiary" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="right" className="w-48">
              {MOCK_BRANCHES.map((b) => (
                <DropdownMenuItem
                  key={b.id}
                  onClick={() => onSelectBranch(b.name)}
                  className="cursor-pointer"
                >
                  {b.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Time Range Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-border-default/90 bg-surface-card px-4 py-2 text-sm font-medium text-text-primary shadow-2xs hover:bg-surface-muted transition-colors"
            >
              <span>{selectedTime}</span>
              <ChevronDown className="size-4 text-text-tertiary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="right" className="w-40">
            {MOCK_TIME_RANGES.map((t) => (
              <DropdownMenuItem
                key={t.value}
                onClick={() => onSelectTime(t.label)}
                className="cursor-pointer"
              >
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Button (Chỉ hiện ở Tab Theo ngày và Theo khung giờ) */}
        {!isBranchCompareTab && (
          <Button
            onClick={onExport}
            className="rounded-xl bg-brand-primary px-5 py-2 text-sm font-semibold text-text-on-brand shadow-2xs hover:bg-brand-primary-hover active:scale-[0.99] transition-all"
          >
            Xuất báo cáo
          </Button>
        )}
      </div>
    </div>
  )
}
