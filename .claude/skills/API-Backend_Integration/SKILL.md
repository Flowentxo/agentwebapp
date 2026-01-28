---
id: api-integration
name: "API / Backend Integration"
level: 2
importance: "Zweitwichtigster Skill in echten Webapps"
typical_skill_slug: api-integration
---

# 2️⃣ API / Backend Integration

## Warum ist das so wichtig?
In echten Webapps bestehen sehr viele Features aus **„Daten holen / speichern / anzeigen“**. Typische Aufgaben:
- Listen laden, Detailseiten anzeigen
- Such- und Filter-Parameter an APIs schicken
- Formulare validieren und speichern
- Uploads, Status-Updates, Hintergrund-Jobs
- Authentifizierung und Berechtigungen (Login, Rollen, Scopes)

Wenn die API-Integration wackelt, ist die gesamte App instabil: UI-Fehler, Dateninkonsistenzen, Security-Probleme, schlechte DX.

---

## Skill-Zweck
Dieser Skill beschreibt einen **robusten Standard**, wie du APIs/Backends sauber anbindest – inkl.:

- **Wie APIs angebunden werden** (REST/JSON, GraphQL, interne/externe Services)
- **Error-Handling-Standard** (klassifizieren, loggen, userfreundlich anzeigen, retry)
- **Typisierung** (TypeScript-Typen + Runtime-Validierung)
- **Auth / Token / Headers** (Bearer, Cookies/Sessions, Refresh, CSRF, Request-IDs)

---

## Zielbild (Outcomes)
Nach Anwendung dieses Skills solltest du:
1. Eine API zuverlässig anbinden können (inkl. Base-URL, Environments, Timeouts).
2. Einheitliche, testbare Client-Funktionen haben (z. B. `getUser()`, `listOrders()`).
3. Fehler sauber behandeln (kein „silent fail“, keine ungefangenen Promises).
4. Typen **compile-time** und **runtime** absichern (kein blindes `as`).
5. Auth korrekt umsetzen (Token-Handling, 401/403, Refresh, sichere Speicherung).

---

## Grundprinzipien
- **Single API Client**: Ein zentraler Client (oder wenige) statt „fetch überall“.
- **Trennung von Verantwortlichkeiten**:
  - *Transport*: HTTP-Aufruf, Header, Retry, Timeout
  - *Domain*: Funktionen wie `createInvoice`, `updateProfile`
  - *UI*: Ladezustand, Fehleranzeige, Optimistic Updates
- **Keine `any`-Lecks**: Responses sind `unknown` bis validiert.
- **Fehler sind Daten**: Fehlerobjekte enthalten Status, Code, Kontext, Retryability.
- **Beobachtbarkeit**: Logs/Tracing sind Teil des Done.

---

## Standard-Ordnerstruktur (Beispiel)
Passe an dein Framework an – wichtig ist die Trennung:

```
src/
  api/
    client.ts        # low-level fetch/axios wrapper
    errors.ts        # ApiError + Klassifizierung
    auth.ts          # Token-Handling / Refresh / Header-Injection
    schemas.ts       # zod/io-ts schemas (runtime)
    endpoints/
      users.ts       # getUser, updateUser...
      orders.ts      # listOrders, createOrder...
  config/
    env.ts           # BASE_URL, timeouts, flags
```

---

## 1) API anbinden: Transport-Schicht (fetch wrapper)

### Anforderungen an den Wrapper
Der Wrapper sollte:
- Base-URL + Standard-Header setzen
- Timeout unterstützen
- Query-Parameter korrekt bauen
- JSON parse + **Runtime-Validierung**
- Fehler vereinheitlichen (Status, Code, Message, Details)
- optional: Retry mit Backoff bei transienten Fehlern
- optional: Request-ID (z. B. `X-Request-Id`) weiterreichen

### TypeScript: Ergebnis als Discriminated Union
So zwingst du die Aufrufer, Fehler bewusst zu behandeln:

```ts
// src/api/errors.ts
export type ApiErrorKind =
  | "Network"
  | "Timeout"
  | "Http"
  | "Parse"
  | "Validation"
  | "Auth";

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  code?: string;
  details?: unknown;
  retryable?: boolean;

  constructor(message: string, init: Partial<ApiError> = {}) {
    super(message);
    this.name = "ApiError";
    this.kind = init.kind ?? "Http";
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
    this.retryable = init.retryable;
  }
}

export type ApiResult<T> =
  | { ok: true; data: T; status: number; headers: Headers }
  | { ok: false; error: ApiError };
```

```ts
// src/api/client.ts
import { ApiError, ApiResult } from "./errors";

type ApiFetchOptions<T> = RequestInit & {
  timeoutMs?: number;
  // parse: Funktion, die unknown -> T macht (z.B. zodSchema.parse)
  parse?: (input: unknown) => T;
};

export async function apiFetch<T>(
  url: string,
  opts: ApiFetchOptions<T> = {}
): Promise<ApiResult<T>> {
  const { timeoutMs = 15_000, parse, headers, ...rest } = opts;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...rest,
      headers: {
        "Accept": "application/json",
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...(headers ?? {}),
      },
      signal: controller.signal,
    });

    const status = res.status;
    const resHeaders = res.headers;

    // 204 No Content
    if (status === 204) {
      // @ts-expect-error - erlaubt, wenn T = void oder null
      return { ok: true, data: undefined, status, headers: resHeaders };
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch (e) {
      return {
        ok: false,
        error: new ApiError("Antwort ist kein gültiges JSON.", {
          kind: "Parse",
          status,
          details: { cause: String(e) },
          retryable: false,
        }),
      };
    }

    if (!res.ok) {
      // Optional: API-spezifisches Error-Shape hier aus json extrahieren.
      return {
        ok: false,
        error: new ApiError("API-Fehler.", {
          kind: status === 401 || status === 403 ? "Auth" : "Http",
          status,
          details: json,
          retryable: status >= 500, // sehr grober Standard
        }),
      };
    }

    if (parse) {
      try {
        const data = parse(json);
        return { ok: true, data, status, headers: resHeaders };
      } catch (e) {
        return {
          ok: false,
          error: new ApiError("Antwort entspricht nicht dem erwarteten Schema.", {
            kind: "Validation",
            status,
            details: { cause: String(e), payload: json },
            retryable: false,
          }),
        };
      }
    }

    // Ohne parse: T wird blind angenommen (nur nutzen, wenn du wirklich sicher bist).
    return { ok: true, data: json as T, status, headers: resHeaders };
  } catch (e) {
    const isAbort = (e as any)?.name === "AbortError";
    return {
      ok: false,
      error: new ApiError(
        isAbort ? "Request Timeout." : "Netzwerkfehler beim API-Call.",
        {
          kind: isAbort ? "Timeout" : "Network",
          retryable: true,
          details: { cause: String(e) },
        }
      ),
    };
  } finally {
    clearTimeout(timeout);
  }
}
```

**Wichtig:** Der Wrapper ist bewusst „low-level“. Domain-Funktionen bauen darauf auf.

---

## 2) Typisierung: compile-time UND runtime
### Warum runtime?
TypeScript schützt nur zur Build-Zeit. Von außen kommt JSON – das ist zur Laufzeit **untrusted**.

### Best Practices
- **Bevorzugt**: OpenAPI/Swagger → Types generieren **und** serverseitig verifizieren.
- **Alternativ**: Zod-Schemas (oder io-ts) als Runtime-Validator, Typen aus Schema ableiten.
- Nutze `unknown` für JSON, erst nach `parse` ist es „safe“.

Beispiel mit Zod:

```ts
// src/api/schemas.ts
import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
});

export type User = z.infer<typeof UserSchema>;
```

```ts
// src/api/endpoints/users.ts
import { apiFetch } from "../client";
import { UserSchema, User } from "../schemas";

export async function getUser(baseUrl: string, id: string) {
  return apiFetch<User>(`${baseUrl}/users/${encodeURIComponent(id)}`, {
    method: "GET",
    parse: (x) => UserSchema.parse(x),
  });
}
```

---

## 3) Error-Handling-Standard (praktisch & konsistent)

### Fehlerklassen (Minimalstandard)
- **Network**: DNS, offline, CORS, „Failed to fetch“
- **Timeout**: Request zu lange
- **Http**: 4xx/5xx ohne Auth-Spezialfall
- **Auth**: 401/403 – Token fehlt/abgelaufen/keine Rechte
- **Parse**: Antwort nicht JSON
- **Validation**: JSON da, aber falsches Schema

### Regelwerk
- **UI bekommt NIE rohe Exceptions**: UI bekommt `ApiResult<T>` oder wirft eine *saubere* `ApiError`.
- **401/403**:
  - 401: i. d. R. „nicht eingeloggt“ / Token abgelaufen → Refresh/Logout
  - 403: eingeloggt, aber keine Rechte → „Nicht berechtigt“
- **4xx**: meistens „nicht retryable“
- **5xx + Network + Timeout**: oft retryable (mit Limits!)
- **Logging**: immer mit Kontext (endpoint, method, correlationId/requestId, status)

### Retry-Standard (optional)
Retry nur für:
- GET/HEAD/OPTIONS (idempotent) oder
- POST/PUT/PATCH nur, wenn du Idempotency-Key nutzt.

Backoff: z. B. 250ms → 500ms → 1000ms, max 3 Versuche.

---

## 4) Auth / Token / Headers

### Auth-Varianten
1. **Bearer Token (Authorization Header)**  
   `Authorization: Bearer <access_token>`
2. **Cookie/Sessions (HttpOnly Cookie)**  
   Vorteil: Token nicht im JS; Nachteil: CSRF beachten.
3. **API Keys (Server-to-Server)**  
   Niemals im Frontend ausliefern.

### Header-Standards (typisch)
- `Authorization: Bearer ...` (falls nötig)
- `Accept: application/json`
- `Content-Type: application/json` (bei JSON body)
- `X-Request-Id` oder `X-Correlation-Id` (Tracing)
- `If-Match` / `ETag` (optimistische Concurrency, falls unterstützt)

### Token-Handling (Browser)
- **Access Token kurzlebig**, Refresh Token sicher (oft HttpOnly Cookie)
- Vermeide LocalStorage für langlebige Tokens (XSS-Risiko)
- Bei 401: Refresh versuchen (einmal), danach Logout/Session-expired

#### Pattern: „401 → Refresh → Retry“ (Kurzskizze)
- Nur 1 Refresh parallel (Promise lock)
- Nach Refresh: original request wiederholen
- Wenn Refresh fehlschlägt: Auth-Fehler an UI

---

## 5) Typische Domain-Funktionen (API Layer)
Schreibe pro Feature klar benannte Funktionen:

- `listUsers(params)`
- `getUser(id)`
- `createUser(payload)`
- `updateUser(id, patch)`
- `deleteUser(id)`

Regeln:
- **Keine UI-Details** im API-Layer (keine Toasts, keine Router-Navigation).
- **Keine globalen Singletons**, wenn du Multi-Env oder SSR hast (Base URL injizieren).
- **Payloads** sind typisiert + validiert (mindestens vor dem Versand, je nach Bedarf).

---

## 6) Tests & Contract-Sicherheit
Minimal:
- Unit-Tests für Fehler-Mapping (z. B. 400/401/500)
- Mocking (z. B. MSW im Frontend, nock im Node)
- Schema-Tests: Validator schlägt fehl bei falschem JSON

Besser:
- Contract-Tests gegen ein Staging-Backend
- OpenAPI-Checks in CI (Breaking changes erkennen)

---

## Definition of Done (DoD)
Ein API-Integrations-Task gilt als fertig, wenn:
- ✅ Endpoint(s) als Domain-Funktion(en) im API-Layer existieren
- ✅ Typen sind korrekt + Response wird runtime-validiert (oder durch Codegen abgesichert)
- ✅ Fehler sind klassifiziert und konsistent im UI behandelbar
- ✅ Auth/Headers sind korrekt und keine Secrets landen im Client
- ✅ Timeouts sind gesetzt, keine „hängenden“ Requests
- ✅ Mindestens ein Test deckt Happy Path + 1 Fehlerfall ab
- ✅ Logging/Tracing-Infos (mindestens requestId + endpoint) sind vorgesehen

---

## Quick-Checkliste (Copy/Paste)
- [ ] Base URL / Env sauber (dev/staging/prod)
- [ ] API Client zentral, keine Fetch-Spaghetti
- [ ] Typed Request/Response (keine `any`)
- [ ] Runtime-Validierung oder verlässlicher Codegen
- [ ] Error-Klassen + Mapping (Network/Timeout/Http/Auth/Parse/Validation)
- [ ] 401/403 Verhalten klar (Refresh/Logout vs. „Forbidden“)
- [ ] Retry nur wo safe (idempotent oder Idempotency-Key)
- [ ] Tokens sicher gespeichert (kein langlebiges Token im LocalStorage)
- [ ] Tests für mindestens 1 success + 1 fail
- [ ] Logging/Request-ID bedacht

---

## Typischer Skill-Name
`api-integration`
