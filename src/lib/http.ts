import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios"
import type { ResponseError, ResponseSuccess } from "@/types/api"
import type { RefreshTokenResponse } from "@/types/models"
import {
  clearTokens, getAccessToken, getRefreshToken, notifyUnauthorized, setTokens,
} from "./auth-token"

/**
 * Base URL của backend. Đặt `VITE_API_BASE_URL` trong file `.env.local` khi deploy;
 * mặc định trỏ vào máy dev (BE chạy port 8080, prefix `/api/v1` lấy từ `API_PREFIX`).
 *
 * CORS của backend hiện chỉ cho phép origin `http://localhost:5173` và
 * `http://localhost:3000` — chạy Vite ở port khác sẽ bị chặn.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1"

/** Đường dẫn công khai (BE `SecurityConfig.PUBLIC_ENDPOINTS`) — không gắn Bearer, không refresh. */
const PUBLIC_PATHS = ["/auth/login", "/auth/refresh-token"]

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
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!isPublicPath(config.url)) {
    const token = getAccessToken()
    if (token) config.headers.set("Authorization", `Bearer ${token}`)
  }
  return config
})

// ------------------------------------------------------------------ Refresh 401
/**
 * Giữ 1 promise refresh duy nhất: nếu 5 request cùng lỗi 401 một lúc thì chỉ gọi
 * `/auth/refresh-token` MỘT lần, 4 request còn lại chờ kết quả rồi retry.
 */
let refreshPromise: Promise<string> | null = null

async function requestNewAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new ApiError("Phiên đăng nhập đã hết hạn", 401)

  // Gọi bằng axios "trần" chứ không qua `http` để không lọt vào interceptor 401 này.
  //
  // ⚠️ BACKEND CẦN SỬA: `AuthController.refreshToken` đọc token từ header `Refresh-Token`,
  // nhưng `SecurityConfig.corsConfigurationSource()` mới chỉ cho phép
  // `allowedHeaders = ["Authorization", "Content-Type"]`. Trình duyệt sẽ CHẶN header
  // `Refresh-Token` ở bước preflight → refresh luôn fail khi chạy từ browser.
  // BE chỉ cần thêm "Refresh-Token" vào `setAllowedHeaders(...)` là chạy được.
  // (Fallback cookie `refreshToken` ở BE cũng không dùng được vì BE không hề set cookie đó.)
  const res = await axios.post<ResponseSuccess<RefreshTokenResponse>>(
    `${API_BASE_URL}/auth/refresh-token`,
    null,
    { headers: { "Refresh-Token": refreshToken } },
  )

  const data = res.data?.data
  if (!data?.accessToken) throw new ApiError("Không làm mới được phiên đăng nhập", 401)

  setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken ?? refreshToken })
  return data.accessToken
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
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const status = error.response?.status

    if (status === 401 && config && !config._retried && !isPublicPath(config.url)) {
      config._retried = true
      try {
        if (!refreshPromise) {
          refreshPromise = requestNewAccessToken().finally(() => {
            refreshPromise = null
          })
        }
        await refreshPromise
        // Gọi lại qua `http` để request interceptor tự gắn access token MỚI.
        return await http.request(config)
      } catch {
        clearTokens()
        notifyUnauthorized()
        return Promise.reject(toApiError(error))
      }
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

export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.post<ResponseSuccess<T>>(url, body ?? null, config)
  return unwrap(res.data)
}

export async function apiPut<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.put<ResponseSuccess<T>>(url, body ?? null, config)
  return unwrap(res.data)
}

export async function apiDelete<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.delete<ResponseSuccess<T>>(url, config)
  return unwrap(res.data)
}

/** Lấy message lỗi để hiển thị toast, an toàn với mọi kiểu lỗi. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return "Đã có lỗi xảy ra"
}
