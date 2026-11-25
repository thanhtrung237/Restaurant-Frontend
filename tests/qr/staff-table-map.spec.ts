import { expect, test, type Page } from "@playwright/test"

const mapUrl = "/quan-ly-chi-nhanh/so-do-ban"
const tables = Array.from({ length: 13 }, (_, index) => ({
  id: index + 1,
  branchId: 2,
  name: `Bàn ${String(index + 1).padStart(2, "0")}`,
  capacity:
    index === 0 || index === 6 ? 8 : index === 3 || index === 7 ? 6 : index === 12 ? undefined : 4,
  status: "AVAILABLE",
  areaId: index < 6 ? 20 : index < 12 ? 21 : undefined,
  areaName: index === 0 ? undefined : index < 6 ? "Tầng 1" : index < 12 ? "Sân vườn" : undefined,
}))
const sessions = [
  { id: 31, tableId: 2, status: "WAITING_FOR_OPEN", guestCount: 2 },
  { id: 32, tableId: 3, status: "SERVING", guestCount: 4 },
  { id: 33, tableId: 7, status: "WAITING_FOR_PAY", guestCount: 4 },
]

async function mockMap(
  page: Page,
  options: {
    tablesStatus?: () => number
    sessionsStatus?: () => number
    tablesData?: typeof tables
    role?: "BRANCH_MANAGER" | "CASHIER"
    permissions?: ("RESERVE_TABLE" | "CONFIRM_ORDER")[]
  } = {},
) {
  const requests = { tables: 0, sessions: 0 }
  await page.addInitScript((role) => {
    localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: "test-token" }))
    localStorage.setItem(
      "pho-viet-auth",
      JSON.stringify({
        version: 0,
        state: {
          role,
          branchId: 2,
          accessToken: "test-token",
          isAuthenticated: true,
          account: { id: 1, restaurantId: 1, fullName: "Nguyễn Tấn Tài" },
        },
      }),
    )
  }, options.role ?? "BRANCH_MANAGER")
  await page.route("**/ws/**", (route) => route.abort())
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    }
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers })

    let data: unknown = []
    let status = 200
    if (path.endsWith("/branches/2")) data = { id: 2, name: "Chi nhánh Quận 1", status: "ACTIVE" }
    if (path.endsWith("/restaurants/1")) data = { id: 1, name: "Nhà hàng test" }
    if (path.endsWith("/operational-permissions/branches/2/me")) data = options.permissions ?? []
    if (path.endsWith("/tables/branch/2")) {
      requests.tables += 1
      status = options.tablesStatus?.() ?? 200
      data = options.tablesData ?? tables
    }
    if (path.endsWith("/table-sessions/branch/2/open")) {
      requests.sessions += 1
      status = options.sessionsStatus?.() ?? 200
      data = sessions
    }
    return route.fulfill({
      status,
      headers,
      json: status === 200 ? { data } : { message: "Tạm thời không tải được dữ liệu" },
    })
  })
  return requests
}

async function mockSockJsInfo(page: Page) {
  await page.route(/\/ws\/info(?:\?|$)/, (route) =>
    route.fulfill({
      headers: {
        "Access-Control-Allow-Origin": new URL(page.url()).origin,
        "Access-Control-Allow-Credentials": "true",
      },
      json: { websocket: true, cookie_needed: false, origins: ["*:*"], entropy: 123 },
    }),
  )
}

test("cashier receives distinct live notices for an opened QR and a verified transfer", async ({
  page,
}) => {
  await mockMap(page, { role: "CASHIER" })
  await mockSockJsInfo(page)
  let receive: ((type: string, id: number) => void) | undefined
  await page.routeWebSocket(/\/ws\/[^/]+\/[^/]+\/websocket$/, (socket) => {
    const send = (frame: string) => socket.send(`a${JSON.stringify([frame])}`)
    socket.onMessage((message) => {
      if (typeof message !== "string") return
      const [frame = ""] = JSON.parse(message) as string[]
      if (frame.startsWith("CONNECT")) send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\u0000")
      const destination = frame.match(/^destination:(.*)$/m)?.[1]
      const subscription = frame.match(/^id:(.*)$/m)?.[1]
      if (
        !frame.startsWith("SUBSCRIBE") ||
        destination !== "/topic/branch/2/payment-request" ||
        !subscription
      )
        return
      receive = (type, id) => {
        const body = JSON.stringify({
          type,
          notificationId: id,
          tableSessionId: 33,
          tableNo: "Bàn 07",
        })
        send(
          `MESSAGE\ndestination:${destination}\nsubscription:${subscription}\nmessage-id:${id}\n\n${body}\u0000`,
        )
      }
    })
    socket.send("o")
  })
  await page.goto("/thu-ngan/so-do-ban")
  await expect.poll(() => Boolean(receive)).toBe(true)
  receive!("PAYMENT_QR_OPENED", 101)
  await expect(page.getByText("Khách đã mở mã QR thanh toán", { exact: true })).toBeVisible()
  await expect(page.getByText("Ngân hàng đã xác nhận thanh toán", { exact: true })).toHaveCount(0)
  receive!("BANK_PAYMENT_VERIFIED", 102)
  await expect(page.getByText("Ngân hàng đã xác nhận thanh toán", { exact: true })).toBeVisible()
})

test("staff receives an open-table request and can find the waiting table from the inbox", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  const requests = await mockMap(page)
  const notice = {
    id: 101,
    type: "TABLE_OPEN_REQUESTED",
    branchId: 2,
    tableSessionId: 31,
    tableName: "Bàn 02",
    createdAt: new Date().toISOString(),
    read: false,
  }
  let received = false
  await page.route("**/api/v1/staff-notifications/branch/2**", (route) => {
    if (route.request().method() === "PUT") return route.fulfill({ status: 204 })
    return route.fulfill({ json: { data: received ? [notice] : [] } })
  })
  await page.route("**/api/v1/table-sessions/31", (route) =>
    route.fulfill({ json: { data: { ...sessions[0], branchId: 2 } } }),
  )
  await mockSockJsInfo(page)

  let deliver: (() => void) | undefined
  await page.routeWebSocket(/\/ws\/[^/]+\/[^/]+\/websocket$/, (socket) => {
    const send = (frame: string) => socket.send(`a${JSON.stringify([frame])}`)
    socket.onMessage((message) => {
      if (typeof message !== "string") return
      const [frame = ""] = JSON.parse(message) as string[]
      if (frame.startsWith("CONNECT")) send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\u0000")
      const destination = frame.match(/^destination:(.*)$/m)?.[1]
      const subscription = frame.match(/^id:(.*)$/m)?.[1]
      if (
        !frame.startsWith("SUBSCRIBE") ||
        !subscription ||
        destination !== "/topic/branch/2/table-open-request"
      )
        return
      deliver = () => {
        const body = JSON.stringify({
          type: notice.type,
          notificationId: notice.id,
          tableSessionId: notice.tableSessionId,
          tableNo: notice.tableName,
        })
        send(
          `MESSAGE\ndestination:${destination}\nsubscription:${subscription}\nmessage-id:101\n\n${body}\u0000`,
        )
      }
    })
    socket.send("o")
  })

  await page.goto(mapUrl)
  await expect(page.getByRole("button", { name: /Bàn 02.*Chờ mở bàn/ })).toBeVisible()
  await expect.poll(() => Boolean(deliver)).toBe(true)
  const before = requests.sessions
  received = true
  deliver!()
  deliver!()
  const toasts = page.locator(".toast-card").filter({ hasText: "Khách yêu cầu mở bàn" })
  await expect(toasts).toHaveCount(1)
  await expect(toasts.first()).toBeVisible()
  await expect(toasts.first()).toContainText("Bàn 02")
  const bounds = await toasts.first().boundingBox()
  expect(bounds!.y).toBeLessThan(32)
  expect(bounds!.x + bounds!.width).toBeGreaterThan(1408)
  await expect.poll(() => requests.sessions).toBeGreaterThan(before)

  await page.getByRole("main").getByRole("button", { name: "Thông báo", exact: true }).click()
  const inbox = page.getByRole("dialog", { name: "Thông báo" })
  const markedRead = page.waitForRequest(
    (request) => request.method() === "PUT" && request.url().endsWith("/101/read"),
  )
  await inbox.getByRole("button", { name: /Khách yêu cầu mở bàn.*Bàn 02/ }).click()
  await markedRead
  await expect(page).toHaveURL(/so-do-ban\?table=2$/)
  await page.getByRole("button", { name: /Bàn 02.*Chờ mở bàn/ }).click()
  await expect(page.getByRole("dialog", { name: "Mở bàn Bàn 02" })).toBeVisible()
})

test("shows new open-table requests from the inbox while the socket is unavailable", async ({
  page,
}) => {
  await page.clock.install()
  await mockMap(page)
  const saved = {
    id: 99,
    type: "TABLE_OPEN_REQUESTED",
    branchId: 2,
    tableSessionId: 31,
    tableName: "Bàn 01",
    read: false,
    createdAt: new Date().toISOString(),
  }
  let notices = [saved]
  await page.route("**/api/v1/staff-notifications/branch/2**", (route) =>
    route.fulfill({ json: { data: notices } }),
  )

  const inboxLoaded = page.waitForResponse("**/api/v1/staff-notifications/branch/2**")
  await page.goto(mapUrl)
  await inboxLoaded
  const toasts = page.locator(".toast-card").filter({ hasText: "Khách yêu cầu mở bàn" })
  await expect(toasts).toHaveCount(0)
  notices = [{ ...saved, id: 101, tableName: "Bàn 02" }, saved]
  await page.clock.runFor(10_100)
  await expect(toasts).toHaveCount(1)
  await expect(toasts.first()).toContainText("Bàn 02")
})

test("shows the role below the name and layers sidebar notifications above the table cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 700 })
  await mockMap(page)
  await page.goto(mapUrl)

  const sidebar = page.getByRole("complementary").filter({ hasText: "Nguyễn Tấn Tài" })
  const name = sidebar.getByText("Nguyễn Tấn Tài", { exact: true })
  const role = sidebar.getByText("Quản lý chi nhánh", { exact: true })
  await expect(name).toBeVisible()
  await expect(name).toHaveCSS("white-space", "nowrap")
  await expect(role).toHaveCSS("white-space", "nowrap")
  const [nameBounds, roleBounds] = await Promise.all([name.boundingBox(), role.boundingBox()])
  expect(roleBounds!.y).toBeGreaterThanOrEqual(nameBounds!.y + nameBounds!.height)
  const bell = sidebar.getByRole("button", { name: "Thông báo", exact: true })
  await bell.click()
  const panel = page.getByRole("dialog", { name: "Thông báo" })
  await expect(panel.getByText("Chưa có thông báo nào")).toBeVisible()
  await expect(panel).toBeInViewport({ ratio: 1 })
  await expect
    .poll(() =>
      panel.evaluate((element) => {
        const panelRect = element.getBoundingClientRect()
        return [...document.querySelectorAll("section[aria-label] button")].some((card) => {
          const cardRect = card.getBoundingClientRect()
          const left = Math.max(panelRect.left, cardRect.left)
          const right = Math.min(panelRect.right, cardRect.right)
          const top = Math.max(panelRect.top, cardRect.top)
          const bottom = Math.min(panelRect.bottom, cardRect.bottom)
          return (
            right > left &&
            bottom > top &&
            element.contains(document.elementFromPoint((left + right) / 2, (top + bottom) / 2))
          )
        })
      }),
    )
    .toBe(true)
  await page.keyboard.press("Escape")
  await expect(panel).toBeHidden()
  await expect(bell).toBeFocused()
})

test("keeps table map actions in one row after resizing and toggling the sidebar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  await mockMap(page)
  await page.route("**/api/v1/operational-permissions/branches/2/me", (route) =>
    route.fulfill({ json: { data: ["RESERVE_TABLE"] } }),
  )
  await page.goto(mapUrl)
  const book = page.getByRole("button", { name: "Đặt bàn", exact: true })
  const toolbar = book.locator("..")
  const sidebar = page.locator("#staff-sidebar-expanded")
  const collapse = page.getByRole("button", { name: "Thu gọn thanh bên" })
  const expand = page.getByRole("button", { name: "Mở rộng thanh bên" })

  await expect(collapse).toHaveAttribute("aria-expanded", "true")
  await expect(sidebar.getByRole("button", { name: "Thu gọn thanh bên" })).toHaveText("Thu gọn")
  const [navigationBounds, toggleBounds, accountBounds] = await Promise.all([
    sidebar.getByRole("navigation").boundingBox(),
    collapse.boundingBox(),
    sidebar.getByText("Nguyễn Tấn Tài", { exact: true }).boundingBox(),
  ])
  expect(toggleBounds!.y).toBeGreaterThanOrEqual(navigationBounds!.y + navigationBounds!.height)
  expect(toggleBounds!.y + toggleBounds!.height).toBeLessThan(accountBounds!.y)
  for (const width of [1440, 1220, 1024, 834, 768]) {
    await page.setViewportSize({ width, height: 800 })
    await expect(book).toBeInViewport({ ratio: 1 })
    const rows = await toolbar
      .locator(":scope > :is(a, button)")
      .evaluateAll((controls) => controls.map((control) => control.getBoundingClientRect().top))
    expect(rows).toHaveLength(5)
    expect(Math.max(...rows) - Math.min(...rows)).toBeLessThan(1)
    expect(await book.evaluate((button) => button.getBoundingClientRect().right)).toBeLessThan(
      width,
    )
  }

  await expect(sidebar).toBeHidden()
  await expand.click()
  await expect(sidebar).toBeVisible()
  await expect(collapse).toBeFocused()
  await expect(book).toBeInViewport({ ratio: 1 })
  await page.setViewportSize({ width: 1440, height: 800 })
  await collapse.click()
  await expect(sidebar).toBeHidden()
  await expect(expand).toBeFocused()
  await expect(page.getByRole("link", { name: "Sơ đồ bàn", exact: true })).toBeVisible()
  await book.click()
  await expect(page.getByRole("dialog", { name: /Đặt bàn/ })).toBeVisible()
})

test("keeps order notifications on the kitchen queue, selects the exact round and persists read state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockMap(page, { permissions: ["CONFIRM_ORDER"] })
  const history = new Map<
    number,
    {
      id: number
      orderId: number
      branchId: number
      tableSessionId: number
      tableName: string
      type: string
      createdAt: string
      read: boolean
    }
  >()
  const inboxPath = /\/staff-notifications\/branch\/2(?:\/.*)?$/
  await page.route(inboxPath, (route) => {
    if (route.request().method() === "DELETE") {
      history.clear()
      return route.fulfill({ status: 204 })
    }
    const reading = route
      .request()
      .url()
      .match(/\/(\d+)\/read$/)
    if (reading) {
      const item = history.get(Number(reading[1]))
      if (item) item.read = true
      return route.fulfill({ status: 204 })
    }
    return route.fulfill({ json: { data: [...history.values()].reverse() } })
  })
  await page.route("**/api/v1/table-sessions/31", (route) =>
    route.fulfill({
      json: { data: { id: 31, branchId: 2, tableId: 2, tableName: "bàn là", status: "SERVING" } },
    }),
  )
  await page.route("**/api/v1/table-sessions/branch/2/open", (route) =>
    route.fulfill({
      json: {
        data: [
          { id: 31, branchId: 2, tableId: 2, tableName: "bàn là", status: "SERVING" },
          { id: 32, branchId: 2, tableId: 3, tableName: "Bàn khác", status: "SERVING" },
        ],
      },
    }),
  )
  await page.route(/\/order-details\/session\/31(?:\?|$)/, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 1001,
            orderId: 101,
            dishId: 1,
            dishName: "Cơm sườn",
            quantity: 1,
            priceAtOrderTime: 30000,
            status: "PENDING",
          },
          {
            id: 1002,
            orderId: 102,
            dishId: 1,
            dishName: "Cơm sườn",
            quantity: 2,
            priceAtOrderTime: 30000,
            status: "PENDING",
          },
          {
            id: 1003,
            orderId: 103,
            dishId: 1,
            dishName: "Cơm sườn",
            quantity: 1,
            priceAtOrderTime: 30000,
            status: "SERVED",
          },
        ],
      },
    }),
  )
  await page.route(/\/order-details\/session\/32(?:\?|$)/, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 1004,
            orderId: 104,
            dishId: 2,
            dishName: "Phở bò",
            quantity: 1,
            status: "PREPARING",
          },
        ],
      },
    }),
  )
  await mockSockJsInfo(page)
  let pushOrder: ((orderId: number, orderedById?: number) => void) | undefined
  await page.routeWebSocket(/\/ws\/[^/]+\/[^/]+\/websocket$/, (socket) => {
    const send = (frame: string) => socket.send(`a${JSON.stringify([frame])}`)
    socket.onMessage((message) => {
      if (typeof message !== "string") return
      const [frame = ""] = JSON.parse(message) as string[]
      if (frame.startsWith("CONNECT")) send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\u0000")
      const destination = frame.match(/^destination:(.*)$/m)?.[1]
      const subscription = frame.match(/^id:(.*)$/m)?.[1]
      if (
        !frame.startsWith("SUBSCRIBE") ||
        destination !== "/topic/branch/2/new-order" ||
        !subscription
      )
        return
      pushOrder = (orderId, orderedById) => {
        if (!history.has(orderId))
          history.set(orderId, {
            id: orderId,
            orderId,
            branchId: 2,
            tableSessionId: 31,
            tableName: "bàn là",
            type: "NEW_ORDER",
            createdAt: new Date().toISOString(),
            read: false,
          })
        const body = JSON.stringify({
          type: "NEW_ORDER",
          notificationId: orderId,
          orderId,
          tableSessionId: 31,
          tableNo: "bàn là",
          orderedById,
        })
        send(
          `MESSAGE\ndestination:${destination}\nsubscription:${subscription}\nmessage-id:${orderId}\n\n${body}\u0000`,
        )
      }
    })
    socket.send("o")
  })
  await page.goto("/quan-ly-chi-nhanh/order-che-bien")
  await page.getByRole("button", { name: /^Đang chế biến/ }).click()
  await expect.poll(() => Boolean(pushOrder)).toBe(true)
  pushOrder!(101, 1)
  pushOrder!(102)
  pushOrder!(102)
  pushOrder!(103, 9)
  const toast = page.getByText("Có món mới", { exact: true })
  await expect(toast).toHaveCount(2)
  await expect(page.getByText("Bàn là · Lượt gọi #101", { exact: true })).toHaveCount(0)

  const bell = page
    .getByRole("complementary")
    .getByRole("button", { name: "Thông báo", exact: true })
  await bell.click()
  const panel = page.getByRole("dialog", { name: "Thông báo" })
  await expect(panel.getByText("3 mới", { exact: true })).toBeVisible()
  await panel.getByText("3 lượt gọi · 3 chưa đọc", { exact: true }).click()
  await expect(panel.getByRole("button", { name: /Lượt gọi #102/ })).toHaveCount(1)
  await panel.getByRole("button", { name: /Lượt gọi #101/ }).click()
  await expect(page).toHaveURL(/\/order-che-bien\?session=31&round=101$/)
  const ticket = page.getByRole("article", { name: "bàn là", exact: true })
  await expect(ticket.getByText("1 phần · Lượt #101")).toBeInViewport()
  await expect(page.getByRole("article", { name: "Bàn khác" })).toBeVisible()
  await ticket.getByRole("button", { name: "Xác nhận món" }).click()
  const review = page.getByRole("dialog", { name: /Xác nhận món theo bàn/ })
  await expect(review.getByText("Đã chọn 1/3 phần")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(panel).toBeHidden()
  await page.reload()
  await bell.click()
  await expect(panel.getByText("3 lượt gọi · 2 chưa đọc", { exact: true })).toBeVisible()
  await panel.getByText("3 lượt gọi · 2 chưa đọc", { exact: true }).click()
  await panel.getByRole("button", { name: /Lượt gọi #103/ }).click()
  await expect(page).toHaveURL(/\/order-che-bien\?session=31&round=103$/)
  await expect(page.getByText("Đã rời hàng chế biến.")).toBeVisible()
  await expect(page.getByRole("link", { name: "Xem đơn món" })).toHaveAttribute(
    "href",
    "/quan-ly-chi-nhanh/order/31?round=103",
  )
  await bell.click()
  await panel.getByRole("button", { name: "Đóng thông báo" }).click()
  await expect(panel).toBeHidden()
  await bell.click()
  await expect(panel.getByText("3 lượt gọi · 1 chưa đọc", { exact: true })).toBeVisible()
  await panel.getByRole("button", { name: "Tùy chọn thông báo" }).click()
  await panel.getByRole("button", { name: "Ẩn tất cả của tôi" }).click()
  await expect(panel.getByText("Chưa có thông báo nào")).toBeVisible()
  await page.reload()
  await bell.click()
  await expect(panel.getByText("Chưa có thông báo nào")).toBeVisible()
})

test("staff calls can be resolved from the table, payment opens checkout and closed sessions stay closed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockMap(page)
  const entries = [
    { id: 121, tableSessionId: 31, tableName: "Bàn 2", type: "STAFF_CALL", dishName: "Cơm sườn" },
    { id: 122, tableSessionId: 33, tableName: "Bàn 7", type: "PAYMENT_REQUESTED" },
    { id: 123, tableSessionId: 34, tableName: "Bàn 8", type: "NEW_ORDER", orderId: 100 },
  ]
  let resolvedAt: string | null = null
  await page.route(/\/staff-notifications\/branch\/2(?:\/.*)?$/, (route) => {
    if (route.request().method() === "PUT") {
      if (route.request().url().endsWith("/121/resolve")) resolvedAt = new Date().toISOString()
      return route.fulfill({ status: 204 })
    }
    return route.fulfill({
      json: {
        data: entries.map((item) => ({
          ...item,
          branchId: 2,
          createdAt: new Date().toISOString(),
          read: false,
          resolvedAt: item.id === 121 ? resolvedAt : null,
        })),
      },
    })
  })
  await page.route(/\/table-sessions\/(31|33|34)$/, (route) => {
    const id = Number(route.request().url().split("/").at(-1))
    return route.fulfill({
      json: {
        data: {
          id,
          branchId: 2,
          tableId: id - 29,
          tableName: "Bàn test",
          status: id === 31 ? "SERVING" : id === 33 ? "WAITING_FOR_PAY" : "CLOSED",
        },
      },
    })
  })
  await page.goto(mapUrl)
  const bell = page
    .getByRole("complementary")
    .getByRole("button", { name: "Thông báo", exact: true })
  const panel = page.getByRole("dialog", { name: "Thông báo" })
  await bell.click()
  await panel.getByRole("button", { name: /Có món mới.*Bàn 8/ }).click()
  await expect(page.getByText("Phiên bàn đã kết thúc", { exact: true })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`${mapUrl}$`))
  await bell.click()
  await panel.getByRole("button", { name: /Khách gọi nhân viên.*Bàn 2/ }).click()
  await expect(page).toHaveURL(/\/order\/31\?staffCall=121$/)
  const call = page.getByRole("region", { name: "Yêu cầu gọi nhân viên" })
  await expect(call.getByText("Món “Cơm sườn”")).toBeVisible()
  await call.getByRole("button", { name: "Đánh dấu đã xử lý" }).click()
  await expect(call.getByText("Đã xử lý", { exact: true })).toBeVisible()
  await bell.click()
  await panel.getByRole("button", { name: /Yêu cầu tính tiền.*Bàn 7/ }).click()
  await expect(page).toHaveURL(/\/thanh-toan\/33$/)
})

test("groups tables by area and supports touch-sized cards and search on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockMap(page)
  await page.goto(mapUrl)

  const floor = page.getByRole("region", { name: "Tầng 1", exact: true })
  const garden = page.getByRole("region", { name: "Sân vườn", exact: true })
  await expect(floor.getByRole("button")).toHaveCount(6)
  await expect(floor.getByRole("button", { name: /^Bàn 01/ })).toBeEnabled()
  await expect(garden.getByRole("button")).toHaveCount(6)
  await expect(
    page.getByRole("region", { name: "Chưa phân khu" }).getByRole("button", { name: /^Bàn 13/ }),
  ).toBeVisible()

  const first = (await floor.getByRole("button").nth(0).boundingBox())!
  const second = (await floor.getByRole("button").nth(1).boundingBox())!
  expect(first.height).toBeGreaterThanOrEqual(44)
  expect(first.height).toBeLessThan(130)
  expect(second.x).toBeGreaterThan(first.x)
  expect(second.y).toBe(first.y)
  await expect(floor.getByRole("button").last()).toBeInViewport()

  const search = page.getByRole("textbox", { name: "Tìm bàn", exact: true })
  await page.getByRole("button", { name: "Danh sách đặt bàn" }).click()
  const reservations = page.getByRole("dialog", { name: "Bàn đặt trước" })
  await expect(reservations).toBeVisible()
  await reservations.getByRole("button", { name: "Đóng", exact: true }).click()
  await expect(reservations).toBeHidden()

  await search.fill("san vuon")
  await expect(floor).toHaveCount(0)
  await expect(garden.getByRole("button")).toHaveCount(6)
  await page
    .getByRole("group", { name: "Lọc trạng thái bàn" })
    .getByRole("button", { name: "Chờ thanh toán" })
    .click()
  await expect(garden.getByRole("button")).toHaveCount(1)
  await expect(garden.getByRole("button", { name: /^Bàn 07/ })).toBeVisible()

  await search.fill("ban 99")
  await expect(page.getByText("Không tìm thấy bàn nào phù hợp")).toBeVisible()
  await page.getByRole("button", { name: "Đặt lại bộ lọc" }).click()
  await expect(search).toHaveValue("")

  await page.setViewportSize({ width: 320, height: 720 })
  const right = (await floor.getByRole("button").nth(1).boundingBox())!
  expect(right.x + right.width).toBeLessThanOrEqual(320)
  await floor.getByRole("button", { name: /^Bàn 01/ }).focus()
  await page.keyboard.press("Enter")
  await expect(
    page.getByRole("dialog", { name: "Mở bàn Bàn 01" }).getByText(/^Tầng 1 ·/),
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog", { name: "Mở bàn Bàn 01" })).toBeHidden()

  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(search).toBeVisible()
  await expect(floor).toBeVisible()
  await expect(garden).toBeVisible()
})

test("shows a retry for initial API errors and distinguishes a recovered empty branch", async ({
  page,
}) => {
  let healthy = false
  const requests = await mockMap(page, {
    tablesStatus: () => (healthy ? 200 : 500),
    sessionsStatus: () => (healthy ? 200 : 500),
    tablesData: [],
    permissions: ["RESERVE_TABLE"],
  })
  await page.goto(mapUrl)
  const alert = page.getByRole("alert").filter({ hasText: "Không tải được sơ đồ bàn" })
  await expect(alert).toBeVisible({ timeout: 12000 })
  await expect(page.getByText("Không tìm thấy bàn nào phù hợp")).toHaveCount(0)
  await expect(page.getByText("Chi nhánh chưa có bàn")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Đặt bàn", exact: true })).toBeDisabled()
  const retry = page.getByRole("button", { name: "Thử lại", exact: true })
  await expect(retry).toBeEnabled()
  const previousRequests = { ...requests }
  healthy = true
  // Dispatch in the current frame so the manual retry precedes the next polling tick.
  await retry.evaluate((button: HTMLButtonElement) => button.click())
  await expect(page.getByText("Chi nhánh chưa có bàn")).toBeVisible()
  await expect(alert).toHaveCount(0)
  expect(requests.tables).toBeGreaterThan(previousRequests.tables)
  expect(requests.sessions).toBeGreaterThan(previousRequests.sessions)
})

test("combines area, minimum capacity, status and search and resets them together", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockMap(page)
  await page.goto(mapUrl)

  const area = page.getByRole("combobox", { name: "Khu vực", exact: true })
  const capacity = page.getByRole("combobox", { name: "Sức chứa tối thiểu" })
  const statusFilters = page.getByRole("group", { name: "Lọc trạng thái bàn" })
  const search = page.getByRole("textbox", { name: "Tìm bàn", exact: true })
  const garden = page.getByRole("region", { name: "Sân vườn", exact: true })
  await expect(area).toHaveText("Tất cả khu vực")
  await expect(capacity).toHaveText("Mọi sức chứa")

  await capacity.click()
  await page.getByRole("option", { name: "Từ 5 chỗ", exact: true }).click()
  await expect(garden.getByRole("button", { name: /^Bàn 07/ })).toContainText("8 chỗ")
  await expect(garden.getByRole("button", { name: /^Bàn 08/ })).toContainText("6 chỗ")
  await expect(garden.getByRole("button", { name: /^Bàn 09/ })).toHaveCount(0)
  await expect(page.getByRole("region", { name: "Chưa phân khu" })).toHaveCount(0)

  await statusFilters.getByRole("button", { name: "Trống", exact: true }).click()
  await area.click()
  await page.getByRole("option", { name: "Sân vườn", exact: true }).click()
  await expect(page.getByRole("region", { name: "Tầng 1", exact: true })).toHaveCount(0)
  await expect(garden.getByRole("button")).toHaveCount(1)
  await expect(garden.getByRole("button", { name: /^Bàn 08/ })).toBeVisible()

  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(area).toHaveText("Sân vườn")
  await search.fill("ban 07")
  await expect(page.getByText("Không tìm thấy bàn nào phù hợp")).toBeVisible()
  await page.getByRole("button", { name: "Đặt lại bộ lọc" }).click()
  await expect(area).toHaveText("Tất cả khu vực")
  await expect(capacity).toHaveText("Mọi sức chứa")
  await expect(search).toHaveValue("")
  await expect(statusFilters.getByRole("button", { name: "Trống", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  )
  await expect(garden.getByRole("button")).toHaveCount(6)
})

test("retains the last table states but disables interaction while session data is stale", async ({
  page,
}) => {
  let healthy = true
  await mockMap(page, { sessionsStatus: () => (healthy ? 200 : 500) })
  await page.goto(mapUrl)
  const table = page.getByRole("button", { name: /^Bàn 07/ })
  await expect(table).toBeEnabled()
  await expect(table).toContainText("Chờ thanh toán")
  healthy = false
  const alert = page.getByRole("alert").filter({ hasText: "Chưa cập nhật được sơ đồ bàn" })
  await expect(alert).toBeVisible({ timeout: 12000 })
  await expect(table).toBeDisabled()
  await expect(table).toContainText("Chờ thanh toán")
  healthy = true
  await expect(alert).toHaveCount(0, { timeout: 12000 })
  await expect(table).toBeEnabled()
})
