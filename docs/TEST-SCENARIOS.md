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
