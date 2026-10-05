# Frontend UX review

## Scope

Reviewed the implemented Next.js routes (`login`, `dashboard`, `products`,
`movements`, `suppliers`, `reports`, `audit`, and `users`), the shared WMS
screen, React Query hooks, middleware and current CSS. The review describes
the current code, not an assumed product roadmap.

## Findings before this iteration

| Area | Evidence | Impact |
|---|---|---|
| Visual language | The main screen uses MUI but mixes indigo/purple gradients, ad-hoc border radii and inline styling. | Screenshots feel like several screens evolved independently rather than one warehouse product. |
| Dashboard KPIs | Stock value is calculated from `Product.unitPrice`, while the report endpoint exposes FIFO-oriented stock information. There is no explicit today-movement KPI. | The most visible number can differ from the inventory valuation used by the backend. |
| Data states | Products, movements, audit and reports have loading/empty handling, but the shared error treatment is inconsistent and query errors are not always actionable. | Operators cannot always tell whether a screen is empty, loading or unavailable. |
| Filtering | Product search/filter state is local component state. Movement filtering is partly query-backed, but filters are not consistently encoded in the URL. | Sharing a filtered view and using browser back/forward is unreliable. |
| Product detail | The existing drawer shows product data and movement history. It does not expose a dedicated FIFO lot list or a server-backed lot endpoint. | A richer FIFO detail screen must not invent data that the API does not provide. |
| Movement entry | The form validates required fields and records movements through the real API. It does not have a backend FIFO preview endpoint, so an exact preview cannot be honestly rendered client-side. | Showing a fabricated lot allocation would be worse than a clear limitation. |
| Accessibility | MUI labels and dialogs provide a useful base, but several icon-only controls rely on tooltips, focus styles are mostly browser defaults, and route-level access denial currently redirects rather than explaining the decision. | Keyboard and screen-reader users receive less context than mouse users. |
| Responsive behavior | The sidebar switches to a drawer and tables scroll, but dense table rows and export/action controls remain difficult on narrow screens. | Tablet/mobile operation is possible but not optimized for warehouse scanning workflows. |
| i18n | English, Turkish and German strings exist in the main screen and language choice is persisted. Some browser-generated dates and native export strings are not centralized. | Language consistency can drift, especially in error and export flows. |
| Performance | React Query caching is enabled and duplicate request hooks are centralized. The main route remains a large client component and requests up to 200 movements for charts. | Initial JS and chart work are larger than necessary as data grows. |

## Decisions for this iteration

1. Keep MUI, React Query and TypeScript; no new UI package is necessary.
2. Add a restrained logistics-oriented theme and shared CSS tokens instead of
   replacing the working screen with a speculative design system.
3. Improve keyboard focus, responsive spacing, command navigation and explicit
   error/empty copy without fabricating FIFO or category data absent from the
   API.
4. Keep the backend contract unchanged. A dedicated FIFO preview or lot
   endpoint would require a separate backend/API decision and is therefore not
   simulated in the frontend.

## Remaining limitations after the frontend pass

- No Playwright runner existed in the repository at the start of the work.
- Lighthouse is not available in the local toolchain, so no Lighthouse score
  is claimed without a browser audit run.
- The API does not expose product categories or FIFO lot detail/preview
  endpoints; the UI must not manufacture those values.
- The frontend still uses a single large client route and the deprecated
  Next.js `middleware` convention emits a build warning.
