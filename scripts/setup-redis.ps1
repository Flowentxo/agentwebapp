$ErrorActionPreference = "Stop"

$containerName = "brain-ai-redis-local"
$portMapping   = "6379:6379"
$image         = "redis:7-alpine"

Write-Host "SINTRA Redis Setup" -ForegroundColor Cyan
Write-Host "------------------" -ForegroundColor Cyan

# 1) Docker availability
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker CLI not found. Please install Docker Desktop." -ForegroundColor Red
  exit 1
}

try {
  docker info | Out-Null
  Write-Host "Docker daemon is running." -ForegroundColor Green
} catch {
  Write-Host "Docker daemon is not running. Please start Docker Desktop and retry." -ForegroundColor Red
  exit 1
}

# 2) Ensure container exists and is running
$existing = docker ps -a --filter "name=$containerName" --format "{{.Names}}"
if ($existing -eq $containerName) {
  Write-Host "Found existing container '$containerName'." -ForegroundColor Yellow
  $running = docker ps --filter "name=$containerName" --format "{{.Names}}"
  if ($running -ne $containerName) {
    Write-Host "Starting existing container..." -ForegroundColor Yellow
    docker start $containerName | Out-Null
  } else {
    Write-Host "Container already running." -ForegroundColor Green
  }
} else {
  Write-Host "Creating new Redis container..." -ForegroundColor Yellow
  Write-Host "Image: $image" -ForegroundColor Gray
  Write-Host "Port:  $portMapping" -ForegroundColor Gray
  docker run --name $containerName -p $portMapping -d $image --appendonly yes | Out-Null
}

# 3) Basic health check
Write-Host "Waiting for Redis to become ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
$ping = docker exec $containerName redis-cli ping 2>$null
if ($ping -ne "PONG") {
  Write-Host "Redis did not respond to PING. Check container logs with: docker logs $containerName" -ForegroundColor Red
  exit 1
}

Write-Host "Redis is responding: $ping" -ForegroundColor Green
Write-Host ""
Write-Host "Connection details:" -ForegroundColor Cyan
Write-Host ("  Name : {0}" -f $containerName) -ForegroundColor White
Write-Host ("  Port : {0}" -f $portMapping.Split(":")[0]) -ForegroundColor White
Write-Host "  URL  : redis://localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  docker logs $containerName" -ForegroundColor Gray
Write-Host "  docker stop $containerName" -ForegroundColor Gray
Write-Host "  docker start $containerName" -ForegroundColor Gray
