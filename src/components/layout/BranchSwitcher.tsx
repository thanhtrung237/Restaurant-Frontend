import { Check, ChevronDown } from "lucide-react"
import { PopoverClose } from "@radix-ui/react-popover"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  branchChoiceKey,
  useBranchSwitcher,
  type BranchChoice,
} from "@/features/auth/hooks/useBranchSwitcher"

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
 * Quản trị nhà hàng chọn từ danh sách chi nhánh của nhà hàng. Các vai trò khác dùng phân công.
 *
 * Tài khoản chỉ có 1 phân công: hiển thị tĩnh, không mở được dropdown (FR-ADM-04).
 */
export function BranchSwitcher({ variant = "full", className }: BranchSwitcherProps) {
  const {
    choices,
    activeChoice,
    canSwitch,
    switchTo,
    branchListLoading,
    branchListError,
    retryBranchList,
  } = useBranchSwitcher()

  if (!activeChoice) return null

  const label = variant === "chip" ? activeChoice.shortName : activeChoice.name

  if (branchListError && !canSwitch) {
    return (
      <button type="button" className={className} onClick={() => void retryBranchList()}>
        Không tải được chi nhánh. Thử lại
      </button>
    )
  }

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
        {branchListLoading ? "Đang tải chi nhánh…" : label}
      </span>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>

      <PopoverContent
        aria-label="Chuyển chi nhánh"
        align={variant === "chip" ? "end" : "start"}
        sideOffset={6}
        collisionPadding={8}
        className="max-h-[var(--radix-popover-content-available-height)] w-64 max-w-[calc(100vw-16px)] overflow-y-auto rounded-xl border-border-default bg-surface-card p-1.5 shadow-xl"
      >
        <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
          Chuyển chi nhánh
        </p>
        {choices.map((choice) => (
          <BranchSwitcherRow
            key={branchChoiceKey(choice)}
            choice={choice}
            isActive={branchChoiceKey(choice) === branchChoiceKey(activeChoice)}
            onSelect={() => switchTo(choice)}
          />
        ))}
        {branchListError ? (
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-brand-primary hover:bg-surface-muted"
            onClick={() => void retryBranchList()}
          >
            Không tải được chi nhánh. Thử lại
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
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
    <PopoverClose
      type="button"
      aria-current={isActive ? "true" : undefined}
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
        isActive ? "bg-brand-primary-subtle/60" : "hover:bg-surface-muted",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
          isActive ? "bg-brand-primary text-text-on-brand" : "bg-surface-muted text-text-secondary",
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
          <span className="block truncate text-xs text-text-tertiary">{choice.roleLabel}</span>
        ) : null}
      </span>
      {isActive ? (
        <Check aria-hidden="true" className="size-4 shrink-0 text-brand-primary" />
      ) : null}
    </PopoverClose>
  )
}
