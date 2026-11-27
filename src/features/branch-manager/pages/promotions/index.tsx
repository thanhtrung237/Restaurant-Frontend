import { RefreshCw, Tag } from "lucide-react"
import { useActivePromotionsByBranch } from "@/api/promotions.api"
import { useBranchMenuOverview } from "@/api/branch-menu.api"
import { EmptyState } from "@/components/common/EmptyState"
import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { parseCondition } from "@/lib/promotion-display"
import {
  formatDateForDisplay,
  formatPromotionBriefRule,
  formatUsageDisplay,
  parseDaysOfWeekFromApi,
} from "@/lib/promotion-format"
import { useAuthStore } from "@/stores/auth.store"

export default function BranchManagerPromotionsPage() {
  const branchId = useAuthStore((state) => state.branchId) ?? undefined
  const {
    data: promotions = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useActivePromotionsByBranch(branchId)
  const { data: menu = [] } = useBranchMenuOverview(branchId)

  return (
    <div className="min-w-0">
      <PageHeader
        title="Khuyến mãi"
        subtitle="Chương trình đang áp dụng tại chi nhánh đang chọn"
        actions={
          <Button
            type="button"
            variant="outline"
            disabled={!branchId || isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw aria-hidden="true" />
            Làm mới
          </Button>
        }
      />
      <div className="p-4 sm:p-6">
        {!branchId ? (
          <EmptyState icon={Tag} title="Chọn chi nhánh để xem khuyến mãi" />
        ) : isLoading ? (
          <p role="status" className="py-10 text-center text-sm text-text-secondary">
            Đang tải khuyến mãi…
          </p>
        ) : isError ? (
          <EmptyState
            icon={Tag}
            title="Không thể tải khuyến mãi"
            action={{ label: "Thử lại", onClick: () => void refetch() }}
          />
        ) : promotions.length === 0 ? (
          <EmptyState icon={Tag} title="Chi nhánh chưa có khuyến mãi áp dụng lúc này" />
        ) : (
          <ul role="list" className="grid min-w-0 gap-4 lg:grid-cols-2">
            {promotions.map((promotion) => {
              const condition = parseCondition(promotion.condition)
              const targets =
                condition?.target === "specific_dish"
                  ? menu
                      .filter((dish) => condition.dishIds?.includes(dish.dishId))
                      .map((dish) => dish.dishName)
                  : condition?.target === "category"
                    ? menu
                        .filter((dish) => condition.categoryIds?.includes(dish.categoryId))
                        .map((dish) => dish.categoryName)
                        .filter(Boolean)
                    : []
              const outOfUses =
                promotion.usageLimit != null && (promotion.usageCount ?? 0) >= promotion.usageLimit
              const days = parseDaysOfWeekFromApi(promotion.daysOfWeek ?? "").join(", ")

              return (
                <li
                  key={promotion.id}
                  className="min-w-0 rounded-card border border-border-default bg-surface-card p-4 shadow-2xs sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="min-w-0 break-words text-base font-bold text-text-primary">
                      {promotion.name}
                    </h2>
                    <Badge variant={outOfUses ? "danger" : "success"}>
                      {outOfUses ? "Hết lượt" : "Đang áp dụng"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-brand-primary">
                    {formatPromotionBriefRule(promotion)}
                  </p>
                  {targets.length > 0 && (
                    <p className="mt-1 break-words text-sm text-text-secondary">
                      {[...new Set(targets)].join(", ")}
                    </p>
                  )}
                  {promotion.description && (
                    <p className="mt-2 break-words text-sm text-text-secondary">
                      {promotion.description}
                    </p>
                  )}
                  <dl className="mt-4 space-y-2 border-t border-border-default pt-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                      <dt className="text-text-secondary">Thời hạn</dt>
                      <dd>
                        {formatDateForDisplay(promotion.startDate)} –{" "}
                        {formatDateForDisplay(promotion.endDate)}
                      </dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                      <dt className="text-text-secondary">Lịch áp dụng</dt>
                      <dd>
                        {days || "Mỗi ngày"} · {promotion.timeWindow || "Cả ngày"}
                      </dd>
                    </div>
                    {promotion.code && (
                      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                        <dt className="text-text-secondary">Mã khuyến mãi</dt>
                        <dd className="break-all font-mono">{promotion.code}</dd>
                      </div>
                    )}
                    {promotion.usageLimit != null && (
                      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                        <dt className="text-text-secondary">Lượt đã dùng / giới hạn</dt>
                        <dd>{formatUsageDisplay(promotion.usageCount, promotion.usageLimit)}</dd>
                      </div>
                    )}
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
