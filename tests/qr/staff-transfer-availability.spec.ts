import { expect, test, type Page } from "@playwright/test"

const checkout = "/thu-ngan/thanh-toan/12"
const qrPayment = checkout + "/chuyen-khoan-qr"
const invoice = { id: 45, branchId: 2, tableSessionId: 12, status: "PENDING", grandTotal: 50000 }
const transfer = {
  invoiceId: 45,
  bankName: "VCB",
  accountNo: "123456789",
  accountName: "Chi nhánh Quận 1",
  transferContent: "TT HD45",
  remainingAmount: 50000,
  grandTotal: 50000,
  qrImageUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
}

async function mockCheckout(page: Page, { configured = true, qrStatus = () => 200, branchStatus = () => 200 } = {}) {
  const requests = { qr: 0, invoice: 0, payments: [] as unknown[] }
  await page.addInitScript(() => {
    localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: "test-token" }))
    localStorage.setItem("pho-viet-auth", JSON.stringify({ version: 0, state: {
      role: "CASHIER", branchId: 2, accessToken: "test-token", isAuthenticated: true,
      account: { id: 1, restaurantId: 1, fullName: "Thu ngân test" },
    } }))
  })
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" }
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers })

    let data: unknown = []
    if (path.endsWith("/branches/2")) {
      const status = branchStatus()
      if (status !== 200) return route.fulfill({ status, headers, json: { message: "Branch lookup failed" } })
      data = { id: 2, bankName: "VCB", bankAccountNo: configured ? transfer.accountNo : "  " }
    }
    if (path.endsWith("/table-sessions/12")) data = { id: 12, branchId: 2, tableId: 5, status: "WAITING_FOR_PAY" }
    if (path.endsWith("/invoices/session/12")) data = invoice
    if (path.endsWith("/invoices/45")) data = { ...invoice, status: "PAID", invoiceNumber: "HD-45" }
    if (path.endsWith("/invoices/45/qr-code")) {
      requests.qr += 1
      const status = qrStatus()
      if (status !== 200) return route.fulfill({ status, headers, json: { message: "QR unavailable" } })
      data = transfer
    }
    if (path.endsWith("/invoices") && request.method() === "POST") {
      requests.invoice += 1
      data = invoice
    }
    if (path.endsWith("/payments") && request.method() === "POST") {
      requests.payments.push(request.postDataJSON())
      data = { id: 1 }
    }
    return route.fulfill({ headers, json: { data } })
  })
  return requests
}

test("missing bank configuration keeps cash available on checkout and a direct QR link", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const requests = await mockCheckout(page, { configured: false })
  await page.goto(checkout)
  await expect(page.getByRole("button", { name: "Chuyển khoản QR" })).toBeDisabled()
  await expect(page.getByText("QR chưa khả dụng vì chi nhánh chưa cấu hình tài khoản ngân hàng.", { exact: false })).toBeVisible()

  await page.goto(qrPayment)
  await expect(page.getByText("QR chưa khả dụng", { exact: true })).toBeVisible()
  await expect(page.getByText("Đang chờ khách chuyển khoản")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Đối chiếu giao dịch" })).toHaveCount(0)
  await expect(page.getByRole("img", { name: "Mã VietQR chuyển khoản" })).toHaveCount(0)
  await page.getByRole("button", { name: "Chuyển sang tiền mặt" }).click()
  await expect(page).toHaveURL(checkout)
  await expect(page.getByRole("button", { name: "Khách đưa đủ" })).toBeEnabled()
  expect(requests).toEqual({ qr: 0, invoice: 0, payments: [] })
})

test("bank lookup failure gives a retry and leaves cash available", async ({ page }) => {
  let unavailable = true
  const requests = await mockCheckout(page, { branchStatus: () => unavailable ? 500 : 200 })
  await page.goto(checkout)
  await expect(page.getByText("Chưa kiểm tra được tài khoản nhận chuyển khoản.")).toBeVisible({ timeout: 12000 })
  await expect(page.getByRole("button", { name: "Chuyển khoản QR" })).toBeDisabled()
  await expect(page.getByRole("button", { name: "Khách đưa đủ" })).toBeEnabled()
  unavailable = false
  await page.getByRole("button", { name: "Thử lại", exact: true }).click()
  await expect(page.getByRole("button", { name: "Chuyển khoản QR" })).toBeEnabled()
  expect(requests).toEqual({ qr: 0, invoice: 0, payments: [] })
})

for (const invalidated of [false, true]) {
  test(invalidated ? "configuration removed during reconciliation blocks transfer" : "transfer requires manual reconciliation after QR recovers", async ({ page }) => {
    let qrStatus = invalidated ? 200 : 500
    const requests = await mockCheckout(page, { qrStatus: () => qrStatus })
    await page.goto(qrPayment)
    if (!invalidated) {
      await expect(page.getByText("Chưa tải được mã QR chuyển khoản.")).toBeVisible({ timeout: 12000 })
      await expect(page.getByText("Đang chờ khách chuyển khoản")).toHaveCount(0)
      await expect(page.getByRole("img", { name: "Mã VietQR chuyển khoản" })).toHaveCount(0)
      qrStatus = 200
      await page.getByRole("button", { name: "Thử tải lại mã QR" }).click()
    }

    await page.getByRole("button", { name: "Đối chiếu giao dịch" }).click()
    const dialog = page.getByRole("dialog", { name: "Đối chiếu giao dịch chuyển khoản" })
    await expect(dialog.getByText("TT HD45", { exact: true })).toBeVisible()
    const submit = dialog.getByRole("button", { name: "Ghi nhận chuyển khoản" })
    await expect(submit).toBeDisabled()
    await dialog.getByRole("checkbox").check()
    if (invalidated) qrStatus = 409
    await submit.click()
    if (invalidated) {
      await expect(page.getByText("QR chưa khả dụng", { exact: true })).toBeVisible()
      await expect(dialog).toBeHidden()
      expect(requests.payments).toEqual([])
    } else {
      await expect(page).toHaveURL("/thu-ngan/hoa-don-dien-tu/45")
      expect(requests.payments).toEqual([{ invoiceId: 45, method: "BANK_TRANSFER", amount: 50000 }])
    }
  })
}
