/**
 * Đăng nhập
 * Layout 2 cột: Banner thương hiệu bên trái & Form đăng nhập bên phải (kèm trường Mã nhà hàng)
 *
 * Luồng thật (Phase 5):
 * 1. `POST /auth/login` với `restaurantCode, username, password` → nhận
 *    `accessToken/refreshToken/accountId/restaurantId/username/fullName/roles`
 *    (xem `LoginResponse` — KHÔNG có `branchId`).
 * 2. Gọi thêm `GET /accounts/{id}` (đủ `employeeCode/email/status`) và
 *    `GET /assignments/account/{id}` (nguồn `branchId` thật) song song.
 * 3. Lọc các Assignment có `roleCode` map được sang `AppRole` (nhân viên FE dùng được).
 *    - 0 assignment hợp lệ  → báo lỗi, không cho vào hệ thống.
 *    - 1 assignment         → vào thẳng, không cần chọn.
 *    - >1 assignment        → hiện bước "Chọn vai trò / chi nhánh" (tài khoản có thể
 *      được phân nhiều vai trò ở nhiều chi nhánh khác nhau).
 * 4. `setSession()` vào `useAuthStore` rồi điều hướng bằng `resolvePostLoginTarget`:
 *    quay lại trang bị `RequireAuth` chặn CHỈ KHI trang đó thuộc khu vực của vai trò
 *    vừa chọn và không phải trang auth / trang 403; ngược lại về `ROLE_HOME[role]`.
 */

import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Loader2, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useLoginMutation } from "@/api/auth.api"
import { getAccount } from "@/api/accounts.api"
import { getAssignmentsByAccount } from "@/api/assignments.api"
import { getErrorMessage } from "@/lib/http"
import { clearTokens } from "@/lib/auth-token"
import { useAuthStore } from "@/stores/auth.store"
import { mapRoleCodeToAppRole, APP_ROLE_LABEL, APP_ROLE, type AppRole } from "@/config/roles"
import { resolvePostLoginTarget } from "@/app/router/post-login-target"
import { AUTH_PATHS } from "@/app/router/paths"
import type { Account, Assignment } from "@/types/models"

/** 1 lựa chọn hiển thị ở bước chọn vai trò/chi nhánh — gắn liền 1 Assignment cụ thể. */
interface AssignmentChoice {
  assignment: Assignment
  role: AppRole
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-status-danger/20 bg-status-danger-subtle px-4 py-3 text-sm text-status-danger font-medium">
      {message}
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((s) => s.setSession)
  const loginMutation = useLoginMutation()

  const [restaurantCode, setRestaurantCode] = React.useState(() => {
    return localStorage.getItem("saved_restaurant_code") || ""
  })
  const [username, setUsername] = React.useState(() => {
    return localStorage.getItem("saved_username") || ""
  })
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [rememberMe, setRememberMe] = React.useState(() => {
    return localStorage.getItem("remember_login") === "true"
  })
  const [error, setError] = React.useState<string | null>(null)
  const [isResolving, setIsResolving] = React.useState(false)
  const [showRestaurantField, setShowRestaurantField] = React.useState(() => {
    // Chỉ ẩn field nếu đã có restaurant code được lưu
    return !localStorage.getItem("saved_restaurant_code")
  })

  // Bước 2 (chỉ xuất hiện khi tài khoản có >1 Assignment hợp lệ)
  const [pendingAccount, setPendingAccount] = React.useState<Account | null>(null)
  const [pendingAccessToken, setPendingAccessToken] = React.useState<string | null>(null)
  const [choices, setChoices] = React.useState<AssignmentChoice[] | null>(null)

  const redirectTarget = (location.state as { from?: Location } | null)?.from

  function finalizeSession(account: Account, choice: AssignmentChoice, accessToken: string) {
    if (rememberMe) {
      localStorage.setItem("remember_login", "true")
      localStorage.setItem("saved_restaurant_code", restaurantCode.trim() || "")
      localStorage.setItem("saved_username", username.trim())
    } else {
      localStorage.removeItem("remember_login")
      localStorage.removeItem("saved_restaurant_code")
      localStorage.removeItem("saved_username")
    }

    setSession({
      account,
      role: choice.role,
      branchId: choice.assignment.branchId ?? null,
      accessToken,
      assignmentId: choice.assignment.id,
    })
    // Đích sau đăng nhập phải hợp lệ với vai trò VỪA CHỌN, không chỉ là trang cũ —
    // xem resolvePostLoginTarget. Dùng chung cho cả luồng 1 phân công và luồng chọn
    // phân công, vì cả hai đều đi qua finalizeSession.
    navigate(resolvePostLoginTarget(choice.role, redirectTarget), { replace: true })
  }

  function handleChangeRestaurant() {
    setShowRestaurantField(true)
    setRestaurantCode("")
    // Focus vào field restaurant code sau khi hiện
    setTimeout(() => {
      document.getElementById("restaurantCode")?.focus()
    }, 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!username.trim() || !password) {
      setError("Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.")
      return
    }

    try {
      const loginRes = await loginMutation.mutateAsync({
        restaurantCode: restaurantCode.trim() || null,
        username: username.trim(),
        password,
        deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      })

      setIsResolving(true)

      // `LoginResponse` không có branchId/employeeCode/status — lấy thêm từ 2 API sau.
      const [account, assignments] = await Promise.all([
        getAccount(loginRes.accountId),
        getAssignmentsByAccount(loginRes.accountId),
      ])

      if (account.status === "INACTIVE") {
        clearTokens()
        setError("Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên nhà hàng.")
        return
      }

      let validChoices: AssignmentChoice[] = assignments
        .map((assignment) => {
          const role = mapRoleCodeToAppRole(assignment.roleCode)
          return role ? { assignment, role } : null
        })
        .filter((c): c is AssignmentChoice => c !== null)

      // Fallback an toàn cho Quản trị nền tảng (Platform Admin) nếu chưa có assignment trong DB
      if (
        validChoices.length === 0 &&
        (loginRes.roles?.includes("PLATFORM_ADMIN") || !account.restaurantId)
      ) {
        validChoices = [
          {
            assignment: {
              id: 100,
              accountId: account.id,
              roleId: 100,
              roleName: "Quản trị nền tảng",
              roleCode: "PLATFORM_ADMIN",
              roleScope: "PLATFORM" as any,
              branchId: undefined,
              branchName: undefined,
            },
            role: APP_ROLE.PLATFORM_ADMIN,
          },
        ]
      }

      // Fallback an toàn cho Quản trị nhà hàng (Chủ nhà hàng / Manager) nếu chưa có assignment trong DB
      if (
        validChoices.length === 0 &&
        (loginRes.roles?.includes("MANAGER") ||
          loginRes.roles?.includes("RESTAURANT_ADMIN") ||
          Boolean(account.restaurantId))
      ) {
        validChoices = [
          {
            assignment: {
              id: 200,
              accountId: account.id,
              roleId: 200,
              roleName: "Quản trị nhà hàng",
              roleCode: "MANAGER",
              roleScope: "RESTAURANT" as any,
              branchId: undefined,
              branchName: undefined,
            },
            role: APP_ROLE.RESTAURANT_ADMIN,
          },
        ]
      }

      if (validChoices.length === 0) {
        clearTokens()
        setError("Tài khoản chưa được phân vai trò hợp lệ. Vui lòng liên hệ quản trị viên nhà hàng.")
        return
      }

      if (validChoices.length === 1) {
        finalizeSession(account, validChoices[0], loginRes.accessToken)
        return
      }

      // Nhiều Assignment (nhiều vai trò và/hoặc nhiều chi nhánh) → để người dùng tự chọn.
      setPendingAccount(account)
      setPendingAccessToken(loginRes.accessToken)
      setChoices(validChoices)
    } catch (err) {
      clearTokens()
      setError(getErrorMessage(err))
    } finally {
      setIsResolving(false)
    }
  }

  function handleChooseAssignment(choice: AssignmentChoice) {
    if (!pendingAccount || !pendingAccessToken) return
    finalizeSession(pendingAccount, choice, pendingAccessToken)
  }

  function handleBackToCredentials() {
    clearTokens()
    setChoices(null)
    setPendingAccount(null)
    setPendingAccessToken(null)
  }

  const isSubmitting = loginMutation.isPending || isResolving

  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* -------------------- CỘT TRÁI: BANNER THƯƠNG HIỆU (Desktop) -------------------- */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[48%] bg-[#F0522B] flex-col justify-between p-12 xl:p-16 select-none relative overflow-hidden">
        {/* Logo & Tên nhà hàng */}
        <div className="flex items-center gap-3.5 z-10">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-md">
            <span className="text-2xl font-black text-[#F0522B]">P</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Phở Việt
          </span>
        </div>

        {/* Thông điệp & Giới thiệu hệ thống */}
        <div className="z-10 max-w-lg">
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.2] tracking-tight text-white">
            Hệ thống quản lý
            <br />
            nhà hàng & gọi món QR
          </h1>
          <p className="mt-5 text-base xl:text-lg text-white/90 font-normal leading-relaxed">
            Quản lý bàn, chế biến, thực đơn, khuyến mãi và báo cáo
          </p>
        </div>

        {/* Hoạ tiết trang trí mờ phía sau */}
        <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -top-24 -left-24 size-80 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* -------------------- CỘT PHẢI: FORM ĐĂNG NHẬP -------------------- */}
      <div className="flex flex-1 flex-col justify-center items-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24 bg-white">
        <div className="w-full max-w-[420px]">
          {/* Header Mobile: Hiện logo khi ở màn hình nhỏ */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#F0522B] text-white shadow-sm">
              <span className="text-xl font-black">P</span>
            </div>
            <span className="text-xl font-bold text-[#212529]">Phở Việt</span>
          </div>

          {/* -------------------- BƯỚC 2: CHỌN VAI TRÒ (NẾU CÓ NHIỀU VAI TRÒ) -------------------- */}
          {choices && pendingAccount ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#212529]">
                  Chọn vai trò đăng nhập
                </h2>
                <p className="mt-2 text-sm text-[#868E96]">
                  Tài khoản <span className="font-semibold text-[#212529]">{pendingAccount.fullName}</span> có nhiều vai trò — chọn vai trò để tiếp tục:
                </p>
              </div>

              <div className="space-y-3">
                {choices.map((choice) => (
                  <button
                    key={choice.assignment.id}
                    type="button"
                    onClick={() => handleChooseAssignment(choice)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-left transition-all hover:border-[#F0522B] hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[#212529]">
                        {APP_ROLE_LABEL[choice.role]}
                      </p>
                      <p className="truncate text-xs text-[#868E96] mt-0.5">
                        {choice.assignment.branchName
                          ? `Chi nhánh ${choice.assignment.branchName}`
                          : "Toàn nhà hàng"}
                      </p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-[#868E96]" />
                  </button>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl py-2.5"
                onClick={handleBackToCredentials}
              >
                Quay lại đăng nhập
              </Button>
            </div>
          ) : (
            /* -------------------- BƯỚC 1: FORM NHẬP THÔNG TIN -------------------- */
            <div>
              {/* Tiêu đề */}
              <div className="mb-7">
                <h2 className="text-3xl font-extrabold tracking-tight text-[#212529]">
                  Đăng nhập
                </h2>
                <p className="mt-1.5 text-sm text-[#868E96] font-medium">
                  Dành cho nhân viên nhà hàng
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {error ? <ErrorBanner message={error} /> : null}

                {/* Mã nhà hàng - Ẩn nếu đã lưu */}
                {showRestaurantField ? (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="restaurantCode"
                      className="text-sm font-semibold text-[#212529]"
                    >
                      Mã nhà hàng
                    </label>
                    <Input
                      id="restaurantCode"
                      placeholder="VD: NH001 (Để trống nếu là Quản trị nền tảng)"
                      autoComplete="organization"
                      value={restaurantCode}
                      onChange={(e) => {
                        setRestaurantCode(e.target.value)
                        setError(null)
                      }}
                      disabled={isSubmitting}
                      className="h-11 rounded-xl border-neutral-200 bg-white px-3.5 text-sm transition-colors focus:border-[#F0522B] focus:ring-1 focus:ring-[#F0522B]"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      💡 Quản trị nền tảng không cần nhập mã nhà hàng
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-neutral-500 mb-0.5">
                          Đăng nhập vào
                        </p>
                        <p className="text-sm font-semibold text-[#212529] truncate">
                          Mã nhà hàng: {restaurantCode}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleChangeRestaurant}
                        className="ml-3 shrink-0 text-xs font-medium text-[#F0522B] hover:underline"
                      >
                        Đổi
                      </button>
                    </div>
                  </div>
                )}

                {/* Email hoặc số điện thoại */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="username"
                    className="text-sm font-semibold text-[#212529]"
                  >
                    Tên đăng nhập
                  </label>
                  <Input
                    id="username"
                    placeholder="Nhập tên đăng nhập"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      setError(null)
                    }}
                    disabled={isSubmitting}
                    className="h-11 rounded-xl border-neutral-200 bg-white px-3.5 text-sm transition-colors focus:border-[#F0522B] focus:ring-1 focus:ring-[#F0522B]"
                  />
                </div>

                {/* Mật khẩu */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-[#212529]"
                  >
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setError(null)
                      }}
                      disabled={isSubmitting}
                      className="h-11 rounded-xl border-neutral-200 bg-white px-3.5 pr-10 text-sm transition-colors focus:border-[#F0522B] focus:ring-1 focus:ring-[#F0522B]"
                      onKeyDown={(e) => {
                        // Enter để submit
                        if (e.key === "Enter" && !isSubmitting) {
                          handleSubmit(e as any)
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors"
                      tabIndex={-1}
                      title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Hàng tiện ích: Ghi nhớ đăng nhập & Quên mật khẩu */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none group">
                    <Checkbox
                      id="rememberMe"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                      className="size-4 rounded-md data-[state=checked]:bg-[#F0522B] data-[state=checked]:border-[#F0522B]"
                    />
                    <span className="text-sm text-neutral-600 font-normal group-hover:text-neutral-900 transition-colors">
                      Ghi nhớ đăng nhập
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => navigate(AUTH_PATHS.FORGOT_PASSWORD)}
                    className="text-sm font-medium text-[#F0522B] hover:underline transition-all"
                    tabIndex={-1}
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                {/* Nút Đăng nhập */}
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[#F0522B] text-base font-semibold text-white shadow-sm hover:bg-[#D8431F] transition-all mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>

                {/* Chú thích vai trò */}
                <p className="text-xs text-neutral-400 text-center leading-relaxed pt-2">
                  Tài khoản do quản lý cấp theo vai trò (Chủ nhà hàng · Quản lý chi nhánh · Thu ngân · Phục vụ).
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
