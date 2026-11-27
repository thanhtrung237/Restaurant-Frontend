import { expect, test } from "@playwright/test"
import type { BranchStaffMember } from "../../src/api/branch-staff.api"

test("branch manager creates staff and changes their branch roles", async ({ page }) => {
  const branch = { id: 10, restaurantId: 1, name: "Chi nhánh Quận 1", status: "ACTIVE" }
  const manager: BranchStaffMember = {
    id: 1,
    fullName: "Quản lý kiểm thử",
    username: "manager",
    employeeCode: "NV001",
    status: "ACTIVE",
    roles: ["BRANCH_MANAGER"],
    editable: false,
  }
  let staff: BranchStaffMember | undefined
  const writes: { path: string; body: unknown }[] = []
  await page.setViewportSize({ width: 1440, height: 900 })
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
          account: { id: 1, restaurantId: 1, fullName: "Quản lý kiểm thử" },
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
      "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    }
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers })
    let data: unknown = []
    if (path === "/branches/10") data = branch
    if (path === "/assignments/account/1")
      data = [{ id: 7, roleCode: "BRANCH_MANAGER", branchId: 10 }]
    if (path === "/branches/10/staff" && method === "GET")
      data = staff ? [manager, staff] : [manager]
    if (path === "/branches/10/staff" && method === "POST") {
      const { fullName, username, roles, phone, hireDate } = request.postDataJSON()
      writes.push({ path, body: { fullName, username, roles, phone, hireDate } })
      staff = {
        id: 2,
        fullName,
        username,
        roles,
        employeeCode: "NV002",
        status: "ACTIVE",
        editable: true,
      }
      data = staff
    }
    if (path === "/branches/10/staff/2/roles" && method === "PUT" && staff) {
      const body = request.postDataJSON()
      writes.push({ path, body })
      staff = { ...staff, roles: body.roles }
      data = staff
    }
    return route.fulfill({ headers, json: { data } })
  })

  await page.goto("/quan-ly-chi-nhanh/nhan-vien")
  await expect(page.getByRole("link", { name: "Nhân viên", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Nhân viên chi nhánh" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Đổi vai trò cho Quản lý kiểm thử" })).toHaveCount(
    0,
  )
  await page.getByRole("button", { name: "Thêm nhân viên" }).click()
  const create = page.getByRole("dialog", { name: "Thêm nhân viên" })
  await expect(
    create.getByText("Tài khoản mới sẽ được phân công tại Chi nhánh Quận 1."),
  ).toBeVisible()
  await expect(create.getByRole("button", { name: "Tạo tài khoản" })).toBeDisabled()
  await create.getByLabel("Họ và tên").fill("Nhân viên mới")
  await create.getByLabel("Tên đăng nhập").fill("new_staff")
  await expect(create.getByLabel(/email/i)).toHaveCount(0)
  await create.getByLabel("Ngày vào làm").fill("2026-11-25")
  await create.getByLabel("Số điện thoại").fill("0401234567")
  await create.getByLabel("Mật khẩu ban đầu").fill("Start789!")
  await create.getByRole("checkbox", { name: "Phục vụ" }).click()
  await create.getByRole("button", { name: "Tạo tài khoản" }).click()
  await expect(create.getByText(/đầu số di động Việt Nam/)).toBeVisible()
  await create.getByLabel("Số điện thoại").fill("0321234567")
  await create.getByRole("button", { name: "Tạo tài khoản" }).click()
  const change = page.getByRole("button", { name: "Đổi vai trò cho Nhân viên mới" })
  await expect(change).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await change.click()
  const edit = page.getByRole("dialog", { name: "Đổi vai trò" })
  const waiter = edit.getByRole("checkbox", { name: "Phục vụ" })
  await expect(waiter).toBeChecked()
  await waiter.click()
  await expect(edit.getByRole("button", { name: "Lưu vai trò" })).toBeDisabled()
  await edit.getByRole("checkbox", { name: "Thu ngân" }).click()
  await edit.getByRole("button", { name: "Lưu vai trò" }).click()
  await expect(edit).toBeHidden()
  await page.getByRole("textbox", { name: "Tìm nhân viên" }).fill("NV002")
  await expect(
    page.getByRole("region", { name: "Danh sách nhân viên chi nhánh" }).getByText("Thu ngân"),
  ).toBeVisible()
  expect(writes).toEqual([
    {
      path: "/branches/10/staff",
      body: {
        fullName: "Nhân viên mới",
        username: "new_staff",
        roles: ["WAITER"],
        phone: "0321234567",
        hireDate: "2026-11-25",
      },
    },
    { path: "/branches/10/staff/2/roles", body: { expected: ["WAITER"], roles: ["CASHIER"] } },
  ])
})
