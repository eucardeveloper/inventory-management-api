import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(__dirname, '../review-shots');
const ADMIN = { user: process.env.E2E_ADMIN_USER ?? 'admin', pass: process.env.E2E_ADMIN_PASS ?? 'admin123' };
const SCREENS = ['dashboard', 'products', 'movements', 'suppliers', 'reports', 'audit', 'users', 'settings'];
const SIZES = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };

test('review screenshots of every screen', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  const problems: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${String(e)}`));
  await page.addInitScript(() => { try { localStorage.setItem('inventory_lang', 'en'); } catch { /* ignore */ } });

  // One sign-in only: the backend rate-limits sign-ins, and a refresh token is single-use.
  await page.goto('/login');
  await page.getByLabel('Username').fill(ADMIN.user);
  await page.locator('input[autocomplete="current-password"]').fill(ADMIN.pass);
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await expect(page.locator('main')).toBeVisible();

  for (const theme of ['light', 'dark']) {
    for (const [size, vp] of Object.entries(SIZES)) {
      await page.setViewportSize(vp);
      await page.evaluate((t) => localStorage.setItem('inventory_theme', t), theme);
      for (const screen of SCREENS) {
        await page.goto(`/${screen}`);
        await expect(page.locator('main')).toBeVisible();
        await page.waitForTimeout(1800);
        await page.screenshot({ path: path.join(OUT, `inventory-${size}-${theme}-${screen}.png`) });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 1) problems.push(`${size}/${theme}/${screen}: page scrolls sideways by ${overflow}px`);
      }
    }
  }
  console.log(problems.length ? `Problems:\n${problems.join('\n')}` : 'No console errors, no sideways overflow.');
});
