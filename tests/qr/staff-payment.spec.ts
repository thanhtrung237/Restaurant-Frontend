import { expect, test } from "@playwright/test"

import type { Page } from "@playwright/test"

const session = { id: 12, tableId: 5, branchId: 2, tableName: "Bàn 5", status: "WAITING_FOR_PAY" }
const invoice = { id: 45, tableSessionId: 12, branchId: 2, subTotalBeforeDiscount: 50000, grandTotal: 50000, status: "PENDING" }
const roles = [
  { role: "BRANCH_MANAGER", prefix: "/quan-ly-chi-nhanh", branchId: 2, invoicePath: "hoa-don" },
  { role: "RESTAURANT_ADMIN", prefix: "/quan-tri-nha-hang", branchId: null, invoicePath: "hoa-don" },
  { role: "CASHIER", prefix: "/thu-ngan", branchId: 2, invoicePath: "hoa-don-dien-tu" },
]

async function checkPaymentButtons(page: Page, selected: "Tiền mặt" | "Chuyển khoản QR") {
  await page.mouse.move(0, 0)
  const group = page.getByRole("group", { name: "Phương thức thanh toán" })
  const active = group.getByRole("button", { name: selected, pressed: true })
  const inactive = group.getByRole("button", { pressed: false })
  await expect(active).toBeVisible()
  await expect(inactive).toBeVisible()
  const [activeBounds, inactiveBounds] = await Promise.all([active.boundingBox(), inactive.boundingBox()])
  expect(Math.abs(activeBounds!.width - inactiveBounds!.width)).toBeLessThanOrEqual(1)
  expect(activeBounds!.height).toBe(inactiveBounds!.height)
  expect(activeBounds!.height).toBeGreaterThanOrEqual(48)
  expect(activeBounds!.y).toBe(inactiveBounds!.y)
  return Promise.all([active, inactive].map((button) => button.evaluate((element) => getComputedStyle(element).backgroundColor)))
}

for (const { role, prefix, branchId, invoicePath } of roles) {
  test(role + " can switch between QR and cash and open the paid invoice", async ({ page }) => {
    const isMobileCheckout = role === "CASHIER"
    const confirmedTotal = isMobileCheckout ? 57200 : invoice.grandTotal
    let invoiceRequests = 0
    let invoiceExists = false
    let cashPayments = 0
    let verifyHigherTotal = false
    if (isMobileCheckout) await page.setViewportSize({ width: 390, height: 844 })

    await page.addInitScript(({ role, branchId }) => {
      localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: "test-token" }))
      localStorage.setItem("pho-viet-auth", JSON.stringify({ version: 0, state: {
        role, branchId, accessToken: "test-token", isAuthenticated: true,
        account: { id: 1, restaurantId: 1, fullName: "Nhân viên test" },
      } }))
    }, { role, branchId })

    await page.route("**/api/v1/**", async (route) => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" }
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers })
        return
      }
      let data: unknown = []
      if (path.endsWith("/branches/2")) data = { id: 2, bankName: "VCB", bankAccountNo: "123456789" }
      if (path.endsWith("/table-sessions/12")) data = session
      if (path.endsWith("/table-sessions/12/bill-preview")) {
        data = {
          grossSubTotal: 50000, itemPromotionDiscount: 0, orderPromotionDiscount: 0,
          manualDiscount: 0, serviceFeeRate: 0, serviceFee: 0,
          vatRate: 0, vatOnServiceFee: true, vatBase: 50000, vatAmount: 0, grandTotal: 50000,
        }
      }
      if (path.endsWith("/invoices/session/12")) {
        if (!invoiceExists) {
          await route.fulfill({ status: 404, headers, json: { message: "Chưa có hóa đơn cho phiên" } })
          return
        }
        data = invoice
      }
      if (path.endsWith("/invoices/45/qr-code")) {
        await route.fulfill({ status: 409, headers, json: { message: "Chi nhánh chưa cấu hình tài khoản ngân hàng" } })
        return
      }
      if (path.endsWith("/invoices/45")) data = {
        ...invoice, grandTotal: verifyHigherTotal ? confirmedTotal : invoice.grandTotal,
        status: cashPayments ? "ISSUED" : "PENDING", invoiceNumber: "HD-45",
      }
      if (path.endsWith("/invoices") && request.method() === "POST") {
        expect(request.postDataJSON()).toMatchObject({ branchId: 2, tableSessionId: 12 })
        invoiceRequests += 1
        invoiceExists = true
        data = { ...invoice, grandTotal: verifyHigherTotal ? confirmedTotal : invoice.grandTotal }
      }
      if (path.endsWith("/payments") && request.method() === "POST") {
        expect(request.postDataJSON()).toMatchObject({
          method: "CASH", amount: confirmedTotal, amountTendered: confirmedTotal, invoiceId: 45,
        })
        cashPayments += 1
        data = { id: 1 }
      }
      await route.fulfill({ headers, json: { data } })
    })

    const checkout = prefix + "/thanh-toan/12"
    await page.goto(checkout)
    await expect(page.getByRole("region", { name: "Thanh toán" })).toBeVisible()
    expect(invoiceRequests).toBe(0)
    const cashColors = await checkPaymentButtons(page, "Tiền mặt")
    await page.getByRole("button", { name: "Chuyển khoản QR" }).click()
    await expect(page).toHaveURL(checkout + "/chuyen-khoan-qr")
    await expect(page.getByText("QR chưa khả dụng", { exact: true })).toBeVisible()
    const qrColors = await checkPaymentButtons(page, "Chuyển khoản QR")
    expect(cashColors[0]).not.toBe(cashColors[1])
    expect(qrColors).toEqual(cashColors)
    await expect(page.getByText("Đang chờ khách chuyển khoản")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Đối chiếu giao dịch" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Mở cấu hình chi nhánh" })).toHaveCount(isMobileCheckout ? 0 : 1)
    await page.getByRole("button", { name: "Chuyển sang tiền mặt" }).click()
    await expect(page).toHaveURL(checkout)

    const payment = page.getByRole("region", { name: "Thanh toán" })
    const methods = payment.getByRole("group", { name: "Phương thức thanh toán" })
    const tender = payment.getByRole("textbox", { name: "Tiền khách đưa" })
    const issue = payment.getByRole("button", { name: "Thu tiền & phát hành hóa đơn" })
    const exactCash = payment.getByRole("button", { name: "Khách đưa đủ", exact: true })
    await expect(issue).toBeDisabled()
    if (isMobileCheckout) {
      await expect(methods).toBeInViewport()
      await expect(tender).toBeInViewport()
      const tenderBounds = await tender.boundingBox()
      const issueBounds = await issue.boundingBox()
      expect(issueBounds!.y).toBeGreaterThan(tenderBounds!.y + tenderBounds!.height)
      expect(await issue.evaluate((element) => getComputedStyle(element.parentElement!).position)).toBe("static")
    }

    const initialInvoiceRequests = invoiceRequests
    await tender.fill("42800")
    await expect(payment.getByRole("status")).toHaveText("Còn thiếu 7.200đ")
    await expect(issue).toBeDisabled()
    await tender.press("Enter")
    expect(invoiceRequests).toBe(initialInvoiceRequests)
    expect(cashPayments).toBe(0)

    await tender.fill("60000")
    await expect(payment.getByRole("status")).toHaveText("Tiền thối lại 10.000đ")
    await exactCash.click()
    await expect(tender).toHaveValue("50.000")
    await expect(issue).toBeEnabled()
    verifyHigherTotal = isMobileCheckout
    await issue.click()
    if (isMobileCheckout) {
      await expect(payment.getByRole("status")).toHaveText("Còn thiếu 7.200đ")
      await expect(issue).toBeDisabled()
      expect(cashPayments).toBe(0)
      await exactCash.click()
      await expect(tender).toHaveValue("57.200")
      await issue.click()
    }
    await expect(page).toHaveURL(prefix + "/" + invoicePath + "/45")
    expect(cashPayments).toBe(1)
    await expect(page.getByText("HD-45", { exact: true }).first()).toBeVisible()
  })
}

test("cash and QR show the same persisted discount after replacing and removing it", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: "test-token" }))
    localStorage.setItem("pho-viet-auth", JSON.stringify({ version: 0, state: {
      role: "RESTAURANT_ADMIN", branchId: 2, accessToken: "test-token", isAuthenticated: true,
      account: { id: 1, restaurantId: 1, fullName: "Nhân viên test" },
    } }))
  })

  let discount = 15000
  let shared = false
  let approvalPending = false
  const savedAmounts: number[] = []
  let invoiceWrites = 0
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = {
      "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    }
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers })

    if (path.endsWith("/invoices/45/share-quote")) {
      shared = true
      return route.fulfill({ status: 204, headers })
    }
    if (path.endsWith("/manual-discounts/invoice/45")) {
      if (request.method() === "DELETE") {
        expect(shared).toBe(true)
        approvalPending = true
      } else {
        discount = request.postDataJSON().value
        savedAmounts.push(discount)
      }
    }
    if (path.endsWith("/approval/true")) {
      expect(request.postDataJSON()).toEqual({ requestId: "approval-45" })
      approvalPending = false
      discount = 0
      savedAmounts.push(discount)
    }
    if (request.method() === "POST" && path.endsWith("/invoices")) invoiceWrites += 1

    const total = invoice.grandTotal - discount
    let data: unknown = []
    if (path.endsWith("/table-sessions/12")) data = session
    if (path.endsWith("/branches/2")) data = { id: 2, bankName: "VCB", bankAccountNo: "123456789" }
    if (path.endsWith("/approval")) data = { requestId: "approval-45", requestedBy: 2, reason: "Bỏ chiết khấu toàn hóa đơn" }
    if (path.endsWith("/invoices/session/12") || path.endsWith("/invoice/45") || path.endsWith("/approval/true")) {
      data = { ...invoice, quoteShared: shared, discountApprovalPending: approvalPending,
        totalManualDiscount: discount, grandTotal: total, remainingAmount: total }
    }
    if (path.endsWith("/invoices/45/qr-code")) data = {
      invoiceId: 45, grandTotal: total, remainingAmount: total, bankName: "VCB",
      accountNo: "123456789", accountName: "Chi nhánh thử", transferContent: "PV45X",
      qrImageUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    }
    return route.fulfill({ headers, json: { data } })
  })

  await page.goto("/quan-tri-nha-hang/thanh-toan/12")
  const cash = page.getByRole("region", { name: "Thanh toán" })
  const discountButton = cash.getByRole("button", { name: "Thay chiết khấu tay" })
  await expect(cash.getByRole("button", { name: /áp khuyến mãi|bỏ khuyến mãi/i })).toHaveCount(0)
  await expect(discountButton).toHaveText("−15.000đ")
  await discountButton.click()
  const dialog = page.getByRole("dialog")
  const input = dialog.getByRole("textbox", { name: "Số tiền giảm (đ)" })
  await expect(input).toHaveValue("")
  await expect(dialog.getByRole("button", { name: "Lưu chiết khấu mới" })).toBeDisabled()
  await input.fill("10.000")
  await dialog.getByRole("textbox", { name: "Lý do (bắt buộc)" }).fill("Điều chỉnh số tiền giảm")
  await expect(dialog.getByText("−10.000đ")).toBeVisible()
  await dialog.getByRole("button", { name: "Lưu chiết khấu mới" }).click()
  await expect(discountButton).toHaveText("−10.000đ")
  await expect(cash.getByText("40.000đ", { exact: true })).toBeVisible()

  await cash.getByRole("button", { name: "Chuyển khoản QR" }).click()
  await expect(page.getByRole("img", { name: "Mã VietQR chuyển khoản" })).toBeVisible()
  await expect(page.getByText("−10.000đ", { exact: true }).first()).toBeVisible()
  await page.goBack()
  await expect(discountButton).toHaveText("−10.000đ")
  await cash.getByRole("button", { name: "Yêu cầu bỏ chiết khấu tay" }).click()
  await expect(cash.getByText("Chiết khấu đang chờ quản lý duyệt")).toBeVisible()
  await expect(discountButton).toHaveText("−10.000đ")
  await cash.getByRole("button", { name: "Duyệt", exact: true }).click()
  await expect(cash.getByRole("button", { name: "+ Nhập chiết khấu" })).toBeVisible()
  await expect(cash.getByText("50.000đ", { exact: true }).first()).toBeVisible()
  await cash.getByRole("button", { name: "Chuyển khoản QR" }).click()
  await expect(page.getByRole("img", { name: "Mã VietQR chuyển khoản" })).toBeVisible()
  await expect(page.getByText("−10.000đ", { exact: true })).toHaveCount(0)
  expect(savedAmounts).toEqual([10000, 0])
  expect(invoiceWrites).toBe(0)
})
