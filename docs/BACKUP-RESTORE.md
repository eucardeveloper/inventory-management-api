# Backup and restore

What is backed up, and how to prove the backup works.

| What | How | Where |
|---|---|---|
| Code | `git push` to GitHub | the repository |
| Database (products, suppliers, lots, movements, users, audit log, refresh tokens) | `backup.bat` runs `pg_dump -Fc` inside the `inventory-database` container | `backups\<timestamp>\inventory_db.dump` (git-ignored) |
| Secrets (`.env`) | not in git by design; keep a copy yourself | your password manager |

## Back up

```
.\backup.bat
```

## Restore (and the restore test)

A backup that was never restored is only a hope. Test it once:

1. `.\backup.bat` and note the timestamp.
2. In the app, create a throw-away product (for example "RESTORE-TEST").
3. `.\restore.bat <timestamp>`, type `YES`.
4. Open `http://localhost:3002`: the throw-away product must be gone and everything else must be as at backup time.

Status: first successful restore test on 2026-10-21 (`.\restore-test.ps1`: backup taken, a marker written into a product, backup restored, marker gone, product count unchanged).

Latest successful restore test: **2026-10-26** (`.\restore-test.ps1`, backup `20261026_144426`: `pg_restore` exit code 0, marker gone, product count 9 = 9).

## After reformatting the computer (or on a new computer)

1. Install Docker Desktop and clone the repository.
2. Copy your backup folder (`backups\<timestamp>\inventory_db.dump`) and your `.env`, if you use one, back into place.
3. `docker compose up -d --build`, then `.\restore.bat <timestamp>` and type `YES`.
4. Check the data in the app as in the restore test above (the restore script does not check its own result).

## Limits

- The dump is taken from the running database and is consistent per database (`pg_dump` uses one snapshot).
- Prometheus and Grafana data are not backed up (they are metrics, not business data).
- This stack publishes ports 3001 (Grafana), 3002 (frontend) and 9090 (Prometheus). The Customer Management stack uses some of the same ports, so run only one of the two stacks at a time (stop one with `docker compose stop` before starting the other).
- Keep a copy of `backups\` outside this computer (external disk or cloud storage); a backup on the same disk does not survive a disk failure.
