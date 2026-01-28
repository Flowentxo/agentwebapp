# ========================================
# COLLABORATION LAB V2 - SPRINT AUTOMATION
# PowerShell Workflow Automation
# ========================================

$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\Users\luis\Desktop\Flowent-AI-Agent"

# ========================================
# HELPER FUNCTIONS
# ========================================

function Write-SprintLog {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"

    # Console output mit Farbe
    switch ($Level) {
        "SUCCESS" { Write-Host $logEntry -ForegroundColor Green }
        "ERROR" { Write-Host $logEntry -ForegroundColor Red }
        "WARN" { Write-Host $logEntry -ForegroundColor Yellow }
        default { Write-Host $logEntry -ForegroundColor Cyan }
    }

    # File output
    Add-Content -Path "$ProjectRoot\SPRINT_JOURNAL.md" -Value $logEntry
}

function Test-Prerequisites {
    Write-SprintLog "Checking prerequisites..."

    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-SprintLog "Node.js version: $nodeVersion" "SUCCESS"
    } catch {
        Write-SprintLog "Node.js not found! Please install Node.js" "ERROR"
        exit 1
    }

    # Check npm
    try {
        $npmVersion = npm --version
        Write-SprintLog "npm version: $npmVersion" "SUCCESS"
    } catch {
        Write-SprintLog "npm not found!" "ERROR"
        exit 1
    }

    # Check .env.local
    if (Test-Path "$ProjectRoot\.env.local") {
        Write-SprintLog ".env.local found" "SUCCESS"
    } else {
        Write-SprintLog ".env.local not found! Please create it" "ERROR"
        exit 1
    }

    # Check OpenAI API Key
    $envContent = Get-Content "$ProjectRoot\.env.local" -Raw
    if ($envContent -match "OPENAI_API_KEY=sk-") {
        Write-SprintLog "OpenAI API Key configured" "SUCCESS"
    } else {
        Write-SprintLog "OpenAI API Key not configured!" "WARN"
    }

    Write-SprintLog "All prerequisites checked" "SUCCESS"
}

# ========================================
# SPRINT COMMANDS
# ========================================

function Start-DevServers {
    Write-SprintLog "Starting development servers..."

    # Kill existing processes on ports
    Write-SprintLog "Cleaning up existing processes..."
    Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

    Start-Sleep -Seconds 2

    # Start Frontend & Backend
    Write-SprintLog "Starting Frontend & Backend..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; npm run dev" -WindowStyle Normal

    Start-Sleep -Seconds 5

    # Open browser
    Write-SprintLog "Opening browser..."
    Start-Process "http://localhost:3000/agents/collaborate"

    Write-SprintLog "Dev servers started successfully" "SUCCESS"
}

function Stop-DevServers {
    Write-SprintLog "Stopping development servers..."

    Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

    Write-SprintLog "Dev servers stopped" "SUCCESS"
}

function Start-DatabaseServices {
    Write-SprintLog "Starting database services..."

    # Check if Docker is running
    try {
        docker ps | Out-Null
        Write-SprintLog "Docker is running" "SUCCESS"
    } catch {
        Write-SprintLog "Docker is not running! Please start Docker Desktop" "ERROR"
        return
    }

    # Start PostgreSQL
    Write-SprintLog "Starting PostgreSQL..."
    docker start crm-postgres

    # Start Redis
    Write-SprintLog "Starting Redis..."
    docker start crm-redis

    Start-Sleep -Seconds 3

    Write-SprintLog "Database services started" "SUCCESS"
}

function Invoke-DatabaseMigration {
    Write-SprintLog "Running database migrations..."

    Set-Location $ProjectRoot

    # Generate migration
    Write-SprintLog "Generating migration..."
    npm run db:generate

    # Push to database
    Write-SprintLog "Pushing to database..."
    npm run db:push

    Write-SprintLog "Database migration completed" "SUCCESS"
}

function Open-DatabaseStudio {
    Write-SprintLog "Opening Drizzle Studio..."

    Set-Location $ProjectRoot
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; npm run db:studio" -WindowStyle Normal

    Start-Sleep -Seconds 3
    Start-Process "https://local.drizzle.studio"

    Write-SprintLog "Drizzle Studio opened" "SUCCESS"
}

function Test-API {
    param(
        [string]$Endpoint = "health"
    )

    Write-SprintLog "Testing API endpoint: $Endpoint..."

    try {
        $response = Invoke-RestMethod -Uri "http://localhost:4000/api/$Endpoint" -Method Get
        Write-SprintLog "API Response: $($response | ConvertTo-Json -Depth 3)" "SUCCESS"
    } catch {
        Write-SprintLog "API test failed: $_" "ERROR"
    }
}

function New-GitFeatureBranch {
    param(
        [Parameter(Mandatory=$true)]
        [string]$BranchName
    )

    Write-SprintLog "Creating feature branch: $BranchName..."

    Set-Location $ProjectRoot

    # Ensure we're on main
    git checkout main
    git pull origin main

    # Create new branch
    git checkout -b "feature/$BranchName"

    Write-SprintLog "Feature branch created: feature/$BranchName" "SUCCESS"
    Write-SprintLog "Ready to start development!" "SUCCESS"
}

function Complete-GitFeature {
    param(
        [Parameter(Mandatory=$true)]
        [string]$CommitMessage
    )

    Write-SprintLog "Completing feature..."

    Set-Location $ProjectRoot

    # Get current branch name
    $currentBranch = git branch --show-current

    if ($currentBranch -eq "main") {
        Write-SprintLog "Cannot commit directly to main! Create a feature branch first" "ERROR"
        return
    }

    # Stage all changes
    Write-SprintLog "Staging changes..."
    git add .

    # Commit
    Write-SprintLog "Committing changes..."
    git commit -m $CommitMessage

    # Push
    Write-SprintLog "Pushing to remote..."
    git push origin $currentBranch

    Write-SprintLog "Feature completed and pushed!" "SUCCESS"
    Write-SprintLog "Branch: $currentBranch" "INFO"
    Write-SprintLog "Next: Create PR or merge to main" "INFO"
}

function Update-SprintChecklist {
    param(
        [Parameter(Mandatory=$true)]
        [string]$TaskDescription,
        [bool]$Completed = $true
    )

    $checklistFile = "$ProjectRoot\SPRINT_WORKFLOW.md"
    $content = Get-Content $checklistFile -Raw

    if ($Completed) {
        # Replace [ ] with [x]
        $pattern = "- \[ \] $TaskDescription"
        $replacement = "- [x] $TaskDescription"
        $content = $content -replace [regex]::Escape($pattern), $replacement

        Set-Content -Path $checklistFile -Value $content
        Write-SprintLog "Task completed: $TaskDescription" "SUCCESS"
    }
}

function Show-SprintStatus {
    Write-SprintLog "=== SPRINT STATUS ===" "INFO"

    $checklistFile = "$ProjectRoot\SPRINT_WORKFLOW.md"
    $content = Get-Content $checklistFile -Raw

    # Count tasks
    $totalTasks = ([regex]::Matches($content, "- \[[ x]\]")).Count
    $completedTasks = ([regex]::Matches($content, "- \[x\]")).Count
    $remainingTasks = $totalTasks - $completedTasks

    Write-SprintLog "Total Tasks: $totalTasks" "INFO"
    Write-SprintLog "Completed: $completedTasks" "SUCCESS"
    Write-SprintLog "Remaining: $remainingTasks" "WARN"

    $percentage = [math]::Round(($completedTasks / $totalTasks) * 100, 2)
    Write-SprintLog "Progress: $percentage%" "INFO"
}

function Initialize-SprintJournal {
    $journalFile = "$ProjectRoot\SPRINT_JOURNAL.md"

    if (!(Test-Path $journalFile)) {
        @"
# 📝 SPRINT JOURNAL
**Project:** Collaboration Lab V2
**Started:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## Sprint Log

"@ | Set-Content $journalFile
        Write-SprintLog "Sprint Journal initialized" "SUCCESS"
    }
}

# ========================================
# MAIN MENU
# ========================================

function Show-Menu {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  COLLABORATION LAB V2 - SPRINT TOOLS  " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1.  Check Prerequisites" -ForegroundColor Yellow
    Write-Host "2.  Start Dev Servers (Frontend + Backend)" -ForegroundColor Yellow
    Write-Host "3.  Stop Dev Servers" -ForegroundColor Yellow
    Write-Host "4.  Start Database Services (PostgreSQL + Redis)" -ForegroundColor Yellow
    Write-Host "5.  Run Database Migration" -ForegroundColor Yellow
    Write-Host "6.  Open Database Studio" -ForegroundColor Yellow
    Write-Host "7.  Test API Endpoint" -ForegroundColor Yellow
    Write-Host "8.  Create Feature Branch" -ForegroundColor Yellow
    Write-Host "9.  Complete Feature (Commit + Push)" -ForegroundColor Yellow
    Write-Host "10. Update Sprint Checklist" -ForegroundColor Yellow
    Write-Host "11. Show Sprint Status" -ForegroundColor Yellow
    Write-Host "12. Open Collaboration Lab in Browser" -ForegroundColor Yellow
    Write-Host "Q.  Quit" -ForegroundColor Red
    Write-Host ""
}

# ========================================
# SCRIPT ENTRY POINT
# ========================================

# Initialize
Set-Location $ProjectRoot
Initialize-SprintJournal

# Main loop
while ($true) {
    Show-Menu
    $choice = Read-Host "Select option"

    switch ($choice) {
        "1" { Test-Prerequisites }
        "2" { Start-DevServers }
        "3" { Stop-DevServers }
        "4" { Start-DatabaseServices }
        "5" { Invoke-DatabaseMigration }
        "6" { Open-DatabaseStudio }
        "7" {
            $endpoint = Read-Host "Enter API endpoint (default: health)"
            if ([string]::IsNullOrWhiteSpace($endpoint)) { $endpoint = "health" }
            Test-API -Endpoint $endpoint
        }
        "8" {
            $branchName = Read-Host "Enter feature branch name (e.g., sprint1-backend)"
            New-GitFeatureBranch -BranchName $branchName
        }
        "9" {
            $commitMsg = Read-Host "Enter commit message"
            Complete-GitFeature -CommitMessage $commitMsg
        }
        "10" {
            $taskDesc = Read-Host "Enter task description"
            Update-SprintChecklist -TaskDescription $taskDesc -Completed $true
        }
        "11" { Show-SprintStatus }
        "12" { Start-Process "http://localhost:3000/agents/collaborate" }
        "Q" {
            Write-SprintLog "Exiting Sprint Automation..." "INFO"
            exit
        }
        default { Write-Host "Invalid option" -ForegroundColor Red }
    }

    Write-Host ""
    Read-Host "Press Enter to continue"
}
