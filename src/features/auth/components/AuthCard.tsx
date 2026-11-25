import type { ReactNode } from "react"

/**
 * Khung card dùng chung cho 3 trang Auth (Đăng nhập / Quên mật khẩu / Đổi mật khẩu
 * lần đầu) — logo thương hiệu + tiêu đề + phụ đề, đặt giữa màn hình.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-surface-page px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-primary shadow-xs">
            <span className="text-xl font-extrabold text-text-on-brand">P</span>
          </div>
          <h1 className="text-xl font-bold text-text-primary">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-text-tertiary">{subtitle}</p> : null}
        </div>

        <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-xs">
          {children}
        </div>

        {footer ? (
          <div className="mt-5 text-center text-sm text-text-tertiary">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
