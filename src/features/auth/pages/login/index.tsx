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
import { Eye, EyeOff, Loader2, ChevronRight, ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useLoginMutation } from "@/api/auth.api"
import { getAccount } from "@/api/accounts.api"
import { getAssignmentsByAccount } from "@/api/assignments.api"
import { getErrorMessage } from "@/lib/http"
import { clearTokens, setTokens } from "@/lib/auth-token"
import { useAuthStore } from "@/stores/auth.store"
import { mapRoleCodeToAppRole, APP_ROLE_LABEL, APP_ROLE, type AppRole } from "@/config/roles"
import { resolvePostLoginTarget } from "@/app/router/post-login-target"
import { AUTH_PATHS } from "@/app/router/paths"
import type { Account, Assignment } from "@/types/models"
import brandArtwork from "./tt-pos-brand.png"

/** 1 lựa chọn hiển thị ở bước chọn vai trò/chi nhánh — gắn liền 1 Assignment cụ thể. */
interface AssignmentChoice {
  assignment: Assignment
  role: AppRole
  includesWaiter?: boolean
}

function LoginBrand({ onBanner = false }: { onBanner?: boolean }) {
  return (
    <div
      className={
        onBanner
          ? "relative z-10 flex items-center gap-4 text-white"
          : "mb-6 flex items-center gap-3 text-text-primary lg:hidden"
      }
    >
      <span
        aria-hidden="true"
        className={
          onBanner
            ? "relative size-28 shrink-0 overflow-hidden rounded-[31%]"
            : "relative size-18 shrink-0 overflow-hidden rounded-[31%]"
        }
      >
        <img
          src={brandArtwork}
          alt=""
          width={1536}
          height={1024}
          className="absolute top-[-34.1%] left-[-31.1%] h-auto w-[310.9%] max-w-none"
        />
      </span>
      <span
        className="relative aspect-[626/143] w-36 max-w-full overflow-hidden rounded-[12%] lg:w-48"
        style={{
          maskImage: "radial-gradient(ellipse 72% 105% at center, #000 68%, transparent 100%)",
        }}
      >
        <img
          src={brandArtwork}
          alt="T&T POS"
          width={1536}
          height={1024}
          className="absolute top-[-478%] left-[-14.1%] h-auto w-[245.4%] max-w-none"
        />
      </span>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-status-danger/20 bg-status-danger-subtle px-4 py-3 text-sm text-status-danger font-medium">
      {message}
    </div>
  )
}

export default function LoginPage({ platform = false }: { platform?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((s) => s.setSession)
  const loginMutation = useLoginMutation()
  const rememberKey = platform ? "platform_remember_login" : "remember_login"
  const usernameKey = platform ? "platform_saved_username" : "saved_username"

  const [restaurantCode, setRestaurantCode] = React.useState(() => {
    return localStorage.getItem("saved_restaurant_code") || ""
  })
  const [username, setUsername] = React.useState(() => {
    return localStorage.getItem(usernameKey) || ""
  })
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [rememberMe, setRememberMe] = React.useState(() => {
    return localStorage.getItem(rememberKey) === "true"
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
      localStorage.setItem(rememberKey, "true")
      if (!platform) localStorage.setItem("saved_restaurant_code", restaurantCode.trim())
      localStorage.setItem(usernameKey, username.trim())
    } else {
      localStorage.removeItem(rememberKey)
      if (!platform) localStorage.removeItem("saved_restaurant_code")
      localStorage.removeItem(usernameKey)
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
    if (!platform && !restaurantCode.trim()) {
      setError("Vui lòng nhập mã nhà hàng.")
      return
    }

    try {
      const loginRes = await loginMutation.mutateAsync({
        restaurantCode: platform ? null : restaurantCode.trim(),
        username: username.trim(),
        password,
        deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      })

      const hasPlatformRole = loginRes.roles?.includes(APP_ROLE.PLATFORM_ADMIN)
      const isRestaurantAccount = loginRes.restaurantId != null
      if (platform ? !hasPlatformRole || isRestaurantAccount : !isRestaurantAccount) {
        setError("Tài khoản không thuộc cổng đăng nhập này.")
        return
      }

      setTokens({ accessToken: loginRes.accessToken, refreshToken: loginRes.refreshToken })
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
        .filter(
          (c): c is AssignmentChoice =>
            c !== null && (c.role === APP_ROLE.PLATFORM_ADMIN) === platform,
        )

      const cashierBranches = new Set(
        validChoices
          .filter(({ role }) => role === APP_ROLE.CASHIER)
          .map(({ assignment }) => assignment.branchId)
          .filter((id) => id != null),
      )
      const waiterBranches = new Set(
        validChoices
          .filter(({ role }) => role === APP_ROLE.WAITER)
          .map(({ assignment }) => assignment.branchId)
          .filter((id) => id != null),
      )
      validChoices = validChoices
        .filter(
          ({ role, assignment }) =>
            role !== APP_ROLE.WAITER ||
            assignment.branchId == null ||
            !cashierBranches.has(assignment.branchId),
        )
        .map((choice) =>
          choice.role === APP_ROLE.CASHIER &&
          choice.assignment.branchId != null &&
          waiterBranches.has(choice.assignment.branchId)
            ? { ...choice, includesWaiter: true }
            : choice,
        )

      // Fallback an toàn cho Quản trị nhà hàng (Chủ nhà hàng / Manager) nếu chưa có assignment trong DB
      if (
        !platform &&
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
        setError(
          "Tài khoản chưa được phân vai trò hợp lệ. Vui lòng liên hệ quản trị viên nhà hàng.",
        )
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
    <div className="flex min-h-dvh w-full bg-surface-page">
      {/* -------------------- CỘT TRÁI: BANNER THƯƠNG HIỆU (Desktop) -------------------- */}
      <div
        className={`relative hidden select-none flex-col justify-between overflow-hidden p-12 lg:flex lg:w-[44%] xl:p-16 ${platform ? "bg-slate-950" : "bg-[#712b21] bg-linear-to-br from-[#3e211e] via-[#712b21] to-[#a73723]"}`}
      >
        <LoginBrand onBanner />

        {/* Thông điệp & Giới thiệu hệ thống */}
        <div className="relative z-10 max-w-lg pb-4 xl:pb-10">
          <h1 className="text-4xl leading-[1.18] font-bold tracking-tight text-balance text-white xl:text-[2.625rem] 2xl:text-5xl">
            {platform ? (
              "Quản trị nền tảng"
            ) : (
              <>
                Hệ thống quản lý
                <br />
                nhà hàng & gọi món QR
              </>
            )}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-pretty text-white/85">
            {platform
              ? "Quản lý nhà hàng trên T&T POS và tra cứu nhật ký hệ thống."
              : "Quản lý bàn, chế biến, thực đơn, khuyến mãi và báo cáo"}
          </p>
        </div>

        {/* Hoạ tiết trang trí mờ phía sau */}
        <div className="pointer-events-none absolute -right-40 top-[16%] size-112 rounded-full border border-white/20 shadow-[0_0_0_28px_#ffffff09,0_0_0_56px_#ffffff07,0_0_0_84px_#ffffff05]" />
        <div className="pointer-events-none absolute -right-24 top-[23%] size-80 rounded-full border border-white/10" />
      </div>

      {/* -------------------- CỘT PHẢI: FORM ĐĂNG NHẬP -------------------- */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-3 py-6 sm:px-8 sm:py-10 lg:px-12">
        <div className="w-full max-w-[29rem] rounded-card border border-border-default bg-surface-card px-5 py-7 shadow-sm sm:px-8 sm:py-9">
          <LoginBrand />

          {/* -------------------- BƯỚC 2: CHỌN VAI TRÒ (NẾU CÓ NHIỀU VAI TRÒ) -------------------- */}
          {choices && pendingAccount ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-text-primary">
                  Chọn vai trò đăng nhập
                </h2>
                <p className="mt-2 text-sm text-text-tertiary">
                  Tài khoản{" "}
                  <span className="font-semibold text-[#292723]">{pendingAccount.fullName}</span> có
                  nhiều vai trò — chọn vai trò để tiếp tục:
                </p>
              </div>

              <div className="space-y-3">
                {choices.map((choice) => (
                  <button
                    key={choice.assignment.id}
                    type="button"
                    onClick={() => handleChooseAssignment(choice)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border-default bg-surface-card p-4 text-left transition-colors hover:border-brand-primary hover:bg-brand-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-text-primary">
                        {choice.includesWaiter ? "Thu ngân + Phục vụ" : APP_ROLE_LABEL[choice.role]}
                      </p>
                      <p className="truncate text-xs text-text-tertiary mt-0.5">
                        {choice.assignment.branchName
                          ? `Chi nhánh ${choice.assignment.branchName}`
                          : "Toàn nhà hàng"}
                      </p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-text-tertiary" />
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
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-text-primary">
                  {platform ? "Đăng nhập quản trị nền tảng" : "Đăng nhập"}
                </h2>
                <p className="mt-1.5 flex items-center gap-2 text-sm text-text-tertiary font-medium">
                  {platform && <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />}
                  {platform ? "Dành cho quản trị viên hệ thống" : "Dành cho nhân viên nhà hàng"}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {error ? <ErrorBanner message={error} /> : null}

                {/* Mã nhà hàng - Ẩn nếu đã lưu */}
                {!platform &&
                  (showRestaurantField ? (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="restaurantCode"
                        className="text-sm font-semibold text-text-primary"
                      >
                        Mã nhà hàng
                      </label>
                      <Input
                        id="restaurantCode"
                        placeholder="VD: NH001"
                        required
                        autoComplete="organization"
                        value={restaurantCode}
                        onChange={(e) => {
                          setRestaurantCode(e.target.value)
                          setError(null)
                        }}
                        disabled={isSubmitting}
                        className="h-12 rounded-xl px-3.5 text-base sm:text-sm"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border-default bg-surface-muted p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-neutral-500 mb-0.5">
                            Đăng nhập vào
                          </p>
                          <p className="text-sm font-semibold text-text-primary truncate">
                            Mã nhà hàng: {restaurantCode}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleChangeRestaurant}
                          className="ml-3 shrink-0 text-xs font-medium text-brand-primary hover:underline"
                        >
                          Đổi
                        </button>
                      </div>
                    </div>
                  ))}

                {/* Email hoặc số điện thoại */}
                <div className="space-y-1.5">
                  <label htmlFor="username" className="text-sm font-semibold text-text-primary">
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
                    className="h-12 rounded-xl px-3.5 text-base sm:text-sm"
                  />
                </div>

                {/* Mật khẩu */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-semibold text-text-primary">
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
                      className="h-12 rounded-xl px-3.5 pr-11 text-base sm:text-sm"
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
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none group">
                    <Checkbox
                      id="rememberMe"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                      className="size-4 rounded-md data-[state=checked]:bg-brand-primary data-[state=checked]:border-brand-primary"
                    />
                    <span className="text-sm text-neutral-600 font-normal group-hover:text-neutral-900 transition-colors">
                      Ghi nhớ đăng nhập
                    </span>
                  </label>

                  {!platform && (
                    <button
                      type="button"
                      onClick={() => navigate(AUTH_PATHS.FORGOT_PASSWORD)}
                      className="text-sm font-medium text-brand-primary hover:underline transition-all"
                      tabIndex={-1}
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>

                {/* Nút Đăng nhập */}
                <Button
                  type="submit"
                  className="mt-2 h-12 w-full text-base"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>

                {/* Chú thích vai trò */}
                {!platform && (
                  <p className="pt-2 text-center text-xs leading-relaxed text-text-tertiary">
                    Tài khoản do quản lý cấp theo vai trò (Chủ nhà hàng · Quản lý chi nhánh · Thu
                    ngân · Phục vụ).
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
