# 🚀 Getting Started - Sintra AI Orchestration Platform

**Willkommen bei Sintra AI - der führenden KI-Orchestrierungsplattform für intelligente Automatisierung und Workflow-Management.**

---

## 📋 Schnellstart-Übersicht

### **⚡ 5-Minuten Setup**

1. **🔐 Account erstellen**
   ```bash
   # Registrierung über die Web-Oberfläche
   https://app.sintra-ai.com/register
   ```

2. **🔑 API-Schlüssel generieren**
   ```bash
   # In den Einstellungen → API-Schlüssel
   # Kopieren Sie Ihren API-Schlüssel für spätere Verwendung
   ```

3. **🤖 Ersten Agent aktivieren**
   ```bash
   # Standard-Agent "Dexter" ist sofort verfügbar
   # Keine zusätzliche Konfiguration erforderlich
   ```

4. **💬 Erste Nachricht senden**
   ```bash
   curl -X POST https://api.sintra-ai.com/v3/agents/dexter/chat \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"content": "Hallo Dexter! Wie geht es dir?"}'
   ```

---

## 🏗️ Grundlegende Architektur

### **🧠 KI-Agenten**
- **Dexter**: Finanzanalyse und ROI-Berechnungen
- **Cassie**: Customer Success und Support
- **Emmie**: Marketing und Content-Erstellung
- **Aura**: Datenanalyse und Insights

### **📚 Wissensbasis**
- **Semantische Suche**: Intelligente Inhaltssuche
- **Vektor-Embeddings**: Fortgeschrittene Ähnlichkeitssuche
- **Kategorisierung**: Automatische Inhaltsorganisation

### **🔄 Workflow-Automatisierung**
- **Multi-Agent-Koordination**: Agenten arbeiten zusammen
- **Trigger-System**: Ereignisbasierte Automatisierung
- **API-Integration**: Externe Services anbinden

---

## 🛠️ Erste Schritte

### **1. Web-Oberfläche verwenden**

#### **Dashboard**
```bash
# Haupt-Dashboard aufrufen
https://app.sintra-ai.com/dashboard

# Funktionen:
- Agent-Übersicht
- Chat-Verlauf
- Analytics-Dashboard
- Einstellungen
```

#### **Agent-Chat**
```bash
# Mit Dexter chatten
https://app.sintra-ai.com/agents/dexter

# Beispiel-Interaktionen:
- "Berechne den ROI für eine Marketing-Kampagne mit 10.000€ Budget"
- "Analysiere die Verkaufszahlen des letzten Quartals"
- "Erstelle einen Finanzplan für Q1 2026"
```

#### **Wissensbasis**
```bash
# Wissensbasis durchsuchen
https://app.sintra-ai.com/knowledge

# Funktionen:
- Dokumente hochladen
- Semantische Suche
- Kategorien verwalten
- Versionierung
```

### **2. API-Integration**

#### **Basis-Setup**
```javascript
// JavaScript/TypeScript
import { SintraClient } from '@sintra-ai/sdk';

const client = new SintraClient({
  apiKey: 'your-api-key-here',
  baseUrl: 'https://api.sintra-ai.com/v3'
});

// Chat mit Dexter
const response = await client.agents.chat('dexter', {
  content: 'Hallo Dexter, hilf mir bei der Finanzanalyse'
});

console.log(response.content);
```

```python
# Python
from sintra_ai import SintraClient

client = SintraClient(
    api_key='your-api-key-here',
    base_url='https://api.sintra-ai.com/v3'
)

# Chat mit Dexter
response = client.agents.chat('dexter', {
    'content': 'Hallo Dexter, hilf mir bei der Finanzanalyse'
})

print(response.content)
```

#### **Streaming-Chat**
```javascript
// Streaming-Chat für Echtzeit-Responses
const stream = await client.agents.streamChat('dexter', {
  content: 'Erstelle einen detaillierten Geschäftsplan'
});

for await (const chunk of stream) {
  if (chunk.type === 'message') {
    process.stdout.write(chunk.content);
  }
}
```

#### **Wissensbasis-Suche**
```javascript
// Semantische Suche in der Wissensbasis
const results = await client.knowledge.search({
  query: 'Marketing ROI Berechnung Methoden',
  limit: 10
});

results.forEach(result => {
  console.log(`${result.entry.title}: ${result.score}`);
});
```

### **3. Agent-Konfiguration**

#### **Eigenen Agent erstellen**
```javascript
// Neuen Custom-Agent erstellen
const agent = await client.agents.create({
  name: 'Mein Marketing-Agent',
  type: 'custom',
  model: 'gpt-4-turbo',
  capabilities: [
    'content-creation',
    'seo-analysis',
    'campaign-optimization'
  ],
  configuration: {
    systemPrompt: 'Du bist ein Marketing-Experte...',
    temperature: 0.7,
    maxTokens: 2000
  }
});
```

#### **Agent-Verwaltung**
```javascript
// Agent-Status abrufen
const agents = await client.agents.list({
  status: 'active',
  type: 'chat'
});

// Agent-Informationen abrufen
const agent = await client.agents.get('agent-id');

// Agent-Konfiguration aktualisieren
await client.agents.update('agent-id', {
  status: 'maintenance',
  configuration: {
    temperature: 0.5
  }
});
```

---

## 🔧 Konfiguration

### **Umgebungsvariablen**

#### **Entwicklung**
```bash
# .env.local
SINTRA_API_KEY=your-development-api-key
SINTRA_BASE_URL=https://api.sintra-ai.com/v3
SINTRA_WORKSPACE_ID=your-workspace-id
NODE_ENV=development
```

#### **Produktion**
```bash
# .env.production
SINTRA_API_KEY=your-production-api-key
SINTRA_BASE_URL=https://api.sintra-ai.com/v3
SINTRA_WORKSPACE_ID=your-workspace-id
SINTRA_WEBHOOK_SECRET=your-webhook-secret
NODE_ENV=production
```

### **Workspace-Konfiguration**

#### **Workspace erstellen**
```javascript
// Workspace erstellen
const workspace = await client.workspaces.create({
  name: 'Mein Unternehmen',
  description: 'Workspace für Unternehmensanalysen',
  settings: {
    defaultAgent: 'dexter',
    autoArchive: true,
    retentionDays: 365
  }
});
```

#### **Workspace-Einstellungen**
```javascript
// Workspace-Konfiguration abrufen
const workspace = await client.workspaces.get('workspace-id');

// Einstellungen aktualisieren
await client.workspaces.update('workspace-id', {
  settings: {
    defaultAgent: 'cassie',
    maxConcurrentChats: 10,
    webhookUrl: 'https://your-app.com/webhooks/sintra'
  }
});
```

---

## 🔐 Authentifizierung

### **API-Schlüssel**

#### **Generierung**
```bash
# Über Web-Oberfläche
# Einstellungen → API-Schlüssel → Neuen Schlüssel erstellen

# Programmatically (Admin-Token erforderlich)
curl -X POST https://api.sintra-ai.com/v3/api-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Meine Anwendung",
    "scopes": ["agents:read", "agents:write", "knowledge:read"]
  }'
```

#### **Verwendung**
```bash
# In HTTP-Headern
Authorization: Bearer your-api-key-here

# In Query-Parametern (nicht empfohlen)
?api_key=your-api-key-here
```

### **Scopes und Berechtigungen**

#### **Verfügbare Scopes**
- `agents:read` - Agenten auflisten und abrufen
- `agents:write` - Agenten erstellen und ändern
- `agents:chat` - Mit Agenten chatten
- `knowledge:read` - Wissensbasis durchsuchen
- `knowledge:write` - Wissensbasis-Einträge erstellen/ändern
- `analytics:read` - Analytics-Daten abrufen
- `profile:read` - Profilinformationen abrufen
- `profile:write` - Profilinformationen ändern
- `admin:*` - Alle Admin-Funktionen

#### **Scope-Validierung**
```javascript
// Verfügbare Scopes für API-Schlüssel abrufen
const scopes = await client.apiKeys.getScopes('key-id');

// Scope-Berechtigungen prüfen
const hasPermission = await client.auth.hasScope('agents:chat');
```

---

## 📊 Monitoring und Analytics

### **System-Health**

#### **Health-Checks**
```bash
# Gesamt-System-Health
curl https://api.sintra-ai.com/v3/health

# Spezifische Services
curl https://api.sintra-ai.com/v3/health/openai
curl https://api.sintra-ai.com/v3/health/anthropic
curl https://api.sintra-ai.com/v3/health/database
curl https://api.sintra-ai.com/v3/health/redis
```

#### **Response-Format**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-14T21:01:01.000Z",
  "services": {
    "database": {
      "status": "healthy",
      "latency": 45,
      "details": {
        "connected": true,
        "currentTime": "2025-12-14 21:01:01.000Z"
      }
    },
    "openai": {
      "status": "healthy",
      "latency": 230,
      "details": {
        "configured": true,
        "modelsAvailable": 103
      }
    }
  }
}
```

### **Analytics-Dashboard**

#### **Überblick-Statistiken**
```javascript
// Analytics-Übersicht abrufen
const overview = await client.analytics.overview({
  period: 'month',
  startDate: '2025-11-01',
  endDate: '2025-11-30'
});

console.log({
  totalAgents: overview.totalAgents,
  activeAgents: overview.activeAgents,
  totalMessages: overview.totalMessages,
  averageResponseTime: overview.responseTime.average
});
```

#### **Agent-spezifische Analytics**
```javascript
// Analytics für spezifischen Agent
const agentAnalytics = await client.analytics.agents({
  agentId: 'dexter',
  period: 'week'
});

console.log({
  totalMessages: agentAnalytics.totalMessages,
  uniqueUsers: agentAnalytics.uniqueUsers,
  errorRate: agentAnalytics.errorRate,
  usageByHour: agentAnalytics.usageByHour
});
```

---

## 🆘 Troubleshooting

### **Häufige Probleme**

#### **1. Authentifizierung fehlgeschlagen**
```bash
# Problem: 401 Unauthorized
curl -X GET https://api.sintra-ai.com/v3/agents \
  -H "Authorization: Bearer invalid-key"

# Lösung: Gültigen API-Schlüssel verwenden
curl -X GET https://api.sintra-ai.com/v3/agents \
  -H "Authorization: Bearer your-valid-api-key"
```

#### **2. Rate Limit überschritten**
```bash
# Problem: 429 Too Many Requests
# Lösung: Rate Limits beachten
# - Standard: 1000 Requests/Stunde
# - Chat: 100 Requests/Stunde
# - Admin: 500 Requests/Stunde
```

#### **3. Agent nicht verfügbar**
```bash
# Problem: 404 Not Found
# Lösung: Agent-Status prüfen
curl https://api.sintra-ai.com/v3/agents/dexter

# Falls Agent inaktiv: Aktivieren
curl -X PUT https://api.sintra-ai.com/v3/agents/dexter \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

#### **4. Wissensbasis-Suche liefert keine Ergebnisse**
```javascript
// Problem: Leere Suchergebnisse
const results = await client.knowledge.search({
  query: 'irrelevanter Suchbegriff'
});

// Lösung: Bessere Suchbegriffe verwenden
const results = await client.knowledge.search({
  query: 'ROI Berechnung Marketing',
  filters: {
    category: 'finance'
  },
  limit: 20
});
```

### **Debug-Modus aktivieren**

#### **Client-seitig**
```javascript
// Debug-Logging aktivieren
const client = new SintraClient({
  apiKey: 'your-api-key',
  debug: true,
  logLevel: 'debug'
});
```

#### **Server-seitig**
```bash
# Environment-Variable setzen
DEBUG=sintra-ai:*

# Oder spezifische Komponenten
DEBUG=sintra-ai:api,sintra-ai:agents,sintra-ai:knowledge
```

### **Support kontaktieren**

#### **📧 E-Mail-Support**
```bash
support@sintra-ai.com

# Bitte folgende Informationen bereitstellen:
# - Fehlermeldung/Error-ID
# - API-Schlüssel (maskiert: sk-****1234)
# - Reproduktionsschritte
# - Erwartetes vs. tatsächliches Verhalten
```

#### **💬 Slack-Support**
```bash
# Workspace: sintra-ai-support
# Channel: #api-support
```

#### **🐛 Bug Reports**
```bash
# GitHub Issues verwenden
https://github.com/sintra-ai/platform/issues

# Template verwenden:
# - Title: [BUG] Kurze Beschreibung
# - Labels: bug, api, urgent
# - Environment: Development/Production
# - Steps to Reproduce
# - Expected vs Actual Behavior
```

---

## 🎯 Nächste Schritte

### **📚 Weitere Dokumentation**
- [`API-Referenz`](./api-endpoints.md) - Vollständige API-Dokumentation
- [`Agent-Entwicklung`](./custom-agents.md) - Eigene Agenten erstellen
- [`Workflow-Automatisierung`](./workflows.md) - Komplexe Automatisierung
- [`Integration-Guide`](./integrations-overview.md) - Externe Services anbinden

### **🔧 Tools und Utilities**
- [`Postman Collection`](./postman-collection.json) - API-Testing
- [`VS Code Extension`](./vscode-extension.md) - Entwicklungstools
- [`CLI-Tool`](./cli-tool.md) - Kommandozeilen-Interface

### **🎓 Schulungen**
- [`Video-Tutorials`](https://youtube.com/sintra-ai) - Schritt-für-Schritt Anleitungen
- [`Webinare`](https://sintra-ai.com/webinars) - Live-Schulungen
- [`Certification`](https://sintra-ai.com/certification) - Offizielle Zertifizierung

---

**🎉 Glückwunsch! Sie sind jetzt bereit, Sintra AI in Ihrer Anwendung zu verwenden.**

**Bei Fragen steht Ihnen unser Support-Team jederzeit zur Verfügung!**

---

**Letzte Aktualisierung**: December 14, 2025  
**Version**: 3.0.0  
**Nächste Überprüfung**: March 14, 2026