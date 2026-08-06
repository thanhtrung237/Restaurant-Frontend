import type { BaseResponse } from "./base.model"

/**
 * Mirror của `OptionItemResponse.java` — 1 lựa chọn cụ thể trong `OptionGroup`
 * (VD: nhóm "Size" có các item "Nhỏ", "Vừa", "Lớn").
 *
 * Endpoint (`/option-items`): `GET /{id}`, `GET /group/{optionGroupId}`, `GET ""`,
 * `POST ""`, `PUT /{id}`, `DELETE /{id}`.
 *
 * `extraPrice` là phụ thu cộng thêm vào giá món (BE `nullable = false`, mặc định 0).
 */
export interface OptionItem extends BaseResponse {
  optionGroupId: number
  optionGroupName?: string
  name: string
  extraPrice: number // BigDecimal
  createdAt?: string
  modifiedAt?: string
}
