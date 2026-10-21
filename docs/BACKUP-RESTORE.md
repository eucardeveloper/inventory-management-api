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

## Limits

- The dump is taken from the running database and is consistent per database (`pg_dump` uses one snapshot).
- Prometheus and Grafana data are not backed up (they are metrics, not business data).
- Keep a copy of `backups\` outside this computer (external disk or cloud storage); a backup on the same disk does not survive a disk failure.
