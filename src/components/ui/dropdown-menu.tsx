import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuContextValue {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null)

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={menuRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuTrigger({
  children,
  asChild,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const ctx = React.useContext(DropdownMenuContext)
  if (!ctx) throw new Error("DropdownMenuTrigger must be inside DropdownMenu")

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      onClick?: (e: React.MouseEvent) => void
      className?: string
    }>
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e)
        ctx.setOpen((prev) => !prev)
      },
      className: cn(child.props.className, className),
    })
  }

  return (
    <button
      type="button"
      onClick={() => ctx.setOpen((prev) => !prev)}
      className={cn("outline-none", className)}
      {...props}
    >
      {children}
    </button>
  )
}

export function DropdownMenuContent({
  children,
  className,
  align = "right",
  side = "bottom",
}: {
  children: React.ReactNode
  className?: string
  align?: "left" | "right" | "center"
  side?: "top" | "bottom" | "auto"
}) {
  const ctx = React.useContext(DropdownMenuContext)
  if (!ctx) throw new Error("DropdownMenuContent must be inside DropdownMenu")

  const [actualSide, setActualSide] = React.useState<"top" | "bottom">(
    side === "top" ? "top" : "bottom",
  )
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    if (side === "top") {
      setActualSide("top")
    } else if (side === "auto" && contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect()
      const overflowParent = contentRef.current.closest(
        ".overflow-x-auto, .overflow-y-auto, .overflow-hidden",
      )
      if (overflowParent) {
        const parentRect = overflowParent.getBoundingClientRect()
        if (rect.bottom > parentRect.bottom - 10) {
          setActualSide("top")
          return
        }
      }
      if (rect.bottom > window.innerHeight - 20) {
        setActualSide("top")
      } else {
        setActualSide("bottom")
      }
    } else {
      setActualSide("bottom")
    }
  }, [ctx.open, side])

  if (!ctx.open) return null

  const alignClass =
    align === "left" ? "left-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "right-0"

  const sideClass = actualSide === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-50 min-w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl text-gray-800",
        "animate-in fade-in-0 zoom-in-95",
        alignClass,
        sideClass,
        className,
      )}
    >
      {children}
    </div>
  )
}

export interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "danger"
  icon?: React.ReactNode
}

export function DropdownMenuItem({
  children,
  className,
  variant = "default",
  icon,
  onClick,
  ...props
}: DropdownMenuItemProps) {
  const ctx = React.useContext(DropdownMenuContext)

  return (
    <button
      type="button"
      onClick={(e) => {
        ctx?.setOpen(false)
        onClick?.(e)
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none",
        variant === "default"
          ? "text-text-primary hover:bg-surface-muted"
          : "text-status-danger hover:bg-status-danger-subtle",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("-mx-1.5 my-1 h-px bg-border-default", className)} />
}
