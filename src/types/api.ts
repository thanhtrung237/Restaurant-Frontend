/**
 * Kiểu của lớp "vỏ" (envelope) mà backend bọc quanh mọi response.
 *
 * QUAN TRỌNG: backend có sẵn 2 class vỏ nhưng **chỉ dùng 1**:
 * - `ResponseSuccess<T>` → `{ status, message, data }`  ← TẤT CẢ 26 controller đều dùng cái này
 * - `ApiResponse<T>`     → `{ success, message, data, timestamp }` ← tồn tại trong source
 *   nhưng KHÔNG controller nào dùng. Đừng parse theo `success`.
 *
 * `data` được đánh dấu `@JsonInclude(NON_NULL)` ở BE nên với endpoint trả void
 * (logout, delete, ...) field `data` sẽ **không xuất hiện** trong JSON.
 */
export interface ResponseSuccess<T> {
  status: number
  message: string
  data?: T
}

/**
 * Mirror của `ResponseError.java` — body khi có lỗi.
 * LƯU Ý: lỗi **không** bọc trong `ResponseSuccess`, mà trả thẳng object này
 * (GlobalExceptionHandler trả trực tiếp `ResponseError`), nên khi bắt lỗi phải đọc
 * `error.response.data.message`, KHÔNG phải `error.response.data.data.message`.
 */
export interface ResponseError {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
}

/**
 * Mirror của `PageResponse.java` — dùng cho các endpoint có `page`/`size`
 * (accounts, branches, dishes, promotions, restaurants, roles, audit-logs,
 * option-groups, option-items).
 */
export interface PageResponse<T> {
  content: T[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  last: boolean
  first: boolean
}

/** Tham số phân trang chung cho các endpoint có hỗ trợ page/size. */
export interface PageParams {
  page?: number
  size?: number
}
