# FLOWENT INBOX v2 - UMFASSENDE TECHNISCHE ANALYSE

**Erstellt am:** 2026-01-02
**Aktualisiert:** 2026-01-04
**Version:** 2.1.0
**System:** Flowent AI Agent Platform

---

## INHALTSVERZEICHNIS

1. [Executive Summary](#1-executive-summary)
2. [Frontend-Architektur](#2-frontend-architektur)
3. [State Management](#3-state-management)
4. [Backend-Architektur](#4-backend-architektur)
5. [Datenbank-Schema](#5-datenbank-schema)
6. [Socket.IO Real-Time Integration](#6-socketio-real-time-integration)
7. [API-Schnittstellen](#7-api-schnittstellen)
8. [Datenfluss-Diagramme](#8-datenfluss-diagramme)
9. [Sicherheit & Authentifizierung](#9-sicherheit--authentifizierung)
10. [Performance-Optimierungen](#10-performance-optimierungen)
11. [Tool Action System (HITL)](#11-tool-action-system-hitl)
12. [Keyboard Shortcuts](#12-keyboard-shortcuts)
13. [Bekannte Limitierungen](#13-bekannte-limitierungen)
14. [Verbesserungsvorschläge](#14-verbesserungsvorschläge)
15. [Zusammenfassung](#15-zusammenfassung)

---

## 1. EXECUTIVE SUMMARY

Die **Flowent Inbox v2** ist ein Enterprise-grade Kommunikationssystem für die AI-Agent-Orchestrierung. Es ermöglicht Benutzern:

- **Thread-basierte Konversationen** mit KI-Agenten
- **Human-in-the-Loop (HITL) Approvals** für kritische Workflows
- **Echtzeit-Updates** via Socket.IO
- **Artefakt-Management** (Code, Markdown, E-Mail-Entwürfe, Datentabellen)
- **Multi-Agent-Handoffs** mit System-Events

### Technologie-Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend Framework | Next.js 14 (App Router) |
| State Management | Zustand + React Query |
| Real-Time | Socket.IO Client |
| Styling | Tailwind CSS |
| Backend | Node.js / Express |
| Datenbank | PostgreSQL (Drizzle ORM) |
| Echtzeit-Server | Socket.IO Server |

---

## 2. FRONTEND-ARCHITEKTUR

### 2.1 Verzeichnisstruktur

```
app/(app)/(dashboard)/inbox/
├── page.tsx                      # Empty State / Welcome View
├── layout.tsx                    # 3-Pane Layout mit Shortcuts
├── [threadId]/
│   └── page.tsx                  # Thread-Chat-Seite
└── components/
    ├── InboxSidebar.tsx          # Navigation & Filter
    ├── ThreadList.tsx            # Thread-Übersicht
    ├── artifacts/
    │   ├── ArtifactPanel.tsx     # Split-View Editor
    │   ├── ArtifactBlock.tsx     # Inline-Artefakt-Anzeige
    │   └── viewers/
    │       ├── CodeViewer.tsx    # Syntax-Highlighting
    │       └── DocumentViewer.tsx # Markdown-Rendering
    └── chat/
        ├── ChatStream.tsx        # Nachrichten-Container
        ├── Composer.tsx          # Eingabefeld
        ├── MessageBubble.tsx     # Text-Nachrichten
        ├── DecisionCard.tsx      # HITL Approval-Widget
        └── SystemMessage.tsx     # System-Events
```

### 2.2 Komponenten-Hierarchie

```
InboxLayout
├── InboxSidebar (Pane 1 - 240px)
│   ├── Search Input
│   ├── Focus Filters (All, Approvals, Mentions, Unread)
│   └── Agent List
├── ThreadList (Pane 2 - 320px)
│   ├── Thread Items
│   │   ├── Agent Avatar
│   │   ├── Subject & Preview
│   │   ├── Status Badge
│   │   └── Unread Indicator
│   └── Loading/Error States
└── Main Content (Pane 3 - flex)
    ├── ThreadChatPage
    │   ├── Thread Header
    │   │   ├── Agent Info
    │   │   ├── Status Badge
    │   │   └── Action Buttons
    │   ├── Approval Banner (conditional)
    │   ├── ChatStream
    │   │   ├── Date Dividers
    │   │   ├── MessageBubble (text)
    │   │   ├── DecisionCard (approval_request)
    │   │   ├── ArtifactBlock (artifact)
    │   │   ├── SystemMessage (system_event)
    │   │   └── Typing Indicator
    │   └── Composer
    └── ArtifactPanel (45% width, conditional)
        ├── Header (Title, Actions)
        ├── Content Viewer
        └── Footer (Save Button)
```

### 2.3 Komponenten-Beschreibungen

#### **InboxLayout** (`layout.tsx`)
- Verwaltet das 3-Pane-Layout
- Mobile-responsive mit Toggle-Button
- Initialisiert globale Keyboard-Shortcuts
- Z-Index-Management für Overlays

#### **InboxSidebar** (`InboxSidebar.tsx`)
- Filter-Navigation (All, Approvals, Mentions, Unread)
- Suchfeld mit Echtzeit-Filterung
- Agent-Liste mit Online-Status
- Berechnet Counts aus Thread-Daten via React Query

#### **ThreadList** (`ThreadList.tsx`)
- Lädt Threads via `useThreads()` Hook
- Lokale Filterung nach activeFilter und searchQuery
- Sortierung: Suspended first, dann nach lastMessageAt
- Skeleton-Loading für bessere UX
- Error-State mit Retry-Button

#### **ChatStream** (`ChatStream.tsx`)
- Lädt Nachrichten via `useThreadMessages(threadId)`
- Gruppiert Nachrichten nach Datum
- Rendert verschiedene Message-Typen:
  - `text` → MessageBubble
  - `approval_request` → DecisionCard
  - `artifact` → ArtifactBlock
  - `system_event` → SystemMessage
- Auto-Scroll bei neuen Nachrichten
- Typing-Indicator-Anzeige

#### **DecisionCard** (`DecisionCard.tsx`)
- HITL Approval-Interface
- Zeigt Approval-Details (Cost, Tokens, Expiration)
- Expandable Preview-Daten
- Approve/Reject-Buttons mit Loading-States
- Status-abhängiges Styling (pending, approved, rejected, expired)

#### **ArtifactPanel** (`ArtifactPanel.tsx`)
- Split-View Editor (45% Breite auf Desktop)
- Lazy-Loading von Artifact-Content via `useArtifact()`
- Unterstützt: Code, Markdown, Email-Draft, JSON, HTML
- Speichern/Revert-Funktionalität
- Fullscreen-Modus
- Download-Option
- Keyboard-Shortcuts (Esc, Cmd+S)

---

## 3. STATE MANAGEMENT

### 3.1 Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                    State Management                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────┐      ┌─────────────────────────┐   │
│  │   Zustand       │      │    React Query          │   │
│  │   (UI State)    │      │    (Server State)       │   │
│  ├─────────────────┤      ├─────────────────────────┤   │
│  │ • activeFilter  │      │ • threads               │   │
│  │ • selectedId    │      │ • messages              │   │
│  │ • sidebarOpen   │      │ • artifacts             │   │
│  │ • searchQuery   │      │ • mutations             │   │
│  │ • artifactState │      │                         │   │
│  └─────────────────┘      └─────────────────────────┘   │
│           │                          │                   │
│           └──────────┬───────────────┘                   │
│                      ▼                                   │
│              ┌──────────────┐                            │
│              │  Components  │                            │
│              └──────────────┘                            │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Zustand Store (`useInboxStore.ts`)

```typescript
interface InboxState {
  // UI State
  activeFilter: InboxFilter;        // 'all' | 'mentions' | 'approvals' | 'unread'
  selectedThreadId: string | null;
  isSidebarOpen: boolean;
  searchQuery: string;
  agents: InboxAgent[];             // Statische Agent-Konfiguration

  // Artifact State
  activeArtifact: Artifact | null;
  activeArtifactId: string | null;  // Für Lazy Loading
  isArtifactPanelOpen: boolean;

  // Actions
  setFilter: (filter: InboxFilter) => void;
  setSelectedThread: (threadId: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  openArtifact: (artifact: Artifact) => void;
  openArtifactById: (artifactId: string) => void;
  setActiveArtifact: (artifact: Artifact | null) => void;
  closeArtifact: () => void;
  updateArtifactContent: (content: string) => void;
}
```

**Persistierung:**
- Nur `activeFilter` und `isSidebarOpen` werden in localStorage gespeichert
- Storage-Key: `flowent-inbox-store`

### 3.3 React Query Hooks (`useInbox.ts`)

#### Query Keys Struktur
```typescript
const inboxKeys = {
  all: ['inbox'],
  threads: () => [...inboxKeys.all, 'threads'],
  thread: (id: string) => [...inboxKeys.threads(), id],
  messages: (threadId: string) => [...inboxKeys.thread(threadId), 'messages'],
  artifacts: (threadId: string) => [...inboxKeys.thread(threadId), 'artifacts'],
  artifact: (id: string) => [...inboxKeys.all, 'artifact', id],
};
```

#### Verfügbare Hooks

| Hook | Zweck | Cache TTL |
|------|-------|-----------|
| `useThreads()` | Alle Threads laden | 30s |
| `useThreadMessages(threadId)` | Nachrichten für Thread | 10s |
| `useTypingIndicator(threadId)` | Typing-Status | - |
| `useArtifacts(threadId)` | Artefakt-Liste (lightweight) | 60s |
| `useArtifact(artifactId)` | Vollständiges Artefakt | 300s |
| `useSendMessage(threadId)` | Nachricht senden | - |
| `useApproveWorkflow(threadId)` | Approval durchführen | - |
| `useRejectWorkflow(threadId)` | Approval ablehnen | - |
| `useMarkAsRead()` | Thread als gelesen markieren | - |
| `useUpdateArtifact()` | Artefakt aktualisieren | - |

#### Optimistische Updates

```typescript
// Beispiel: useSendMessage
onMutate: async (content) => {
  // 1. Laufende Queries abbrechen
  await queryClient.cancelQueries({ queryKey: inboxKeys.messages(threadId) });

  // 2. Vorherigen State speichern
  const previousMessages = queryClient.getQueryData(inboxKeys.messages(threadId));

  // 3. Optimistische Nachricht einfügen
  const optimisticMessage = {
    id: `optimistic-${Date.now()}`,
    content,
    role: 'user',
    isOptimistic: true,
    // ...
  };

  queryClient.setQueryData(inboxKeys.messages(threadId),
    old => [...old, optimisticMessage]
  );

  return { previousMessages, optimisticMessage };
},

onError: (err, content, context) => {
  // Rollback bei Fehler
  queryClient.setQueryData(inboxKeys.messages(threadId), context.previousMessages);
},

onSuccess: (newMessage, content, context) => {
  // Optimistische Nachricht durch echte ersetzen
  queryClient.setQueryData(inboxKeys.messages(threadId), old =>
    old.map(msg => msg.id === context.optimisticMessage.id ? newMessage : msg)
  );
}
```

---

## 4. BACKEND-ARCHITEKTUR

### 4.1 API-Struktur

```
server/
├── index.ts                    # Express Server Entry
├── socket.ts                   # Socket.IO Setup
├── routes/
│   └── inbox.ts                # Inbox API Routes
└── services/
    ├── InboxService.ts         # Business Logic
    └── NotificationService.ts  # Socket Broadcasts

lib/db/
├── schema-inbox.ts             # Drizzle Schema
├── connection.ts               # DB Connection
└── migrations/
    └── xxxx_inbox_tables.sql
```

### 4.2 Service Layer

```typescript
// InboxService.ts (konzeptionell)
class InboxService {
  // Thread Operations
  async getThreadsForUser(userId: string, options?: ThreadQueryOptions): Promise<Thread[]>
  async getThreadById(threadId: string): Promise<Thread | null>
  async createThread(data: CreateThreadInput): Promise<Thread>
  async updateThread(threadId: string, data: UpdateThreadInput): Promise<Thread>

  // Message Operations
  async getMessagesForThread(threadId: string): Promise<InboxMessage[]>
  async createMessage(data: CreateMessageInput): Promise<InboxMessage>
  async markThreadAsRead(threadId: string, userId: string): Promise<void>

  // Artifact Operations
  async getArtifactsForThread(threadId: string): Promise<ArtifactSummary[]>
  async getArtifactById(artifactId: string): Promise<Artifact | null>
  async createArtifact(data: CreateArtifactInput): Promise<Artifact>
  async updateArtifact(artifactId: string, data: UpdateArtifactInput): Promise<Artifact>

  // Approval Operations
  async approveWorkflow(approvalId: string, userId: string): Promise<InboxApproval>
  async rejectWorkflow(approvalId: string, userId: string, comment?: string): Promise<InboxApproval>
}
```

---

## 5. DATENBANK-SCHEMA

### 5.1 Enums

```sql
-- Thread-Status
CREATE TYPE thread_status AS ENUM ('active', 'suspended', 'completed', 'archived');

-- Priorität
CREATE TYPE thread_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Nachrichtentyp
CREATE TYPE inbox_message_type AS ENUM ('text', 'approval_request', 'system_event', 'artifact');

-- Rollen
CREATE TYPE message_role AS ENUM ('user', 'agent', 'system');

-- Artefakt-Typen
CREATE TYPE artifact_type AS ENUM ('code', 'markdown', 'email_draft', 'data_table', 'json', 'html');

-- Approval-Aktion
CREATE TYPE approval_action_type AS ENUM (
  'send_email', 'external_api_call', 'database_write',
  'file_operation', 'budget_spend', 'other'
);

-- Approval-Status
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
```

### 5.2 Tabellen

#### **inbox_threads**
```sql
CREATE TABLE inbox_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  workspace_id UUID,
  subject VARCHAR(500) NOT NULL,
  preview TEXT,
  agent_id VARCHAR(50) NOT NULL,
  agent_name VARCHAR(100) NOT NULL,
  status thread_status DEFAULT 'active',
  priority thread_priority DEFAULT 'medium',
  unread_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  pending_approval_id UUID,
  metadata JSONB DEFAULT '{}',
  last_message_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indizes
CREATE INDEX idx_threads_user_id ON inbox_threads(user_id);
CREATE INDEX idx_threads_status ON inbox_threads(status);
CREATE INDEX idx_threads_last_message ON inbox_threads(last_message_at DESC);
CREATE INDEX idx_threads_user_status ON inbox_threads(user_id, status);
```

#### **inbox_messages**
```sql
CREATE TABLE inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES inbox_threads(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  type inbox_message_type DEFAULT 'text',
  content TEXT NOT NULL,
  agent_id VARCHAR(50),
  agent_name VARCHAR(100),
  artifact_id UUID,
  approval JSONB,
  metadata JSONB DEFAULT '{}',
  is_streaming BOOLEAN DEFAULT false,
  is_optimistic BOOLEAN DEFAULT false,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indizes
CREATE INDEX idx_messages_thread_id ON inbox_messages(thread_id);
CREATE INDEX idx_messages_timestamp ON inbox_messages(timestamp);
CREATE INDEX idx_messages_thread_timestamp ON inbox_messages(thread_id, timestamp);
```

#### **artifacts**
```sql
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES inbox_threads(id) ON DELETE SET NULL,
  message_id UUID REFERENCES inbox_messages(id) ON DELETE SET NULL,
  workflow_execution_id UUID,
  type artifact_type NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  language VARCHAR(50),
  version INTEGER DEFAULT 1,
  parent_artifact_id UUID,
  metadata JSONB DEFAULT '{}',
  user_id VARCHAR(255) NOT NULL,
  workspace_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indizes
CREATE INDEX idx_artifacts_thread_id ON artifacts(thread_id);
CREATE INDEX idx_artifacts_user_id ON artifacts(user_id);
CREATE INDEX idx_artifacts_type ON artifacts(type);
```

#### **inbox_approvals**
```sql
CREATE TABLE inbox_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES inbox_threads(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES inbox_messages(id) ON DELETE CASCADE,
  action_type approval_action_type NOT NULL,
  status approval_status DEFAULT 'pending',
  estimated_cost INTEGER,           -- Micro-Dollars
  estimated_tokens INTEGER,
  payload JSONB NOT NULL,
  preview_data TEXT,
  resolved_by VARCHAR(255),
  resolved_at TIMESTAMP,
  comment TEXT,
  expires_at TIMESTAMP,
  workflow_execution_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indizes
CREATE INDEX idx_approvals_thread_id ON inbox_approvals(thread_id);
CREATE INDEX idx_approvals_status ON inbox_approvals(status);
CREATE INDEX idx_approvals_expires_at ON inbox_approvals(expires_at);
```

### 5.3 Entity-Relationship-Diagramm

```
┌─────────────────┐       ┌─────────────────┐
│  inbox_threads  │───1:N─│ inbox_messages  │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ user_id         │       │ thread_id (FK)  │
│ subject         │       │ role            │
│ status          │       │ type            │
│ agent_id        │       │ content         │
│ unread_count    │       │ artifact_id     │
│ pending_approval│       │ approval (JSON) │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │1:N                      │1:1
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│ inbox_approvals │       │   artifacts     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ thread_id (FK)  │       │ thread_id (FK)  │
│ message_id (FK) │       │ message_id (FK) │
│ action_type     │       │ type            │
│ status          │       │ title           │
│ payload (JSON)  │       │ content         │
│ resolved_by     │       │ version         │
└─────────────────┘       └─────────────────┘
```

---

## 6. SOCKET.IO REAL-TIME INTEGRATION

### 6.1 Verbindungskonfiguration

```typescript
// Client-Konfiguration
const socket = io('http://localhost:4000/inbox', {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
```

### 6.2 Event-Übersicht

#### Client → Server Events

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `thread:join` | `{ threadId }` | Thread-Room beitreten |
| `thread:leave` | `{ threadId }` | Thread-Room verlassen |
| `inbox:subscribe` | `userId` | Inbox-Updates abonnieren |
| `inbox:unsubscribe` | `userId` | Abonnement beenden |
| `typing:start` | `TypingIndicator` | Eingabe-Status senden |
| `typing:stop` | `TypingIndicator` | Eingabe-Status beenden |

#### Server → Client Events

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `message:new` | `InboxMessage` | Neue Nachricht |
| `message:stream` | `{ messageId, content }` | Streaming-Chunk |
| `message:complete` | `messageId` | Streaming abgeschlossen |
| `approval:update` | `ApprovalUpdate` | Approval-Status geändert |
| `artifact:created` | `{ id, type, title }` | Neues Artefakt |
| `system:event` | `SystemEvent` | System-Event |
| `thread:update` | `Partial<Thread>` | Thread aktualisiert |
| `typing:start` | `TypingIndicator` | Agent tippt |
| `typing:stop` | `TypingIndicator` | Agent fertig |

### 6.3 Room-Struktur

```
Socket.IO Namespace: /inbox
│
├── Room: user:{userId}          # User-spezifische Updates
│   └── Events: thread:update, approval:update
│
└── Room: thread:{threadId}      # Thread-spezifische Updates
    └── Events: message:new, message:stream, typing:*, artifact:created
```

### 6.4 Cache-Invalidierung bei Socket-Events

```typescript
// useThreadMessages Hook
socket.on('message:new', (message) => {
  queryClient.setQueryData(inboxKeys.messages(threadId), old => {
    if (old.some(m => m.id === message.id)) return old; // Duplikat-Check
    return [...old, message];
  });
});

socket.on('approval:update', (data) => {
  // Message-Cache aktualisieren
  queryClient.setQueryData(inboxKeys.messages(threadId), old =>
    old.map(msg =>
      msg.approval?.approvalId === data.approvalId
        ? { ...msg, approval: { ...msg.approval, ...data } }
        : msg
    )
  );
  // Thread-Liste invalidieren
  queryClient.invalidateQueries({ queryKey: inboxKeys.threads() });
});
```

---

## 7. API-SCHNITTSTELLEN

### 7.1 Endpunkt-Übersicht

**Base URL:** `http://localhost:4000/api/inbox`

#### Thread-Operationen

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/threads` | Alle Threads abrufen |
| GET | `/threads/:threadId` | Thread mit Nachrichten |
| POST | `/threads/:threadId/messages` | Nachricht senden |
| POST | `/threads/:threadId/mark-read` | Als gelesen markieren |

#### Artefakt-Operationen

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/artifacts/:threadId` | Artefakt-Liste (ohne Content) |
| GET | `/artifacts/item/:artifactId` | Vollständiges Artefakt |
| POST | `/artifacts` | Artefakt erstellen |
| PUT | `/artifacts/:artifactId` | Artefakt aktualisieren |
| DELETE | `/artifacts/:artifactId` | Artefakt löschen |

#### Approval-Operationen

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| POST | `/approvals/:approvalId/approve` | Approval durchführen |
| POST | `/approvals/:approvalId/reject` | Approval ablehnen |

### 7.2 Request/Response-Beispiele

#### GET /threads
```json
// Response
{
  "success": true,
  "threads": [
    {
      "id": "uuid",
      "subject": "Q4 Revenue Analysis",
      "preview": "Let me analyze the data...",
      "agentId": "dexter",
      "agentName": "Dexter",
      "status": "active",
      "priority": "medium",
      "unreadCount": 2,
      "messageCount": 15,
      "metadata": {
        "tags": ["finance", "q4"],
        "workflowId": "workflow-123"
      },
      "lastMessageAt": "2026-01-02T10:30:00Z",
      "createdAt": "2026-01-01T09:00:00Z"
    }
  ],
  "count": 1
}
```

#### POST /threads/:threadId/messages
```json
// Request
{
  "content": "Please analyze the Q4 data",
  "type": "text",
  "role": "user"
}

// Response
{
  "success": true,
  "message": {
    "id": "uuid",
    "threadId": "thread-uuid",
    "role": "user",
    "type": "text",
    "content": "Please analyze the Q4 data",
    "timestamp": "2026-01-02T10:35:00Z",
    "createdAt": "2026-01-02T10:35:00Z"
  }
}
```

#### POST /approvals/:approvalId/approve
```json
// Response
{
  "success": true,
  "approval": {
    "id": "approval-uuid",
    "status": "approved",
    "resolvedBy": "user-123",
    "resolvedAt": "2026-01-02T10:40:00Z"
  }
}
```

---

## 8. DATENFLUSS-DIAGRAMME

### 8.1 Nachricht senden

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Composer   │────▶│ useSendMessage│────▶│   API POST   │
│  (User Input)│     │   (Mutation)  │     │  /messages   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                     │
                            ▼                     ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  Optimistic  │     │   Database   │
                     │   Update     │     │    Insert    │
                     └──────────────┘     └──────────────┘
                            │                     │
                            ▼                     ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  ChatStream  │◀────│  Socket.IO   │
                     │   renders    │     │ message:new  │
                     └──────────────┘     └──────────────┘
```

### 8.2 Approval-Workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Agent      │────▶│  Create      │────▶│   Database   │
│  (Backend)   │     │  Approval    │     │   Insert     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Socket.IO   │
                     │ message:new  │
                     │ (type=approval)│
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ DecisionCard │
                     │   renders    │
                     └──────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
       ┌──────────────┐           ┌──────────────┐
       │   Approve    │           │    Reject    │
       │   Button     │           │    Button    │
       └──────────────┘           └──────────────┘
              │                           │
              ▼                           ▼
       ┌──────────────┐           ┌──────────────┐
       │  API POST    │           │  API POST    │
       │  /approve    │           │  /reject     │
       └──────────────┘           └──────────────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
                     ┌──────────────┐
                     │  Socket.IO   │
                     │approval:update│
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ DecisionCard │
                     │  Status UI   │
                     └──────────────┘
```

### 8.3 Artefakt Lazy Loading

```
┌──────────────┐     ┌──────────────┐
│ ArtifactBlock│────▶│openArtifactById│
│   (Click)    │     │   (Store)    │
└──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ArtifactPanel │
                     │   opens      │
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ useArtifact  │
                     │   (Query)    │
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  API GET     │
                     │/artifacts/item│
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Content    │
                     │   Viewer     │
                     └──────────────┘
```

---

## 9. SICHERHEIT & AUTHENTIFIZIERUNG

### 9.1 Authentifizierung

| Aspekt | Implementierung |
|--------|-----------------|
| Methode | Cookie-basierte Session |
| Token-Speicherung | HttpOnly Cookies |
| Credentials | `withCredentials: true` |
| Middleware | `authenticateToken` auf allen Routen |

### 9.2 Autorisierung

```typescript
// Ownership-Check Beispiel
async function getThread(threadId: string, userId: string) {
  const thread = await db.query.inboxThreads.findFirst({
    where: and(
      eq(inboxThreads.id, threadId),
      eq(inboxThreads.userId, userId) // User kann nur eigene Threads sehen
    )
  });

  if (!thread) {
    throw new NotFoundError('Thread not found or access denied');
  }

  return thread;
}
```

### 9.3 Sicherheitsmaßnahmen

| Bereich | Maßnahme |
|---------|----------|
| XSS | Content wird escaped, kein dangerouslySetInnerHTML |
| CSRF | Cookie-basierte Auth mit SameSite |
| SQL Injection | Drizzle ORM mit Prepared Statements |
| Input Validation | Zod-Schemas auf Backend |
| Rate Limiting | (Empfohlen, nicht implementiert) |

### 9.4 Datenschutz

- Artefakt-Content wird nur on-demand geladen
- Artefakt-Liste enthält keinen Content
- Approval-Payloads können sensible Daten enthalten → User-Isolation
- Socket.IO-Verbindungen sind authentifiziert

---

## 10. PERFORMANCE-OPTIMIERUNGEN

### 10.1 Frontend-Optimierungen

| Optimierung | Beschreibung |
|-------------|--------------|
| **Lazy Loading** | Artefakt-Content wird erst beim Öffnen geladen |
| **Optimistic Updates** | Nachrichten erscheinen sofort |
| **Memoization** | `memo()` für DecisionCard, MessageBubble |
| **Query Caching** | React Query mit unterschiedlichen TTLs |
| **Virtual Scroll** | (Empfohlen für lange Thread-Listen) |
| **Code Splitting** | Next.js automatisches Chunking |

### 10.2 Backend-Optimierungen

| Optimierung | Beschreibung |
|-------------|--------------|
| **Composite Indexes** | (userId, status) für schnelles Filtern |
| **Separate Endpoints** | Lightweight vs. Full-Content Endpoints |
| **Pagination** | limit/offset Parameter vorhanden |
| **Connection Pooling** | PostgreSQL Connection Pool |

### 10.3 Caching-Strategie

```
┌─────────────────────────────────────────────────────────┐
│                    Caching Layers                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: React Query (Browser Memory)                   │
│  ├── Threads: 30s stale time                            │
│  ├── Messages: 10s stale time                           │
│  ├── Artifact List: 60s stale time                      │
│  └── Artifact Content: 300s stale time                  │
│                                                          │
│  Layer 2: LocalStorage (Zustand Persist)                 │
│  └── UI State (filter, sidebar)                         │
│                                                          │
│  Layer 3: Redis (Empfohlen, nicht implementiert)        │
│  └── Session Cache, Hot Data                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 11. TOOL ACTION SYSTEM (HITL)

### 11.1 Übersicht

Das Tool Action System ermöglicht Human-in-the-Loop (HITL) Approvals für kritische Agent-Aktionen. Wenn ein Agent eine Aktion vorschlägt (z.B. E-Mail senden), wird automatisch eine Approval-Anfrage erstellt.

```
Agent Response mit Tool Action:
"Ich werde jetzt die E-Mail senden.
[[TOOL_ACTION: { "type": "gmail-send-message", "params": { "to": "kunde@example.com", "subject": "Angebot" } }]]"

→ ToolActionParser erkennt das Tag
→ InboxApprovalService erstellt Approval
→ Thread-Status wird auf "suspended" gesetzt
→ User sieht ApprovalCard in der Inbox
```

### 11.2 ToolActionParser (`server/services/ToolActionParser.ts`)

**Regex-Pattern:**
```typescript
const TOOL_ACTION_PATTERN = /\[\[TOOL_ACTION:\s*(\{[\s\S]*?\})\s*\]\]/g;
```

**Unterstützte Tool-Typen:**

| Kategorie | Tool-Typ | Approval? | Agent-Hint |
|-----------|----------|-----------|------------|
| **Gmail** | `gmail-send-message` | ✅ Ja | emmie |
| | `gmail-draft-email` | ❌ Nein | emmie |
| | `gmail-reply` | ✅ Ja | emmie |
| **HubSpot** | `hubspot-create-contact` | ✅ Ja | cassie |
| | `hubspot-update-deal` | ✅ Ja | cassie |
| | `hubspot-create-task` | ❌ Nein | cassie |
| | `hubspot-log-activity` | ❌ Nein | cassie |
| **Calendar** | `calendar-create-event` | ✅ Ja | aura |
| | `calendar-reschedule` | ✅ Ja | aura |
| **Data** | `data-export` | ✅ Ja | dexter |
| | `data-transform` | ❌ Nein | dexter |
| | `spreadsheet-update` | ✅ Ja | dexter |
| **Workflow** | `workflow-trigger` | ✅ Ja | aura |
| | `workflow-schedule` | ✅ Ja | aura |
| **Generic** | `external-api-call` | ✅ Ja | - |
| | `file-operation` | ✅ Ja | - |
| | `custom` | ✅ Ja | - |

**Methoden:**
```typescript
class ToolActionParser {
  parseToolActions(content: string): ParsedToolAction[];  // Extrahiert alle Actions
  hasToolActions(content: string): boolean;               // Quick-Check
  stripToolActions(content: string): string;              // Entfernt Tags für Display
  requiresApproval(type: ToolActionType): boolean;        // Registry-Lookup
  generatePreview(action: ParsedToolAction): string;      // Human-readable Preview
  mapToApprovalActionType(type: ToolActionType): string;  // DB-Enum Mapping
}
```

### 11.3 InboxApprovalService (`server/services/InboxApprovalService.ts`)

**Singleton-Pattern für Approval-Management:**

```typescript
class InboxApprovalService {
  // Hauptmethode: Verarbeitet Agent-Nachricht
  async processAgentMessage(
    threadId: string,
    agentId: string,
    agentName: string,
    content: string
  ): Promise<ProcessMessageResult> {
    // 1. Tool-Actions aus Content parsen
    const actions = toolActionParser.parseToolActions(content);

    // 2. Für jede Action mit requiresApproval=true:
    for (const action of actions) {
      if (toolActionParser.requiresApproval(action.type)) {
        await this.createApprovalWithMessage(threadId, agentId, agentName, action);
      }
    }

    // 3. Thread-Status auf 'suspended' setzen
    await db.update(inboxThreads).set({ status: 'suspended' });

    return { actions, approvals, hasApprovals: true };
  }

  // Approval auflösen
  async resolveApproval(resolution: ApprovalResolution): Promise<InboxApproval> {
    // 1. Approval-Status aktualisieren (approved/rejected)
    // 2. Message.approval-Feld aktualisieren
    // 3. Thread-Status auf 'active' setzen (wenn keine pending mehr)
    // 4. System-Message einfügen ("Tool action approved/rejected")
  }

  // Hilfsmethoden
  async getPendingApprovals(threadId: string): Promise<InboxApproval[]>;
  async getThreadApprovals(threadId: string): Promise<InboxApproval[]>;
  async expireOldApprovals(): Promise<number>;
}
```

### 11.4 Approval-Datenmodell

```typescript
// inbox_approvals Tabelle
interface InboxApproval {
  id: string;
  threadId: string;
  messageId: string;
  workflowId?: string;
  workflowName?: string;
  actionType: string;  // 'send_email' | 'external_api_call' | 'database_write' | ...
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  actionDetails: {
    toolAction: string;           // Original tool-type
    params: Record<string, any>;  // Tool-Parameter
    estimatedCost?: number;
    previewData?: string;
    metadata?: {
      icon: string;
      color: string;
      label: string;
      description: string;
      agentHint?: string;
    };
  };
  resolvedBy?: string;
  resolvedAt?: Date;
  comment?: string;
  expiresAt?: Date;  // 24h default
  createdAt: Date;
  updatedAt: Date;
}
```

### 11.5 Approval-Flow im Detail

```
┌─────────────────┐
│   AI Agent      │
│  (z.B. Emmie)   │
└────────┬────────┘
         │ Response mit [[TOOL_ACTION: {...}]]
         ▼
┌─────────────────┐
│ POST /messages  │
│ (inbox-routes)  │
└────────┬────────┘
         │ toolActionParser.hasToolActions() → true
         ▼
┌─────────────────┐
│ processAgent-   │
│ Message()       │
└────────┬────────┘
         │ 1. Parse Actions
         │ 2. Create Approval + Message
         │ 3. Update Thread status='suspended'
         ▼
┌─────────────────┐
│ Socket Events:  │
│ - message:new   │
│ - thread:update │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Frontend      │
│ DecisionCard    │
└────────┬────────┘
         │ User klickt "Approve" oder "Reject"
         ▼
┌─────────────────┐
│ POST /approvals │
│ /:id/approve    │
└────────┬────────┘
         │ resolveApproval()
         │ 1. Update approval status
         │ 2. Update message.approval
         │ 3. Insert system_event message
         │ 4. Update thread status='active'
         ▼
┌─────────────────┐
│ Socket Events:  │
│ - approval:update│
│ - thread:update │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ (Optional)      │
│ Execute Tool    │
│ (TODO: pending) │
└─────────────────┘
```

### 11.6 Frontend-Integration

**ApprovalCard Komponente:**
- Zeigt Tool-Typ mit Icon und Farbe
- Expandable Preview der Aktion
- Approve/Reject Buttons
- Status-Badge (pending/approved/rejected/expired)
- Expiration-Countdown
- Comment-Feld bei Reject

**React Query Mutations:**
```typescript
// useApproveWorkflow(threadId)
const mutation = useMutation({
  mutationFn: (approvalId: string) => approveWorkflow(approvalId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: inboxKeys.messages(threadId) });
    queryClient.invalidateQueries({ queryKey: inboxKeys.threads() });
  }
});

// useRejectWorkflow(threadId)
const mutation = useMutation({
  mutationFn: ({ approvalId, comment }) => rejectWorkflow(approvalId, comment),
  // ...
});
```

---

## 12. KEYBOARD SHORTCUTS

### 12.1 Globale Shortcuts

| Tastenkombination | Aktion |
|-------------------|--------|
| `Cmd/Ctrl + K` | Suchfeld fokussieren |
| `Escape` | Panel schließen / Fokus entfernen |
| `↑` oder `k` | Vorheriger Thread |
| `↓` oder `j` | Nächster Thread |
| `Enter` | Thread öffnen |
| `1` | Filter: All |
| `2` | Filter: Unread |
| `3` | Filter: Mentions |
| `4` | Filter: Approvals |
| `?` | Shortcuts-Hilfe anzeigen |

### 12.2 Artifact Panel Shortcuts

| Tastenkombination | Aktion |
|-------------------|--------|
| `Escape` | Panel schließen |
| `Cmd/Ctrl + S` | Änderungen speichern |

### 12.3 Composer Shortcuts

| Tastenkombination | Aktion |
|-------------------|--------|
| `Enter` | Nachricht senden |
| `Shift + Enter` | Neue Zeile |
| `Escape` | Fokus entfernen |

---

## 13. BEKANNTE LIMITIERUNGEN

### 13.1 Technische Limitierungen

| Problem | Beschreibung | Impact |
|---------|--------------|--------|
| **Typing Indicator** | `typingRef` wird nicht reaktiv aktualisiert | Typing-Status kann veraltet sein |
| **Pagination** | Frontend nutzt limit/offset nicht | Performance bei vielen Threads |
| **Search** | Nur Frontend-basiert | Keine Volltextsuche |
| **Mentions** | Filter nicht implementiert | Feature unvollständig |
| **Offline** | Keine Offline-Unterstützung | Daten gehen verloren |

### 13.2 Fehlende Features

| Feature | Status |
|---------|--------|
| Thread-Archivierung | ❌ Nicht implementiert |
| Thread-Löschung | ❌ Nicht implementiert |
| Desktop-Notifications | ❌ Nicht implementiert |
| Sound-Alerts | ❌ Nicht implementiert |
| File-Attachments | ❌ Nicht implementiert |
| Rich-Text-Editor | ❌ Nicht implementiert |
| Drag & Drop | ❌ Nicht implementiert |

### 13.3 Bekannte Bugs

1. **Race Condition bei Streaming**: `message:complete` kann vor `message:new` ankommen
2. **Artifact Loading Delay**: Panel öffnet vor Content-Load
3. **Duplikate bei Reconnect**: Socket-Reconnect kann Duplikate erzeugen

---

## 14. VERBESSERUNGSVORSCHLÄGE

### 14.1 Kurzfristig (Quick Wins)

| Verbesserung | Aufwand | Impact |
|--------------|---------|--------|
| Typing Indicator fixen | 1h | Medium |
| Pagination implementieren | 4h | High |
| Error Toasts verbessern | 2h | Medium |
| Loading States vereinheitlichen | 2h | Medium |

### 14.2 Mittelfristig

| Verbesserung | Aufwand | Impact |
|--------------|---------|--------|
| Server-Side Search | 8h | High |
| Virtual Scrolling | 6h | High |
| Desktop Notifications | 4h | Medium |
| Thread-Archivierung | 4h | Medium |
| File Attachments | 16h | High |

### 14.3 Langfristig

| Verbesserung | Aufwand | Impact |
|--------------|---------|--------|
| Offline-Support (Service Worker) | 24h | High |
| E2E Encryption | 40h | High |
| Multi-Workspace Support | 16h | Medium |
| AI-powered Search | 24h | High |
| Voice Messages | 32h | Medium |

### 14.4 Architektur-Empfehlungen

```
Für Enterprise-Skalierung:

1. Microservices
   └── Inbox-Service als separater Microservice

2. Message Queue
   └── RabbitMQ/Kafka für Artifact-Verarbeitung

3. Redis
   └── Session-Cache
   └── Real-Time-Data Cache
   └── Rate Limiting

4. CDN
   └── Große Artifacts über CDN ausliefern

5. Read Replicas
   └── PostgreSQL Read Replicas für Queries

6. Sharding
   └── Nach userId für massive Scale
```

---

## 15. ZUSAMMENFASSUNG

### Stärken

✅ **Moderne Architektur**: React Query + Zustand für klare State-Trennung
✅ **Echtzeit-Updates**: Socket.IO für Live-Kommunikation
✅ **Lazy Loading**: Performance-optimierte Artefakt-Ladung
✅ **Optimistic Updates**: Sofortige UI-Reaktion
✅ **Type Safety**: Vollständige TypeScript-Abdeckung
✅ **Responsive Design**: Mobile-first mit Desktop-Optimierung
✅ **HITL Support**: Human-in-the-Loop Approval-System

### Schwächen

❌ **Keine Pagination**: Frontend-Performance bei vielen Threads
❌ **Lokale Suche**: Keine Backend-Volltextsuche
❌ **Typing Indicator Bug**: Race Condition möglich
❌ **Fehlende Features**: Mentions, Archivierung, Notifications
❌ **Keine Tests**: Unit-/E2E-Tests fehlen

### Nächste Schritte

1. **Phase 1 (Bugfixes)**
   - Typing Indicator fixen
   - Race Conditions beheben
   - Error Handling verbessern

2. **Phase 2 (Features)**
   - Pagination implementieren
   - Server-Side Search
   - Desktop Notifications

3. **Phase 3 (Testing)**
   - Unit Tests für Hooks
   - E2E Tests mit Playwright
   - Performance Tests

4. **Phase 4 (Scaling)**
   - Redis Integration
   - Read Replicas
   - CDN für Artifacts

---

**Dokument erstellt von:** Claude Code
**Letzte Aktualisierung:** 2026-01-02
**Version:** 1.0.0
