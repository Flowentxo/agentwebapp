# BullMQ Queue Name Fix – Behebung der 500-Fehler

## Problem

Der "Serverfehler. Bitte versuche es erneut oder kontaktiere den Support." nach den Drizzle-Fixes wurde durch **BullMQ Queue-Namen mit Doppelpunkten** verursacht.

### Technische Ursache

BullMQ verwendet intern Doppelpunkte (`:`) zur Trennung von Redis-Key-Komponenten:
- `bull:queue-name:meta`
- `bull:queue-name:wait`
- `bull:queue-name:active`

Wenn Queue-Namen selbst Doppelpunkte enthalten (z.B. `knowledge:index`), entstehen Redis-Key-Konflikte:
- ❌ `bull:knowledge:index:meta` → Mehrdeutig: Ist der Queue-Name `knowledge` oder `knowledge:index`?
- ✅ `bull:knowledge-index:meta` → Eindeutig: Queue-Name ist `knowledge-index`

## Implementierte Lösung

### 1. Queue-Namen korrigiert

**Datei:** `workers/queues.ts`

```typescript
// ❌ Vorher (falsch)
export const indexQueue = new Queue('knowledge:index', { ... });

// ✅ Nachher (korrekt)
const QUEUE_NAME = 'knowledge-index';
validateQueueName(QUEUE_NAME);
export const indexQueue = new Queue(QUEUE_NAME, { ... });
```

### 2. Job-Namen korrigiert

```typescript
// ❌ Vorher
await indexQueue.add('index:revision', { revisionId });
await indexQueue.add('reindex:kb', { kbId });

// ✅ Nachher
const JOB_INDEX_REVISION = 'index-revision';
const JOB_REINDEX_KB = 'reindex-kb';

validateQueueName(JOB_INDEX_REVISION);
validateQueueName(JOB_REINDEX_KB);

await indexQueue.add(JOB_INDEX_REVISION, { revisionId });
await indexQueue.add(JOB_REINDEX_KB, { kbId });
```

### 3. Validierungsfunktion hinzugefügt

**Datei:** `workers/queues.ts:9-24`

```typescript
/**
 * Validates BullMQ queue/job names according to BullMQ requirements.
 * Queue names MUST NOT contain colons (:) as they conflict with Redis key patterns.
 * @throws Error if name contains invalid characters
 */
export function validateQueueName(name: string): void {
  if (name.includes(':')) {
    throw new Error(
      `Invalid queue/job name "${name}": contains ':' which conflicts with BullMQ Redis key patterns. Use hyphens instead.`
    );
  }
  if (!name || name.trim().length === 0) {
    throw new Error('Queue/job name cannot be empty');
  }
  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(
      `Invalid queue/job name "${name}": only alphanumeric characters, hyphens, and underscores are allowed`
    );
  }
}
```

### 4. Worker aktualisiert

**Datei:** `workers/indexer.ts:10-11, 22, 58`

```typescript
// Job-Name-Konstanten (müssen mit queues.ts übereinstimmen)
const JOB_INDEX_REVISION = 'index-revision';
const JOB_REINDEX_KB = 'reindex-kb';

const worker = new Worker('knowledge-index', async (job) => {
  if (job.name === JOB_INDEX_REVISION) {
    // Revision indexieren
  }
  if (job.name === JOB_REINDEX_KB) {
    // Knowledge Base neu indexieren
  }
});
```

## Betroffene Dateien

- ✅ `workers/queues.ts` – Queue-Definition, Validierung, Enqueue-Funktionen
- ✅ `workers/indexer.ts` – Worker-Implementierung
- ✅ `app/api/knowledge/route.ts` – Verwendet `enqueueIndexRevision()`
- ✅ `app/api/knowledge/[id]/revise/route.ts` – Verwendet `enqueueIndexRevision()`

## Deployment-Schritte

### Voraussetzung: Redis muss laufen

```bash
# Redis-Status prüfen
npx ts-node scripts/check-redis.ts

# Falls Redis nicht läuft, starten (je nach Installation):
# Windows: redis-server
# Linux/Mac: sudo service redis-server start
# Docker: docker run -d -p 6379:6379 redis:latest
```

### 1. Alte Queue-Keys aus Redis löschen

```bash
npx ts-node scripts/flush-redis-queues.ts
```

**Was wird gelöscht:**
- `bull:knowledge:index:*`
- `bull:sintra:reindex:*`
- `knowledge:index:*`
- `sintra:reindex:*`

### 2. Worker neu starten

```bash
# Worker stoppen (falls laufend)
# Dann neu starten mit:
node workers/indexer.js
# oder
npm run worker:knowledge
```

### 3. Anwendung neu starten

```bash
npm run dev
# oder
npm start
```

## Verifikation

### 1. Redis-Keys prüfen

```bash
npx ts-node scripts/check-redis.ts
```

**Erwartete Ausgabe:**
```
✅ Redis is connected
📋 BullMQ keys: 5
📊 Active queues:
   - knowledge-index
✅ No problematic queue patterns found
```

### 2. Auth-Endpoint testen

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agent-system.com","password":"admin123"}'
```

**Erwartetes Ergebnis:**
- ✅ 200 OK mit Session-Cookie
- ❌ Keine 500 Server-Fehler mehr

### 3. Knowledge-Base-Indexierung testen

```bash
# Neuen Eintrag erstellen
curl -X POST http://localhost:4000/api/knowledge \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "kbId": "...",
    "title": "Test Entry",
    "source": {"type": "note", "contentMd": "# Test\nContent"}
  }'
```

**Prüfen:**
- Worker-Logs zeigen: `[Worker] Indexing revision ...`
- Keine Redis-Fehler in den Logs

## Fehlersuche

### Problem: Redis-Verbindungsfehler

```
Error: Connection is closed.
```

**Lösung:**
1. Redis-Status prüfen: `redis-cli ping`
2. `REDIS_URL` in `.env` überprüfen
3. Redis starten

### Problem: "Queue name cannot contain :"

```
Error: Invalid queue/job name "knowledge:index": contains ':'
```

**Lösung:**
- Code-Suche: `grep -r "knowledge:" --include="*.ts"`
- Alle Vorkommen durch `knowledge-` ersetzen

### Problem: Jobs werden nicht verarbeitet

**Prüfen:**
1. Worker läuft: `ps aux | grep indexer` (Linux/Mac) oder Task Manager (Windows)
2. Queue-Namen stimmen überein: `workers/queues.ts` vs. `workers/indexer.ts`
3. Redis-Keys prüfen: `npx ts-node scripts/check-redis.ts`

## Referenzen

- **BullMQ Dokumentation:** https://docs.bullmq.io/
- **BullMQ GitHub Issue:** https://github.com/taskforcesh/bullmq/issues/xxx (Queue name validation)
- **Redis Key Patterns:** https://redis.io/docs/manual/keyspace/

## Änderungshistorie

- **2025-10-24:** Initiale Implementierung
  - Queue-Namen-Validierung hinzugefügt
  - Alle Queue/Job-Namen von Doppelpunkten auf Bindestriche umgestellt
  - Redis-Flush- und Check-Scripts erstellt
