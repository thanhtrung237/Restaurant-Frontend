import type { OrderDetailStatus } from "@/types/enums"

export type KDSColumn = "AWAITING_CONFIRM" | "COOKING"

export function parseOrderTime(value?: string): number {
  if (!value) return NaN
  // The backend serializes LocalDateTime in Vietnam time. Keep explicit offsets when present.
  const localDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/
  return Date.parse(localDateTime.test(value) ? value + "+07:00" : value)
}

export function getWaitMinutes(timestamp: number | undefined, now: number) {
  return timestamp === undefined ? 0 : Math.max(0, Math.floor((now - timestamp) / 60000))
}

export function formatTimeAgo(minutes: number) {
  if (minutes < 1) return "vừa gửi"
  if (minutes < 60) return `${minutes} phút`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export interface KDSTicketItem {
  id: number
  orderDetailId: number
  orderId: number
  dishId: number
  tableSessionId: number
  tableName: string
  takeaway?: boolean
  minutesAgo: number
  round: number
  roundTime?: number
  dishName: string
  quantity: number
  servedQuantity: number
  isTakeAway: boolean
  note?: string
  requiresWeighing: boolean
  /** Khối lượng đã cân (kg) — chỉ có khi món đã qua bước "Nhập số cân" (PENDING_WEIGHT → PREPARING). */
  weightKg?: number
  /** Các tùy chọn đã chọn (size, topping, etc.) */
  options?: Array<{
    id: number
    optionItemId: number
    optionItemName: string
    priceSnapshot: number
  }>
  column: KDSColumn
  status: OrderDetailStatus
}

export function countPortions(items: KDSTicketItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0)
}

export function dishGroupKey(item: KDSTicketItem) {
  return item.requiresWeighing || item.weightKg != null
    ? String(item.id)
    : JSON.stringify([
        item.dishId,
        item.isTakeAway,
        item.note?.trim() ?? "",
        (item.options ?? [])
          .map((option) => JSON.stringify([option.optionItemId, option.optionItemName]))
          .sort(),
      ])
}

export function groupIdenticalDishes(items: KDSTicketItem[]) {
  const groups = new Map<string, KDSTicketItem[]>()
  for (const item of items) {
    const key = dishGroupKey(item)
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }
  return [...groups.values()]
}

export function groupByRound(items: KDSTicketItem[]) {
  const rounds = new Map<number, KDSTicketItem[]>()
  for (const item of items) {
    const round = rounds.get(item.round)
    if (round) round.push(item)
    else rounds.set(item.round, [item])
  }
  return [...rounds.entries()].sort(([first], [second]) => first - second)
}
