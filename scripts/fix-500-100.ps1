# Fix broken 500/100 patterns from bulk-replace script

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot

$files = Get-ChildItem -Path $RootDir -Recurse -Include "*.tsx","*.ts","*.css" -File |
    Where-Object { $_.FullName -notlike "*\node_modules\*" -and $_.FullName -notlike "*\.next\*" }

$fixCount = 0

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $newContent = $content -replace '500/100', '500'

    if ($content -ne $newContent) {
        [System.IO.File]::WriteAllText($file.FullName, $newContent)
        Write-Host "[FIXED] $($file.FullName)" -ForegroundColor Green
        $fixCount++
    }
}

Write-Host "`nFixed $fixCount files" -ForegroundColor Cyan
