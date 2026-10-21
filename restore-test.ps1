# Inventory backup + restore test, one command:  .\restore-test.ps1
# 1) takes a backup  2) writes a marker into one product  3) restores the backup  4) checks the marker is gone.
# Needs the stack to be running (docker compose up -d). Touches only one product description, and the restore puts it back.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$db = 'inventory-database'
function Sql($q) { (docker exec $db psql -U postgres -d inventory_db -t -A -c $q).Trim() }

Write-Host '1/5 backup ...'
cmd /c backup.bat | Out-Host
$ts = (Get-ChildItem backups | Sort-Object Name | Select-Object -Last 1).Name
$file = Join-Path $PSScriptRoot "backups\$ts\inventory_db.dump"
if (-not (Test-Path $file) -or (Get-Item $file).Length -lt 1000) { throw "No valid backup at $file" }
$before = Sql 'SELECT count(*) FROM product'

Write-Host '2/5 writing a marker into the first product ...'
$null = Sql "UPDATE product SET description = coalesce(description,'') || ' RESTORE-TEST-MARKER' WHERE id = (SELECT min(id) FROM product)"
if ((Sql "SELECT count(*) FROM product WHERE description LIKE '%RESTORE-TEST-MARKER%'") -ne '1') { throw 'Marker was not written' }

Write-Host '3/5 restoring the backup ...'
docker compose stop inventory-backend | Out-Host
docker cp $file "${db}:/tmp/restore.dump" | Out-Host
docker exec $db pg_restore -U postgres -d inventory_db --clean --if-exists --no-owner /tmp/restore.dump 2>&1 | Out-Host
Write-Host "pg_restore exit code: $LASTEXITCODE"
docker exec $db rm -f /tmp/restore.dump
docker compose up -d | Out-Host

Write-Host '4/5 checking ...'
$marker = Sql "SELECT count(*) FROM product WHERE description LIKE '%RESTORE-TEST-MARKER%'"
$after = Sql 'SELECT count(*) FROM product'
if ($marker -eq '0' -and $before -eq $after) {
  Write-Host "PASS: backup $ts restored, marker gone, product count $after = $before." -ForegroundColor Green
  Write-Host "5/5 Write this date into docs\BACKUP-RESTORE.md: $(Get-Date -Format yyyy-MM-dd)"
} else {
  Write-Host "FAIL: marker=$marker, products before=$before after=$after" -ForegroundColor Red
  exit 1
}
