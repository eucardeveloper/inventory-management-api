import { test as base, expect, Browser, BrowserContext, Page } from '@playwright/test';

const API = process.env.API_URL ?? 'http://localhost:8083';
const ADMIN = { user: process.env.E2E_ADMIN_USER ?? 'admin', pass: process.env.E2E_ADMIN_PASS ?? 'admin123' };
const STAFF = { user: process.env.E2E_STAFF_USER ?? 'staff', pass: process.env.E2E_STAFF_PASS ?? 'staff123' };

// The backend allows 10 sign-in requests per minute per client address, so the suite signs in as little as
// possible: the admin signs in once through the real login form and every admin test runs in that one session.
// (A refresh token is single-use by design: copying it into a second browser context would be treated as theft
// and end the session, so the admin tests share one context instead of cloning its cookies.)
let adminCtx: BrowserContext;
let adminPage: Page;

async function newContext(browser: Browser) {
  const ctx = await browser.newContext();
  // Fix the UI language so the labels below are stable whatever the browser's locale is.
  await ctx.addInitScript(() => {
    try { localStorage.setItem('inventory_lang', 'en'); } catch { /* ignore */ }
  });
  return ctx;
}

async function signIn(page: Page, user: string, pass: string) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(user);
  await page.locator('input[autocomplete="current-password"]').fill(pass);
  await page.getByRole('button', { name: /login/i }).click();
}

async function waitForApp(page: Page) {
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });
  await expect(page.locator('main')).toBeVisible();
}

const test = base;
test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  adminCtx = await newContext(browser);
  adminPage = await adminCtx.newPage();
  await signIn(adminPage, ADMIN.user, ADMIN.pass);
  await waitForApp(adminPage);
});

test.afterAll(async () => {
  await adminCtx?.close();
});

test('anonymous visitors are sent to the login page', async ({ browser }) => {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  await page.goto('/products');
  await expect(page).toHaveURL(/\/login/);
  await ctx.close();
});

test('a wrong password keeps the visitor out and sets no session cookie', async ({ browser }) => {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  await signIn(page, ADMIN.user, 'definitely-wrong');
  await expect(page).toHaveURL(/\/login/);
  const cookies = await ctx.cookies();
  expect(cookies.find((c) => c.name === 'access_token')).toBeUndefined();
  await ctx.close();
});

test('the session cookie is HttpOnly and SameSite=Strict', async () => {
  const access = (await adminCtx.cookies()).find((c) => c.name === 'access_token');
  expect(access, 'access_token cookie').toBeDefined();
  expect(access!.httpOnly).toBe(true);
  expect(access!.sameSite).toBe('Strict');
});

test('admin can open every main screen without console errors', async () => {
  const page = adminPage;
  const problems: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${page.url()} ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${page.url()} ${String(e)}`));

  for (const route of ['/dashboard', '/products', '/suppliers', '/movements', '/reports', '/audit', '/users']) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  }
  expect(problems).toEqual([]);
});

test('stock in through the UI raises the stock and its reversal restores it', async () => {
  const page = adminPage;
  type Product = { id: number; name: string; articleNumber: string; stock: number; active: boolean };
  const products = async (): Promise<Product[]> => {
    const res = await page.request.get(`${API}/api/products`);
    expect(res.ok()).toBe(true);
    return res.json();
  };
  // Works on any demo data set: take the first active product, whatever it is called.
  const target = (await products()).find((p) => p.active);
  expect(target, 'an active product').toBeDefined();
  const PRODUCT = `${target!.name} (${target!.articleNumber})`;
  const stockOf = async () => (await products()).find((p) => p.id === target!.id)!.stock;
  const before = await stockOf();

  await page.goto('/movements');
  await page.getByRole('button', { name: 'Record movement' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Product' }).click();
  await page.getByRole('option', { name: PRODUCT, exact: true }).click();
  await dialog.getByLabel('Quantity').fill('7');
  await dialog.getByLabel(/Unit cost/).fill('12.5');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();

  await expect.poll(() => stockOf()).toBe(before + 7);

  // The newest ledger row is the one just booked: reverse it.
  await page.goto('/movements');
  await page.getByRole('button', { name: 'Reverse movement' }).first().click();
  const reverse = page.getByRole('dialog');
  await reverse.getByLabel('Reason code').fill('E2E-CLEANUP');
  await reverse.getByRole('button', { name: 'Confirm' }).click();
  await expect(reverse).toBeHidden();

  await expect.poll(() => stockOf()).toBe(before);
});

test('STAFF never receives cost figures; ADMIN does', async ({ browser }) => {
  const adminRes = await adminPage.request.get(`${API}/api/stock/movements?size=50`);
  expect(adminRes.ok()).toBe(true);
  expect(await adminRes.text()).toMatch(/"totalCost":[0-9]/);

  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  await signIn(page, STAFF.user, STAFF.pass);
  await waitForApp(page);
  const staffRes = await page.request.get(`${API}/api/stock/movements?size=50`);
  expect(staffRes.ok()).toBe(true);
  expect(await staffRes.text()).not.toMatch(/"totalCost":[0-9]/);
  await ctx.close();
});
