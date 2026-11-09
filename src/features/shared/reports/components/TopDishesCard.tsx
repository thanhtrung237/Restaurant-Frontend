import * as React from "react"
import { UtensilsCrossed, AlertTriangle, TrendingUp, Package, Sparkles } from "lucide-react"
import { formatCurrency } from "@/lib/format"
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
  const quantityItems = topByQuantity && topByQuantity.length > 0 ? topByQuantity : legacyItemsAsRank
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

  return (
    <div className="rounded-card border border-border-default/80 bg-surface-card p-6 shadow-2xs">
      {/* Header with Title and Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border-default/60 pb-4">
        <div>
          <h3 className="text-base font-bold text-text-primary tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-text-tertiary mt-0.5">
            Xếp hạng món bán chạy & cảnh báo món bán chậm (FR-RPT-03)
          </p>
        </div>

        {/* Tab pills */}
        <div className="inline-flex rounded-xl bg-surface-muted p-1 border border-border-default/60">
          <button
            type="button"
            onClick={() => setActiveTab("revenue")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activeTab === "revenue"
                ? "bg-surface-card text-brand-primary shadow-xs"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <TrendingUp className="size-3.5" />
            <span>Doanh thu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("quantity")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activeTab === "quantity"
                ? "bg-surface-card text-brand-primary shadow-xs"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <Package className="size-3.5" />
            <span>Số lượng bán</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("slowest")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activeTab === "slowest"
                ? "bg-amber-100/90 text-amber-800 shadow-xs"
                : "text-text-secondary hover:text-text-primary"
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
            <p className="font-semibold text-amber-950">
              💡 Gợi ý tối ưu thực đơn (Menu Engineering - FR-RPT-03):
            </p>
            <p className="text-amber-800 leading-relaxed">
              Các món trong danh sách này có sản lượng bán và doanh số thấp nhất trong khoảng thời gian đã chọn.
              Quản lý nhà hàng có thể cân nhắc gỡ bỏ khỏi thực đơn để giảm tải chi phí lưu kho nguyên liệu, hoặc kết hợp vào combo giờ vàng/khuyến mãi để kích cầu.
            </p>
          </div>
        </div>
      )}

      {/* List or Empty State */}
      {currentList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-text-tertiary">
            <UtensilsCrossed className="size-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-text-primary">
            Chưa có dữ liệu món bán trong khoảng thời gian này
          </p>
          <p className="mt-1 text-xs text-text-tertiary max-w-md">
            Thử chọn mốc thời gian khác (Ví dụ: bấm vào nút <strong>"Hôm qua"</strong> hoặc <strong>"7 ngày qua"</strong> ở trên) để xem dữ liệu đơn hàng thực tế.
          </p>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-border-default/50">
          {currentList.map((item, idx) => {
            const rank = item.rank || idx + 1
            const revenueNum = parseFloat(item.totalRevenue) || 0

            return (
              <div
                key={`${item.dishId}-${rank}`}
                className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-surface-page/40 px-2 rounded-lg"
              >
                {/* Rank badge + Tên món + Danh mục */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all",
                      rank === 1 && activeTab !== "slowest"
                        ? "bg-amber-100 text-amber-800 ring-2 ring-amber-300"
                        : rank === 2 && activeTab !== "slowest"
                        ? "bg-slate-200 text-slate-800 ring-2 ring-slate-300"
                        : rank === 3 && activeTab !== "slowest"
                        ? "bg-orange-100 text-orange-800 ring-2 ring-orange-300"
                        : activeTab === "slowest"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-surface-muted text-text-secondary"
                    )}
                  >
                    {rank}
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="truncate text-sm font-semibold text-text-primary">
                      {item.dishName}
                    </span>
                    {item.categoryName && (
                      <span className="text-[11px] text-text-tertiary truncate">
                        {item.categoryName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Số phần + Thành tiền */}
                <div className="flex items-center gap-6 sm:gap-10 shrink-0 text-right">
                  <div className="text-right">
                    <span className="text-sm font-semibold text-text-secondary">
                      {item.totalQuantity}
                    </span>
                    <span className="text-xs text-text-tertiary ml-1">phần</span>
                  </div>
                  <div className="w-28 text-sm font-bold text-text-primary text-right">
                    {formatCurrency(revenueNum)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
