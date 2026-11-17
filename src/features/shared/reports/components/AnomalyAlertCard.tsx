import * as React from "react"
import {
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Info,
  Clock,
} from "lucide-react"
import type { AnomalyAlert, AnomalyReportResponse } from "@/types/models"
import { cn } from "@/lib/utils"

interface AnomalyAlertCardProps {
  data?: AnomalyReportResponse
  isLoading?: boolean
  onActionClick?: (alert: AnomalyAlert) => void
}

export function AnomalyAlertCard({
  data,
  isLoading,
  onActionClick,
}: AnomalyAlertCardProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [showAiDetails, setShowAiDetails] = React.useState(true)

  const alerts = data?.alerts || []
  const hasAlerts = alerts.length > 0
  const currentAlert = hasAlerts ? alerts[currentIndex % alerts.length] : null

  // Auto reset index if data changes
  React.useEffect(() => {
    setCurrentIndex(0)
  }, [alerts.length])

  if (isLoading) {
    return (
      <div className="rounded-card border border-border-default/70 bg-surface-card p-5 shadow-2xs animate-pulse">
        <div className="flex items-center justify-between pb-3">
          <div className="h-4 w-40 rounded bg-surface-muted" />
          <div className="h-5 w-24 rounded-full bg-surface-muted" />
        </div>
        <div className="mt-3 flex items-start gap-4">
          <div className="size-10 rounded-xl bg-surface-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-1/3 rounded bg-surface-muted" />
            <div className="h-4 w-3/4 rounded bg-surface-muted" />
          </div>
        </div>
      </div>
    )
  }

  // State: No anomalies detected
  if (!hasAlerts) {
    return (
      <div className="flex items-center justify-between rounded-card border border-emerald-500/20 bg-emerald-500/5 px-5 py-3.5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                AI Anomaly Guard · Vận hành bình thường
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                <Sparkles className="size-2.5" /> AI Audited
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Không ghi nhận dấu hiệu gian lận hoặc đột biến hủy món bất thường trong khoảng thời gian đã chọn.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-text-tertiary hidden sm:inline-block">
          Quét tự động bởi Gemini AI Engine
        </span>
      </div>
    )
  }

  const isCritical = currentAlert?.severity === "CRITICAL"

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border shadow-xs transition-all",
        isCritical
          ? "border-rose-500/30 bg-gradient-to-r from-rose-500/[0.04] via-surface-card to-surface-card"
          : "border-amber-500/30 bg-gradient-to-r from-amber-500/[0.04] via-surface-card to-surface-card"
      )}
    >
      {/* Top Header bar */}
      <div className="flex items-center justify-between border-b border-border-default/60 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-brand-primary" />
            AI Anomaly Detection · Cảnh báo vận hành
          </span>
          <span className="text-xs font-semibold text-text-tertiary">
            ({alerts.length} cảnh báo)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
              isCritical
                ? "bg-rose-500/10 text-rose-700 border border-rose-500/20"
                : "bg-amber-500/10 text-amber-700 border border-amber-500/20"
            )}
          >
            {isCritical ? "Cần xử lý gấp" : "Cần kiểm tra"}
          </span>

          {/* Navigation if multiple alerts */}
          {alerts.length > 1 && (
            <div className="flex items-center gap-1 text-xs text-text-tertiary">
              <span className="font-semibold text-text-primary mr-1">
                {currentIndex + 1}/{alerts.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => (prev > 0 ? prev - 1 : alerts.length - 1))
                }
                className="flex size-6 items-center justify-center rounded border border-border-default bg-surface hover:bg-surface-muted transition-colors"
                title="Cảnh báo trước"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => (prev < alerts.length - 1 ? prev + 1 : 0))
                }
                className="flex size-6 items-center justify-center rounded border border-border-default bg-surface hover:bg-surface-muted transition-colors"
                title="Cảnh báo kế tiếp"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                isCritical
                  ? "bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20"
                  : "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20"
              )}
            >
              {isCritical ? (
                <ShieldAlert className="size-5.5" />
              ) : (
                <AlertTriangle className="size-5.5" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-bold text-text-primary">
                  {currentAlert?.title}
                </h4>
                {currentAlert?.location && (
                  <span className="rounded bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-secondary">
                    {currentAlert.location}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">
                {currentAlert?.description}
              </p>
            </div>
          </div>

          {/* Action button */}
          <div className="shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={() => currentAlert && onActionClick?.(currentAlert)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-surface px-3.5 py-1.5 text-xs font-semibold text-text-primary shadow-2xs hover:bg-surface-muted transition-colors cursor-pointer"
            >
              Xem báo cáo kiểm tra
              <ArrowRight className="size-3 text-text-tertiary" />
            </button>
          </div>
        </div>

        {/* AI Insight Box */}
        {(currentAlert?.aiExplanation || currentAlert?.recommendation) && (
          <div className="mt-4 rounded-xl border border-brand-primary/20 bg-brand-primary/[0.03] p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-primary">
                <Sparkles className="size-3.5 text-brand-primary" />
                Phân tích chuyên sâu từ Gemini AI (Ops Auditor)
              </div>
              <button
                type="button"
                onClick={() => setShowAiDetails(!showAiDetails)}
                className="text-[11px] font-medium text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              >
                {showAiDetails ? "Thu gọn" : "Xem chi tiết"}
              </button>
            </div>

            {showAiDetails && (
              <div className="space-y-2 text-xs text-text-secondary mt-2">
                {currentAlert.aiExplanation && (
                  <p className="leading-relaxed">
                    <span className="font-semibold text-text-primary">Nhận định AI: </span>
                    {currentAlert.aiExplanation}
                  </p>
                )}
                {currentAlert.recommendation && (
                  <div className="flex items-start gap-1.5 rounded-lg bg-surface/70 border border-border-default/50 p-2 text-text-primary">
                    <Info className="size-3.5 text-brand-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      <span className="font-bold text-brand-primary">Khuyến nghị xử lý: </span>
                      {currentAlert.recommendation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Executive Summary Ticker (if available) */}
      {data?.aiExecutiveSummary && (
        <div className="flex items-center gap-2 border-t border-border-default/40 bg-surface-muted/50 px-5 py-2 text-[11px] text-text-tertiary">
          <Clock className="size-3 shrink-0 text-text-tertiary" />
          <span className="truncate font-medium">
            <strong className="text-text-secondary">Tóm tắt điều hành: </strong>
            {data.aiExecutiveSummary}
          </span>
        </div>
      )}
    </div>
  )
}
