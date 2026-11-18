import { test, expect, type Page } from "@playwright/test"

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

async function kitchenApi(page: Page, mode: "normal" | "forbidden" | "refresh") {
  const headers: Array<string | undefined> = []
  let refreshed = false
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" }
    if (request.method() === "OPTIONS") { await route.fulfill({ status: 204, headers: cors }); return }
    if (path.endsWith("/auth/refresh-token")) {
      refreshed = true
      await route.fulfill({ headers: cors, json: { data: { accessToken: NEW_TOKEN, refreshToken: "refresh-token" } } }); return
    }
    if (path.endsWith("/order-details/session/12")) {
      const auth = request.headers().authorization
      headers.push(auth)
      const expected = refreshed ? NEW_TOKEN : STAFF_TOKEN
      if (mode === "forbidden" || auth !== 'Bearer ' + expected) {
        await route.fulfill({ status: 403, headers: cors, json: { message: "Không có quyền xem món của chi nhánh này" } }); return
      }
      if (mode === "refresh" && !refreshed) {
        await route.fulfill({ status: 401, headers: cors, json: { message: "Token hết hạn" } }); return
      }
      await route.fulfill({ headers: cors, json: { data: [detail] } }); return
    }
    let data: unknown = []
    if (path.endsWith("/table-sessions/branch/1/open")) data = [session]
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
  await expect(page.getByText(DISH, { exact: true }).last()).toBeVisible()
  await expect.poll(() => headers.length).toBeGreaterThanOrEqual(3)
  expect(headers.every((value) => value === 'Bearer ' + STAFF_TOKEN)).toBe(true)
  await expect(page.getByText(DISH, { exact: true }).last()).toBeVisible()
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
  await expect(page.getByText(DISH, { exact: true }).last()).toBeVisible()
  await expect.poll(() => headers.filter((value) => value === 'Bearer ' + NEW_TOKEN).length).toBeGreaterThanOrEqual(2)
  expect(headers[0]).toBe('Bearer ' + STAFF_TOKEN)
  expect(headers.slice(1).every((value) => value === 'Bearer ' + NEW_TOKEN)).toBe(true)
})
