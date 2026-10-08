# UI guidelines and current state

This replaces an older review that no longer matched the code. It describes how the web app
(`frontend/warehouse-app`) is built today and what has and has not been verified.

## Visual language

| Element | Rule |
|---------|------|
| Primary colour | `#2563eb`, hover `#1d4ed8` (one blue; no purple, indigo or pastel accents) |
| Sidebar | Navy `#0b1f3a`, white text, selected item tinted blue |
| Top bar | White (dark mode: slate), 1px bottom border, no shadow |
| Cards | White, 1px `#e2e8f0` border, 12px radius, no shadow |
| Neutrals | Slate; page background `#f1f5f9` |
| Status colours | Green, amber and red only for meaning (stock ok, low, out; success, warning, error) |

The tokens live in `src/features/wms/theme.ts`. Shared building blocks (status chip, section card, page
header, KPI card, empty state, error state, skeleton rows, sticky actions column) live in
`src/features/wms/components/Primitives.tsx`. New screens should use them instead of styling from scratch.

## Layout rules

- Numeric columns are right-aligned; text columns left-aligned.
- The actions column is the last column and is sticky, so it stays visible when a table scrolls sideways.
- Tables size to their content (no tall empty box); long lists are paginated.
- Flex children that hold text set `minWidth: 0` so they truncate instead of pushing the page wider.
- Low-priority columns are hidden on narrow screens; the page itself never scrolls horizontally.
- Every list has a loading state (skeleton rows), an error state with a retry button, and an empty state
  with a short message; filtered lists offer "clear filters".

## Roles (what the UI shows)

The API is the authority. The UI mirrors it only to avoid showing actions that would be refused.
`src/features/wms/permissions.ts` holds the table and has unit tests.

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

- Type check (`tsc --noEmit`) and the node tests (permissions, i18n key parity, HTML escaping, dates) run in CI.
- The screens have **not** been inspected in a browser by the author of this change, and the backend was not
  run alongside them. Visual details (spacing, wrapping on phone widths, dark mode) still need a manual pass.
- Suggested manual check: sign in as each demo role, open every page at 360, 768 and 1280 px width, and
  confirm that no page scrolls sideways and that hidden actions match the table above.

## Known gaps

- The dashboard KPIs and the trend chart use the latest 200 movements, not all history.
- There are no browser (end-to-end) tests yet.
