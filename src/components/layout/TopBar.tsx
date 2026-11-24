import type { ReactNode } from "react"
import { useAuthStore } from "@/stores/auth.store"

interface TopBarProps {
  /** Tiêu đề trang hiện tại, VD "Sơ đồ bàn". Mỗi page tự truyền vào, TopBar không tự đoán từ route. */
  title: string
  /** Mô tả phụ ngắn dưới tiêu đề (tuỳ chọn), VD "Chi nhánh Quận 1". */
  description?: string
  /** Vùng hành động bên phải — nút "Thêm mới", ô tìm kiếm... tuỳ page. */
  actions?: ReactNode
}

/**
 * TopBar — thanh trên cùng của StaffLayout, dùng chung cho mọi trang nhân
 * viên. Không tự lấy title từ route (tránh phụ thuộc ngược vào router), page
 * nào cũng phải truyền `title` khi dùng.
 */
export function TopBar({ title, description, actions }: TopBarProps) {
  const branchId = useAuthStore((s) => s.branchId)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
        {description ? (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {actions}
        {branchId ? (
          <span className="hidden rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline-block">
            Chi nhánh #{branchId}
          </span>
        ) : null}
      </div>
    </header>
  )
}
