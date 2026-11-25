import { expect, test } from "@playwright/test"

test("branch manager stays in their branch menu and can add an own dish with a shared topping", async ({
  page,
}) => {
  const branch = { id: 10, restaurantId: 1, name: "Chi nhánh Quận 1", status: "ACTIVE" }
  const category = { id: 5, name: "Khai vị", status: "ACTIVE" }
  const group = { id: 20, name: "Topping", selectionType: "OPTIONAL", minSelect: 0, maxSelect: 3 }
  const optionItems = [
    { id: 1, name: "Thêm trứng", extraPrice: 5000 },
    { id: 2, name: "Không hành", extraPrice: 0 },
    { id: 3, name: "Thêm rau", extraPrice: 0 },
    { id: 4, name: "Thêm đậu", extraPrice: 5000 },
    { id: 5, name: "Thêm nấm", extraPrice: 10000 },
  ]
  const menuRequests: string[] = []
  const creates: unknown[] = []
  const links: unknown[] = []
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
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    }
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers })
    let data: unknown = []
    if (path === "/branches/10") data = branch
    if (path === "/assignments/account/1")
      data = [{ id: 7, roleCode: "BRANCH_MANAGER", branchId: 10 }]
    if (path === "/categories/restaurant/1") data = [category]
    if (path === "/option-groups/restaurant/1") data = [group]
    if (path === "/option-items/group/20") data = optionItems
    if (path === "/branches/10/menu/overview")
      data = [
        { dishId: 6, dishName: "Phở bò", isBranchSpecific: false },
        { dishId: 7, dishName: "Bánh canh", isBranchSpecific: true },
      ].map((dish) => ({
        ...dish,
        categoryId: 5,
        categoryName: category.name,
        basePrice: 45000,
        effectivePrice: 45000,
      }))
    if (path === "/dish-option-groups/dish/6" || path === "/dish-option-groups/dish/7") {
      data = [
        {
          id: 30,
          dishId: Number(path.at(-1)),
          optionGroupId: group.id,
          optionGroupName: group.name,
          selectionType: group.selectionType,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
        },
      ]
    }
    if (path.includes("/menu/overview") || path.includes("/dishes/restaurant/"))
      menuRequests.push(path)
    if (path === "/dishes" && method === "POST") {
      const body = request.postDataJSON()
      creates.push(body)
      data = { ...body, id: 8 }
    }
    if (path === "/dish-option-groups" && method === "POST") {
      links.push(request.postDataJSON())
      data = { id: 30, dishId: 8, optionGroupId: 20 }
    }
    return route.fulfill({ headers, json: { data } })
  })

  await page.goto("/quan-ly-chi-nhanh/thuc-don?tab=options")
  await expect(page.getByRole("heading", { name: "Tùy chọn món", exact: true })).toBeVisible()
  await expect(page.getByText("Thêm nấm", { exact: false })).toBeVisible()
  await expect(
    page.getByRole("button", {
      name: /Thêm nhóm tùy chọn|Chỉnh sửa nhóm tùy chọn|Xóa nhóm tùy chọn/,
    }),
  ).toHaveCount(0)
  await page.getByRole("button", { name: "Về thực đơn chi nhánh" }).click()
  await expect(page.getByRole("heading", { name: "Thực đơn chi nhánh", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Thực đơn chung", exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Tùy chọn món", exact: true })).toBeVisible()
  await expect(page.getByRole("combobox", { name: "Chọn chi nhánh" })).toHaveCount(0)
  const sharedOptions = page.getByRole("button", { name: "Xem tùy chọn của Phở bò" })
  await sharedOptions.click()
  const sharedDialog = page.getByRole("dialog", { name: "Tùy chọn món · Phở bò" })
  await expect(sharedDialog.getByText("Món dùng chung của nhà hàng")).toBeVisible()
  await expect(sharedDialog.getByText("Thêm trứng", { exact: true })).toBeVisible()
  await expect(sharedDialog.getByText(/\+5\.000/).first()).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(sharedOptions).toBeFocused()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole("button", { name: "Xem tùy chọn của Bánh canh" }).click()
  const branchDialog = page.getByRole("dialog", { name: "Tùy chọn món · Bánh canh" })
  await expect(branchDialog.getByText("Món riêng của chi nhánh")).toBeVisible()
  await expect(branchDialog.getByText("Thêm nấm", { exact: true })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(branchDialog).toBeHidden()

  await page.setViewportSize({ width: 1280, height: 850 })
  await page.getByRole("button", { name: "Thêm món riêng", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Thêm món riêng" })
  await expect(dialog.getByText("Phạm vi áp dụng · Chi nhánh Quận 1")).toBeVisible()
  await dialog.locator("#dish-name").fill("Món riêng chi nhánh")
  await dialog.locator("#dish-category").click()
  await page.getByRole("option", { name: "Khai vị", exact: true }).click()
  await dialog.locator("#dish-station").click()
  await page.getByRole("option", { name: "Bếp", exact: true }).click()
  await dialog.locator("#dish-base-price").fill("15000")
  await dialog.getByRole("checkbox", { name: "Topping", exact: true }).click()
  await dialog.getByRole("button", { name: "Thêm món riêng", exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(creates).toEqual([expect.objectContaining({ restaurantId: 1, branchId: 10 })])
  expect(links).toEqual([{ dishId: 8, optionGroupId: 20 }])
  expect([...new Set(menuRequests)]).toEqual(["/branches/10/menu/overview"])
})
