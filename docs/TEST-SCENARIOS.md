# Test scenarios

Two clearly separated lists. Nothing in the second list has been run.

## Run (automated, `frontend/warehouse-app`, `npm test`)

| Area | What is checked |
|------|-----------------|
| Permissions | role normalisation; per-role capability table matches the API rules; page access; privileges never increase downwards |
| Dictionary | en, tr, de have identical keys, no empty strings, identical `{placeholders}`; every audit action and entity has a label in all three languages; movement-type words are translated |
| Formats | integers, EUR and signed quantities in en / de / tr; missing values print an em dash; labelled counts |
| Dates | API timestamps without offset are UTC; calendar-day bucketing |
| Product list | search (case-insensitive, AND of words, name / code / supplier), filters, natural sort, missing values last, no input mutation, pagination clamping |
| Valuation | "no cost record" is not EUR 0; empty shelf is a legitimate zero; FIFO total excludes products without cost and counts them |
| HTML escaping | user input is escaped in generated HTML |
| Settings | defaults, tolerant loading of broken storage, save errors when storage is blocked, validation (name, emails, digest email), dirty detection, trimming |
| Static checks | `tsc --noEmit`, `eslint src` (0 errors) |

Backend tests (unit and Testcontainers integration tests) are described in the README and run in CI.

## Recommended, not run (end-to-end / manual)

Search and lookup
1. Type part of a product code (`lpt-0`) and a supplier name; the list narrows; the header shows "n of m products".
2. Search with no match shows "no results" with a clear-filters button; clearing restores the list.
3. Sort by stock descending, then by code; page 2 resets to page 1 when the filter changes.

Goods receipt (stock in)
4. Book a goods receipt without a unit cost: the form refuses with a clear message.
5. Book a receipt with a cost: stock rises by the quantity; the movement appears at the top of the movements page; the FIFO value of the product rises by quantity x cost; the audit log shows "Goods received".
6. Repeat the same request (double click): only one movement exists (idempotency key).

Goods issue (stock out)
7. Try to issue more than available: the form blocks it and shows the insufficient-stock message; forcing the request through the API returns an error that is shown inline.
8. Issue exactly the available stock: stock becomes 0, the product shows "Out of stock" and appears in the dashboard attention list.
9. Issue across two lots: the oldest lot is consumed first (FIFO) and the FIFO value drops accordingly.

Reversal and risky actions
10. Reverse a movement without a reason: refused. With a reason: a compensating movement appears, the original shows "Reversed", stock is restored, the audit log records it.
11. A STAFF user sees no reverse button; calling the endpoint directly returns 403.
12. Deactivate a product: confirmation names the product; afterwards it is hidden from the default filter, not selectable in the movement form, still visible under "inactive", and reactivation restores it.
13. Delete a supplier as ADMIN (confirmation shown); as WAREHOUSE_MANAGER the button is absent and the API returns 403.
14. Demote or delete the last ADMIN: refused with the last-administrator message.

Roles and sessions
15. Sign in as each demo role; compare visible navigation and actions with the roles table.
16. STAFF: no prices, no costs, no FIFO value anywhere (dashboard, products, drawer, report, movements).
17. Let the session expire: the next request returns to the login screen with the session-expired notice.
18. Change own password with a wrong current password: refused; with the right one: sign in with the new password works.

Display
19. Switch en / de / tr: no leftover English labels in tables, chips, dialogs or the audit log; numbers, EUR and dates change format; product codes and names stay unchanged.
20. Light theme on first visit; switching to dark persists after reload.
21. Widths 360, 768, 1280 and 1920 px: no horizontal page scroll, the actions column stays visible, metric values never wrap, no wide empty column between status and actions.
22. Keyboard only: tab through the sidebar, filters, table sort headings, row actions, dialogs (focus trapped, escape closes) with a visible focus ring.
23. Screen reader pass over the products table (sort state, icon-button names) and the confirmation dialogs.
24. Automated accessibility scan (for example axe) on every page, followed by a manual review; contrast check of chips in both themes.

Data
25. Seed data with stock but without a cost lot shows "No cost record" instead of EUR 0.00, and the dashboard says how many products are excluded from the FIFO total.
26. More than 200 movements: the dashboard states that figures use the latest 200.

## Round 3 manual scenarios (to run in a browser)

1. At 1680-1900px width: tables show column and row lines, sticky header while scrolling, actions column stays visible.
2. Dashboard: six cards same height at xl, no wrapped labels; chart and attention list same height; chart with a single large spike still shows a readable y-axis.
3. Audit: type 31.12.2025 / 2025-12-31 / 31/12/2025 in the date fields; an invalid date shows the format hint; a reversed range is flagged; descriptions are in the selected language.
4. Movements: product filter has a visible label; a stock-in without cost record shows an em dash with tooltip.
5. Sidebar: visible by default on desktop; collapse persists after reload.

## Round 5 manual scenarios (Settings, to run in a browser, not run yet)

1. Open Settings as each role: ADMIN can edit Workspace; WAREHOUSE_MANAGER and STAFF see the fields disabled and the notice.
2. Clear the workspace name and save: the field shows the error and nothing is stored.
3. Enable the email digest without an address: the Notifications tab opens with the error; with a valid address it saves.
4. Edit a field, then click another sidebar item: the discard dialog appears; "Keep editing" stays, "Discard" leaves. Reload with unsaved edits: the browser asks.
5. Save while browser storage is blocked: an error message appears and the form stays dirty.
6. Switch theme and language in Appearance, save: both apply at once and persist after reload.
7. Turn off the low-stock notice, sign out and in: no notice appears; turn it on again: it appears once per session.
8. Products: hide columns from the column menu; reload keeps the choice; a STAFF user has no price column in the menu.
9. Currency tab: the preview shows 1,234.50 (en) and 1.234,50 (de, tr) with the euro sign.
10. Permissions tab matches the roles table in the README for all three roles.
11. Widths 1600, 1024 and 390: no horizontal page scroll; the tab strip scrolls. Run `scripts/capture.mjs` and read the screenshots; it also reports console errors and hydration warnings.
