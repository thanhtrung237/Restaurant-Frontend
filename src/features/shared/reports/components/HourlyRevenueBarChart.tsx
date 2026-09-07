import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import type { HourlyRevenueItem } from "../types"

interface HourlyRevenueBarChartProps {
  data: HourlyRevenueItem[]
  title?: string
}

const chartConfig = {
  revenue: {
    label: "Doanh thu theo giờ",
    color: "#EA4A2A",
  },
} satisfies ChartConfig

/**
 * CustomActiveBar cho biểu đồ khung giờ:
 * - Hộp đen doanh số nằm ngay trên đỉnh cột cách đúng 8px
 * - Dòng 1: Khoảng thời gian (VD: 19:00 – 20:00)
 * - Dòng 2: Doanh thu (VD: 2.850.000đ)
 * - pointer-events-none để êm ái, không bị chớp giật
 */
function CustomActiveBar(props: any) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props
  if (!payload) return null

  const boxWidth = 110
  const boxHeight = 44
  const boxX = x + width / 2 - boxWidth / 2
  const boxY = Math.max(4, y - boxHeight - 8)
  const formattedRevenue = `${payload.revenue.toLocaleString("vi-VN")}đ`

  return (
    <g className="pointer-events-none">
      {/* 1. Cột đang active */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        ry={6}
        fill="#EA4A2A"
      />

      {/* 2. Hộp đen bo góc nằm trên đỉnh cột */}
      <rect
        x={boxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        rx={8}
        ry={8}
        fill="#1E2229"
        className="filter drop-shadow-md"
      />

      {/* Dòng 1: Khung giờ (vd: 19:00 – 20:00) */}
      <text
        x={boxX + boxWidth / 2}
        y={boxY + 16}
        textAnchor="middle"
        fill="#A0AEC0"
        fontSize={10.5}
        fontWeight={400}
      >
        {payload.timeRange}
      </text>

      {/* Dòng 2: Doanh số (vd: 2.850.000đ) */}
      <text
        x={boxX + boxWidth / 2}
        y={boxY + 34}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={12.5}
        fontWeight={700}
      >
        {formattedRevenue}
      </text>
    </g>
  )
}

/**
 * Custom XAxis Tick: Chỉ đỏ và in đậm khi đưa chuột vào đúng cột đó
 */
function CustomXAxisTick(props: any) {
  const { x, y, payload, index, hoveredIndex } = props
  const isHovered = hoveredIndex === index

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={14}
        textAnchor="middle"
        fill={isHovered ? "#EA4A2A" : "#868E96"}
        fontSize={12}
        fontWeight={isHovered ? 700 : 500}
        className="transition-colors duration-150"
      >
        {payload.value}
      </text>
    </g>
  )
}

export function HourlyRevenueBarChart({
  data,
  title = "Doanh thu theo giờ (hôm nay)",
}: HourlyRevenueBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)

  return (
    <div className="rounded-card border border-border-default/80 bg-surface-card p-6 shadow-2xs">
      {/* Header biểu đồ */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-text-primary tracking-tight">
          {title}
        </h3>
      </div>

      <div className="mt-6 w-full h-[320px]">
        <ChartContainer config={chartConfig} className="w-full h-full aspect-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 60, right: 16, left: 16, bottom: 8 }}
              onMouseMove={(state: any) => {
                if (
                  state &&
                  state.isTooltipActive &&
                  typeof state.activeTooltipIndex === "number"
                ) {
                  if (hoveredIndex !== state.activeTooltipIndex) {
                    setHoveredIndex(state.activeTooltipIndex)
                  }
                } else if (hoveredIndex !== null) {
                  setHoveredIndex(null)
                }
              }}
              onMouseLeave={() => {
                if (hoveredIndex !== null) {
                  setHoveredIndex(null)
                }
              }}
            >
              <Tooltip
                cursor={false}
                content={() => null}
                isAnimationActive={false}
              />
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={(props) => (
                  <CustomXAxisTick {...props} hoveredIndex={hoveredIndex} />
                )}
                interval={0}
              />
              <Bar
                dataKey="revenue"
                fill="#FDD7C7"
                radius={[6, 6, 6, 6]}
                maxBarSize={28}
                cursor="pointer"
                activeBar={<CustomActiveBar />}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  )
}
