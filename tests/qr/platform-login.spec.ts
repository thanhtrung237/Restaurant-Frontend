import { expect, test } from "@playwright/test"

test("restaurant login requires a restaurant code", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL(/\/dang-nhap$/)
  await expect(page.getByLabel("Mã nhà hàng")).toHaveAttribute("required", "")
})

test("the configured platform hostname opens the platform login from its root", async ({
  page,
  baseURL,
}) => {
  const url = new URL("/", baseURL)
  url.hostname = "localhost"
  await page.goto(url.href)
  await expect(page).toHaveURL(/\/dang-nhap-quan-tri$/)
  await expect(page.getByLabel("Mã nhà hàng")).toHaveCount(0)
})

test("platform login checks the account scope and returns to the requested page", async ({
  page,
}) => {
  let platformAccount = false
  const requests: Array<{ restaurantCode: string | null }> = []
  await page.route("**/ws/**", (route) => route.abort())
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname
    let data: unknown = []
    if (path.endsWith("/auth/login")) {
      requests.push(route.request().postDataJSON())
      data = {
        accountId: 1,
        restaurantId: platformAccount ? null : 2,
        roles: platformAccount ? ["PLATFORM_ADMIN"] : ["MANAGER"],
        accessToken: "test-token",
        refreshToken: "test-refresh",
      }
    } else if (path.endsWith("/accounts/1")) {
      data = { id: 1, fullName: "Quản trị", status: "ACTIVE" }
    } else if (path.endsWith("/assignments/account/1")) {
      data = [{ id: 1, roleCode: "PLATFORM_ADMIN" }]
    }
    await route.fulfill({ json: { data } })
  })

  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto("/quan-tri-nen-tang/nha-hang")
  await expect(page).toHaveURL(/\/dang-nhap-quan-tri$/)
  await expect(page.getByRole("heading", { name: "Đăng nhập quản trị nền tảng" })).toBeVisible()
  await expect(page.getByLabel("Mã nhà hàng")).toHaveCount(0)
  await page.getByLabel("Tên đăng nhập").fill("test-user")
  await page.getByLabel("Mật khẩu", { exact: true }).fill("test-password")
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click()
  await expect(page.getByText("Tài khoản không thuộc cổng đăng nhập này.")).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem("pho-viet-auth-tokens"))).toBeNull()

  platformAccount = true
  await page.getByLabel("Mật khẩu", { exact: true }).press("Enter")
  await expect(page).toHaveURL(/\/quan-tri-nen-tang\/nha-hang$/)
  expect(requests.map(({ restaurantCode }) => restaurantCode)).toEqual([null, null])
  await page.getByRole("button", { name: "Đăng xuất" }).click()
  await expect(page).toHaveURL(/\/dang-nhap-quan-tri$/)
  expect(await page.evaluate(() => localStorage.getItem("pho-viet-auth-tokens"))).toBeNull()
})
