import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // serial — these tests share DB state
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3040",
    headless: true,
    trace: "off",
    screenshot: "only-on-failure",
  },
});
