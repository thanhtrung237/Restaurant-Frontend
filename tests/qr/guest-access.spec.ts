import { test, expect, type Page } from "@playwright/test"

const table = { tableId: 1, branchId: 1, tableName: "Bàn test", branchName: "Chi nhánh test", restaurantName: "Nhà hàng test", locationRequired: true, joinRequired: false }
const session = { id: 10, tableId: 1, branchId: 1, tableName: "Bàn test", status: "WAITING_FOR_OPEN", guestCount: 2 }
const TOKEN = "server-issued-guest-capability"
async function mockApi(page: Page, info = table, activeSession = session) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url())
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" } }); return
    }
    let data: unknown = []
    if (url.pathname.endsWith("/guest/table")) data = info
    else if (url.pathname.endsWith("/guest/access")) data = { token: TOKEN, session: activeSession }
    else if (/\/table-sessions\/(10|table\/1\/open)$/.test(url.pathname)) data = activeSession
    await route.fulfill({ json: { status: 200, message: "OK", data }, headers: { "Access-Control-Allow-Origin": "*" } })
  })
}

test("valid location creates a guest session and polling uses only the server token", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation({ latitude: 10, longitude: 106, accuracy: 10 })
  await page.addInitScript(() => localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: "staff-token-must-not-leak", refreshToken: "staff-refresh" })))
  await mockApi(page)
  await page.goto("/ban/QR-B1-T1")
  const admission = page.waitForRequest((r) => r.url().endsWith("/guest/access"))
  await page.getByRole("button", { name: "Gửi yêu cầu mở bàn" }).click()
  const request = await admission
  expect(request.postDataJSON().location.latitude).toBe(10)
  expect(request.headers().authorization).toBeUndefined()
  await expect(page).toHaveURL(/cho-mo-ban|waiting/)
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("restaurant-guest-credential-v1") ?? "null")?.token)).toBe(TOKEN)
  const polling = await page.waitForRequest((r) => /table-sessions\/10$/.test(r.url()))
  expect(polling.headers()["x-guest-token"]).toBe(TOKEN)
  await page.reload()
  await expect(page).toHaveURL(/cho-mo-ban|waiting/)
})

test("permission denied gives staff assistance and sends no admission", async ({ page, context }) => {
  await context.clearPermissions()
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, failure) => failure?.({ code: 1, message: "denied" } as GeolocationPositionError)
  })
  let admissions = 0
  page.on("request", (r) => { if (r.url().endsWith("/guest/access")) admissions++ })
  await mockApi(page)
  await page.goto("/ban/QR-B1-T1")
  await page.getByRole("button", { name: "Gửi yêu cầu mở bàn" }).click()
  await expect(page.getByRole("alert")).toContainText("Không lấy được vị trí")
  expect(admissions).toBe(0)
})

test("location failure can use an optional staff assistance code", async ({ page }) => {
  await mockApi(page, { ...table, joinRequired: true })
  await page.goto("/ban/QR-B1-T1")
  await expect(page.getByLabel("Mã hỗ trợ", { exact: true })).toHaveCount(0)
  await page.getByText("Không thể định vị? Nhờ nhân viên hỗ trợ", { exact: true }).click()
  await page.getByRole("checkbox").check()
  await page.getByLabel("Mã hỗ trợ", { exact: true }).fill("12345678")
  const admission = page.waitForRequest((r) => r.url().endsWith("/guest/access"))
  await page.getByRole("button", { name: "Đúng bàn, tiếp tục" }).click()
  const body = (await admission).postDataJSON()
  expect(body.joinCode).toBe("12345678")
  expect(body.location).toBeUndefined()
  await expect(page).toHaveURL(/cho-mo-ban|waiting/)
})

test("a backend rejection is shown and does not save a token", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation({ latitude: 11, longitude: 106 })
  await mockApi(page)
  await page.route("**/api/v1/guest/access", (route) => route.fulfill({ status: 403, json: { message: "Bạn đang ngoài phạm vi gọi món của chi nhánh." }, headers: { "Access-Control-Allow-Origin": "*" } }))
  await page.goto("/ban/QR-B1-T1")
  await page.getByRole("button", { name: "Gửi yêu cầu mở bàn" }).click()
  await expect(page.getByRole("alert")).toContainText("ngoài phạm vi")
  expect(await page.evaluate(() => sessionStorage.getItem("restaurant-guest-credential-v1"))).toBeNull()
})

test("a disabled geofence does not request device location", async ({ page }) => {
  await page.addInitScript(() => { navigator.geolocation.getCurrentPosition = () => { throw new Error("must not ask for location") } })
  await mockApi(page, { ...table, locationRequired: false })
  await page.goto("/ban/QR-B1-T1")
  const admission = page.waitForRequest((r) => r.url().endsWith("/guest/access"))
  await page.getByRole("button", { name: "Gửi yêu cầu mở bàn" }).click()
  expect((await admission).postDataJSON().location).toBeUndefined()
  await expect(page).toHaveURL(/cho-mo-ban|waiting/)
})


test("existing table needs only table confirmation and valid location", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation({ latitude: 10, longitude: 106, accuracy: 10 })
  await mockApi(page, { ...table, joinRequired: true })
  await page.goto("/ban/QR-B1-T1")
  await expect(page.getByRole("heading", { name: "Bạn đang ngồi tại Bàn test?" })).toBeVisible()
  await expect(page.getByLabel("Mã hỗ trợ", { exact: true })).toHaveCount(0)
  const admission = page.waitForRequest((r) => r.url().endsWith("/guest/access"))
  await page.getByRole("button", { name: "Đúng bàn, tiếp tục" }).click()
  const body = (await admission).postDataJSON()
  expect(body.joinCode).toBeUndefined()
  expect(body.location.latitude).toBe(10)
  await expect(page).toHaveURL(/cho-mo-ban/)
})

test("existing table with geofence disabled joins without a code or location", async ({ page }) => {
  await page.addInitScript(() => { navigator.geolocation.getCurrentPosition = () => { throw new Error("must not request location") } })
  await mockApi(page, { ...table, joinRequired: true, locationRequired: false })
  await page.goto("/ban/QR-B1-T1")
  await expect(page.getByLabel("Mã hỗ trợ", { exact: true })).toHaveCount(0)
  const admission = page.waitForRequest((r) => r.url().endsWith("/guest/access"))
  await page.getByRole("button", { name: "Đúng bàn, tiếp tục" }).click()
  const body = (await admission).postDataJSON()
  expect(body.joinCode).toBeUndefined()
  expect(body.location).toBeUndefined()
  await expect(page).toHaveURL(/cho-mo-ban/)
})

test("a valid credential resumes the table without confirmation or location", async ({ page }) => {
  await page.addInitScript((token) => {
    sessionStorage.setItem("restaurant-guest-credential-v1", JSON.stringify({ sessionId: 10, token }))
    navigator.geolocation.getCurrentPosition = () => { throw new Error("must not request location on resume") }
  }, TOKEN)
  await mockApi(page, { ...table, joinRequired: true })
  let admissions = 0
  page.on("request", (r) => { if (r.url().endsWith("/guest/access")) admissions++ })
  await page.goto("/ban/QR-B1-T1")
  await expect(page).toHaveURL(/cho-mo-ban/)
  expect(admissions).toBe(0)
})

test("a serving table opens the menu after confirmation", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation({ latitude: 10, longitude: 106, accuracy: 10 })
  await mockApi(page, { ...table, joinRequired: true }, { ...session, status: "SERVING" })
  await page.goto("/ban/QR-B1-T1")
  await page.getByRole("button", { name: "Đúng bàn, tiếp tục" }).click()
  await expect(page).toHaveURL(/thuc-don/)
})
