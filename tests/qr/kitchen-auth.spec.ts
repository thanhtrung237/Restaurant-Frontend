import { test, expect, type Page } from "@playwright/test"

test.use({ timezoneId: "UTC" })

const STAFF_TOKEN = "staff-token-before-refresh"
const NEW_TOKEN = "staff-token-after-refresh"
const DISH = "Phở bò tái nạm kiểm thử"
const session = { id: 12, tableId: 12, tableName: "Bàn 12", branchId: 1, guestCount: 2, status: "SERVING" }
const detail = { id: 31, orderId: 20, dishId: 7, dishName: DISH, quantity: 6,
  priceAtOrderTime: 45000, price: 270000, isTakeAway: false, status: "PENDING", createdAt: new Date().toISOString() }

async function signIn(page: Page) {
  await page.addInitScript(({ token }) => {
    localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: token, refreshToken: "refresh-token" }))
    localStorage.setItem("pho-viet-auth", JSON.stringify({ state: {
      account: { id: 1, restaurantId: 1, fullName: "Quản lý test", username: "manager", status: "ACTIVE" },
      role: "BRANCH_MANAGER", branchId: 1, accessToken: token, assignmentId: 1, isAuthenticated: true,
    }, version: 0 }))
  }, { token: STAFF_TOKEN })
}

async function kitchenApi(page: Page, mode: "normal" | "forbidden" | "refresh",
  getDetails: (id: number) => Array<typeof detail> = () => [detail], openSessions = [session]) {
  const headers: Array<string | undefined> = []
  let refreshed = false
  await page.route("**/ws/info?*", (route) => route.fulfill({
    headers: { "Access-Control-Allow-Origin": "*" },
    json: { websocket: true, cookie_needed: false, origins: ["*:*"], entropy: 123 },
  }))
  await page.routeWebSocket(/\/ws\/[^/]+\/[^/]+\/websocket$/, (socket) => socket.send("o"))
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" }
    if (request.method() === "OPTIONS") { await route.fulfill({ status: 204, headers: cors }); return }
    if (path.endsWith("/auth/refresh-token")) {
      refreshed = true
      await route.fulfill({ headers: cors, json: { data: { accessToken: NEW_TOKEN, refreshToken: "refresh-token" } } }); return
    }
    const sessionMatch = path.match(/\/order-details\/session\/(\d+)$/)
    if (sessionMatch) {
      const auth = request.headers().authorization
      headers.push(auth)
      const expected = refreshed ? NEW_TOKEN : STAFF_TOKEN
      if (mode === "forbidden" || auth !== 'Bearer ' + expected) {
        await route.fulfill({ status: 403, headers: cors, json: { message: "Không có quyền xem món của chi nhánh này" } }); return
      }
      if (mode === "refresh" && !refreshed) {
        await route.fulfill({ status: 401, headers: cors, json: { message: "Token hết hạn" } }); return
      }
      await route.fulfill({ headers: cors, json: { data: getDetails(Number(sessionMatch[1])) } }); return
    }
    let data: unknown = []
    if (path.endsWith("/operational-permissions/branches/1/me")) data = ["CONFIRM_ORDER", "WEIGH_ORDER", "SERVE_ORDER", "RESERVE_TABLE"]
    if (path.endsWith("/table-sessions/branch/1/open")) data = openSessions
    else if (path.endsWith("/branches/1")) data = { id: 1, restaurantId: 1, name: "Chi nhánh test", status: "ACTIVE" }
    else if (path.endsWith("/restaurants/1")) data = { id: 1, name: "Nhà hàng test", status: "ACTIVE" }
    else if (path.includes("/assignments/account/")) data = [{ id: 1, accountId: 1, branchId: 1, branchName: "Chi nhánh test", roleCode: "BRANCH_MANAGER", roleName: "Quản lý chi nhánh" }]
    await route.fulfill({ headers: cors, json: { data } })
  })
  return headers
}

test("kitchen initial load and repeated polling always send staff authentication", async ({ page }) => {
  await signIn(page)
  const headers = await kitchenApi(page, "normal")
  await page.goto("/quan-ly-chi-nhanh/bep")
  await expect(page.getByText(DISH, { exact: true })).toBeVisible()
  await expect.poll(() => headers.length).toBeGreaterThanOrEqual(3)
  expect(headers.every((value) => value === 'Bearer ' + STAFF_TOKEN)).toBe(true)
  await expect(page.getByText(DISH, { exact: true })).toBeVisible()
})

test("kitchen displays forbidden errors and stops unauthorized polling", async ({ page }) => {
  await signIn(page)
  const headers = await kitchenApi(page, "forbidden")
  await page.goto("/quan-ly-chi-nhanh/bep")
  await expect(page.getByRole("alert")).toContainText("Không có quyền xem món")
  const count = headers.length
  await page.waitForTimeout(2200)
  expect(headers.length).toBe(count)
})

test("kitchen refreshes an expired token and polls with the replacement token", async ({ page }) => {
  await signIn(page)
  const headers = await kitchenApi(page, "refresh")
  await page.goto("/quan-ly-chi-nhanh/bep")
  await expect(page.getByText(DISH, { exact: true })).toBeVisible()
  await expect.poll(() => headers.filter((value) => value === 'Bearer ' + NEW_TOKEN).length).toBeGreaterThanOrEqual(2)
  expect(headers[0]).toBe('Bearer ' + STAFF_TOKEN)
  expect(headers.slice(1).every((value) => value === 'Bearer ' + NEW_TOKEN)).toBe(true)
})

const secondDish = { ...detail, id: 32, dishId: 8, dishName: "Bún bò kiểm thử" }
const kitchenPath = "/quan-ly-chi-nhanh/bep"

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`batch confirmation traps keyboard focus and returns it to the opening ticket at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await signIn(page)
    await kitchenApi(page, "normal", () => [detail, secondDish])
    await page.goto(kitchenPath)

    const trigger = page.getByRole("button", { name: "Xác nhận món", exact: true })
    await expect(trigger).toBeVisible()
    await trigger.press("Enter")
    const dialog = page.getByRole("dialog", { name: "Xác nhận món theo bàn — Bàn 12" })
    await expect(dialog).toBeVisible()
    const selectAll = dialog.getByRole("checkbox", { name: "Chọn tất cả", exact: true })
    await expect(selectAll).toBeFocused()
    await expect(selectAll).toBeChecked()

    await page.keyboard.press("Shift+Tab")
    await expect(dialog.getByRole("button", { name: "Đóng", exact: true })).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(selectAll).toBeFocused()
    await page.keyboard.press("Space")
    await expect(dialog.getByRole("status")).toHaveText("Đã chọn 0/12 phần")
    await page.keyboard.press("Space")
    await expect(dialog.getByRole("status")).toHaveText("Đã chọn 12/12 phần")
    await dialog.getByText(DISH, { exact: true }).click()
    await expect(dialog.getByRole("checkbox", { name: DISH })).not.toBeChecked()
    await expect(dialog.getByRole("status")).toHaveText("Đã chọn 6/12 phần")

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()

    await trigger.click()
    await dialog.getByRole("button", { name: "Hủy", exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })
}

async function mockKitchenPrinting(page: Page) {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      for (const frame of document.querySelectorAll("iframe")) {
        if (frame.contentWindow) {
          frame.contentWindow.print = () => {
            const printDoc = frame.contentDocument
            const rows = Array.from(printDoc?.querySelectorAll("tbody tr") ?? [], (row) =>
              Array.from(row.querySelectorAll("td"), (cell) => cell.textContent.replace(/\s+/g, " ").trim()),
            )
            const output = document.documentElement.dataset
            output.kitchenPrintedRows = JSON.stringify(rows)
            output.kitchenPrintedTotal = printDoc?.querySelector(".footer strong")?.textContent ?? ""
            output.kitchenPrinted = "true"
          }
        }
      }
    })
    observer.observe(document, { childList: true, subtree: true })
  })
}

test("batch confirmation keeps the selection on failure and returns focus to the queue after the ticket moves", async ({ page }) => {
  await signIn(page)
  await mockKitchenPrinting(page)
  let confirmed = false
  let attempts = 0
  let finishFirstRequest!: () => void
  const firstRequest = new Promise<void>((resolve) => { finishFirstRequest = resolve })
  await kitchenApi(page, "normal", () =>
    [detail, secondDish].map((item) => ({ ...item, status: confirmed ? "PREPARING" : "PENDING" })),
  )
  await page.route("**/api/v1/order-details/batch-confirm", async (route) => {
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST,OPTIONS" }
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    expect(route.request().postDataJSON()).toEqual({ orderDetailIds: [31, 32] })
    attempts += 1
    if (attempts === 1) {
      await firstRequest
      return route.fulfill({ status: 500, headers: cors, json: { message: "Chưa xác nhận được món" } })
    }
    confirmed = true
    return route.fulfill({ headers: cors, json: { data: [detail, secondDish].map((item) => ({ ...item, status: "PREPARING" })) } })
  })
  await page.goto(kitchenPath)
  const trigger = page.getByRole("button", { name: "Xác nhận món", exact: true })
  await trigger.click()
  const dialog = page.getByRole("dialog", { name: "Xác nhận món theo bàn — Bàn 12" })
  await expect(dialog.getByRole("checkbox", { name: "Chọn tất cả", exact: true })).toBeChecked()
  const submit = dialog.getByRole("button", { name: "Xác nhận & In 2 nhóm (12 phần)" })
  await submit.click()
  try {
    const pending = dialog.getByRole("button", { name: "Đang xử lý…" })
    await expect(pending).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(pending).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(dialog).toBeVisible()
  } finally {
    finishFirstRequest()
  }
  await expect(page.getByText("Lỗi xác nhận món", { exact: true })).toBeVisible()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("status")).toHaveText("Đã chọn 12/12 phần")

  await submit.click()
  await expect(dialog).toBeHidden()
  await expect(trigger).toHaveCount(0)
  await expect(page.locator("html")).toHaveAttribute("data-kitchen-printed", "true")
  await expect(page.getByRole("region", { name: "Danh sách món chế biến" })).toBeFocused()
  expect(attempts).toBe(2)
})

test("batch confirmation selects pending groups and keeps newly arriving rounds outside the review", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 480 })
  await signIn(page)
  await mockKitchenPrinting(page)
  const olderTime = new Date(Date.now() - 11 * 60_000)
  const apiTime = new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh",
  }).format(olderTime).replace(" ", "T")
  const older = { ...detail, quantity: 2, createdAt: apiTime }
  const newer = { ...detail, id: 41, orderId: 21, quantity: 1 }
  const special = { ...newer, id: 42, note: "Mang về sau 15 phút" }
  const arriving = { ...newer, id: 51, orderId: 22, quantity: 3 }
  let receivedNewRound = false
  let confirmedIds: number[] = []
  await kitchenApi(page, "normal", () => [
    newer, special, older, ...(receivedNewRound ? [arriving] : []),
  ].map((item) => ({ ...item, status: confirmedIds.includes(item.id) ? "PREPARING" : "PENDING" })))
  await page.route("**/api/v1/order-details/batch-confirm", async (route) => {
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST,OPTIONS" }
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers })
    confirmedIds = route.request().postDataJSON().orderDetailIds
    return route.fulfill({ headers, json: { data: confirmedIds.map((id) => ({ id, status: "PREPARING" })) } })
  })
  await page.goto(kitchenPath)
  const card = page.getByRole("region", { name: "Chờ xác nhận", exact: true }).getByRole("article", { name: "Bàn 12" })
  await expect(card.getByRole("listitem")).toHaveCount(2)
  await expect(card.getByText("3×", { exact: true })).toBeVisible()
  await expect(card.getByText("Ghi chú: Mang về sau 15 phút")).toBeVisible()
  await card.getByRole("button", { name: "Xác nhận món", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Xác nhận món theo bàn — Bàn 12" })
  const grouped = dialog.getByRole("listitem", { name: DISH, exact: true })
  const specialGroup = dialog.getByRole("listitem", { name: /Mang về sau 15 phút/ })
  await expect(dialog.getByRole("status")).toHaveText("Đã chọn 4/4 phần")
  const groupCheckbox = grouped.getByRole("checkbox", { name: `Chọn nhóm ${DISH}` })
  await expect(groupCheckbox).toBeChecked()
  await expect(grouped.getByText("×3", { exact: true })).toBeVisible()
  await expect(grouped.getByText("Chờ 11 phút")).toHaveClass(/bg-amber-100/)
  await expect(grouped.locator("time")).toHaveCount(0)
  await grouped.getByRole("button", { name: /Xem 2 lượt gọi/ }).click()
  await specialGroup.getByRole("button", { name: /Xem 1 lượt gọi/ }).click()
  const list = dialog.getByRole("list", { name: "Nhóm món chờ xác nhận" })
  const header = dialog.getByRole("checkbox", { name: "Chọn tất cả", exact: true })
  const footer = dialog.getByRole("button", { name: /Xác nhận & In/ })
  const headerBeforeScroll = await header.boundingBox()
  const footerBeforeScroll = await footer.boundingBox()
  await list.evaluate((node) => { node.scrollTop = node.scrollHeight })
  await expect.poll(() => list.evaluate((node) => node.scrollTop)).toBeGreaterThan(0)
  expect(await header.boundingBox()).toEqual(headerBeforeScroll)
  expect(await footer.boundingBox()).toEqual(footerBeforeScroll)
  const firstRound = grouped.getByRole("checkbox", { name: /Chọn lượt gọi 1/ })
  const secondRound = grouped.getByRole("checkbox", { name: /Chọn lượt gọi 2/ })
  await expect(firstRound).toBeChecked()
  await expect(grouped.locator("time").first()).toHaveAttribute("datetime", new Date(apiTime + "+07:00").toISOString())
  await secondRound.uncheck()
  await expect(groupCheckbox).toHaveAttribute("aria-checked", "mixed")
  await specialGroup.getByRole("checkbox", { name: /Chọn nhóm/ }).uncheck()
  await expect(dialog.getByRole("status")).toHaveText("Đã chọn 2/4 phần")

  receivedNewRound = true
  await expect(page.getByText("6×", { exact: true })).toBeAttached()
  await expect(grouped.getByRole("listitem")).toHaveCount(2)
  await expect(dialog.getByRole("button", { name: "Xác nhận & In 1 nhóm (2 phần)" })).toBeEnabled()
  await firstRound.focus()
  await page.keyboard.press("Enter")
  await expect(dialog).toBeHidden()
  expect(confirmedIds).toEqual([older.id])
  await expect(card.getByText("4×", { exact: true })).toBeVisible()
})

test("batch confirmation prints combined quantities and the total portions", async ({ page }) => {
  await signIn(page)
  await mockKitchenPrinting(page)
  const base = { ...detail, dishName: "Tàu hủ key", quantity: 2,
    options: [{ id: 1, optionItemId: 21, optionItemName: "Trân châu", priceSnapshot: 5000 }] }
  const additions = [
    { ...base, id: 41, orderId: 21, quantity: 3 },
    { ...base, id: 42, orderId: 21, quantity: 1, note: "Mang ra sau" },
    { ...base, id: 43, orderId: 21, quantity: 1, isTakeAway: true },
  ]
  const order = [base, ...additions]
  let confirmed = false
  await kitchenApi(page, "normal", () => order.map((item) => ({ ...item, status: confirmed ? "PREPARING" : "PENDING" })))
  await page.route("**/api/v1/order-details/batch-confirm", async (route) => {
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST,OPTIONS" }
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers })
    confirmed = true
    return route.fulfill({ headers, json: { data: order.map(({ id }) => ({ id, status: "PREPARING" })) } })
  })
  await page.goto(kitchenPath)
  await page.getByRole("button", { name: "Xác nhận món", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Xác nhận món theo bàn — Bàn 12" })
  await dialog.getByRole("checkbox", { name: "Chọn tất cả", exact: true }).check()
  await dialog.getByRole("button", { name: "Xác nhận & In 3 nhóm (7 phần)" }).click()
  const html = page.locator("html")
  await expect(html).toHaveAttribute("data-kitchen-printed-rows", JSON.stringify([
    ["Tàu hủ key + Trân châu", "×5"],
    ["Tàu hủ key + Trân châu * Ghi chú: Mang ra sau", "×1"],
    ["Tàu hủ key + Trân châu Mang về", "×1"],
  ]))
  await expect(html).toHaveAttribute("data-kitchen-printed-total", "7 phần")
})

test("groups dishes per table and serves the exact selected quantity", async ({ page }, testInfo) => {
  await signIn(page)
  const longWait = new Date(Date.now() - 47 * 60_000).toISOString()
  const served = new Map<number, number>()
  const serveRequests: { id: number; quantity: number; expectedServedQuantity: number }[] = []
  const lines = [
    { id: 105, orderId: 21, quantity: 2 },
    { id: 106, orderId: 22, quantity: 2 },
    { id: 108, orderId: 23, quantity: 1, note: "Không hành" },
  ]
  const waiting = [
    { ...detail, id: 101, dishName: "Đậu hũ sốt nấm", createdAt: longWait, note: "Không hành",
      options: [{ id: 1, optionItemId: 21, optionItemName: "Trứng", priceSnapshot: 5000 }] },
    { ...detail, id: 102, dishName: "Phở bò", createdAt: longWait },
    { ...detail, id: 103, dishName: "Tôm hấp", status: "PENDING_WEIGHT", createdAt: longWait },
  ]
  await kitchenApi(page, "normal", (id) => {
    if (id === 12) return waiting
    if (id === 13) return [{ ...detail, id: 104, dishName: "Cơm sườn", createdAt: new Date().toISOString() }]
    if (id === 15) return [{ ...detail, id: 107, dishName: "Bún bò", createdAt: longWait }]
    return lines.map((line) => ({
      ...detail, ...line, dishName: "Phở bàn VIP", createdAt: longWait,
      servedQuantity: served.get(line.id) ?? 0,
      status: served.get(line.id) === line.quantity ? "SERVED" : "PREPARING",
    }))
  }, [session, { ...session, id: 13, tableId: 13, tableName: "19" }, { ...session, id: 14, tableId: 14, tableName: "Bàn VIP" },
    { ...session, id: 15, tableId: 15, tableName: "Bàn 15" }])
  await page.route("**/api/v1/order-details/*/serve-portions", async (route) => {
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST,OPTIONS" }
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers })
    const id = Number(new URL(route.request().url()).pathname.split("/").at(-2))
    const body = route.request().postDataJSON()
    const previous = served.get(id) ?? 0
    expect(body.expectedServedQuantity).toBe(previous)
    const servedQuantity = previous + body.quantity
    served.set(id, servedQuantity)
    serveRequests.push({ id, ...body })
    const status = servedQuantity === lines.find((line) => line.id === id)?.quantity ? "SERVED" : "PREPARING"
    return route.fulfill({ headers, json: { data: { id, status, servedQuantity } } })
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(kitchenPath)

  const pending = page.getByRole("region", { name: "Chờ xác nhận", exact: true })
  const cooking = page.getByRole("region", { name: "Đang chế biến", exact: true })
  const table = pending.getByRole("article", { name: "Bàn 12", exact: true })
  const newTable = pending.getByRole("article", { name: "Bàn 19" })
  const cards = pending.getByRole("article")
  await expect(cards).toHaveCount(3)
  const positions = await Promise.all([0, 1, 2].map((index) => cards.nth(index).boundingBox()))
  expect(new Set(positions.map((position) => position?.y)).size).toBe(1)
  expect(new Set(positions.map((position) => position?.x)).size).toBe(3)
  await expect(table.getByRole("listitem")).toHaveCount(3)
  await expect(table.getByText("Ghi chú: Không hành")).toBeVisible()
  await expect(table.getByText("Trứng", { exact: true })).toBeVisible()
  await expect(table.getByText("47 phút")).toHaveClass(/bg-amber-100/)
  await expect(newTable.getByText("vừa gửi")).toHaveClass(/bg-emerald-100/)
  expect((await pending.boundingBox())!.width).toBeGreaterThan((await cooking.boundingBox())!.width)
  await page.screenshot({ path: testInfo.outputPath("kitchen-by-table-desktop.png"), animations: "disabled" })

  const search = page.getByRole("textbox", { name: "Tìm bàn hoặc món" })
  await search.fill("dau hu")
  await expect(pending.getByRole("article")).toHaveCount(1)
  await expect(table.getByText("Phở bò", { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 320, height: 720 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  await page.screenshot({ path: testInfo.outputPath("kitchen-by-table-mobile.png"), animations: "disabled" })
  await table.getByRole("button", { name: "Xác nhận món", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Xác nhận món theo bàn — Bàn 12" })
  await expect(dialog.getByRole("status")).toHaveText("Đã chọn 12/12 phần")
  await expect(dialog.getByText("Tôm hấp")).toHaveCount(0)
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()

  await search.clear()
  await page.setViewportSize({ width: 1440, height: 900 })
  const vip = cooking.getByRole("article", { name: "Bàn VIP" })
  await expect(vip.getByRole("listitem")).toHaveCount(2)
  await expect(vip.getByRole("listitem").first()).toContainText("4×")
  await expect(vip.getByRole("listitem").last()).toContainText("Không hành")
  await cooking.getByRole("button", { name: "Đã phục vụ", exact: true }).click()
  const serveDialog = page.getByRole("dialog", { name: "Đã phục vụ · Bàn VIP" })
  const selectAll = serveDialog.getByRole("checkbox", { name: "Chọn tất cả" })
  const groupedDish = serveDialog.getByRole("group", { name: "Phở bàn VIP", exact: true })
  const increase = groupedDish.getByRole("button", { name: "Tăng số phần" })
  const decrease = groupedDish.getByRole("button", { name: "Giảm số phần" })
  await expect(serveDialog.getByRole("status")).toHaveText("Đã chọn 0/5 phần")
  await expect(serveDialog.getByRole("button", { name: "Xác nhận đã phục vụ" })).toBeDisabled()
  await expect(decrease).toBeDisabled()
  await increase.click()
  await increase.click()
  await decrease.click()
  await expect(groupedDish.getByText("1/4", { exact: true })).toBeVisible()
  await expect(selectAll).toHaveAttribute("aria-checked", "mixed")
  await serveDialog.getByRole("button", { name: "Xác nhận 1 phần" }).click()
  await expect(serveDialog).toBeHidden()
  await expect(vip.getByText("3×", { exact: true })).toBeVisible()
  expect(serveRequests).toEqual([{ id: 105, quantity: 1, expectedServedQuantity: 0 }])
  await page.reload()
  await expect(vip.getByText("3×", { exact: true })).toBeVisible()

  await cooking.getByRole("button", { name: "Đã phục vụ", exact: true }).click()
  await expect(serveDialog.getByRole("status")).toHaveText("Đã chọn 0/4 phần")
  await selectAll.check()
  await expect(increase).toBeDisabled()
  await serveDialog.getByRole("button", { name: "Xác nhận 4 phần" }).click()
  await expect(serveDialog).toBeHidden()
  await expect(cooking).toBeHidden()
  expect(serveRequests.slice(1).sort((first, second) => first.id - second.id)).toEqual([
    { id: 105, quantity: 1, expectedServedQuantity: 1 },
    { id: 106, quantity: 2, expectedServedQuantity: 0 },
    { id: 108, quantity: 1, expectedServedQuantity: 0 },
  ])
})
