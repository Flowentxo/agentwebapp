# Check PostgreSQL
$pgConn = Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
if ($pgConn) {
    Write-Host "PostgreSQL (port 5432): RUNNING"
} else {
    Write-Host "PostgreSQL (port 5432): NOT RUNNING"
}

# Check Redis
$redisConn = Get-NetTCPConnection -LocalPort 6379 -ErrorAction SilentlyContinue
if ($redisConn) {
    Write-Host "Redis (port 6379): RUNNING"
} else {
    Write-Host "Redis (port 6379): NOT RUNNING"
}
