import { expect, test } from "@playwright/test"

test("opens, issues and prints an invoice after bank verification", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: "test-token" }))
    localStorage.setItem("pho-viet-auth", JSON.stringify({ version: 0, state: {
      role: "CASHIER", branchId: 2, accessToken: "test-token", isAuthenticated: true,
      account: { id: 1, restaurantId: 1, fullName: "Thu ngân" },
    } }))
    window.print = () => {
      const count = Number(sessionStorage.getItem("print-count") ?? 0)
      sessionStorage.setItem("print-count", String(count + 1))
    }
  })
  await page.route("**/ws/**", (route) => route.abort())
  let status = "PENDING"
  let issued = 0
  let manualPayments = 0
  let amount = 45360
  const items = [1, 2].map((id) => ({
    id, dishId: 1, dishName: "Phở bò", quantity: 1, priceAtOrderTime: 20000, price: 20000, status: "PENDING",
  }))
  const invoice = () => ({
    id: 45, invoiceNumber: "HD-45", branchId: 2, branchName: "Chi nhánh",
    tableSessionId: 12, tableName: "Bàn 3", grandTotal: amount, status,
    totalPaid: status === "PENDING" ? 0 : amount,
    payments: status === "PENDING" ? [] : [{ id: 5, amount, method: "BANK_TRANSFER", bankVerified: true }],
  })
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
    let data: unknown = []
    if (path.endsWith("/branches/2")) data = { id: 2, name: "Chi nhánh", bankName: "STB", bankAccountNo: "123456789" }
    if (path.endsWith("/table-sessions/12")) data = { id: 12, branchId: 2, tableId: 3, tableName: "Bàn 3", status: "WAITING_FOR_PAY" }
    if (path.endsWith("/order-details/session/12")) data = items
    if (path.endsWith("/order-details/session/12/remove/1")) {
      items.shift()
      amount = 22680
      data = { id: 1, status: "CANCELLED" }
    }
    if (path.endsWith("/invoices/45/qr-code")) data = {
      invoiceId: 45, remainingAmount: amount, grandTotal: amount, totalPaid: 0, bankName: "STB",
      accountNo: "123456789", accountName: "Chi nhánh", transferContent: "PV45X", automaticVerification: true,
      qrImageUrl: "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='1'%20height='1'/%3E",
    }
    if (path.endsWith("/invoices/45/issue")) {
      issued += 1
      status = "ISSUED"
      data = invoice()
    }
    if (path.endsWith("/invoices/session/12") || path.endsWith("/invoices/45") || path.endsWith("/invoices")) data = invoice()
    if (path.endsWith("/payments") && request.method() === "POST") manualPayments += 1
    return route.fulfill({ headers, json: { data } })
  })
  await page.goto("/thu-ngan/thanh-toan/12")
  await page.getByRole("button", { name: "In tạm tính có QR" }).click()
  await expect(page).toHaveURL(/\/chuyen-khoan-qr$/)
  await expect(page.getByRole("button", { name: "Chuyển khoản QR" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("Đang chờ ngân hàng xác nhận chuyển khoản")).toBeVisible()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("print-count"))).toBe("1")
  await expect(page.getByText("×2", { exact: true })).toBeVisible()
  await page.emulateMedia({ media: "print" })
  const prebill = page.locator("#invoice-print")
  await expect(prebill.getByRole("heading", { name: "Phiếu tạm tính" })).toBeVisible()
  await expect(prebill.getByRole("img")).toBeVisible()
  await expect(prebill).toContainText("45.360đ")
  await page.emulateMedia({ media: "screen" })
  await page.getByRole("button", { name: "Bỏ món tính nhầm" }).click()
  const adjustment = page.getByRole("dialog", { name: "Bỏ món tính nhầm" })
  await adjustment.getByRole("radio").first().check()
  await adjustment.getByRole("button", { name: "Xác nhận bỏ món" }).click()
  await expect(adjustment).toBeHidden()
  await expect(page.getByText("×1", { exact: true })).toBeVisible()
  await page.emulateMedia({ media: "print" })
  await expect(prebill).toContainText("22.680đ")
  await expect(prebill).not.toContainText("45.360đ")
  await page.emulateMedia({ media: "screen" })
  status = "PAID"
  await expect(page).toHaveURL(/\/hoa-don-dien-tu\/45$/)
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("print-count"))).toBe("2")
  expect(issued).toBe(1)
  expect(manualPayments).toBe(0)
  await page.reload()
  await expect(page.getByRole("button", { name: "In hóa đơn" })).toBeEnabled()
  expect(await page.evaluate(() => sessionStorage.getItem("print-count"))).toBe("2")
})

test("groups repeated dishes into a single-page invoice without changing the total", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: "test-token" }))
    localStorage.setItem("pho-viet-auth", JSON.stringify({ version: 0, state: {
      role: "BRANCH_MANAGER", branchId: 2, accessToken: "test-token", isAuthenticated: true,
      account: { id: 1, restaurantId: 1, fullName: "Nhân viên test" },
    } }))
    window.print = () => document.body.setAttribute("data-print-called", "true")
  })
  await page.route("**/ws/**", (route) => route.abort())
  let writes = 0
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
    if (request.method() !== "GET") writes += 1
    let data: unknown = []
    if (path.endsWith("/assignments/account/1")) data = [{ id: 7, roleCode: "BRANCH_MANAGER", branchId: 2 }]
    if (path.endsWith("/branches/2")) data = { id: 2, name: "Chi Nhánh Quận 1", status: "ACTIVE" }
    if (path.endsWith("/invoices/45")) data = {
      id: 45, invoiceNumber: "HD-45", branchId: 2, branchName: "Chi Nhánh Quận 1",
      tableSessionId: 12, tableName: "Mang về #12", takeaway: true, status: "ISSUED",
      subTotalBeforeDiscount: 4289500, totalPromotionDiscount: 10000, promotionName: "Ưu đãi",
      serviceFee: 5000, vatAmount: 4400, grandTotal: 4288900, eInvoiceRef: "REF-45",
      eInvoiceIssuedAt: "2026-11-21T13:42:00",
      payments: [{ id: 1, method: "CASH", amount: 4288900, amountTendered: 4289500, changeAmount: 600 }],
    }
    if (path.endsWith("/order-details/session/12")) {
      const egg = { optionItemId: 8, optionItemName: "Trứng", priceSnapshot: 5000 }
      const noodle = { optionItemId: 9, optionItemName: "Mì thêm", priceSnapshot: 5000 }
      const pho = { dishId: 1, dishName: "Phở bò", quantity: 1, priceAtOrderTime: 55000, status: "SERVED" }
      const soup = { dishId: 2, dishName: "Bánh canh", quantity: 1, priceAtOrderTime: 100000, status: "SERVED",
        options: [{ ...noodle, id: 201 }] }
      data = [
        ...Array.from({ length: 60 }, (_, index) => {
          const toppings = index % 2 === 0 ? [egg, noodle] : [noodle, egg]
          return { ...pho, id: index + 1, orderId: index + 1, price: 65000,
            options: toppings.map((option, offset) => ({ ...option, id: index * 2 + offset + 1 })) }
        }),
        { ...pho, id: 101, price: 60000, options: [{ ...egg, id: 202 }] },
        { ...pho, id: 102, priceAtOrderTime: 57000, price: 67000, options: [{ ...egg, id: 203 }, { ...noodle, id: 204 }] },
        { ...soup, id: 103, weightKg: 1.5, price: 157500 },
        { ...soup, id: 104, weightKg: 1, price: 105000 },
        { id: 105, dishName: "Món đã hủy", quantity: 1, status: "CANCELLED", isBillable: false },
      ]
    }
    return route.fulfill({ headers, json: { data } })
  })

  await page.goto("/quan-ly-chi-nhanh/hoa-don/45")
  const print = page.getByRole("button", { name: "In hóa đơn" })
  const receipt = page.locator("#invoice-print")
  await expect(receipt).toBeHidden()
  await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(4)
  await print.click()
  await expect(page.locator("body")).toHaveAttribute("data-print-called", "true")
  expect(writes).toBe(0)

  await page.emulateMedia({ media: "print" })
  await expect(print).toBeHidden()
  await expect(page.getByRole("link", { name: "Sơ đồ bàn" })).toBeHidden()
  await expect(receipt).toBeVisible()
  await expect(receipt).toContainText("Mang về #12")
  await expect(receipt).toContainText("HD-45")
  await expect(receipt).toContainText("REF-45")
  await expect(receipt).toContainText("Trứng")
  await expect(receipt).toContainText("Ưu đãi")
  await expect(receipt).toContainText("4.288.900đ")
  await expect(receipt).toContainText("Tiền thối")
  await expect(receipt).not.toContainText("Món đã hủy")
  const lines = receipt.locator("tbody tr")
  await expect(lines).toHaveCount(4)
  await expect(lines.nth(0).getByRole("cell").nth(1)).toHaveText("60")
  await expect(lines.nth(0).getByRole("cell").nth(3)).toHaveText("3.900.000đ")
  await expect(lines.nth(2).getByRole("cell").nth(2)).toHaveText("57.000đ")
  await expect(lines.nth(3).getByRole("cell").nth(1)).toHaveText("2,5 kg")
  await expect(lines.nth(3).getByRole("cell").nth(3)).toHaveText("262.500đ")
  const pdf = await page.pdf({ format: "A4" })
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(1)
})
