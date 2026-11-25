import { expect, test } from "@playwright/test"

test("creates areas, moves tables and safely removes them from branch operations", async ({
  page,
}) => {
  test.setTimeout(60000)
  const branch = { id: 10, restaurantId: 1, name: "Chi nhánh Quận 1", status: "ACTIVE" }
  const areas = [{ id: 1, branchId: branch.id, name: "Tầng 1", status: "ACTIVE" }]
  const tables = [
    {
      id: 30,
      branchId: branch.id,
      name: "Bàn 01",
      capacity: 4,
      areaId: 1,
      areaName: "Tầng 1",
      status: "AVAILABLE",
      qrCode: "QR-B10-01",
    },
  ]

  await page.addInitScript(() => {
    localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: "test-token" }))
    localStorage.setItem(
      "pho-viet-auth",
      JSON.stringify({
        version: 0,
        state: {
          role: "BRANCH_MANAGER",
          branchId: 10,
          assignmentId: 7,
          accessToken: "test-token",
          isAuthenticated: true,
          account: { id: 1, restaurantId: 1, fullName: "Quản lý test" },
        },
      }),
    )
  })
  await page.route("**/ws/**", (route) => route.abort())
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace("/api/v1", "")
    const method = request.method()
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    }
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers })
    let data: unknown = []
    if (path === "/branches/10") data = branch
    if (path === "/assignments/account/1")
      data = [{ id: 7, roleCode: "BRANCH_MANAGER", branchId: 10 }]
    if (path === "/areas/branch/10") data = areas
    if (path === "/tables/branch/10") data = tables
    if (path === "/areas" && method === "POST") {
      const body = request.postDataJSON()
      expect(body.branchId).toBe(branch.id)
      if (body.name === "Tầng 1") {
        return route.fulfill({ status: 409, headers, json: { message: "Khu vực đã tồn tại" } })
      }
      expect(body.name).toBe("Sân thượng")
      const area = { id: 2, branchId: branch.id, name: body.name, status: "ACTIVE" }
      areas.push(area)
      data = area
    }
    if (path === "/tables" && method === "POST") {
      expect(request.postDataJSON()).toEqual({
        branchId: 10,
        name: "Bàn 02",
        capacity: 4,
        areaId: 2,
      })
      const table = {
        id: 31,
        branchId: 10,
        name: "Bàn 02",
        capacity: 4,
        areaId: 2,
        areaName: "Sân thượng",
        status: "AVAILABLE",
        qrCode: "QR-B10-02",
      }
      tables.push(table)
      data = table
    }
    if (path === "/tables/31/generate-qr") data = tables[1]
    if (path === "/tables/30" && method === "PUT") {
      expect(request.postDataJSON()).toMatchObject({ areaId: 2 })
      tables[0] = { ...tables[0], areaId: 2, areaName: "Sân thượng" }
      data = tables[0]
    }
    if (path === "/tables/30" && method === "DELETE") {
      return route.fulfill({
        status: 409,
        headers,
        json: { message: "Bàn đã có lịch sử. Hãy chọn Ngừng sử dụng để giữ dữ liệu." },
      })
    }
    if (path === "/tables/30/status" && method === "PUT") {
      tables[0] = { ...tables[0], status: new URL(request.url()).searchParams.get("status")! }
    }
    if (path === "/tables/31" && method === "DELETE") tables.splice(1, 1)
    if (path === "/areas/1" && method === "DELETE") areas.splice(0, 1)
    return route.fulfill({ headers, json: { data } })
  })

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/quan-ly-chi-nhanh/chi-nhanh")
  const filter = page.getByRole("combobox", { name: "Lọc theo khu vực" })
  const usage = page.getByRole("combobox", { name: "Lọc theo trạng thái sử dụng" })
  await expect(usage).toHaveText("Đang sử dụng")
  const trigger = page.getByRole("button", { name: "Thêm khu vực" })
  await trigger.click()
  const createArea = page.getByRole("dialog", { name: "Thêm khu vực" })
  const name = createArea.getByRole("textbox", { name: "Tên khu vực" })
  const save = createArea.getByRole("button", { name: "Lưu khu vực" })
  await expect(name).toBeFocused()
  await expect(save).toBeDisabled()
  await name.fill("  Tầng 1  ")
  await save.click()
  await expect(createArea.getByRole("alert")).toHaveText("Khu vực đã tồn tại")
  await expect(name).toHaveValue("  Tầng 1  ")
  await name.fill("  Sân thượng  ")
  await save.click()
  await expect(createArea).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(filter).toHaveText("Sân thượng (0)")

  await page.getByRole("button", { name: "Thêm bàn vào khu vực" }).click()
  const createTable = page.getByRole("dialog", { name: "Thêm bàn mới" })
  await expect(createTable.getByRole("combobox", { name: "Khu vực" })).toHaveValue("2")
  await createTable.getByPlaceholder("VD: Bàn 09 hoặc B09").fill("Bàn 02")
  await createTable.getByRole("button", { name: "Lưu & Tạo mã QR" }).click()
  await expect(createTable).toBeHidden()
  await expect(filter).toHaveText("Sân thượng (1)")
  await expect(page.getByText("Bàn 02", { exact: true })).toBeVisible()
  await expect(page.getByText("Bàn 01", { exact: true })).toHaveCount(0)

  await page.setViewportSize({ width: 1231, height: 905 })
  const printDialog = page.getByRole("dialog", { name: "In QR hàng loạt" })
  const printScope = printDialog.getByRole("combobox", { name: "Phạm vi in QR" })
  await page.getByRole("button", { name: "In QR hàng loạt", exact: true }).click()
  await expect(printScope).toHaveText("Sân thượng")
  await expect(printDialog.getByRole("button", { name: "In 1 mã QR" })).toBeEnabled()
  await expect(printDialog.getByText("Bàn 02", { exact: true })).toBeVisible()
  await expect(printDialog.getByText("Bàn 01", { exact: true })).toHaveCount(0)
  await printScope.click()
  await page.getByRole("option", { name: "Toàn chi nhánh" }).click()
  await expect(printDialog.getByRole("button", { name: "In 2 mã QR" })).toBeEnabled()
  await printScope.click()
  await page.getByRole("option", { name: "Tầng 1", exact: true }).click()
  await expect(printDialog.getByText("Bàn 01", { exact: true })).toBeVisible()
  await expect(printDialog.getByText("Bàn 02", { exact: true })).toHaveCount(0)
  await page.keyboard.press("Escape")

  await filter.click()
  await page.getByRole("option", { name: "Tầng 1 (1)" }).click()
  await page.getByRole("button", { name: "Chỉnh sửa bàn" }).click()
  const editTable = page.getByRole("dialog", { name: "Chỉnh sửa Bàn 01" })
  await editTable.getByRole("combobox", { name: "Khu vực" }).selectOption("2")
  await editTable.getByRole("button", { name: "Lưu thay đổi" }).click()
  await expect(editTable).toBeHidden()
  await expect(filter).toHaveText("Tầng 1 (0)")
  await filter.click()
  await page.getByRole("option", { name: "Sân thượng (2)" }).click()
  await expect(page.getByText("Bàn 01", { exact: true })).toBeVisible()
  await expect(page.getByText("Bàn 02", { exact: true })).toBeVisible()

  await page.getByRole("link", { name: "Sơ đồ bàn", exact: true }).click()
  const areaOnFloorMap = page.getByRole("region", { name: "Sân thượng" })
  await expect(areaOnFloorMap.getByText("Bàn 01", { exact: true })).toBeVisible()
  await expect(areaOnFloorMap.getByText("Bàn 02", { exact: true })).toBeVisible()

  await page.goto("/quan-ly-chi-nhanh/chi-nhanh")
  await filter.click()
  await page.getByRole("option", { name: "Sân thượng (2)" }).click()
  await page.getByRole("button", { name: "Xóa khu vực", exact: true }).click()
  const areaDialog = page.getByRole("alertdialog", { name: "Xóa khu vực · Sân thượng" })
  await expect(areaDialog.getByText(/Khu vực còn bàn/)).toBeVisible()
  await expect(areaDialog.getByRole("button", { name: "Xóa khu vực" })).toHaveCount(0)
  await areaDialog.getByRole("button", { name: "Đóng" }).click()

  await page.getByRole("button", { name: "Chỉnh sửa bàn" }).first().click()
  const removeUsed = page.getByRole("alertdialog", { name: "Xóa bàn · Bàn 01" })
  await editTable.getByRole("button", { name: "Xóa bàn", exact: true }).click()
  await removeUsed.getByRole("button", { name: "Xóa bàn" }).click()
  await expect(removeUsed.getByRole("alert")).toContainText("Bàn đã có lịch sử")
  await removeUsed.getByRole("button", { name: "Hủy" }).click()
  await expect(editTable.getByRole("button", { name: "Xóa bàn", exact: true })).toBeFocused()
  await editTable.getByRole("button", { name: "Ngừng sử dụng", exact: true }).click()
  await page
    .getByRole("alertdialog", { name: "Ngừng sử dụng · Bàn 01" })
    .getByRole("button", { name: "Ngừng sử dụng" })
    .click()
  await expect(editTable).toBeHidden()
  await expect(page.getByText("Bàn 01", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Bàn 02", { exact: true })).toBeVisible()

  await page.setViewportSize({ width: 375, height: 812 })
  await usage.click()
  await page.getByRole("option", { name: "Ngừng sử dụng" }).click()
  await expect(filter).toHaveText("Sân thượng (2)")
  await expect(usage).toHaveText("Ngừng sử dụng")
  await expect(page.getByText("Bàn 01", { exact: true })).toBeVisible()
  await expect(page.getByText("Bàn 02", { exact: true })).toHaveCount(0)

  await page.getByRole("button", { name: "In QR hàng loạt", exact: true }).click()
  await expect(printDialog.getByRole("button", { name: "In 1 mã QR" })).toBeEnabled()
  await expect(printDialog.getByText("Bàn 02", { exact: true })).toBeVisible()
  await expect(printDialog.getByText("Bàn 01", { exact: true })).toHaveCount(0)
  await page.keyboard.press("Escape")

  await usage.click()
  await page.getByRole("option", { name: "Tất cả trạng thái" }).click()
  await expect(page.getByText("Bàn 01", { exact: true })).toBeVisible()
  await expect(page.getByText("Bàn 02", { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 1231, height: 905 })

  await page.getByRole("button", { name: "Chỉnh sửa bàn" }).last().click()
  await page
    .getByRole("dialog", { name: "Chỉnh sửa Bàn 02" })
    .getByRole("button", { name: "Xóa bàn" })
    .click()
  await page
    .getByRole("alertdialog", { name: "Xóa bàn · Bàn 02" })
    .getByRole("button", { name: "Xóa bàn" })
    .click()
  await expect(page.getByText("Bàn 02", { exact: true })).toHaveCount(0)
  await filter.click()
  await page.getByRole("option", { name: "Tầng 1 (0)" }).click()
  await page.getByRole("button", { name: "Xóa khu vực", exact: true }).click()
  await page
    .getByRole("alertdialog", { name: "Xóa khu vực · Tầng 1" })
    .getByRole("button", { name: "Xóa khu vực" })
    .click()
  await expect(filter).toHaveText("Tất cả khu vực (1)")
  await page.getByRole("link", { name: "Sơ đồ bàn", exact: true }).click()
  await expect(page.getByText("Chi nhánh chưa có bàn")).toBeVisible()

  tables.push(
    ...Array.from({ length: 10 }, (_, index) => ({
      id: 40 + index,
      branchId: 10,
      name: `Bàn in ${index + 1}`,
      capacity: 4,
      areaId: 2,
      areaName: "Sân thượng",
      status: "AVAILABLE",
      qrCode: `QR-B10-PRINT-${index + 1}`,
    })),
  )
  tables.push({
    id: 50,
    branchId: 10,
    name: "Bàn thiếu QR",
    capacity: 4,
    areaId: 2,
    areaName: "Sân thượng",
    status: "AVAILABLE",
    qrCode: "",
  })
  await page.goto("/quan-ly-chi-nhanh/chi-nhanh")
  await page.getByRole("button", { name: "In QR hàng loạt", exact: true }).click()
  await expect(printDialog.getByRole("button", { name: "In 10 mã QR" })).toBeEnabled()
  await expect(printDialog.getByText("1 bàn chưa có mã QR")).toBeVisible()
  const printSheet = page.locator("#bulk-table-qr-print")
  await expect(printSheet).toBeHidden()
  await page.emulateMedia({ media: "print" })
  await expect(printSheet).toBeVisible()
  await expect(printDialog).toBeHidden()
  await expect(page.locator("#root")).toBeHidden()
  await expect(printSheet.locator("svg")).toHaveCount(10)
  const pdf = await page.pdf({ preferCSSPageSize: true })
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(2)
  expect(pdf.toString("latin1")).toMatch(/\/MediaBox\s*\[0 0 59[45][\d.]* 84[12][\d.]*\]/)
})
