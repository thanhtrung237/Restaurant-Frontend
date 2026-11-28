import { expect, test } from "@playwright/test"

test("restaurant login requires a restaurant code", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByLabel("Mã nhà hàng")).toHaveAttribute("required", "")
})

test("the configured platform hostname opens the platform login from its root", async ({
  page,
  baseURL,
}) => {
  const url = new URL("/", baseURL)
  url.hostname = "localhost"
  await page.goto(url.href)
  await expect(page).toHaveURL(/\/platform-login$/)
  await expect(page.getByLabel("Mã nhà hàng")).toHaveCount(0)
})

for (const path of ["/", "/login"]) {
  test(`the production platform hostname redirects ${path} to platform login`, async ({
    page,
    baseURL,
  }) => {
    const hostname = "platform-admin.thanhtrung.click"
    await page.route(`https://${hostname}/**`, async (route) => {
      const { pathname, search } = new URL(route.request().url())
      const response = await page.request.get(new URL(pathname + search, baseURL).href)
      await route.fulfill({ response })
    })

    await page.goto(`https://${hostname}${path}`)
    await expect(page).toHaveURL(`https://${hostname}/platform-login`)
    await expect(page.getByRole("heading", { name: "Đăng nhập quản trị nền tảng" })).toBeVisible()
    await expect(page.getByLabel("Mã nhà hàng")).toHaveCount(0)
  })
}

test("platform login checks the account scope and returns to the requested page", async ({
  page,
  context,
}) => {
  let platformAccount = false
  const requests: Array<{ restaurantCode: string | null }> = []
  await context.route("**/ws/**", (route) => route.abort())
  await context.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers: Record<string, string> = {}
    let data: unknown = []
    if (path.includes("/auth/")) expect(request.headers()["x-auth-request"]).toBe("1")
    if (path.endsWith("/auth/login")) {
      requests.push(request.postDataJSON())
      headers["Set-Cookie"] = "refreshToken=test-refresh; HttpOnly; SameSite=Lax; Path=/api/v1/auth"
      data = {
        accountId: 1,
        restaurantId: platformAccount ? null : 2,
        roles: platformAccount ? ["PLATFORM_ADMIN"] : ["MANAGER"],
        accessToken: "test-token",
      }
    } else if (path.endsWith("/auth/refresh-token")) {
      expect((await request.allHeaders()).cookie).toContain("refreshToken=test-refresh")
      data = { accountId: 1, accessToken: "refreshed-token" }
    } else if (path.endsWith("/auth/logout")) {
      expect((await request.allHeaders()).cookie).toContain("refreshToken=test-refresh")
      headers["Set-Cookie"] = "refreshToken=; HttpOnly; SameSite=Lax; Path=/api/v1/auth; Max-Age=0"
    } else if (path.endsWith("/accounts/1")) {
      data = { id: 1, fullName: "Quản trị", status: "ACTIVE" }
    } else if (path.endsWith("/assignments/account/1")) {
      data = [{ id: 1, roleCode: "PLATFORM_ADMIN" }]
    }
    await route.fulfill({ headers, json: { data } })
  })

  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto("/quan-tri-nen-tang/nha-hang?source=bookmark#restaurants")
  await expect(page).toHaveURL(/\/platform-login$/)
  await expect(page.getByRole("heading", { name: "Đăng nhập quản trị nền tảng" })).toBeVisible()
  await expect(page.getByLabel("Mã nhà hàng")).toHaveCount(0)
  await page.getByLabel("Tên đăng nhập").fill("test-user")
  await page.getByLabel("Mật khẩu", { exact: true }).fill("test-password")
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click()
  await expect(page.getByText("Tài khoản không thuộc cổng đăng nhập này.")).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem("pho-viet-auth-tokens"))).toBeNull()

  platformAccount = true
  await page.getByLabel("Mật khẩu", { exact: true }).press("Enter")
  await expect(page).toHaveURL("/platform-admin/restaurants?source=bookmark#restaurants")
  expect(requests.map(({ restaurantCode }) => restaurantCode)).toEqual([null, null])
  expect(await context.cookies()).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: "refreshToken", httpOnly: true })]),
  )
  expect(await page.evaluate(() => localStorage.getItem("pho-viet-auth"))).not.toContain(
    "test-token",
  )

  await page.reload()
  await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeVisible()
  const newTab = await context.newPage()
  await newTab.goto("/platform-admin/restaurants")
  await expect(newTab.getByRole("button", { name: "Đăng xuất" })).toBeVisible()

  await page.getByRole("button", { name: "Đăng xuất" }).click()
  await expect(page).toHaveURL(/\/platform-login$/)
  await expect(newTab).toHaveURL(/\/platform-login$/)
  expect((await context.cookies()).find(({ name }) => name === "refreshToken")).toBeUndefined()
  expect(await page.evaluate(() => localStorage.getItem("pho-viet-auth-tokens"))).toBeNull()
})
