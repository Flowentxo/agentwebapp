# Apply Migration with Auto-Confirmation
# This script automatically confirms the migration

Write-Host "🔄 Applying database migration..." -ForegroundColor Cyan

# Kill the hanging db:push process if it exists
Get-Process | Where-Object {$_.CommandLine -like "*drizzle-kit push*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Run migration with 'y' piped in
$confirmation = "y"
$confirmation | npm run db:push 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    Write-Host "Please run manually in a new terminal:" -ForegroundColor Yellow
    Write-Host "  npm run db:push" -ForegroundColor White
}
