# Agent 35: Tenant Communicator — Enterprise Specification

## Context

Agent 35 (`tenant-communicator`) is a domain-specific agent for the German real estate vertical. It handles legally compliant landlord-tenant communication in the DACH market, with focus on BGB Mietrecht (§§ 535-580a). The agent is **fully implemented** across all 7 layers.

**Status:** PRODUCTION-READY

---

## 1. Persona Registration

**File:** `lib/agents/personas.ts` (line 267)

| Field | Value |
|-------|-------|
| `id` | `tenant-communicator` |
| `name` | Tenant Communicator |
| `role` | Mieterkommunikation & Fristenmanagement |
| `color` | `#047857` (emerald-700) |
| `icon` | `Building2` (Lucide) |
| `category` | `operations` |
| `specialties` | Mieterschreiben, Fristenberechnung, Zustellnachweise, BGB Mietrecht |

---

## 2. System Prompt

**File:** `lib/agents/prompts.ts` (line 1004-1045)

Key directives: German only, BGB §§ 535-580a, integer-cent financials, mandatory disclaimer, Schriftform for Kuendigung (§568), Einschreiben/Rueckschein flagged as UNSAFE.

---

## 3. Configuration Constants

**File:** `lib/agents/tenant-communicator/config.ts` (279 lines)

### Notice Types (9)

kuendigung_ordentlich, kuendigung_fristlos, mieterhoehung_mietspiegel, mieterhoehung_modernisierung, mahnung_miete, abmahnung, betriebskosten_abrechnung, modernisierung_ankuendigung, info_schreiben

### Delivery Methods (6)

einschreiben_einwurf (HIGH), einschreiben_rueckschein (MEDIUM - risky), bote (HIGH), persoenlich_quittung (HIGH), email (LOW), fax (MEDIUM)

### Kuendigungsfristen (§573c BGB)

- <= 5 Jahre: 3 Monate
- 5-8 Jahre: 6 Monate
- > 8 Jahre: 9 Monate
- Mieter: always 3 Monate

### Helpers

formatEurCents, parseEurToCents, parseGermanDate, formatGermanDate, isHoliday (Gauss Easter), isWeekend, adjustToBusinessDay (§193 BGB)

---

## 4. Tools

### 4.1 notice_generator (562 lines)

Generates legally compliant notices. 9 types, 8 template builders. Input: notice_type, landlord, tenant, property, contract_details (integer cents), reason, deadline_date. Output: document, legal_references[], warnings[], delivery_method, formatted_output.

### 4.2 deadline_calculator (336 lines)

Calculates BGB deadlines. 11 types with weekend/holiday adjustment (§193 BGB). Input: deadline_type, reference_date (DD.MM.YYYY), tenancy_duration_months, state. Output: deadline_date, legal_basis, calculation_steps[], warnings[], is_holiday_adjusted.

### 4.3 delivery_tracker (432 lines)

Manages delivery proof. 4 actions: recommend, track (DB), list, verify. Warns against einschreiben_rueckschein for Kuendigungen. DB: tenantCommunications table.

### 4.4 communication_log (448 lines)

Digital Mieterakte. 5 actions: add, list, search, timeline, export (markdown/csv/pdf_ready). 9 event types. DB: tenantCommunications table.

---

## 5. Tool Executor & Index

- tool-executor.ts (188 lines): Switch dispatch, German display names, toolLoggingService audit
- index.ts (57 lines): Barrel export + getTenantCommunicatorToolsForOpenAI()

---

## 6. Database Schema

**File:** `lib/db/schema-tenant-comms.ts` — Table: `tenant_communications`

UUID PK, user_id, tenant_name, property_address, event_type, subject, content, notice_type, delivery_method, delivery_date, delivery_status, tracking_number, witness_name, deadline_date, deadline_status, generated_document, legal_references (TEXT[]), metadata (JSONB).

5 Indexes: user_id, (tenant_name, user_id), (property_address, user_id), deadline_date, created_at.

---

## 7. API Route Integration

**File:** `app/api/agents/[id]/chat/route.ts` — Lines 32, 399, 404, 455, 599, 630

---

## 8. File Inventory (2,367 lines)

```
lib/agents/tenant-communicator/
  config.ts                    279 lines
  tools/
    index.ts                    57 lines
    tool-executor.ts           188 lines
    notice-generator.ts        562 lines
    deadline-calculator.ts     336 lines
    delivery-tracker.ts        432 lines
    communication-log.ts       448 lines
  __tests__/
    config.test.ts
    notice-generator.test.ts
    deadline-calculator.test.ts
    delivery-tracker.test.ts
    communication-log.test.ts

lib/db/schema-tenant-comms.ts   65 lines
```
