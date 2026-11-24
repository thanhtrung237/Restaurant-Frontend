import { isBillableDetail } from "@/lib/order-detail-billing"
import type { OrderDetail } from "@/types/models"

export interface InvoiceLine {
  id: number
  name: string
  quantity: number
  weightKg?: number
  price: number
  lineTotal: number
  options: OrderDetail["options"]
  details: OrderDetail[]
}

export function groupInvoiceLines(details: OrderDetail[]): InvoiceLine[] {
  const groups = new Map<string, InvoiceLine>()
  for (const detail of details) {
    if (!isBillableDetail(detail)) continue

    const name = detail.dishName ?? `Món #${detail.dishId}`
    const price = detail.priceAtOrderTime ?? 0
    const weightKg = detail.weightKg ?? undefined
    const lineTotal = detail.price ?? price * (weightKg ?? detail.quantity)
    const options = detail.options
      ?.map((option) =>
        JSON.stringify([option.optionItemId ?? option.optionItemName, option.priceSnapshot]),
      )
      .sort()
    const key = JSON.stringify([detail.dishId ?? name, price, weightKg != null, options ?? []])
    const existing = groups.get(key)
    if (existing) {
      existing.quantity += detail.quantity
      existing.lineTotal += lineTotal
      existing.details.push(detail)
      if (weightKg != null) existing.weightKg = (existing.weightKg ?? 0) + weightKg
      continue
    }

    groups.set(key, {
      id: detail.id,
      name,
      quantity: detail.quantity,
      weightKg,
      price,
      lineTotal,
      options: detail.options,
      details: [detail],
    })
  }
  return [...groups.values()]
}
