import { test, expect, type Page } from "@playwright/test"

const table = {
  tableId: 1,
  branchId: 1,
  tableName: "Bàn test",
  branchName: "Chi nhánh test",
  restaurantName: "Nhà hàng test",
  locationRequired: true,
  joinRequired: false,
}
const session = {
  id: 10,
  tableId: 1,
  branchId: 1,
  tableName: "Bàn test",
  status: "WAITING_FOR_OPEN",
  guestCount: 2,
}
const TOKEN = "server-issued-guest-capability"

test("confirms the invoice total before showing the guest payment QR", async ({ page }) => {
  await page.addInitScript(
    ({ token, session }) => {
      sessionStorage.setItem(
        "restaurant-guest-credential-v1",
        JSON.stringify({ sessionId: session.id, token }),
      )
    },
    { token: TOKEN, session },
  )
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    }
    if (route.request().method() === "OPTIONS" || path.endsWith("/qr-opened"))
      return route.fulfill({ status: 204, headers })
    let data: unknown = {
      id: 45,
      tableSessionId: 10,
      invoiceNumber: "HD-45",
      grandTotal: 22680,
      status: "PENDING",
    }
    if (path.endsWith("/tables/branch/1/qr/QR-B1-T1")) data = { id: 1, name: "Bàn test" }
    if (path.endsWith("/table-sessions/table/1/open"))
      data = { ...session, status: "WAITING_FOR_PAY" }
    if (path.endsWith("/qr-code"))
      data = {
        invoiceId: 45,
        remainingAmount: 22680,
        grandTotal: 22680,
        totalPaid: 0,
        bankName: "MB",
        accountNo: "123456789",
        accountName: "Chi nhánh",
        transferContent: "PV45X",
        automaticVerification: true,
        qrImageUrl:
          "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='1'%20height='1'/%3E",
      }
    return route.fulfill({ headers, json: { data } })
  })
  const reported = page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().endsWith("/invoices/session/10/qr-opened"),
  )
  await page.goto("/table/QR-B1-T1/payment-qr")
  const request = await reported
  expect(request.headers()["x-guest-token"]).toBe(TOKEN)
  expect(request.postDataJSON()).toEqual({ expectedTotal: 22680 })
  await expect(page.getByRole("img", { name: "VietQR Thanh toán" })).toBeVisible()
})

async function mockApi(page: Page, info = table, activeSession = session) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url())
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
      })
      return
    }
    let data: unknown = []
    if (url.pathname.endsWith("/guest/table")) data = info
    else if (url.pathname.endsWith("/guest/access")) data = { token: TOKEN, session: activeSession }
    else if (/\/table-sessions\/(10|table\/1\/open)$/.test(url.pathname)) data = activeSession
    await route.fulfill({
      json: { status: 200, message: "OK", data },
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  })
}

test("a printed QR link still opens a guest session and polling uses only the server token", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation({ latitude: 10, longitude: 106, accuracy: 10 })
  await page.addInitScript(() =>
    localStorage.setItem(
      "pho-viet-auth-tokens",
      JSON.stringify({ accessToken: "staff-token-must-not-leak", refreshToken: "staff-refresh" }),
    ),
  )
  await mockApi(page)
  await page.goto("/ban/QR-B1-T1?source=printed#table")
  await expect(page).toHaveURL("/table/QR-B1-T1?source=printed#table")
  const admission = page.waitForRequest((r) => r.url().endsWith("/guest/access"))
  await page.getByRole("button", { name: "Gửi yêu cầu mở bàn" }).click()
  const request = await admission
  expect(request.postDataJSON().location.latitude).toBe(10)
  expect(request.headers().authorization).toBeUndefined()
  await expect(page).toHaveURL(/waiting-for-table/)
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(sessionStorage.getItem("restaurant-guest-credential-v1") ?? "null")?.token,
      ),
    )
    .toBe(TOKEN)
  const polling = await page.waitForRequest((r) => /table-sessions\/10$/.test(r.url()))
  expect(polling.headers()["x-guest-token"]).toBe(TOKEN)
  await page.reload()
  await expect(page).toHaveURL(/waiting-for-table/)
})

test("permission denied gives staff assistance and sends no admission", async ({
  page,
  context,
}) => {
  await context.clearPermissions()
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, failure) =>
      failure?.({ code: 1, message: "denied" } as GeolocationPositionError)
  })
  let admissions = 0
  page.on("request", (r) => {
    if (r.url().endsWith("/guest/access")) admissions++
  })
  await mockApi(page)
  await page.goto("/table/QR-B1-T1")
  await page.getByRole("button", { name: "Gửi yêu cầu mở bàn" }).click()
  await expect(page.getByRole("alert")).toContainText("Không lấy được vị trí")
  expect(admissions).toBe(0)
})

test("location failure can use an optional staff assistance code", async ({ page }) => {
  await mockApi(page, { ...table, joinRequired: true })
  await page.goto("/table/QR-B1-T1")
  await expect(page.getByLabel("Mã hỗ trợ", { exact: true })).toHaveCount(0)
  await page.getByText("Không thể định vị? Nhờ nhân viên hỗ trợ", { exact: true }).click()
  await page.getByRole("checkbox").check()
  await page.getByLabel("Mã hỗ trợ", { exact: true }).fill("12345678")
  const admission = page.waitForRequest((r) => r.url().endsWith("/guest/access"))
  await page.getByRole("button", { name: "Đúng bàn, tiếp tục" }).click()
  const body = (await admission).postDataJSON()
  expect(body.joinCode).toBe("12345678")
  expect(body.location).toBeUndefined()
  await expect(page).toHaveURL(/waiting-for-table/)
})

test("a backend rejection is shown and does not save a token", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation({ latitude: 11, longitude: 106 })
  await mockApi(page)
  await page.route("**/api/v1/guest/access", (route) =>
    route.fulfill({
      status: 403,
      json: { message: "Bạn đang ngoài phạm vi gọi món của chi nhánh." },
      headers: { "Access-Control-Allow-Origin": "*" },
    }),
  )
  await page.goto("/table/QR-B1-T1")
  await page.getByRole("button", { name: "Gửi yêu cầu mở bàn" }).click()
  await expect(page.getByRole("alert")).toContainText("ngoài phạm vi")
  expect(
    await page.evaluate(() => sessionStorage.getItem("restaurant-guest-credential-v1")),
  ).toBeNull()
})

test("a disabled geofence does not request device location", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = () => {
      throw new Error("must not ask for location")
    }
  })
  await mockApi(page, { ...table, locationRequired: false })
  await page.goto("/table/QR-B1-T1")
  const admission = page.waitForRequest((r) => r.url().endsWith("/guest/access"))
  await page.getByRole("button", { name: "Gửi yêu cầu mở bàn" }).click()
  expect((await admission).postDataJSON().location).toBeUndefined()
  await expect(page).toHaveURL(/waiting-for-table/)
})

test("existing table needs only table confirmation and valid location", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation({ latitude: 10, longitude: 106, accuracy: 10 })
  await mockApi(page, { ...table, joinRequired: true })
  await page.goto("/table/QR-B1-T1")
  await expect(page.getByRole("heading", { name: "Bạn đang ngồi tại Bàn test?" })).toBeVisible()
  await expect(page.getByLabel("Mã hỗ trợ", { exact: true })).toHaveCount(0)
  const admission = page.waitForRequest((r) => r.url().endsWith("/guest/access"))
  await page.getByRole("button", { name: "Đúng bàn, tiếp tục" }).click()
  const body = (await admission).postDataJSON()
  expect(body.joinCode).toBeUndefined()
  expect(body.location.latitude).toBe(10)
  await expect(page).toHaveURL(/waiting-for-table/)
})

test("existing table with geofence disabled joins without a code or location", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = () => {
      throw new Error("must not request location")
    }
  })
  await mockApi(page, { ...table, joinRequired: true, locationRequired: false })
  await page.goto("/table/QR-B1-T1")
  await expect(page.getByLabel("Mã hỗ trợ", { exact: true })).toHaveCount(0)
  const admission = page.waitForRequest((r) => r.url().endsWith("/guest/access"))
  await page.getByRole("button", { name: "Đúng bàn, tiếp tục" }).click()
  const body = (await admission).postDataJSON()
  expect(body.joinCode).toBeUndefined()
  expect(body.location).toBeUndefined()
  await expect(page).toHaveURL(/waiting-for-table/)
})

test("a valid credential resumes the table without confirmation or location", async ({ page }) => {
  await page.addInitScript((token) => {
    sessionStorage.setItem(
      "restaurant-guest-credential-v1",
      JSON.stringify({ sessionId: 10, token }),
    )
    navigator.geolocation.getCurrentPosition = () => {
      throw new Error("must not request location on resume")
    }
  }, TOKEN)
  await mockApi(page, { ...table, joinRequired: true })
  let admissions = 0
  page.on("request", (r) => {
    if (r.url().endsWith("/guest/access")) admissions++
  })
  await page.goto("/table/QR-B1-T1")
  await expect(page).toHaveURL(/waiting-for-table/)
  expect(admissions).toBe(0)
})

test("a serving table opens the menu after confirmation", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation({ latitude: 10, longitude: 106, accuracy: 10 })
  await mockApi(page, { ...table, joinRequired: true }, { ...session, status: "SERVING" })
  await page.goto("/table/QR-B1-T1")
  await page.getByRole("button", { name: "Đúng bàn, tiếp tục" }).click()
  await expect(page).toHaveURL(/menu/)
})

test("restores the unsent cart after reload until it expires or the table session changes", async ({
  page,
}) => {
  const start = Date.now()
  await page.clock.setFixedTime(start)
  let sessionId = session.id
  let rejectOrder = true
  const dish = {
    dishId: 7,
    dishName: "Chả giò",
    categoryId: 1,
    categoryName: "Khai vị",
    basePrice: 59000,
    effectivePrice: 59000,
    isHidden: false,
  }

  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith("/orders") && route.request().method() === "POST") {
      return rejectOrder
        ? route.fulfill({ status: 400, json: { message: "Không thể gửi món" } })
        : route.fulfill({ json: { data: { id: 91 } } })
    }
    let data: unknown = []
    if (path.endsWith("/tables/branch/1/qr/QR-B1-T1")) data = { id: 1 }
    if (/\/table-sessions\/(10|11|table\/1\/open)$/.test(path)) {
      data = { ...session, id: sessionId, status: "SERVING" }
    }
    if (path.endsWith("/branches/1/menu")) data = [dish]
    return route.fulfill({ json: { data } })
  })

  const menu = "/table/QR-B1-T1/menu"
  const addDish = page.getByRole("button", { name: "Thêm Chả giò" })
  const viewCart = page.getByRole("button", { name: /Xem giỏ hàng/ })
  const emptyCart = page.getByRole("heading", { name: "Giỏ hàng đang trống" })
  const doublePrice = page.getByText("118.000đ", { exact: true })
  const triplePrice = page.getByText("177.000đ", { exact: true })
  const confirmSend = page.getByRole("dialog", { name: "Gửi món xuống bếp?" })

  await page.goto(menu)
  await addDish.click()
  await addDish.click()
  await viewCart.click()
  await page.reload()
  await expect(page.getByText("Chả giò", { exact: true })).toBeVisible()
  await expect(doublePrice).toHaveCount(2)

  await page.clock.setFixedTime(start + 59 * 60 * 1000)
  await page.reload()
  await expect(doublePrice).toHaveCount(2)
  await page.getByRole("button", { name: "Tăng số lượng" }).click()

  await page.clock.setFixedTime(start + 60 * 60 * 1000)
  await page.reload()
  await expect(triplePrice).toHaveCount(2)

  await page.clock.setFixedTime(start + 119 * 60 * 1000)
  await page.reload()
  await expect(emptyCart).toBeVisible()

  await page.getByRole("button", { name: "Xem thực đơn" }).click()
  await addDish.click()
  await viewCart.click()
  sessionId++
  await page.reload()
  await expect(emptyCart).toBeVisible()

  await page.getByRole("button", { name: "Xem thực đơn" }).click()
  await addDish.click()
  await viewCart.click()
  await page.getByRole("button", { name: "Gửi món", exact: true }).click()
  await confirmSend.getByRole("button", { name: "Gửi món", exact: true }).click()
  await expect(page.getByText("Lỗi gửi order", { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText("Chả giò", { exact: true })).toBeVisible()

  rejectOrder = false
  await page.getByRole("button", { name: "Gửi món", exact: true }).click()
  await confirmSend.getByRole("button", { name: "Gửi món", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Đã gửi món!" })).toBeVisible()
  await page.reload()
  await expect(emptyCart).toBeVisible()
})

test("opens the guest menu after a session update arrives over WebSocket", async ({ page }) => {
  await page.addInitScript(() => {
    const schedule = window.setInterval.bind(window)
    window.setInterval = (handler, delay, ...args) =>
      schedule(handler, delay === 1000 ? 60_000 : delay, ...args)
  })
  const activeSession = { ...session, restaurantId: 1 }
  await mockApi(page, { ...table, locationRequired: false }, activeSession)

  await page.route(/\/ws\/info(?:\?|$)/, (route) =>
    route.fulfill({
      headers: { "Access-Control-Allow-Origin": "*" },
      json: { websocket: true, cookie_needed: false, origins: ["*:*"], entropy: 123 },
    }),
  )
  let sentCredential: string | undefined
  let publish: (() => void) | undefined
  await page.routeWebSocket(/\/ws\/[^/]+\/[^/]+\/websocket$/, (socket) => {
    const send = (frame: string) => socket.send("a" + JSON.stringify([frame]))
    socket.onMessage((message) => {
      if (typeof message !== "string") return
      const [frame = ""] = JSON.parse(message) as string[]
      if (frame.startsWith("CONNECT")) {
        sentCredential = frame.match(/^X-Guest-Token:(.*)$/m)?.[1]
        send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\u0000")
      }
      const destination = frame.match(/^destination:(.*)$/m)?.[1]
      const subscription = frame.match(/^id:(.*)$/m)?.[1]
      if (
        frame.startsWith("SUBSCRIBE") &&
        destination === "/topic/session/10/session-updated" &&
        subscription
      ) {
        publish = () =>
          send(
            "MESSAGE\ndestination:" +
              destination +
              "\nsubscription:" +
              subscription +
              '\nmessage-id:1\n\n{"changed":true}\u0000',
          )
      }
    })
    socket.send("o")
  })

  await page.goto("/table/QR-B1-T1")
  await page.getByRole("button", { name: "Gửi yêu cầu mở bàn" }).click()
  await expect(page).toHaveURL(/waiting-for-table/)
  await expect.poll(() => Boolean(publish)).toBe(true)
  expect(sentCredential).toBe(TOKEN)
  activeSession.status = "SERVING"
  publish!()
  await expect(page).toHaveURL(/menu/, { timeout: 1500 })
})
