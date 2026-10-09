# Case study: Warehouse Management System (WMS)

A portfolio project by Enes Ucar. It is a demo system with sample data. It has no customers, no production
use and no measured business results, and this document does not claim any.

## Problem

Small warehouses often run on spreadsheets. The typical failures are the same: stock figures that drift
from reality, no record of who changed what, a cost value that nobody can explain, and tools that let any
user do anything. The aim of this project is to show how a small, boring, trustworthy stock system can be
built: correct stock arithmetic, traceable changes, clear roles, and an interface that makes the daily flows
quick to understand.

## Users

| User | Needs |
|------|-------|
| Warehouse worker | find a product fast, see what is available, book a goods receipt or issue without mistakes |
| Warehouse manager | see what is low or out of stock, correct mistakes with a trace, maintain products and suppliers, understand stock value |
| System administrator | manage users and roles, read the audit log |

Priority flows: find a product, goods receipt, goods issue, low-stock follow-up, review past movements.
No new features were added during the redesign; the work was about making existing flows clear and safe.

## Design decisions

- **Operations first, not a dashboard of decoration.** The start page answers "what needs attention now?":
  a list of low and out-of-stock products with the shortfall and a one-click goods receipt, plus stock in and
  out over the last 30 days.
- **One design system in code.** Colour roles, a 14px type scale, table density, content width and the focus
  ring are tokens in `theme.ts`; screens are assembled from a few shared components. Light theme is the
  default because the product is meant for office use; dark is available and remembered.
- **Separate what looks similar.** Product code, available stock, reorder threshold and the two stock values
  are different columns or cards. *Stock value at list price* (stock x selling price) and *inventory value at
  FIFO cost* (remaining units x the cost of the lot they came from) are different metrics with different
  labels and a formula tooltip. A product with stock but no recorded cost shows "No cost record" instead of
  EUR 0.00, and the FIFO total says how many products it leaves out.
- **Status is never colour alone.** Chips carry an icon and a word. Icon-only controls have accessible
  names and tooltips; wide screens show text labels on row actions.
- **Risky actions are explicit.** Deactivation, deletion and reversal ask for confirmation naming the object;
  reversal requires a reason and creates a compensating entry instead of editing history.
- **Three languages from one dictionary.** English, German (de-DE) and Turkish share one typed dictionary;
  a test fails if the key sets or placeholders differ. Numbers, EUR and dates follow the language. Codes,
  names and technical IDs are not translated.
- **The UI mirrors authorisation but never replaces it.** A permissions table drives what is shown; the API
  enforces every rule.

## Engineering choices

| Topic | Choice | Why |
|-------|--------|-----|
| Architecture | Spring Boot monolith, PostgreSQL, Flyway | one deployable, transactional integrity for stock; see `docs/adr/` |
| Stock model | FIFO lots; `stock` equals the sum of remaining lot quantities; append-only movement ledger | auditable, explains cost value; invariants also enforced by `CHECK` constraints |
| Concurrency | pessimistic lock on issues for the same product | no negative stock under parallel requests |
| Security | JWT in an HttpOnly SameSite cookie, role rules in the API, origin check, login rate limit with bounded memory, last-admin protection, API docs for admins only | defence in depth; see README |
| Errors | one `application/problem+json` format everywhere | the UI can show real messages |
| Time | everything in UTC, converted for display | no ambiguity between server and browser |
| Frontend | Next.js, React, MUI, TanStack Query, TypeScript strict, React-compiler lint rules | kept the existing stack; no technology change for the redesign |
| Pure logic | formatting, search/filter/sort, valuation rules and labels are plain functions with unit tests | testable without a browser |

## Verified results

Only facts that were actually checked:

- At the last push, the GitHub Actions workflows for the backend (unit and Testcontainers integration tests,
  ArchUnit) and for the frontend were green (reported by the repository owner).
- For the redesign described here, the following were run locally: TypeScript type check (0 errors), ESLint
  with the React-compiler rules (0 errors), and the Node unit tests for permissions, dictionary parity,
  formats, dates, product search/filter/sort/pagination, valuation rules and audit labels.
- The backend was not changed by the redesign.

There are no performance figures, no user numbers and no customer feedback, because none exist.

## Not verified / known limitations

- The redesigned screens have not been inspected in a browser by the author of this change: layout,
  wrapping, dark theme and phone widths are unverified.
- Accessibility: the design aims at WCAG 2.2 AA, but keyboard operation, screen readers and contrast were not
  tested. No conformance claim is made.
- The redesign has not been run against a live backend; the redesign commits have not been through CI yet.
- End-to-end tests do not exist; recommended scenarios are listed in `docs/TEST-SCENARIOS.md`.
- Dashboard figures use the latest 200 movements. The page states this, but a server-side aggregate
  endpoint would be the proper fix.
- The audit date filter uses native date inputs, so their display format follows the browser.
- Demo data: some products have stock without a cost lot; the interface flags them instead of hiding them.
- Spring Boot 3.5 is past open-source support; a migration is planned (see README).
- No multi-warehouse, batch/serial numbers or purchase orders; these are out of scope.

## What this project demonstrates (and what it does not)

It demonstrates careful domain modelling (FIFO, invariants, audit), layered security, tests at several
levels, and attention to interface clarity. It does not demonstrate operating a system in production, scale,
or working with real users; that experience is not claimed here.
