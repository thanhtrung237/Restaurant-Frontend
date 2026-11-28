import type { AccountStatus } from "../enums"

/**
 * Mirror của `LoginResponse.java` — kết quả `POST /auth/login`.
 *
 * LƯU Ý QUAN TRỌNG: response này **không có `branchId`**. `branchId` nằm trong
 * `Assignment` của tài khoản. Sau khi login phải gọi thêm `GET /accounts/{accountId}`
 * (đã kèm sẵn `assignments`) hoặc `GET /assignments/account/{accountId}` để suy ra
 * chi nhánh hiện hành. Tài khoản có nhiều Assignment ở nhiều chi nhánh → cần UI chọn
 * chi nhánh (Phase 5).
 *
 * `roles` là danh sách `Role.code` dạng chuỗi, dùng để map sang `AppRole` của FE.
 */
export interface LoginResponse {
  accessToken: string
  accountId: number
  restaurantId: number | null
  username: string
  fullName: string
  roles?: string[]
}

/** Mirror của `RefreshTokenResponse.java` — kết quả `POST /auth/refresh-token`. */
export interface RefreshTokenResponse {
  accessToken: string
  accountId: number
}

/** Tiện ích: trạng thái tài khoản dùng khi gọi `PUT /accounts/{id}/status`. */
export type AccountStatusParam = AccountStatus
