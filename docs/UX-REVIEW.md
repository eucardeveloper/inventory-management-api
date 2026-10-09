# UI guidelines, behaviour rules and verification status

This describes how the web app (`frontend/warehouse-app`) is built today. It replaces earlier reviews that
no longer matched the code. Nothing here is a claim of accessibility conformance (see "Verification status").

## Users and flows

| User | Main flows |
|------|-----------|
| Warehouse worker (STAFF) | find a product, check available stock, book goods receipt / goods issue |
| Warehouse manager | watch low stock, book and reverse movements, maintain products and suppliers, read stock value |
| System administrator | everything above plus users, roles and the audit log |

## Design system (one set of rules, in code)

Tokens live in `src/features/wms/theme.ts`; shared building blocks in `src/features/wms/components/Primitives.tsx`.

| Topic | Rule |
|-------|------|
| Theme | Light is the default for everyone. Dark is selectable and remembered in the browser; it is not derived from the OS setting. |
| Colour roles | Primary blue `#2563eb` (hover `#1d4ed8`) for actions and selection; navy `#0b1f3a` sidebar; slate neutrals; green / amber / red only for meaning (in stock, low, out; success, warning, error). |
| Status | Never colour alone: stock status and movement type are chips with an icon and a word. |
| Type scale | Body 14px, table text 14px, captions 12px, page title 22px, section title 17px, metric 26px. |
| Spacing | MUI 8px grid; 24px between page sections, 16px inside cards and between cards. |
| Content width | Fluid, capped at 1440px (`LAYOUT.contentMax`). |
| Tables | Row height about 44px, header 12px caps in muted slate; numbers right-aligned; text left-aligned; product codes in monospace and never wrapped; actions in the last, fixed-width, sticky column. |
| Interaction | 2px focus ring on every focusable element; every icon-only control has an `aria-label` and a tooltip; row actions show a text label on wide screens and an icon on narrow ones; a disabled action explains why in its tooltip. |
| Page header | Title plus a labelled count ("22 products", "3 of 22 products" when filtered). |
| Formats | Numbers, EUR and dates follow the interface language (en-GB, de-DE, tr-TR) through `format.ts` / `dates.ts`. Product codes, product names and technical IDs are never translated. |

## Metrics: what each number means

| Metric | Definition | Where |
|--------|-----------|-------|
| Available stock | `product.stock`, equal to the sum of remaining lot quantities | tables, drawer |
| Reorder threshold | `product.reorderLevel`, set per product | tables, drawer |
| Low / out of stock | active product with stock 0 (out) or at/below the threshold (low) | dashboard, products, report |
| Stock value at list price | available stock x list price, summed over active products. A selling-price view, not accounting cost. | dashboard, drawer (ADMIN, WAREHOUSE_MANAGER) |
| Inventory value (FIFO cost) | remaining units of each lot x that lot's unit cost, computed by the API | dashboard, report, drawer (ADMIN, WAREHOUSE_MANAGER) |
| No cost record | stock on hand but a FIFO value of 0, i.e. no goods receipt with a unit cost was booked (typical for demo data). Shown as a labelled chip instead of EUR 0.00 and excluded from the FIFO total; the number of such products is stated. | dashboard, report, drawer |
| Stock in / out, last 30 days | sum of movement quantities of the latest loaded movements dated within 30 days. If the history is longer than what is loaded (latest 200), the page says so. | dashboard |

The two value metrics are shown as separate, labelled cards with a formula tooltip; they are never added or compared silently.

## Behaviour rules

- **Search** (products): case-insensitive, whitespace-separated words must all appear in name, product code or supplier name.
- **Filter** (products): active (default), all, low or out of stock, out of stock, inactive. Deactivated products are never deleted; their history stays.
- **Sort**: click a column heading; click again to reverse; the heading carries `aria-sort`. Numbers sort as numbers, codes naturally (SKU-2 before SKU-10), missing values last. Changing sort, filter or search returns to page 1.
- **Pagination**: 25 rows per page for products, 50 for movements, 25 for the audit log.
- **States**: every list has loading (skeleton rows), error (message and retry), empty (what to do next) and "no results" (with clear filters). Saving shows a specific success message ("Product saved").
- **Risky actions**: deactivating a product, deleting a supplier or user, and reversing a movement each open a confirmation that names the object and the consequence. Reversal requires a reason code (the API already requires it) and creates a compensating movement; nothing is edited in place.
- **Stock out**: the form shows stock after booking and blocks a quantity above available stock. The API check is the authority and its message is shown inline if it refuses.
- **Authorisation**: the UI hides or disables what a role cannot do (`permissions.ts`, with tests), but every rule is enforced by the API.
- **Dates in the audit filter**: the date inputs are the browser's native pickers, so their display format follows the browser settings, not the interface language.

## Roles

| | ADMIN | WAREHOUSE_MANAGER | STAFF |
|---|---|---|---|
| Read dashboard, products, suppliers, movements, report | yes | yes | yes (costs and prices hidden) |
| Book stock in / out | yes | yes | yes (a stock-in needs a unit cost) |
| Reverse a movement | yes | yes | no |
| Create, edit, deactivate products; create, edit suppliers | yes | yes | no |
| Delete a supplier | yes | no | no |
| Audit log, user management | yes | no | no |
| Change own password | yes | yes | yes |

## Verification status

Run and passing in the development environment (no browser, no backend): TypeScript type check, ESLint
(React compiler rules) and the Node unit tests for permissions, dictionary parity, number/date formats,
product search/filter/sort/pagination, valuation rules and audit labels.

Not verified: how the screens look and behave in a browser (layout, wrapping, dark theme, phone widths),
keyboard-only operation, screen-reader behaviour, colour contrast, and the interaction with a running backend.
The design aims at WCAG 2.2 AA but conformance has not been tested. See `docs/TEST-SCENARIOS.md` for the
scenarios that should be run.

## Known gaps

- Dashboard figures use the latest 200 movements, not the full history (the page states this when it applies).
- No end-to-end tests yet.
- Date input format in the audit filter follows the browser.

## Round 3 changes (not browser-verified)

- Tables: shared theme chrome (1px outer border, tinted sticky header, vertical cell dividers, row separators, subtle zebra, hover/selected states, 44px rows, tabular numerals, pinned actions column) inside a scroll container.
- Dashboard: six equal-height metric cards (6/3/2 columns), attention list and chart cards of equal height, grouped bar chart with a real y-axis (nice ticks), 12px text, empty "all clear" state.
- Layout: content up to 1680px, 16/24/32px page padding, sidebar permanent on desktop and collapsible (choice remembered).
- Audit log: description built from action/entity codes through the en/de/tr dictionary; text date inputs accept ISO or day-first dates, show a format hint and a formatted range caption.
- Movements: labelled product filter; cost header tooltip; a missing/zero cost is shown as an em dash with a tooltip, never as 0.
- Verification: tsc, eslint and node tests pass. The UI has still not been rendered or checked in a browser, and no accessibility conformance is claimed.

## Round 4: reviewed from rendered screenshots

Earlier rounds were written without ever seeing the interface. This round ran the real frontend code against a throwaway mock API (about 25 products, 6 suppliers, 60 movements, audit entries, 4 users) in headless Chromium and judged 1440x900 and 1920x1080 screenshots page by page, in English, German and Turkish, plus empty, loading and error states. Screenshots are in `docs/screenshots`.

What the screenshots showed, and what changed:

- Too many type sizes, weights up to 800, and a colour for every metric: now four sizes (12, 14, 16, 24), three weights, neutral greys with one blue accent; green, amber and red only for status.
- The dark navy sidebar competed with the content: now a light sidebar with icons, an active state, and user, role and logout at the bottom. The page title is no longer repeated in the top bar.
- Controls floated above tables: search, filters and the result count now sit in one toolbar inside the table card.
- Status pills clipped their text and were a wall of green: pills no longer clip; "in stock" has no icon, only low and out of stock do.
- Row actions were a column of coloured icons: grey at rest, coloured on hover.
- Dashboard: metric cards without icon tiles, equal height; the attention list and the chart are the same height; the chart is a 30-day line with a real axis and tooltip, and falls back to a ranked list of the most moved products when the month has fewer than five days with movements. Pie charts on the report page became compact split bars.
- Audit log: the date fields had boxed hint text; now plain labelled fields with the format as placeholder and helper text only on error. Object names no longer wrap.
- Flag emoji rendered as letters on this machine (and do on Windows): replaced by language names.
- The same load error was shown three times on the dashboard: shown once per card, and metrics show an em dash instead of a misleading zero.
- English labels are sentence case; German labels that truncated were shortened.

Still not verified: the real Spring backend was never run against this UI, nothing was checked on a real device or with a screen reader, and no accessibility conformance is claimed.
