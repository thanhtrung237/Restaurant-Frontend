/**
 * Đổi mật khẩu lần đầu
 * Nguồn: Desktop / Đổi mật khẩu lần đầu
 *
 * Trang này xuất hiện khi tài khoản mới được tạo với mật khẩu tạm, bắt buộc đổi
 * mật khẩu trước khi vào hệ thống. Backend hiện CHƯA có cơ chế flag "must change password"
 * trong Account model, nên trang này là placeholder cho tương lai.
 *
 * API sử dụng: `PUT /accounts/{id}/change-password` với oldPassword + newPassword.
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { AuthCard } from "@/features/auth/components/AuthCard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useChangePassword } from "@/api/accounts.api"
import { getErrorMessage } from "@/lib/http"
import { useAuthStore } from "@/stores/auth.store"
import { AUTH_PATHS } from "@/app/router/paths"
import { useToast } from "@/hooks/use-toast"

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-status-danger/20 bg-status-danger-subtle px-3.5 py-2.5 text-sm text-status-danger">
      {message}
    </div>
  )
}

export default function FirstLoginPasswordPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const account = useAuthStore((s) => s.account)
  const clearSession = useAuthStore((s) => s.clearSession)
  const changePasswordMutation = useChangePassword()

  const [oldPassword, setOldPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showOld, setShowOld] = React.useState(false)
  const [showNew, setShowNew] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Nếu chưa đăng nhập, về trang login
  React.useEffect(() => {
    if (!account) {
      navigate(AUTH_PATHS.LOGIN, { replace: true })
    }
  }, [account, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ các trường.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới và xác nhận mật khẩu không khớp.")
      return
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.")
      return
    }

    if (!account) return

    try {
      await changePasswordMutation.mutateAsync({
        id: account.id,
        oldPassword,
        newPassword,
      })

      toast({
        title: "Đổi mật khẩu thành công",
        description: "Vui lòng đăng nhập lại với mật khẩu mới.",
      })

      // Đăng xuất và quay về trang đăng nhập
      clearSession()
      navigate(AUTH_PATHS.LOGIN, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const isSubmitting = changePasswordMutation.isPending

  if (!account) return null

  return (
    <AuthCard
      title="Đổi mật khẩu lần đầu"
      subtitle={`Xin chào ${account.fullName}, vui lòng đổi mật khẩu để tiếp tục`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <ErrorBanner message={error} /> : null}

        <div className="space-y-1.5">
          <label htmlFor="oldPassword" className="text-sm font-medium text-text-primary">
            Mật khẩu hiện tại
          </label>
          <div className="relative">
            <Input
              id="oldPassword"
              type={showOld ? "text" : "password"}
              placeholder="Mật khẩu tạm được cấp"
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              disabled={isSubmitting}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowOld((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-text-tertiary hover:text-text-primary"
              tabIndex={-1}
            >
              {showOld ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="text-sm font-medium text-text-primary">
            Mật khẩu mới
          </label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNew ? "text" : "password"}
              placeholder="Tối thiểu 6 ký tự"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-text-tertiary hover:text-text-primary"
              tabIndex={-1}
            >
              {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-text-primary">
            Xác nhận mật khẩu mới
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-text-tertiary hover:text-text-primary"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSubmitting ? "Đang xử lý..." : "Đổi mật khẩu"}
        </Button>
      </form>
    </AuthCard>
  )
}
