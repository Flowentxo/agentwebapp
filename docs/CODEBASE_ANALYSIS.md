# SINTRA Codebase Analysis Report

## Summary

The browser logs reference components that don't exist in the codebase:
- AuthContext.tsx (NOT FOUND)
- MainLayout.tsx (NOT FOUND)  
- ActivitySocketContext.tsx (NOT FOUND)
- emailWebSocket.ts (NOT FOUND)
- Opportunities component (NOT FOUND)
- Pipeline tab (NOT FOUND)

These appear to be from a legacy CRM-like application.

## Key Issues Found

### 1. Missing "Opportunities" Component
- Browser shows: "Navigate to: /opportunities"
- Result: 401 errors on `/v1/v1/opportunities/stages`
- Root Cause: Component doesn't exist in SINTRA codebase
- This is a CRM feature, not part of the AI Agent System

### 2. Double /v1/ Prefix Problem
- Configured: http://localhost:4002
- Browser shows: http://localhost:3000/v1/v1/...
- Root Cause: Likely middleware or interceptor adding /v1/ prefix

### 3. Socket.IO "Invalid namespace" Error  
- Trying to connect to: http://localhost:3000/v1
- Error: Invalid namespace
- Missing files that logs reference don't exist in codebase

### 4. 401 Unauthorized on API Calls
- Authentication cookie not being sent properly
- CORS issue between ports 3000 and 4002

## Architecture

Frontend: Port 3000 (Next.js)
Backend: Port 4002 (Node.js)
Database: PostgreSQL (Neon Cloud)
Redis: localhost:6379

Layout: Uses (app)/ route grouping with WorkspaceProvider and ShellProvider
No MainLayout component - that's from old code

## Solution

1. Clear browser cache/localStorage/sessionStorage
2. Verify both frontend (3000) and backend (4002) are running
3. Check if NEXT_PUBLIC_API_BASE_URL should be http://localhost:3000 instead
4. Review server/index.ts for actual backend setup
5. Check if there's middleware causing /v1/ prefix duplication

