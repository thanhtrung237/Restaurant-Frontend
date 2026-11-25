import { Banknote, QrCode } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui/button"

type MethodAction = Pick<ButtonProps, "onClick" | "disabled" | "aria-describedby">

interface PaymentMethodButtonsProps {
  selected: "CASH" | "BANK_TRANSFER"
  cash?: MethodAction
  transfer?: MethodAction
}

const methodClass =
  "h-auto min-h-12 min-w-0 gap-1 border border-border-default bg-surface-card px-1.5 py-2 text-center text-xs leading-tight whitespace-nowrap transition-none hover:border-border-strong hover:bg-surface-muted aria-pressed:border-brand-primary aria-pressed:bg-brand-primary-subtle disabled:bg-surface-muted disabled:text-text-tertiary [&_svg]:size-3.5 @min-[21rem]/payment-methods:gap-1.5 @min-[21rem]/payment-methods:px-2 @min-[21rem]/payment-methods:text-sm @min-[21rem]/payment-methods:[&_svg]:size-4"

export function PaymentMethodButtons({ selected, cash, transfer }: PaymentMethodButtonsProps) {
  return (
    <div
      role="group"
      aria-label="Phương thức thanh toán"
      className="@container/payment-methods mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,8.75rem),1fr))] items-stretch gap-2"
    >
      <Button
        type="button"
        variant="secondary"
        className={methodClass}
        aria-pressed={selected === "CASH"}
        {...cash}
      >
        <Banknote aria-hidden="true" />
        <span>Tiền mặt</span>
      </Button>
      <Button
        type="button"
        variant="secondary"
        className={methodClass}
        aria-pressed={selected === "BANK_TRANSFER"}
        {...transfer}
      >
        <QrCode aria-hidden="true" />
        <span>Chuyển khoản QR</span>
      </Button>
    </div>
  )
}
