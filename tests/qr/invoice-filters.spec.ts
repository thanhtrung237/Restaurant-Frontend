import { expect, test } from "@playwright/test"

test.use({ timezoneId: "America/Los_Angeles" })

const branches = [
  { id: 2, name: "Chi nhánh 1", restaurantId: 1 },
  { id: 3, name: "Chi nhánh 2", restaurantId: 1 },
]
const invoices = [
  {
    id: 41,
    invoiceNumber: "HD-ISSUED",
    tableName: "Bàn 1",
    areaId: 11,
    areaName: "Tầng 1",
    status: "ISSUED",
    issuerName: "nguyen thu ngân",
    grandTotal: 120000,
    createdAt: "2026-11-26T17:30:00Z",
  },
  {
    id: 42,
    invoiceNumber: "HD-PAID",
    tableName: "Bàn 2",
    areaId: 12,
    areaName: "Tầng 2",
    status: "PAID",
    grandTotal: 200000,
    createdAt: "2026-11-27T10:00:00",
  },
  {
    id: 43,
    invoiceNumber: "HD-PENDING",
    tableName: "Bàn 2",
    areaId: 12,
    areaName: "Tầng 2",
    status: "PENDING",
    grandTotal: 70000,
    createdAt: "2026-11-27T16:00:00",
  },
  {
    id: 44,
    invoiceNumber: "HD-OLD",
    tableName: "Bàn 1",
    areaId: 11,
    areaName: "Tầng 1",
    status: "CANCELLED",
    grandTotal: 60000,
    createdAt: "2026-11-26T23:59:59",
  },
  {
    id: 45,
    invoiceNumber: "HD-TAKEAWAY-45",
    tableName: "Mang về #45",
    takeaway: true,
    status: "PENDING",
    grandTotal: 50000,
    createdAt: "2026-11-27T16:00:00",
  },
  {
    id: 46,
    invoiceNumber: "HD-TAKEAWAY-46",
    tableName: "Mang về #46",
    status: "PENDING",
    grandTotal: 50000,
    createdAt: "2026-11-27T16:00:00",
  },
]

for (const width of [360, 834, 1440]) {
  test(`filters invoices by Vietnam dates and keeps applied state on return at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 })
    await page.clock.setFixedTime(new Date("2026-11-26T18:00:00Z"))
    await page.addInitScript(() => {
      const accessToken = "test-token"
      localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken }))
      localStorage.setItem(
        "pho-viet-auth",
        JSON.stringify({
          version: 0,
          state: {
            role: "RESTAURANT_ADMIN",
            branchId: null,
            accessToken,
            isAuthenticated: true,
            account: { id: 1, restaurantId: 1, fullName: "Quản trị" },
          },
        }),
      )
    })

    const listRequests: string[] = []
    await page.route("**/ws/**", (route) => route.abort())
    await page.route("**/api/v1/**", (route) => {
      const path = new URL(route.request().url()).pathname
      if (path.includes("/invoices/branch/")) listRequests.push(path)
      const data = path.endsWith("/branches/restaurant/1")
        ? branches
        : path.endsWith("/invoices/branch/2")
          ? invoices
          : path.endsWith("/invoices/41")
            ? {
                ...invoices[0],
                branchId: 2,
                branchName: branches[0].name,
                tableSessionId: 1,
                totalPaid: 120000,
              }
            : path.endsWith("/restaurants/1")
              ? { id: 1, name: "Nhà hàng" }
              : []
      return route.fulfill({ json: { data } })
    })

    await page.goto("/quan-tri-nha-hang/hoa-don?chi-nhanh=999")
    const invoice = (code: string) => page.getByRole("button", { name: new RegExp(code) })
    const branch = page.getByRole("combobox", { name: "Chi nhánh", exact: true })
    const date = page.getByRole("button", { name: /Chọn khoảng ngày hóa đơn/ })
    const payment = page.getByRole("group", { name: "Trạng thái thanh toán" })
    const search = page.getByRole("textbox", {
      name: "Tìm theo số hóa đơn, tên bàn hoặc nhân viên",
    })
    const advanced = page.getByRole("button", { name: "Bộ lọc nâng cao", exact: true })
    await expect(branch).toHaveText("Chi nhánh 1")
    await expect(invoice("HD-ISSUED")).toBeVisible()
    if (width >= 768) {
      await expect(page.getByRole("columnheader", { name: "Nhân viên bán" })).toBeVisible()
    }
    await expect(page.getByText(/nguyen thu ngân/).filter({ visible: true })).toBeVisible()
    await expect(date).toHaveAccessibleName(/27\/11\/2026/)
    await expect(invoice("HD-OLD")).toHaveCount(0)
    await expect(payment.getByRole("button", { name: /^Đã thanh toán/ })).toHaveText(/2$/)
    await expect(
      page.getByText("Đã phát hành HĐĐT", { exact: true }).filter({ visible: true }),
    ).toBeVisible()

    const initialRequests = listRequests.length
    await date.click()
    const calendar = page.getByRole("dialog", { name: "Khoảng ngày hóa đơn" })
    await calendar.getByRole("button", { name: "Hôm qua", exact: true }).click()
    await expect(invoice("HD-ISSUED")).toBeVisible()
    await expect(invoice("HD-OLD")).toHaveCount(0)
    expect(listRequests).toHaveLength(initialRequests)
    await calendar.getByRole("button", { name: "Áp dụng" }).click()
    await expect(invoice("HD-OLD")).toBeVisible()

    await date.click()
    await expect(calendar.getByRole("button", { name: "Hôm qua", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await calendar.getByRole("button", { name: "30 ngày qua", exact: true }).click()
    await calendar.getByRole("button", { name: "Hủy", exact: true }).click()
    await expect(invoice("HD-ISSUED")).toHaveCount(0)
    await date.click()
    await calendar.getByRole("button", { name: "Tùy chỉnh" }).click()
    await calendar.getByRole("button", { name: "26/11/2026", exact: true }).click()
    await calendar.getByRole("button", { name: "27/11/2026", exact: true }).click()
    await calendar.getByRole("button", { name: "Áp dụng" }).click()
    await expect(date).toHaveAccessibleName(/26\/11\/2026 – 27\/11\/2026/)

    await search.fill("HD-ISSUED")
    await expect(invoice("HD-PAID")).toBeVisible()
    await search.press("Enter")
    await expect(invoice("HD-PAID")).toHaveCount(0)
    await page.getByRole("button", { name: "Xóa từ khóa tìm kiếm" }).click()
    await expect(page).not.toHaveURL(/[?&]q=/)
    await search.fill("nguyen thu ngân")
    await expect(invoice("HD-PAID")).toBeVisible()
    await search.press("Enter")
    await expect(invoice("HD-ISSUED")).toBeVisible()
    await expect(invoice("HD-PAID")).toHaveCount(0)
    await expect(page).toHaveURL(/q=nguyen\+thu\+ng%C3%A2n/)
    await search.fill("ngan  nguyen")
    await search.press("Enter")
    await expect(page).toHaveURL(/q=ngan\+\+nguyen/)
    await expect(invoice("HD-ISSUED")).toBeVisible()
    await expect(invoice("HD-PAID")).toHaveCount(0)
    await page.getByRole("button", { name: "Xóa từ khóa tìm kiếm" }).click()
    await expect(page).not.toHaveURL(/[?&]q=/)
    await search.fill("Bàn 1")
    await search.press("Enter")
    await expect(invoice("HD-ISSUED")).toBeVisible()
    await expect(invoice("HD-PAID")).toHaveCount(0)
    await page.getByRole("button", { name: "Xóa từ khóa tìm kiếm" }).click()
    await expect(page).not.toHaveURL(/[?&]q=/)
    await payment.getByRole("button", { name: /^Đã thanh toán/ }).click()
    await expect(invoice("HD-PAID")).toBeVisible()
    await expect(invoice("HD-PENDING")).toHaveCount(0)

    await advanced.click()
    const panel = page.getByRole("dialog", { name: "Bộ lọc nâng cao" })
    await expect(panel.getByRole("combobox", { name: "Nhân viên bán" })).toHaveCount(0)
    if (width === 360) await expect(panel).toHaveAttribute("data-slot", "dialog-content")
    await expect(panel.getByRole("combobox", { name: "Bàn", exact: true })).toHaveCount(0)
    await panel.getByRole("combobox", { name: "Khu vực" }).click()
    let options = page.getByRole("listbox")
    await expect(options).toHaveAttribute("data-side", "bottom")
    await expect(options.getByRole("option", { name: "Mang về", exact: true })).toHaveCount(1)
    await expect(options.getByRole("option", { name: /Mang về #/ })).toHaveCount(0)
    await options.getByRole("option", { name: "Tầng 1" }).click()
    await panel.getByRole("combobox", { name: "Bàn", exact: true }).click()
    options = page.getByRole("listbox")
    await expect(options).toHaveAttribute("data-side", "bottom")
    await expect(options.getByRole("option", { name: "Bàn 2", exact: true })).toHaveCount(0)
    await options.getByRole("option", { name: "Bàn 1", exact: true }).click()
    await panel.getByRole("combobox", { name: "Trạng thái hóa đơn điện tử" }).click()
    await page.getByRole("option", { name: "Đã phát hành", exact: true }).click()
    await panel.getByRole("textbox", { name: "Từ số tiền" }).fill("100000")
    await panel.getByRole("textbox", { name: "Đến số tiền" }).fill("90000")
    await expect(panel.getByRole("button", { name: "Áp dụng" })).toBeDisabled()
    await panel.getByRole("textbox", { name: "Đến số tiền" }).fill("150000")
    await expect(page.getByText("HD-PAID", { exact: true }).filter({ visible: true })).toBeVisible()
    await panel.getByRole("button", { name: "Áp dụng" }).click()
    await expect(invoice("HD-PAID")).toHaveCount(0)
    expect(listRequests).toHaveLength(initialRequests)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )

    await search.fill("nguyen thu ngan")
    await search.press("Enter")
    await invoice("HD-ISSUED").click()
    await expect(page).toHaveURL(/\/hoa-don\/tra-cuu\/41$/)
    await page.getByRole("button", { name: "Về danh sách hóa đơn" }).click()
    await expect(date).toHaveAccessibleName(/26\/11\/2026 – 27\/11\/2026/)
    await expect(page.getByRole("button", { name: "Bỏ lọc HĐĐT: Đã phát hành" })).toBeVisible()
    await expect(search).toHaveValue("nguyen thu ngan")
    await expect(invoice("HD-PAID")).toHaveCount(0)
    await page.getByRole("button", { name: "Xóa tất cả", exact: true }).click()
    await expect(invoice("HD-OLD")).toBeVisible()
    await expect(invoice("HD-PENDING")).toBeVisible()
    await advanced.click()
    await panel.getByRole("combobox", { name: "Khu vực" }).click()
    await page.getByRole("option", { name: "Mang về", exact: true }).click()
    await expect(panel.getByRole("combobox", { name: "Bàn", exact: true })).toHaveCount(0)
    await panel.getByRole("button", { name: "Áp dụng" }).click()
    await expect(invoice("HD-TAKEAWAY-45")).toBeVisible()
    await expect(invoice("HD-TAKEAWAY-46")).toBeVisible()
    await expect(invoice("HD-PENDING")).toHaveCount(0)
    expect(listRequests.every((path) => path.endsWith("/branch/2"))).toBe(true)
  })
}
