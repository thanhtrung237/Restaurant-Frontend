import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Chiều cao BottomNav là `h-16` (64px). Mọi phần tử nổi ở đáy màn hình phải xếp tầng
 * theo các lớp dưới đây để không đè lên nhau:
 *
 *   BottomNav        bottom-0   (h-16)
 *   StickyActionBar  bottom-16  (ngay trên BottomNav)
 *   FAB              bottom-20  khi màn KHÔNG có sticky bar
 *                    bottom-36  khi màn CÓ sticky bar
 */
/** Vị trí FAB ở màn KHÔNG có `StickyActionBar`. */
export const FAB_POSITION_CLASS =
  "fixed bottom-[calc(5rem_+_env(safe-area-inset-bottom))] right-4 z-40 md:hidden"

/** Vị trí FAB ở màn CÓ `StickyActionBar` — nâng lên trên bar. */
export const FAB_ABOVE_BAR_POSITION_CLASS =
  "fixed bottom-[calc(9rem_+_env(safe-area-inset-bottom))] right-4 z-40 md:hidden"

export interface StickyActionBarProps {
  children: React.ReactNode
  className?: string
}

/**
 * Thanh thao tác cố định ở đáy màn hình, CHỈ hiện ở <md.
 *
 * Dùng cho các hành động chính của một màn mà ở PC/Tablet nằm trên thanh tiêu đề hoặc
 * cuối form (vd "Thu tiền & phát hành hóa đơn", "Lưu cấu hình", "Thêm món"). Hành động
 * phụ thì đưa vào `HeaderOverflowMenu` thay vì nhồi hết vào đây.
 *
 * Tự chèn sẵn một khoảng trống cùng chiều cao ngay trước bar, nên trang KHÔNG cần thêm
 * padding đáy thủ công — đặt component này ở cuối phần nội dung là đủ.
 */
export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <>
      {/* Chừa chỗ để nội dung cuối trang không bị bar che khi cuộn hết cỡ. */}
      <div aria-hidden="true" className="h-[76px] md:hidden" />

      <div
        className={cn(
          "fixed bottom-[calc(4rem_+_env(safe-area-inset-bottom))] left-0 right-0 z-30 flex items-center gap-3 border-t border-border-default bg-surface-card px-4 py-3 shadow-[0_-2px_10px_rgba(16,24,40,0.06)] md:hidden",
          className,
        )}
      >
        {children}
      </div>
    </>
  )
}
