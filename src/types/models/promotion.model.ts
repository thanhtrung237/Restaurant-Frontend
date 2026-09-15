import type { BaseResponse } from "./base.model"
import type { ApplyLevel, PromotionStatus } from "../enums"

/** Mirror của `PromotionResponse.java` — khuyến mãi cấp nhà hàng, gán xuống chi nhánh qua `PromotionBranch`. */
export interface Promotion extends BaseResponse {
  restaurantId: number
  name: string
  description?: string
  startDate: string // LocalDate -> "YYYY-MM-DD"
  endDate: string
  timeWindow?: string
  daysOfWeek?: string
  applyLevel: ApplyLevel
  condition?: string
  action?: string
  priority?: number
  status: PromotionStatus
  code?: string
  usageLimit?: number
  usageCount?: number
  allBranches?: boolean
  branchIds?: number[]
  createdAt?: string
  modifiedAt?: string
}
