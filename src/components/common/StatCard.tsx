import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string
  icon?: LucideIcon
  /** VD "+12% so với hôm qua". Màu tự đổi theo trend. */
  trend?: { value: string; direction: "up" | "down" | "neutral" }
  className?: string
}

const TREND_CLASS: Record<NonNullable<StatCardProps["trend"]>["direction"], string> = {
  up: "text-status-success",
  down: "text-status-danger",
  neutral: "text-text-tertiary",
}

const TREND_ARROW: Record<NonNullable<StatCardProps["trend"]>["direction"], string> = {
  up: "▲",
  down: "▼",
  neutral: "",
}

/**
 * StatCard — khớp component "Stat Card" trong UI Component (Figma):
 * radius 14px, border 1px border/default, padding 18/20, gap 8px.
 * Dùng ở mọi trang báo cáo/dashboard có ≥2 role xem (Quản lý chi nhánh xem
 * doanh thu chi nhánh mình, Quản trị nhà hàng xem doanh thu toàn nhà hàng —
 * cùng 1 component, khác data truyền vào).
 */
export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-stat-card border border-border-default bg-surface-card px-5 py-[18px]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-text-tertiary">{label}</p>
        {Icon ? (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-primary-subtle">
            <Icon className="size-4 text-brand-primary" />
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-bold text-text-primary">{value}</p>
      {trend ? (
        <p className={cn("mt-2 flex items-center gap-1 text-xs font-medium", TREND_CLASS[trend.direction])}>
          {trend.direction !== "neutral" ? <span>{TREND_ARROW[trend.direction]}</span> : null}
          {trend.value}
        </p>
      ) : null}
    </div>
  )
}
