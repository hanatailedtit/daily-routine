import { defineConfig } from "@playwright/test"
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5174",
    channel: "chrome",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node tests/mock-supabase.cjs",
      url: "http://127.0.0.1:54321/health",
      reuseExistingServer: false,
    },
    {
      command: "yarn dev --host 127.0.0.1 --port 5174 --strictPort",
      url: "http://127.0.0.1:5174",
      env: {
        VITE_SUPABASE_URL: "http://127.0.0.1:54321",
        VITE_SUPABASE_ANON_KEY: "local-public-test-key",
        VITE_SUPABASE_PUBLISHABLE_KEY: "local-public-test-key",
        VITE_SUPABASE_REDIRECT_URL: "http://127.0.0.1:5174",
      },
      reuseExistingServer: false,
    },
  ],
})
