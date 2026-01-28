# Admin Panel Documentation

## Overview

The SINTRA Admin Panel provides comprehensive system management, monitoring, and administration capabilities. It includes real-time system health monitoring, user management, deployment tracking, and log analysis.

**Route**: `/admin`
**Layout**: Content-Only (no secondary sidebar)
**Access**: Admin role required

---

## Features

### 1. System Overview Dashboard

Real-time monitoring of system health and performance metrics.

#### Components

**Health Cards** (4 cards with live refresh every 15 seconds):

- **CPU Auslastung**: Current CPU usage percentage with uptime display
- **Speicher**: Memory usage (used/total MB and percentage)
- **Aktive Benutzer**: Count of currently active users
- **Fehlerrate**: System error rate percentage with total requests

**Services Status Panel**:

- API, Database, Cache, Storage health indicators
- Latency metrics for each service
- Visual status icons (CheckCircle/AlertCircle)

#### Implementation Details

```typescript
// Auto-refresh every 15 seconds
useEffect(() => {
  fetchHealth();
  const interval = setInterval(fetchHealth, 15000);
  return () => clearInterval(interval);
}, []);
```

**API Endpoint**: `GET /api/health`

**Response Structure**:
```json
{
  "ok": true,
  "ts": 1234567890,
  "system": {
    "status": "operational",
    "uptime": 3600,
    "uptimeFormatted": "1h 0m",
    "cpu": { "usage": 25.5, "cores": 4 },
    "memory": { "used": 512, "total": 1024, "percentage": 50 }
  },
  "services": {
    "api": { "status": "healthy", "latency": 25 },
    "database": { "status": "healthy", "latency": 15 }
  },
  "stats": {
    "activeUsers": 42,
    "totalRequests": 10000,
    "errorRate": "1.2%"
  }
}
```

---

### 2. User Management

Full CRUD operations for system users with role-based access control.

#### Features

- **User Table**: Displays all users with name, email, role, status, last login
- **Create User**: Modal dialog with form validation
- **Edit User**: Update user details and roles
- **Delete User**: Remove users with confirmation dialog
- **Role Management**: Admin, User, Viewer roles
- **Status Control**: Active/Inactive user status

#### User Roles

| Role | Description |
|------|-------------|
| `admin` | Full system access |
| `user` | Standard user access |
| `viewer` | Read-only access |

#### API Endpoints

**Get all users**:
```
GET /api/admin/users
Response: { users: User[], ts: number }
```

**Create user**:
```
POST /api/admin/users
Body: { name: string, email: string, role: string }
Response: { user: User, ts: number }
```

**Update user**:
```
PUT /api/admin/users
Body: { id: string, name?: string, email?: string, role?: string, status?: string }
Response: { user: User, ts: number }
```

**Delete user**:
```
DELETE /api/admin/users?id={userId}
Response: { success: true, ts: number }
```

#### User Dialog Component

Modal form with fields:
- Name (required)
- Email (required, validated)
- Role (select: admin/user/viewer)
- Status (select: active/inactive, only for editing)

---

### 3. Deployments

Timeline view of deployment history with rollback and redeploy capabilities.

#### Features

- **Deployment History**: Chronological timeline of all deployments
- **Deployment Details**: Version, environment, deployer, timestamp, duration, commit
- **Status Tracking**: Success, rolled_back, in_progress
- **Health Indicators**: API, database, cache health per deployment
- **Actions**: Rollback to previous version, redeploy specific version

#### Deployment States

| Status | Badge Variant | Description |
|--------|---------------|-------------|
| `success` | success (green) | Deployment completed successfully |
| `rolled_back` | error (red) | Deployment was rolled back |
| `in_progress` | info (blue) | Deployment currently running |

#### API Endpoints

**Get deployment history**:
```
GET /api/admin/deploy
Response: { deployments: Deployment[], ts: number }
```

**Trigger new deployment**:
```
POST /api/admin/deploy
Body: { version: string, environment?: string, deployedBy?: string }
Response: { deployment: Deployment, ts: number }
```

**Rollback deployment**:
```
PUT /api/admin/deploy
Body: { deploymentId: string, reason?: string }
Response: { deployment: Deployment, ts: number }
```

#### Deployment Object Structure

```typescript
interface Deployment {
  id: string;
  version: string;
  status: 'success' | 'rolled_back' | 'in_progress';
  environment: string;
  deployedBy: string;
  deployedAt: string; // ISO timestamp
  duration: string; // e.g., "4m 32s"
  commit: string;
  commitMessage: string;
  health: {
    api: string;
    database: string;
    cache: string;
  };
  rollbackReason?: string;
}
```

---

### 4. Logs & Monitoring

Real-time log streaming with filtering and search capabilities.

#### Features

- **Log Streaming**: Displays system logs in real-time
- **Level Filtering**: Filter by info, warn, error, debug
- **Source Filtering**: Filter by api, database, cache, agent, system
- **Auto-scroll**: Logs panel with max-height and scrolling
- **Manual Refresh**: Button to fetch latest logs
- **Log Details**: Timestamp, level badge, source, message, duration

#### Log Levels

| Level | Badge Variant | Description |
|-------|---------------|-------------|
| `info` | info (blue) | Informational messages |
| `warn` | warning (yellow) | Warning messages |
| `error` | error (red) | Error messages |
| `debug` | default (gray) | Debug messages |

#### API Endpoint

```
GET /api/admin/logs?level={level}&source={source}&limit={limit}
Response: {
  logs: LogEntry[],
  ts: number,
  filters: { level: string, source: string }
}
```

#### Log Entry Structure

```typescript
interface LogEntry {
  id: string;
  timestamp: string; // ISO timestamp
  level: 'info' | 'warn' | 'error' | 'debug';
  source: 'api' | 'database' | 'cache' | 'agent' | 'system';
  message: string;
  metadata: {
    userId?: string;
    requestId: string;
    duration: string;
  };
}
```

---

## UI Components

### Custom Components Created

1. **Select** (`components/ui/select.tsx`):
   - Dropdown selector for roles, status, log filters
   - Custom implementation with Context API

2. **Table** (`components/ui/table.tsx`):
   - Semantic table structure for user list
   - Table, TableHeader, TableBody, TableRow, TableHead, TableCell

3. **Badge** (`components/ui/badge.tsx`):
   - Status indicators with color variants
   - Variants: default, success, warning, error, info

### Existing Components Used

- **Button** (`components/ui/button.tsx`): Actions and form submissions
- **Modal** (`components/ui/modal.tsx`): User create/edit dialogs
- **Input** (`components/ui/input.tsx`): Form fields
- **lucide-react icons**: Server, Users, Activity, Database, Cpu, HardDrive, etc.

---

## Styling & Design

### Design Tokens

Uses SINTRA's custom design system:

```css
--surface-0: Background for panels
--surface-1: Elevated backgrounds
--accent: Primary action color
--text: Primary text color
--text-muted: Secondary text color
```

### Panel Classes

```css
.panel: bg-[hsl(var(--surface-0))] rounded-lg border border-white/10
```

### Responsive Design

- **Desktop (≥lg)**: 4-column grid for health cards
- **Tablet (md)**: 2-column grid for health cards
- **Mobile (<md)**: Single column layout

---

## Testing

### Unit Tests (Vitest)

**Location**: `tests/unit/admin-*.spec.ts`

**Files**:
- `admin-health.spec.ts`: Health API, metrics, uptime formatting, badge rendering
- `admin-users.spec.ts`: User CRUD operations, form validation, date formatting

**Run**:
```bash
npm run test:unit -- tests/unit/admin-*.spec.ts
```

### E2E Tests (Playwright)

**Location**: `tests/ui/admin-*.spec.ts`

**Files**:
- `admin-accessibility.spec.ts`: ARIA landmarks, keyboard navigation, screen reader support
- `admin-live-update.spec.ts`: Real-time updates, CRUD operations, filter functionality

**Run**:
```bash
npx playwright test tests/ui/admin-*.spec.ts
```

### CI Workflow

**File**: `.github/workflows/admin-tests.yml`

**Jobs**:
1. `unit-tests`: Vitest unit tests
2. `e2e-tests`: Playwright E2E tests
3. `accessibility-tests`: Accessibility-focused tests
4. `live-update-tests`: Real-time update validation
5. `summary`: Aggregate test results

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`
- Changes to admin panel files, API endpoints, or test files

---

## Architecture

### File Structure

```
app/
├── (app)/
│   └── admin/
│       ├── layout.tsx          # Content-Only wrapper
│       └── page.tsx            # Main admin panel
├── api/
│   ├── health/
│   │   └── route.ts            # Health metrics endpoint
│   └── admin/
│       ├── users/
│       │   └── route.ts        # User CRUD operations
│       ├── deploy/
│       │   └── route.ts        # Deployment operations
│       └── logs/
│           └── route.ts        # Log streaming

components/ui/
├── select.tsx                   # Custom select component
├── table.tsx                    # Table components
├── badge.tsx                    # Badge component
├── button.tsx                   # Button component (existing)
├── modal.tsx                    # Modal component (existing)
└── input.tsx                    # Input component (existing)

tests/
├── unit/
│   ├── admin-health.spec.ts    # Health dashboard tests
│   └── admin-users.spec.ts     # User management tests
└── ui/
    ├── admin-accessibility.spec.ts  # Accessibility tests
    └── admin-live-update.spec.ts    # Live update tests

.github/workflows/
└── admin-tests.yml              # CI workflow
```

### Data Flow

1. **Initial Load**: Page fetches all data (health, users, deployments, logs)
2. **Auto-Refresh**: Health metrics refresh every 15 seconds
3. **User Actions**: CRUD operations trigger API calls and refetch data
4. **Log Filtering**: Filter changes trigger immediate log refetch

### State Management

Uses React hooks for local state:
- `useState` for component state
- `useEffect` for data fetching and intervals
- No global state management (lightweight, self-contained)

---

## Accessibility

### ARIA Landmarks

- `section[aria-label="System Overview"]`
- `section[aria-label="User Management"]`
- `section[aria-label="Deployments"]`
- `section[aria-label="Logs & Monitoring"]`

### Keyboard Navigation

- All buttons are keyboard accessible
- Modal dialog traps focus
- Escape key closes dialogs
- Tab navigation through forms

### Screen Reader Support

- Proper button labels (`aria-label`)
- Semantic HTML (table, th, td)
- Form labels associated with inputs
- Status announcements for updates

---

## Performance Considerations

1. **Auto-refresh Optimization**:
   - Only health metrics refresh automatically (15s)
   - Other sections fetch on demand

2. **Log Streaming**:
   - Limited to 50 entries by default
   - Filtered queries reduce payload size

3. **User Table**:
   - In-memory mock data (replace with pagination in production)

4. **Cleanup**:
   - `clearInterval` on component unmount
   - No memory leaks from intervals

---

## Future Enhancements

1. **Advanced Filtering**:
   - Date range selection for logs
   - Multi-select filters

2. **Real-time Updates**:
   - WebSocket integration for live logs
   - Server-Sent Events for health metrics

3. **Data Visualization**:
   - Charts for CPU/memory trends
   - Deployment frequency graphs

4. **Export Functionality**:
   - Export logs to CSV
   - Download deployment reports

5. **User Activity Tracking**:
   - Audit logs for admin actions
   - User activity timeline

6. **Advanced Deployment**:
   - Deployment scheduling
   - Blue-green deployment support
   - Canary releases

---

## Troubleshooting

### Issue: Health metrics not updating

**Solution**: Check browser console for network errors. Verify `/api/health` endpoint is accessible.

### Issue: User dialog not opening

**Solution**: Ensure Modal component is properly imported. Check for JavaScript errors in console.

### Issue: Logs not filtering

**Solution**: Verify filter state is updating. Check `/api/admin/logs` endpoint with query parameters.

### Issue: Auto-refresh not working

**Solution**: Ensure `useEffect` cleanup is not prematurely clearing interval. Check component lifecycle.

---

## Development

### Local Development

```bash
# Start dev server
npm run dev

# Run unit tests
npm run test:unit -- tests/unit/admin-*.spec.ts

# Run E2E tests
npx playwright test tests/ui/admin-*.spec.ts
```

### Adding New Features

1. Update API endpoint in `app/api/admin/`
2. Extend admin page component in `app/(app)/admin/page.tsx`
3. Add corresponding tests in `tests/unit/` and `tests/ui/`
4. Update this documentation

---

## Related Documentation

- [Content-Only Layouts](./ui-content-only-layouts.md)
- [SINTRA Design System](./design-system.md)
- [API Documentation](./api-reference.md)
- [Testing Guide](./testing.md)

---

**Last Updated**: 2025-10-23
**Version**: 1.0.0
**Author**: SINTRA Development Team
