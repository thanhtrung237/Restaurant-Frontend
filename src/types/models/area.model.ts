import type { BaseResponse } from "./base.model"
import type { AreaStatus } from "../enums"

/** Mirror của `AreaResponse.java` — khu vực trong 1 chi nhánh (VD: "Tầng 1", "Sân vườn"). */
export interface Area extends BaseResponse {
  branchId: number
  branchName?: string
  name: string
  status: AreaStatus
  /** Số bàn thuộc khu vực — BE tính sẵn. */
  tableCount?: number
  createdAt?: string
  modifiedAt?: string
}
