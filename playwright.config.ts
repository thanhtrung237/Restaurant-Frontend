import { defineConfig } from "@playwright/test"
export default defineConfig({
  testDir: "./tests/qr",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:5179", browserName: "chromium", channel: process.env.PW_CHANNEL ?? "msedge", headless: true },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: { command: "npm run dev -- --host 127.0.0.1 --port 5179 --strictPort", url: "http://127.0.0.1:5179", reuseExistingServer: false },
})
