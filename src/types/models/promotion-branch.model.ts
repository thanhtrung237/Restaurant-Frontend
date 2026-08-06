import type { BaseResponse } from "./base.model"

/**
 * Mirror của `PromotionBranchResponse.java` — gán 1 Promotion cho 1 Branch.
 * Response chỉ có `createdAt`, KHÔNG có `modifiedAt`.
 */
export interface PromotionBranch extends BaseResponse {
  branchId: number
  branchName?: string
  promotionId: number
  promotionName?: string
  createdAt?: string
}
