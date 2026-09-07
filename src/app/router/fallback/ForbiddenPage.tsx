import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { APP_ROLE_LABEL } from "@/config/roles";
import { ROLE_HOME } from "@/app/router/RoleHomeRedirect";
import { AUTH_PATHS } from "@/app/router/paths";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role);
  const clearSession = useAuthStore((s) => s.clearSession);

  function handleGoHome() {
    if (role && ROLE_HOME[role]) {
      navigate(ROLE_HOME[role], { replace: true });
    } else {
      navigate(AUTH_PATHS.LOGIN, { replace: true });
    }
  }

  function handleLogout() {
    clearSession();
    navigate(AUTH_PATHS.LOGIN, { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center bg-surface-page">
      <h1 className="text-3xl font-bold text-text-primary">403 — Không có quyền truy cập</h1>
      <p className="text-text-tertiary text-sm max-w-md">
        Tài khoản với vai trò <span className="font-semibold text-text-primary">{role ? APP_ROLE_LABEL[role] : "Chưa xác định"}</span> không có quyền truy cập vào trang này.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleGoHome} className="rounded-xl">
          Về trang chủ
        </Button>
        <Button variant="outline" onClick={handleLogout} className="rounded-xl">
          Đăng xuất / Đăng nhập lại
        </Button>
      </div>
    </div>
  );
}