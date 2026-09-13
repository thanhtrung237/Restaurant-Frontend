import * as React from "react"
import { usePageHeader } from "@/hooks/use-page-header"
import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  /** Tiêu đề trang. Dùng cho cả header desktop lẫn MobileHeader. */
  title: string
  /**
   * Dòng phụ dưới tiêu đề ở desktop. Nhận ReactNode để chỗ nào cần chèn badge/spinner
   * vẫn dùng được.
   */
  subtitle?: React.ReactNode
  /**
   * Dòng phụ cho MobileHeader. Bỏ trống thì dùng `subtitle` nếu nó là chuỗi —
   * MobileHeader chỉ hiển thị văn bản một dòng nên không nhận được ReactNode.
   */
  mobileSubtitle?: string
  /** Cụm nút/điều khiển bên phải thanh tiêu đề (desktop). */
  actions?: React.ReactNode
  /**
   * Điều khiển riêng của trang trên MobileHeader — bộ lọc phạm vi hoặc menu "⋯".
   * BẮT BUỘC memo hoá ở nơi gọi (so sánh bằng tham chiếu).
   */
  mobileHeaderActions?: React.ReactNode
  /**
   * Hàng tab điều hướng. Figma đặt tab trên một DẢI TRẮNG RIÊNG ngay dưới thanh tiêu đề,
   * cũng có border-bottom — không để trôi trên nền xám của vùng nội dung.
   */
  tabs?: React.ReactNode
  className?: string
}

/**
 * PageHeader — thanh tiêu đề dùng chung cho mọi màn nhân viên ở md+.
 *
 * Cấu trúc theo Figma (bản Desktop của mọi màn quản trị):
 *   [ thanh nền TRẮNG full-width, border-bottom ]  tiêu đề + dòng phụ | cụm nút
 *   [ dải nền TRẮNG full-width, border-bottom ]    hàng tab (nếu có)
 *   [ vùng nội dung nền xám surface-page ]
 *
 * Ở <md toàn bộ thanh này ẩn; tiêu đề/dòng phụ/điều khiển đẩy lên `MobileHeader` của
 * `StaffLayout` qua `usePageHeader` — cơ chế đã có từ trước, component này chỉ gọi hộ để
 * mỗi trang không phải lặp lại hai chỗ khai báo cùng một tiêu đề.
 */
export function PageHeader({
  title,
  subtitle,
  mobileSubtitle,
  actions,
  mobileHeaderActions,
  tabs,
  className,
}: PageHeaderProps) {
  const resolvedMobileSubtitle =
    mobileSubtitle ?? (typeof subtitle === "string" ? subtitle : undefined)

  usePageHeader({
    title,
    subtitle: resolvedMobileSubtitle,
    headerActions: mobileHeaderActions,
  })

  return (
    <div className={cn("hidden md:block", className)}>
      <div className="flex flex-col gap-4 border-b border-border-default bg-surface-card px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {title}
          </h1>
          {subtitle ? (
            <div className="mt-1 text-sm text-text-tertiary">{subtitle}</div>
          ) : null}
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </div>

      {tabs ? (
        <div className="border-b border-border-default bg-surface-card px-6 sm:px-8">
          {tabs}
        </div>
      ) : null}
    </div>
  )
}
