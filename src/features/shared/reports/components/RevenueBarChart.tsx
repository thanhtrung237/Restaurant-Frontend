import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import type { DailyRevenueItem } from "../types"

interface RevenueBarChartProps {
  data: DailyRevenueItem[]
  title?: string
}

const chartConfig = {
  revenue: {
    label: "Doanh thu",
    color: "#F0522B",
  },
} satisfies ChartConfig

/**
 * CustomActiveBar được Recharts tự động render tại vị trí cột đang hover:
 * - props có sẵn: x, y (đỉnh cột), width, height, payload
 * - Hộp đen doanh số nằm ngay trên đỉnh cột 8px (y - boxHeight - 8), bám sát từng cột thấp/cao
 * - Cột chuyển sang màu đỏ cam #EA4A2A
 * - pointer-events-none để mượt mà 100%, không bao giờ chớp giật
 */
function CustomActiveBar(props: any) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props
  if (!payload) return null

  const boxWidth = 104
  const boxHeight = 44
  const boxX = x + width / 2 - boxWidth / 2
  // Nằm ngay trên đỉnh cột cách đúng 8px
  const boxY = Math.max(4, y - boxHeight - 8)
  const formattedRevenue = `${payload.revenue.toLocaleString("vi-VN")}đ`

  return (
    <g className="pointer-events-none">
      {/* 1. Cột đang active chuyển sang màu đỏ cam #EA4A2A */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        ry={8}
        fill="#EA4A2A"
      />

      {/* 2. Hộp đen bo góc nằm ngay trên đỉnh cột */}
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

      {/* Dòng 1: Tên thứ (vd: Thứ 7, Thứ 2...) */}
      <text
        x={boxX + boxWidth / 2}
        y={boxY + 16}
        textAnchor="middle"
        fill="#A0AEC0"
        fontSize={11}
        fontWeight={400}
      >
        {payload.fullDay}
      </text>

      {/* Dòng 2: Doanh thu (vd: 12.437.000đ) */}
      <text
        x={boxX + boxWidth / 2}
        y={boxY + 34}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={13}
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
        fontSize={13}
        fontWeight={isHovered ? 700 : 500}
        className="transition-colors duration-150"
      >
        {payload.value}
      </text>
    </g>
  )
}

export function RevenueBarChart({
  data,
  title = "Doanh thu 7 ngày qua",
}: RevenueBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)

  return (
    <div className="rounded-card border border-border-default/80 bg-surface-card p-6 shadow-2xs">
      <h3 className="text-base font-bold text-text-primary tracking-tight">
        {title}
      </h3>

      <div className="mt-6 w-full h-[320px]">
        <ChartContainer config={chartConfig} className="w-full h-full aspect-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 60, right: 24, left: 24, bottom: 8 }}
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
              {/* Tooltip ẩn cursor và content để Recharts kích hoạt activeBar của cột */}
              <Tooltip
                cursor={false}
                content={() => null}
                isAnimationActive={false}
              />
              <XAxis
                dataKey="day"
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
                radius={[8, 8, 8, 8]}
                maxBarSize={36}
                minPointSize={6}
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
