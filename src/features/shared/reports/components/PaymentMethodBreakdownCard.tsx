import * as React from "react"
import { Banknote, QrCode, CreditCard, Wallet, HelpCircle, Receipt } from "lucide-react"
import { formatCurrency, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

interface PaymentMethodBreakdownCardProps {
  revenueByPaymentMethod?: Record<string, string>
  totalRevenue: number
}

interface MethodConfig {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  barColor: string
  badgeBg: string
}

const METHOD_CONFIGS: Record<string, MethodConfig> = {
  CASH: {
    key: "CASH",
    label: "Tiền mặt",
    icon: Banknote,
    iconColor: "text-emerald-600",
    barColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50 text-emerald-700",
  },
  BANK_TRANSFER: {
    key: "BANK_TRANSFER",
    label: "Chuyển khoản QR",
    icon: QrCode,
    iconColor: "text-blue-600",
    barColor: "bg-blue-500",
    badgeBg: "bg-blue-50 text-blue-700",
  },
  CARD: {
    key: "CARD",
    label: "Thẻ thanh toán / POS",
    icon: CreditCard,
    iconColor: "text-violet-600",
    barColor: "bg-violet-500",
    badgeBg: "bg-violet-50 text-violet-700",
  },
  E_WALLET: {
    key: "E_WALLET",
    label: "Ví điện tử",
    icon: Wallet,
    iconColor: "text-amber-600",
    barColor: "bg-amber-500",
    badgeBg: "bg-amber-50 text-amber-700",
  },
}

export function PaymentMethodBreakdownCard({
  revenueByPaymentMethod = {},
  totalRevenue,
}: PaymentMethodBreakdownCardProps) {
  // Parse all methods
  const methods = React.useMemo(() => {
    const defaultKeys = ["CASH", "BANK_TRANSFER", "CARD", "E_WALLET"]
    const allKeys = Array.from(new Set([...defaultKeys, ...Object.keys(revenueByPaymentMethod)]))

    return allKeys.map((key) => {
      const rawVal = revenueByPaymentMethod[key]
      const amount = rawVal ? parseFloat(rawVal) : 0
      const percent = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
      const config = METHOD_CONFIGS[key] || {
        key,
        label: key === "UNKNOWN" ? "Khác" : key,
        icon: HelpCircle,
        iconColor: "text-slate-600",
        barColor: "bg-slate-500",
        badgeBg: "bg-slate-50 text-slate-700",
      }

      return {
        ...config,
        amount,
        percent,
      }
    })
  }, [revenueByPaymentMethod, totalRevenue])

  // Luôn hiển thị đầy đủ 4 kênh thanh toán (CASH, BANK_TRANSFER, CARD, E_WALLET) để layout ổn định và dễ theo dõi
  const activeMethods = methods

  // Find top payment method
  const dominantMethod = React.useMemo(() => {
    if (totalRevenue <= 0) return null
    return [...methods].sort((a, b) => b.amount - a.amount)[0]
  }, [methods, totalRevenue])

  return (
    <div className="flex h-full flex-col justify-between rounded-card border border-border-default/80 bg-surface-card p-6 shadow-2xs">
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-border-default/60 pb-3">
          <div>
            <h3 className="text-base font-bold text-text-primary tracking-tight">
              Phương thức thanh toán
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              Phân bổ cơ cấu nguồn thu (FR-RPT-01)
            </p>
          </div>
          {dominantMethod && dominantMethod.amount > 0 && (
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", dominantMethod.badgeBg)}>
              {dominantMethod.label}: {formatPercent(dominantMethod.percent, 0)}
            </span>
          )}
        </div>

        {totalRevenue === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-text-tertiary">
              <Receipt className="size-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-text-primary">
              Chưa có thanh toán phát sinh
            </p>
            <p className="mt-1 text-xs text-text-tertiary max-w-[240px]">
              Không ghi nhận hóa đơn thanh toán nào trong kỳ báo cáo này.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {activeMethods.map((method) => {
              const Icon = method.icon
              return (
                <div key={method.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-surface-muted">
                        <Icon className={cn("size-4", method.iconColor)} />
                      </div>
                      <span className="font-semibold text-text-primary">
                        {method.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-text-primary">
                        {formatCurrency(method.amount)}
                      </span>
                      <span className="w-12 text-right text-xs font-semibold text-text-tertiary">
                        {formatPercent(method.percent, 1)}
                      </span>
                    </div>
                  </div>

                  {/* Visual progress bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", method.barColor)}
                      style={{ width: `${Math.min(100, Math.max(0, method.percent))}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-border-default/60 pt-3 flex items-center justify-between text-xs">
        <span className="text-text-tertiary">Tổng thanh toán đã quyết toán:</span>
        <span className="text-sm font-bold text-brand-primary">
          {formatCurrency(totalRevenue)}
        </span>
      </div>
    </div>
  )
}

