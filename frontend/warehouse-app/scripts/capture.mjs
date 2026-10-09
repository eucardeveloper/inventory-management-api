// Screenshots of the 8 screens at 3 viewports, plus a console check, against a RUNNING Inventory app.
// Not part of the build and not a dependency: install Playwright on demand, nothing is saved to package.json.
//
//   npm install --no-save playwright
//   npx playwright install chromium
//   $env:INV_URL = "http://localhost:3004"; $env:INV_USER = "admin"; $env:INV_PASS = "<password>"; node scripts/capture.mjs
//
// The password comes from the environment only. Output: ../../docs/screenshots/v5/ and a summary on stdout.

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { chromium } = await import('playwright');

const base = process.env.INV_URL ?? 'http://localhost:3004';
const user = process.env.INV_USER;
const pass = process.env.INV_PASS;
if (!user || !pass) {
  console.error('Set INV_USER and INV_PASS (and INV_URL if the app is not on http://localhost:3004).');
  process.exit(1);
}

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/screenshots/v5');
mkdirSync(out, { recursive: true });

const PAGES = [
  ['dashboard', '/dashboard'], ['products', '/products'], ['suppliers', '/suppliers'], ['movements', '/movements'],
  ['stock-report', '/reports'], ['audit-log', '/audit'], ['users', '/users'], ['settings', '/settings'],
];
const VIEWPORTS = [[1600, 817], [1024, 768], [390, 844]];
const SETTINGS_TABS = ['Workspace', 'Notifications', 'Currency', 'Appearance', 'Permissions'];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 817 } });
await context.addInitScript(() => { try { localStorage.setItem('wms_lang', 'en'); localStorage.removeItem('wms_theme'); } catch { /* ignore */ } });
const page = await context.newPage();

const problems = [];
page.on('console', (m) => {
  const text = m.text();
  if (m.type() === 'error' || m.type() === 'warning' || /hydrat/i.test(text)) problems.push(`[console.${m.type()}] ${page.url()} ${text.slice(0, 300)}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${page.url()} ${String(e).slice(0, 300)}`));

const authLog = [];
const short = (u) => { try { const x = new URL(u); return `${x.host}${x.pathname}`; } catch { return u; } };
page.on('response', (r) => {
  const isAuth = r.url().includes('/api/auth/');
  if (!isAuth && r.status() < 400) return;
  // Log first, read the body afterwards: bodies of successful auth calls carry tokens and are never printed.
  const entry = `${r.request().method()} ${short(r.url())} -> ${r.status()}`;
  authLog.push(entry);
  if (r.status() >= 400) {
    r.text().then((t) => { const i = authLog.indexOf(entry); if (i >= 0) authLog[i] = `${entry} ${t.slice(0, 200)}`; }).catch(() => {});
  }
});
page.on('requestfailed', (r) => authLog.push(`FAILED ${r.method()} ${short(r.url())} ${r.failure()?.errorText ?? ''}`));

await page.goto(`${base}/login`);
await page.getByLabel('Username').fill(user);
await page.getByLabel('Password').fill(pass);
await page.getByRole('button', { name: /login/i }).click();
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 });
await page.waitForTimeout(3000); // let the app finish its first requests before the next full page load

console.log('cookies after login:', (await context.cookies()).map((c) => `${c.name}(${c.domain}${c.path}, httpOnly=${c.httpOnly}, secure=${c.secure}, sameSite=${c.sameSite})`).join(' | '));
const written = [];
for (const [w, h] of VIEWPORTS) {
  await page.setViewportSize({ width: w, height: h });
  for (const [name, route] of PAGES) {
    await page.goto(`${base}${route}`, { waitUntil: 'load' });
    try {
      await page.waitForSelector('main', { timeout: 15000 });
    } catch (e) {
      const dbg = path.join(out, `DEBUG-${name}-${w}.png`);
      await page.screenshot({ path: dbg });
      const text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400);
      console.error('auth calls:\n' + authLog.join('\n'));
      console.error(JSON.stringify({ failedAt: route, url: page.url(), title: await page.title(), bodyText: text, screenshot: dbg, problems: problems.slice(-5) }, null, 2));
      await browser.close();
      process.exit(3);
    }
    await page.waitForTimeout(1500);
    const file = path.join(out, `inventory-${name}-${w}.png`);
    await page.screenshot({ path: file, fullPage: false });
    written.push(file);
  }
}

// Every Settings tab at desktop width.
await page.setViewportSize({ width: 1600, height: 817 });
await page.goto(`${base}/settings`, { waitUntil: 'load' });
for (const tab of SETTINGS_TABS) {
  await page.getByRole('tab', { name: tab }).click();
  await page.waitForTimeout(250);
  const file = path.join(out, `inventory-settings-${tab.toLowerCase()}-1600.png`);
  await page.screenshot({ path: file });
  written.push(file);
}

await browser.close();
console.log(JSON.stringify({ screenshots: written.length, folder: out, consoleOrPageProblems: problems.length }, null, 2));
if (problems.length) { console.log(problems.join('\n')); process.exitCode = 2; }
