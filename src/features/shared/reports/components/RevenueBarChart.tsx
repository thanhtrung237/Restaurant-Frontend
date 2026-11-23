import { ChartNoAxesColumn } from "lucide-react"
import { Bar, BarChart, Rectangle, Tooltip, XAxis, useChartWidth, type BarShapeProps } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"

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
}

const chartConfig = {
  revenue: { label: "Doanh thu", color: "#FDD7C7" },
} satisfies ChartConfig

function ActiveRevenueBar({ x, y, width, height, payload }: BarShapeProps) {
  const chartWidth = useChartWidth()
  const point: RevenueChartPoint | undefined = payload
  if (!point || !chartWidth) return null

  const tooltipWidth = Math.min(168, chartWidth - 8)
  const tooltipX = Math.max(4, Math.min(x + width / 2 - tooltipWidth / 2, chartWidth - tooltipWidth - 4))

  return (
    <g className="pointer-events-none">
      <Rectangle x={x} y={y} width={width} height={height} radius={6} fill="#EA4A2A" />
      <foreignObject x={tooltipX} y={Math.max(4, Math.min(y, y + height) - 56)} width={tooltipWidth} height={56}>
        <div className="mx-auto mt-1 w-fit max-w-full rounded-lg bg-[#1E2229] px-3 py-1.5 text-center shadow-md">
          <p className="truncate text-[11px] text-slate-300" title={point.fullDay}>{point.fullDay}</p>
          <p className="whitespace-nowrap text-[13px] font-bold text-white">{point.revenue.toLocaleString("vi-VN")}đ</p>
        </div>
      </foreignObject>
    </g>
  )
}

export function RevenueBarChart({ data, title, subtitle, maxBarSize = 48 }: RevenueBarChartProps) {
  const hasRevenue = data.some((point) => point.revenue !== 0)

  return (
    <div className="h-full rounded-card border border-border-default/80 bg-surface-card p-4 shadow-2xs sm:p-6">
      <h3 className="text-base font-bold tracking-tight text-text-primary">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}

      {hasRevenue ? (
        <ChartContainer config={chartConfig} className="mt-5 h-[280px] w-full aspect-auto sm:h-[320px]">
          <BarChart data={data} margin={{ top: 72, right: 12, left: 12, bottom: 4 }}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10} minTickGap={12} />
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
        </ChartContainer>
      ) : (
        <div className="mt-5 flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl bg-surface-page px-4 text-center sm:min-h-56">
          <div className="rounded-full bg-surface-muted p-3 text-text-secondary">
            <ChartNoAxesColumn className="size-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-text-primary">Chưa có doanh thu trong khoảng này</p>
          <p className="text-xs text-text-secondary">Chọn khoảng thời gian khác để xem biểu đồ.</p>
        </div>
      )}
    </div>
  )
}
