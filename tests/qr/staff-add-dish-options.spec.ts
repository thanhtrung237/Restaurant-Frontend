import { expect, test } from "@playwright/test"
import { mockSessionRefresh } from "./staff-session"

test("staff can order separate configurations of a dish and send their option IDs", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
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
  const submitted: unknown[] = []
  await page.route("**/ws/**", (route) => route.abort())
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace("/api/v1", "")
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    }
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers })
    let data: unknown = []
    if (path === "/assignments/account/1")
      data = [{ id: 7, roleCode: "BRANCH_MANAGER", branchId: 10 }]
    if (path === "/table-sessions/12")
      data = { id: 12, tableId: 12, tableName: "Bàn 12", branchId: 10, status: "SERVING" }
    if (path === "/branches/10/menu")
      data = [
        {
          dishId: 5,
          dishName: "Phở bò",
          categoryId: 3,
          categoryName: "Món chính",
          effectivePrice: 45000,
          stockStatus: "AVAILABLE",
        },
        {
          dishId: 6,
          dishName: "Cơm sườn",
          categoryId: 3,
          categoryName: "Món chính",
          effectivePrice: 30000,
          stockStatus: "AVAILABLE",
        },
      ]
    if (path === "/dish-option-groups/dish/5")
      data = [
        {
          id: 1,
          optionGroupId: 20,
          optionGroupName: "Kích cỡ",
          selectionType: "REQUIRED",
          minSelect: 1,
          maxSelect: 1,
        },
        {
          id: 2,
          optionGroupId: 21,
          optionGroupName: "Topping",
          selectionType: "OPTIONAL",
          minSelect: 0,
          maxSelect: 2,
        },
      ]
    if (path === "/option-items/group/20")
      data = [
        { id: 101, name: "Vừa", extraPrice: 0 },
        { id: 102, name: "Lớn", extraPrice: 10000 },
      ]
    if (path === "/option-items/group/21")
      data = [
        { id: 103, name: "Thêm trứng", extraPrice: 5000 },
        { id: 104, name: "Thêm thịt", extraPrice: 10000 },
        { id: 105, name: "Thêm rau", extraPrice: 0 },
      ]
    if (path === "/orders" && request.method() === "POST") submitted.push(request.postDataJSON())
    return route.fulfill({ headers, json: { data } })
  })

  await mockSessionRefresh(page)
  await page.goto("/branch-manager/order/12/add-items")
  const soup = page.getByRole("button", { name: /Phở bò/ })
  const dialog = page.getByRole("dialog", { name: "Phở bò" })
  const add = dialog.getByRole("button", { name: "Thêm vào bàn" })
  await soup.click()
  await expect(add).toBeDisabled()
  await dialog.getByRole("checkbox", { name: /^Lớn/ }).check()
  await dialog.getByRole("checkbox", { name: /^Thêm trứng/ }).check()
  await dialog.getByRole("checkbox", { name: /^Thêm thịt/ }).check()
  await expect(dialog.getByRole("checkbox", { name: "Thêm rau" })).toBeDisabled()
  await dialog.getByRole("checkbox", { name: /^Thêm thịt/ }).uncheck()
  await expect(add).toBeEnabled()
  await add.click()
  await expect(dialog).toBeHidden()
  await expect(soup).toBeFocused()

  await soup.click()
  await dialog.getByRole("checkbox", { name: "Vừa" }).check()
  await add.click()
  const editButtons = page.getByRole("button", { name: "Sửa tùy chọn" })
  await expect(editButtons).toHaveCount(2)
  await editButtons.last().click()
  await expect(dialog.getByRole("checkbox", { name: "Vừa" })).toBeChecked()
  await dialog.getByRole("checkbox", { name: /^Thêm thịt/ }).check()
  await dialog.getByRole("button", { name: "Lưu tùy chọn" }).click()
  await page.getByRole("button", { name: /Cơm sườn/ }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByText("145.000đ", { exact: true }).filter({ visible: true })).toBeVisible()
  const quantity = page.getByRole("textbox", { name: "Số lượng Cơm sườn" })
  const stepper = quantity.locator("..")
  await quantity.fill("100")
  await expect(
    page.getByText("3.115.000đ", { exact: true }).filter({ visible: true }),
  ).toBeVisible()
  await stepper.getByRole("button", { name: "Tăng số lượng" }).click()
  await expect(quantity).toHaveValue("101")
  await stepper.getByRole("button", { name: "Giảm số lượng" }).click()
  await expect(quantity).toHaveValue("100")
  await quantity.fill("")
  await quantity.press("Tab")
  await expect(quantity).toHaveValue("100")
  await page.getByRole("checkbox", { name: "Đóng gói mang về" }).last().check()
  await page.getByRole("button", { name: "Xác nhận thêm món" }).click()
  await expect
    .poll(() => submitted)
    .toEqual([
      {
        tableSessionId: 12,
        orderedById: 1,
        items: [
          { dishId: 5, quantity: 1, optionItemIds: [102, 103] },
          { dishId: 5, quantity: 1, optionItemIds: [101, 104] },
          { dishId: 6, quantity: 100, isTakeAway: true },
        ],
      },
    ])
})
