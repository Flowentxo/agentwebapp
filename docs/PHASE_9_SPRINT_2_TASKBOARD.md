# Phase 9 Sprint 2: UI Enhancement - Task Board

## 🎯 Sprint Goal
Transform the powerful backend into an intuitive, drag-and-drop workflow builder with visual tools for Database Queries and Webhooks - achieving **OpenAI Agent Builder UX parity**.

**Duration:** 1-2 weeks
**Status:** 🔄 Ready to Start

---

## 📋 Sprint 2 Epics

### Epic 1: ModulePalette Enhancement
**Goal:** Add Database Query and Webhook nodes to the workflow builder palette

### Epic 2: Visual Query Builder
**Goal:** Low-code SQL query builder with visual interface

### Epic 3: Webhook Configuration UI
**Goal:** Intuitive webhook setup with template editor and parameter mapping

### Epic 4: Parameter Mapping Interface
**Goal:** Visual interface for connecting node outputs to inputs

### Epic 5: Connection Management
**Goal:** UI for managing database connections and credentials

---

## 🎫 Task Breakdown

### Epic 1: ModulePalette Enhancement (Priority: P0 - Critical)

#### Task 1.1: Create DatabaseQueryNode Component
**Status:** 🔵 To Do
**Estimate:** 2 hours
**Assignee:** -

**Description:**
Create a new node component for Database Queries in the workflow builder.

**Acceptance Criteria:**
- [ ] Component renders in ModulePalette under "Data Sources" category
- [ ] Has distinct icon (database icon from lucide-react)
- [ ] Shows query name and type (SELECT/INSERT/UPDATE/DELETE)
- [ ] Has color coding: Blue for SELECT, Green for INSERT, Orange for UPDATE, Red for DELETE
- [ ] Draggable to workflow canvas
- [ ] Node config panel shows when selected

**Files to Create:**
- `components/workflows/nodes/DatabaseQueryNode.tsx`

**Dependencies:**
- Existing ModulePalette component
- React Flow types

---

#### Task 1.2: Create WebhookNode Component
**Status:** 🔵 To Do
**Estimate:** 2 hours
**Assignee:** -

**Description:**
Create a new node component for Webhooks in the workflow builder.

**Acceptance Criteria:**
- [ ] Component renders in ModulePalette under "Actions" category
- [ ] Has distinct icon (webhook/zap icon from lucide-react)
- [ ] Shows webhook name and HTTP method (GET/POST/PUT/DELETE/PATCH)
- [ ] Has color coding by method: Blue for GET, Green for POST, Orange for PUT, Red for DELETE, Purple for PATCH
- [ ] Draggable to workflow canvas
- [ ] Node config panel shows when selected

**Files to Create:**
- `components/workflows/nodes/WebhookNode.tsx`

**Dependencies:**
- Existing ModulePalette component
- React Flow types

---

#### Task 1.3: Update ModulePalette with New Nodes
**Status:** 🔵 To Do
**Estimate:** 1 hour
**Assignee:** -

**Description:**
Integrate the new nodes into the existing ModulePalette component.

**Acceptance Criteria:**
- [ ] Database Query nodes appear in "Data Sources" section
- [ ] Webhook nodes appear in "Actions" section
- [ ] Search/filter functionality works for new nodes
- [ ] Category collapsible/expandable
- [ ] Node count badges updated

**Files to Modify:**
- `components/workflows/ModulePalette.tsx`

**Dependencies:**
- Task 1.1, Task 1.2

---

### Epic 2: Visual Query Builder (Priority: P0 - Critical)

#### Task 2.1: Database Query Configuration Panel
**Status:** 🔵 To Do
**Estimate:** 4 hours
**Assignee:** -

**Description:**
Create a configuration panel for database query nodes that appears when a node is selected.

**Acceptance Criteria:**
- [ ] Panel slides in from right side when node selected
- [ ] Shows query metadata (name, description)
- [ ] Connection selector dropdown (fetch from `/api/custom-tools/database-connections`)
- [ ] Query type selector (SELECT/INSERT/UPDATE/DELETE/CUSTOM)
- [ ] SQL editor with syntax highlighting (Monaco Editor)
- [ ] Parameter list editor (add/remove parameters)
- [ ] Result format selector (JSON/CSV/Array)
- [ ] Advanced settings (timeout, maxRows, caching)
- [ ] Save button updates node data
- [ ] Preview button shows sample results

**Files to Create:**
- `components/workflows/panels/DatabaseQueryConfigPanel.tsx`
- `components/workflows/editors/SQLEditor.tsx`
- `components/workflows/editors/ParameterListEditor.tsx`

**Dependencies:**
- Monaco Editor integration (already exists from Phase 8)
- API client for database connections

---

#### Task 2.2: Visual Query Builder (Low-Code)
**Status:** 🟡 Nice to Have
**Estimate:** 8 hours
**Assignee:** -

**Description:**
Create a visual SQL query builder for users who don't want to write SQL manually.

**Acceptance Criteria:**
- [ ] Table selector dropdown
- [ ] Column selector (multi-select with checkboxes)
- [ ] WHERE clause builder (field, operator, value)
- [ ] ORDER BY builder
- [ ] LIMIT/OFFSET controls
- [ ] Toggle between visual and code mode
- [ ] Auto-generate SQL from visual config
- [ ] Parse SQL to populate visual config (if possible)

**Files to Create:**
- `components/workflows/builders/VisualQueryBuilder.tsx`
- `components/workflows/builders/WhereClauseBuilder.tsx`

**Dependencies:**
- Task 2.1
- SQL parsing library (sql-query-builder or similar)

---

#### Task 2.3: Query Testing Interface
**Status:** 🔵 To Do
**Estimate:** 3 hours
**Assignee:** -

**Description:**
Add a testing interface to execute queries directly from the config panel.

**Acceptance Criteria:**
- [ ] "Test Query" button in config panel
- [ ] Parameter input form (auto-generated from parameter schema)
- [ ] Execute button calls `/api/custom-tools/database-queries/:id/execute`
- [ ] Shows results in table format
- [ ] Shows execution time and row count
- [ ] Shows cache status (from cache or fresh)
- [ ] Error display if query fails
- [ ] Export results (JSON/CSV)

**Files to Create:**
- `components/workflows/testing/QueryTester.tsx`
- `components/workflows/testing/ResultsTable.tsx`

**Dependencies:**
- Task 2.1

---

### Epic 3: Webhook Configuration UI (Priority: P0 - Critical)

#### Task 3.1: Webhook Configuration Panel
**Status:** 🔵 To Do
**Estimate:** 4 hours
**Assignee:** -

**Description:**
Create a configuration panel for webhook nodes.

**Acceptance Criteria:**
- [ ] Panel slides in from right side when node selected
- [ ] Webhook metadata editor (name, description)
- [ ] URL input with validation (must be valid URL)
- [ ] HTTP method selector (GET/POST/PUT/DELETE/PATCH)
- [ ] Headers editor (key-value pairs, add/remove)
- [ ] Payload template editor (Monaco Editor with JSON/XML/Text modes)
- [ ] Payload type selector (JSON/Form/XML/Text)
- [ ] Authentication selector (None/Bearer/Basic/API Key/OAuth2)
- [ ] Credential selector dropdown (fetch from `/api/custom-tools/credentials`)
- [ ] Retry configuration (enable/disable, max retries, backoff strategy)
- [ ] Timeout input
- [ ] Expected status codes (comma-separated or multi-select)
- [ ] Save button updates node data

**Files to Create:**
- `components/workflows/panels/WebhookConfigPanel.tsx`
- `components/workflows/editors/HeadersEditor.tsx`
- `components/workflows/editors/PayloadTemplateEditor.tsx`

**Dependencies:**
- Monaco Editor integration
- API client for credentials

---

#### Task 3.2: Payload Template Editor with Variable Insertion
**Status:** 🔵 To Do
**Estimate:** 3 hours
**Assignee:** -

**Description:**
Enhance payload template editor with variable insertion helpers.

**Acceptance Criteria:**
- [ ] Monaco Editor with JSON/XML syntax highlighting
- [ ] Variable picker dropdown (shows available variables from previous nodes)
- [ ] Click variable to insert `{{variableName}}` at cursor
- [ ] Syntax validation for JSON/XML payloads
- [ ] Preview mode shows rendered payload with sample data
- [ ] Template snippets (common patterns like Slack, GitHub, etc.)

**Files to Create:**
- `components/workflows/editors/VariablePicker.tsx`
- `components/workflows/editors/TemplateSnippets.tsx`

**Dependencies:**
- Task 3.1

---

#### Task 3.3: Webhook Testing Interface
**Status:** 🔵 To Do
**Estimate:** 3 hours
**Assignee:** -

**Description:**
Add a testing interface to execute webhooks directly from the config panel.

**Acceptance Criteria:**
- [ ] "Test Webhook" button in config panel
- [ ] Parameter input form (for template variables)
- [ ] Execute button calls `/api/custom-tools/webhooks/:id/test`
- [ ] Shows HTTP response (status code, headers, body)
- [ ] Shows execution time and retry count
- [ ] Error display if webhook fails
- [ ] Copy response to clipboard
- [ ] Request/response history (last 5 executions)

**Files to Create:**
- `components/workflows/testing/WebhookTester.tsx`
- `components/workflows/testing/ResponseViewer.tsx`

**Dependencies:**
- Task 3.1

---

### Epic 4: Parameter Mapping Interface (Priority: P1 - High)

#### Task 4.1: Visual Parameter Mapper
**Status:** 🔵 To Do
**Estimate:** 5 hours
**Assignee:** -

**Description:**
Create a visual interface for mapping outputs from one node to inputs of another.

**Acceptance Criteria:**
- [ ] Shows available outputs from previous nodes
- [ ] Shows required inputs for current node
- [ ] Drag-and-drop to create mappings
- [ ] Visual lines showing connections between outputs and inputs
- [ ] Type validation (string to string, number to number, etc.)
- [ ] Expression editor for transformations (e.g., `{{node1.output}} + " suffix"`)
- [ ] Clear mapping button
- [ ] Auto-suggest mappings based on name similarity

**Files to Create:**
- `components/workflows/mappers/ParameterMapper.tsx`
- `components/workflows/mappers/MappingLine.tsx`
- `components/workflows/mappers/ExpressionEditor.tsx`

**Dependencies:**
- React Flow edge handling

---

#### Task 4.2: Data Preview for Mappings
**Status:** 🟡 Nice to Have
**Estimate:** 3 hours
**Assignee:** -

**Description:**
Show preview of data that will be passed between nodes.

**Acceptance Criteria:**
- [ ] Shows sample data from source node
- [ ] Shows how data will be transformed
- [ ] Shows final data that will be sent to target node
- [ ] Highlights missing required parameters
- [ ] Highlights type mismatches
- [ ] Real-time preview as user edits mappings

**Files to Create:**
- `components/workflows/mappers/DataPreview.tsx`

**Dependencies:**
- Task 4.1

---

### Epic 5: Connection Management UI (Priority: P1 - High)

#### Task 5.1: Database Connections Manager
**Status:** 🔵 To Do
**Estimate:** 4 hours
**Assignee:** -

**Description:**
Create a UI for managing database connections.

**Acceptance Criteria:**
- [ ] List all database connections (fetch from `/api/custom-tools/database-connections`)
- [ ] Add new connection button opens modal
- [ ] Connection form (name, type, host, port, database, username, password)
- [ ] Test connection button validates connection
- [ ] Edit connection updates existing connection
- [ ] Delete connection (with confirmation)
- [ ] Connection status indicator (active/inactive)
- [ ] Pool configuration (min, max, idle timeout)

**Files to Create:**
- `components/settings/DatabaseConnectionsManager.tsx`
- `components/settings/ConnectionForm.tsx`
- `components/settings/ConnectionTestButton.tsx`

**Dependencies:**
- API endpoints for database connections (already exist as helper endpoints)

---

#### Task 5.2: Credentials Manager
**Status:** 🔵 To Do
**Estimate:** 4 hours
**Assignee:** -

**Description:**
Create a UI for managing authentication credentials.

**Acceptance Criteria:**
- [ ] List all credentials (fetch from `/api/custom-tools/credentials`)
- [ ] Add new credential button opens modal
- [ ] Credential form varies by type:
  - Bearer: token input
  - Basic: username + password
  - API Key: key input + location (header/query) + name
  - OAuth2: access token + refresh token + expiry
- [ ] Edit credential updates existing credential
- [ ] Delete credential (with confirmation)
- [ ] Credential masking (show only last 4 characters)
- [ ] Test credential button (if applicable)

**Files to Create:**
- `components/settings/CredentialsManager.tsx`
- `components/settings/CredentialForm.tsx`

**Dependencies:**
- API endpoints for credentials (already exist as helper endpoints)

---

### Epic 6: Integration & Testing (Priority: P0 - Critical)

#### Task 6.1: Integrate Nodes into Workflow Canvas
**Status:** 🔵 To Do
**Estimate:** 2 hours
**Assignee:** -

**Description:**
Ensure new nodes work seamlessly with existing workflow canvas.

**Acceptance Criteria:**
- [ ] Database Query nodes can be added to canvas
- [ ] Webhook nodes can be added to canvas
- [ ] Nodes can be connected to other nodes
- [ ] Edges show data flow
- [ ] Delete node functionality works
- [ ] Duplicate node functionality works
- [ ] Undo/redo works for node operations

**Files to Modify:**
- `components/workflows/VisualCanvas.tsx`

**Dependencies:**
- All node components from Epic 1

---

#### Task 6.2: Workflow Execution with New Nodes
**Status:** 🔵 To Do
**Estimate:** 3 hours
**Assignee:** -

**Description:**
Ensure workflows with database query and webhook nodes execute correctly.

**Acceptance Criteria:**
- [ ] Execute button triggers workflow with new nodes
- [ ] Database query nodes execute and pass results to next nodes
- [ ] Webhook nodes execute and pass results to next nodes
- [ ] Error handling shows node-specific errors
- [ ] Execution logs show query/webhook details
- [ ] Retry logic visible in UI (for webhooks)
- [ ] Caching indicator shown (for queries)

**Files to Modify:**
- Workflow execution logic (if needed)

**Dependencies:**
- Backend executors (already implemented in Sprint 1)

---

#### Task 6.3: End-to-End Testing
**Status:** 🔵 To Do
**Estimate:** 4 hours
**Assignee:** -

**Description:**
Test complete workflows from creation to execution.

**Test Cases:**
1. **Database Query Workflow:**
   - [ ] Create database connection
   - [ ] Create database query node
   - [ ] Configure query with parameters
   - [ ] Test query execution
   - [ ] Add to workflow
   - [ ] Connect to webhook node
   - [ ] Execute workflow end-to-end

2. **Webhook Workflow:**
   - [ ] Create credential
   - [ ] Create webhook node
   - [ ] Configure webhook with auth
   - [ ] Test webhook execution
   - [ ] Add to workflow
   - [ ] Connect to output node
   - [ ] Execute workflow end-to-end

3. **Complex Multi-Node Workflow:**
   - [ ] Trigger → Database Query → Webhook → Output
   - [ ] Parameter mapping between nodes
   - [ ] Error handling at each step
   - [ ] Result visualization

**Dependencies:**
- All tasks in Sprint 2

---

## 📊 Sprint 2 Metrics

### Velocity Estimate:
- **Total Tasks:** 18
- **Total Estimate:** ~52 hours
- **Sprint Duration:** 1-2 weeks
- **Team Size:** 1-2 developers

### Task Breakdown by Priority:
- **P0 (Critical):** 11 tasks (~38 hours)
- **P1 (High):** 4 tasks (~11 hours)
- **Nice to Have:** 3 tasks (~11 hours)

### Task Breakdown by Epic:
- **Epic 1:** 3 tasks (5 hours)
- **Epic 2:** 3 tasks (15 hours)
- **Epic 3:** 3 tasks (10 hours)
- **Epic 4:** 2 tasks (8 hours)
- **Epic 5:** 2 tasks (8 hours)
- **Epic 6:** 3 tasks (9 hours)

---

## 🎯 Sprint 2 Goals

### Must Have (Sprint Goal):
- ✅ Database Query nodes in ModulePalette
- ✅ Webhook nodes in ModulePalette
- ✅ Configuration panels for both node types
- ✅ Testing interfaces for queries and webhooks
- ✅ Basic parameter mapping
- ✅ Workflow execution with new nodes

### Should Have:
- ✅ Connection management UI
- ✅ Credentials management UI
- ✅ Visual parameter mapper
- ✅ Advanced query/webhook settings

### Nice to Have:
- ⚪ Visual query builder (low-code)
- ⚪ Data preview for mappings
- ⚪ Template snippets for webhooks

---

## 🚀 Sprint Start Checklist

- [x] Backend APIs tested and working
- [x] Documentation reviewed
- [ ] UI design mockups created
- [ ] Component library chosen (shadcn/ui already in use)
- [ ] State management strategy defined (React Context or Zustand)
- [ ] Testing strategy defined (Jest + React Testing Library)

---

## 📋 Daily Standup Template

**What did I do yesterday?**
- Task ID and description

**What will I do today?**
- Task ID and description

**Any blockers?**
- Description of blocker

---

## 🎓 Definition of Done

A task is considered "Done" when:
- [ ] Code is written and follows project conventions
- [ ] Component is responsive and accessible
- [ ] All acceptance criteria are met
- [ ] Manual testing completed
- [ ] Code reviewed (if applicable)
- [ ] Merged to main branch
- [ ] Documentation updated (if applicable)

---

## 🔄 Sprint Ceremonies

### Sprint Planning (Day 1)
- Review sprint goal
- Assign tasks to team members
- Estimate remaining tasks
- Identify dependencies

### Daily Standup (Daily, 15 min)
- Each team member shares progress
- Identify blockers
- Adjust task assignments if needed

### Sprint Review (Last Day)
- Demo completed features
- Get feedback from stakeholders
- Review what was completed vs. planned

### Sprint Retrospective (Last Day)
- What went well?
- What could be improved?
- Action items for next sprint

---

## 🎯 Success Criteria

Sprint 2 is successful if:
1. ✅ Users can add Database Query nodes to workflows
2. ✅ Users can add Webhook nodes to workflows
3. ✅ Users can configure nodes without writing code (low-code)
4. ✅ Users can test queries and webhooks before adding to workflow
5. ✅ Users can execute workflows with new nodes
6. ✅ Users can manage database connections
7. ✅ Users can manage credentials securely
8. ✅ UI is intuitive and matches OpenAI Agent Builder UX quality

---

## 📚 Resources

### Design References:
- **OpenAI Agent Builder:** https://platform.openai.com/docs/assistants/tools
- **Zapier UI:** https://zapier.com/app/editor
- **n8n UI:** https://n8n.io
- **React Flow Examples:** https://reactflow.dev/examples

### Component Libraries:
- **shadcn/ui:** Already in use
- **lucide-react:** Icons
- **Monaco Editor:** Code editor (already integrated)
- **React Flow:** Workflow canvas (already integrated)

### State Management:
- **React Context** or **Zustand** (decide in sprint planning)

---

## 🏁 Next Steps After Sprint 2

### Sprint 3: Real-time Monitoring
- WebSocket-based execution tracking
- Live progress indicators
- Error notifications
- Performance dashboard

### Sprint 4: Advanced Features
- Scheduled queries (cron)
- Webhook signatures
- Query analytics
- Workflow templates
- Community/marketplace features

---

**Ready to start Sprint 2! 🚀**

Use this task board to track progress. Update task statuses daily during standup.
