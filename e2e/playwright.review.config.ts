import { defineConfig } from '@playwright/test';

// Takes screenshots of every screen (light/dark x desktop/phone) from a running stack (`npm run review`) so the
// design can be reviewed. Not part of the test suite; the pictures go to e2e/review-shots/ (git-ignored).
export default defineConfig({
  testDir: './tools',
  testMatch: 'review.spec.ts',
  timeout: 240_000,
  workers: 1,
  reporter: [['list']],
  expect: { timeout: 15_000 },
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3002' },
});
