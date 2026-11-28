import { expect, test, type Page, type WebSocketRoute } from "@playwright/test"
import { mockSessionRefresh } from "./staff-session"

const table = { id: 4, branchId: 2, name: "Bàn realtime", capacity: 4, status: "AVAILABLE" }
const session = {
  id: 12,
  tableId: 4,
  branchId: 2,
  restaurantId: 3,
  tableName: table.name,
  guestCount: 2,
  status: "SERVING",
}
const dish = {
  dishId: 7,
  dishName: "Phở realtime",
  categoryId: 1,
  categoryName: "Món chính",
  basePrice: 59000,
  effectivePrice: 59000,
  isHidden: false,
}
const detail = {
  id: 31,
  orderId: 20,
  dishId: dish.dishId,
  dishName: dish.dishName,
  quantity: 2,
  priceAtOrderTime: 59000,
  price: 118000,
  status: "PENDING",
  isBillable: true,
}
const invoice = {
  id: 45,
  tableSessionId: 12,
  invoiceNumber: "HD-45",
  grandTotal: 118000,
  remainingAmount: 118000,
  totalPaid: 0,
  status: "PENDING",
}
const guestPath = "/table/QR-B2-T4"
const sessionTopic = "/topic/session/12/session-updated"
const menuTopic = "/topic/restaurant/3/menu-updated"
const branchTopic = "/topic/branch/2/session-updated"

async function mockApi(
  page: Page,
  overrides: Record<string, () => unknown>,
  activeSession = session,
) {
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api\/v1/, "")
    const defaults: Record<string, unknown> = {
      "/tables/branch/2/qr/QR-B2-T4": table,
      "/table-sessions/table/4/open": activeSession,
      "/table-sessions/12": activeSession,
      "/table-sessions/branch/2/open": [activeSession],
      "/tables/branch/2": [table],
      "/branches/2": { id: 2, name: "Chi nhánh realtime", restaurantId: 3, status: "ACTIVE" },
      "/branches/restaurant/3": [{ id: 2, name: "Chi nhánh realtime", status: "ACTIVE" }],
      "/restaurants/3": { id: 3, name: "Nhà hàng realtime", status: "ACTIVE" },
    }
    if (route.request().method() === "OPTIONS" || path.endsWith("/qr-opened"))
      return route.fulfill({ status: 204 })
    const data = overrides[path] ? overrides[path]() : (defaults[path] ?? [])
    return route.fulfill({ json: { data } })
  })
}

async function mockSocket(page: Page) {
  // Keep periodic API refreshes outside each assertion window.
  await page.addInitScript(() => {
    const setInterval = window.setInterval.bind(window)
    window.setInterval = (handler, delay, ...args) =>
      setInterval(handler, delay && delay <= 20_000 ? 60_000 : delay, ...args)
  })
  await page.route(/\/ws\/info(?:\?|$)/, (route) =>
    route.fulfill({
      json: { websocket: true, cookie_needed: false, origins: ["*:*"], entropy: 1 },
    }),
  )
  const subscriptions = new Map<string, { socket: WebSocketRoute; id: string }>()
  let revision = 0
  await page.routeWebSocket(/\/ws\/[^/]+\/[^/]+\/websocket$/, (socket) => {
    socket.onMessage((message) => {
      if (typeof message !== "string") return
      const [frame = ""] = JSON.parse(message) as string[]
      if (frame.startsWith("CONNECT")) {
        socket.send("a" + JSON.stringify(["CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\u0000"]))
      }
      const destination = frame.match(/^destination:(.*)$/m)?.[1]
      const id = frame.match(/^id:(.*)$/m)?.[1]
      if (frame.startsWith("SUBSCRIBE") && destination && id)
        subscriptions.set(destination, { socket, id })
    })
    socket.send("o")
  })
  return {
    async waitFor(topic: string, timeout = 5000) {
      await expect.poll(() => subscriptions.has(topic), { timeout }).toBe(true)
    },
    publish(topic: string, payload: object = { changed: true }) {
      const subscription = subscriptions.get(topic)
      if (!subscription) throw new Error("Missing subscription for " + topic)
      const frame =
        "MESSAGE\ndestination:" +
        topic +
        "\nsubscription:" +
        subscription.id +
        "\nmessage-id:" +
        ++revision +
        "\n\n" +
        JSON.stringify(payload) +
        "\u0000"
      subscription.socket.send("a" + JSON.stringify([frame]))
    },
    async disconnect(topic: string) {
      const subscription = subscriptions.get(topic)
      if (!subscription) throw new Error("Missing subscription for " + topic)
      subscriptions.clear()
      await subscription.socket.close()
    },
  }
}

async function guest(page: Page, activeSession = session) {
  await page.addInitScript(
    ({ activeSession, qrCode }) => {
      sessionStorage.setItem(
        "restaurant-guest-credential-v1",
        JSON.stringify({ sessionId: activeSession.id, token: "guest-realtime-test" }),
      )
      localStorage.setItem(
        "pho-viet-customer-session",
        JSON.stringify({ version: 2, state: { qrCode, tableSession: activeSession } }),
      )
    },
    { activeSession, qrCode: "QR-B2-T4" },
  )
}

async function staff(page: Page, role: string, branchId: number | null = 2) {
  await page.addInitScript(
    ({ role, branchId }) => {
      localStorage.setItem(
        "pho-viet-auth",
        JSON.stringify({
          version: 1,
          state: {
            role,
            branchId,
            account: {
              id: 1,
              restaurantId: role === "PLATFORM_ADMIN" ? null : 3,
              fullName: "Test",
            },
          },
        }),
      )
    },
    { role, branchId },
  )
}

test("guest menu removes an out-of-stock dish and resyncs on reconnect", async ({ page }) => {
  await guest(page)
  const socket = await mockSocket(page)
  let stocked = true
  await mockApi(page, { "/branches/2/menu": () => (stocked ? [dish] : []) })
  await page.goto(guestPath + "/menu")
  const name = page.getByText(dish.dishName, { exact: true }).first()
  await expect(name).toBeVisible()
  await socket.waitFor(menuTopic)
  stocked = false
  socket.publish(menuTopic)
  await expect(name).toHaveCount(0)
  await socket.disconnect(menuTopic)
  stocked = true
  await socket.waitFor(menuTopic, 12_000)
  await expect(name).toBeVisible()
})

test("guest sees the updated status of an ordered dish", async ({ page }) => {
  await guest(page)
  const socket = await mockSocket(page)
  let status = "PENDING"
  await mockApi(page, { "/order-details/session/12": () => [{ ...detail, status }] })
  await page.goto(guestPath + "/ordered-items")
  await expect(page.getByText(dish.dishName, { exact: true })).toBeVisible()
  await expect(page.getByText("Chờ xác nhận", { exact: true }).first()).toBeVisible()
  const topic = "/topic/session/12/item-status"
  await socket.waitFor(topic)
  status = "PREPARING"
  socket.publish(topic, { orderDetailId: detail.id, status })
  await expect(page.getByText("Đang chế biến", { exact: true }).first()).toBeVisible()
})

test("guest invoice replaces the preview when the cashier issues the bill", async ({ page }) => {
  const active = { ...session, status: "WAITING_FOR_PAY" }
  await guest(page, active)
  const socket = await mockSocket(page)
  let ready = false
  await mockApi(
    page,
    {
      "/invoices/session/12": () => (ready ? invoice : null),
      "/table-sessions/12/bill-preview": () => ({
        grossSubTotal: 118000,
        grandTotal: 118000,
        itemPromotionDiscount: 0,
        orderPromotionDiscount: 0,
        manualDiscount: 0,
        serviceFeeRate: 0,
        serviceFee: 0,
        vatRate: 0,
        vatAmount: 0,
        vatBase: 118000,
      }),
    },
    active,
  )
  await page.goto(guestPath + "/invoice")
  await expect(page.getByRole("heading", { name: "Hóa đơn tạm tính" })).toBeVisible()
  await socket.waitFor(sessionTopic)
  ready = true
  socket.publish(sessionTopic)
  await expect(page.getByRole("heading", { name: "Hóa đơn", exact: true })).toBeVisible()
})

test("guest QR payment switches to success after a session update", async ({ page }) => {
  const active = { ...session, status: "WAITING_FOR_PAY" }
  await guest(page, active)
  const socket = await mockSocket(page)
  let paid = false
  const readInvoice = () =>
    paid ? { ...invoice, status: "PAID", remainingAmount: 0, totalPaid: 118000 } : invoice
  const qr = {
    invoiceId: 45,
    grandTotal: 118000,
    remainingAmount: 118000,
    totalPaid: 0,
    bankName: "MB",
    accountNo: "123456789",
    accountName: "Test",
    transferContent: "HD45",
    automaticVerification: true,
    qrImageUrl: "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E",
  }
  await mockApi(
    page,
    {
      "/invoices/session/12": readInvoice,
      "/invoices/45": readInvoice,
      "/invoices/session/12/qr-code": () => qr,
      "/invoices/45/qr-code": () => qr,
    },
    active,
  )
  await page.goto(guestPath + "/payment-qr")
  await expect(page.getByRole("img", { name: "VietQR Thanh toán" })).toBeVisible()
  await socket.waitFor(sessionTopic)
  paid = true
  socket.publish(sessionTopic)
  await expect(page).toHaveURL(/payment-success$/)
})

test("staff table map sees a session opened at another terminal", async ({ page }) => {
  await staff(page, "BRANCH_MANAGER")
  const socket = await mockSocket(page)
  let open = false
  await mockApi(page, {
    "/tables/branch/2": () => [{ ...table, status: open ? "OCCUPIED" : "AVAILABLE" }],
    "/table-sessions/branch/2/open": () => (open ? [session] : []),
  })
  await mockSessionRefresh(page, "staff-realtime-test")
  await page.goto("/branch-manager/table-map")
  await expect(page.getByRole("button", { name: /Bàn realtime.*Trống/ })).toBeVisible()
  await socket.waitFor(branchTopic)
  open = true
  socket.publish(branchTopic, { tableSessionId: 12 })
  await expect(page.getByRole("button", { name: /Bàn realtime.*Đang phục vụ/ })).toBeVisible()
})

test("kitchen receives a dish from another terminal", async ({ page }) => {
  await staff(page, "BRANCH_MANAGER")
  const socket = await mockSocket(page)
  let orderReceived = false
  await mockApi(page, {
    "/order-details/session/12": () => (orderReceived ? [detail] : []),
  })
  await mockSessionRefresh(page, "staff-realtime-test")
  await page.goto("/branch-manager/kitchen")
  await socket.waitFor(branchTopic)
  await expect(page.getByText(dish.dishName, { exact: true })).toHaveCount(0)
  orderReceived = true
  socket.publish(branchTopic, { tableSessionId: 12 })
  await expect(page.getByText(dish.dishName, { exact: true })).toBeVisible()
})

test("restaurant admin reloads reports and management data from restaurant events", async ({
  page,
}) => {
  await staff(page, "RESTAURANT_ADMIN", null)
  const socket = await mockSocket(page)
  let revenue = 0
  let branchName = "Chi nhánh ban đầu"
  await mockApi(page, {
    "/reports/revenue": () => ({
      totalRevenue: revenue,
      avgRevenuePerInvoice: revenue,
      totalInvoices: revenue ? 1 : 0,
      totalGuests: 0,
      revenueByPaymentMethod: {},
      trend: [],
    }),
    "/branches/restaurant/3": () => [{ id: 2, name: branchName, code: "CN2", status: "ACTIVE" }],
  })
  await mockSessionRefresh(page, "staff-realtime-test")
  await page.goto("/restaurant-admin/reports")
  const operations = "/topic/restaurant/3/operations-updated"
  await socket.waitFor(operations)
  const reportRequest = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname.endsWith("/reports/revenue") &&
      r.request().method() === "GET" &&
      r.ok() &&
      r.json().then((body) => body.data.totalRevenue === 987654),
  )
  revenue = 987654
  socket.publish(operations)
  await reportRequest

  await mockSessionRefresh(page, "staff-realtime-test")
  await page.goto("/restaurant-admin/branches")
  await expect(page.getByText(branchName, { exact: true }).first()).toBeVisible()
  const management = "/topic/restaurant/3/management-updated"
  await socket.waitFor(management)
  branchName = "Chi nhánh vừa đổi tên"
  socket.publish(management)
  await expect(page.getByText(branchName, { exact: true }).first()).toBeVisible()
})

test("platform admin refreshes restaurant data on a platform event", async ({ page }) => {
  await staff(page, "PLATFORM_ADMIN", null)
  const socket = await mockSocket(page)
  let name = "Nhà hàng ban đầu"
  await mockApi(page, {
    "/restaurants": () => ({
      content: [{ id: 3, name, code: "NH3", status: "ACTIVE" }],
      totalElements: 1,
      totalPages: 1,
    }),
  })
  await mockSessionRefresh(page, "staff-realtime-test")
  await page.goto("/platform-admin")
  const topic = "/topic/platform/structure-updated"
  await socket.waitFor(topic)
  const refresh = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname.endsWith("/restaurants") &&
      r.request().method() === "GET" &&
      r.ok() &&
      r.json().then((body) => body.data.content[0]?.name === "Nhà hàng mới"),
  )
  name = "Nhà hàng mới"
  socket.publish(topic)
  await refresh
  await expect(page.getByText(name, { exact: true })).toBeVisible()
})

test("cashier sees the paid invoice after a branch update", async ({ page }) => {
  await staff(page, "CASHIER")
  const socket = await mockSocket(page)
  let paid = false
  await mockApi(page, {
    "/invoices/branch/2": () => [{ ...invoice, status: paid ? "PAID" : "PENDING" }],
  })
  await mockSessionRefresh(page, "staff-realtime-test")
  await page.goto("/cashier/invoices")
  await page.getByRole("button", { name: "Tất cả ngày" }).click()
  const row = page.getByRole("row").filter({ hasText: "HD-45" })
  await expect(row.getByText("Chờ thanh toán", { exact: true })).toBeVisible()
  await socket.waitFor(branchTopic)
  paid = true
  socket.publish(branchTopic, { tableSessionId: 12 })
  await expect(row.getByText("Đã thanh toán", { exact: true })).toBeVisible()
})

test("restaurant admin sees a remotely created promotion", async ({ page }) => {
  await staff(page, "RESTAURANT_ADMIN", null)
  const socket = await mockSocket(page)
  let created = false
  const promotion = {
    id: 2,
    name: "Ưu đãi realtime",
    code: "WS20",
    status: "ACTIVE",
    type: "PERCENTAGE",
    discountValue: 20,
    startDate: "2026-01-01",
    endDate: "2099-01-01",
  }
  await mockApi(page, {
    "/promotions/restaurant/3": () => ({ content: created ? [promotion] : [] }),
  })
  await mockSessionRefresh(page, "staff-realtime-test")
  await page.goto("/restaurant-admin/promotions")
  await expect(page.getByText(promotion.name, { exact: true })).toHaveCount(0)
  await socket.waitFor(menuTopic)
  created = true
  socket.publish(menuTopic)
  await expect(page.getByText(promotion.name, { exact: true }).first()).toBeVisible()
})
