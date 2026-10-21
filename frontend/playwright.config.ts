import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:8088",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command:
      "java -jar ../backend/target/crease-1.0.0.jar --server.port=8088 --spring.datasource.url=jdbc:h2:mem:crease-e2e --crease.simulation.enabled=false",
    url: "http://127.0.0.1:8088",
    reuseExistingServer: false,
    timeout: 120000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
