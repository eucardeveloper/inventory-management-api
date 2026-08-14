# git_refactor_inventory.ps1
# Run this script from the project root: C:\Users\enes_\OneDrive\Desktop\lagerverwaltung

Set-Location "C:\Users\enes_\OneDrive\Desktop\lagerverwaltung"

Write-Host "=== Step 1: Remove old lagerverwaltung Java package folder ===" -ForegroundColor Cyan
git rm -r --cached "src/main/java/com/enesucar/lagerverwaltung"
Remove-Item -Recurse -Force "src\main\java\com\enesucar\lagerverwaltung" -ErrorAction SilentlyContinue

Write-Host "=== Step 2: Rename frontend/depo-app to frontend/warehouse-app ===" -ForegroundColor Cyan
git mv "frontend/depo-app" "frontend/warehouse-app"

Write-Host "=== Step 3: Stage all changes ===" -ForegroundColor Cyan
git add .

Write-Host "=== Step 4: Commit ===" -ForegroundColor Cyan
git commit -m "refactor: rename German identifiers to English (inventory package)"

Write-Host "=== Step 5: Push ===" -ForegroundColor Cyan
git push

Write-Host "Done!" -ForegroundColor Green
