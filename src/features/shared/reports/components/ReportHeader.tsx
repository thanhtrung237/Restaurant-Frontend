import * as React from "react"
import { ChevronDown, Check, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MOCK_COMPARE_METRICS } from "../mock-data"
import {
  DATE_RANGE_PRESETS,
  findRangePreset,
  getPresetRange,
  type CalendarDateRange,
} from "@/lib/calendar-range"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { HourlyTimePicker } from "./HourlyTimePicker"
import type { BranchListItem } from "@/types/models"
import { cn } from "@/lib/utils"

interface ReportHeaderProps {
  currentTab: string
  branches: BranchListItem[]
  selectedBranchIds: number[]
  onSelectBranchIds: (branchIds: number[]) => void
  isBranchManager: boolean
  today: string
  dateRange: CalendarDateRange
  onChangeRange: (range: CalendarDateRange) => void
  selectedMetric?: string
  onSelectMetric?: (metric: string) => void
  onExport?: (format: "xlsx" | "csv") => void
  isExporting?: boolean
  hourlyStartHour?: number
  hourlyEndHour?: number
  onHourlyStartHourChange?: (hour: number) => void
  onHourlyEndHourChange?: (hour: number) => void
}

export function ReportHeaderActions({
  currentTab,
  branches,
  selectedBranchIds,
  onSelectBranchIds,
  isBranchManager,
  today,
  dateRange,
  onChangeRange,
  selectedMetric = "Theo doanh thu",
  onSelectMetric,
  onExport,
  isExporting = false,
  hourlyStartHour = 0,
  hourlyEndHour = 23,
  onHourlyStartHourChange,
  onHourlyEndHourChange,
}: ReportHeaderProps) {
  const isBranchCompareTab = currentTab === "branch"
  const activePresetKey = findRangePreset(dateRange, today)?.key

  // Get display text for branch selector
  const branchSelectorText = React.useMemo(() => {
    if (selectedBranchIds.length === 0) return "Chọn chi nhánh"
    if (selectedBranchIds.length === branches.length) return "Tất cả chi nhánh"
    if (selectedBranchIds.length === 1) {
      const branch = branches.find((b) => b.id === selectedBranchIds[0])
      return branch?.name || "Chi nhánh"
    }
    return `${selectedBranchIds.length} chi nhánh`
  }, [selectedBranchIds, branches])

  const handleToggleBranch = (branchId: number) => {
    if (isBranchManager) return

    if (selectedBranchIds.includes(branchId)) {
      const newIds = selectedBranchIds.filter((id) => id !== branchId)
      if (newIds.length > 0) {
        onSelectBranchIds(newIds)
      }
    } else {
      onSelectBranchIds([...selectedBranchIds, branchId])
    }
  }

  const handleToggleAll = () => {
    if (isBranchManager) return

    if (selectedBranchIds.length === branches.length) {
      onSelectBranchIds([branches[0].id])
    } else {
      onSelectBranchIds(branches.map((b) => b.id))
    }
  }

  // Quick preset clicks from toolbar
  const handleToolbarPreset = (presetKey: "today" | "yesterday" | "7days" | "thisMonth") => {
    const preset = DATE_RANGE_PRESETS.find((p) => p.key === presetKey)
    if (preset) {
      onChangeRange(getPresetRange(preset, today))
    }
  }

  return (
    <>
      <div className="flex w-full min-w-0 flex-nowrap items-center justify-end gap-2 @min-[82rem]/report:gap-3">
        {/* Branch / Metric Selector */}
        {isBranchCompareTab ? (
          <DropdownMenu className="min-w-0 max-w-48">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={selectedMetric}
                className="flex h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-border-default/90 bg-surface-card px-3 text-sm font-medium text-text-primary shadow-2xs transition-colors hover:bg-surface-muted"
              >
                <span className="truncate">{selectedMetric}</span>
                <ChevronDown className="size-4 shrink-0 text-text-tertiary" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="left" className="w-48">
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
          <DropdownMenu className="min-w-0 max-w-48">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isBranchManager}
                title={branchSelectorText}
                className="flex h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-border-default/90 bg-surface-card px-3 text-sm font-medium text-text-primary shadow-2xs transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="truncate">{branchSelectorText}</span>
                <ChevronDown className="size-4 shrink-0 text-text-tertiary" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="left" className="w-56">
              {!isBranchManager && (
                <>
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors outline-none",
                      "text-text-primary hover:bg-surface-muted cursor-pointer",
                    )}
                  >
                    <div className="flex size-4 items-center justify-center">
                      {selectedBranchIds.length === branches.length && (
                        <Check className="size-4 text-brand-primary" />
                      )}
                    </div>
                    <span>Tất cả chi nhánh</span>
                  </button>
                  <DropdownMenuSeparator />
                </>
              )}
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleToggleBranch(b.id)}
                  disabled={isBranchManager}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none",
                    "text-text-primary hover:bg-surface-muted",
                    isBranchManager ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  )}
                >
                  <div className="flex size-4 items-center justify-center">
                    {selectedBranchIds.includes(b.id) && (
                      <Check className="size-4 text-brand-primary" />
                    )}
                  </div>
                  <span>{b.name}</span>
                </button>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Quick Presets Pills on Toolbar (1-click immediate access) */}
        <div
          className={cn(
            "hidden h-10 shrink-0 items-center rounded-xl border border-border-default/70 bg-surface-muted p-1 whitespace-nowrap",
            currentTab === "hourly" ? "@min-[90rem]/report:flex" : "@min-[82rem]/report:flex",
          )}
        >
          <button
            type="button"
            onClick={() => handleToolbarPreset("today")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activePresetKey === "today"
                ? "bg-surface-card text-brand-primary shadow-xs font-bold"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => handleToolbarPreset("yesterday")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activePresetKey === "yesterday"
                ? "bg-surface-card text-brand-primary shadow-xs font-bold"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            Hôm qua
          </button>
          <button
            type="button"
            onClick={() => handleToolbarPreset("7days")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activePresetKey === "7days"
                ? "bg-surface-card text-brand-primary shadow-xs font-bold"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            7 ngày
          </button>
          <button
            type="button"
            onClick={() => handleToolbarPreset("thisMonth")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activePresetKey === "thisMonth"
                ? "bg-surface-card text-brand-primary shadow-xs font-bold"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            Tháng này
          </button>
        </div>

        {/* Date Range Picker Component with Compact Popover */}
        <DateRangePicker
          label="Chọn khoảng thời gian báo cáo"
          dialogLabel="Khoảng ngày báo cáo"
          today={today}
          range={dateRange}
          onApply={onChangeRange}
          align="end"
          showYearPresets
          className="hidden h-10 min-w-0 shrink gap-1.5 px-2.5 md:flex @min-[56rem]/report:gap-2 @min-[56rem]/report:px-3.5"
        />

        {/* HourlyTimePicker — chỉ hiện khi tab "Theo khung giờ" được chọn */}
        {currentTab === "hourly" && onHourlyStartHourChange && onHourlyEndHourChange && (
          <HourlyTimePicker
            startHour={hourlyStartHour}
            endHour={hourlyEndHour}
            onStartHourChange={onHourlyStartHourChange}
            onEndHourChange={onHourlyEndHourChange}
            className="hidden h-10 min-w-0 gap-1.5 px-2.5 md:flex @min-[56rem]/report:px-3.5"
          />
        )}

        {/* Export Button & Dropdown (FR-RPT-05: Xuất .xlsx / .csv) */}
        {onExport && (
          <DropdownMenu className="shrink-0">
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isExporting}
                title="Xuất báo cáo"
                className="h-10 shrink-0 cursor-pointer gap-2 rounded-xl bg-brand-primary px-3 text-sm font-semibold text-text-on-brand shadow-2xs transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60 @min-[56rem]/report:px-4"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span className="sr-only @min-[56rem]/report:not-sr-only">Đang xuất...</span>
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    <span className="sr-only @min-[56rem]/report:not-sr-only">Xuất báo cáo</span>
                    <ChevronDown className="hidden size-3.5 opacity-80 @min-[56rem]/report:block" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="right" className="w-52">
              <DropdownMenuItem
                onClick={() => onExport("xlsx")}
                className="cursor-pointer flex items-center gap-2.5 py-2 text-text-primary hover:bg-surface-muted"
              >
                <FileSpreadsheet className="size-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">Xuất Excel (.xlsx)</span>
                  <span className="text-[11px] text-text-tertiary">
                    Đầy đủ định dạng & bảng tính
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onExport("csv")}
                className="cursor-pointer flex items-center gap-2.5 py-2 text-text-primary hover:bg-surface-muted"
              >
                <FileText className="size-4 text-blue-600" />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">Xuất CSV (.csv)</span>
                  <span className="text-[11px] text-text-tertiary">Mã hóa UTF-8 có dấu</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </>
  )
}
