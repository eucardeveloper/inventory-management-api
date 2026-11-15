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
| 1.5 | Record a stock-in without cost, then with cost 0 | Error shown each time, no row, stock unchanged (a cost greater than zero is required) | |
| 1.6 | Record a stock-out of 0 | Error, no row | |
| 1.7 | Record a stock-out of 999 | Error (not enough stock), stock unchanged | |
| 1.8 | Record a stock-out of 12 | Row appears; cost equals 10 x 10.00 + 2 x 30.00 = 160.00 (oldest lot first); stock 8 | |
| 1.9 | Dashboard | Low-stock list contains Bearing 6204 (8 < 20); KPI cards show the movement counts; the page needs no horizontal scrolling at 1440 px width | |
| 1.10 | Reverse the stock-out of 12 without a reason | Refused with a message | |
| 1.11 | Reverse it with a reason | New reversal row; original row struck through; stock back to 20; reversing it a second time is not offered ("-") | |
| 1.12 | Stock report | FIFO value matches the remaining lots (10 x 10.00 + 10 x 30.00 = 400.00); export menu offers CSV, Excel, PDF; "total in" and "total out" do not count a reversed movement and the reversal that undid it (after 1.11 they are the same as before 1.8) | |
| 1.13 | Audit log | Entries for the product, the supplier and the movements with your user name; filters narrow the list | |
| 1.14 | Users, open the row menu (...) of `staff` | Change role, change password, delete are listed | |
| 1.15 | Users, your own row and the only admin | Delete is disabled and the reason is shown | |
| 1.16 | Change `staff` to `INVENTORY_MANAGER` and back | Role changes; note whether a signed-in `staff` session in another browser keeps working (write the observation here) | |
| 1.17 | Delete a supplier that has products | Refused with a clear message (or allowed if no products): note the result | |
| 1.18 | Products, edit Bearing 6204, choose the empty supplier option ("—"), save | The supplier column (switch it on in the column menu if it is hidden; it needs a wide window) shows "—"; reopening the product shows the empty option. Saving again without touching the supplier field keeps it empty | |
| 1.19 | Stock report, integrity card, press "Run check" | The card says all products are consistent and how many were checked, with the time of the check. No table appears while everything is consistent (only products with a problem are listed). No cost or value figure is shown on the card | |
| 1.20 | Movements, filter by type (Stock in / Stock out) and by a From/To day | The list and the counter narrow to the matching rows; a From after the To shows a range error; "Clear filters" resets all of them | |
| 1.21 | Movements, filter by type and a day range, then Export > CSV | A file movements-<date>.csv downloads with every matching movement (not only the visible 50), signed quantities, ISO dates and a cost column; as `staff` the cost column is missing | |
| 1.22 | Products, Supplier filter: pick a supplier, then "No supplier", then All | The list and the counter ("x of y products") narrow to that supplier's products, then to products without one, then back; "Clear filters" in the empty state resets it too | |
| 1.23 | Products, open the preparation product's detail drawer | "Last movements" lists this product's own latest 5 movements (also when they are older than the dashboard's latest 200); "FIFO layers" lists each lot as remaining / received, unit cost and date, oldest first, used-up lots greyed with "Used up" | |
| 1.24 | Products, Filter "Low stock" and pick a supplier, then Export > CSV | products-<date>.csv holds every product matching both filters (not only the visible page) with the supplier's e-mail and "Missing to threshold"; as `staff` the price column is missing | |
| 1.25 | Suppliers, click the product count of a supplier | The Products list opens filtered to that supplier's active products, the count matches the number clicked, and the Supplier filter shows the name | |
| 1.26 | Phone width (375 px, browser device mode): Dashboard, Movements, Stock report | The Dashboard attention list shows the whole status label; Movements shows each quantity under the type badge (not hidden behind the actions column); the integrity card's "Run check" button wraps below the status instead of being cut off | |
| 1.27 | Phone width (375 px): Suppliers | The table fits the card without sideways scrolling; a long company name wraps to two lines and ends in an ellipsis; the product count stays visible next to the actions | |
| 1.28 | Phone width (375 px), Turkish: Dashboard attention list, Suppliers | The Dashboard stock column header is the short "Stok" and all columns fit the card; Suppliers company names are centred like the other columns (no ragged edge) | |

## 2) INVENTORY_MANAGER (`manager`)

| # | Action | Expected | P/F |
|---|---|---|---|
| 2.1 | Sign in | Menu has no Audit log and no Users | |
| 2.2 | Open `/audit` and `/users` by typing the address | Redirected to the dashboard | |
| 2.3 | Products | Create, edit and deactivate work; cost and list price visible | |
| 2.4 | Suppliers | Create and edit work; no delete button | |
| 2.5 | Reverse a movement with a reason | Works | |
| 2.6 | Settings | Opens; workspace section is read-only or hidden | |
| 2.7 | Open the same product in two browser windows, save a change in the first, then save a different change in the second | The second save is refused with a "changed by someone else" message, the product list reloads and the first change is still there. Booking stock on the product between opening and saving has the same effect | |
| 2.8 | Stock report, integrity card, press "Run check" | Same as 1.19: all products consistent, number checked, time shown, no cost figures | |

## 3) STAFF (`staff`)

| # | Action | Expected | P/F |
|---|---|---|---|
| 3.1 | Sign in | Menu has no Audit log and no Users | |
| 3.2 | Products, Movements, Stock report, Dashboard | No cost, price or value figures anywhere in the web app (cards, tables, product drawer, exports); the API masks costs only | |
| 3.3 | Products | No add, edit or deactivate buttons | |
| 3.4 | Suppliers | No add, edit or delete buttons | |
| 3.5 | Movements | Can record stock-in and stock-out; no reverse button (a "-" is shown instead) | |
| 3.6 | Dashboard | Only the stock-out and stock-in actions appear; no financial KPI cards | |
| 3.7 | Stock report | No integrity card is shown (it is for `ADMIN` and `INVENTORY_MANAGER`) | |
| 3.8 | API check: sign in as `staff` with `POST http://localhost:8083/api/auth/login` (body `{"username":"staff","password":"staff123"}`), then call `GET http://localhost:8083/api/stock/integrity` with the returned token as `Authorization: Bearer <token>` | `403`, no data | |
| 3.9 | Products, open a product's detail drawer as `staff` | No "FIFO layers" section and no cost figures (the lots API is 403 for staff) | |

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
| 5.1 | Open every page | Every column (header and cells, Actions included) is centred with thin vertical grid lines; columns have equal widths, with a wider Name/Product/Description column | |
| 5.2 | Click between pages quickly | No white flash, no full reload | |
| 5.3 | Switch language to Turkish and German | All labels translated; no cut-off text in buttons | |
| 5.4 | Switch to dark mode | Text readable on every page | |
| 5.5 | Narrow the window to phone width | Menu becomes a drawer; tables stay inside their card | |
| 5.6 | Open an empty list (e.g. filter that matches nothing) | Icon with a short message, not a blank area | |

## Evidence

For every FAIL: screenshot, time, user. Keep the filled-in copy of this file with the date; it is the acceptance record.
