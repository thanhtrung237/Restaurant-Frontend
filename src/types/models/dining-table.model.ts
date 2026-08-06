import type { BaseResponse } from "./base.model"
import type { DiningTableStatus } from "../enums"

/**
 * Mirror của `DiningTableResponse.java`.
 * Nguồn: `GET /tables/branch/{branchId}`, `GET /tables/{id}`.
 *
 * `status` chỉ mang trạng thái VẬT LÝ của bàn (4 giá trị). Trạng thái nghiệp vụ
 * "chờ xác nhận mở bàn" / "chờ thanh toán" nằm ở `TableSession.status`.
 * `hasOpenSession` là cờ tiện lợi BE tính sẵn để biết bàn có phiên đang mở hay không —
 * dùng nó thay vì đoán từ `status`.
 */
export interface DiningTable extends BaseResponse {
  branchId: number
  branchName?: string
  areaId?: number
  areaName?: string
  name: string
  capacity?: number
  qrCode?: string
  status: DiningTableStatus
  hasOpenSession?: boolean
  createdAt?: string
  modifiedAt?: string
}
