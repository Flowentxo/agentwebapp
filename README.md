<div align="center">

# 🚀 Flowent AI Studio

### Enterprise Workflow Automation Platform

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Proprietary-blue?style=flat-square)](LICENSE)

**Build, orchestrate, and deploy AI-powered automation workflows with natural language and visual tools.**

[Features](#-features) • [Quick Start](#-quick-start) • [Docker Deployment](#-docker-deployment) • [Architecture](#-architecture) • [API Docs](#-api-documentation)

</div>

---

## 📋 Overview

Flowent AI Studio is an enterprise-grade workflow automation platform that combines AI-powered workflow generation with a visual drag-and-drop builder. Using natural language prompts, users can create complex automation pipelines that integrate with any API, process data, and orchestrate multi-step operations.

### Key Capabilities

- **🤖 AI Workflow Architect**: Describe workflows in plain English, get production-ready pipelines
- **🎨 Visual Pipeline Builder**: React Flow-powered drag-and-drop workflow design
- **⚡ Real-Time Execution**: BullMQ-powered background processing with live status
- **🔍 Operational Intelligence**: Full-text search, metrics, and proactive alerting
- **🔐 Enterprise Security**: JWT auth, RBAC, audit logging, encrypted secrets

---

## ✨ Features

### Workflow Capabilities

| Feature | Description |
|---------|-------------|
| **AI Architect** | Generate workflows from natural language prompts |
| **Visual Editor** | Drag-and-drop React Flow canvas with 20+ node types |
| **Smart Variables** | Auto-mapped variable references between nodes |
| **Error Analysis** | AI-powered debugging with suggested fixes |
| **Template Gallery** | Pre-built templates for common automations |

### Node Library

| Category | Nodes |
|----------|-------|
| **Triggers** | Webhook, Schedule, Event |
| **Actions** | HTTP Request, Email, Slack, Database, AI Completion |
| **Logic** | IF/Else, Switch, Loop, Wait, Parallel |
| **Transform** | Set Variable, Map, Filter, Aggregate, Code |
| **Integrations** | HubSpot, Salesforce, Google Sheets |

### Operational Features

| Feature | Description |
|---------|-------------|
| **Ops Dashboard** | Real-time metrics, charts, and system health |
| **Log Explorer** | Full-text search with PostgreSQL tsvector |
| **Queue Monitor** | BullMQ health monitoring with pause/resume |
| **Alert Rules** | Configurable alerting with Slack/Email/Webhook |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, React Flow |
| **Backend** | Express.js, TypeScript, Socket.IO |
| **Database** | PostgreSQL 16 with pgvector |
| **Queue** | Redis 7, BullMQ |
| **AI** | OpenAI GPT-4o, Claude 3.5 Sonnet |
| **Infrastructure** | Docker, Docker Compose |

---

## 🚀 Quick Start

### Prerequisites

- **Docker** & Docker Compose v2.0+
- **Git**

### One-Command Deployment

```bash
# Clone the repository
git clone https://github.com/your-org/flowent-ai-studio.git
cd flowent-ai-studio

# Copy and configure environment
cp .env.example .env
# Edit .env with your API keys (see Configuration section)

# Start everything
docker-compose up -d

# View logs
docker-compose logs -f
```

### Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Web Application |
| **API** | http://localhost:4000 | Backend API |
| **Health** | http://localhost:4000/api/health | Health Check |

### First Steps

1. **Create Admin User**
   ```bash
   docker-compose exec backend npm run db:seed
   ```

2. **Login**
   - Email: `admin@flowent.ai`
   - Password: `Admin123!`

3. **Create Your First Workflow**
   - Open the Workflow Architect (sidebar button)
   - Type: "When I receive a webhook, send an email notification"
   - Click "Apply to Canvas"
   - Save and deploy!

---

## 🐳 Docker Deployment

### Development

```bash
# Start all services
docker-compose up -d

# Start with background worker
docker-compose --profile with-worker up -d

# View logs
docker-compose logs -f backend

# Rebuild after changes
docker-compose build --no-cache
docker-compose up -d
```

### Production

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Start production stack
docker-compose -f docker-compose.yml up -d

# Scale workers
docker-compose up -d --scale worker=3
```

### Container Management

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: deletes data)
docker-compose down -v

# Restart a specific service
docker-compose restart backend

# View resource usage
docker stats
```

### Services Overview

| Container | Image | Port | Description |
|-----------|-------|------|-------------|
| `flowent-frontend` | `node:20-alpine` | 3000 | Next.js UI |
| `flowent-backend` | `node:20-alpine` | 4000 | Express API |
| `flowent-worker` | `node:20-alpine` | - | BullMQ Worker |
| `flowent-postgres` | `pgvector/pgvector:pg16` | 5432 | Database |
| `flowent-redis` | `redis:7-alpine` | 6379 | Queue/Cache |

---

## ⚙️ Configuration

### Required Environment Variables

```env
# Security (REQUIRED - Generate these!)
JWT_SECRET=your_64_character_jwt_secret_key_here
ENCRYPTION_KEY=your_32_byte_hex_encryption_key_64_chars
SESSION_SECRET=your_session_secret_32_chars

# AI Provider (REQUIRED for AI features)
OPENAI_API_KEY=sk-your-openai-api-key

# Database (defaults work with docker-compose)
POSTGRES_USER=flowent
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=flowent_db

# Redis (defaults work with docker-compose)
REDIS_PASSWORD=your_redis_password
```

### Generate Secure Keys

```bash
# Generate JWT_SECRET
openssl rand -base64 64

# Generate ENCRYPTION_KEY
openssl rand -hex 32

# Generate SESSION_SECRET
openssl rand -base64 32
```

### Optional Integrations

```env
# Email (SendGrid)
SENDGRID_API_KEY=SG.xxx

# Slack
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx

# HubSpot
HUBSPOT_CLIENT_ID=xxx
HUBSPOT_CLIENT_SECRET=xxx

# Google
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

See [`.env.example`](.env.example) for the complete configuration reference.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer                            │
│                    (Nginx / Cloud LB)                            │
└────────────────┬────────────────────────────────┬───────────────┘
                 │                                │
    ┌────────────▼────────────┐      ┌───────────▼───────────┐
    │      Frontend           │      │       Backend          │
    │   (Next.js - :3000)     │◄────►│   (Express - :4000)    │
    │                         │      │                        │
    │  • React Flow Editor    │      │  • REST API            │
    │  • Architect Sidebar    │      │  • WebSocket           │
    │  • Ops Dashboard        │      │  • AI Services         │
    └─────────────────────────┘      └───────────┬────────────┘
                                                  │
                 ┌────────────────────────────────┼────────────────┐
                 │                                │                │
    ┌────────────▼────────────┐      ┌───────────▼───────────┐    │
    │      PostgreSQL         │      │        Redis           │    │
    │    (pgvector - :5432)   │      │      (:6379)           │    │
    │                         │      │                        │    │
    │  • Workflows            │      │  • BullMQ Queues       │    │
    │  • Executions           │      │  • Session Cache       │    │
    │  • Vector Embeddings    │      │  • Rate Limiting       │    │
    └─────────────────────────┘      └────────────────────────┘    │
                                                                    │
                                     ┌─────────────────────────────▼┐
                                     │         Worker               │
                                     │    (BullMQ Processor)        │
                                     │                              │
                                     │  • Workflow Execution        │
                                     │  • Scheduled Jobs            │
                                     │  • Webhook Processing        │
                                     └──────────────────────────────┘
```

### Data Flow

1. **User Request** → Frontend (Next.js) → Backend API
2. **Workflow Execution** → Backend → Redis Queue → Worker
3. **Real-Time Updates** → Worker → Redis Pub/Sub → WebSocket → Frontend
4. **AI Generation** → Backend → OpenAI API → Response

---

## 📚 API Documentation

### Health Check

```bash
curl http://localhost:4000/api/health
```

### Authentication

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@flowent.ai", "password": "Admin123!"}'

# Response: { "token": "eyJhbG...", "user": {...} }
```

### Workflow Generation (AI Architect)

```bash
# Generate workflow from prompt
curl -X POST http://localhost:4000/api/architect/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "prompt": "When I receive a webhook, send email to the contact",
    "mode": "create"
  }'
```

### Workflow Execution

```bash
# Trigger workflow
curl -X POST http://localhost:4000/api/workflows/{id}/execute \
  -H "Authorization: Bearer <token>" \
  -d '{"input": {"email": "user@example.com"}}'
```

---

## 📁 Project Structure

```
flowent-ai-studio/
├── app/                      # Next.js App Router
│   ├── (app)/               # Protected routes
│   │   ├── dashboard/       # Main dashboard
│   │   ├── workflows/       # Workflow management
│   │   └── settings/        # User settings
│   └── api/                 # API routes
├── components/              # React components
│   ├── studio/              # Workflow editor
│   │   ├── sidebar/         # Architect sidebar
│   │   └── nodes/           # Custom node types
│   └── ops/                 # Ops dashboard
├── server/                  # Express backend
│   ├── controllers/         # Route handlers
│   ├── services/            # Business logic
│   │   ├── ai/              # AI services
│   │   └── monitoring/      # Ops services
│   └── middleware/          # Express middleware
├── lib/                     # Shared libraries
│   ├── db/                  # Database schema
│   └── ai/                  # AI utilities
├── workers/                 # Background jobs
├── hooks/                   # React hooks
├── docker/                  # Docker configuration
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── scripts/
│   └── init-scripts/
└── docker-compose.yml
```

---

## 🧪 Development

### Local Development (without Docker)

```bash
# Install dependencies
npm install

# Start PostgreSQL & Redis (via Docker)
docker-compose up -d postgres redis

# Run migrations
npm run db:push

# Start development servers
npm run dev         # Frontend + Backend
npm run dev:worker  # Background worker
```

### Testing

```bash
npm run test        # Unit tests
npm run test:e2e    # End-to-end tests
npm run lint        # Linting
npm run typecheck   # Type checking
```

---

## 🔧 Troubleshooting

### Common Issues

**Container won't start?**
```bash
# Check logs
docker-compose logs backend

# Verify environment
docker-compose config

# Reset and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

**Database connection failed?**
```bash
# Check PostgreSQL is healthy
docker-compose exec postgres pg_isready

# View PostgreSQL logs
docker-compose logs postgres
```

**Redis connection failed?**
```bash
# Test Redis
docker-compose exec redis redis-cli -a $REDIS_PASSWORD ping
```

---

## 📄 License

This project is proprietary software. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by the Flowent AI Team**

[Documentation](https://docs.flowent.ai) • [Support](mailto:support@flowent.ai)

</div>
