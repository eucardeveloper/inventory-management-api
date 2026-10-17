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

// ---------------------------------------------------------------------------------------------
// Rule checks at the API level. They use a throw-away product and supplier created by the test
// itself, so the demo data is never touched, and they clean up after themselves.
// ---------------------------------------------------------------------------------------------
const uid = () => Math.random().toString(36).slice(2, 8);

test.describe('stock rules', () => {
  let productId: number;
  let supplierId: number;

  test.beforeAll(async () => {
    const s = await adminPage.request.post(`${API}/api/suppliers`, {
      data: { companyName: `E2E Supplier ${uid()}`, email: `e2e-${uid()}@example.test` },
    });
    expect(s.status()).toBe(200);
    supplierId = (await s.json()).id;
    const p = await adminPage.request.post(`${API}/api/products`, {
      data: { name: `E2E Product ${uid()}`, articleNumber: `E2E-${uid()}`, unitPrice: 20, reorderLevel: 1, active: true, supplier: { id: supplierId } },
    });
    expect(p.status()).toBe(200);
    productId = (await p.json()).id;
  });

  test.afterAll(async () => {
    await adminPage.request.delete(`${API}/api/products/${productId}`);
    await adminPage.request.delete(`${API}/api/suppliers/${supplierId}`);
  });

  const book = (data: object) => adminPage.request.post(`${API}/api/stock/movements`, { data });
  const stock = async () => (await (await adminPage.request.get(`${API}/api/products/${productId}`)).json()).stock as number;

  test('a receipt without a unit cost is refused', async () => {
    const res = await book({ productId, quantity: 5, movementType: 'IN' });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
    expect(await stock()).toBe(0);
  });

  test('a quantity below 1 is refused', async () => {
    expect((await book({ productId, quantity: 0, movementType: 'IN', unitCost: 1 })).status()).toBe(400);
  });

  test('an issue larger than the stock is refused with 409 and changes nothing', async () => {
    expect((await book({ productId, quantity: 3, movementType: 'IN', unitCost: 10 })).status()).toBe(201);
    const res = await book({ productId, quantity: 4, movementType: 'OUT' });
    expect(res.status()).toBe(409);
    expect(await stock()).toBe(3);
  });

  test('an issue consumes the oldest lot first and a reversal restores the exact lots', async () => {
    expect((await book({ productId, quantity: 2, movementType: 'IN', unitCost: 30 })).status()).toBe(201); // stock 5: 3@10, 2@30
    const out = await book({ productId, quantity: 4, movementType: 'OUT' });
    expect(out.status()).toBe(201);
    const body = await out.json();
    expect(body.totalCost).toBe(3 * 10 + 1 * 30);
    expect(body.lotConsumptions.map((l: { quantityTaken: number }) => l.quantityTaken)).toEqual([3, 1]);
    expect(await stock()).toBe(1);

    const noReason = await adminPage.request.post(`${API}/api/stock/movements/${body.id}/reverse`, { data: {} });
    expect(noReason.status()).toBe(400);

    const rev = await adminPage.request.post(`${API}/api/stock/movements/${body.id}/reverse`, { data: { reasonCode: 'E2E-RULES' } });
    expect(rev.status()).toBe(201);
    expect(await stock()).toBe(5);
    const again = await adminPage.request.post(`${API}/api/stock/movements/${body.id}/reverse`, { data: { reasonCode: 'E2E-RULES' } });
    expect(again.status()).toBe(409);
  });

  test('the same idempotency key books one movement, not two', async () => {
    const key = `e2e-${uid()}-${uid()}`;
    const before = await stock();
    const first = await book({ productId, quantity: 1, movementType: 'IN', unitCost: 5, idempotencyKey: key });
    expect(first.status()).toBe(201);
    const second = await book({ productId, quantity: 1, movementType: 'IN', unitCost: 5, idempotencyKey: key });
    expect([200, 201, 409]).toContain(second.status());
    expect(await stock()).toBe(before + 1);
  });

  test('STAFF may book but not reverse, and cannot delete suppliers or manage users', async ({ browser }) => {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, STAFF.user, STAFF.pass);
    await waitForApp(page);
    const mv = await page.request.post(`${API}/api/stock/movements`, { data: { productId, quantity: 1, movementType: 'IN', unitCost: 1 } });
    expect(mv.status()).toBe(201);
    const id = (await mv.json()).id;
    expect((await page.request.post(`${API}/api/stock/movements/${id}/reverse`, { data: { reasonCode: 'x' } })).status()).toBe(403);
    expect((await page.request.delete(`${API}/api/suppliers/${supplierId}`)).status()).toBe(403);
    expect((await page.request.get(`${API}/api/users`)).status()).toBe(403);
    await ctx.close();
    await adminPage.request.post(`${API}/api/stock/movements/${id}/reverse`, { data: { reasonCode: 'E2E-CLEANUP' } });
  });
});

test('the last administrator cannot be demoted or deleted', async () => {
  const users = (await (await adminPage.request.get(`${API}/api/users`)).json()) as { id: number; role: string }[];
  const admins = users.filter((u) => u.role === 'ADMIN');
  test.skip(admins.length !== 1, 'only meaningful while exactly one administrator exists');
  const only = admins[0];
  expect((await adminPage.request.patch(`${API}/api/users/${only.id}/role`, { data: { role: 'STAFF' } })).status()).toBe(409);
  expect([400, 409]).toContain((await adminPage.request.delete(`${API}/api/users/${only.id}`)).status()); // self-delete is refused as 400
});
