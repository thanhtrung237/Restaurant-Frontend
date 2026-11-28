import type { Page } from "@playwright/test"

export async function mockSessionRefresh(page: Page, accessToken = "test-token") {
  await page.route("**/api/v1/auth/refresh-token", (route) =>
    route.fulfill({ json: { data: { accountId: 1, accessToken } } }),
  )
}
