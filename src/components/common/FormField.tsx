import * as React from "react"
import { cn } from "@/lib/utils"

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode
  helperText?: string
  error?: string
  required?: boolean
  htmlFor?: string
  disabled?: boolean
}

/**
 * FormField — khớp component "Form Field" trong UI Component (Figma):
 * Bọc field nhập liệu với Label ("Nhãn trường" - font Be Vietnam Pro SemiBold),
 * Helper text ("Tên hiển thị trên thực đơn") hoặc Error message ("Tên món không được để trống" - text-status-danger).
 */
export function FormField({
  label,
  helperText,
  error,
  required,
  htmlFor,
  disabled,
  children,
  className,
  ...props
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", disabled && "opacity-60", className)} {...props}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="block text-xs font-semibold text-text-primary select-none"
        >
          {label}
          {required ? <span className="ml-1 text-status-danger">*</span> : null}
        </label>
      ) : null}

      <div>{children}</div>

      {error ? (
        <p className="text-xs text-status-danger">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-text-tertiary">{helperText}</p>
      ) : null}
    </div>
  )
}
