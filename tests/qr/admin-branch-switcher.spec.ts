import { expect, test } from "@playwright/test"
import { mockSessionRefresh } from "./staff-session"

test("restaurant admin can switch table maps and open settings for a different branch", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1231, height: 905 })
  await page.addInitScript(() => {
    localStorage.setItem(
      "pho-viet-auth",
      JSON.stringify({
        version: 1,
        state: {
          role: "RESTAURANT_ADMIN",
          branchId: null,
          assignmentId: -1,
          account: { id: 1, restaurantId: 1, fullName: "Quản trị test" },
        },
      }),
    )
  })

  await page.route("**/ws/**", (route) => route.abort())
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    }
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers })
      return
    }

    const branches = [
      { id: 10, restaurantId: 1, name: "Chi nhánh Quận 1", status: "ACTIVE" },
      { id: 20, restaurantId: 1, name: "Chi nhánh Quận 7", status: "ACTIVE" },
      { id: 30, restaurantId: 1, name: "Chi nhánh Quận 3", status: "ACTIVE" },
      { id: 40, restaurantId: 1, name: "Chi nhánh Quận 4", status: "ACTIVE" },
    ]
    let data: unknown = []
    if (path.endsWith("/assignments/account/1"))
      data = [{ id: 7, roleCode: "MANAGER", roleName: "Quản trị nhà hàng", branchId: null }]
    if (path.endsWith("/branches/restaurant/1")) data = branches
    if (path.endsWith("/restaurants/1")) data = { id: 1, name: "Nhà hàng test" }
    for (const branch of branches) {
      if (path.endsWith("/branches/" + branch.id)) data = branch
      if (path.endsWith("/tables/branch/" + branch.id)) {
        data = [
          {
            id: branch.id,
            branchId: branch.id,
            name: "Bàn riêng " + branch.id,
            capacity: 4,
            status: "AVAILABLE",
          },
        ]
      }
    }

    await route.fulfill({ headers, json: { data } })
  })

  const tableMap = "/restaurant-admin/table-map"
  await mockSessionRefresh(page)
  await page.goto(tableMap)
  await expect(page.getByText("Chọn một chi nhánh để tiếp tục")).toBeVisible()
  await page
    .getByRole("button", { name: /^Chi nhánh hiện tại: Tất cả chi nhánh/ })
    .last()
    .click()
  await expect(page.getByRole("button", { name: /Toàn nhà hàng/ })).toHaveCount(0)
  await page.getByRole("button", { name: /Chi nhánh Quận 1/ }).click()
  await expect(page.getByText("Bàn riêng 10", { exact: true })).toBeVisible()

  const trigger = page.getByRole("button", { name: /^Chi nhánh hiện tại: Chi nhánh Quận 1/ })
  await trigger.click()
  const picker = page.getByRole("dialog", { name: "Chuyển chi nhánh" })
  const activeOption = picker.getByRole("button", { name: /Chi nhánh Quận 1/ })
  await expect(activeOption).toHaveAttribute("aria-current", "true")
  await expect
    .poll(() =>
      activeOption.evaluate((option) => {
        const badge = option.querySelector(":scope > span")?.getBoundingClientRect()
        const check = option.querySelector("svg")?.getBoundingClientRect()
        return Boolean(
          badge &&
          check &&
          check.left > badge.right &&
          Math.abs(check.y + check.height / 2 - badge.y - badge.height / 2) < 1,
        )
      }),
    )
    .toBe(true)

  const table = await page.getByRole("button", { name: /Bàn riêng 10/ }).boundingBox()
  expect(table).not.toBeNull()
  await expect
    .poll(() =>
      picker.evaluate((element, tableRect) => {
        const popupRect = element.getBoundingClientRect()
        const left = Math.max(tableRect.x, popupRect.left)
        const right = Math.min(tableRect.x + tableRect.width, popupRect.right)
        const top = Math.max(tableRect.y, popupRect.top)
        const bottom = Math.min(tableRect.y + tableRect.height, popupRect.bottom)
        if (left >= right || top >= bottom) return false
        return element.contains(document.elementFromPoint((left + right) / 2, (top + bottom) / 2))
      }, table!),
    )
    .toBe(true)

  await page.keyboard.press("Escape")
  await expect(picker).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await picker.getByRole("button", { name: /Chi nhánh Quận 7/ }).click()
  await expect(page.getByText("Bàn riêng 20", { exact: true })).toBeVisible()
  await expect(page.getByText("Bàn riêng 10", { exact: true })).toHaveCount(0)
  await expect(page).toHaveURL(tableMap)

  const branchList = "/restaurant-admin/branches"
  await page.setViewportSize({ width: 1908, height: 909 })
  await page.goto(branchList)
  const configureDistrict1 = page.getByRole("link", {
    name: "Cấu hình chi nhánh: Chi nhánh Quận 1",
  })
  await expect(configureDistrict1).toHaveAttribute("href", branchList + "/10/settings")
  await expect(
    page.getByRole("link", { name: "Cấu hình chi nhánh: Chi nhánh Quận 7" }),
  ).toHaveAttribute("href", branchList + "/20/settings")
  const title = page.getByRole("heading", { name: "Chi nhánh Quận 1", exact: true })
  const card = page.locator('[data-slot="card"]').filter({ has: title })
  const detailLink = card.getByRole("link", { name: "Xem chi tiết: Chi nhánh Quận 1" })
  const [nameBox, statusBox, editBox, toggleBox, configBox, detailBox] = await Promise.all(
    [
      title,
      card.getByText("Hoạt động", { exact: true }),
      card.getByRole("button", { name: "Chỉnh sửa Chi nhánh Quận 1" }),
      card.getByRole("button", { name: "Ngừng hoạt động Chi nhánh Quận 1" }),
      configureDistrict1,
      detailLink,
    ].map((element) => element.boundingBox()),
  )
  expect(statusBox!.x - (nameBox!.x + nameBox!.width)).toBeCloseTo(8)
  expect(editBox!.x).toBeGreaterThan(statusBox!.x + statusBox!.width)
  expect(toggleBox!.x).toBeGreaterThan(editBox!.x)
  expect(toggleBox!.y).toBeCloseTo(editBox!.y)
  expect(configBox!.y).toBeGreaterThan(editBox!.y)
  expect(detailBox!.y).toBeCloseTo(configBox!.y)
  expect(detailBox!.width).toBeCloseTo(configBox!.width)
  expect(detailBox!.height).toBeCloseTo(configBox!.height)
  await expect(detailLink.locator("svg")).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(async () => {
      const [config, detail] = await Promise.all([
        configureDistrict1.boundingBox(),
        detailLink.boundingBox(),
      ])
      return Boolean(
        config &&
        detail &&
        config.x < detail.x &&
        Math.abs(config.y - detail.y) < 1 &&
        Math.abs(config.width - detail.width) < 1 &&
        Math.abs(config.height - detail.height) < 1,
      )
    })
    .toBe(true)
  await page.setViewportSize({ width: 1231, height: 905 })
  await configureDistrict1.click()
  await expect(page).toHaveURL(branchList + "/10/settings")
  await expect(page.getByText("Kiểm tra vị trí khi quét QR")).toBeVisible()
  await expect(page.getByRole("checkbox", { name: "Bật kiểm tra vị trí" })).toBeEnabled()
  await expect(page.getByRole("button", { name: "Lưu cấu hình vị trí" })).toBeVisible()
  await expect(page.locator("#branch-bank-name")).toBeEnabled()
  await expect(page.locator("#branch-bank-account")).toBeEnabled()
  await expect(page.getByText(/^Chi nhánh Quận 1 · /)).toBeVisible()

  await page.goBack()
  await page.getByRole("link", { name: "Xem chi tiết: Chi nhánh Quận 7" }).click()
  await expect(page).toHaveURL(branchList + "/20")
  await expect(page.getByText("Menu chi nhánh", { exact: true })).toBeVisible()

  await page.goto("/restaurant-admin/roles-permissions")
  await expect(page.getByRole("heading", { name: "Vai trò & phân quyền" }).first()).toBeVisible()
  await expect(page.getByRole("button", { name: "Nhân viên", exact: true })).toBeVisible()
})

test("branch managers can save operational settings with bank fields disabled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    localStorage.setItem(
      "pho-viet-auth",
      JSON.stringify({
        version: 1,
        state: {
          role: "BRANCH_MANAGER",
          branchId: 10,
          assignmentId: 7,
          account: { id: 1, restaurantId: 1, fullName: "Quản lý test" },
        },
      }),
    )
  })
  await page.route("**/ws/**", (route) => route.abort())
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
    if (path.endsWith("/branches/10")) {
      data = {
        id: 10,
        restaurantId: 1,
        name: "Chi nhánh Quận 1",
        geofenceEnabled: true,
        latitude: 10.5,
        longitude: 106.5,
        bankAccountNo: "0123456789",
      }
    } else if (path.endsWith("/assignments/account/1")) {
      data = [{ id: 7, roleCode: "BRANCH_MANAGER", branchId: 10, branchName: "Chi nhánh Quận 1" }]
    }
    await route.fulfill({ headers, json: { data } })
  })

  await mockSessionRefresh(page)
  await page.goto("/branch-manager/settings")
  await expect(page.getByRole("heading", { name: "Cấu hình chi nhánh", exact: true })).toBeVisible()
  await expect(page.getByText("Tài khoản nhận chuyển khoản", { exact: true })).toBeVisible()
  await expect(page.getByText("Kiểm tra vị trí khi quét QR", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("checkbox", { name: "Bật kiểm tra vị trí" })).toHaveCount(0)
  await expect(page.locator("#branch-bank-name")).toBeDisabled()
  await expect(page.locator("#branch-bank-account")).toBeDisabled()
  await expect(page.locator("#branch-bank-account")).toHaveValue("0123456789")

  const manager = page.getByText("Cấu hình Quản lý chi nhánh", { exact: true })
  const bank = page.getByText("Tài khoản nhận chuyển khoản", { exact: true })
  const rules = page.getByText("Quy tắc vận hành", { exact: true })
  const admin = page.getByText("Cấu hình Quản trị nhà hàng", { exact: true })
  const [managerBox, bankBox, rulesBox, adminBox] = await Promise.all(
    [manager, bank, rules, admin].map((cardTitle) => cardTitle.boundingBox()),
  )
  expect(bankBox!.x).toBeCloseTo(managerBox!.x)
  expect(rulesBox!.x).toBeGreaterThan(bankBox!.x)
  expect(bankBox!.y).toBeGreaterThan(managerBox!.y)
  expect(rulesBox!.y).toBeCloseTo(bankBox!.y)
  expect(rulesBox!.x).toBeLessThan(adminBox!.x)
  expect(adminBox!.x).toBeGreaterThan(managerBox!.x)
  expect(adminBox!.y).toBeCloseTo(managerBox!.y)

  const [bankCard, rulesCard, adminCard] = await Promise.all(
    [bank, rules, admin].map((title) =>
      page.locator('[data-slot="card"]').filter({ has: title }).boundingBox(),
    ),
  )
  expect(bankCard!.width).toBeCloseTo(rulesCard!.width)
  expect(bankCard!.height).toBeCloseTo(rulesCard!.height)
  const bottom = adminCard!.y + adminCard!.height
  expect(bankCard!.y + bankCard!.height).toBeCloseTo(bottom)
  const saveButton = await page
    .getByRole("button", { name: "Lưu thay đổi", exact: true })
    .boundingBox()
  expect(saveButton!.y).toBeGreaterThan(bottom)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(async () => {
      const [bankCard, rulesCard, adminCard] = await Promise.all([
        bank.boundingBox(),
        rules.boundingBox(),
        admin.boundingBox(),
      ])
      return Boolean(
        bankCard &&
        rulesCard &&
        adminCard &&
        Math.abs(bankCard.x - rulesCard.x) < 1 &&
        Math.abs(bankCard.x - adminCard.x) < 1 &&
        bankCard.y < rulesCard.y &&
        rulesCard.y < adminCard.y,
      )
    })
    .toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)

  await page.getByLabel("Thời gian giữ chỗ đặt bàn (phút)").fill("20")
  const request = page.waitForRequest(
    (candidate) =>
      candidate.method() === "PUT" && candidate.url().endsWith("/branches/10/config/manager"),
  )
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click()
  const body = (await request).postDataJSON()
  expect(body.reservationHoldMinutes).toBe(20)
  expect(body).not.toHaveProperty("bankName")
  expect(body).not.toHaveProperty("bankAccountNo")

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/branch-manager/audit-log")
  await expect(page.getByRole("button", { name: "Nhân viên", exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Vai trò & phân quyền", exact: true }).click()
  await expect(page).toHaveURL("/branch-manager/roles-permissions")
  await expect(page.getByRole("heading", { name: "Vai trò & phân quyền" }).first()).toBeVisible()
  await expect(page.getByText("Cấu hình vai trò & quyền", { exact: true }).first()).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Vai trò & phân quyền", exact: true }),
  ).toHaveAttribute("aria-current", "page")
  await expect(page.getByRole("button", { name: "Nhân viên", exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Nhật ký hoạt động", exact: true }).click()
  await expect(page).toHaveURL("/branch-manager/audit-log")
})
