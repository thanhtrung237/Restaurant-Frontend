import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios"
import { getGuestCredential, isCustomerPage } from "./guest-credential"
import type { ResponseError, ResponseSuccess } from "@/types/api"
import type { RefreshTokenResponse } from "@/types/models"
import {
  clearTokens,
  getAccessToken,
  getTokenAccountId,
  getTokenRevision,
  notifyUnauthorized,
  setAccessToken,
} from "./auth-token"

/**
 * Vite chuyển tiếp API cùng origin trong môi trường phát triển.
 * Bản triển khai có thể đặt VITE_API_BASE_URL để dùng API riêng.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || "/api/v1"

/** Đường dẫn công khai (BE `SecurityConfig.PUBLIC_ENDPOINTS`) — không gắn Bearer, không refresh. */
const PUBLIC_PATHS = ["/auth/login", "/auth/refresh-token", "/auth/logout"]

export const COOKIE_AUTH_CONFIG = {
  withCredentials: true,
  headers: { "X-Auth-Request": "1" },
}

type AuthenticatedRequest = InternalAxiosRequestConfig & {
  _retried?: boolean
  _accountId?: number | null
}

/** Lỗi đã chuẩn hoá để UI dùng chung, thay vì phải tự bóc `AxiosError`. */
export class ApiError extends Error {
  status: number
  path?: string
  raw?: unknown

  constructor(message: string, status: number, path?: string, raw?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.path = path
    this.raw = raw
  }

  /** 401/403 — hết phiên hoặc không đủ quyền. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403
  }
}

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
})

function isPublicPath(url?: string): boolean {
  if (!url) return false
  return PUBLIC_PATHS.some((p) => url.includes(p))
}

// ------------------------------------------------------------------ Request
http.interceptors.request.use((config: AuthenticatedRequest) => {
  if (isCustomerPage()) {
    config.headers.delete("Authorization")
    const credential = getGuestCredential()
    if (credential) config.headers.set("X-Guest-Token", credential.token)
  } else if (!isPublicPath(config.url)) {
    const token = getAccessToken()
    config._accountId = getTokenAccountId()
    if (token) config.headers.set("Authorization", `Bearer ${token}`)
  }
  return config
})

// ------------------------------------------------------------------ Refresh 401
/**
 * Giữ 1 promise refresh duy nhất: nếu 5 request cùng lỗi 401 một lúc thì chỉ gọi
 * `/auth/refresh-token` MỘT lần, 4 request còn lại chờ kết quả rồi retry.
 */
let pendingRefresh: { revision: number; request: Promise<RefreshTokenResponse> } | null = null

export async function restoreAccessToken(accountId: number) {
  const revision = getTokenRevision()
  if (pendingRefresh?.revision !== revision) {
    const request = apiPost<RefreshTokenResponse>("/auth/refresh-token", null, COOKIE_AUTH_CONFIG)
    pendingRefresh = { revision, request }
  }

  const pending = pendingRefresh
  try {
    const data = await pending.request
    if (!data?.accessToken || data.accountId !== accountId) {
      throw new ApiError("Phiên đăng nhập đã hết hạn", 401)
    }
    if (getTokenRevision() === revision) {
      setAccessToken(data.accessToken, accountId)
    } else if (getAccessToken() !== data.accessToken || getTokenAccountId() !== accountId) {
      throw new ApiError("Phiên đăng nhập đã thay đổi", 401)
    }
  } finally {
    if (pendingRefresh === pending) pendingRefresh = null
  }
}

function toApiError(error: AxiosError<ResponseError>): ApiError {
  if (!error.response) {
    return new ApiError(
      error.code === "ECONNABORTED"
        ? "Máy chủ phản hồi quá lâu, vui lòng thử lại."
        : "Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.",
      0,
      error.config?.url,
      error,
    )
  }
  const body = error.response.data
  return new ApiError(
    body?.message || error.message || "Đã có lỗi xảy ra",
    error.response.status,
    body?.path ?? error.config?.url,
    body,
  )
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ResponseError>) => {
    const config = error.config as AuthenticatedRequest | undefined
    const status = error.response?.status

    if (
      status === 401 &&
      config &&
      !config._retried &&
      config._accountId != null &&
      config._accountId === getTokenAccountId() &&
      !isPublicPath(config.url) &&
      !isCustomerPage()
    ) {
      config._retried = true
      const revision = getTokenRevision()
      try {
        if (config.headers.get("Authorization") === `Bearer ${getAccessToken()}`) {
          await restoreAccessToken(config._accountId)
        }
      } catch (refreshError) {
        if (getTokenRevision() === revision && isApiStatus(refreshError, 401)) {
          clearTokens()
          notifyUnauthorized()
        }
        return Promise.reject(refreshError)
      }
      if (config._accountId === getTokenAccountId()) return http.request(config)
    }

    return Promise.reject(toApiError(error))
  },
)

// ------------------------------------------------------------------ Helper bóc vỏ
/**
 * Backend bọc mọi response thành công trong `ResponseSuccess<T>` = `{ status, message, data }`.
 * 4 hàm dưới bóc sẵn lớp vỏ để nơi gọi chỉ nhận đúng `T`.
 *
 * Với endpoint trả void (logout, delete...), BE bỏ hẳn field `data` khỏi JSON
 * (`@JsonInclude(NON_NULL)`) nên `data` sẽ là `undefined` — dùng `apiDelete<void>()`.
 */
function unwrap<T>(payload: ResponseSuccess<T> | undefined): T {
  return payload?.data as T
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.get<ResponseSuccess<T>>(url, config)
  return unwrap(res.data)
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await http.post<ResponseSuccess<T>>(url, body ?? null, config)
  return unwrap(res.data)
}

export async function apiPut<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await http.put<ResponseSuccess<T>>(url, body ?? null, config)
  return unwrap(res.data)
}

export async function apiDelete<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.delete<ResponseSuccess<T>>(url, config)
  return unwrap(res.data)
}

/** Mã lỗi nào đó có phải là mã này không — dùng để phân biệt "kết quả hợp lệ" với "lỗi thật". */
export function isApiStatus(error: unknown, ...statuses: number[]): boolean {
  return error instanceof ApiError && statuses.includes(error.status)
}

/**
 * Hàm `retry` cho react-query ở những endpoint mà một số mã 4xx là **KẾT QUẢ hợp lệ**,
 * không phải lỗi mạng.
 *
 * Ví dụ `GET /invoices/session/{id}` trả **404** khi phiên chưa được thu ngân lập hoá đơn —
 * đó là câu trả lời "chưa có", đúng và cuối cùng. Để mặc định (`retry: 1`) thì react-query vẫn
 * thử lại kèm backoff, nên `isLoading` còn `true` thêm vài giây và người dùng chỉ thấy vòng xoay
 * trong khi backend đã trả lời xong từ lâu.
 *
 * Các mã còn lại (mất mạng, 500) vẫn được thử lại `maxRetries` lần như cũ.
 */
export function retryUnlessStatus(statuses: number[], maxRetries = 1) {
  return (failureCount: number, error: unknown) =>
    !isApiStatus(error, ...statuses) && failureCount < maxRetries
}

/** Lấy message lỗi để hiển thị toast, an toàn với mọi kiểu lỗi. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return "Đã có lỗi xảy ra"
}
