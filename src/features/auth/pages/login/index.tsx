/**
 * Đăng nhập
 * Layout 2 cột: Banner thương hiệu bên trái & Form đăng nhập bên phải (kèm trường Mã nhà hàng)
 *
 * Luồng thật (Phase 5):
 * 1. `POST /auth/login` với `restaurantCode, username, password` → nhận
 *    `accessToken/accountId/restaurantId/username/fullName/roles` và cookie phiên.
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
import { logout, useLoginMutation } from "@/api/auth.api"
import { getAccount } from "@/api/accounts.api"
import { getAssignmentsByAccount } from "@/api/assignments.api"
import { getErrorMessage, isApiStatus } from "@/lib/http"
import { clearTokens, setAccessToken } from "@/lib/auth-token"
import { useAuthStore } from "@/stores/auth.store"
import { mapRoleCodeToAppRole, APP_ROLE_LABEL, APP_ROLE, type AppRole } from "@/config/roles"
import { resolvePostLoginTarget } from "@/app/router/post-login-target"
import type { Account, Assignment } from "@/types/models"
import "./login.css"

/** 1 lựa chọn hiển thị ở bước chọn vai trò/chi nhánh — gắn liền 1 Assignment cụ thể. */
interface AssignmentChoice {
  assignment: Assignment
  role: AppRole
  includesWaiter?: boolean
}

type LoginField = "restaurantCode" | "username" | "password"
type LoginErrors = Partial<Record<LoginField | "form", string>>

const LOCKED_ACCOUNT = "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ."

function LoginBrand({
  className,
  showDescriptor = false,
}: {
  className: string
  showDescriptor?: boolean
}) {
  return (
    <div className={className}>
      <img
        src="/tt-pos-favicon.png"
        alt="T&T POS"
        width={112}
        height={112}
        className="size-16 shrink-0 lg:size-[72px]"
      />
      {showDescriptor && (
        <span className="text-base font-semibold xl:text-lg">Phần mềm POS nhà hàng</span>
      )}
    </div>
  )
}

function InlineError({ id, message }: { id: string; message?: string }) {
  if (!message) return null

  return (
    <p id={id} role="alert" className="login-error text-sm font-medium">
      {message}
    </p>
  )
}

function getLoginErrors(error: unknown, platform: boolean, sessionCreated: boolean): LoginErrors {
  if (isApiStatus(error, 0)) {
    return { form: "Không kết nối được với máy chủ. Vui lòng kiểm tra mạng và thử lại." }
  }
  if (isApiStatus(error, 502, 503, 504)) {
    return { form: "Máy chủ tạm thời không phản hồi. Vui lòng thử lại sau." }
  }

  const message = getErrorMessage(error)
  if (/tài khoản.*(?:khóa|khoá|vô hiệu hóa|vô hiệu hoá)/i.test(message)) {
    return { form: LOCKED_ACCOUNT }
  }
  if (!sessionCreated && /sai.*mật khẩu/i.test(message)) {
    return {
      password: platform ? message : "Sai mã nhà hàng, tên đăng nhập hoặc mật khẩu.",
    }
  }
  if (!sessionCreated && !platform && /mã nhà hàng/i.test(message)) {
    return { restaurantCode: message }
  }
  return { form: message }
}

async function discardLogin() {
  clearTokens()
  await logout().catch(() => {
    // A new login can replace the cookie if the server is temporarily unreachable.
  })
}

export default function LoginPage({ platform = false }: { platform?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((s) => s.setSession)
  const loginMutation = useLoginMutation()
  const rememberKey = platform ? "platform_remember_login" : "remember_login"
  const usernameKey = platform ? "platform_saved_username" : "saved_username"

  const [restaurantCode, setRestaurantCode] = React.useState(() => {
    return localStorage.getItem("saved_restaurant_code")?.trim().toUpperCase() || ""
  })
  const [username, setUsername] = React.useState(() => {
    return localStorage.getItem(usernameKey) || ""
  })
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [capsLock, setCapsLock] = React.useState(false)
  const [rememberMe, setRememberMe] = React.useState(() => {
    return localStorage.getItem(rememberKey) === "true"
  })
  const [errors, setErrors] = React.useState<LoginErrors>({})
  const [isResolving, setIsResolving] = React.useState(false)
  const initialField = React.useRef<LoginField>(
    platform || restaurantCode ? "username" : "restaurantCode",
  )

  // Bước 2 (chỉ xuất hiện khi tài khoản có >1 Assignment hợp lệ)
  const [pendingAccount, setPendingAccount] = React.useState<Account | null>(null)
  const [choices, setChoices] = React.useState<AssignmentChoice[] | null>(null)

  const redirectTarget = (location.state as { from?: Location } | null)?.from

  function finalizeSession(account: Account, choice: AssignmentChoice) {
    if (!platform) localStorage.setItem("saved_restaurant_code", restaurantCode.trim())
    if (rememberMe) {
      localStorage.setItem(rememberKey, "true")
      localStorage.setItem(usernameKey, username.trim())
    } else {
      localStorage.removeItem(rememberKey)
      localStorage.removeItem(usernameKey)
    }

    setSession({
      account,
      role: choice.role,
      branchId: choice.assignment.branchId ?? null,
      assignmentId: choice.assignment.id,
    })
    // Đích sau đăng nhập phải hợp lệ với vai trò VỪA CHỌN, không chỉ là trang cũ —
    // xem resolvePostLoginTarget. Dùng chung cho cả luồng 1 phân công và luồng chọn
    // phân công, vì cả hai đều đi qua finalizeSession.
    navigate(resolvePostLoginTarget(choice.role, redirectTarget), { replace: true })
  }

  function clearFieldError(field: LoginField) {
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      form: undefined,
    }))
  }

  function handlePasswordKey(event: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isSubmitting) return

    const validation: LoginErrors = {}
    if (!platform && !restaurantCode.trim())
      validation.restaurantCode = "Vui lòng nhập mã nhà hàng."
    if (!username.trim()) validation.username = "Vui lòng nhập tên đăng nhập."
    if (!password) validation.password = "Vui lòng nhập mật khẩu."

    setErrors(validation)
    const firstInvalid = (["restaurantCode", "username", "password"] as const).find(
      (field) => validation[field],
    )
    if (firstInvalid) {
      e.currentTarget.querySelector<HTMLInputElement>(`#${firstInvalid}`)?.focus()
      return
    }

    let sessionCreated = false
    setIsResolving(true)
    try {
      const loginRes = await loginMutation.mutateAsync({
        restaurantCode: platform ? null : restaurantCode.trim(),
        username: username.trim(),
        password,
        deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      })
      sessionCreated = true

      const hasPlatformRole = loginRes.roles?.includes(APP_ROLE.PLATFORM_ADMIN)
      const isRestaurantAccount = loginRes.restaurantId != null
      if (platform ? !hasPlatformRole || isRestaurantAccount : !isRestaurantAccount) {
        await discardLogin()
        setErrors({ form: "Tài khoản không thuộc cổng đăng nhập này." })
        return
      }

      setAccessToken(loginRes.accessToken, loginRes.accountId)

      // `LoginResponse` không có branchId/employeeCode/status — lấy thêm từ 2 API sau.
      const [account, assignments] = await Promise.all([
        getAccount(loginRes.accountId),
        getAssignmentsByAccount(loginRes.accountId),
      ])

      if (account.status === "INACTIVE") {
        await discardLogin()
        setErrors({ form: LOCKED_ACCOUNT })
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
        await discardLogin()
        setErrors({
          form: "Tài khoản chưa được phân vai trò hợp lệ. Vui lòng liên hệ quản trị viên nhà hàng.",
        })
        return
      }

      if (validChoices.length === 1) {
        finalizeSession(account, validChoices[0])
        return
      }

      // Nhiều Assignment (nhiều vai trò và/hoặc nhiều chi nhánh) → để người dùng tự chọn.
      setPendingAccount(account)
      setChoices(validChoices)
    } catch (err) {
      if (sessionCreated) await discardLogin()
      setErrors(getLoginErrors(err, platform, sessionCreated))
    } finally {
      setIsResolving(false)
    }
  }

  function handleChooseAssignment(choice: AssignmentChoice) {
    if (!pendingAccount) return
    finalizeSession(pendingAccount, choice)
  }

  async function handleBackToCredentials() {
    await discardLogin()
    setChoices(null)
    setPendingAccount(null)
  }

  const isSubmitting = loginMutation.isPending || isResolving

  return (
    <main className={`login-page ${platform ? "login-page--platform" : ""}`} lang="vi">
      <aside className="login-brand-panel">
        <LoginBrand className="flex items-center gap-3" showDescriptor />
        <div>
          <p className="login-brand-title text-balance">
            {platform ? "Quản trị nền tảng" : "Hệ thống quản lý nhà hàng & gọi món QR"}
          </p>
          {platform ? (
            <p className="mt-6 text-base leading-relaxed xl:text-lg">
              Quản lý nhà hàng trên T&amp;T POS và tra cứu nhật ký hệ thống.
            </p>
          ) : (
            <ul className="mt-6 list-disc space-y-2 pl-5 text-base leading-relaxed xl:text-lg">
              <li>Quản lý bàn và gọi món bằng mã QR</li>
              <li>Điều phối bếp và chế biến theo thời gian thực</li>
              <li>Khuyến mãi, thực đơn và báo cáo doanh thu</li>
            </ul>
          )}
        </div>
        <p className="text-sm"></p>
      </aside>

      <section className="login-form-panel" aria-labelledby="login-title">
        <LoginBrand className="login-mobile-brand" />
        <div className="login-card">
          {choices && pendingAccount ? (
            <div className="space-y-6">
              <div>
                <h1 id="login-title" className="login-title">
                  Chọn vai trò đăng nhập
                </h1>
                <p className="login-muted mt-2 text-sm">
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
            <>
              <header className="mb-6">
                <h1 id="login-title" className="login-title">
                  {platform ? "Đăng nhập quản trị nền tảng" : "Đăng nhập"}
                </h1>
                <p className="login-muted mt-1.5 flex items-center gap-2 text-sm">
                  {platform && <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />}
                  {platform ? "Dành cho quản trị viên hệ thống" : "Dành cho nhân viên nhà hàng"}
                </p>
              </header>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {!platform && (
                  <div className="space-y-1.5">
                    <label htmlFor="restaurantCode" className="block text-sm font-semibold">
                      Mã nhà hàng
                    </label>
                    <Input
                      id="restaurantCode"
                      name="restaurantCode"
                      placeholder="VD: NH001"
                      required
                      autoComplete="organization"
                      autoCapitalize="characters"
                      autoFocus={initialField.current === "restaurantCode"}
                      spellCheck={false}
                      value={restaurantCode}
                      onChange={(event) => {
                        setRestaurantCode(event.target.value.toUpperCase())
                        clearFieldError("restaurantCode")
                      }}
                      aria-invalid={Boolean(errors.restaurantCode)}
                      aria-describedby={errors.restaurantCode ? "restaurant-code-error" : undefined}
                      disabled={isSubmitting}
                      className="login-input"
                    />
                    <InlineError id="restaurant-code-error" message={errors.restaurantCode} />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="username" className="block text-sm font-semibold">
                    Tên đăng nhập
                  </label>
                  <Input
                    id="username"
                    name="username"
                    placeholder="Nhập tên đăng nhập"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    autoFocus={initialField.current === "username"}
                    spellCheck={false}
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value)
                      clearFieldError("username")
                    }}
                    aria-invalid={Boolean(errors.username)}
                    aria-describedby={errors.username ? "username-error" : undefined}
                    disabled={isSubmitting}
                    className="login-input"
                  />
                  <InlineError id="username-error" message={errors.username} />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-semibold">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu"
                      required
                      autoComplete="current-password"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        clearFieldError("password")
                      }}
                      onKeyDown={handlePasswordKey}
                      onKeyUp={handlePasswordKey}
                      onBlur={() => setCapsLock(false)}
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={
                        [
                          errors.password && "password-error",
                          errors.form && "login-error",
                          capsLock && "caps-lock-warning",
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                      disabled={isSubmitting}
                      className="login-input login-input--password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="login-password-toggle"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      disabled={isSubmitting}
                    >
                      {showPassword ? (
                        <EyeOff aria-hidden="true" className="size-5" />
                      ) : (
                        <Eye aria-hidden="true" className="size-5" />
                      )}
                    </button>
                  </div>
                  <InlineError id="password-error" message={errors.password} />
                  <InlineError id="login-error" message={errors.form} />
                  {capsLock && (
                    <p id="caps-lock-warning" role="status" className="login-muted text-sm">
                      Caps Lock đang bật.
                    </p>
                  )}
                </div>

                <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    disabled={isSubmitting}
                    className="login-remember"
                  />
                  Ghi nhớ đăng nhập
                </label>

                <Button type="submit" className="login-submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 aria-hidden="true" className="size-5 motion-safe:animate-spin" />
                  )}
                  {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>
              </form>
              <span role="status" className="sr-only">
                {isSubmitting ? "Đang đăng nhập..." : ""}
              </span>

              {!platform && (
                <p className="login-muted mt-5 text-center text-sm leading-relaxed">
                  Quên mật khẩu? Hãy liên hệ quản lý chi nhánh để được cấp lại.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}
