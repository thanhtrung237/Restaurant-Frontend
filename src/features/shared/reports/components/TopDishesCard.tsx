import * as React from "react"
import {
  UtensilsCrossed,
  AlertTriangle,
  TrendingUp,
  Package,
  Sparkles,
  Lightbulb,
} from "lucide-react"
import { Pie, PieChart, Tooltip } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { formatCurrency, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { DishRankItem } from "@/types/models/reports"
import type { TopSellingDishItem } from "../types"

interface TopDishesCardProps {
  topByRevenue?: DishRankItem[]
  topByQuantity?: DishRankItem[]
  slowestDishes?: DishRankItem[]
  dishes?: TopSellingDishItem[] // Backward compatibility
  title?: string
}

const dishColors = [
  "var(--color-brand-primary)",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#0E7490",
  "#DB2777",
  "#65A30D",
  "#475569",
  "#A16207",
]

const chartConfig = { value: { label: "Món ăn" } }

export function TopDishesCard({
  topByRevenue,
  topByQuantity,
  slowestDishes,
  dishes,
  title = "Báo cáo cơ cấu món ăn",
}: TopDishesCardProps) {
  const [activeTab, setActiveTab] = React.useState<"revenue" | "quantity" | "slowest">("revenue")

  // Fallback to legacy dishes prop if modern arrays aren't provided
  const legacyItemsAsRank: DishRankItem[] = React.useMemo(() => {
    if (!dishes) return []
    return dishes.map((d) => ({
      dishId: d.rank,
      dishName: d.dishName,
      categoryName: "Món ăn",
      totalQuantity: d.quantity,
      totalRevenue: d.totalAmount.toString(),
      rank: d.rank,
    }))
  }, [dishes])

  const revenueItems = topByRevenue && topByRevenue.length > 0 ? topByRevenue : legacyItemsAsRank
  const quantityItems =
    topByQuantity && topByQuantity.length > 0 ? topByQuantity : legacyItemsAsRank
  const slowItems = slowestDishes || []

  const currentList = React.useMemo(() => {
    switch (activeTab) {
      case "revenue":
        return revenueItems
      case "quantity":
        return quantityItems
      case "slowest":
        return slowItems
      default:
        return revenueItems
    }
  }, [activeTab, revenueItems, quantityItems, slowItems])

  const isRevenue = activeTab === "revenue"
  const formatQuantity = (quantity: number) => `${quantity.toLocaleString("vi-VN")} phần`
  const formatValue = isRevenue ? formatCurrency : formatQuantity
  const chartItems = currentList.map((item, index) => {
    const revenue = Number(item.totalRevenue) || 0
    const quantityLabel = formatQuantity(item.totalQuantity)
    const revenueLabel = formatCurrency(revenue)
    const value = isRevenue ? revenue : item.totalQuantity

    return {
      item,
      name: item.dishName,
      value: Number.isFinite(value) && value > 0 ? value : 0,
      fill: dishColors[index % dishColors.length],
      label: isRevenue ? revenueLabel : quantityLabel,
      secondaryLabel: isRevenue ? quantityLabel : revenueLabel,
    }
  })
  const slices = chartItems.filter(({ value }) => value > 0)
  const total = slices.reduce((sum, { value }) => sum + value, 0)
  const share = (value: number) => formatPercent(total > 0 ? (value / total) * 100 : 0, 1)

  return (
    <div className="@container min-w-0 rounded-card border border-border-default/80 bg-surface-card p-4 shadow-2xs sm:p-6">
      {/* Header with Title and Tabs */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-default/60 pb-4">
        <div>
          <h3 className="text-base font-bold text-text-primary tracking-tight">{title}</h3>
          <p className="text-xs text-text-tertiary mt-0.5">
            Xếp hạng món bán chạy & cảnh báo món bán chậm
          </p>
        </div>

        {/* Tab pills */}
        <div
          role="group"
          aria-label="Chỉ số món ăn"
          className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-border-default/60 bg-surface-muted p-1"
        >
          <button
            type="button"
            aria-pressed={activeTab === "revenue"}
            onClick={() => setActiveTab("revenue")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activeTab === "revenue"
                ? "bg-surface-card text-brand-primary shadow-xs"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <TrendingUp className="size-3.5" />
            <span>Doanh thu</span>
          </button>

          <button
            type="button"
            aria-pressed={activeTab === "quantity"}
            onClick={() => setActiveTab("quantity")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activeTab === "quantity"
                ? "bg-surface-card text-brand-primary shadow-xs"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <Package className="size-3.5" />
            <span>Số lượng bán</span>
          </button>

          <button
            type="button"
            aria-pressed={activeTab === "slowest"}
            onClick={() => setActiveTab("slowest")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activeTab === "slowest"
                ? "bg-amber-100/90 text-amber-800 shadow-xs"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <AlertTriangle className="size-3.5 text-amber-600" />
            <span>Món bán chậm</span>
          </button>
        </div>
      </div>

      {/* Advisory notice for slowest tab (Menu Engineering) */}
      {activeTab === "slowest" && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200/70 bg-[#FFFBEB] p-3.5 text-xs text-amber-900 shadow-2xs">
          <Sparkles className="size-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-0.5">
            <p className="flex items-start gap-1.5 font-semibold text-amber-950">
              <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Gợi ý tối ưu thực đơn:
            </p>
            <p className="text-amber-800 leading-relaxed">
              Các món trong danh sách này có sản lượng bán và doanh số thấp nhất trong khoảng thời
              gian đã chọn. Quản lý nhà hàng có thể cân nhắc gỡ bỏ khỏi thực đơn để giảm tải chi phí
              lưu kho nguyên liệu, hoặc kết hợp vào combo giờ vàng/khuyến mãi để kích cầu.
            </p>
          </div>
        </div>
      )}

      {/* Chart or Empty State */}
      {currentList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-text-tertiary">
            <UtensilsCrossed className="size-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-text-primary">
            Chưa có dữ liệu món bán trong khoảng thời gian này
          </p>
          <p className="mt-1 text-xs text-text-tertiary max-w-md">
            Thử chọn mốc thời gian khác (Ví dụ: bấm vào nút <strong>"Hôm qua"</strong> hoặc{" "}
            <strong>"7 ngày qua"</strong> ở trên) để xem dữ liệu đơn hàng thực tế.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid min-w-0 items-center gap-4 @lg:grid-cols-[12rem_minmax(0,1fr)] @lg:gap-6">
          {total > 0 ? (
            <div className="relative mx-auto w-full max-w-48">
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-text-secondary">
                  {isRevenue ? "Doanh thu các món" : "Tổng số phần"}
                </span>
                <strong className="max-w-[58%] break-words text-sm tabular-nums text-text-primary">
                  {formatValue(total)}
                </strong>
              </div>
              <ChartContainer config={chartConfig} className="aspect-square w-full">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="95%"
                    stroke="var(--color-surface-card)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    formatter={(value) =>
                      typeof value === "number" ? `${formatValue(value)} · ${share(value)}` : ""
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
              {isRevenue ? "Các món này chưa có doanh thu" : "Các món này chưa bán được phần nào"}
            </p>
          )}

          <ol
            role="list"
            aria-label="Tỷ trọng theo món ăn"
            className="min-w-0 divide-y divide-border-default/60"
          >
            {chartItems.map(({ item, value, label, secondaryLabel, fill }) => (
              <li key={item.dishId} className="flex items-start justify-between gap-2 py-2">
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1 size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: value > 0 ? fill : "var(--color-surface-muted)" }}
                  />
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-text-primary">
                      {item.dishName}
                    </p>
                    {item.categoryName && (
                      <p className="break-words text-xs text-text-tertiary">{item.categoryName}</p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className="text-sm font-semibold text-text-primary">{label}</p>
                  <p className="text-xs text-text-secondary">
                    {share(value)} · {secondaryLabel}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
