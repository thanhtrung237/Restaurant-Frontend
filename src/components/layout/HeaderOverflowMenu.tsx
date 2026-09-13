import * as React from "react"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface OverflowMenuAction {
  key: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onSelect: () => void
  disabled?: boolean
  /** "warning" / "danger" tô màu theo token trạng thái, dùng cho thao tác cần cân nhắc. */
  tone?: "default" | "warning" | "danger"
}

export interface HeaderOverflowMenuProps {
  actions: OverflowMenuAction[]
  /** Nhãn trợ năng của nút "⋯". */
  label?: string
  className?: string
}

const TONE_CLASS: Record<NonNullable<OverflowMenuAction["tone"]>, string> = {
  default: "",
  warning: "text-status-warning",
  danger: "text-status-danger",
}

/**
 * Menu "⋯" trên header nội dung — nơi chứa các thao tác PHỤ của một màn ở <md.
 *
 * Quy ước phân bổ nút khi thu hẹp màn hình:
 *  - Hành động CHÍNH  → `StickyActionBar` ở đáy.
 *  - Hành động TẠO MỚI → FAB.
 *  - Hành động PHỤ    → menu này.
 * Không thao tác nào được phép biến mất: mọi chức năng đặc tả yêu cầu phải nằm ở một
 * trong ba chỗ trên.
 *
 * Truyền qua `usePageHeader({ headerActions: ... })` nên PHẢI memo hoá ở nơi gọi.
 * Tự ẩn khi `actions` rỗng — nhờ vậy nơi gọi lọc quyền bằng cách bỏ phần tử khỏi mảng mà
 * không cần tự kiểm tra có còn thao tác nào không.
 */
export function HeaderOverflowMenu({
  actions,
  label = "Thao tác khác",
  className,
}: HeaderOverflowMenuProps) {
  if (actions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-secondary transition-colors hover:bg-border-strong",
            className,
          )}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="right" className="w-56">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <DropdownMenuItem
              key={action.key}
              disabled={action.disabled}
              onClick={action.onSelect}
              className={cn(
                "cursor-pointer gap-2.5",
                TONE_CLASS[action.tone ?? "default"],
              )}
            >
              {Icon ? <Icon className="size-4" /> : null}
              <span>{action.label}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
