# Inventory: manual acceptance (UAT) guide

Who runs it: the person giving the final acceptance. Every step is done by eye in the browser; mark each row PASS or FAIL.
Nothing in this file is marked as run. The result columns are empty on purpose; fill them in during your run and note the date.

Environment: `docker compose up -d --build`, then `http://localhost:3002` (the compose default for the web app). Demo accounts: `admin / admin123`, `manager / manager123`, `staff / staff123`.
Rule: if an expected result does not happen, write FAIL, add a screenshot with time and user, and stop that section.

## Preparation data (used by all sections)

Supplier: Nord Components GmbH. Product: Bearing 6204, article number BRG-6204, reorder level 20. Stock-in 1: 10 units at cost 10.00. Stock-in 2: 10 units at cost 30.00.

## 1) ADMIN (`admin`)

| # | Action | Expected | P/F |
|---|---|---|---|
| 1.1 | Sign in | Dashboard opens; menu has Dashboard, Products, Suppliers, Movements, Stock report, Audit log, Users, Settings | |
| 1.2 | Suppliers, add the preparation supplier | Row appears; validation error for an empty name | |
| 1.3 | Products, add the preparation product (supplier chosen) | Row appears with stock 0 and status "Out of stock" | |
| 1.4 | Movements, record stock-in 10 at cost 10.00, then 10 at cost 30.00 | Both rows appear; stock 20; product no longer "Out of stock" | |
| 1.5 | Record a stock-in without cost | Error shown, no row, stock unchanged | |
| 1.6 | Record a stock-out of 0 | Error, no row | |
| 1.7 | Record a stock-out of 999 | Error (not enough stock), stock unchanged | |
| 1.8 | Record a stock-out of 12 | Row appears; cost equals 10 x 10.00 + 2 x 30.00 = 160.00 (oldest lot first); stock 8 | |
| 1.9 | Dashboard | Low-stock list contains Bearing 6204 (8 < 20); KPI cards show the movement counts; the page needs no horizontal scrolling at 1440 px width | |
| 1.10 | Reverse the stock-out of 12 without a reason | Refused with a message | |
| 1.11 | Reverse it with a reason | New reversal row; original row struck through; stock back to 20; reversing it a second time is not offered ("-") | |
| 1.12 | Stock report | FIFO value matches the remaining lots (10 x 10.00 + 10 x 30.00 = 400.00); export menu offers CSV, Excel, PDF | |
| 1.13 | Audit log | Entries for the product, the supplier and the movements with your user name; filters narrow the list | |
| 1.14 | Users, open the row menu (...) of `staff` | Change role, change password, delete are listed | |
| 1.15 | Users, your own row and the only admin | Delete is disabled and the reason is shown | |
| 1.16 | Change `staff` to `INVENTORY_MANAGER` and back | Role changes; note whether a signed-in `staff` session in another browser keeps working (write the observation here) | |
| 1.17 | Delete a supplier that has products | Refused with a clear message (or allowed if no products): note the result | |

## 2) INVENTORY_MANAGER (`manager`)

| # | Action | Expected | P/F |
|---|---|---|---|
| 2.1 | Sign in | Menu has no Audit log and no Users | |
| 2.2 | Open `/audit` and `/users` by typing the address | Redirected to the dashboard | |
| 2.3 | Products | Create, edit and deactivate work; cost and list price visible | |
| 2.4 | Suppliers | Create and edit work; no delete button | |
| 2.5 | Reverse a movement with a reason | Works | |
| 2.6 | Settings | Opens; workspace section is read-only or hidden | |

## 3) STAFF (`staff`)

| # | Action | Expected | P/F |
|---|---|---|---|
| 3.1 | Sign in | Menu has no Audit log and no Users | |
| 3.2 | Products, Movements, Stock report, Dashboard | No cost, price or value figures anywhere (cards, tables, product drawer, exports) | |
| 3.3 | Products | No add, edit or deactivate buttons | |
| 3.4 | Suppliers | No add, edit or delete buttons | |
| 3.5 | Movements | Can record stock-in and stock-out; no reverse button (a "-" is shown instead) | |
| 3.6 | Dashboard | Only the stock-out and stock-in actions appear; no financial KPI cards | |

## 4) Session and sign-out (any account)

| # | Action | Expected | P/F |
|---|---|---|---|
| 4.1 | Sign in, close the browser completely, reopen the address | The login screen appears (session cookies are not persistent) | |
| 4.2 | Sign in, use the app for a while, wait for the access token to expire (15 minutes) and click a page | You stay signed in (silent renewal); no error flash | |
| 4.3 | Leave the app idle longer than 8 hours (or run on another day) | The login screen appears with a clear message | |
| 4.4 | Sign out, press the browser Back button | Login screen, no data visible | |
| 4.5 | Change your own password with a wrong current password | Refused | |
| 4.6 | Change it correctly, sign in again | New password works, old one does not | |

## 5) Screen quality (any account)

| # | Action | Expected | P/F |
|---|---|---|---|
| 5.1 | Open every page | Every column is centred (header and cells); only the actions column is right-aligned | |
| 5.2 | Click between pages quickly | No white flash, no full reload | |
| 5.3 | Switch language to Turkish and German | All labels translated; no cut-off text in buttons | |
| 5.4 | Switch to dark mode | Text readable on every page | |
| 5.5 | Narrow the window to phone width | Menu becomes a drawer; tables stay inside their card | |
| 5.6 | Open an empty list (e.g. filter that matches nothing) | Icon with a short message, not a blank area | |

## Evidence

For every FAIL: screenshot, time, user. Keep the filled-in copy of this file with the date; it is the acceptance record.
