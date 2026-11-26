import { expect, test, type Locator, type Page } from "@playwright/test"

const branch = {
  id: 2,
  restaurantId: 1,
  code: "CHINHANH-Q1",
  name: "Chi nhánh Quận 1",
  status: "ACTIVE",
}
const table = { id: 4, branchId: 2, name: "Bàn 4", status: "AVAILABLE", capacity: 4 }
const session = { id: 12, tableId: 4, branchId: 2, restaurantId: 1, status: "SERVING" }
const qr = "QR-B2-T4"

type TestRole = "RESTAURANT_ADMIN" | "PLATFORM_ADMIN" | "BRANCH_MANAGER" | "WAITER" | "CASHIER" | "GUEST"

async function openApp(page: Page, role: TestRole) {
  await page.route("**/ws/**", (route) => route.abort())
  await page.addInitScript(({ role, qr, session }) => {
    if (role === "GUEST") {
      sessionStorage.setItem(
        "restaurant-guest-credential-v1",
        JSON.stringify({ sessionId: session.id, token: "mobile-guest" }),
      )
      localStorage.setItem(
        "pho-viet-customer-session",
        JSON.stringify({ version: 2, state: { qrCode: qr, tableSession: session } }),
      )
      return
    }

    const accessToken = "mobile-staff"
    const platform = role === "PLATFORM_ADMIN"
    localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken }))
    localStorage.setItem(
      "pho-viet-auth",
      JSON.stringify({
        version: 0,
        state: {
          role,
          accessToken,
          isAuthenticated: true,
          branchId: platform ? null : 2,
          account: { id: 1, restaurantId: platform ? null : 1, fullName: "Quản trị viên" },
        },
      }),
    )
  }, { role, qr, session })

  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api\/v1/, "")
    const dishes = Array.from({ length: 8 }, (_, i) => ({
      dishId: i + 1,
      dishName: "Món " + (i + 1),
      categoryId: i + 1,
      categoryName: i === 7 ? "Danh mục cuối có tên dài trên màn hình nhỏ" : "Danh mục " + (i + 1),
      basePrice: 35000,
      effectivePrice: 35000,
      isHidden: false,
    }))
    const data: Record<string, unknown> = {
      "/assignments/account/1": role === "RESTAURANT_ADMIN" ? [{ id: 1, roleCode: "MANAGER" }] : [],
      "/branches/2": branch,
      "/branches/restaurant/1": [branch, { ...branch, id: 3, code: "Q2", name: "Chi nhánh Quận 2" }],
      "/branches/2/menu": dishes,
      "/restaurants/1": { id: 1, name: "Nhà hàng test", status: "ACTIVE" },
      "/tables/branch/2": [table],
      ["/tables/branch/2/qr/" + qr]: table,
      "/table-sessions/table/4/open": session,
      "/table-sessions/12": session,
      "/table-sessions/12/bill-preview": {
        grossSubTotal: 0, grandTotal: 0, itemPromotionDiscount: 0, orderPromotionDiscount: 0,
        manualDiscount: 0, serviceFeeRate: 0, serviceFee: 0, vatRate: 0, vatAmount: 0,
      },
      "/invoices/session/12": null,
      "/invoices/session/12/qr-code": null,
      "/table-sessions/branch/2/open": [],
      "/reports/revenue": {
        totalRevenue: "0", totalInvoices: 0, totalGuests: 0,
        avgRevenuePerInvoice: "0", revenueByPaymentMethod: {}, trend: [],
      },
      "/reports/hourly": { hourlySlots: [] },
      "/reports/branch-comparison": { avgRevenue: "0", avgCancelRate: 0, branches: [] },
      "/restaurants": { content: [], totalElements: 0, totalPages: 0 },
      "/audit-logs": { content: [], totalElements: 0, totalPages: 0 },
    }
    return route.fulfill({ json: { data: path in data ? data[path] : [] } })
  })
}

async function withinViewport(control: Locator) {
  await expect(control).toBeVisible()
  await control.scrollIntoViewIfNeeded()
  const fits = await control.evaluate((node) => {
    const element = node.getBoundingClientRect()
    const range = document.createRange()
    range.selectNodeContents(node)
    const label = range.getBoundingClientRect()
    return element.left >= -1 && element.right <= window.innerWidth + 1 &&
      label.left >= -1 && label.right <= window.innerWidth + 1
  })
  expect(fits).toBe(true)
}

async function noPageOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width + 1,
  )
}

for (const width of [320, 360, 390, 430]) {
  test("table map header and filters fit at " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await openApp(page, "RESTAURANT_ADMIN")
    await page.goto("/quan-tri-nha-hang/so-do-ban")
    const header = page.locator("main > div > header").first()
    await withinViewport(header.getByRole("heading", { name: "Sơ đồ bàn" }))
    await withinViewport(header.locator("p"))
    await withinViewport(header.getByRole("button", { name: /Chi nhánh hiện tại/ }))
    await withinViewport(header.getByRole("button", { name: "Đăng xuất", exact: true }))
    await withinViewport(header.getByRole("button", { name: "Thông báo", exact: true }))

    const filters = page.getByRole("group", { name: "Lọc trạng thái bàn" }).getByRole("button")
    expect(await filters.count()).toBeGreaterThanOrEqual(4)
    for (const filter of await filters.all()) await withinViewport(filter)
    await noPageOverflow(page)

    await header.getByRole("button", { name: /Chi nhánh hiện tại/ }).click()
    await withinViewport(page.getByRole("dialog", { name: "Chuyển chi nhánh" }))
    await page.keyboard.press("Escape")
    await header.getByRole("button", { name: "Thông báo", exact: true }).click()
    await withinViewport(page.getByRole("dialog", { name: "Thông báo" }))
  })
}

test("report and branch tabs stay visible and actionable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await openApp(page, "RESTAURANT_ADMIN")
  for (const path of ["/quan-tri-nha-hang/bao-cao", "/quan-tri-nha-hang/chi-nhanh/2"]) {
    await page.goto(path)
    const tabs = page.getByRole("tablist").getByRole("tab")
    await expect(tabs).toHaveCount(3)
    for (const tab of await tabs.all()) {
      await withinViewport(tab)
      await tab.click()
      await expect(tab).toHaveAttribute("aria-selected", "true")
      await expect(page.getByRole("tabpanel")).toBeVisible()
      await noPageOverflow(page)
    }
  }
})

test("staff navigation and menu tabs remain accessible at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await openApp(page, "RESTAURANT_ADMIN")
  await page.goto("/quan-tri-nha-hang/thuc-don")
  const menu = page.getByRole("navigation", { name: "Phạm vi thực đơn" }).filter({ visible: true })
  for (const label of ["Thực đơn chung", "Theo chi nhánh"]) {
    const button = menu.getByRole("button", { name: label, exact: true })
    await withinViewport(button)
    await button.click()
    await expect(button).toHaveAttribute("aria-current", "true")
  }
  await page.getByRole("button", { name: "Thêm", exact: true }).click()
  const drawer = page.getByRole("dialog", { name: "Menu điều hướng" })
  await withinViewport(drawer.getByRole("link", { name: "Nhân viên", exact: true }))
  await drawer.getByRole("link", { name: "Nhân viên", exact: true }).click()
  const tabs = page.getByRole("navigation", { name: "Tabs" }).filter({ visible: true })
  for (const label of ["Nhân viên", "Vai trò & phân quyền", "Nhật ký hoạt động"]) {
    await withinViewport(tabs.getByRole("button", { name: label, exact: true }))
  }
  await tabs.getByRole("button", { name: "Vai trò & phân quyền" }).click()
  await expect(page).toHaveURL(/vai-tro-phan-quyen$/)
  await noPageOverflow(page)
})

test("legacy platform settings opens the dashboard and keeps audit navigation accessible", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await openApp(page, "PLATFORM_ADMIN")
  await page.goto("/quan-tri-nen-tang/cau-hinh")
  await expect(page).toHaveURL(/\/quan-tri-nen-tang$/)
  await expect(page.getByRole("heading", { name: "Tổng quan nền tảng" })).toBeVisible()
  await expect(page.getByText("Cấu hình nền tảng", { exact: true })).toHaveCount(0)
  await noPageOverflow(page)

  await page.getByRole("link", { name: "Nhật ký hệ thống", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Nhật ký hệ thống" })).toBeVisible()
  await noPageOverflow(page)
})

test("customer can reach the last long category without scrolling the page sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await openApp(page, "GUEST")
  await page.goto("/ban/" + qr + "/thuc-don")
  const categories = page.getByRole("group", { name: "Danh mục món" })
  const last = categories.getByRole("button").last()
  await expect(last).toHaveText("Danh mục cuối có tên dài trên màn hình nhỏ")
  await withinViewport(last)
  await last.click()
  await expect(last).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("Món 8", { exact: true }).first()).toBeVisible()
  await noPageOverflow(page)
})

for (const width of [768, 1440]) {
  test("staff layout keeps the tablet and desktop header at " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await openApp(page, "RESTAURANT_ADMIN")
    await page.goto("/quan-tri-nha-hang/so-do-ban")
    await expect(page.locator("main > div > header").first()).toBeHidden()
    await expect(page.getByRole("heading", { name: "Sơ đồ bàn", exact: true })).toBeVisible()
    await noPageOverflow(page)
  })
}

const mobileScreens = {
  RESTAURANT_ADMIN: [
    "/quan-tri-nha-hang/so-do-ban?mode=takeaway",
    "/quan-tri-nha-hang/bep",
    "/quan-tri-nha-hang/order/12",
    "/quan-tri-nha-hang/order/12/them-mon",
    "/quan-tri-nha-hang/chuyen-gop-ban",
    "/quan-tri-nha-hang/khuyen-mai",
    "/quan-tri-nha-hang/khuyen-mai/tao-moi",
    "/quan-tri-nha-hang/chi-nhanh",
    "/quan-tri-nha-hang/chi-nhanh/2/cau-hinh",
    "/quan-tri-nha-hang/chi-nhanh/2/thue-phi",
    "/quan-tri-nha-hang/cau-hinh",
    "/quan-tri-nha-hang/nhat-ky",
  ],
  PLATFORM_ADMIN: [
    "/quan-tri-nen-tang",
    "/quan-tri-nen-tang/nha-hang",
    "/quan-tri-nen-tang/nha-hang/1",
    "/quan-tri-nen-tang/nhat-ky-he-thong",
  ],
  BRANCH_MANAGER: ["/quan-ly-chi-nhanh/nhan-vien", "/quan-ly-chi-nhanh/thuc-don"],
  WAITER: ["/phuc-vu/so-do-ban", "/phuc-vu/order/12"],
  CASHIER: ["/thu-ngan/hoa-don", "/thu-ngan/thanh-toan/12"],
  GUEST: [
    "/ban/" + qr + "/thuc-don/tim-kiem",
    "/ban/" + qr + "/gio-hang",
    "/ban/" + qr + "/mon-da-goi",
    "/ban/" + qr + "/hoa-don",
    "/ban/" + qr + "/thanh-toan-qr",
  ],
} as const

for (const role of Object.keys(mobileScreens) as TestRole[]) {
  test("mobile page layouts fit at 320px for " + role, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await openApp(page, role)
    for (const path of mobileScreens[role]) {
      await test.step(path, async () => {
        await page.goto(path)
        const screen = path.endsWith("/tim-kiem")
          ? page.getByPlaceholder("Tìm món trong thực đơn...")
          : page.getByRole("heading").first()
        await expect(screen).toBeVisible()
        await expect(page).toHaveURL((url) => url.pathname + url.search === path)
        await expect(page.getByText("Unexpected Application Error!", { exact: true })).toHaveCount(0)
        await noPageOverflow(page)
        const main = page.locator("main:visible").first()
        if (await main.count()) {
          const widths = await main.evaluate((node) => ({
            scroll: node.scrollWidth,
            client: node.clientWidth,
          }))
          expect(widths.scroll, path).toBeLessThanOrEqual(widths.client + 1)
        }
      })
    }
  })
}


test("login fits at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto("/dang-nhap")
  await withinViewport(page.getByRole("button", { name: "Đăng nhập", exact: true }))
  await noPageOverflow(page)
})
