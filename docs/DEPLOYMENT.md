# Flowent AI - Production Deployment Guide

This guide covers deploying Flowent AI to production with proper security, real-time voice support, and performance optimizations.

## Deployment Strategies

### Recommended: Split Deployment Architecture

For optimal performance with voice mode (Flowent Horizon), we recommend splitting frontend and backend:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────────────────────────────┐  │
│  │   VERCEL     │────▶│  Next.js Frontend (Edge Network)    │  │
│  │   $0-20/mo   │     │  - Automatic SSL, CDN caching       │  │
│  └──────────────┘     └──────────────────────────────────────┘  │
│         │ WebSocket + API                                        │
│         ▼                                                        │
│  ┌──────────────┐     ┌──────────────────────────────────────┐  │
│  │   RAILWAY    │────▶│  Express.js + Socket.IO Backend     │  │
│  │   $7-20/mo   │     │  - /voice namespace (Voice Mode)    │  │
│  └──────────────┘     │  - Long-running WebSocket process   │  │
│         │             └──────────────────────────────────────┘  │
│         ▼                                                        │
│  ┌──────────────┐     ┌──────────────────────────────────────┐  │
│  │   SUPABASE   │────▶│  PostgreSQL + pgvector              │  │
│  │   $0-25/mo   │     │  - Managed backups, connection pool │  │
│  └──────────────┘     └──────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Why Split Deployment for Voice Mode?**

| Benefit | Explanation |
|---------|-------------|
| **WebSocket Support** | Voice mode requires long-running Socket.IO connections |
| **Edge Performance** | Frontend served from CDN closest to users |
| **Independent Scaling** | Scale voice backend separately from frontend |
| **Cost Efficiency** | Pay only for what you use on each platform |

---

## Vercel Frontend Deployment

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Deployment Steps](#deployment-steps)
4. [Security Configuration](#security-configuration)
5. [Post-Deployment Checklist](#post-deployment-checklist)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- [ ] Vercel account connected to your GitHub repository
- [ ] Node.js 18.x or higher
- [ ] All dependencies installed (`npm install`)
- [ ] Build passes locally (`npm run build`)

---

## Environment Variables

### Server-Side Variables (Set in Vercel Dashboard)

These variables are stored securely on Vercel and never exposed to the client:

| Variable | Required | Description |
|----------|----------|-------------|
| `TAVILY_API_KEY` | Optional | Enables real web search for agents. Get key at [tavily.com](https://tavily.com) |
| `DATABASE_URL` | Required | PostgreSQL connection string (Vercel Postgres or external) |
| `REDIS_URL` | Optional | Redis connection for caching/sessions |
| `SENTRY_DSN` | Optional | Sentry error tracking DSN |
| `SENTRY_AUTH_TOKEN` | Optional | Sentry auth token for source maps |

### Client-Side Variables (User BYO-Key Model)

These keys are stored in the user's browser LocalStorage and never touch your server:

| Key | Storage | Description |
|-----|---------|-------------|
| `openai-api-key` | LocalStorage | User's OpenAI API key for GPT-4 |
| `resend-api-key` | LocalStorage | User's Resend API key for email sending |
| `slack-webhook-url` | LocalStorage | User's Slack webhook URL for notifications |

**Security Note:** The BYO-Key model means users bring their own API keys. This keeps costs on the user and protects you from key exposure. Keys are only sent directly from the browser to the respective APIs (OpenAI, Resend, Slack).

---

## Deployment Steps

### Step 1: Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Select the `main` branch for production

### Step 2: Configure Build Settings

Vercel auto-detects Next.js. Verify these settings:

```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### Step 3: Set Environment Variables

1. Go to **Project Settings > Environment Variables**
2. Add each server-side variable:

```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/flowent_ai

# Optional - Web Search
TAVILY_API_KEY=tvly-xxxxxxxxxx

# Optional - Error Tracking
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
```

3. Set scope to **Production** (and Preview if needed)

### Step 4: Deploy

1. Click **Deploy**
2. Wait for build to complete (typically 2-3 minutes)
3. Verify deployment at your Vercel URL

---

## Security Configuration

### Content Security Policy (CSP)

The app includes a comprehensive CSP in `next.config.js` that:

- Allows OpenAI API streaming (`connect-src https://api.openai.com`)
- Allows Resend email sending (`connect-src https://api.resend.com`)
- Allows Slack webhooks (`connect-src https://hooks.slack.com`)
- Allows Tavily web search (`connect-src https://api.tavily.com`)
- Allows Vercel Analytics (`connect-src https://vitals.vercel-insights.com`)
- Blocks clickjacking (`X-Frame-Options: DENY`)
- Prevents MIME sniffing (`X-Content-Type-Options: nosniff`)

### HSTS (HTTP Strict Transport Security)

Production deployments include HSTS:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Security Headers Applied

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | DENY | Prevent clickjacking |
| `X-Content-Type-Options` | nosniff | Prevent MIME sniffing |
| `X-XSS-Protection` | 1; mode=block | Legacy XSS protection |
| `Referrer-Policy` | strict-origin-when-cross-origin | Control referrer info |
| `Permissions-Policy` | camera=(), microphone=(), geolocation=() | Restrict browser APIs |

---

## Post-Deployment Checklist

### Functionality Tests

- [ ] Homepage loads correctly
- [ ] Login/authentication works
- [ ] Agent chat streaming works with user's OpenAI key
- [ ] Web search works (if TAVILY_API_KEY is set)
- [ ] Email sending works (if user has Resend key configured)
- [ ] Slack notifications work (if user has webhook configured)

### Performance Tests

- [ ] Lighthouse score > 90 (Performance)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] No console errors in production

### Security Tests

- [ ] Security headers present (check [securityheaders.com](https://securityheaders.com))
- [ ] HTTPS enforced (no mixed content)
- [ ] No exposed API keys in client bundle
- [ ] CSP not blocking required resources

### SEO Verification

- [ ] Title and meta description correct
- [ ] Open Graph image loads (check with [opengraph.xyz](https://www.opengraph.xyz))
- [ ] robots.txt accessible at `/robots.txt`
- [ ] sitemap.xml accessible at `/sitemap.xml`

---

## Troubleshooting

### Build Errors

**Error: Module not found**
```bash
# Ensure all dependencies are installed
npm install
```

**Error: TypeScript errors**
```bash
# Run type check
npm run type-check
# or
npx tsc --noEmit
```

### Runtime Errors

**Error: OpenAI API key invalid**
- User needs to enter their OpenAI key in Settings > API Keys
- Key format should start with `sk-`

**Error: Stream connection failed**
- Check CSP allows `connect-src https://api.openai.com`
- Verify the chat route is using Edge Runtime

**Error: Database connection failed**
- Verify `DATABASE_URL` is set correctly in Vercel
- Check database allows connections from Vercel IPs

### Performance Issues

**Slow initial load**
- Enable Vercel Edge caching
- Check for large bundle sizes with `npm run analyze`

**Streaming feels laggy**
- Edge Runtime is recommended for streaming
- Check network tab for proper SSE connection

---

## Edge Runtime Notes

The chat API route (`app/api/chat/route.ts`) uses Edge Runtime for optimal streaming:

```typescript
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
```

Benefits:
- Lower latency (runs at edge locations near users)
- Better streaming performance
- Automatic scaling

Limitations:
- No Node.js native modules
- Limited to Web APIs
- 25MB function size limit

---

## Custom Domain Setup

1. Go to **Project Settings > Domains**
2. Add your domain (e.g., `app.flowent.ai`)
3. Configure DNS:
   - **A Record:** `76.76.21.21`
   - **CNAME:** `cname.vercel-dns.com`
4. SSL certificate is automatically provisioned

---

## Analytics & Monitoring

### Vercel Analytics (Included)

- Real User Monitoring (RUM)
- Web Vitals tracking
- Automatic integration via `@vercel/analytics`

### Vercel Speed Insights (Included)

- Performance scoring
- Core Web Vitals breakdown
- Automatic integration via `@vercel/speed-insights`

### Sentry Error Tracking (Optional)

If `SENTRY_DSN` is configured:
- Automatic error capturing
- Source maps for stack traces
- Performance tracing

---

## Rollback Procedure

If a deployment causes issues:

1. Go to **Deployments** tab in Vercel
2. Find the last working deployment
3. Click **...** > **Promote to Production**

---

## Support

For issues specific to:
- **Vercel deployment:** [vercel.com/docs](https://vercel.com/docs)
- **Next.js:** [nextjs.org/docs](https://nextjs.org/docs)
- **Flowent AI:** Check the repository issues or documentation

---

---

## Voice Mode (Flowent Horizon) Configuration

### CORS Settings for WebSocket

For voice mode to work correctly, CORS must be configured precisely on the backend:

```typescript
// server/index.ts
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || [
  'https://flowent.ai',
  'https://www.flowent.ai',
];

// Socket.IO CORS
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});
```

### Environment Variables for Voice Mode

```env
# Backend (Railway/Render)
CORS_ORIGINS=https://flowent.ai,https://www.flowent.ai
TTS_MODEL=tts-1
TTS_VOICE=alloy
STT_MODEL=whisper-1

# Frontend (Vercel)
NEXT_PUBLIC_API_URL=https://api.flowent.ai
NEXT_PUBLIC_WS_URL=wss://api.flowent.ai
```

### Nginx WebSocket Proxy (for VPS)

```nginx
server {
    listen 443 ssl http2;
    server_name api.flowent.ai;

    # WebSocket support for /socket.io/
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;

        # Long timeout for voice sessions
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Railway Backend Deployment

1. Create new project on [railway.app](https://railway.app)
2. Connect GitHub repository
3. Set start command: `npx tsx server/index.ts`
4. Add environment variables (see above)
5. Railway supports WebSockets automatically

---

## Production Checklist

### Security

- [ ] JWT secrets generated with `openssl rand -base64 64`
- [ ] CORS_ORIGINS set to exact production domains
- [ ] SSL/TLS certificates valid (HTTPS + WSS)
- [ ] Database and Redis not publicly accessible

### Voice Mode

- [ ] WebSocket connection works (`wss://api.flowent.ai/voice`)
- [ ] Microphone permission granted
- [ ] Audio playback works (TTS streaming)
- [ ] Barge-In interruption works

### Database

- [ ] Migrations applied (`npx prisma migrate deploy`)
- [ ] pgvector extension enabled
- [ ] Backups configured

---

## PM2 Deployment (VPS)

For bare-metal VPS deployment (Hetzner, DigitalOcean):

```bash
# Install PM2
npm install -g pm2

# Start with ecosystem file
pm2 start ecosystem.config.js --env production

# Save and setup startup
pm2 save
pm2 startup
```

See `ecosystem.config.js` for full configuration.

---

*Last updated: January 2025*
*Flowent AI Platform - Production Deployment Guide*
