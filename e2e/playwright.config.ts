import { defineConfig } from '@playwright/test';

// Runs against a stack that is already up (`docker compose up -d`). Override with BASE_URL / API_URL.
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0, // no retries on purpose: a flaky test should be looked at, not re-rolled
  expect: { timeout: 15_000 }, // the first sign-in after a rebuild can be slow (cold JVM, fresh Next.js build)
  workers: 1, // the tests share one database
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3002',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
