import { Check, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useBranchSwitcher, type BranchChoice } from "@/features/auth/hooks/useBranchSwitcher"

type BranchSwitcherVariant = "full" | "chip"

export interface BranchSwitcherProps {
  /**
   * "full" — dùng trong Sidebar desktop: hiện tên chi nhánh đầy đủ + mũi tên.
   * "chip" — dùng trong SidebarRail và MobileHeader: chỉ hiện nhãn ngắn ("Q1 ▾").
   */
  variant?: BranchSwitcherVariant
  className?: string
}

/**
 * Menu "Chuyển chi nhánh" (Figma "Menu · Chuyển chi nhánh").
 *
 * Danh sách lấy từ CÁC PHÂN CÔNG của tài khoản đang đăng nhập, không phải toàn bộ chi
 * nhánh của nhà hàng (BR-18). Dòng phụ mỗi mục là TÊN VAI TRÒ của phân công đó — cố ý
 * không hiện "N bàn · Đang mở" như Figma vì dữ liệu đó không có trong Assignment và
 * không đáng gọi thêm API chỉ để hiển thị.
 *
 * Tài khoản chỉ có 1 phân công: hiển thị tĩnh, không mở được dropdown (FR-ADM-04).
 */
export function BranchSwitcher({ variant = "full", className }: BranchSwitcherProps) {
  const { choices, activeChoice, canSwitch, switchTo } = useBranchSwitcher()

  if (!activeChoice) return null

  const label = variant === "chip" ? activeChoice.shortName : activeChoice.name

  if (!canSwitch) {
    return (
      <span
        className={cn(
          variant === "chip"
            ? "inline-flex items-center rounded-full bg-brand-primary-subtle px-2.5 py-1 text-xs font-bold text-brand-primary"
            : "truncate text-xs text-text-tertiary",
          className,
        )}
        title={activeChoice.name}
      >
        {label}
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Chi nhánh hiện tại: ${activeChoice.name}. Bấm để chuyển chi nhánh`}
          title="Chuyển chi nhánh"
          className={cn(
            "inline-flex cursor-pointer items-center gap-1 transition-colors",
            variant === "chip"
              ? "rounded-full bg-brand-primary-subtle px-2.5 py-1 text-xs font-bold text-brand-primary hover:bg-brand-primary-subtle/70"
              : "min-w-0 text-xs text-text-tertiary hover:text-text-primary",
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="left" className="w-64">
        <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
          Chuyển chi nhánh
        </p>
        {choices.map((choice) => (
          <BranchSwitcherRow
            key={choice.assignmentId}
            choice={choice}
            isActive={choice.assignmentId === activeChoice.assignmentId}
            onSelect={() => switchTo(choice)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BranchSwitcherRow({
  choice,
  isActive,
  onSelect,
}: {
  choice: BranchChoice
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <DropdownMenuItem
      onClick={onSelect}
      className={cn(
        "cursor-pointer gap-3 py-2",
        isActive && "bg-brand-primary-subtle/60",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
          isActive
            ? "bg-brand-primary text-text-on-brand"
            : "bg-surface-muted text-text-secondary",
        )}
      >
        {choice.shortName}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm font-semibold",
            isActive ? "text-brand-primary" : "text-text-primary",
          )}
        >
          {choice.name}
        </span>
        {choice.roleLabel ? (
          <span className="block truncate text-xs text-text-tertiary">
            {choice.roleLabel}
          </span>
        ) : null}
      </span>
      {isActive ? <Check className="size-4 shrink-0 text-brand-primary" /> : null}
    </DropdownMenuItem>
  )
}
