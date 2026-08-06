import { Outlet } from "react-router-dom"

/** Layout cho luồng đăng nhập — không sidebar, dùng chung cho mọi vai trò nhân viên */
export default function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      <Outlet />
    </div>
  )
}
