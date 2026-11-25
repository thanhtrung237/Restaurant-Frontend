import { generatePath } from "react-router-dom"
import { BRANCH_MANAGER_PATHS, RESTAURANT_ADMIN_PATHS, WAITER_PATHS } from "@/app/router/paths"
import { getStaffPaymentPaths } from "@/app/router/paths/staff-payment.paths"
import { takeawayListPath } from "@/app/router/paths/takeaway.paths"
import type { StaffNotification } from "@/api/staff-notifications.api"
import type { AppRole } from "@/config/roles"
import type { TableSession } from "@/types/models"

const orderPaths: Partial<Record<AppRole, string>> = {
  WAITER: WAITER_PATHS.ORDER_DETAIL,
  BRANCH_MANAGER: BRANCH_MANAGER_PATHS.ORDER_DETAIL,
  RESTAURANT_ADMIN: RESTAURANT_ADMIN_PATHS.ORDER_DETAIL,
}

const kitchenPaths: Partial<Record<AppRole, string>> = {
  WAITER: WAITER_PATHS.ORDER_AND_PREP,
  BRANCH_MANAGER: BRANCH_MANAGER_PATHS.ORDER_AND_PREP,
  RESTAURANT_ADMIN: RESTAURANT_ADMIN_PATHS.ORDER_AND_PREP,
}

export function getOrderRoundPath(role: AppRole | null, sessionId: number, orderId: number) {
  const path = role ? orderPaths[role] : undefined
  return path ? `${generatePath(path, { orderId: String(sessionId) })}?round=${orderId}` : null
}

export function getNotificationDestination(
  notification: StaffNotification,
  session: TableSession,
  role: AppRole | null,
) {
  const payment = getStaffPaymentPaths(role)
  if (notification.type === "TABLE_OPEN_REQUESTED") {
    const tableMap = role === "WAITER" ? WAITER_PATHS.TABLE_MAP : payment?.TABLE_MAP
    return tableMap && session.tableId ? `${tableMap}?table=${session.tableId}` : null
  }
  if (
    payment &&
    (notification.type === "BANK_PAYMENT_VERIFIED" ||
      (notification.type === "PAYMENT_QR_OPENED" && session.status === "WAITING_FOR_PAY"))
  ) {
    return generatePath(payment.QR_TRANSFER_PAYMENT, { tableSessionId: String(session.id) })
  }
  if (
    (notification.type === "PAYMENT_REQUESTED" || notification.type === "DISCOUNT_APPROVAL") &&
    session.status === "WAITING_FOR_PAY" &&
    payment
  ) {
    return generatePath(payment.CHECKOUT, { tableSessionId: String(session.id) })
  }
  const kitchen = role ? kitchenPaths[role] : undefined
  if (notification.type === "NEW_ORDER" && notification.orderId && kitchen) {
    return `${kitchen}?session=${session.id}&round=${notification.orderId}`
  }
  const search = new URLSearchParams()
  if (notification.type === "STAFF_CALL") search.set("staffCall", String(notification.id))
  const orderPath = role ? orderPaths[role] : undefined
  if (orderPath) {
    if (notification.orderId) search.set("round", String(notification.orderId))
    const path = generatePath(orderPath, { orderId: String(session.id) })
    return search.size ? `${path}?${search}` : path
  }
  if (!payment) return null
  if (session.takeaway) return takeawayListPath(payment.TABLE_MAP)
  search.set("table", String(session.tableId))
  return `${payment.TABLE_MAP}?${search}`
}
