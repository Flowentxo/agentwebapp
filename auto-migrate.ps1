# Auto-confirm Drizzle Migration
Write-Host "🚀 Starting automatic migration with auto-confirmation..." -ForegroundColor Cyan
Write-Host ""

# Create a temporary expect-style script
$code = @"
`$process = Start-Process -FilePath "npm" -ArgumentList "run", "db:push" -NoNewWindow -PassThru -Wait
"@

# Run migration with simulated input
try {
    # Use echo to pipe 'y' into the command
    # The -replace removes ANSI codes for cleaner output
    $output = cmd /c "echo. | npm run db:push 2>&1"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration may have completed" -ForegroundColor Green
        Write-Host ""
        Write-Host "Testing API..." -ForegroundColor Yellow

        # Test if tables exist by calling API
        try {
            $testResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/collaborations/start" `
                -Method POST `
                -Headers @{
                    "Content-Type" = "application/json"
                    "x-user-id" = "test-user"
                } `
                -Body '{"taskDescription":"Test"}' `
                -ErrorAction Stop

            Write-Host "✅ API works! Tables exist!" -ForegroundColor Green
        } catch {
            if ($_.Exception.Message -like "*relation*does not exist*") {
                Write-Host "❌ Tables still don't exist" -ForegroundColor Red
                Write-Host "⚠️  You need to manually run the migration:" -ForegroundColor Yellow
                Write-Host "   1. Open a NEW PowerShell terminal" -ForegroundColor White
                Write-Host "   2. Run: npm run db:push" -ForegroundColor White
                Write-Host "   3. Select: Yes, I want to execute all statements" -ForegroundColor White
            } else {
                Write-Host "⚠️  API error (but might be OK): $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "💡 If migration didn't work, please run manually:" -ForegroundColor Cyan
Write-Host "   npm run db:push" -ForegroundColor White
