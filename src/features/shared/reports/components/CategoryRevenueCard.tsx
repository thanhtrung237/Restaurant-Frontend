import * as React from "react"
import { Layers } from "lucide-react"
import { Pie, PieChart, Tooltip } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { formatCurrency, formatPercent } from "@/lib/format"
import type { DishRankItem } from "@/types/models/reports"

interface CategoryRevenueCardProps {
  dishes?: DishRankItem[]
}

const CATEGORY_COLORS = [
  "#F59E0B",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#DB2777",
  "#0E7490",
  "#65A30D",
  "#475569",
  "#A16207",
  "var(--color-brand-primary)",
]

const chartConfig = { revenue: { label: "Doanh thu" } }

export function CategoryRevenueCard({ dishes = [] }: CategoryRevenueCardProps) {
  // Aggregate revenue and quantity by categoryName
  const { categories, totalRevenue } = React.useMemo(() => {
    if (!dishes || dishes.length === 0) {
      return { categories: [], totalRevenue: 0 }
    }

    const map = new Map<string, { revenue: number; quantity: number }>()

    for (const d of dishes) {
      const catName = d.categoryName?.trim() || "Món khác"
      const rev = Number(d.totalRevenue)
      const qty = d.totalQuantity || 0

      const existing = map.get(catName) || { revenue: 0, quantity: 0 }
      existing.revenue += Number.isFinite(rev) ? rev : 0
      existing.quantity += qty
      map.set(catName, existing)
    }

    const list = Array.from(map, ([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.revenue - a.revenue)
      .map((category, index) => ({
        ...category,
        fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))

    return { categories: list, totalRevenue: list.reduce((sum, item) => sum + item.revenue, 0) }
  }, [dishes])

  const slices = categories.filter(({ revenue }) => revenue > 0)
  const sliceTotal = slices.reduce((sum, item) => sum + item.revenue, 0)
  const share = (revenue: number) =>
    formatPercent(sliceTotal > 0 ? (Math.max(0, revenue) / sliceTotal) * 100 : 0, 1)

  return (
    <div className="@container h-full min-w-0 rounded-card border border-border-default/80 bg-surface-card p-4 shadow-2xs sm:p-6">
      <div>
        {/* Header */}
        <div className="border-b border-border-default/60 pb-4">
          <div>
            <h3 className="text-base font-bold text-text-primary tracking-tight">
              Cơ cấu theo Danh mục
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              Tỷ trọng doanh thu theo từng nhóm thực đơn
            </p>
          </div>
        </div>

        {/* Empty State */}
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-text-tertiary">
              <Layers className="size-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-text-primary">Chưa có dữ liệu danh mục</p>
            <p className="mt-1 text-xs text-text-tertiary max-w-[240px]">
              Không ghi nhận món bán nào thuộc danh mục trong kỳ này.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid min-w-0 items-center gap-4 @lg:grid-cols-[12rem_minmax(0,1fr)] @lg:gap-6">
            {slices.length > 0 ? (
              <div className="relative mx-auto w-full max-w-48">
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-text-secondary">Tổng doanh thu món</span>
                  <strong className="max-w-[58%] break-words text-sm tabular-nums text-text-primary">
                    {formatCurrency(totalRevenue)}
                  </strong>
                </div>
                <ChartContainer config={chartConfig} className="aspect-square w-full">
                  <PieChart>
                    <Pie
                      data={slices}
                      dataKey="revenue"
                      nameKey="name"
                      innerRadius="62%"
                      outerRadius="95%"
                      stroke="var(--color-surface-card)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                    <Tooltip
                      formatter={(value) =>
                        typeof value === "number"
                          ? `${formatCurrency(value)} · ${share(value)}`
                          : ""
                      }
                      contentStyle={{
                        maxWidth: 192,
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                        backgroundColor: "#1E2229",
                        border: 0,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      itemStyle={{ color: "#fff" }}
                      isAnimationActive={false}
                    />
                  </PieChart>
                </ChartContainer>
              </div>
            ) : (
              <p className="rounded-xl bg-surface-page px-4 py-6 text-center text-sm text-text-secondary">
                Các danh mục này chưa có doanh thu
              </p>
            )}

            <ul
              role="list"
              aria-label="Tỷ trọng theo danh mục"
              className="min-w-0 divide-y divide-border-default/60"
            >
              {categories.map(({ name, revenue, quantity, fill }) => (
                <li key={name} className="flex items-start justify-between gap-2 py-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-1 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: revenue > 0 ? fill : "var(--color-surface-muted)" }}
                    />
                    <p className="min-w-0 break-words text-sm font-semibold text-text-primary">
                      {name}
                    </p>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="text-sm font-semibold text-text-primary">
                      {formatCurrency(revenue)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {share(revenue)} · {quantity.toLocaleString("vi-VN")} phần
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
