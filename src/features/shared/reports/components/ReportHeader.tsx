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
import { TimeRangeDropdown } from "./TimeRangeDropdown"
import { HourlyTimePicker } from "./HourlyTimePicker"
import type { BranchListItem } from "@/types/models"
import { cn } from "@/lib/utils"

interface ReportHeaderProps {
  currentTab: string
  branches: BranchListItem[]
  selectedBranchIds: number[]
  onSelectBranchIds: (branchIds: number[]) => void
  isBranchManager: boolean
  selectedTime: string
  onSelectTime: (timeLabel: string) => void
  selectedMetric?: string
  onSelectMetric?: (metric: string) => void
  onExport: (format: "xlsx" | "csv") => void
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
  selectedTime,
  onSelectTime,
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
      // Deselect branch
      const newIds = selectedBranchIds.filter((id) => id !== branchId)
      if (newIds.length > 0) {
        onSelectBranchIds(newIds)
      }
    } else {
      // Select branch
      onSelectBranchIds([...selectedBranchIds, branchId])
    }
  }

  const handleToggleAll = () => {
    if (isBranchManager) return
    
    if (selectedBranchIds.length === branches.length) {
      // Deselect all except first one
      onSelectBranchIds([branches[0].id])
    } else {
      // Select all
      onSelectBranchIds(branches.map((b) => b.id))
    }
  }

  return (
    // CHỈ cụm điều khiển — tiêu đề/dòng phụ do PageHeader lo.
    <>
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
                disabled={isBranchManager}
                className="flex items-center gap-2 rounded-xl border border-border-default/90 bg-surface-card px-4 py-2 text-sm font-medium text-text-primary shadow-2xs hover:bg-surface-muted transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{branchSelectorText}</span>
                <ChevronDown className="size-4 text-text-tertiary" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="right" className="w-56">
              {!isBranchManager && (
                <>
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors outline-none",
                      "text-text-primary hover:bg-surface-muted cursor-pointer"
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
                    isBranchManager ? "cursor-not-allowed opacity-60" : "cursor-pointer"
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

        {/* Bộ chọn kỳ — ẩn ở <md vì đã có bản "chip" trên MobileHeader (Figma
            "Báo cáo · Mobile"); cùng một component nên hai nơi không thể lệch nhau. */}
        <TimeRangeDropdown
          value={selectedTime}
          onChange={onSelectTime}
          className="hidden md:flex"
        />

        {/* HourlyTimePicker — chỉ hiện khi tab "Theo khung giờ" được chọn */}
        {currentTab === "hourly" && onHourlyStartHourChange && onHourlyEndHourChange && (
          <HourlyTimePicker
            startHour={hourlyStartHour}
            endHour={hourlyEndHour}
            onStartHourChange={onHourlyStartHourChange}
            onEndHourChange={onHourlyEndHourChange}
            className="hidden md:flex"
          />
        )}

        {/* Export Button & Dropdown (FR-RPT-05: Xuất .xlsx / .csv) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={isExporting}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-text-on-brand shadow-2xs hover:bg-brand-primary-hover active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Đang xuất...</span>
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  <span>Xuất báo cáo</span>
                  <ChevronDown className="size-3.5 opacity-80" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={() => onExport("xlsx")}
              className="cursor-pointer flex items-center gap-2.5 py-2 text-text-primary hover:bg-surface-muted"
            >
              <FileSpreadsheet className="size-4 text-emerald-600" />
              <div className="flex flex-col">
                <span className="font-medium text-sm">Xuất Excel (.xlsx)</span>
                <span className="text-[11px] text-text-tertiary">Đầy đủ định dạng & bảng tính</span>
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
      </div>
    </>
  )
}
