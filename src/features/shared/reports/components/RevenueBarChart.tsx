import { useState } from "react"
import { ChartLine, ChartNoAxesColumn } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Rectangle,
  Tooltip,
  XAxis,
  YAxis,
  useChartWidth,
  type BarShapeProps,
} from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

interface RevenueChartPoint {
  day: string
  fullDay: string
  revenue: number
}

interface RevenueBarChartProps {
  data: RevenueChartPoint[]
  title: string
  subtitle?: string
  maxBarSize?: number
  allowLine?: boolean
}

const chartConfig = {
  revenue: { label: "Doanh thu", color: "#FDD7C7" },
} satisfies ChartConfig

const revenueTickFormat = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
})

const chartModes = [
  { value: "bar", label: "Cột", icon: ChartNoAxesColumn },
  { value: "line", label: "Đường", icon: ChartLine },
] as const

function RevenueTooltip({ point }: { point: RevenueChartPoint }) {
  return (
    <div className="mx-auto w-fit max-w-full rounded-lg bg-[#1E2229] px-3 py-1.5 text-center shadow-md">
      <p className="truncate text-[11px] text-slate-300" title={point.fullDay}>
        {point.fullDay}
      </p>
      <p className="whitespace-nowrap text-[13px] font-bold text-white">
        {point.revenue.toLocaleString("vi-VN")}đ
      </p>
    </div>
  )
}

function ActiveRevenueBar({ x, y, width, height, payload }: BarShapeProps) {
  const chartWidth = useChartWidth()
  const point: RevenueChartPoint | undefined = payload
  if (!point || !chartWidth) return null

  const tooltipWidth = Math.min(168, chartWidth - 8)
  const tooltipX = Math.max(
    4,
    Math.min(x + width / 2 - tooltipWidth / 2, chartWidth - tooltipWidth - 4),
  )

  return (
    <g className="pointer-events-none">
      <Rectangle x={x} y={y} width={width} height={height} radius={6} fill="#EA4A2A" />
      <foreignObject
        x={tooltipX}
        y={Math.max(4, Math.min(y, y + height) - 56)}
        width={tooltipWidth}
        height={56}
      >
        <div className="mt-1">
          <RevenueTooltip point={point} />
        </div>
      </foreignObject>
    </g>
  )
}

export function RevenueBarChart({
  data,
  title,
  subtitle,
  maxBarSize = 48,
  allowLine = true,
}: RevenueBarChartProps) {
  const [mode, setMode] = useState<"bar" | "line">("bar")
  const hasRevenue = data.some((point) => point.revenue !== 0)
  const xAxis = (
    <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10} minTickGap={12} />
  )

  return (
    <div className="h-full min-w-0 rounded-card border border-border-default/80 bg-surface-card p-4 shadow-2xs sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold tracking-tight text-text-primary">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
        </div>
        {allowLine && hasRevenue && (
          <div
            role="group"
            aria-label="Kiểu biểu đồ doanh thu"
            className="inline-flex shrink-0 gap-1 rounded-xl border border-border-default/60 bg-surface-muted p-1"
          >
            {chartModes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  "inline-flex min-h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
                  mode === value
                    ? "bg-surface-card text-brand-primary shadow-2xs"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasRevenue ? (
        <ChartContainer
          config={chartConfig}
          className="mt-5 h-[280px] w-full aspect-auto sm:h-[320px]"
        >
          {allowLine && mode === "line" ? (
            <LineChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              {xAxis}
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={6}
                width={76}
                tickFormatter={(value: number) => `${revenueTickFormat.format(value)}đ`}
              />
              <Tooltip
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const point: RevenueChartPoint | undefined = payload?.[0]?.payload
                  return active && point ? <RevenueTooltip point={point} /> : null
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Doanh thu"
                stroke="var(--color-brand-primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-surface-card)" }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 72, right: 12, left: 12, bottom: 4 }}>
              {xAxis}
              <Tooltip cursor={false} content={() => null} isAnimationActive={false} />
              <Bar
                dataKey="revenue"
                name="Doanh thu"
                fill="var(--color-revenue)"
                radius={6}
                maxBarSize={maxBarSize}
                activeBar={(props: BarShapeProps) => <ActiveRevenueBar {...props} />}
                isAnimationActive={false}
              />
            </BarChart>
          )}
        </ChartContainer>
      ) : (
        <div className="mt-5 flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl bg-surface-page px-4 text-center sm:min-h-56">
          <div className="rounded-full bg-surface-muted p-3 text-text-secondary">
            <ChartNoAxesColumn className="size-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-text-primary">
            Chưa có doanh thu trong khoảng này
          </p>
          <p className="text-xs text-text-secondary">Chọn khoảng thời gian khác để xem biểu đồ.</p>
        </div>
      )}
    </div>
  )
}
