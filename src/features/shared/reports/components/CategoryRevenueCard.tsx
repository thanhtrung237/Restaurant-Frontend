import * as React from "react"
import { Layers } from "lucide-react"
import { formatCurrency, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { DishRankItem } from "@/types/models/reports"

interface CategoryRevenueCardProps {
  dishes?: DishRankItem[]
}

interface CategoryStat {
  name: string
  revenue: number
  quantity: number
  percent: number
  color: string
  barColor: string
  badgeBg: string
}

const CATEGORY_COLORS = [
  { color: "text-amber-600", barColor: "bg-amber-500", badgeBg: "bg-amber-50 text-amber-700" },
  { color: "text-blue-600", barColor: "bg-blue-500", badgeBg: "bg-blue-50 text-blue-700" },
  { color: "text-emerald-600", barColor: "bg-emerald-500", badgeBg: "bg-emerald-50 text-emerald-700" },
  { color: "text-violet-600", barColor: "bg-violet-500", badgeBg: "bg-violet-50 text-violet-700" },
  { color: "text-rose-600", barColor: "bg-rose-500", badgeBg: "bg-rose-50 text-rose-700" },
  { color: "text-teal-600", barColor: "bg-teal-500", badgeBg: "bg-teal-50 text-teal-700" },
]

export function CategoryRevenueCard({ dishes = [] }: CategoryRevenueCardProps) {
  // Aggregate revenue and quantity by categoryName
  const { categories, totalRevenue } = React.useMemo(() => {
    if (!dishes || dishes.length === 0) {
      return { categories: [], totalRevenue: 0 }
    }

    const map = new Map<string, { revenue: number; quantity: number }>()
    let total = 0

    for (const d of dishes) {
      const catName = d.categoryName?.trim() || "Món khác"
      const rev = parseFloat(d.totalRevenue) || 0
      const qty = d.totalQuantity || 0

      total += rev
      const existing = map.get(catName) || { revenue: 0, quantity: 0 }
      existing.revenue += rev
      existing.quantity += qty
      map.set(catName, existing)
    }

    const list: CategoryStat[] = Array.from(map.entries())
      .map(([name, stat], idx) => {
        const colorSet = CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
        const percent = total > 0 ? (stat.revenue / total) * 100 : 0
        return {
          name,
          revenue: stat.revenue,
          quantity: stat.quantity,
          percent,
          ...colorSet,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)

    return { categories: list, totalRevenue: total }
  }, [dishes])

  const topCategory = categories[0]

  return (
    <div className="flex h-full flex-col justify-between rounded-card border border-border-default/80 bg-surface-card p-6 shadow-2xs">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border-default/60 pb-3">
          <div>
            <h3 className="text-base font-bold text-text-primary tracking-tight">
              Cơ cấu theo Danh mục
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              Tỷ trọng doanh thu theo từng nhóm thực đơn
            </p>
          </div>
          {topCategory && topCategory.percent > 0 && (
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", topCategory.badgeBg)}>
              Chủ lực: {topCategory.name} ({formatPercent(topCategory.percent, 0)})
            </span>
          )}
        </div>

        {/* Empty State */}
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-text-tertiary">
              <Layers className="size-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-text-primary">
              Chưa có dữ liệu danh mục
            </p>
            <p className="mt-1 text-xs text-text-tertiary max-w-[240px]">
              Không ghi nhận món bán nào thuộc danh mục trong kỳ này.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {categories.map((cat) => (
              <div key={cat.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary">
                      {cat.name}
                    </span>
                    <span className="text-[11px] text-text-tertiary">
                      ({cat.quantity} phần)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-text-primary">
                      {formatCurrency(cat.revenue)}
                    </span>
                    <span className="w-12 text-right text-xs font-semibold text-text-tertiary">
                      {formatPercent(cat.percent, 1)}
                    </span>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", cat.barColor)}
                    style={{ width: `${Math.min(100, Math.max(0, cat.percent))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 border-t border-border-default/60 pt-3 flex items-center justify-between text-xs">
        <span className="text-text-tertiary">Tổng doanh thu món bán:</span>
        <span className="text-sm font-bold text-brand-primary">
          {formatCurrency(totalRevenue)}
        </span>
      </div>
    </div>
  )
}

