import { expect, test } from "@playwright/test"
import type { TakeawayOrder } from "../../src/api/takeaway-orders.api"

test("creates a counter order, adds items to the same order, and tracks payment and handoff", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: "test-token" }))
    localStorage.setItem("pho-viet-auth", JSON.stringify({ version: 0, state: {
      role: "CASHIER", branchId: 10, assignmentId: 7, accessToken: "test-token", isAuthenticated: true,
      account: { id: 1, restaurantId: 1, fullName: "Nhân viên quầy" },
    } }))
  })
  let order: TakeawayOrder | null = null
  const created: unknown[] = []
  const appended: unknown[] = []
  await page.route("**/ws/**", (route) => route.abort())
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace("/api/v1", "")
    const headers = {
      "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    }
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
    let data: unknown = []
    if (path === "/assignments/account/1") data = [{ id: 7, roleCode: "CASHIER", branchId: 10 }]
    if (path === "/branches/10") data = { id: 10, name: "Chi nhánh Quận 1", status: "ACTIVE" }
    if (path === "/branches/10/menu") data = [
      { dishId: 6, dishName: "Cơm sườn", categoryId: 3, categoryName: "Món chính", effectivePrice: 30000, stockStatus: "AVAILABLE" },
    ]
    if (path === "/takeaway-orders/branch/10") {
      if (request.method() === "POST") {
        created.push(request.postDataJSON())
        order = {
          id: 61, label: "Mang về #61", customerName: "An", openedAt: new Date().toISOString(),
          portions: 3, kitchenStatus: "PENDING", paid: false, sessionStatus: "SERVING",
        }
        data = order
      } else data = order ? [{ ...order, canAddTakeawayItems: !order.paid && order.invoiceId == null }] : []
    }
    if (path === "/orders" && request.method() === "POST" && order) {
      const body = request.postDataJSON()
      appended.push(body)
      order.portions += body.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0)
      order.sessionStatus = "SERVING"
      data = { id: 103, tableSessionId: order.id }
    }
    if (path === "/table-sessions/61/request-payment" && order) {
      order.sessionStatus = "WAITING_FOR_PAY"
    }
    if (path === "/table-sessions/61" && order) {
      data = { ...order, tableName: order.label, branchId: 10, tableId: null, status: order.sessionStatus, takeaway: true,
        canAddTakeawayItems: !order.paid && order.invoiceId == null }
    }
    if (path === "/takeaway-orders/branch/10/61/handoff") {
      expect(order?.paid).toBe(true)
      expect(order?.kitchenStatus).toBe("READY")
      order = null
      return route.fulfill({ status: 204, headers })
    }
    return route.fulfill({ headers, json: { data } })
  })

  await page.goto("/thu-ngan/so-do-ban")
  const serviceMode = page.getByRole("navigation", { name: "Hình thức phục vụ" })
  await expect(serviceMode.getByRole("link", { name: "Tại bàn" })).toHaveAttribute("aria-current", "page")
  await page.getByRole("link", { name: "+ Đơn mang về", exact: true }).click()
  await page.getByRole("button", { name: /Cơm sườn/ }).click()
  await page.getByRole("textbox", { name: "Số lượng Cơm sườn" }).fill("3")
  await page.getByRole("textbox", { name: /Tên khách/ }).fill("An")
  await page.getByRole("button", { name: "Gửi bếp" }).click()
  await expect(page).toHaveURL(/\/so-do-ban\?mode=takeaway$/)
  await expect(serviceMode.getByRole("link", { name: /Mang về 1/ })).toHaveAttribute("aria-current", "page")
  const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Mang về #61" }) })
  await expect(card.getByText("Chờ xác nhận")).toBeVisible()
  await expect(card.getByText("Chưa thanh toán")).toBeVisible()
  await card.getByRole("button", { name: "Thanh toán" }).click()
  await expect(page).toHaveURL(/\/thanh-toan\/61$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/so-do-ban\?mode=takeaway$/)
  expect(order).toMatchObject({ sessionStatus: "WAITING_FOR_PAY" })
  await card.getByRole("link", { name: "Thêm món" }).click()
  const addItemsUrl = page.url()
  await expect(page.getByRole("heading", { name: "Thêm món · Mang về #61" })).toBeVisible()
  await expect(page.getByRole("textbox", { name: /Tên khách/ })).toHaveCount(0)
  await page.getByRole("button", { name: /Cơm sườn/ }).click()
  await page.getByRole("textbox", { name: "Số lượng Cơm sườn" }).fill("2")
  await page.getByRole("button", { name: "Gửi thêm món" }).click()
  await expect(card.getByText("An · 5 phần")).toBeVisible()
  expect(created).toEqual([{ customerName: "An", items: [{ dishId: 6, quantity: 3 }] }])
  expect(appended).toEqual([{ tableSessionId: 61, orderedById: 1, items: [{ dishId: 6, quantity: 2 }] }])
  await expect(card.getByRole("button", { name: "Đã giao khách" })).toHaveCount(0)
  await card.getByRole("button", { name: "Thanh toán" }).click()
  await expect(page).toHaveURL(/\/thanh-toan\/61$/)
  if (!order) throw new Error("Đơn mang về chưa được tạo.")
  Object.assign(order, { invoiceId: 41 })
  await page.goto(addItemsUrl)
  await expect(page.getByRole("alert").getByText("Đơn mang về đã lập hóa đơn hoặc không còn mở để thêm món.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Gửi thêm món" })).toHaveCount(0)
  await page.getByRole("button", { name: "Về đơn mang về" }).click()
  await expect(card.getByRole("link", { name: "Thêm món" })).toHaveCount(0)
  Object.assign(order, { paid: true, kitchenStatus: "READY", sessionStatus: "CLOSED" })
  await expect(card.getByText("Sẵn sàng giao")).toBeVisible()
  await expect(card.getByText("Đã thanh toán")).toBeVisible()
  await card.getByRole("button", { name: "Đã giao khách" }).click()
  await expect(page.getByText("Chưa có đơn mang về đang xử lý.")).toBeVisible()
})

test("refreshes takeaway orders after a branch push without waiting for polling", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: "test-token" }))
    localStorage.setItem("pho-viet-auth", JSON.stringify({ version: 0, state: {
      role: "CASHIER", branchId: 10, assignmentId: 7, accessToken: "test-token", isAuthenticated: true,
      account: { id: 1, restaurantId: 1, fullName: "Nhân viên quầy" },
    } }))
  })
  let order: TakeawayOrder | null = {
    id: 62, label: "Mang về #62", openedAt: new Date().toISOString(),
    portions: 2, kitchenStatus: "PREPARING", paid: false, sessionStatus: "WAITING_FOR_PAY", invoiceId: 41,
  }
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers })
    const data = path.endsWith("/takeaway-orders/branch/10") ? (order ? [order] : [])
      : path.endsWith("/assignments/account/1") ? [{ id: 7, roleCode: "CASHIER", branchId: 10 }]
        : path.endsWith("/branches/10") ? { id: 10, name: "Chi nhánh Quận 1", status: "ACTIVE" } : []
    return route.fulfill({ headers, json: { data } })
  })
  await page.route(/\/ws\/info(?:\?|$)/, (route) => route.fulfill({
    headers: { "Access-Control-Allow-Origin": "*" },
    json: { websocket: true, cookie_needed: false, origins: ["*:*"], entropy: 123 },
  }))
  let pushUpdate: (() => void) | undefined
  let revision = 0
  await page.routeWebSocket(/\/ws\/[^/]+\/[^/]+\/websocket$/, (socket) => {
    const send = (frame: string) => socket.send(`a${JSON.stringify([frame])}`)
    socket.onMessage((message) => {
      if (typeof message !== "string") return
      const [frame = ""] = JSON.parse(message) as string[]
      if (frame.startsWith("CONNECT")) send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\u0000")
      const destination = frame.match(/^destination:(.*)$/m)?.[1]
      const subscription = frame.match(/^id:(.*)$/m)?.[1]
      if (!frame.startsWith("SUBSCRIBE") || destination !== "/topic/branch/10/takeaway-updated" || !subscription) return
      pushUpdate = () => send(`MESSAGE\ndestination:${destination}\nsubscription:${subscription}\nmessage-id:${++revision}\n\n{"tableSessionId":62}\u0000`)
    })
    socket.send("o")
  })

  await page.goto("/thu-ngan/so-do-ban?mode=takeaway")
  await expect(page.getByText("Chưa thanh toán")).toBeVisible()
  await expect.poll(() => Boolean(pushUpdate)).toBe(true)
  Object.assign(order!, { paid: true })
  pushUpdate!()
  await expect(page.getByText("Đã thanh toán", { exact: true })).toBeVisible({ timeout: 2000 })

  Object.assign(order!, { kitchenStatus: "READY" })
  pushUpdate!()
  await expect(page.getByRole("button", { name: "Đã giao khách" })).toBeVisible({ timeout: 2000 })

  order = null
  pushUpdate!()
  await expect(page.getByText("Chưa có đơn mang về đang xử lý.")).toBeVisible({ timeout: 2000 })
})
