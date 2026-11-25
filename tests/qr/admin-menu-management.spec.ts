import { expect, test } from "@playwright/test"

test("restaurant menu keeps global changes and branch stock in their own scopes", async ({
  page,
}) => {
  const branches = [
    { id: 10, restaurantId: 1, name: "Chi nhánh Quận 1", status: "ACTIVE" },
    { id: 20, restaurantId: 1, name: "Chi nhánh Quận 7", status: "ACTIVE" },
  ]
  const category = { id: 5, name: "Món chính", status: "ACTIVE", restaurantId: 1 }
  const imageUrl = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
  const dish = {
    id: 8,
    restaurantId: 1,
    name: "Phở bò",
    categoryId: category.id,
    categoryName: category.name,
    basePrice: 45000,
    status: "ACTIVE",
    imageUrl,
  }
  let stock = "IN_STOCK"
  let overridePrice: number | null = 49000
  const menuRequests: string[] = []
  const updates: string[] = []
  let releaseBranchMenu!: () => void
  const branchMenuReady = new Promise<void>((resolve) => {
    releaseBranchMenu = resolve
  })

  await page.addInitScript(() => {
    localStorage.setItem("pho-viet-auth-tokens", JSON.stringify({ accessToken: "test-token" }))
    localStorage.setItem(
      "pho-viet-auth",
      JSON.stringify({
        version: 0,
        state: {
          role: "RESTAURANT_ADMIN",
          branchId: null,
          assignmentId: 7,
          accessToken: "test-token",
          isAuthenticated: true,
          account: { id: 1, restaurantId: 1, fullName: "Quản trị test" },
        },
      }),
    )
  })
  await page.route("**/ws/**", (route) => route.abort())
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace("/api/v1", "")
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
    }
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers })
      return
    }
    let data: unknown = []
    if (path === "/assignments/account/1") data = [{ id: 7, roleCode: "MANAGER", branchId: null }]
    if (path === "/restaurants/1") data = { id: 1, name: "Nhà hàng test" }
    if (path === "/branches/restaurant/1") data = branches
    if (path === "/categories/restaurant/1") data = [category]
    if (path === "/dishes/restaurant/1") data = { content: [dish], totalElements: 1 }
    if (path === "/dishes/8/affected-branches") data = 2
    if (path === "/dish-overrides/branch/20" && overridePrice != null) {
      data = [{ id: 45, branchId: 20, dishId: 8, overridePrice, isHidden: false }]
    }
    if (path === "/dish-overrides/45" && request.method() === "DELETE") overridePrice = null
    if (path === "/dish-overrides" && request.method() === "POST") {
      expect(overridePrice).toBeNull()
      expect(request.postDataJSON()).toEqual({
        branchId: 20,
        dishId: 8,
        overridePrice: 200000,
        isHidden: false,
      })
      overridePrice = 200000
      data = { id: 45, branchId: 20, dishId: 8, overridePrice, isHidden: false }
    }
    if (path === "/dishes/8/status" && request.method() === "PUT") {
      dish.status = url.searchParams.get("status") ?? "ACTIVE"
      updates.push(path + "?" + url.searchParams)
      data = dish
    }
    if (path === "/branch-dish-stocks/branch/20/dish/8/toggle" && request.method() === "PUT") {
      stock = "OUT_OF_STOCK"
      updates.push(path)
      data = { stockStatus: stock }
    }
    for (const branch of branches) {
      if (path === "/branches/" + branch.id) data = branch
      if (path === "/branches/" + branch.id + "/menu/overview") {
        menuRequests.push(path)
        if (branch.id === 20) await branchMenuReady
        const branchPrice = branch.id === 20 ? overridePrice : null
        data = [
          {
            dishId: dish.id,
            dishName: dish.name,
            categoryId: category.id,
            categoryName: category.name,
            imageUrl: branch.id === 20 ? "data:image/gif;base64,AA==" : imageUrl,
            basePrice: dish.basePrice,
            effectivePrice: branchPrice ?? dish.basePrice,
            overridePrice: branchPrice,
            hasOverride: branchPrice != null,
            isHidden: false,
            stockStatus: branch.id === 20 ? stock : "IN_STOCK",
            isBranchSpecific: false,
          },
        ]
      }
    }
    await route.fulfill({ headers, json: { data } })
  })

  const menuUrl = "/quan-tri-nha-hang/thuc-don"
  await page.setViewportSize({ width: 1231, height: 905 })
  await page.goto(menuUrl)
  await expect(
    page.getByRole("navigation", { name: "Phạm vi thực đơn" }).getByRole("button"),
  ).toHaveCount(2)
  await expect(
    page.getByText("Toàn nhà hàng · 1 món · 1 đang bán").filter({ visible: true }),
  ).toBeVisible()
  const commonSearch = page.getByRole("textbox", { name: "Tìm món", exact: true })
  const branchSearch = page.getByRole("textbox", { name: "Tìm món tại chi nhánh" })
  const branchTab = page.getByRole("button", { name: "Theo chi nhánh", exact: true })
  const commonSearchY = (await commonSearch.boundingBox())!.y
  const commonTabY = (await branchTab.boundingBox())!.y
  const commonTableY = (await page.getByRole("table").boundingBox())!.y
  const thumbnail = page.locator(`img[src="${imageUrl}"]`).filter({ visible: true })
  await expect
    .poll(() => thumbnail.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0)
  await expect(page.getByRole("switch")).toHaveCount(0)
  await page.getByRole("textbox", { name: "Tìm món", exact: true }).fill("bún")
  await expect(page.getByText("Không tìm thấy món phù hợp.")).toBeVisible()
  await page.getByRole("button", { name: "Xóa nội dung tìm kiếm" }).click()
  await page.getByRole("combobox", { name: "Danh mục món" }).click()
  await page.getByRole("option", { name: "Món chính" }).click()
  await page.getByRole("button", { name: "Chỉnh sửa món: Phở bò" }).click()
  const editDialog = page.getByRole("dialog", { name: "Sửa món" })
  await editDialog.getByRole("button", { name: "Ngừng bán món" }).click()
  const confirmDialog = page.getByRole("dialog", { name: "Ngừng bán món" })
  await expect(confirmDialog).toBeVisible()
  expect(updates).toEqual([])
  await confirmDialog.getByRole("button", { name: "Ngừng bán", exact: true }).click()
  await expect(editDialog.getByRole("button", { name: "Bán lại món" })).toBeVisible()
  await editDialog.getByRole("button", { name: "Bán lại món" }).click()
  await expect(editDialog.getByRole("button", { name: "Ngừng bán món" })).toBeVisible()
  await editDialog.getByRole("button", { name: "Huỷ", exact: true }).click()
  await expect(editDialog).toBeHidden()

  await page.getByRole("button", { name: "Danh mục", exact: true }).click()
  await expect(page).toHaveURL(menuUrl + "?tab=danh-muc")
  await page.goBack()
  await page.getByRole("button", { name: "Tùy chọn món", exact: true }).click()
  await expect(page.getByRole("textbox", { name: "Tìm nhóm tùy chọn" })).toBeVisible()

  await page.getByRole("button", { name: "Theo chi nhánh", exact: true }).click()
  await expect(page.getByText("Chọn chi nhánh để xem giá và trạng thái còn món.")).toBeVisible()
  expect(menuRequests).toEqual([])
  await page.getByRole("combobox", { name: "Chọn chi nhánh" }).click()
  await page.getByRole("option", { name: "Chi nhánh Quận 7" }).click()
  try {
    await expect(
      page.getByText("Đang tải thực đơn chi nhánh…").filter({ visible: true }),
    ).toBeVisible()
    expect((await branchSearch.boundingBox())!.y).toBeCloseTo(commonSearchY, 0)
    expect((await branchTab.boundingBox())!.y).toBeCloseTo(commonTabY, 0)
    expect((await page.getByRole("table").boundingBox())!.y).toBeCloseTo(commonTableY, 0)
  } finally {
    releaseBranchMenu()
  }
  await expect(page.getByText("49.000đ", { exact: true }).filter({ visible: true })).toBeVisible()
  expect((await branchSearch.boundingBox())!.y).toBeCloseTo(commonSearchY, 0)
  const branchDishCell = page
    .getByRole("row")
    .filter({ hasText: "Phở bò" })
    .getByRole("cell")
    .first()
  await expect(branchDishCell.locator("svg[aria-hidden='true']")).toBeVisible()
  await page.getByRole("button", { name: "Chỉnh giá và hiển thị: Phở bò" }).click()
  const priceDialog = page.getByRole("dialog", { name: "Giá và hiển thị · Phở bò" })
  await expect(priceDialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(priceDialog).toBeHidden()
  await page.getByRole("button", { name: "Khôi phục mặc định: Phở bò" }).click()
  const deleteOverride = page.getByRole("alertdialog", { name: "Xóa ghi đè" })
  const remove = deleteOverride.getByRole("button", { name: "Xóa ghi đè" })
  await expect(remove).toHaveCSS("color", "rgb(255, 255, 255)")
  await expect(deleteOverride.locator("p div")).toHaveCount(0)
  await remove.click()
  await expect(deleteOverride).toBeHidden()
  await expect(
    page.getByText("Theo giá gốc", { exact: true }).filter({ visible: true }),
  ).toBeVisible()

  await page.getByRole("button", { name: "Chỉnh giá và hiển thị: Phở bò" }).click()
  await priceDialog.getByRole("spinbutton", { name: "Giá ghi đè" }).fill("200000")
  await priceDialog.getByRole("button", { name: "Tạo ghi đè" }).click()
  await expect(priceDialog).toBeHidden()
  await expect(page.getByText("200.000đ", { exact: true }).filter({ visible: true })).toBeVisible()
  await page.getByRole("switch", { name: "Còn món: Phở bò" }).click()
  await expect(page.getByRole("switch", { name: "Còn món: Phở bò" })).not.toBeChecked()
  expect(updates).toEqual([
    "/dishes/8/status?status=INACTIVE",
    "/dishes/8/status?status=ACTIVE",
    "/branch-dish-stocks/branch/20/dish/8/toggle",
  ])

  await page.getByRole("button", { name: /^Chi nhánh hiện tại: Tất cả chi nhánh/ }).click()
  await page
    .getByRole("dialog", { name: "Chuyển chi nhánh" })
    .getByRole("button", { name: /Chi nhánh Quận 1/ })
    .click()
  await expect(
    page.getByText("Chi nhánh · Chi nhánh Quận 1", { exact: true }).filter({ visible: true }),
  ).toBeVisible()
  await expect(page.getByRole("switch", { name: "Còn món: Phở bò" })).toBeChecked()
  await expect(page.getByRole("combobox", { name: "Chọn chi nhánh" })).toHaveCount(0)

  await page.setViewportSize({ width: 375, height: 812 })
  await expect
    .poll(() => thumbnail.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0)
  await expect(page.getByRole("switch", { name: "Còn món: Phở bò" })).toBeVisible()
  await page.getByRole("button", { name: "Thêm món riêng", exact: true }).click()
  const branchDialog = page.getByRole("dialog", { name: "Thêm món riêng" })
  await expect(branchDialog.getByText("Phạm vi áp dụng · Chi nhánh Quận 1")).toBeVisible()
  await page.keyboard.press("Escape")
  const mobileBranchSearchY = (await branchSearch.boundingBox())!.y
  await page.getByRole("button", { name: "Thực đơn chung", exact: true }).click()
  await expect(commonSearch).toBeVisible()
  expect((await commonSearch.boundingBox())!.y).toBeCloseTo(mobileBranchSearchY, 0)
  await page.getByRole("button", { name: "Thêm món", exact: true }).click()
  await expect(
    page.getByRole("dialog", { name: "Thêm món" }).getByText("Phạm vi áp dụng · Toàn nhà hàng"),
  ).toBeVisible()
})
