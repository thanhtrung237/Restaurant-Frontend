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
      className={cn(
        "fixed top-0 z-100 flex max-h-screen w-full flex-col-reverse p-4 sm:top-auto sm:right-0 sm:bottom-0 sm:flex-col md:max-w-[420px]",
        className,
      )}
      {...props}
    />
  )
}

/**
 * Toast — khớp component "Toast" trong Figma: khung bo góc rounded-md, viền
 * và icon đổi màu theo variant (success/warning/danger/info), nút X ở góc.
 */
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-md border bg-surface-card p-4 shadow-md transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
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
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            ICON_DOT_CLASS[variant ?? "default"],
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className="flex-1 space-y-1">{props.children}</div>
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
        "absolute top-3 right-3 rounded-md p-1 text-text-tertiary opacity-70 transition-opacity hover:text-text-primary hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/30",
        className,
      )}
      toast-close=""
      {...props}
    >
      <XIcon className="size-4" />
    </ToastPrimitives.Close>
  )
}

function ToastTitle({ className, ...props }: React.ComponentProps<typeof ToastPrimitives.Title>) {
  return (
    <ToastPrimitives.Title
      className={cn("text-sm font-semibold text-text-primary", className)}
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
      className={cn("text-sm text-text-tertiary", className)}
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
