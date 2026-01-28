# Phase 9: Advanced Custom Tools API Documentation

## Overview

Phase 9 extends the Custom Tools system with **Database Queries** and **Webhooks**, enabling powerful workflow automation capabilities. This document provides comprehensive API documentation for all new endpoints.

---

## Base URL

```
http://localhost:4000/api/custom-tools
```

---

## Authentication

All endpoints require authentication via one of:
- **Header**: `x-user-id: <user-id>`
- **Header**: `x-workspace-id: <workspace-id>` (for workspace-scoped operations)

---

## Table of Contents

1. [Database Queries API](#database-queries-api)
2. [Webhooks API](#webhooks-api)
3. [Helper Endpoints](#helper-endpoints)
4. [Error Handling](#error-handling)
5. [Examples](#examples)

---

# Database Queries API

Execute SQL queries against PostgreSQL and MySQL databases with security, caching, and result formatting.

## Endpoints

### 1. List Database Queries

```http
GET /api/custom-tools/database-queries
```

**Query Parameters:**
- `workspaceId` (optional): Filter by workspace ID
- `isActive` (optional): Filter by active status (`true` | `false`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "toolId": "uuid",
      "workspaceId": "uuid",
      "createdBy": "uuid",
      "name": "get_customer_orders",
      "displayName": "Get Customer Orders",
      "description": "Fetch all orders for a specific customer",
      "connectionId": "uuid",
      "query": "SELECT * FROM orders WHERE customer_id = $1",
      "queryType": "SELECT",
      "parameters": [
        {
          "name": "customerId",
          "type": "string",
          "required": true
        }
      ],
      "resultFormat": "json",
      "maxRows": 10000,
      "timeout": 30000,
      "cacheEnabled": true,
      "cacheTtl": 300,
      "isActive": true,
      "executionCount": 45,
      "lastExecutedAt": "2025-01-16T12:00:00Z",
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-16T12:00:00Z"
    }
  ],
  "count": 1
}
```

---

### 2. Get Database Query by ID

```http
GET /api/custom-tools/database-queries/:id
```

**Path Parameters:**
- `id`: Database query UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "get_customer_orders",
    "displayName": "Get Customer Orders",
    "query": "SELECT * FROM orders WHERE customer_id = $1",
    "queryType": "SELECT",
    "parameters": [...],
    "resultFormat": "json",
    "cacheEnabled": true,
    ...
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Database query not found"
}
```

---

### 3. Create Database Query

```http
POST /api/custom-tools/database-queries
```

**Headers:**
- `x-user-id`: User ID (required)

**Request Body:**
```json
{
  "toolId": "uuid (optional)",
  "workspaceId": "uuid (optional)",
  "name": "get_customer_orders",
  "displayName": "Get Customer Orders",
  "description": "Fetch all orders for a specific customer",
  "connectionId": "uuid (required)",
  "query": "SELECT * FROM orders WHERE customer_id = $1",
  "queryType": "SELECT",
  "parameters": [
    {
      "name": "customerId",
      "type": "string",
      "required": true,
      "default": null
    }
  ],
  "resultFormat": "json",
  "maxRows": 10000,
  "timeout": 30000,
  "cacheEnabled": true,
  "cacheTtl": 300
}
```

**Required Fields:**
- `name`
- `displayName`
- `connectionId`
- `query`
- `queryType` (one of: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `CUSTOM`)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "get_customer_orders",
    "displayName": "Get Customer Orders",
    ...
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Missing required fields: name, displayName, connectionId, query, queryType"
}
```

---

### 4. Update Database Query

```http
PUT /api/custom-tools/database-queries/:id
```

**Path Parameters:**
- `id`: Database query UUID

**Request Body:**
All fields are optional. Only provided fields will be updated.

```json
{
  "name": "get_customer_orders_v2",
  "displayName": "Get Customer Orders (Updated)",
  "description": "Updated description",
  "query": "SELECT * FROM orders WHERE customer_id = $1 AND status = $2",
  "parameters": [
    {
      "name": "customerId",
      "type": "string",
      "required": true
    },
    {
      "name": "status",
      "type": "string",
      "required": false,
      "default": "active"
    }
  ],
  "cacheEnabled": false,
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "get_customer_orders_v2",
    ...
  }
}
```

---

### 5. Delete Database Query

```http
DELETE /api/custom-tools/database-queries/:id
```

**Path Parameters:**
- `id`: Database query UUID

**Response:**
```json
{
  "success": true,
  "message": "Database query deleted successfully"
}
```

---

### 6. Execute Database Query

```http
POST /api/custom-tools/database-queries/:id/execute
```

**Path Parameters:**
- `id`: Database query UUID

**Headers:**
- `x-user-id`: User ID (optional, for logging)
- `x-workspace-id`: Workspace ID (optional, for logging)

**Request Body:**
```json
{
  "parameters": {
    "customerId": "CUST-12345",
    "status": "active"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ORD-001",
      "customer_id": "CUST-12345",
      "status": "active",
      "total": 299.99,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "rowCount": 1,
  "durationMs": 45,
  "fromCache": false
}
```

**Response with Cache (200):**
```json
{
  "success": true,
  "data": [...],
  "rowCount": 1,
  "durationMs": 2,
  "fromCache": true
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Missing required parameter: customerId"
}
```

---

# Webhooks API

Execute HTTP webhooks with retry logic, authentication, and response validation.

## Endpoints

### 1. List Webhooks

```http
GET /api/custom-tools/webhooks
```

**Query Parameters:**
- `workspaceId` (optional): Filter by workspace ID
- `isActive` (optional): Filter by active status (`true` | `false`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "toolId": "uuid",
      "workspaceId": "uuid",
      "createdBy": "uuid",
      "name": "slack_notification",
      "displayName": "Send Slack Notification",
      "description": "Send a message to a Slack channel",
      "url": "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      },
      "payloadTemplate": "{\"text\":\"{{message}}\",\"channel\":\"{{channel}}\"}",
      "payloadType": "json",
      "authType": "none",
      "credentialId": null,
      "retryEnabled": true,
      "retryConfig": {
        "maxRetries": 3,
        "backoff": "exponential",
        "initialDelay": 1000
      },
      "timeout": 10000,
      "expectedStatus": [200, 201, 204],
      "responseSchema": null,
      "isActive": true,
      "callCount": 150,
      "lastCalledAt": "2025-01-16T12:00:00Z",
      "successCount": 148,
      "errorCount": 2,
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-16T12:00:00Z"
    }
  ],
  "count": 1
}
```

---

### 2. Get Webhook by ID

```http
GET /api/custom-tools/webhooks/:id
```

**Path Parameters:**
- `id`: Webhook UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "slack_notification",
    "displayName": "Send Slack Notification",
    "url": "https://hooks.slack.com/services/XXX/YYY/ZZZ",
    "method": "POST",
    ...
  }
}
```

---

### 3. Create Webhook

```http
POST /api/custom-tools/webhooks
```

**Headers:**
- `x-user-id`: User ID (required)

**Request Body:**
```json
{
  "toolId": "uuid (optional)",
  "workspaceId": "uuid (optional)",
  "name": "slack_notification",
  "displayName": "Send Slack Notification",
  "description": "Send a message to a Slack channel",
  "url": "https://hooks.slack.com/services/XXX/YYY/ZZZ",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "X-Custom-Header": "value"
  },
  "payloadTemplate": "{\"text\":\"{{message}}\",\"channel\":\"{{channel}}\"}",
  "payloadType": "json",
  "authType": "bearer",
  "credentialId": "uuid (optional)",
  "retryEnabled": true,
  "retryConfig": {
    "maxRetries": 3,
    "backoff": "exponential",
    "initialDelay": 1000
  },
  "timeout": 10000,
  "expectedStatus": [200, 201],
  "responseSchema": null
}
```

**Required Fields:**
- `name`
- `displayName`
- `url`
- `method` (one of: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`)

**Optional Fields:**
- `payloadType`: `json` (default), `form`, `xml`, `text`
- `authType`: `none` (default), `bearer`, `basic`, `api_key`, `oauth2`
- `retryConfig.backoff`: `exponential` (default), `linear`, `fixed`

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "slack_notification",
    ...
  }
}
```

---

### 4. Update Webhook

```http
PUT /api/custom-tools/webhooks/:id
```

**Path Parameters:**
- `id`: Webhook UUID

**Request Body:**
All fields are optional. Only provided fields will be updated.

```json
{
  "displayName": "Send Slack Notification (Updated)",
  "url": "https://hooks.slack.com/services/NEW/URL/HERE",
  "retryEnabled": false,
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "displayName": "Send Slack Notification (Updated)",
    ...
  }
}
```

---

### 5. Delete Webhook

```http
DELETE /api/custom-tools/webhooks/:id
```

**Path Parameters:**
- `id`: Webhook UUID

**Response:**
```json
{
  "success": true,
  "message": "Webhook deleted successfully"
}
```

---

### 6. Execute Webhook

```http
POST /api/custom-tools/webhooks/:id/execute
```

**Path Parameters:**
- `id`: Webhook UUID

**Headers:**
- `x-user-id`: User ID (optional, for logging)
- `x-workspace-id`: Workspace ID (optional, for logging)

**Request Body:**
```json
{
  "parameters": {
    "message": "Deployment successful!",
    "channel": "#deployments"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "ok": true,
    "ts": "1642345678.123456"
  },
  "durationMs": 245,
  "retryCount": 0
}
```

**Response with Retry (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {...},
  "durationMs": 3200,
  "retryCount": 2
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Webhook execution failed after 3 attempts: Connection timeout"
}
```

---

### 7. Test Webhook

```http
POST /api/custom-tools/webhooks/:id/test
```

**Path Parameters:**
- `id`: Webhook UUID

**Request Body:**
```json
{
  "parameters": {
    "message": "Test message",
    "channel": "#test"
  }
}
```

**Description:**
- Test endpoint that executes the webhook **without logging** to the database
- Useful for validating webhook configuration before production use

**Response:**
Same as `/execute` endpoint

---

# Helper Endpoints

### 1. List Database Connections

```http
GET /api/custom-tools/database-connections
```

**Query Parameters:**
- `workspaceId` (optional): Filter by workspace ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "production_db",
      "displayName": "Production Database",
      "dbType": "postgresql",
      "host": "db.example.com",
      "port": 5432,
      "database": "myapp_prod",
      "poolConfig": {
        "min": 2,
        "max": 10,
        "idleTimeoutMillis": 30000
      },
      "isActive": true,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "count": 1
}
```

**Note:** `encryptedConnectionString` is excluded from response for security.

---

### 2. List Credentials

```http
GET /api/custom-tools/credentials
```

**Query Parameters:**
- `workspaceId` (optional): Filter by workspace ID
- `type` (optional): Filter by credential type (`bearer`, `basic`, `api_key`, `oauth2`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "slack_token",
      "displayName": "Slack Bot Token",
      "type": "bearer",
      "workspaceId": "uuid",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "count": 1
}
```

**Note:** `encryptedData` is excluded from response for security.

---

# Error Handling

## Standard Error Response

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description (if available)"
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error, missing parameters) |
| 404 | Not Found (resource not found) |
| 500 | Internal Server Error |

---

# Examples

## Example 1: Create and Execute a Database Query

### Step 1: Create Database Query

```bash
curl -X POST http://localhost:4000/api/custom-tools/database-queries \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "name": "get_active_customers",
    "displayName": "Get Active Customers",
    "connectionId": "conn-uuid-here",
    "query": "SELECT id, name, email FROM customers WHERE status = $1",
    "queryType": "SELECT",
    "parameters": [
      {
        "name": "status",
        "type": "string",
        "required": true
      }
    ],
    "resultFormat": "json",
    "cacheEnabled": true,
    "cacheTtl": 600
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "query-uuid-123",
    "name": "get_active_customers",
    ...
  }
}
```

### Step 2: Execute Database Query

```bash
curl -X POST http://localhost:4000/api/custom-tools/database-queries/query-uuid-123/execute \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "parameters": {
      "status": "active"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "John Doe", "email": "john@example.com" },
    { "id": 2, "name": "Jane Smith", "email": "jane@example.com" }
  ],
  "rowCount": 2,
  "durationMs": 45,
  "fromCache": false
}
```

---

## Example 2: Create and Execute a Webhook

### Step 1: Create Webhook

```bash
curl -X POST http://localhost:4000/api/custom-tools/webhooks \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "name": "github_issue_create",
    "displayName": "Create GitHub Issue",
    "url": "https://api.github.com/repos/owner/repo/issues",
    "method": "POST",
    "headers": {
      "Accept": "application/vnd.github+json"
    },
    "payloadTemplate": "{\"title\":\"{{title}}\",\"body\":\"{{body}}\",\"labels\":[\"{{label}}\"]}",
    "payloadType": "json",
    "authType": "bearer",
    "credentialId": "github-token-uuid",
    "retryEnabled": true,
    "retryConfig": {
      "maxRetries": 3,
      "backoff": "exponential",
      "initialDelay": 1000
    },
    "expectedStatus": [201]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "webhook-uuid-456",
    "name": "github_issue_create",
    ...
  }
}
```

### Step 2: Test Webhook (without logging)

```bash
curl -X POST http://localhost:4000/api/custom-tools/webhooks/webhook-uuid-456/test \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "title": "Test Issue",
      "body": "This is a test issue created via API",
      "label": "test"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": 12345,
    "number": 42,
    "title": "Test Issue",
    "url": "https://github.com/owner/repo/issues/42"
  },
  "durationMs": 320,
  "retryCount": 0
}
```

### Step 3: Execute Webhook (with logging)

```bash
curl -X POST http://localhost:4000/api/custom-tools/webhooks/webhook-uuid-456/execute \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -H "x-workspace-id: workspace-123" \
  -d '{
    "parameters": {
      "title": "Production Bug",
      "body": "Critical bug in production that needs immediate attention",
      "label": "bug"
    }
  }'
```

---

## Example 3: Workflow Integration

### Using Database Query in a Workflow Node

```json
{
  "id": "node-db-query-1",
  "type": "database-query",
  "data": {
    "queryId": "query-uuid-123",
    "parameters": [
      {
        "name": "status",
        "required": true
      }
    ],
    "workspaceId": "workspace-123"
  },
  "position": { "x": 100, "y": 100 }
}
```

### Using Webhook in a Workflow Node

```json
{
  "id": "node-webhook-1",
  "type": "webhook",
  "data": {
    "webhookId": "webhook-uuid-456",
    "parameters": [
      {
        "name": "title",
        "required": true
      },
      {
        "name": "body",
        "required": true
      },
      {
        "name": "label",
        "required": false,
        "default": "automated"
      }
    ],
    "workspaceId": "workspace-123"
  },
  "position": { "x": 300, "y": 100 }
}
```

---

## Security Best Practices

1. **Database Queries:**
   - Always use parameterized queries (`$1`, `$2`, etc.) to prevent SQL injection
   - Use read-only database users for SELECT queries
   - Set appropriate `maxRows` limits to prevent excessive data retrieval
   - Enable caching for frequently executed read queries
   - Use connection pooling to prevent connection exhaustion

2. **Webhooks:**
   - Store credentials encrypted in the `credentials` table
   - Use HTTPS URLs for webhooks
   - Validate response schemas to ensure expected data structure
   - Set appropriate timeout values to prevent hanging requests
   - Use retry logic with exponential backoff for transient failures
   - Monitor webhook success/error rates via the statistics fields

3. **General:**
   - Always include `x-user-id` header for audit logging
   - Use workspace-scoped resources when possible
   - Implement rate limiting for execute endpoints (not included in Phase 9)
   - Regularly rotate credentials
   - Monitor execution logs via `toolExecutionLogs` table

---

## Performance Optimization

### Database Queries:
- **Caching:** Enable `cacheEnabled` for frequently executed SELECT queries
- **Result Limits:** Set `maxRows` to prevent retrieving excessive data
- **Timeouts:** Set appropriate `timeout` values based on query complexity
- **Connection Pooling:** Reuses connections across executions

### Webhooks:
- **Retry Logic:** Configurable with exponential/linear/fixed backoff
- **Timeouts:** Set `timeout` to prevent hanging requests
- **Parallel Execution:** Webhooks can execute in parallel in workflows

---

## Next Steps

After implementing the API:

1. **Frontend UI Enhancement** - Add visual tools for creating/editing database queries and webhooks in the ModulePalette
2. **Real-time Monitoring** - Implement WebSocket-based live execution updates
3. **Advanced Features:**
   - Scheduled database queries (cron-based)
   - Webhook signatures for security
   - Database connection pooling UI
   - Query performance analytics
   - Webhook replay functionality

---

## Support

For issues or questions:
- Check the logs: `toolExecutionLogs` table
- Monitor execution statistics: `executionCount`, `successCount`, `errorCount`
- Review error messages in API responses
- Check backend logs for detailed error stacks

---

## Changelog

### Phase 9 (2025-01-16)
- ✅ Initial implementation of Database Queries API
- ✅ Initial implementation of Webhooks API
- ✅ Connection pooling for database queries
- ✅ Retry logic with exponential backoff for webhooks
- ✅ Result caching for SELECT queries
- ✅ Multiple authentication methods (Bearer, Basic, API Key, OAuth2)
- ✅ Multiple result formats (JSON, CSV, Array)
- ✅ Usage statistics tracking
- ✅ Execution logging for audit trail
