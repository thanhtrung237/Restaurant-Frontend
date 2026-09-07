import type { TopSellingDishItem } from "../types"

interface TopDishesCardProps {
  dishes: TopSellingDishItem[]
  title?: string
}

export function TopDishesCard({
  dishes,
  title = "Món bán chạy",
}: TopDishesCardProps) {
  return (
    <div className="rounded-card border border-border-default/80 bg-surface-card p-6 shadow-2xs">
      <h3 className="text-base font-bold text-text-primary tracking-tight">
        {title}
      </h3>

      <div className="mt-5 space-y-4">
        {dishes.map((item) => (
          <div
            key={item.rank}
            className="flex items-center justify-between gap-4 py-1"
          >
            {/* Rank badge + Tên món */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-primary-subtle text-brand-primary text-xs font-bold">
                {item.rank}
              </div>
              <span className="truncate text-sm font-semibold text-text-primary">
                {item.dishName}
              </span>
            </div>

            {/* Số phần + Thành tiền */}
            <div className="flex items-center gap-8 shrink-0 text-right">
              <span className="text-sm text-text-tertiary">
                {item.quantity} phần
              </span>
              <span className="w-28 text-sm font-bold text-text-primary text-right">
                {item.totalAmount.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
