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
    // A retry is answered with the original movement, flagged as a replay, and books nothing.
    expect(second.status()).toBe(200);
    expect(second.headers()['idempotent-replayed']).toBe('true');
    expect((await second.json()).id).toBe((await first.json()).id);
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

test('admin adds a user, changes the role and the password, and deletes the user through the dialogs', async () => {
  test.setTimeout(90_000);
  const page = adminPage;
  const name = `e2e-${Date.now()}`;
  const secret = `${crypto.randomUUID()}Aa1`; // throwaway account, never reused
  const listUsers = async () => (await (await page.request.get(`${API}/api/users`)).json()) as { id: number; username: string; role: string }[];
  const dialog = page.getByRole('dialog');
  const passwordInputs = dialog.locator('input[type="password"]'); // password + confirmation, in that order
  const rowActions = () => page.getByRole('button', { name: `Actions: ${name}` });
  const step = { timeout: 10_000 }; // a stuck step fails here, named, instead of at the 90 s test timeout

  try {
    await page.goto('/users');
    await expect(page.getByRole('button', { name: 'Add user' })).toBeVisible(step);

    // add
    await page.getByRole('button', { name: 'Add user' }).click();
    await dialog.getByLabel('Username').fill(name);
    await passwordInputs.nth(0).fill(secret);
    await passwordInputs.nth(1).fill(secret);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('User created')).toBeVisible(step);
    await expect(rowActions()).toBeVisible(step);
    expect((await listUsers()).find((u) => u.username === name)?.role).toBe('STAFF');

    // change role
    await rowActions().click();
    await page.getByRole('menuitem', { name: 'Change role' }).click();
    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Inventory manager' }).click();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Role changed')).toBeVisible(step);
    expect((await listUsers()).find((u) => u.username === name)?.role).toBe('INVENTORY_MANAGER');

    // reset the password (the admin does not need the current one)
    await rowActions().click();
    await page.getByRole('menuitem', { name: 'Change password' }).click();
    await passwordInputs.nth(0).fill(secret);
    await passwordInputs.nth(1).fill(secret);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Password changed')).toBeVisible(step);

    // delete
    await rowActions().click();
    await page.getByRole('menuitem', { name: 'Delete user' }).click();
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('User deleted')).toBeVisible(step);
    await expect(rowActions()).toHaveCount(0, step);
    expect((await listUsers()).some((u) => u.username === name)).toBe(false);
  } finally {
    // leave no test account behind, whatever failed above (best effort: the page may already be closed)
    try {
      const left = (await listUsers()).find((u) => u.username === name);
      if (left) await page.request.delete(`${API}/api/users/${left.id}`);
    } catch { /* ignore */ }
  }
});

test('admin creates, edits and deactivates a product and creates, edits and deletes a supplier through the dialogs', async () => {
  test.setTimeout(120_000);
  const page = adminPage;
  const uid = `${Date.now()}`;
  const company = `E2E Dialog Supplier ${uid}`;
  const productName = `E2E Dialog Product ${uid}`;
  const renamed = `${productName} renamed`;
  const code = `E2E-D-${uid}`;
  const dialog = page.getByRole('dialog');
  const step = { timeout: 10_000 }; // a stuck step fails here, named, instead of at the test timeout
  const rowOf = (text: string) => page.getByRole('row').filter({ hasText: text });
  const apiGet = async <T,>(path: string) => (await (await page.request.get(`${API}${path}`)).json()) as T;

  try {
    // ── supplier: create, edit, delete ──
    await page.goto('/suppliers');
    await page.getByRole('button', { name: 'Add supplier' }).first().click();
    await dialog.getByLabel('Company name').fill(company);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Supplier saved')).toBeVisible(step);
    await expect(rowOf(company)).toBeVisible(step);

    await rowOf(company).getByRole('button', { name: 'Edit' }).click();
    await dialog.getByLabel('Phone').fill('+49 30 1234567');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden(step);
    const saved = (await apiGet<{ companyName: string; phone?: string }[]>('/api/suppliers')).find((s) => s.companyName === company);
    expect(saved?.phone).toBe('+49 30 1234567');

    // ── product: create, edit, deactivate ──
    await page.goto('/products');
    await page.getByRole('button', { name: 'Add product' }).first().click();
    await dialog.getByLabel('Name', { exact: false }).first().fill(productName);
    await dialog.getByLabel('Product code').fill(code);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Product saved')).toBeVisible(step);
    await expect(rowOf(productName)).toBeVisible(step);

    await rowOf(productName).getByRole('button', { name: 'Edit' }).click();
    await dialog.getByLabel('Name', { exact: false }).first().fill(renamed);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(rowOf(renamed)).toBeVisible(step);
    const product = (await apiGet<{ id: number; name: string; active: boolean }[]>('/api/products')).find((p) => p.name === renamed);
    expect(product?.active).toBe(true);

    await rowOf(renamed).getByRole('button', { name: 'Deactivate' }).click();
    await dialog.getByRole('button', { name: 'Deactivate' }).click();
    await expect(page.getByText('Product deactivated')).toBeVisible(step);
    const after = (await apiGet<{ name: string; active: boolean }[]>('/api/products')).find((p) => p.name === renamed);
    expect(after?.active).toBe(false);

    // ── supplier delete (nothing references it) ──
    await page.goto('/suppliers');
    await rowOf(company).getByRole('button', { name: 'Delete' }).click();
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Supplier deleted')).toBeVisible(step);
    expect((await apiGet<{ companyName: string }[]>('/api/suppliers')).some((s) => s.companyName === company)).toBe(false);
  } finally {
    // best effort: remove what is left if a step failed (a product can only be deactivated, never deleted)
    try {
      const sup = (await apiGet<{ id: number; companyName: string }[]>('/api/suppliers')).find((s) => s.companyName === company);
      if (sup) await page.request.delete(`${API}/api/suppliers/${sup.id}`);
      const prod = (await apiGet<{ id: number; name: string; active: boolean }[]>('/api/products')).find((p) => (p.name === productName || p.name === renamed) && p.active);
      if (prod) await page.request.delete(`${API}/api/products/${prod.id}`);
    } catch { /* ignore */ }
  }
});
