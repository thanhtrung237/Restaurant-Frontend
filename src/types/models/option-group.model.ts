import type { BaseResponse } from "./base.model"
import type { SelectionType } from "../enums"

/**
 * Mirror của `OptionGroupResponse.java` — nhóm tuỳ chọn dùng chung ở cấp NHÀ HÀNG
 * (VD: "Size", "Topping", "Độ cay"). Một nhóm được gắn vào nhiều món qua `DishOptionGroup`.
 *
 * Endpoint (`/option-groups`): `GET /{id}`, `GET /restaurant/{restaurantId}`, `GET ""`,
 * `POST ""`, `PUT /{id}`, `DELETE /{id}`.
 *
 * `minSelect`/`maxSelect` là `int` (bắt buộc, không null) ở BE.
 * Quy ước thường gặp: REQUIRED + min=1/max=1 → radio bắt buộc; OPTIONAL + max>1 → checkbox nhiều lựa chọn.
 */
export interface OptionGroup extends BaseResponse {
  restaurantId: number
  restaurantName?: string
  name: string
  selectionType: SelectionType
  minSelect: number
  maxSelect: number
  createdAt?: string
  modifiedAt?: string
}
