# Brain AI Transformation Plan
## Von Knowledge Hub zu Connected Intelligence Workspace

**Version:** 2.0.0
**Datum:** 2025-12-26
**Ziel:** Transformation von Brain AI zu einem vollwertigen "Connected Intelligence Workspace" nach ClickUp Brain Architektur

---

## Executive Summary

Die Analyse des bestehenden Brain AI Systems zeigt eine solide Grundlage mit:
- RAG-basierter Wissensdatenbank (PostgreSQL + pgvector)
- Semantic Chunking und Re-Ranking
- OpenAI Embedding Integration
- Basis-Dokumentenworkflow

**GAP-Analyse zeigt kritische fehlende Komponenten:**
1. Multi-Model Router (GPT-4 vs Gemini Flash)
2. Connected Search (externe Integrationen)
3. AI Project Manager Modul
4. AI Writer Modul mit Rollen-Prompts
5. Meeting Intelligence
6. Permission-Aware Retrieval

---

## Architektur-Vergleich

### Aktueller Stand vs. ClickUp Brain

| Feature | Aktuell | ClickUp Brain | Gap |
|---------|---------|---------------|-----|
| Knowledge Manager | 70% | 100% | Q&A Synthese, Ask Q&A |
| Project Manager | 10% | 100% | Standups, Subtask-Gen |
| AI Writer | 5% | 100% | Rollenbasierte Prompts |
| Connected Search | 0% | 100% | Google Drive, Slack, etc. |
| Multi-Model Router | 0% | 100% | GPT-4/Gemini Routing |
| Meeting Intelligence | 0% | 100% | Transkription, Summarization |
| Vektordatenbank | 80% | 100% | pgvector vorhanden |
| RAG Pipeline | 75% | 100% | Hybrid Search vorhanden |
| Permission-Aware | 30% | 100% | Basis-ACL vorhanden |

---

## Phase 1: Core Intelligence Layer (Woche 1-2)

### 1.1 Multi-Model Router Implementation

**Ziel:** Intelligente Modell-Orchestrierung basierend auf Task-Komplexität

```typescript
// lib/brain/ModelRouter.ts
interface ModelRouterConfig {
  defaultModel: 'gpt-4' | 'gemini-flash';
  thresholds: {
    complexityScore: number;  // > 0.7 -> GPT-4
    latencyTarget: number;    // < 500ms -> Gemini
    tokenLimit: number;       // > 2000 -> GPT-4
  };
}
```

**Implementierungsschritte:**
1. Task-Klassifikator erstellen
2. Latenz-Optimierung für schnelle Anfragen
3. Fallback-Logik bei API-Fehlern
4. Token-Kostentracking pro Modell

### 1.2 Enhanced RAG Pipeline

**Verbesserungen:**
- Hybrid Re-Ranking mit Cross-Encoder
- Query Expansion für bessere Recall
- Chunk-Fusion für kohärente Antworten

```typescript
// lib/brain/EnhancedRAG.ts
interface RAGPipelineConfig {
  retrieval: {
    strategy: 'hybrid' | 'semantic' | 'keyword';
    topK: number;
    rerankerModel: 'cross-encoder' | 'bm25';
  };
  generation: {
    model: 'gpt-4' | 'gemini-flash';
    temperature: number;
    maxTokens: number;
  };
}
```

---

## Phase 2: Knowledge Manager Pro (Woche 2-3)

### 2.1 Ask Q&A System

**Features:**
- Natürlichsprachliche Frage-Antwort
- Multi-Source Synthese
- Confidence Scoring
- Source Attribution

```typescript
interface AskQAResponse {
  answer: string;
  confidence: 'low' | 'medium' | 'high' | 'critical';
  sources: {
    id: string;
    title: string;
    excerpt: string;
    relevance: number;
    sourceType: 'document' | 'meeting' | 'email' | 'external';
  }[];
  reasoning?: string;
  followUpQuestions?: string[];
}
```

### 2.2 Connected Search Architecture

**Integrationen:**
1. Google Drive (Deep Indexing)
2. Slack (Live Federated Search)
3. GitHub (Repository Search)
4. Confluence (Wiki Sync)
5. Notion (Page Indexing)

```typescript
// lib/brain/connectors/
├── GoogleDriveConnector.ts
├── SlackConnector.ts
├── GitHubConnector.ts
├── ConfluenceConnector.ts
├── NotionConnector.ts
└── ConnectorRegistry.ts
```

**OAuth2-Flow:**
1. User autorisiert in Settings
2. Token-Refresh automatisch
3. Inkrementeller Index-Update via Webhooks
4. Permission-Mapping für ACL

---

## Phase 3: AI Project Manager (Woche 3-4)

### 3.1 Automatisierte Standups

```typescript
interface StandupConfig {
  timeRange: '24h' | '1w' | 'custom';
  sources: ('tasks' | 'commits' | 'comments' | 'meetings')[];
  format: 'bullets' | 'narrative' | 'structured';
  filters: {
    projects?: string[];
    users?: string[];
    excludeMinor: boolean;
  };
}

interface StandupReport {
  summary: string;
  highlights: {
    completed: string[];
    inProgress: string[];
    blocked: string[];
  };
  metrics: {
    tasksCompleted: number;
    commitsCount: number;
    meetingsHeld: number;
  };
  generatedAt: string;
}
```

### 3.2 Subtask-Generierung

```typescript
interface SubtaskGenerator {
  generateFromTask(
    taskTitle: string,
    taskDescription: string,
    projectContext?: string
  ): Promise<{
    subtasks: {
      title: string;
      description: string;
      estimatedHours: number;
      dependencies: string[];
      priority: 'low' | 'medium' | 'high';
    }[];
    reasoning: string;
  }>;
}
```

### 3.3 Meeting Intelligence

**Architektur:**
```
[Zoom/Teams/Meet]
    ↓ (Recall.ai API)
[Audio Stream]
    ↓ (Speech-to-Text)
[Transcript]
    ↓ (Diarization)
[Speaker-Tagged Transcript]
    ↓ (LLM Summary)
[Meeting Summary + Action Items]
    ↓ (Task Creation)
[ClickUp Tasks]
```

---

## Phase 4: AI Writer Module (Woche 4-5)

### 4.1 Rollenbasierte Prompt-Bibliothek

```typescript
// lib/brain/writer/RolePrompts.ts
const ROLE_PROMPTS: Record<string, SystemPrompt> = {
  'product-manager': {
    systemPrompt: `You are a senior Product Manager writing documentation...`,
    outputFormat: 'structured',
    tone: 'professional',
    templates: ['prd', 'roadmap', 'spec']
  },
  'marketing': {
    systemPrompt: `You are a creative Marketing professional...`,
    outputFormat: 'engaging',
    tone: 'persuasive',
    templates: ['blog', 'email-campaign', 'social']
  },
  'engineer': {
    systemPrompt: `You are a technical engineer writing documentation...`,
    outputFormat: 'technical',
    tone: 'precise',
    templates: ['api-doc', 'readme', 'architecture']
  },
  'sales': {
    systemPrompt: `You are a Sales professional crafting communications...`,
    outputFormat: 'persuasive',
    tone: 'relationship-focused',
    templates: ['proposal', 'follow-up', 'pitch']
  },
  'legal': {
    systemPrompt: `You are a Legal advisor drafting documents...`,
    outputFormat: 'formal',
    tone: 'precise',
    templates: ['contract', 'nda', 'policy']
  }
};
```

### 4.2 Thread Summarization

```typescript
interface ThreadSummarizer {
  summarizeThread(
    messages: {
      author: string;
      content: string;
      timestamp: string;
      reactions?: string[];
    }[],
    options?: {
      maxLength: 'short' | 'medium' | 'long';
      focusOn?: 'decisions' | 'action-items' | 'key-points';
    }
  ): Promise<{
    summary: string;
    decisions: string[];
    actionItems: {
      item: string;
      assignee?: string;
    }[];
    keyPoints: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
  }>;
}
```

---

## Phase 5: Frontend Transformation (Woche 5-6)

### 5.1 Neue UI-Architektur

```
Brain AI Dashboard
├── Command Bar (Universal Search)
│   └── Ask anything, search everywhere
├── Knowledge Manager Panel
│   ├── Q&A Interface
│   ├── Document Browser
│   └── Connected Sources
├── Project Manager Panel
│   ├── AI Standups
│   ├── Task Intelligence
│   └── Meeting Prep
├── AI Writer Panel
│   ├── Role Selector
│   ├── Template Gallery
│   └── Live Editor
└── Analytics Panel
    ├── Usage Metrics
    ├── Knowledge Graph
    └── Team Insights
```

### 5.2 Komponenten-Migration

| Alt | Neu | Priorität |
|-----|-----|-----------|
| BrainPage | ConnectedBrainPage | P0 |
| KnowledgeLibrary | EnhancedKnowledgeHub | P0 |
| BusinessIdeas | StrategyForge | P1 |
| DailyLearningQuestions | LearningCenter | P2 |
| PredictiveContextEngine | MeetingIntelligence | P0 |

---

## Phase 6: Sicherheit & Performance (Woche 6-7)

### 6.1 Permission-Aware Retrieval

```typescript
interface PermissionLayer {
  // Check if user can access document
  canAccess(userId: string, documentId: string): Promise<boolean>;

  // Filter search results based on permissions
  filterResults(
    userId: string,
    results: SearchResult[]
  ): Promise<SearchResult[]>;

  // Map external identities (Google -> ClickUp)
  mapIdentity(
    provider: 'google' | 'slack' | 'github',
    externalId: string
  ): Promise<string | null>;
}
```

### 6.2 Caching-Strategie

```typescript
interface CacheConfig {
  vectorCache: {
    type: 'redis';
    ttl: 3600; // 1 hour
    warmWorkspaces: boolean;
  };
  llmCache: {
    type: 'semantic-hash';
    similarityThreshold: 0.95;
    ttl: 86400; // 24 hours
  };
  documentCache: {
    type: 'in-memory';
    maxSize: 1000;
    evictionPolicy: 'lru';
  };
}
```

---

## Datenbank-Erweiterungen

### Neue Tabellen

```sql
-- Connected sources configuration
CREATE TABLE brain_connected_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'google_drive', 'slack', 'github'
  config JSONB NOT NULL,
  oauth_tokens JSONB, -- Encrypted
  last_sync TIMESTAMP,
  sync_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- External document index
CREATE TABLE brain_external_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES brain_connected_sources(id),
  external_id VARCHAR(255) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  embedding vector(1536),
  metadata JSONB,
  permissions JSONB, -- ACL from source
  indexed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI usage tracking (ISO 42001 compliance)
CREATE TABLE brain_ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  workspace_id VARCHAR(255) NOT NULL,
  model VARCHAR(100) NOT NULL,
  operation VARCHAR(50) NOT NULL, -- 'query', 'generate', 'embed'
  tokens_prompt INTEGER NOT NULL,
  tokens_completion INTEGER NOT NULL,
  cost_usd NUMERIC(10, 6),
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Meeting transcripts
CREATE TABLE brain_meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(255) NOT NULL,
  event_id UUID REFERENCES calendar_events(id),
  transcript TEXT NOT NULL,
  speakers JSONB, -- {speakerId: name}
  summary TEXT,
  action_items JSONB,
  key_decisions JSONB,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API-Endpunkte

### Neue Routes

```
POST /api/brain/ask          # Q&A mit RAG
POST /api/brain/generate     # AI Writer
POST /api/brain/standup      # Standup-Generierung
POST /api/brain/subtasks     # Subtask-Generierung
GET  /api/brain/sources      # Connected Sources
POST /api/brain/sources/sync # Trigger Sync
GET  /api/brain/meetings/:id/summary # Meeting Summary
POST /api/brain/threads/summarize    # Thread Summary
```

---

## Migrations-Strategie

### Phase 1: Parallelbetrieb
- Neue Module neben bestehenden
- Feature Flags für schrittweise Aktivierung

### Phase 2: Daten-Migration
- Bestehende Dokumente bleiben kompatibel
- Neue Embeddings mit verbessertem Modell

### Phase 3: UI-Transition
- Neue Komponenten ersetzen alte
- Alte Komponenten als Fallback

---

## Erfolgskriterien

| Metrik | Aktuell | Ziel |
|--------|---------|------|
| Suchlatenz (P95) | 3s | <500ms |
| Antwortqualität | 70% | 90% |
| Integrationen | 0 | 5+ |
| Nutzerakzeptanz | - | >80% |
| Feature-Parität ClickUp | 30% | 85% |

---

## Nächste Schritte

1. **SOFORT:** Multi-Model Router implementieren
2. **Tag 1-3:** Enhanced RAG Pipeline
3. **Tag 4-7:** Ask Q&A System
4. **Woche 2:** Connected Search (Google Drive)
5. **Woche 3:** AI Project Manager
6. **Woche 4:** AI Writer
7. **Woche 5:** Meeting Intelligence
8. **Woche 6:** Frontend Transformation
9. **Woche 7:** Security Hardening

---

*Dieses Dokument wird kontinuierlich aktualisiert.*
