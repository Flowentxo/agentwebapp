# Quick Fix Guide - Stop Local Postgres Service

## Step 1: Open PowerShell as Administrator

1. Press `Windows + X`
2. Select "Windows PowerShell (Admin)" or "Terminal (Admin)"
3. Click "Yes" on the UAC prompt

## Step 2: Stop the Local PostgreSQL Service

Run this command:
```powershell
Stop-Service postgresql-x64-16
```

Expected output: (No output means success)

## Step 3: Verify Service is Stopped

```powershell
Get-Service postgresql-x64-16
```

Expected output:
```
Status   Name
------   ----
Stopped  postgresql-x64-16
```

## Step 4: Test Docker Postgres Connection

Return to your regular PowerShell and run:
```bash
npx tsx scripts/direct-test.ts
```

Expected output:
```
✅ PostgreSQL Connected Successfully!
   Time: [current timestamp]
   Database: brain_ai
```

## Step 5: Run Full System Verification

```bash
npx tsx scripts/verify-config.ts
```

All services should now show ✅ Connected!

## To Restart Local Postgres Later

After your holiday, restart the service:
```powershell
Start-Service postgresql-x64-16
```

---

**Note:** The local service will remain stopped until you manually restart it or reboot your computer.
