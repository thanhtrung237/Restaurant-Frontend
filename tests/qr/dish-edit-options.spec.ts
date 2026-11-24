import { expect, test } from "@playwright/test"

test("editing a dish loads saved options and can add, remove and relink groups", async ({
  page,
}) => {
  const category = { id: 5, name: "Khai vị", status: "ACTIVE" }
  const dish = {
    id: 8,
    restaurantId: 1,
    categoryId: 5,
    categoryName: category.name,
    name: "Tàu hủ",
    basePrice: 15000,
    kitchenStationType: "KITCHEN",
    status: "ACTIVE",
    soldByWeight: false,
  }
  const groups = [
    { id: 20, name: "Topping", selectionType: "OPTIONAL", minSelect: 0, maxSelect: 3 },
    { id: 21, name: "Topping nước", selectionType: "OPTIONAL", minSelect: 0, maxSelect: 1 },
  ]
  const links = new Map([[20, 30]])
  const mutations: string[] = []
  let allowInitialRead!: () => void
  const initialRead = new Promise<void>((resolve) => {
    allowInitialRead = resolve
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
    const path = new URL(request.url()).pathname.replace("/api/v1", "")
    const method = request.method()
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
    }
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers })
    let data: unknown = []
    if (path === "/dishes/restaurant/1") data = { content: [dish], totalElements: 1 }
    if (path === "/dishes/8" && method === "PUT") data = dish
    if (path === "/categories/restaurant/1") data = [category]
    if (path === "/option-groups/restaurant/1") data = groups
    if (path === "/dish-option-groups/dish/8") {
      await initialRead
      data = Array.from(links, ([optionGroupId, id]) => ({ id, dishId: 8, optionGroupId }))
    }
    if (path === "/dish-option-groups" && method === "POST") {
      const { dishId, optionGroupId } = request.postDataJSON()
      expect(dishId).toBe(8)
      expect(links.has(optionGroupId)).toBe(false)
      const id = optionGroupId + 10
      links.set(optionGroupId, id)
      mutations.push(`link:${optionGroupId}`)
      data = { id, dishId, optionGroupId }
    }
    if (path === "/dish-option-groups/30" && method === "DELETE") {
      links.delete(20)
      mutations.push("unlink:20")
    }
    return route.fulfill({ headers, json: { data } })
  })

  await page.goto("/quan-tri-nha-hang/thuc-don")
  const edit = page.getByRole("button", { name: "Chỉnh sửa món: Tàu hủ" })
  const dialog = page.getByRole("dialog", { name: "Sửa món" })
  const save = dialog.getByRole("button", { name: "Lưu thay đổi" })
  const topping = dialog.getByRole("checkbox", { name: "Topping", exact: true })
  const drinkTopping = dialog.getByRole("checkbox", { name: "Topping nước", exact: true })

  await edit.click()
  try {
    await expect(dialog.getByText("Đang tải nhóm tùy chọn…")).toBeVisible()
    await expect(save).toBeDisabled()
  } finally {
    allowInitialRead()
  }
  await expect(topping).toBeChecked()
  await drinkTopping.click()
  await save.click()
  await expect(dialog).toBeHidden()

  await edit.click()
  await expect(drinkTopping).toBeChecked()
  await topping.click()
  await save.click()
  await expect(dialog).toBeHidden()

  await edit.click()
  await expect(topping).not.toBeChecked()
  await topping.click()
  await save.click()
  await expect(dialog).toBeHidden()
  await edit.click()
  await expect(topping).toBeChecked()
  await expect(drinkTopping).toBeChecked()
  expect(mutations).toEqual(["link:21", "unlink:20", "link:20"])
})
