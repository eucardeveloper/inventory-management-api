# Role matrix

The API is the authority. Every row below is enforced server-side by `security/SecurityConfig.java` (URL rules) and `@PreAuthorize` on the controllers; the web app only hides or disables what a role cannot do (`frontend/inventory-app/src/features/inventory/permissions.ts`, mirrored by `permissions.test.ts`). A hidden button is a convenience, not a security control.

Legend: yes = allowed, no = refused with `403`, masked = allowed but cost and price fields are removed by the API.

## Roles

| Role | Intended person | Summary |
|---|---|---|
| `ADMIN` | Owner / system administrator | Everything, including users, audit log and API documentation |
| `INVENTORY_MANAGER` | Warehouse or stock lead | Runs stock and master data, sees costs; no users, no audit log, cannot delete suppliers |
| `STAFF` | Counter / floor staff | Reads stock and books movements; no costs, no corrections, no master data changes |

## Matrix

| Capability | ADMIN | INVENTORY_MANAGER | STAFF | Enforced by |
|---|---|---|---|---|
| Sign in, refresh session, sign out | yes | yes | yes | `/api/auth/**` |
| Read dashboard, products, suppliers, movements, stock report | yes | yes | yes | `GET /api/**` any of the three roles |
| See costs, FIFO value, list prices | yes | yes | masked | service-level masking for `STAFF` |
| Book a stock-in / stock-out | yes | yes | yes | `POST /api/stock/movements` |
| Reverse a movement (reason code required) | yes | yes | no | `POST /api/stock/movements/*/reverse` |
| Create, edit, deactivate products | yes | yes | no | `ProductController` |
| Create, edit suppliers | yes | yes | no | `SupplierController` |
| Delete a supplier | yes | no | no | `@PreAuthorize("hasRole('ADMIN')")` |
| Audit log | yes | no | no | `AuditLogController` |
| List users, change role, reset password, delete user | yes | no | no | `UserController` |
| Register a user | yes | no | no | `POST /api/auth/register` |
| Change own password (current password required) | yes | yes | yes | `PATCH /api/users/*/password` |
| Swagger UI, `/actuator/**` (except health, info, prometheus) | yes | no | no | `SecurityConfig` |
| Workspace settings (stored in this browser only) | yes | no | no | UI convention, not an API rule |

## Invariants that hold for every role

- The last `ADMIN` cannot be demoted or deleted (`409` / refused).
- A user cannot delete their own account.
- A movement is never edited or deleted; a correction is a new reversal movement, and a movement can be reversed once.
- Deleting a user revokes all of that user's sessions; a password change revokes the refresh tokens of the account (`RefreshTokenRepository.revokeAllByUser`). Whether a *role change* ends the target's current session was not verified here; the UAT guide has a step to check it.

## Pages per role

| Page | ADMIN | INVENTORY_MANAGER | STAFF |
|---|---|---|---|
| Dashboard, Products, Suppliers, Movements, Stock report | yes | yes | yes (no cost figures) |
| Audit log | yes | no (menu entry hidden, direct URL redirects) | no |
| Users | yes | no | no |
| Settings (page opens for every role; the workspace section is editable by ADMIN only) | yes | yes | yes |

How to check this yourself: `docs/UAT-GUIDE.md`, sections 1 to 3. What automated tests cover: `permissions.test.ts` (UI table) and the security tests under `src/test/java/.../security`.
