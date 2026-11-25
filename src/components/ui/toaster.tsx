import { CheckIcon, AlertTriangleIcon, XIcon, InfoIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

const DEFAULT_ICON: Record<string, React.ReactNode> = {
  success: <CheckIcon className="size-4" />,
  warning: <AlertTriangleIcon className="size-4" />,
  danger: <XIcon className="size-4" />,
  info: <InfoIcon className="size-4" />,
}

/** Toaster — đặt 1 lần ở App root, render mọi toast gọi bằng `toast()`. */
export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, icon, variant, replaceKey, ...props }) => (
        <Toast
          key={id}
          variant={variant}
          icon={icon ?? DEFAULT_ICON[variant ?? "default"]}
          className={replaceKey ? "motion-safe:data-[state=open]:animate-none" : undefined}
          {...props}
        >
          {title ? <ToastTitle>{title}</ToastTitle> : null}
          {description ? <ToastDescription>{description}</ToastDescription> : null}
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
