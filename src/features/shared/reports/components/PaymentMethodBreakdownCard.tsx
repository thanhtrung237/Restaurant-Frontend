import { Receipt } from "lucide-react"
import { Pie, PieChart, Tooltip } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { formatCurrency, formatPercent } from "@/lib/format"

interface PaymentMethodBreakdownCardProps {
  revenueByPaymentMethod?: Record<string, string>
}

const METHOD_CONFIGS: Record<string, { label: string; color: string }> = {
  CASH: { label: "Tiền mặt", color: "#10B981" },
  BANK_TRANSFER: { label: "Chuyển khoản QR", color: "#3B82F6" },
  CARD: { label: "Thẻ thanh toán / POS", color: "#8B5CF6" },
  E_WALLET: { label: "Ví điện tử", color: "#F59E0B" },
}

const chartConfig = { amount: { label: "Số tiền" } }

export function PaymentMethodBreakdownCard({
  revenueByPaymentMethod = {},
}: PaymentMethodBreakdownCardProps) {
  const keys = new Set([...Object.keys(METHOD_CONFIGS), ...Object.keys(revenueByPaymentMethod)])
  const methods = Array.from(keys, (key) => {
    const amount = Number(revenueByPaymentMethod[key] ?? 0)
    const config = METHOD_CONFIGS[key] ?? {
      label: key === "UNKNOWN" ? "Khác" : key,
      color: "#64748B",
    }
    return {
      key,
      name: config.label,
      fill: config.color,
      amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    }
  })
  const slices = methods.filter((method) => method.amount > 0)
  const total = slices.reduce((sum, method) => sum + method.amount, 0)
  const percentage = (amount: number) => formatPercent((amount / total) * 100, 1)

  return (
    <section
      aria-label="Phương thức thanh toán"
      className="h-full rounded-card border border-border-default/80 bg-surface-card p-4 shadow-2xs sm:p-6"
    >
      <h3 className="text-base font-bold tracking-tight text-text-primary">
        Phương thức thanh toán
      </h3>

      {slices.length > 0 ? (
        <>
          <div className="relative mx-auto mt-2 w-full max-w-56">
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-text-secondary">Tổng thanh toán</span>
              <strong className="max-w-[58%] break-words text-sm tabular-nums text-text-primary">
                {formatCurrency(total)}
              </strong>
            </div>
            <ChartContainer config={chartConfig} className="aspect-square w-full">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="95%"
                  stroke="var(--color-surface-card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number"
                      ? `${formatCurrency(value)} · ${percentage(value)}`
                      : ""
                  }
                  separator=" · "
                  contentStyle={{
                    backgroundColor: "#1E2229",
                    border: 0,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  itemStyle={{ color: "#fff" }}
                  isAnimationActive={false}
                />
              </PieChart>
            </ChartContainer>
          </div>

          <ul
            aria-label="Số tiền và tỷ trọng theo phương thức"
            className="mt-2 divide-y divide-border-default/60 border-t border-border-default/60"
          >
            {methods.map((method) => (
              <li
                key={method.key}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 py-2 text-xs sm:text-sm"
              >
                <span className="flex min-w-0 items-center gap-2 font-medium text-text-primary">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: method.fill }}
                  />
                  {method.name}
                </span>
                <span className="whitespace-nowrap font-semibold tabular-nums text-text-primary">
                  {formatCurrency(method.amount)}
                </span>
                <span className="w-11 text-right text-xs tabular-nums text-text-secondary">
                  {percentage(method.amount)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-4 flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl bg-surface-page px-4 text-center">
          <div className="rounded-full bg-surface-muted p-3 text-text-secondary">
            <Receipt className="size-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-text-primary">Chưa có thanh toán phát sinh</p>
          <p className="text-xs text-text-secondary">
            Không ghi nhận khoản thanh toán nào trong kỳ báo cáo này.
          </p>
        </div>
      )}
    </section>
  )
}
