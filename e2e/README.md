# End-to-end tests (Playwright)

These drive the real web app in Chromium against the real backend and database, using the demo accounts
and data that `docker compose up` creates. They are not part of `./mvnw verify`.

```
docker compose up -d --build          # from the repository root; wait until the backend is healthy
cd e2e
npm install
npx playwright install chromium
npm test
```

`BASE_URL` (default `http://localhost:3002`), `API_URL` (default `http://localhost:8083`) and the
`E2E_ADMIN_*` / `E2E_STAFF_*` variables override the defaults. The booking test leaves the stock where it
found it (it books 7 units in and reverses that movement), so it can be run repeatedly; it does add two ledger
rows each run.
