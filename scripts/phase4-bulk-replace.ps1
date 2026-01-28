# Phase 4: Global Bulk Replace Script for True Black OLED Theme
# This script performs search-and-replace operations across the entire codebase
# to convert light-theme-specific colors to semantic dark-theme tokens

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

# Define the root directory
$RootDir = Split-Path -Parent $PSScriptRoot

# Define file patterns to process
$FilePatterns = @(
    "*.tsx",
    "*.ts",
    "*.jsx",
    "*.js",
    "*.css"
)

# Define directories to exclude
$ExcludeDirs = @(
    "node_modules",
    ".next",
    "dist",
    ".git",
    "coverage",
    "playwright-report"
)

# Define replacement patterns (order matters - more specific patterns first)
$Replacements = @(
    # Background colors
    @{ Find = 'bg-white dark:bg-gray-800'; Replace = 'bg-card' },
    @{ Find = 'bg-white dark:bg-gray-900'; Replace = 'bg-card' },
    @{ Find = 'bg-white dark:bg-slate-800'; Replace = 'bg-card' },
    @{ Find = 'bg-white dark:bg-slate-900'; Replace = 'bg-card' },
    @{ Find = 'bg-white/95'; Replace = 'bg-card/95' },
    @{ Find = 'bg-white/90'; Replace = 'bg-card/90' },
    @{ Find = 'bg-white/80'; Replace = 'bg-card/80' },
    @{ Find = 'bg-white'; Replace = 'bg-card' },

    # Slate backgrounds
    @{ Find = 'bg-slate-900/60'; Replace = 'bg-background/80' },
    @{ Find = 'bg-slate-100'; Replace = 'bg-muted' },
    @{ Find = 'bg-slate-50'; Replace = 'bg-muted/50' },

    # Gray backgrounds
    @{ Find = 'bg-gray-100'; Replace = 'bg-muted' },
    @{ Find = 'bg-gray-50'; Replace = 'bg-muted/50' },
    @{ Find = 'bg-gray-200 dark:bg-gray-700'; Replace = 'bg-muted' },
    @{ Find = 'bg-gray-300 dark:bg-gray-600'; Replace = 'bg-muted' },

    # Text colors - Slate
    @{ Find = 'text-slate-900'; Replace = 'text-foreground' },
    @{ Find = 'text-slate-800'; Replace = 'text-foreground' },
    @{ Find = 'text-slate-700'; Replace = 'text-foreground' },
    @{ Find = 'text-slate-600'; Replace = 'text-muted-foreground' },
    @{ Find = 'text-slate-500'; Replace = 'text-muted-foreground' },
    @{ Find = 'text-slate-400'; Replace = 'text-muted-foreground' },

    # Text colors - Gray with dark mode
    @{ Find = 'text-gray-900 dark:text-gray-100'; Replace = 'text-foreground' },
    @{ Find = 'text-gray-800 dark:text-gray-200'; Replace = 'text-foreground' },
    @{ Find = 'text-gray-700 dark:text-gray-300'; Replace = 'text-muted-foreground' },
    @{ Find = 'text-gray-600 dark:text-gray-400'; Replace = 'text-muted-foreground' },
    @{ Find = 'text-gray-500 dark:text-gray-400'; Replace = 'text-muted-foreground' },

    # Text colors - Gray standalone
    @{ Find = 'text-gray-900'; Replace = 'text-foreground' },
    @{ Find = 'text-gray-800'; Replace = 'text-foreground' },
    @{ Find = 'text-gray-700'; Replace = 'text-foreground' },
    @{ Find = 'text-gray-600'; Replace = 'text-muted-foreground' },
    @{ Find = 'text-gray-500'; Replace = 'text-muted-foreground' },
    @{ Find = 'text-gray-400'; Replace = 'text-muted-foreground' },

    # Border colors - Slate
    @{ Find = 'border-slate-300'; Replace = 'border-border' },
    @{ Find = 'border-slate-200'; Replace = 'border-border' },
    @{ Find = 'border-slate-100'; Replace = 'border-border' },

    # Border colors - Gray with dark mode
    @{ Find = 'border border-gray-200 dark:border-gray-700'; Replace = 'border-2 border-border' },
    @{ Find = 'border-gray-300 dark:border-gray-600'; Replace = 'border-border' },
    @{ Find = 'border-gray-200 dark:border-gray-700'; Replace = 'border-border' },

    # Border colors - Gray standalone
    @{ Find = 'border-gray-300'; Replace = 'border-border' },
    @{ Find = 'border-gray-200'; Replace = 'border-border' },
    @{ Find = 'border-gray-100'; Replace = 'border-border' },

    # Status colors - Emerald
    @{ Find = 'bg-emerald-50'; Replace = 'bg-emerald-500/10' },
    @{ Find = 'bg-emerald-100'; Replace = 'bg-emerald-500/20' },
    @{ Find = 'border-emerald-200'; Replace = 'border-emerald-500/30' },
    @{ Find = 'text-emerald-600'; Replace = 'text-emerald-500' },

    # Status colors - Red
    @{ Find = 'bg-red-50'; Replace = 'bg-red-500/10' },
    @{ Find = 'bg-red-100'; Replace = 'bg-red-500/20' },
    @{ Find = 'border-red-200'; Replace = 'border-red-500/30' },

    # Status colors - Amber
    @{ Find = 'bg-amber-50'; Replace = 'bg-amber-500/10' },
    @{ Find = 'bg-amber-100'; Replace = 'bg-amber-500/20' },
    @{ Find = 'border-amber-200'; Replace = 'border-amber-500/30' },

    # Status colors - Blue
    @{ Find = 'bg-blue-50'; Replace = 'bg-blue-500/10' },
    @{ Find = 'bg-blue-100'; Replace = 'bg-blue-500/20' },
    @{ Find = 'border-blue-200'; Replace = 'border-blue-500/30' },

    # Status colors - Yellow
    @{ Find = 'bg-yellow-50'; Replace = 'bg-yellow-500/10' },
    @{ Find = 'bg-yellow-100'; Replace = 'bg-yellow-500/20' },
    @{ Find = 'border-yellow-200'; Replace = 'border-yellow-500/30' },

    # Teal to Primary
    @{ Find = 'bg-teal-50 dark:bg-teal-900/20'; Replace = 'bg-primary/10' },
    @{ Find = 'hover:border-teal-300 dark:hover:border-teal-600'; Replace = 'hover:border-primary/30' },

    # Hover states
    @{ Find = 'hover:bg-slate-100'; Replace = 'hover:bg-muted' },
    @{ Find = 'hover:bg-slate-50'; Replace = 'hover:bg-muted/50' },
    @{ Find = 'hover:bg-gray-100'; Replace = 'hover:bg-muted' },
    @{ Find = 'hover:bg-gray-50'; Replace = 'hover:bg-muted/50' },
    @{ Find = 'hover:border-slate-300'; Replace = 'hover:border-primary/30' },
    @{ Find = 'hover:border-gray-300'; Replace = 'hover:border-primary/30' }
)

# Statistics
$stats = @{
    FilesScanned = 0
    FilesModified = 0
    TotalReplacements = 0
    ReplacementsByPattern = @{}
}

# Initialize replacement stats
foreach ($replacement in $Replacements) {
    $stats.ReplacementsByPattern[$replacement.Find] = 0
}

function Get-AllFiles {
    param([string]$Path)

    $files = @()

    foreach ($pattern in $FilePatterns) {
        $foundFiles = Get-ChildItem -Path $Path -Filter $pattern -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object {
                $filePath = $_.FullName
                $excluded = $false
                foreach ($excludeDir in $ExcludeDirs) {
                    if ($filePath -like "*\$excludeDir\*" -or $filePath -like "*/$excludeDir/*") {
                        $excluded = $true
                        break
                    }
                }
                -not $excluded
            }
        $files += $foundFiles
    }

    return $files | Sort-Object FullName -Unique
}

function Process-File {
    param([System.IO.FileInfo]$File)

    $stats.FilesScanned++
    $content = [System.IO.File]::ReadAllText($File.FullName)
    $originalContent = $content
    $fileModified = $false

    foreach ($replacement in $Replacements) {
        $find = [regex]::Escape($replacement.Find)
        $matches = [regex]::Matches($content, $find)

        if ($matches.Count -gt 0) {
            $content = $content -replace $find, $replacement.Replace
            $stats.TotalReplacements += $matches.Count
            $stats.ReplacementsByPattern[$replacement.Find] += $matches.Count
            $fileModified = $true

            if ($Verbose) {
                Write-Host "  Found $($matches.Count)x: $($replacement.Find) -> $($replacement.Replace)" -ForegroundColor Yellow
            }
        }
    }

    if ($fileModified) {
        $stats.FilesModified++

        if (-not $DryRun) {
            [System.IO.File]::WriteAllText($File.FullName, $content)
            Write-Host "[MODIFIED] $($File.FullName)" -ForegroundColor Green
        } else {
            Write-Host "[DRY-RUN] Would modify: $($File.FullName)" -ForegroundColor Cyan
        }
    }
}

# Main execution
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host " Phase 4: True Black OLED Theme" -ForegroundColor Magenta
Write-Host " Global Bulk Replace Script" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

if ($DryRun) {
    Write-Host "[DRY-RUN MODE] No files will be modified`n" -ForegroundColor Yellow
}

Write-Host "Scanning directory: $RootDir`n" -ForegroundColor Cyan

$files = Get-AllFiles -Path $RootDir

Write-Host "Found $($files.Count) files to process`n" -ForegroundColor Cyan

foreach ($file in $files) {
    if ($Verbose) {
        Write-Host "Processing: $($file.FullName)" -ForegroundColor Gray
    }
    Process-File -File $file
}

# Print summary
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host " Summary" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "Files scanned:  $($stats.FilesScanned)" -ForegroundColor White
Write-Host "Files modified: $($stats.FilesModified)" -ForegroundColor Green
Write-Host "Total replacements: $($stats.TotalReplacements)" -ForegroundColor Yellow

if ($stats.TotalReplacements -gt 0) {
    Write-Host "`nReplacements by pattern:" -ForegroundColor Cyan
    foreach ($pattern in $stats.ReplacementsByPattern.GetEnumerator() | Where-Object { $_.Value -gt 0 } | Sort-Object Value -Descending) {
        Write-Host "  $($pattern.Value)x: $($pattern.Key)" -ForegroundColor Gray
    }
}

if ($DryRun) {
    Write-Host "`n[DRY-RUN] To apply changes, run without -DryRun flag" -ForegroundColor Yellow
}

Write-Host "`nDone!`n" -ForegroundColor Green
