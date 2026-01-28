# SINTRA AI-Agent System - Production Deployment Checklist

**Version:** 2.0.0
**Last Updated:** 2025-10-25

---

## Pre-Deployment Checklist

### 1. Environment Configuration

#### ✅ Required Environment Variables

```bash
# Production .env file
OPENAI_API_KEY=sk-... # Real production key
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=2000

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://...
DATABASE_POOLING=true
DATABASE_MAX_CONNECTIONS=20

# Authentication
JWT_SECRET=<strong-random-secret-64chars>
SESSION_SECRET=<strong-random-secret-64chars>
CSRF_SECRET=<strong-random-secret-64chars>

# Application
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://yourdomain.com
PORT=3001

# Redis (if using for caching/sessions)
REDIS_URL=redis://...

# Monitoring (optional)
SENTRY_DSN=https://... # Error tracking
LOG_LEVEL=error # production logging
```

#### ⚠️ Security Checks

- [ ] All `.env.local` files in `.gitignore`
- [ ] No API keys committed to Git history
- [ ] Rotate all secrets from development
- [ ] Use environment-specific secrets
- [ ] Enable environment variable encryption

---

### 2. Database Setup

#### ✅ Migrations

```bash
# Run all migrations
npm run db:push

# Verify tables exist
psql $DATABASE_URL -c "\dt"
```

**Required Tables:**
- [ ] `users`
- [ ] `sessions`
- [ ] `refresh_tokens`
- [ ] `knowledge_bases`
- [ ] `kb_entries`
- [ ] `kb_revisions`
- [ ] `kb_chunks`
- [ ] `agent_messages`
- [ ] `agent_conversations`
- [ ] `ai_usage` ✅

#### ✅ Indexes

```bash
# Verify all indexes exist
psql $DATABASE_URL -c "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public';"
```

**Critical Indexes:**
- [ ] `agent_messages_user_agent_idx`
- [ ] `agent_messages_created_idx`
- [ ] `ai_usage_user_agent_idx`
- [ ] `ai_usage_created_idx`
- [ ] `kb_chunks_embedding_idx` (pgvector HNSW)

#### ✅ Constraints

- [ ] CHECK constraint on `agent_messages.role` (user/assistant)
- [ ] Foreign keys where applicable
- [ ] NOT NULL on required fields

---

### 3. Security Hardening

#### ✅ API Security

- [ ] **Rate Limiting** - Implement per-user limits
  ```typescript
  // Recommended: 100 requests/hour per user
  // 1000 requests/hour per IP
  ```

- [ ] **CORS Configuration** - Whitelist production domains
  ```typescript
  const allowedOrigins = [
    'https://yourdomain.com',
    'https://www.yourdomain.com'
  ];
  ```

- [ ] **Helmet.js** - Security headers
  ```bash
  npm install helmet
  ```

- [ ] **HTTPS Only** - Redirect HTTP → HTTPS
- [ ] **CSP Headers** - Content Security Policy
- [ ] **HSTS** - HTTP Strict Transport Security

#### ✅ Authentication

- [ ] Session timeout: 7 days
- [ ] Refresh token rotation enabled
- [ ] CSRF protection active
- [ ] Password requirements enforced
- [ ] Email verification enabled
- [ ] Rate limit on login attempts (5/15min)

#### ✅ Data Protection

- [ ] Database connections encrypted (SSL)
- [ ] API keys stored in environment only
- [ ] User passwords hashed (bcrypt, salt rounds: 10)
- [ ] No sensitive data in logs
- [ ] PII handling compliant (GDPR)

---

### 4. Performance Optimization

#### ✅ Frontend

- [ ] Enable Next.js production build
  ```bash
  npm run build
  NODE_ENV=production npm start
  ```

- [ ] Image optimization (Next.js Image)
- [ ] Code splitting enabled
- [ ] Minification enabled
- [ ] Gzip/Brotli compression
- [ ] CDN for static assets

#### ✅ Backend

- [ ] Database connection pooling (max: 20)
- [ ] Redis caching for sessions
- [ ] OpenAI request timeout (30s)
- [ ] Streaming buffer optimization
- [ ] Database query optimization

#### ✅ Monitoring Thresholds

| Metric | Target | Alert If |
|--------|--------|----------|
| Response Time (p95) | < 2s | > 5s |
| Error Rate | < 1% | > 5% |
| Database CPU | < 70% | > 85% |
| Memory Usage | < 80% | > 90% |
| OpenAI Token/Day | < 10M | > 15M |

---

### 5. Monitoring & Logging

#### ✅ Error Tracking

- [ ] **Sentry** for error monitoring
  ```bash
  npm install @sentry/nextjs
  ```

- [ ] **LogRocket** for session replay (optional)
- [ ] Custom error boundaries in React
- [ ] Server-side error logging

#### ✅ Analytics

- [ ] **Mixpanel** or **Google Analytics** for user behavior
- [ ] Custom events for key actions:
  - Agent chat started
  - Message sent
  - Error occurred
  - Token usage milestones

#### ✅ APM (Application Performance Monitoring)

- [ ] **Vercel Analytics** (if deploying to Vercel)
- [ ] **New Relic** or **DataDog** (enterprise)
- [ ] Custom metrics endpoint `/api/metrics`

#### ✅ Database Monitoring

- [ ] Neon dashboard alerts configured
- [ ] Slow query logging enabled
- [ ] Connection pool monitoring
- [ ] Disk space alerts

---

### 6. Cost Management

#### ✅ OpenAI Usage

- [ ] Monthly budget set: $_____
- [ ] Alert at 80% of budget
- [ ] Per-user token limits enforced
- [ ] Cost tracking dashboard operational
- [ ] Usage reports to stakeholders (weekly)

**Estimated Costs (GPT-4 Turbo):**
- Light usage (100 users, 10 msgs/day): ~$150/month
- Medium usage (500 users, 20 msgs/day): ~$1,500/month
- Heavy usage (2000 users, 50 msgs/day): ~$15,000/month

#### ✅ Database Costs

- [ ] Neon plan appropriate for scale
- [ ] Autoscaling limits set
- [ ] Storage optimization (old message cleanup)

#### ✅ Hosting Costs

- [ ] Server resources right-sized
- [ ] CDN costs estimated
- [ ] Redis costs (if using)

---

### 7. Backup & Disaster Recovery

#### ✅ Database Backups

- [ ] Neon automatic backups enabled (daily)
- [ ] Retention: 30 days minimum
- [ ] Point-in-time recovery tested
- [ ] Backup restoration procedure documented

#### ✅ Code Backups

- [ ] Git repository on GitHub/GitLab
- [ ] Protected main branch
- [ ] Release tags for versions
- [ ] Deployment rollback procedure tested

#### ✅ Disaster Recovery Plan

- [ ] RTO (Recovery Time Objective): < 2 hours
- [ ] RPO (Recovery Point Objective): < 15 minutes
- [ ] Incident response playbook created
- [ ] On-call rotation established

---

### 8. Testing (Pre-Production)

#### ✅ Functional Testing

- [ ] All critical paths tested
- [ ] Authentication flow end-to-end
- [ ] Agent chat full workflow
- [ ] Error handling scenarios
- [ ] Mobile responsive testing

#### ✅ Performance Testing

- [ ] Load testing (100 concurrent users)
- [ ] Stress testing (find breaking point)
- [ ] Spike testing (sudden traffic surge)
- [ ] Database query performance

#### ✅ Security Testing

- [ ] OWASP Top 10 audit
- [ ] Penetration testing (optional)
- [ ] Dependency vulnerability scan
  ```bash
  npm audit
  npm audit fix
  ```

#### ✅ User Acceptance Testing (UAT)

- [ ] Beta users tested all features
- [ ] Feedback collected and addressed
- [ ] Edge cases validated
- [ ] Documentation reviewed

---

### 9. Documentation

#### ✅ User Documentation

- [ ] Getting Started Guide
- [ ] Agent capabilities explained
- [ ] FAQ section
- [ ] Troubleshooting guide

#### ✅ Technical Documentation

- [ ] API documentation (if exposing APIs)
- [ ] Database schema documented
- [ ] Architecture diagrams updated
- [ ] Deployment guide
- [ ] Runbook for common operations

#### ✅ Internal Documentation

- [ ] Onboarding guide for developers
- [ ] Code contribution guidelines
- [ ] Security protocols
- [ ] Incident response procedures

---

### 10. Deployment Steps

#### ✅ Pre-Deployment

1. [ ] Create production branch from `main`
2. [ ] Run final test suite
   ```bash
   npm run test
   npm run test:e2e
   ```
3. [ ] Build production bundle
   ```bash
   npm run build
   ```
4. [ ] Verify build artifacts
5. [ ] Tag release in Git
   ```bash
   git tag -a v2.0.0 -m "Production release v2.0.0"
   git push origin v2.0.0
   ```

#### ✅ Deployment

**Option A: Vercel (Recommended for Next.js)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add OPENAI_API_KEY production
vercel env add DATABASE_URL production
# ... etc
```

**Option B: Docker + Cloud Run / ECS**
```bash
# Build Docker image
docker build -t sintra-ai:2.0.0 .

# Push to registry
docker push your-registry/sintra-ai:2.0.0

# Deploy to cloud
# (specific commands depend on cloud provider)
```

**Option C: Traditional Server (Node.js)**
```bash
# On production server
git clone <repo>
cd sintra-system
npm ci --production
npm run build
pm2 start npm --name "sintra" -- start
pm2 save
```

#### ✅ Post-Deployment

1. [ ] Smoke test production URL
   ```bash
   curl https://yourdomain.com/api/health
   ```
2. [ ] Verify database connectivity
3. [ ] Test authentication flow
4. [ ] Send test message to agent
5. [ ] Check error logging working
6. [ ] Monitor metrics for 1 hour
7. [ ] Notify stakeholders of successful deployment

---

### 11. Post-Deployment Monitoring

#### ✅ First 24 Hours

- [ ] Monitor error rates (< 1%)
- [ ] Check response times (p95 < 2s)
- [ ] Verify token usage tracking
- [ ] Review user feedback
- [ ] Check database performance
- [ ] Monitor costs accumulating correctly

#### ✅ First Week

- [ ] Weekly usage report generated
- [ ] No critical bugs reported
- [ ] Performance stable
- [ ] Cost within budget
- [ ] User satisfaction survey sent

#### ✅ Ongoing

- [ ] Weekly usage and cost review
- [ ] Monthly security audit
- [ ] Quarterly performance optimization
- [ ] Continuous dependency updates

---

### 12. Rollback Plan

#### ✅ If Critical Issues Occur

**Immediate Actions:**
1. [ ] Notify team on Slack/Discord
2. [ ] Assess severity (critical/high/medium/low)
3. [ ] If critical: Execute rollback immediately

**Rollback Steps (Vercel):**
```bash
# Instant rollback to previous deployment
vercel rollback
```

**Rollback Steps (Docker):**
```bash
# Redeploy previous version
docker pull your-registry/sintra-ai:1.9.0
docker stop sintra-current
docker run -d --name sintra-current your-registry/sintra-ai:1.9.0
```

**Database Rollback:**
```bash
# Restore from backup (if schema changed)
pg_restore -d $DATABASE_URL backup.dump
```

**Communication:**
- [ ] Update status page
- [ ] Email affected users
- [ ] Post-mortem within 48 hours

---

### 13. Compliance & Legal

#### ✅ Data Privacy

- [ ] Privacy Policy updated
- [ ] Terms of Service reviewed
- [ ] Cookie consent implemented (EU)
- [ ] GDPR compliance verified
- [ ] CCPA compliance (California)
- [ ] Data retention policy enforced

#### ✅ AI/ML Specific

- [ ] OpenAI Terms of Service accepted
- [ ] User data handling with OpenAI clarified
- [ ] AI-generated content disclosure
- [ ] User consent for AI interactions

---

### 14. Success Criteria

Deployment is considered successful when:

- [ ] ✅ All services operational (uptime > 99.9%)
- [ ] ✅ Error rate < 1%
- [ ] ✅ Response time p95 < 2 seconds
- [ ] ✅ Zero data loss incidents
- [ ] ✅ Authentication working flawlessly
- [ ] ✅ OpenAI integration stable
- [ ] ✅ Token tracking accurate
- [ ] ✅ No security vulnerabilities
- [ ] ✅ User satisfaction > 4/5 (survey)
- [ ] ✅ Costs within 10% of projections

---

## Quick Reference

### Critical Contacts

- **DevOps Lead:** _______
- **Backend Lead:** _______
- **Frontend Lead:** _______
- **Product Owner:** _______
- **Security Officer:** _______
- **On-Call Rotation:** PagerDuty/OpsGenie

### Emergency Procedures

**High Error Rate:**
1. Check Sentry dashboard
2. Review recent deployments
3. Check OpenAI status page
4. Investigate database performance
5. Rollback if necessary

**Database Down:**
1. Check Neon dashboard
2. Verify connection string
3. Restart connection pool
4. Restore from backup if corrupted

**OpenAI API Down:**
1. Check OpenAI status page
2. Implement fallback responses (optional)
3. Queue messages for retry (optional)
4. Notify users of degraded service

---

**Document Version:** 1.0
**Last Updated:** 2025-10-25
**Next Review:** Before production deployment

✅ **Ready for Production Deployment**
