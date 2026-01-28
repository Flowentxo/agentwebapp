# SINTRA AI Agent System v3.0.0 - Comprehensive Architecture Analysis

## Executive Summary

**SINTRA** is a sophisticated **multi-agent AI orchestration system** built with Next.js 14, Express.js, PostgreSQL, and OpenAI. The system manages a whitelist of 4 production-ready agents (Dexter, Cassie, Emmie, Aura) while supporting infrastructure for 12 total agent personas. It provides real-time WebSocket communication, knowledge base management, OAuth2 integrations, and a unified dashboard interface.

**Current Status:** v3.0.0 - Production Ready
**Frontend Port:** 3000 (Next.js)
**Backend Port:** 4002 (Express.js)
**Active Agents:** 4 (out of 12 supported personas)

---

## Technology Stack Summary

### Frontend
- Next.js 14.2.33, TypeScript, React 18.3, Tailwind CSS
- State: Zustand 5.0.2, React Context
- UI: Radix UI, Lucide React, Recharts

### Backend  
- Express.js 4.18.2, TypeScript
- Database: PostgreSQL with Drizzle ORM
- Authentication: JWT, Sessions, OAuth2
- Jobs: BullMQ 5.61.2
- Logging: Winston 3.11.0
- Cache: Redis with ioredis

### Database
- PostgreSQL 14+ (Neon Cloud production, Docker dev)
- Extensions: pgvector (vector search), uuid-ossp
- 769-line schema with 15+ tables

### AI & Integrations
- OpenAI API (gpt-4-turbo-preview, text-embedding-3-small)
- OAuth2: Google, Microsoft, GitHub, Slack, Zoom, HubSpot, Stripe
- Email: Nodemailer
- Export: PDF, CSV, XLSX, PPTX

---

## Project Structure

```
app/                          - Next.js routes & API
lib/                          - Shared utilities (agents, auth, db, knowledge, ai, hooks)
components/                   - React components (agents, dashboard, shell, settings, ui)
server/                       - Express backend (routes, services, agents, middleware)
lib/db/schema.ts             - Drizzle ORM schema (769 lines, 15+ tables)
package.json                 - v3.0.0 dependencies
```

---

## Active Agent System

### 4 Whitelisted Agents

1. **Dexter** - Financial Analyst & Data Expert (Blue)
   - ROI Calculator, Financial Analysis, Sales Forecasting
   - Powered by: gpt-4-turbo-preview

2. **Cassie** - Customer Support (Green)
   - Ticket Management, FAQ, Issue Resolution, Feedback
   - 24/7 support with empathy

3. **Emmie** - Email Manager (Purple)  
   - Email Automation, Campaign Management, Templates, Follow-ups
   - Professional email drafting

4. **Aura** - Brand Strategist (Pink)
   - Brand Identity, Positioning, Messaging, Competitor Analysis
   - Strategic brand frameworks

### Agent Communication
- REST API: POST `/api/agents/{id}/chat` (streaming)
- WebSocket: Real-time updates
- Backend: AgentManager singleton coordinates all agents
- Context: BrainAI provides shared memory between agents

---

## Frontend Routes & Pages

**Protected Routes (/(app)/):**
- /dashboard - KPIs, recommendations, activity
- /agents - Agent browser with chat
- /agents/[id] - Chat interface
- /knowledge - KB management
- /inbox - Messaging
- /settings - User settings & OAuth integration
- /profile - User profile
- /integrations - OAuth2 management

**Public Routes:**
- /login, /register, /api/health

---

## Key Features

### 1. Knowledge Base System
- Create, edit, version control
- Vector embeddings (1536 dims) via OpenAI
- Hybrid search (vector + BM25)
- RAG (Retrieval-Augmented Generation) for agents
- Role-based access control (org/team/user)
- Full audit trail
- pgvector with HNSW index for fast similarity search

### 2. Authentication System
- Session-based (primary) + JWT (secondary)
- Password: bcrypt hashing
- Rate limiting (5 attempts = 15 min lockout)
- CSRF protection
- OAuth2 for integrations
- MFA support (code present)
- Email verification & password reset

### 3. OAuth2 Integrations
- Google, Microsoft, GitHub, Slack, Zoom, HubSpot, Stripe, etc.
- Encrypted token storage
- Automatic token refresh (partially implemented)
- Granular permission scopes

### 4. AI Services
- OpenAI integration (streaming responses)
- Specialized system prompts per agent
- Token tracking & cost calculation
- Conversation history management (last 10 messages)
- Error handling & retry logic

### 5. Real-Time Communication
- WebSocket server on Express
- Metrics broadcasting every 5 seconds
- Chat message streaming
- Status updates
- Known issue: Initial connection timing

### 6. Export System
- PDF, CSV, XLSX, PPTX formats
- Agent-specific exports
- Customizable templates

---

## Database Tables (15+ Total)

**Knowledge Base:**
- knowledgeBases, kbEntries, kbRevisions, kbChunks (with embeddings)
- kbComments, kbAudit, kbSearchLog, kbAccessRules

**Authentication:**
- users, userRoles, sessions, apiKeys

**OAuth2:**
- oauthIntegrations, oauthAuthorizationCodes

**Agent:**
- agentMessages

**Optional:**
- aiUsage (token tracking)

---

## API Endpoints

**Agents:**
- GET /api/agents (list)
- POST /api/agents/{id}/chat (streaming)
- GET /api/unified-agents (unified view)
- GET /api/unified-agents/health (system health)

**Knowledge:**
- GET /api/knowledge
- POST /api/knowledge/search
- POST /api/knowledge/ask (RAG)

**Auth:**
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

**OAuth:**
- GET /api/oauth/callback
- POST /api/integrations/{id}/auth

**Export:**
- POST /api/export/pdf|csv|xlsx|pptx

---

## Services Architecture

**AgentManager** - Central agent coordinator (Singleton)
**ChatService** - Message handling & persistence
**DexterAnalysisService** - Financial analysis
**BrainAI** - Shared context & memory
**WebSocketService** - Real-time communication
**OAuth Service** - Token management
**Knowledge Service** - RAG & search

---

## Security Features

✅ Password hashing (bcrypt)
✅ Session tokens with hash verification
✅ HTTP-only secure cookies
✅ CSRF protection
✅ Rate limiting on auth
✅ Role-based access control
✅ SQL injection prevention (ORM)
✅ OAuth2 secure flow
✅ Encrypted token storage
✅ Input validation (Zod)

⚠️ Areas for improvement:
- MFA enforcement
- API rate limiting (broader coverage)
- WebSocket auth/validation
- Token refresh automation

---

## Deployment

**Development:**
```bash
npm run dev              # Frontend + Backend concurrent
npm run dev:frontend    # Port 3000
npm run dev:backend     # Port 4002
```

**Production:**
- Database: Neon Cloud PostgreSQL
- Frontend: Next.js static + server
- Backend: Node.js Express
- Cache: Redis (optional)
- Job Queue: BullMQ (optional)

---

## Known Issues

1. **WebSocket Connection Timing:**
   - Initial connection fails, recovers after page refresh
   - Related to client-side initialization race condition

2. **OAuth Token Refresh:**
   - Token expiry handling incomplete
   - Needs automatic refresh flow

3. **Missing UI Tab:**
   - "Pipeline tab will not be displayed"
   - Route/component configuration issue

4. **API 401 Errors:**
   - Some endpoints return 401 after login
   - Token validation or header mismatch issue

---

## Recommendations

**Short Term:**
- Fix WebSocket initialization
- Complete OAuth token refresh
- Add API rate limiting
- Fix 401 errors

**Medium Term:**
- Implement distributed caching (Redis)
- Add API gateway
- Comprehensive monitoring
- Complete audit logging

**Long Term:**
- Microservices architecture
- Event-driven patterns (message queue)
- Advanced search (Elasticsearch)
- GraphQL API layer

---

**Report Generated:** 2025-11-12
**System Version:** 3.0.0
**Status:** Production-Ready (minor issues noted)

