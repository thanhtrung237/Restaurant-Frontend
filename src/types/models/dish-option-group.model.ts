import type { BaseResponse } from "./base.model"
import type { SelectionType } from "../enums"

/**
 * Mirror của `DishOptionGroupResponse.java` — bảng nối Dish ↔ OptionGroup
 * (món nào dùng nhóm tuỳ chọn nào).
 *
 * Endpoint (`/dish-option-groups`):
 * - `GET  /dish/{dishId}`                — các nhóm tuỳ chọn của 1 món (màn chi tiết món)
 * - `GET  /option-group/{optionGroupId}` — các món đang dùng 1 nhóm
 * - `GET  /{id}`, `POST ""`, `DELETE /{id}`
 *
 * Response trả kèm `selectionType`/`minSelect`/`maxSelect` (lấy từ OptionGroup) để FE
 * dựng form chọn tuỳ chọn mà không phải gọi thêm `/option-groups/{id}`.
 * DTO này KHÔNG có `createdAt`/`modifiedAt`.
 */
export interface DishOptionGroup extends BaseResponse {
  dishId: number
  dishName?: string
  optionGroupId: number
  optionGroupName?: string
  selectionType: SelectionType
  minSelect: number
  maxSelect: number
}
