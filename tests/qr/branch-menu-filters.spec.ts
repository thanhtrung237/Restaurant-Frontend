import { expect, test } from "@playwright/test"
import { mockSessionRefresh } from "./staff-session"

test("combines branch menu filters and updates them after visibility, price and stock changes", async ({
  page,
}) => {
  test.setTimeout(60000)
  const branch = { id: 10, restaurantId: 1, name: "Chi nhánh Quận 1", status: "ACTIVE" }
  const categories = [
    { id: 1, name: "Món chính" },
    { id: 2, name: "Khai vị" },
  ]
  const dishes = [
    {
      dishId: 1,
      dishName: "Phở bò",
      categoryId: 1,
      hidden: true,
      branchSpecific: false,
      hasOverride: true,
      overridePrice: 50000,
      stockStatus: "AVAILABLE",
    },
    {
      dishId: 2,
      dishName: "Đậu hũ",
      categoryId: 2,
      hidden: true,
      branchSpecific: false,
      hasOverride: false,
      stockStatus: "AVAILABLE",
    },
    {
      dishId: 3,
      dishName: "Bún bò riêng",
      categoryId: 1,
      hidden: false,
      branchSpecific: true,
      hasOverride: false,
      stockStatus: "OUT_OF_STOCK",
    },
    {
      dishId: 4,
      dishName: "Gỏi riêng",
      categoryId: 2,
      isHidden: true,
      isBranchSpecific: true,
      hasOverride: false,
      stockStatus: "AVAILABLE",
    },
    {
      dishId: 5,
      dishName: "Cơm gà",
      categoryId: 1,
      isHidden: false,
      isBranchSpecific: false,
      hasOverride: false,
      stockStatus: "AVAILABLE",
    },
  ]
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
    const url = new URL(request.url())
    const path = url.pathname.replace("/api/v1", "")
    const method = request.method()
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    }
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers })
    let data: unknown = []
    if (path === "/branches/10") data = branch
    if (path === "/assignments/account/1")
      data = [{ id: 7, roleCode: "BRANCH_MANAGER", branchId: 10 }]
    if (path === "/categories/restaurant/1") data = categories
    if (path === "/branches/10/menu/overview")
      data = dishes.map((dish) => ({
        ...dish,
        categoryName: categories.find((category) => category.id === dish.categoryId)?.name,
        basePrice: 45000,
        effectivePrice: dish.overridePrice ?? 45000,
        priceDifference: dish.hasOverride ? 5000 : 0,
      }))
    if (path === "/dish-overrides/branch/10")
      data = [
        { id: 21, dishId: 1 },
        { id: 22, dishId: 2 },
      ]
    if (path === "/dish-overrides/21" && method === "PUT") {
      expect(request.postDataJSON()).toEqual({ isHidden: true, clearOverridePrice: true })
      dishes[0].hasOverride = false
      dishes[0].overridePrice = undefined
    }
    if (path === "/dish-overrides/22" && method === "PUT") {
      expect(request.postDataJSON()).toEqual({ isHidden: false })
      dishes[1].hidden = false
    }
    if (path === "/branch-dish-stocks/branch/10/dish/3/toggle") dishes[2].stockStatus = "AVAILABLE"
    if (path === "/dishes/3")
      data = {
        id: 3,
        name: dishes[2].dishName,
        branchId: 10,
        categoryId: 1,
        basePrice: 45000,
        kitchenStationType: "KITCHEN",
        status: dishes[2].hidden ? "INACTIVE" : "ACTIVE",
      }
    if (path === "/dishes/3/status" && method === "PUT")
      dishes[2].hidden = url.searchParams.get("status") === "INACTIVE"
    return route.fulfill({ headers, json: { data } })
  })

  await page.setViewportSize({ width: 1280, height: 850 })
  await mockSessionRefresh(page)
  await page.goto("/branch-manager/menu")
  const status = page.getByRole("combobox", { name: "Trạng thái món tại chi nhánh" })
  const category = page.getByRole("combobox", { name: "Danh mục tại chi nhánh" })
  const selectStatus = async (label: string) => {
    await status.click()
    await page.getByRole("option", { name: label, exact: true }).click()
  }
  const dish = (name: string) => page.getByText(name, { exact: true }).filter({ visible: true })
  const table = page.getByRole("table")
  await expect(table.getByRole("row")).toHaveCount(6)
  await selectStatus("Có giá riêng")
  await expect(table.getByRole("row")).toHaveCount(2)
  await expect(dish("Phở bò")).toBeVisible()
  const priceButton = page.getByRole("button", { name: "Chỉnh giá và hiển thị: Phở bò" })
  await priceButton.click()
  const priceModal = page.getByRole("dialog", { name: "Giá và hiển thị · Phở bò" })
  await priceModal.getByRole("spinbutton", { name: "Giá ghi đè" }).fill("")
  await priceModal.getByRole("button", { name: "Cập nhật" }).click()
  await expect(
    page.getByText("Không tìm thấy món phù hợp.").filter({ visible: true }),
  ).toBeVisible()

  await selectStatus("Tạm ẩn")
  await expect(table.getByRole("row")).toHaveCount(4)
  await expect(dish("Đậu hũ")).toBeVisible()
  await page.getByRole("button", { name: "Chỉnh giá và hiển thị: Đậu hũ" }).click()
  const hideModal = page.getByRole("dialog", { name: "Giá và hiển thị · Đậu hũ" })
  const hiddenSwitch = hideModal.getByRole("switch", { name: "Ẩn tại chi nhánh" })
  await expect(hiddenSwitch).toBeChecked()
  await hiddenSwitch.click()
  await hideModal.getByRole("button", { name: "Cập nhật" }).click()
  await expect(dish("Đậu hũ")).toHaveCount(0)

  await selectStatus("Món riêng")
  await expect(dish("Bún bò riêng")).toBeVisible()
  await expect(dish("Gỏi riêng")).toBeVisible()
  await category.click()
  await page.getByRole("option", { name: "Khai vị", exact: true }).click()
  await expect(dish("Bún bò riêng")).toHaveCount(0)
  await expect(dish("Gỏi riêng")).toBeVisible()
  const search = page.getByRole("textbox", { name: "Tìm món tại chi nhánh" })
  await search.fill("Phở")
  await expect(
    page.getByText("Không tìm thấy món phù hợp.").filter({ visible: true }),
  ).toBeVisible()
  await search.clear()
  await category.click()
  await page.getByRole("option", { name: "Tất cả danh mục" }).click()

  await selectStatus("Tạm hết")
  await expect(dish("Bún bò riêng")).toBeVisible()
  await page.getByRole("switch", { name: "Còn món: Bún bò riêng" }).click()
  await expect(dish("Bún bò riêng")).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await selectStatus("Món riêng")
  await page.getByRole("button", { name: "Chỉnh sửa Bún bò riêng", exact: true }).click()
  const dishModal = page.getByRole("dialog", { name: "Sửa món" })
  await dishModal.getByRole("button", { name: "Ngừng bán món" }).click()
  const confirm = page.getByRole("dialog", { name: "Ngừng bán món" })
  await expect(confirm.getByText("chi nhánh này", { exact: true })).toBeVisible()
  await confirm.getByRole("button", { name: "Ngừng bán", exact: true }).click()
  await expect(dishModal.getByRole("button", { name: "Bán lại món" })).toBeVisible()
  await dishModal.getByRole("button", { name: "Huỷ", exact: true }).click()
  await selectStatus("Tạm ẩn")
  await expect(dish("Bún bò riêng")).toBeVisible()
  await page.getByRole("button", { name: "Chỉnh sửa Bún bò riêng", exact: true }).click()
  await dishModal.getByRole("button", { name: "Bán lại món" }).click()
  await expect(dishModal.getByRole("button", { name: "Ngừng bán món" })).toBeVisible()
  await dishModal.getByRole("button", { name: "Huỷ", exact: true }).click()
  await expect(dish("Bún bò riêng")).toHaveCount(0)
  await selectStatus("Mọi trạng thái")
  await expect(dish("Bún bò riêng")).toBeVisible()
  await expect(dish("Đậu hũ")).toBeVisible()
})
