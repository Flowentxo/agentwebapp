# Flowent Enterprise Standards — Definition of Done

> **Version:** 1.0.0
> **Stand:** 15.02.2026
> **Geltungsbereich:** Alle 70 Agenten der Expansion Wave 1
> **Qualitaetsanspruch:** Enterprise Grade

---

## 1. Strict Typing (Zod Schema Pflicht)

Jeder Agent MUSS ein Zod-Schema fuer Input UND Output definieren.

### Input Schema

```typescript
import { z } from 'zod';

// Beispiel: Lead Qualifier Agent
export const LeadQualifierInputSchema = z.object({
  companyName: z.string().min(1, 'Firmenname ist erforderlich'),
  contactPerson: z.string().optional(),
  annualRevenue: z.number().positive().optional(),
  employeeCount: z.number().int().positive().optional(),
  industry: z.string().optional(),
  currentPainPoints: z.array(z.string()).default([]),
  source: z.enum(['website', 'referral', 'cold-outreach', 'event', 'other']),
});

export type LeadQualifierInput = z.infer<typeof LeadQualifierInputSchema>;
```

### Output Schema

```typescript
export const LeadQualifierOutputSchema = z.object({
  score: z.number().min(0).max(100),
  qualification: z.enum(['hot', 'warm', 'cold', 'disqualified']),
  bant: z.object({
    budget: z.enum(['confirmed', 'likely', 'unknown', 'insufficient']),
    authority: z.enum(['decision-maker', 'influencer', 'user', 'unknown']),
    need: z.enum(['urgent', 'planned', 'exploring', 'none']),
    timeline: z.enum(['immediate', 'quarter', 'half-year', 'year-plus', 'unknown']),
  }),
  recommendedAction: z.string(),
  confidence: z.number().min(0).max(1),
});

export type LeadQualifierOutput = z.infer<typeof LeadQualifierOutputSchema>;
```

### Regeln

- Kein Agent ohne Schema wird akzeptiert
- Input-Validierung MUSS vor dem AI-Call erfolgen
- Output-Validierung MUSS nach dem AI-Call erfolgen (`.safeParse()`)
- Bei Validierungsfehler: Strukturierter Fehler, kein Absturz

---

## 2. Error Handling (Strukturierte JSON-Fehler)

Kein Agent darf abstuerzen. Jeder Fehler MUSS als strukturiertes JSON zurueckgegeben werden.

### Fehler-Schema

```typescript
export const AgentErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum([
      'VALIDATION_ERROR',    // Input ungueltig
      'AI_SERVICE_ERROR',    // OpenAI/Provider nicht erreichbar
      'TIMEOUT_ERROR',       // Zeitlimit ueberschritten
      'PERMISSION_ERROR',    // Fehlende Berechtigung
      'DATA_ERROR',          // Datenquelle nicht verfuegbar
      'RATE_LIMIT_ERROR',    // Zu viele Anfragen
      'UNKNOWN_ERROR',       // Unbekannter Fehler
    ]),
    message: z.string(),            // Menschenlesbare Beschreibung (Deutsch)
    details: z.any().optional(),    // Technische Details (fuer Logs)
    retryable: z.boolean(),         // Kann der Nutzer es erneut versuchen?
    suggestedAction: z.string().optional(), // Was soll der Nutzer tun?
  }),
  timestamp: z.string().datetime(),
  agentId: z.string(),
  requestId: z.string().uuid(),
});
```

### Beispiel-Fehler

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Die IBAN DE89370400440532013000 ist ungueltig. Bitte pruefen Sie die Eingabe.",
    "details": { "field": "iban", "value": "DE89370400440532013000", "rule": "checksum" },
    "retryable": true,
    "suggestedAction": "Bitte geben Sie eine gueltige deutsche IBAN ein (DE + 20 Ziffern)."
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "agentId": "ust-id-validator",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Regeln

- `try/catch` um JEDEN AI-Call
- Niemals Stack-Traces an den Nutzer
- Fehlermeldungen IMMER auf Deutsch
- `retryable: true` nur bei transient Errors (Timeout, Rate Limit)
- Logging: Volle Details ins Server-Log, reduzierte Info an den Client

---

## 3. Localization (Deutsche Standards)

### Datumsformate

| Kontext | Format | Beispiel |
| --- | --- | --- |
| Anzeige | DD.MM.YYYY | 15.02.2026 |
| API/DB | ISO 8601 | 2026-02-15T10:30:00+01:00 |
| Dateiname | YYYY-MM-DD | 2026-02-15 |
| Zeitstempel | DD.MM.YYYY HH:mm | 15.02.2026 10:30 |

### Waehrung

| Kontext | Format | Beispiel |
| --- | --- | --- |
| Anzeige | EUR X.XXX,XX | EUR 1.234,56 |
| Eingabe | Komma als Dezimaltrennzeichen | 1234,56 |
| API | Cent als Integer | 123456 |
| Buchhaltung | 2 Nachkommastellen immer | EUR 100,00 |

### Zeitzone

- Standard: `Europe/Berlin` (CET/CEST)
- Alle Timestamps intern: UTC
- Anzeige: Lokale Zeit mit Zeitzone
- Bibliothek: `date-fns` mit `date-fns-tz`

### Zahlenformate

| Typ | Format | Beispiel |
| --- | --- | --- |
| Ganzzahl | Punkt als Tausendertrennzeichen | 1.234.567 |
| Dezimal | Komma als Trennzeichen | 1.234,56 |
| Prozent | Mit Komma | 12,5 % |
| Telefon | DIN 5008 | +49 30 123456-0 |

---

## 4. Tone & Sprache

### Grundregeln

- **Anrede:** Formell ("Sie", "Ihnen", "Ihr")
- **Stil:** Praezise, faktenbasiert, professionell
- **Laenge:** So kurz wie moeglich, so lang wie noetig
- **Emojis:** KEINE in offiziellen Dokumenten, Berichten oder Geschaeftskorrespondenz
- **Gendern:** Neutrale Formulierung oder Doppelnennung (Kunden und Kundinnen) oder Partizip (Mitarbeitende)
- **Fachbegriffe:** Deutsche Begriffe bevorzugen, englische nur wenn branchenueblich

### Beispiele

**Korrekt:**
> "Sehr geehrte Frau Mueller, die Analyse Ihrer Quartalszahlen zeigt einen Umsatzanstieg von 12,5 % gegenueber dem Vorquartal. Die detaillierte Aufstellung finden Sie im Anhang."

**Falsch:**
> "Hey! Deine Q4 Numbers sind super! +12.5% Revenue Growth!"

### Branchenspezifische Anpassungen

| Cluster | Ton | Besonderheiten |
| --- | --- | --- |
| Dev-Team | Technisch, direkt | Englische Fachbegriffe erlaubt |
| Finance | Formal, praezise | GoBD-konforme Formulierungen |
| Legal/Real Estate | Juristisch, vorsichtig | Haftungsausschluesse Pflicht |
| Medical | Klar, patientenfreundlich | Keine Diagnosen, nur Admin |
| Sales | Professionell, ueberzeugend | Kein Druck, loesungsorientiert |
| HR | Empathisch, korrekt | AGG-konform, diskriminierungsfrei |

---

## 5. Sicherheit & Datenschutz

### DSGVO-Konformitaet

- Keine personenbezogenen Daten in Logs speichern
- Datenminimierung: Nur erforderliche Daten verarbeiten
- Loeschkonzept: Verarbeitete Daten nach Zweckerfuellung entfernen
- Keine Datenweitergabe an Dritte ohne explizite Zustimmung

### API-Sicherheit

- Alle Agenten-Inputs sanitizen (XSS, Injection)
- Rate Limiting pro User und Agent
- Authentifizierung via `x-user-id` Header (bestehendes System)
- Audit-Log fuer alle Agenten-Aktionen

---

## Checkliste: Definition of Done

- [ ] Zod Input-Schema definiert und validiert
- [ ] Zod Output-Schema definiert und validiert
- [ ] Error Handling mit strukturiertem JSON
- [ ] Deutsche Datumsformate (DD.MM.YYYY)
- [ ] Deutsche Waehrungsformate (EUR X.XXX,XX)
- [ ] Zeitzone Europe/Berlin
- [ ] Formelle Anrede ("Sie")
- [ ] Keine Emojis in offiziellem Output
- [ ] DSGVO-konforme Datenverarbeitung
- [ ] Input-Sanitization aktiv
- [ ] Unit Tests vorhanden
- [ ] Quality Gate Score >= 8
