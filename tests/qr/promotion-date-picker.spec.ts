import { expect, test } from "@playwright/test"

test("edits the promotion dates through the calendar and sends calendar dates to the API", async ({ page }) => {
  const promotion = {
    id: 1, restaurantId: 1, name: "Khuyến mãi tại quán", startDate: "2026-03-23", endDate: "2026-03-24",
    allBranches: true, status: "ACTIVE", action: JSON.stringify({ type: "fixed_amount", value: 10000 }),
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: "test-token" }))
    localStorage.setItem("pho-viet-auth", JSON.stringify({ version: 0, state: {
      role: "RESTAURANT_ADMIN", branchId: null, assignmentId: 7,
      accessToken: "test-token", isAuthenticated: true,
      account: { id: 1, restaurantId: 1, fullName: "Quản trị test" },
    } }))
  })
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    }
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
    let data: unknown = []
    if (path.endsWith("/promotions/1")) data = promotion
    if (path.endsWith("/assignments/account/1")) data = [{ id: 7, roleCode: "MANAGER", branchId: null }]
    if (path.endsWith("/restaurants/1")) data = { id: 1, name: "Nhà hàng test" }
    if (path.endsWith("/dishes/restaurant/1") || path.endsWith("/promotions/restaurant/1")) {
      data = { content: [], totalElements: 0 }
    }
    return route.fulfill({ headers, json: { data } })
  })

  await page.goto("/quan-tri-nha-hang/khuyen-mai/1/chinh-sua")
  const start = page.getByRole("button", { name: /^Từ ngày/ })
  const end = page.getByRole("button", { name: /^Đến ngày/ })
  await expect(start).toHaveText("23/03/2026")
  await expect(end).toHaveText("24/03/2026")
  await start.click()
  const startCalendar = page.getByRole("dialog", { name: "Từ ngày" })
  await expect(startCalendar).toBeInViewport({ ratio: 1 })
  await expect(startCalendar.getByRole("button", { name: /Ngày 23\/03\/2026 · Đã chọn/ })).toBeVisible()
  await startCalendar.getByRole("button", { name: "Ngày 26/03/2026", exact: true }).click()
  await expect(startCalendar).toBeHidden()
  await expect(end).toHaveText("Chọn ngày")
  await end.click()
  const endCalendar = page.getByRole("dialog", { name: "Đến ngày" })
  await expect(endCalendar.getByRole("button", { name: "Ngày 25/03/2026", exact: true })).toBeDisabled()
  await endCalendar.getByRole("button", { name: "Ngày 26/03/2026", exact: true }).click()
  await expect(end).toHaveText("26/03/2026")

  const saveRequest = page.waitForRequest((request) =>
    request.method() === "PUT" && new URL(request.url()).pathname.endsWith("/promotions/1"))
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click()
  expect((await saveRequest).postDataJSON()).toMatchObject({ startDate: "2026-03-26", endDate: "2026-03-26" })
})
