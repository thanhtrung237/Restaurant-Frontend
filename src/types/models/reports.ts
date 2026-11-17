/**
 * Report DTOs matching backend responses from ReportController
 * All BigDecimal fields from backend are typed as string in TypeScript
 */

// ── FR-RPT-01: Revenue Report ───────────────────────────────────────

export interface RevenueReportResponse {
  totalRevenue: string
  totalGrossRevenue?: string
  totalDiscount?: string
  totalInvoices: number
  totalGuests: number
  avgRevenuePerInvoice: string
  revenueByPaymentMethod: Record<string, string>
  previousPeriodRevenue: string
  revenueGrowthPercent: number | null
  trend: RevenueTrendPoint[]
}

export interface RevenueTrendPoint {
  label: string
  revenue: string
  invoiceCount: number
}

// ── FR-RPT-02: Hourly Revenue ───────────────────────────────────────

export interface HourlyRevenueResponse {
  hourlySlots: HourSlot[]
  dayOfWeekSlots: DayOfWeekSlot[]
}

export interface HourSlot {
  hour: number
  label: string
  revenue: string
  tableCount: number
}

export interface DayOfWeekSlot {
  dayOfWeek: number
  label: string
  revenue: string
  invoiceCount: number
}

// ── FR-RPT-03: Top Dishes ───────────────────────────────────────────

export interface TopDishResponse {
  topByQuantity: DishRankItem[]
  topByRevenue: DishRankItem[]
  slowestDishes: DishRankItem[]
}

export interface DishRankItem {
  dishId: number
  dishName: string
  categoryName: string
  totalQuantity: number
  totalRevenue: string
  rank: number
}

// ── FR-RPT-04: Branch Comparison ────────────────────────────────────

export interface BranchRevenueCompareResponse {
  branches: BranchStat[]
  avgRevenue: string
  avgInvoiceValue: string
  avgCancelRate: number
}

export interface BranchStat {
  branchId: number
  branchName: string
  rank: number
  totalRevenue: string
  totalInvoices: number
  avgInvoiceValue: string
  cancelByRestaurantCount: number
  cancelByCustomerCount: number
  totalCancelRate: number
  hasAnomaly: boolean
  anomalyNote: string
}

// ── AI Anomaly Detection ──────────────────────────────────────────

export type AnomalySeverity = "LOW" | "WARNING" | "CRITICAL"
export type AnomalyType =
  | "SURGE_CANCELLATION"
  | "SUSPICIOUS_DISCOUNT"
  | "REPEATED_TABLE_CANCELLATIONS"
  | "UNUSUAL_VOID_RATE"

export interface AnomalyAlert {
  id: string
  type: AnomalyType
  severity: AnomalySeverity
  title: string
  location: string
  description: string
  aiExplanation?: string
  recommendation?: string
  detectedAt: string
  anomalyScore?: number
  metrics?: Record<string, unknown>
}

export interface AnomalyReportResponse {
  totalAnomalies: number
  criticalCount: number
  warningCount: number
  alerts: AnomalyAlert[]
  aiExecutiveSummary?: string
  evaluatedAt: string
}
