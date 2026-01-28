# SINTRA.AI Architecture

> Technical architecture documentation for developers and contributors.

---

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Data Flow](#data-flow)
- [Folder Structure](#folder-structure)
- [Core Components](#core-components)
- [Key Concepts](#key-concepts)
- [Database Schema](#database-schema)
- [Deployment Architecture](#deployment-architecture)

---

## System Overview

SINTRA.AI is built on a modern, scalable architecture that separates concerns between the frontend (Next.js), backend API (Express.js), and background job processing (BullMQ workers).

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 (App Router) | Server-side rendering, React UI |
| API Server | Express.js | RESTful API, WebSocket handling |
| Real-time | Socket.IO | Bidirectional event-based communication |
| Queue | BullMQ + Redis | Async job processing |
| Database | PostgreSQL 16 | Primary data store |
| ORM | Drizzle | Type-safe database queries |
| Cache | Redis 7 | Session cache, rate limiting |
| AI | OpenAI GPT-4 | Agent intelligence |

---

## High-Level Architecture

```mermaid
graph TB
    subgraph Client
        Browser[Browser/Client]
    end

    subgraph Frontend["Frontend (Next.js 14)"]
        Pages[App Router Pages]
        Components[React Components]
        API_Routes[API Route Handlers]
    end

    subgraph Backend["Backend (Express.js)"]
        REST[REST API]
        WS[Socket.IO Server]
        Middleware[Auth & Rate Limiting]
    end

    subgraph Services
        AgentService[Agent Service]
        BrainService[Brain AI Service]
        PipelineService[Pipeline Service]
        OpenAI[OpenAI Integration]
    end

    subgraph Queue["Job Queue (BullMQ)"]
        Producer[Job Producer]
        Consumer[Job Consumer/Worker]
    end

    subgraph Storage
        PostgreSQL[(PostgreSQL)]
        Redis[(Redis)]
    end

    Browser --> Pages
    Pages --> Components
    Pages --> API_Routes
    API_Routes --> REST
    Browser <--> WS

    REST --> Middleware
    Middleware --> AgentService
    Middleware --> BrainService
    Middleware --> PipelineService

    AgentService --> OpenAI
    BrainService --> OpenAI
    PipelineService --> Producer

    Producer --> Redis
    Consumer --> Redis
    Consumer --> PostgreSQL

    AgentService --> PostgreSQL
    BrainService --> PostgreSQL
    PipelineService --> PostgreSQL

    Middleware --> Redis
```

---

## Data Flow

### Request Flow

```mermaid
sequenceDiagram
    participant U as User
    participant N as Next.js
    participant E as Express API
    participant R as Redis
    participant B as BullMQ Worker
    participant P as PostgreSQL
    participant O as OpenAI

    U->>N: HTTP Request
    N->>E: Proxy to API
    E->>R: Check Rate Limit
    R-->>E: Allowed
    E->>P: Query/Validate
    P-->>E: Data

    alt Async Pipeline Execution
        E->>R: Add Job to Queue
        R-->>E: Job ID
        E-->>N: 202 Accepted
        N-->>U: Processing...
        B->>R: Pick Up Job
        B->>O: AI Request
        O-->>B: Response
        B->>P: Store Result
        B->>R: Publish Event
        R-->>N: WebSocket Event
        N-->>U: Result
    else Sync Agent Chat
        E->>O: Stream Request
        O-->>E: Stream Response
        E-->>N: SSE Stream
        N-->>U: Live Response
    end
```

### Agent Chat Flow

```mermaid
flowchart LR
    A[User Message] --> B{Agent Router}
    B --> C[System Prompt]
    B --> D[Conversation History]
    C --> E[OpenAI API]
    D --> E
    E --> F[Stream Response]
    F --> G[Save to DB]
    F --> H[Display to User]
```

---

## Folder Structure

```
sintra-ai/
├── app/                          # Next.js 14 App Router
│   ├── (app)/                    # Protected routes (authenticated)
│   │   ├── dashboard/            # Main dashboard
│   │   ├── pipelines/            # Pipeline management
│   │   │   ├── page.tsx          # Pipeline list
│   │   │   ├── [id]/             # Individual pipeline
│   │   │   └── studio/           # Visual editor
│   │   ├── agents/               # Agent system
│   │   │   ├── browse/           # Agent catalog
│   │   │   └── [id]/chat/        # Agent chat interface
│   │   ├── brain/                # Brain AI interface
│   │   └── layout.tsx            # Authenticated layout
│   ├── api/                      # Next.js API routes (proxy layer)
│   ├── login/                    # Authentication pages
│   ├── globals.css               # Global styles
│   └── layout.tsx                # Root layout
│
├── components/                   # React components
│   ├── pipelines/                # Pipeline-specific components
│   │   ├── PipelineWizard.tsx    # AI-powered pipeline generator
│   │   ├── VisualEditor.tsx      # React Flow editor
│   │   └── NodeTypes/            # Custom node components
│   ├── agents/                   # Agent chat components
│   │   ├── ChatInterface.tsx     # Chat UI
│   │   └── MessageList.tsx       # Message display
│   ├── brain/                    # Brain AI components
│   └── ui/                       # Shared UI components
│
├── server/                       # Express.js backend
│   ├── index.ts                  # Server entry point
│   ├── routes/                   # API route handlers
│   │   ├── agents.ts             # Agent endpoints
│   │   ├── pipelines.ts          # Pipeline endpoints
│   │   └── brain.ts              # Brain AI endpoints
│   ├── services/                 # Business logic
│   │   ├── AgentService.ts       # Agent orchestration
│   │   ├── PipelineService.ts    # Pipeline execution
│   │   └── BrainService.ts       # RAG implementation
│   ├── middleware/               # Express middleware
│   └── socket.ts                 # Socket.IO configuration
│
├── lib/                          # Shared libraries
│   ├── db/                       # Database layer
│   │   ├── index.ts              # Connection management
│   │   ├── schema.ts             # Drizzle schema
│   │   └── migrations/           # SQL migrations
│   ├── agents/                   # Agent definitions
│   │   ├── personas.ts           # Agent personalities
│   │   └── prompts.ts            # System prompts
│   ├── ai/                       # AI integrations
│   │   ├── openai-service.ts     # OpenAI client
│   │   └── fallback-config.ts    # Fallback handling
│   └── brain/                    # Brain AI system
│       ├── index.ts              # RAG orchestration
│       └── RedisCache.ts         # Caching layer
│
├── workers/                      # Background job processors
│   ├── indexer.ts                # Document indexer
│   └── queues.ts                 # Queue definitions
│
├── docker/                       # Docker configuration
│   ├── docker-compose.yml        # Development stack
│   ├── docker-compose.prod.yml   # Production stack
│   └── nginx/                    # Nginx configuration
│
├── scripts/                      # Utility scripts
│   ├── seed-admin.ts             # Create admin user
│   └── setup-dev.sh              # Development setup
│
├── drizzle/                      # Drizzle ORM
│   └── migrations/               # Generated migrations
│
├── Dockerfile                    # Production Docker image
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
└── next.config.js                # Next.js config
```

---

## Core Components

### 1. Next.js Frontend

The frontend uses Next.js 14 with the App Router for server-side rendering and client components.

**Key Features:**
- Server Components for initial page loads
- Client Components for interactive elements
- API Routes as a proxy layer to the Express backend
- React Flow for visual pipeline editing

### 2. Express.js Backend

The backend API server handles all business logic, authentication, and real-time communication.

**Key Features:**
- RESTful API design
- JWT-based authentication
- Socket.IO for real-time updates
- Rate limiting with Redis

### 3. BullMQ Workers

Background workers process long-running tasks asynchronously.

**Key Features:**
- Pipeline step execution
- Document indexing for Brain AI
- Email notifications
- Scheduled jobs

### 4. Brain AI (RAG System)

The Brain AI system provides context-aware responses using Retrieval-Augmented Generation.

```mermaid
flowchart TD
    A[User Query] --> B[Query Embedding]
    B --> C[Vector Search]
    D[Document Store] --> C
    C --> E[Top K Results]
    E --> F[Context Assembly]
    F --> G[LLM + Context]
    G --> H[Response]
```

---

## Key Concepts

### Async Execution Engine

The pipeline execution engine uses a producer-consumer pattern with BullMQ for reliable async processing.

```mermaid
stateDiagram-v2
    [*] --> Queued: Job Created
    Queued --> Processing: Worker Picks Up
    Processing --> Completed: Success
    Processing --> Failed: Error
    Failed --> Queued: Retry (max 3)
    Failed --> Dead: Max Retries
    Completed --> [*]
    Dead --> [*]
```

**How it works:**

1. **Job Creation**: When a pipeline is triggered, a job is added to the Redis queue
2. **Worker Processing**: Workers pick up jobs and execute pipeline steps sequentially
3. **Step Execution**: Each step (AI prompt, webhook, database query) runs independently
4. **Error Handling**: Failed steps trigger retries with exponential backoff
5. **Completion**: Results are stored in PostgreSQL and clients notified via WebSocket

**Code Example:**

```typescript
// Producer (API)
await pipelineQueue.add('execute', {
  pipelineId: 'abc123',
  userId: 'user456',
  input: { data: 'example' }
});

// Consumer (Worker)
pipelineQueue.process('execute', async (job) => {
  const { pipelineId, input } = job.data;
  const pipeline = await getPipeline(pipelineId);

  for (const step of pipeline.steps) {
    await executeStep(step, input);
    await job.updateProgress(step.order / pipeline.steps.length * 100);
  }
});
```

### Memory System (Brain AI)

The Brain AI memory system enables context-aware responses by indexing documents and using semantic search.

```mermaid
flowchart LR
    subgraph Ingestion
        A[Documents] --> B[Chunking]
        B --> C[Embedding]
        C --> D[(Vector Store)]
    end

    subgraph Retrieval
        E[User Query] --> F[Query Embedding]
        F --> G[Similarity Search]
        D --> G
        G --> H[Top Results]
    end

    subgraph Generation
        H --> I[Context Window]
        E --> I
        I --> J[LLM]
        J --> K[Response]
    end
```

**Components:**

1. **Document Ingestion**
   - Documents split into chunks (~500 tokens)
   - Each chunk embedded using OpenAI embeddings
   - Vectors stored with metadata in PostgreSQL (pgvector)

2. **Semantic Search**
   - User queries converted to embeddings
   - Cosine similarity search against stored vectors
   - Top-K relevant chunks retrieved

3. **Context Assembly**
   - Retrieved chunks assembled into context
   - Token budget managed (max 4000 tokens)
   - Recency and relevance weighted

4. **Response Generation**
   - Context + query sent to GPT-4
   - Agent persona applied
   - Response streamed to client

---

## Database Schema

### Core Tables

```mermaid
erDiagram
    users ||--o{ pipelines : creates
    users ||--o{ agent_messages : sends
    users ||--o{ brain_memories : owns

    pipelines ||--|{ pipeline_steps : contains
    pipelines ||--o{ pipeline_executions : has

    pipeline_executions ||--|{ step_results : produces

    users {
        uuid id PK
        string email
        string password_hash
        string role
        timestamp created_at
    }

    pipelines {
        uuid id PK
        uuid user_id FK
        string name
        json nodes
        json edges
        boolean is_active
        timestamp created_at
    }

    pipeline_steps {
        uuid id PK
        uuid pipeline_id FK
        string type
        json config
        int order
    }

    pipeline_executions {
        uuid id PK
        uuid pipeline_id FK
        string status
        json input
        json output
        timestamp started_at
        timestamp completed_at
    }

    agent_messages {
        uuid id PK
        string agent_id
        uuid user_id FK
        string role
        text content
        json metadata
        timestamp created_at
    }

    brain_memories {
        uuid id PK
        uuid user_id FK
        text content
        vector embedding
        json metadata
        timestamp created_at
    }
```

---

## Deployment Architecture

### Production Stack

```mermaid
graph TB
    subgraph External
        Users[Users]
        CDN[CDN/Cloudflare]
    end

    subgraph "Load Balancer"
        Nginx[Nginx]
    end

    subgraph "Application Tier"
        App1[App Container 1]
        App2[App Container 2]
        Worker1[Worker 1]
        Worker2[Worker 2]
    end

    subgraph "Data Tier"
        PG[(PostgreSQL)]
        Redis[(Redis)]
    end

    subgraph "External Services"
        OpenAI[OpenAI API]
        Sentry[Sentry]
    end

    Users --> CDN
    CDN --> Nginx
    Nginx --> App1
    Nginx --> App2

    App1 --> PG
    App2 --> PG
    App1 --> Redis
    App2 --> Redis

    Worker1 --> Redis
    Worker2 --> Redis
    Worker1 --> PG
    Worker2 --> PG

    App1 --> OpenAI
    App2 --> OpenAI
    Worker1 --> OpenAI

    App1 --> Sentry
    App2 --> Sentry
```

### Container Configuration

| Service | Replicas | Resources | Health Check |
|---------|----------|-----------|--------------|
| nginx | 1 | 256MB | TCP :80 |
| app | 2 | 1GB | HTTP /api/health |
| worker | 2 | 512MB | Redis ping |
| postgres | 1 | 2GB | pg_isready |
| redis | 1 | 512MB | redis-cli ping |

---

## Security Considerations

### Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant R as Redis
    participant D as Database

    C->>A: POST /auth/login
    A->>D: Validate credentials
    D-->>A: User data
    A->>A: Generate JWT
    A->>R: Store refresh token
    A-->>C: Access + Refresh tokens

    C->>A: GET /api/resource
    A->>A: Verify JWT
    A-->>C: Resource data

    C->>A: POST /auth/refresh
    A->>R: Validate refresh token
    R-->>A: Token valid
    A->>A: Generate new JWT
    A-->>C: New access token
```

### Security Layers

1. **Transport**: TLS 1.3 everywhere
2. **Authentication**: JWT with short expiry (15min)
3. **Authorization**: Role-based access control
4. **Rate Limiting**: Redis-based per-user limits
5. **Input Validation**: Zod schemas on all endpoints
6. **SQL Injection**: Parameterized queries via Drizzle
7. **XSS Prevention**: React's built-in escaping + CSP headers

---

## Flowent Horizon (Voice Mode Architecture)

### Voice Pipeline Overview

Flowent Horizon provides real-time voice conversations with AI agents using WebSocket binary streaming, speech-to-text, LLM processing, and text-to-speech synthesis.

```mermaid
graph TB
    subgraph Client["Frontend (Browser)"]
        Mic[Microphone] --> AudioCtrl[useAudioController]
        AudioCtrl --> VAD[Voice Activity Detection]
        AudioCtrl --> WS_Client[VoiceSocketService]
        WS_Client --> AudioQueue[AudioQueue]
        AudioQueue --> Speaker[Speaker Output]

        Orb[FluidOrb WebGL] --> AudioCtrl
    end

    subgraph Server["Backend (Express + Socket.IO)"]
        WS_Server[/voice Namespace]
        WS_Server --> STT[OpenAI Whisper STT]
        STT --> LLM[GPT-4 + Agent Prompt]
        LLM --> TTS[OpenAI TTS Streaming]
        LLM --> Artifacts[Artifact Generator]

        WS_Server --> Persistence[VoiceSessionPersistenceService]
        Persistence --> DB[(PostgreSQL)]
    end

    WS_Client <-->|Binary Audio + Events| WS_Server
    TTS -->|Streaming Chunks| WS_Server
    Artifacts -->|agent:artifact| WS_Server
```

### Voice Data Flow (Turn-Based Conversation)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant WS as Socket.IO /voice
    participant STT as OpenAI Whisper
    participant LLM as GPT-4
    participant TTS as OpenAI TTS
    participant DB as PostgreSQL

    Note over U,DB: Session Start
    U->>WS: session:start { agentId, threadId? }
    WS->>DB: Load conversation context
    DB-->>WS: Previous messages
    WS-->>U: session:ready { sessionId, hasContext }
    WS-->>U: agent:state { state: 'listening' }

    Note over U,DB: Voice Turn
    loop Audio Streaming
        U->>WS: audio:stream { chunk: Float32Array }
    end

    U->>WS: audio:process (silence detected)
    WS-->>U: agent:state { state: 'thinking' }

    WS->>STT: WAV audio buffer
    STT-->>WS: Transcription text
    WS-->>U: transcription { text, isFinal }

    WS->>LLM: User message + context
    LLM-->>WS: Response + artifacts

    opt Has Artifacts
        WS-->>U: agent:artifact { type, content }
    end

    WS-->>U: agent:response { text }
    WS-->>U: agent:state { state: 'speaking' }

    WS->>TTS: Text to synthesize
    loop Streaming Audio
        TTS-->>WS: Audio chunk (base64)
        WS-->>U: audio:chunk { chunk, isFirst, isLast }
    end

    WS->>DB: persistInteraction()
    WS-->>U: interaction:persisted { threadId, messageId }
    WS-->>U: agent:state { state: 'listening' }
```

### Barge-In (Interrupt) Flow

Barge-In allows users to interrupt the AI mid-sentence, creating natural conversation dynamics.

```mermaid
sequenceDiagram
    participant U as User
    participant AQ as AudioQueue
    participant WS as VoiceSocketService
    participant S as Server

    Note over U,S: Agent is speaking
    S-->>WS: audio:chunk (streaming)
    WS->>AQ: enqueue(chunk)
    AQ->>AQ: Play audio

    Note over U,S: User starts speaking (Barge-In)
    U->>WS: VAD detects speech
    WS->>WS: isBargeInActive = true
    WS->>AQ: stop() - immediate
    WS->>S: agent:stop

    S->>S: Stop TTS generation
    S-->>WS: agent:stopped
    S-->>WS: agent:state { state: 'listening' }

    Note over U,S: Resume normal flow
    WS->>WS: isBargeInActive = false
```

### Voice Session State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: Overlay opens
    Idle --> Initializing: Start session
    Initializing --> Listening: WebSocket connected

    Listening --> Processing: Silence detected
    Listening --> Error: Connection lost

    Processing --> Speaking: TTS starts
    Processing --> Listening: Empty response
    Processing --> Error: API error

    Speaking --> Listening: TTS complete
    Speaking --> Listening: Barge-In
    Speaking --> Error: Playback error

    Error --> Reconnecting: Auto-retry
    Reconnecting --> Listening: Reconnected
    Reconnecting --> Error: Max retries

    Listening --> [*]: Close overlay
    Error --> [*]: Close overlay
```

### Reconnection Strategy (Exponential Backoff)

```mermaid
flowchart TD
    A[Connection Lost] --> B{Attempt < 3?}
    B -->|Yes| C[Wait: 1s * 2^attempt]
    C --> D[Reconnect]
    D --> E{Success?}
    E -->|Yes| F[Reset attempts]
    F --> G[Resume session]
    E -->|No| H[Increment attempt]
    H --> B
    B -->|No| I[Show error toast]
    I --> J[Manual retry required]
```

### Audio Processing Pipeline

```mermaid
flowchart LR
    subgraph Input["Microphone Input"]
        A[getUserMedia] --> B[AudioContext]
        B --> C[AnalyserNode]
        C --> D[getFloatTimeDomainData]
    end

    subgraph Analysis["Real-time Analysis"]
        D --> E[FFT]
        E --> F[Amplitude]
        E --> G[Frequency Bands]
        F --> H[VAD/Speech Detection]
    end

    subgraph Streaming["WebSocket Streaming"]
        D --> I[Float32Array chunks]
        I --> J[Socket.IO binary]
    end

    subgraph Visualization["FluidOrb"]
        F --> K[analysisRef]
        G --> K
        K --> L[WebGL Shader]
    end
```

### Database Persistence Model

```mermaid
erDiagram
    inbox_threads ||--o{ inbox_messages : contains
    inbox_threads ||--o{ artifacts : has
    inbox_messages ||--o{ artifacts : references

    inbox_threads {
        uuid id PK
        uuid user_id FK
        string agent_id
        string agent_name
        string subject
        string status
        json metadata
        timestamp last_message_at
    }

    inbox_messages {
        uuid id PK
        uuid thread_id FK
        string role
        string type
        text content
        json artifacts
        json metadata
        timestamp timestamp
    }

    artifacts {
        uuid id PK
        uuid thread_id FK
        uuid message_id FK
        string type
        string title
        text content
        string language
        json metadata
    }
```

---

## Performance Optimization

### Caching Strategy

| Data Type | Cache Location | TTL | Invalidation |
|-----------|---------------|-----|--------------|
| Session | Redis | 15min | On logout |
| User Profile | Redis | 5min | On update |
| Agent Personas | Memory | 1hr | On deploy |
| Pipeline Results | PostgreSQL | - | Manual |
| Vector Embeddings | PostgreSQL | - | On re-index |

### Database Indexes

```sql
-- Critical indexes for performance
CREATE INDEX idx_messages_user_agent ON agent_messages(user_id, agent_id);
CREATE INDEX idx_pipelines_user ON pipelines(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_executions_status ON pipeline_executions(status, created_at DESC);
CREATE INDEX idx_memories_embedding ON brain_memories USING ivfflat (embedding vector_cosine_ops);
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and code standards.

---

<div align="center">

**SINTRA.AI Architecture v3.0.0**

</div>
