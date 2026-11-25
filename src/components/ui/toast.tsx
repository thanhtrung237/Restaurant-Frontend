import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitives.Viewport>) {
  return (
    <ToastPrimitives.Viewport
      className={cn("toast-viewport fixed z-100 grid", className)}
      {...props}
    />
  )
}

/**
 * Toast — khớp component "Toast" trong Figma: khung bo góc rounded-md, viền
 * và icon đổi màu theo variant (success/warning/danger/info), nút X ở góc.
 */
const toastVariants = cva(
  "toast-card group pointer-events-auto relative z-10 flex w-full items-start gap-2.5 overflow-hidden rounded-xl border bg-surface-card py-2.5 pr-9 pl-2.5 shadow-md transition-transform data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[swipe=end]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2",
  {
    variants: {
      variant: {
        default: "border-border-default",
        success: "border-status-success/30",
        warning: "border-status-warning/30",
        danger: "border-status-danger/30",
        info: "border-status-info/30",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

const ICON_DOT_CLASS: Record<string, string> = {
  default: "bg-surface-muted text-text-tertiary",
  success: "bg-status-success-subtle text-status-success",
  warning: "bg-status-warning-subtle text-status-warning",
  danger: "bg-status-danger-subtle text-status-danger",
  info: "bg-status-info-subtle text-status-info",
}

function Toast({
  className,
  variant,
  icon,
  ...props
}: React.ComponentProps<typeof ToastPrimitives.Root> &
  VariantProps<typeof toastVariants> & { icon?: React.ReactNode }) {
  return (
    <ToastPrimitives.Root className={cn(toastVariants({ variant }), className)} {...props}>
      {icon ? (
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg",
            ICON_DOT_CLASS[variant ?? "default"],
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 space-y-0.5 [overflow-wrap:anywhere]">{props.children}</div>
    </ToastPrimitives.Root>
  )
}

function ToastAction({ className, ...props }: React.ComponentProps<typeof ToastPrimitives.Action>) {
  return (
    <ToastPrimitives.Action
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border-default bg-transparent px-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30",
        className,
      )}
      {...props}
    />
  )
}

function ToastClose({ className, ...props }: React.ComponentProps<typeof ToastPrimitives.Close>) {
  return (
    <ToastPrimitives.Close
      className={cn(
        "absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand-primary",
        className,
      )}
      toast-close=""
      aria-label="Đóng thông báo"
      {...props}
    >
      <XIcon aria-hidden="true" className="size-3.5" />
    </ToastPrimitives.Close>
  )
}

function ToastTitle({ className, ...props }: React.ComponentProps<typeof ToastPrimitives.Title>) {
  return (
    <ToastPrimitives.Title
      className={cn("text-sm leading-snug font-semibold text-text-primary", className)}
      {...props}
    />
  )
}

function ToastDescription({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitives.Description>) {
  return (
    <ToastPrimitives.Description
      className={cn("text-xs leading-relaxed text-text-secondary", className)}
      {...props}
    />
  )
}

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastActionElement,
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  toastVariants,
}
