/**
 * Quên mật khẩu
 * Nguồn: Desktop / Quên mật khẩu
 *
 * LƯU Ý: Backend KHÔNG có endpoint cho khách tự phục hồi mật khẩu qua email/SMS.
 * Chỉ có endpoint `PUT /accounts/{id}/reset-password` để admin đặt lại mật khẩu hộ.
 * Trang này chỉ hướng dẫn người dùng liên hệ quản trị viên.
 */

import { useNavigate } from "react-router-dom"
import { AuthCard } from "@/features/auth/components/AuthCard"
import { Button } from "@/components/ui/button"
import { AUTH_PATHS } from "@/app/router/paths"

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  return (
    <AuthCard
      title="Quên mật khẩu?"
      subtitle="Liên hệ quản trị viên nhà hàng để được hỗ trợ đặt lại mật khẩu"
    >
      <div className="space-y-4 text-sm text-text-secondary">
        <p>
          Hệ thống hiện không hỗ trợ tự động đặt lại mật khẩu qua email hoặc SMS.
        </p>
        <p>
          Vui lòng liên hệ <span className="font-semibold text-text-primary">Quản trị viên nhà hàng</span> của
          bạn để được hỗ trợ đặt lại mật khẩu.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-6 w-full"
        onClick={() => navigate(AUTH_PATHS.LOGIN)}
      >
        Quay lại đăng nhập
      </Button>
    </AuthCard>
  )
}
