import { cn } from "@/lib/utils"
import type { BranchComparisonItem } from "../types"

interface BranchComparisonTableProps {
  data: BranchComparisonItem[]
}

export function BranchComparisonTable({ data }: BranchComparisonTableProps) {
  return (
    <div className="rounded-card border border-border-default/80 bg-surface-card p-6 shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-default/70 text-xs font-semibold uppercase text-text-tertiary">
              <th className="pb-3 pl-1 font-semibold">CHI NHÁNH</th>
              <th className="pb-3 font-semibold">DOANH THU</th>
              <th className="pb-3 font-semibold">SỐ HĐ</th>
              <th className="pb-3 font-semibold">TB/HĐ</th>
              <th className="pb-3 font-semibold">TỶ LỆ HỦY</th>
              <th className="pb-3 pr-1 text-right font-semibold">SO VỚI TB</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default/50">
            {data.map((item) => {
              const isTopOne = item.rank === 1
              const isDanger = item.isCancelRateHigh

              return (
                <tr
                  key={item.rank}
                  className="transition-colors hover:bg-surface-page/50"
                >
                  {/* Cột Chi nhánh */}
                  <td className="py-4 pl-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-6.5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          isTopOne
                            ? "bg-brand-primary-subtle text-brand-primary"
                            : "bg-surface-muted text-text-secondary"
                        )}
                      >
                        {item.rank}
                      </div>
                      <span className="font-semibold text-text-primary">
                        {item.branchName}
                      </span>
                    </div>
                  </td>

                  {/* Cột Doanh thu */}
                  <td className="py-4 font-bold text-text-primary">
                    {item.revenue.toLocaleString("vi-VN")}đ
                  </td>

                  {/* Cột Số HĐ */}
                  <td className="py-4 font-normal text-text-secondary">
                    {item.orderCount}
                  </td>

                  {/* Cột TB/HĐ */}
                  <td className="py-4 font-normal text-text-secondary">
                    {item.averagePerOrder.toLocaleString("vi-VN")}đ
                  </td>

                  {/* Cột Tỷ lệ hủy */}
                  <td
                    className={cn(
                      "py-4 font-normal",
                      isDanger ? "font-semibold text-status-danger" : "text-text-secondary"
                    )}
                  >
                    {item.cancelRate}
                  </td>

                  {/* Cột So với TB */}
                  <td className="py-4 pr-1 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-medium",
                        item.vsAverage.direction === "up"
                          ? "text-status-success"
                          : "text-status-danger"
                      )}
                    >
                      <span>{item.vsAverage.direction === "up" ? "▲" : "▼"}</span>
                      <span>{item.vsAverage.value}</span>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
