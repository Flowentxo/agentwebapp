# Test Script for Collaboration API
# Run this after the migration is complete

Write-Host "🧪 Testing Collaboration Lab V2 API..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Start a collaboration
Write-Host "📝 Test 1: Starting collaboration..." -ForegroundColor Yellow
$body = @{
    taskDescription = "Analyze Q4 sales data and create comprehensive marketing strategy"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/collaborations/start" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "x-user-id" = "test-user"
        } `
        -Body $body

    Write-Host "✅ Collaboration started successfully!" -ForegroundColor Green
    Write-Host "   ID: $($response.collaboration.id)" -ForegroundColor Gray
    Write-Host "   Status: $($response.collaboration.status)" -ForegroundColor Gray
    Write-Host "   Selected Agents: $($response.collaboration.selectedAgents.Count)" -ForegroundColor Gray

    $collabId = $response.collaboration.id

    # Test 2: Wait a bit for mock messages to be generated
    Write-Host ""
    Write-Host "⏳ Waiting 5 seconds for messages to generate..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    # Test 3: Fetch messages
    Write-Host ""
    Write-Host "📨 Test 2: Fetching messages..." -ForegroundColor Yellow
    $messagesResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/collaborations/$collabId/messages" `
        -Method GET `
        -Headers @{
            "x-user-id" = "test-user"
        }

    Write-Host "✅ Messages fetched successfully!" -ForegroundColor Green
    Write-Host "   Total messages: $($messagesResponse.messages.Count)" -ForegroundColor Gray

    foreach ($msg in $messagesResponse.messages) {
        Write-Host "   - [$($msg.agentName)] $($msg.type): $($msg.content.Substring(0, [Math]::Min(50, $msg.content.Length)))..." -ForegroundColor Gray
    }

    # Test 4: Fetch collaboration details
    Write-Host ""
    Write-Host "📊 Test 3: Fetching collaboration details..." -ForegroundColor Yellow
    $detailsResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/collaborations/$collabId" `
        -Method GET `
        -Headers @{
            "x-user-id" = "test-user"
        }

    Write-Host "✅ Details fetched successfully!" -ForegroundColor Green
    Write-Host "   Status: $($detailsResponse.collaboration.status)" -ForegroundColor Gray
    Write-Host "   Task: $($detailsResponse.collaboration.task_description)" -ForegroundColor Gray

    # Test 5: List all collaborations
    Write-Host ""
    Write-Host "📋 Test 4: Listing all collaborations..." -ForegroundColor Yellow
    $listResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/collaborations" `
        -Method GET `
        -Headers @{
            "x-user-id" = "test-user"
        }

    Write-Host "✅ List fetched successfully!" -ForegroundColor Green
    Write-Host "   Total collaborations: $($listResponse.collaborations.Count)" -ForegroundColor Gray

    Write-Host ""
    Write-Host "🎉 All tests passed! API is working correctly." -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Open in browser:" -ForegroundColor Cyan
    Write-Host "   http://localhost:3000/agents/collaborate" -ForegroundColor Blue

} catch {
    Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception -ForegroundColor Red
}
