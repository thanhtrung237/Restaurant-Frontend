import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type {
  RevenueReportResponse,
  HourlyRevenueResponse,
  TopDishResponse,
  BranchRevenueCompareResponse,
} from "@/types/models"

// ── FR-RPT-01: Revenue Report ───────────────────────────────────────

export function getRevenueReport(
  branchIds: number[],
  from: string,
  to: string,
  groupBy: "DAY" | "MONTH",
) {
  return apiGet<RevenueReportResponse>("/reports/revenue", {
    params: { branchIds: branchIds.join(","), from, to, groupBy },
  })
}

export function useRevenueReport(params?: {
  branchIds?: number[]
  from?: string
  to?: string
  groupBy?: "DAY" | "MONTH"
}) {
  const { branchIds, from, to, groupBy = "DAY" } = params ?? {}
  return useQuery({
    queryKey: qk.reports.revenue(
      branchIds ?? [],
      from ?? "",
      to ?? "",
      groupBy,
    ),
    queryFn: () => getRevenueReport(branchIds!, from!, to!, groupBy),
    enabled: !!branchIds && branchIds.length > 0 && !!from && !!to,
  })
}

// ── FR-RPT-02: Hourly Revenue ───────────────────────────────────────

export function getHourlyRevenue(
  branchIds: number[],
  from: string,
  to: string,
) {
  return apiGet<HourlyRevenueResponse>("/reports/hourly", {
    params: { branchIds: branchIds.join(","), from, to },
  })
}

export function useHourlyRevenue(params?: {
  branchIds?: number[]
  from?: string
  to?: string
}) {
  const { branchIds, from, to } = params ?? {}
  return useQuery({
    queryKey: qk.reports.hourly(branchIds ?? [], from ?? "", to ?? ""),
    queryFn: () => getHourlyRevenue(branchIds!, from!, to!),
    enabled: !!branchIds && branchIds.length > 0 && !!from && !!to,
  })
}

// ── FR-RPT-03: Top Dishes ───────────────────────────────────────────

export function getTopDishes(
  branchIds: number[],
  from: string,
  to: string,
  topN: number,
) {
  return apiGet<TopDishResponse>("/reports/top-dishes", {
    params: { branchIds: branchIds.join(","), from, to, topN },
  })
}

export function useTopDishes(params?: {
  branchIds?: number[]
  from?: string
  to?: string
  topN?: number
}) {
  const { branchIds, from, to, topN = 10 } = params ?? {}
  return useQuery({
    queryKey: qk.reports.topDishes(branchIds ?? [], from ?? "", to ?? "", topN),
    queryFn: () => getTopDishes(branchIds!, from!, to!, topN),
    enabled: !!branchIds && branchIds.length > 0 && !!from && !!to,
  })
}

// ── FR-RPT-04: Branch Comparison ────────────────────────────────────

export function getBranchComparison(
  restaurantId: number,
  from: string,
  to: string,
) {
  return apiGet<BranchRevenueCompareResponse>("/reports/branch-comparison", {
    params: { restaurantId, from, to },
  })
}

export function useBranchComparison(params?: {
  restaurantId?: number
  from?: string
  to?: string
}) {
  const { restaurantId, from, to } = params ?? {}
  return useQuery({
    queryKey: qk.reports.branchComparison(restaurantId ?? 0, from ?? "", to ?? ""),
    queryFn: () => getBranchComparison(restaurantId!, from!, to!),
    enabled: !!restaurantId && !!from && !!to,
  })
}
