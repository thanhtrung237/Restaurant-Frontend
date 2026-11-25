import { expect, test } from "@playwright/test"

test("keeps report filters and export aligned when resizing the page", async ({ page }) => {
  await page.setViewportSize({ width: 1760, height: 900 })
  await page.addInitScript(() => {
    localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: "test-token" }))
    localStorage.setItem(
      "pho-viet-auth",
      JSON.stringify({
        version: 0,
        state: {
          role: "RESTAURANT_ADMIN",
          branchId: null,
          accessToken: "test-token",
          isAuthenticated: true,
          account: { id: 1, restaurantId: 1, fullName: "Quản trị" },
        },
      }),
    )
  })
  await page.route("**/ws/**", (route) => route.abort())
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith("/reports/export")) {
      return route.fulfill({ contentType: "text/csv", body: "date,total\n2026-11-26,0" })
    }
    const data = path.endsWith("/branches/restaurant/1")
      ? [{ id: 2, name: "Phở Việt Quận 1" }]
      : null
    return route.fulfill({ json: { data } })
  })

  await page.goto("/quan-tri-nha-hang/bao-cao")
  const exportButton = page.getByRole("button", { name: "Xuất báo cáo", exact: true })
  const branch = page.getByRole("button", { name: "Tất cả chi nhánh", exact: true })
  const date = page.getByRole("button", { name: /Chọn khoảng thời gian báo cáo/ })
  await expect(page.getByRole("button", { name: "Hôm qua", exact: true })).toBeVisible()

  for (const width of [1760, 1440, 1280, 1024, 834, 768]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(exportButton).toBeInViewport({ ratio: 1 })
    const [branchBounds, dateBounds, exportBounds] = await Promise.all([
      branch.boundingBox(),
      date.boundingBox(),
      exportButton.boundingBox(),
    ])
    expect(branchBounds!.y).toBe(dateBounds!.y)
    expect(dateBounds!.y).toBe(exportBounds!.y)
    expect(exportBounds!.x).toBeGreaterThan(dateBounds!.x + dateBounds!.width)
  }

  await page.getByRole("button", { name: "Mở rộng thanh bên" }).click()
  await page.getByRole("tab", { name: "Theo khung giờ" }).click()
  await expect(exportButton).toBeInViewport({ ratio: 1 })
  await date.click()
  await expect(page.getByRole("dialog").getByRole("button", { name: "Hôm qua" })).toBeVisible()
  await page.keyboard.press("Escape")
  await exportButton.click()
  const downloaded = page.waitForEvent("download")
  await page.getByRole("button", { name: /Xuất CSV/ }).click()
  expect((await downloaded).suggestedFilename()).toMatch(/^bao-cao-khung-gio-.*\.csv$/)
})

for (const width of [390, 1280]) {
  test(`report calendar jumps to past years at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.clock.setFixedTime(new Date(2026, 10, 21, 12))
    await page.addInitScript(() => {
      localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: "test-token" }))
      localStorage.setItem(
        "pho-viet-auth",
        JSON.stringify({
          version: 0,
          state: {
            role: "BRANCH_MANAGER",
            branchId: 2,
            accessToken: "test-token",
            isAuthenticated: true,
            account: { id: 1, restaurantId: 1, fullName: "Quản lý" },
          },
        }),
      )
    })
    await page.route("**/api/v1/**", async (route) => {
      const url = new URL(route.request().url())
      const historical = url.searchParams.get("from")?.startsWith("2023-02-10")
      const data = url.pathname.endsWith("/reports/revenue")
        ? {
            totalRevenue: historical ? "6000000" : "0",
            avgRevenuePerInvoice: "0",
            revenueByPaymentMethod: historical ? { CASH: "1000000", BANK_TRANSFER: "3000000" } : {},
            totalInvoices: 0,
            totalGuests: 0,
            trend: historical
              ? [
                  { label: "2023-02", revenue: "1000000" },
                  { label: "2023-03", revenue: "2000000" },
                  { label: "2024-02", revenue: "3000000" },
                ]
              : [],
          }
        : url.pathname.endsWith("/reports/hourly") &&
            url.searchParams.get("from")?.startsWith("2026-11-20")
          ? { hourlySlots: [{ hour: 13, label: "13:00–14:00", revenue: "3614625" }] }
          : null
      await route.fulfill({ json: { data } })
    })

    await page.goto("/quan-ly-chi-nhanh/bao-cao")
    await expect(page.getByText("Chưa có doanh thu trong khoảng này")).toBeVisible()
    const paymentChart = page.getByRole("region", { name: "Phương thức thanh toán" })
    await expect(paymentChart.getByText("Chưa có thanh toán phát sinh")).toBeVisible()
    const rangeButton = page.getByRole("button", { name: /Chọn khoảng thời gian báo cáo/ })
    await rangeButton.click()
    await page.getByRole("dialog").getByRole("button", { name: "Hôm qua", exact: true }).click()
    await page.getByRole("button", { name: "Áp dụng", exact: true }).click()
    const hourlyChart = page
      .getByRole("heading", { name: /Doanh thu theo khung giờ · Hôm qua/ })
      .locator("..")
    await hourlyChart.locator(".recharts-bar-rectangle").hover()
    await expect(hourlyChart.locator('path[fill="#EA4A2A"]')).toBeVisible()
    await expect(hourlyChart.getByText("3.614.625đ", { exact: true })).toBeVisible()

    await rangeButton.click()
    const year = page.getByRole("combobox", { name: "Năm hiển thị" })
    const month = page.getByRole("combobox", { name: "Tháng hiển thị" })
    await expect(month.getByRole("option", { name: "Tháng 12" })).toBeDisabled()

    await year.selectOption("2023")
    await month.selectOption("1")
    await page.getByRole("button", { name: "10/02/2023", exact: true }).click()
    await year.selectOption("2024")
    await page.getByRole("button", { name: "29/02/2024", exact: true }).click()
    await expect(rangeButton).toHaveAccessibleName(/20\/11\/2026/)
    const requestedRange = page.waitForRequest((request) => {
      const url = new URL(request.url())
      return (
        url.pathname.endsWith("/reports/revenue") &&
        url.searchParams.get("from") === "2023-02-10T00:00:00" &&
        url.searchParams.get("to") === "2024-02-29T23:59:59" &&
        url.searchParams.get("groupBy") === "MONTH"
      )
    })
    await page.getByRole("button", { name: "Áp dụng", exact: true }).click()
    await requestedRange
    await expect(page.getByRole("heading", { name: "Doanh thu theo tháng" })).toBeVisible()
    await expect(rangeButton).toHaveAccessibleName(/10\/02\/2023 – 29\/02\/2024/)
    const legend = paymentChart.getByRole("list", { name: "Số tiền và tỷ trọng theo phương thức" })
    await expect(paymentChart.locator("path.recharts-sector")).toHaveCount(2)
    await expect(paymentChart.getByText(/4\.000\.000/)).toBeVisible()
    await expect(legend.getByRole("listitem").filter({ hasText: "Tiền mặt" })).toContainText(
      "25.0%",
    )
    await expect(legend.getByRole("listitem").filter({ hasText: "Chuyển khoản QR" })).toContainText(
      "75.0%",
    )
    await paymentChart.locator("path.recharts-sector").first().dispatchEvent("mouseover")
    await expect(paymentChart.locator(".recharts-tooltip-item-value")).toHaveText(
      /1\.000\.000.*25\.0%/,
    )

    await rangeButton.click()
    await page.getByRole("button", { name: "Năm trước", exact: true }).click()
    await expect(page.getByRole("button", { name: /Từ ngày.*01\/01\/2025/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /Đến ngày.*31\/12\/2025/ })).toBeVisible()
    await page.getByRole("button", { name: "Hủy", exact: true }).click()
    await expect(rangeButton).toHaveAccessibleName(/10\/02\/2023 – 29\/02\/2024/)

    await rangeButton.click()
    await page.getByRole("button", { name: /^Đến ngày/ }).click()
    await year.selectOption("2026")
    await month.selectOption("4")
    await page.getByRole("button", { name: "01/05/2026", exact: true }).click()
    await page.getByRole("button", { name: "Áp dụng", exact: true }).click()
    const yearlyChart = page.getByRole("heading", { name: "Doanh thu theo năm" }).locator("..")
    await expect(yearlyChart.getByText("2023", { exact: true })).toBeVisible()
    await expect(yearlyChart.getByText("2026", { exact: true })).toBeVisible()
    const firstBar = yearlyChart.locator(".recharts-bar-rectangle").first()
    await expect(firstBar.locator("path")).toHaveCSS("fill", "rgb(253, 215, 199)")
    await firstBar.hover()
    await expect(yearlyChart.locator('path[fill="#EA4A2A"]')).toBeVisible()
    await expect(yearlyChart.getByText("Năm 2023", { exact: true })).toBeVisible()
    await expect(yearlyChart.getByText(/3\.000\.000/)).toBeVisible()
    await yearlyChart.getByRole("heading").hover()
    await expect(yearlyChart.getByText("Năm 2023", { exact: true })).toHaveCount(0)
  })
}
