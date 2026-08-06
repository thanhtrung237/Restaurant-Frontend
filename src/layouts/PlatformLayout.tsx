import { Outlet } from "react-router-dom"

/**
 * Layout riêng cho Quản trị nền tảng — tách biệt hoàn toàn với StaffLayout
 * để tránh nhầm lẫn/rò rỉ điều hướng sang dữ liệu kinh doanh của nhà hàng (BR-21).
 */
export default function PlatformLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r bg-sidebar" />
      <div className="flex flex-1 flex-col">
        <header className="h-14 border-b" />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
