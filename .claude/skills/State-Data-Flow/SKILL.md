# 5️⃣ State / Data Flow — *state-management*

> **Ziel:** Chaos vermeiden, indem State-Typen sauber getrennt, Datenflüsse klar definiert und Side-Effects kontrolliert werden.  
> **Warum?** Claude kann State implementieren – aber **nicht** erraten, *welche Architektur du willst*.

---

## Skill-Zweck

Dieses Skill-Dokument beschreibt, **wie du State & Datenflüsse strukturierst**, damit:

- Änderungen **vorhersehbar** sind (unidirektionaler Flow).
- UI-State, Domain-State und Server-State **nicht vermischt** werden.
- Side-Effects (Fetch, Storage, Navigation, Analytics, Timers) **isoliert** und testbar bleiben.
- Duplikate (z. B. doppelt gespeicherte Daten) **vermieden** werden.
- Claude beim Coden **die gewünschten Regeln** einhält.

---

## Kernaussage: State ist nicht gleich State

Bevor du Code schreibst, **klassifiziere** jede State-Information:

1. **Local UI State** (kurzlebig, komponentennah)
2. **Shared/Global UI State** (appweit oder bereichsweit)
3. **Server State** (kommt vom Backend; Cache, Sync, Invalidations)
4. **Derived State** (berechnet; sollte i. d. R. nicht gespeichert werden)
5. **URL/Router State** (Filter, Pagination, Tabs, IDs)
6. **Persistent Client State** (LocalStorage/IndexedDB; vorsichtig einsetzen)

---

## Local vs Global State

### ✅ Local State (bevorzugt)
**Nutze Local State**, wenn:

- nur eine Komponente (oder ein kleiner Subtree) es braucht,
- es rein UI-orientiert ist (z. B. „Modal offen“, „Input-Wert“, „Hover“),
- es leicht aus Props/Query/Store ableitbar ist.

**Typische Tools**
- React: `useState`, `useReducer`
- Vue: `ref`, `reactive`
- Svelte: lokale Variablen / Stores im Component-Scope

**Anti-Pattern**
- Local State „wächst“ zu einem globalen Monster (Prop-Drilling + Kopien + 20 Callbacks).

---

### ✅ Global/Shared State (gezielt)
**Nutze globalen State**, wenn:

- mehrere *weit entfernte* Komponenten Zugriff brauchen,
- State cross-cutting ist (Auth, Feature Flags, globale UI, Permissions),
- komplexe Interaktionen/Workflows existieren (Wizard, Multi-Step Forms).

**Wichtig:** Global State ist ein **Kostenfaktor**.  
Je mehr global, desto mehr Coupling, Re-Renders, Debug-Aufwand.

---

## Context / Redux / Zustand / etc.

### Entscheidungshilfe (praktisch)

#### 1) **React Context**
Gut für:
- selten ändernde Werte (Theme, Locale, Feature Flag),
- Dependency Injection (z. B. API-Client),
- kleine, stabile Shapes.

Nicht ideal für:
- hochfrequenten State (Cursor-Position, Live-Suche, große Listen),
- komplexe Workflows (viele Events, Side-Effects, Debugging-Anforderungen).

#### 2) **Zustand**
Gut für:
- pragmatischen globalen UI-/Domain-State,
- kleine bis mittelgroße Apps,
- schnelle Integration, wenig Boilerplate.

Achte auf:
- klare „Actions“,
- selektives Subscribing (Selector nutzen),
- keine Vermischung mit Server-State.

#### 3) **Redux Toolkit**
Gut für:
- große Teams/Codebases,
- strikte Action-/Reducer-Disziplin,
- Middleware, Logging, DevTools, Time-Travel,
- komplexes Event-Processing.

Empfehlung:
- **Redux Toolkit** statt „plain Redux“.
- Für Server-State bei Redux: **RTK Query** erwägen (wenn ihr Redux ohnehin nutzt).

#### 4) **Server-State Libraries (TanStack Query / SWR / Apollo)**
Gut für:
- Fetching, Caching, Re-Fetching,
- Deduping, Retry, Background Sync,
- Mutations + Invalidations.

**Regel:** Server-State gehört primär in eine **Server-State-Library**, nicht in Redux/Zustand „kopiert“.

---

## Server vs Client State

### ✅ Server State (Backend-Quelle, Cache)
Beispiele:
- Benutzerprofil aus API
- Produktliste
- Status eines Jobs aus Backend

**Prinzipien**
- **Single Source of Truth** ist (fast immer) das Backend.
- Client hält **Cache**, nicht „Wahrheit“.
- Mutations => **Invalidate/Update Cache**.

**Anti-Patterns**
- Serverdaten 1:1 in einen Global Store spiegeln („mirror store“).
- Derived Listen/Filter als extra State speichern statt berechnen.

---

### ✅ Client State (UI/Interaktion)
Beispiele:
- UI-Filter (wenn nicht in URL)
- Draft-Formular
- Tab-Auswahl
- Toast Queue

---

## Side-Effects (Fetch, Storage, Navigation, Timers, Analytics)

### Grundregel
**Side-Effects gehören nicht in reine State-Updates.**  
Trenne:

- **State-Transition** (reiner, deterministischer Update)
- **Effect** (I/O, Zeit, Netzwerk, Browser APIs)

### Typische Orte für Side-Effects
- React: `useEffect`, event handler + async calls, Query-Libraries (empfohlen fürs Fetching)
- Redux: `createAsyncThunk`, Listener Middleware, RTK Query
- Zustand: async Actions (aber sauber begrenzen: API-Schicht nicht überall)

### Checkliste für Side-Effects
- Gibt es **Cleanup** (Timer, Subscriptions, EventListener)?
- Kann der Effekt **mehrfach laufen** (StrictMode, Re-Renders)?
- Sind **Abhängigkeiten** korrekt (React `useEffect` deps)?
- Was passiert bei **Race Conditions** (schnelle Navigation / mehrfaches Triggern)?
- Gibt es **Optimistic Update** + Rollback?
- Wie wird **Error State** modelliert (UI + Logging)?

---

## Datenfluss-Regeln

### 1) Unidirektionaler Datenfluss
**UI → Event/Action → State Update → Render/Selector → UI**

### 2) Single Source of Truth
- *Eine* Stelle entscheidet, was „gilt“.
- Keine doppelten Kopien desselben Werts in unterschiedlichen Stores.

### 3) Derived State nicht speichern
Wenn berechenbar, dann:
- Selector / Getter / Computed Value
- Memoization, wenn nötig (`useMemo`, Selector Memoization)

### 4) Boundary zwischen Domains
- UI-State ≠ Domain-State ≠ Server-State
- Trenne nach **Feature/Domain** statt nach „Technikordnern“.

---

## Typische Skill-Anwendung: „state-management“

### Output, den Claude liefern soll
Wenn du Claude diesen Skill gibst, soll Claude **immer**:

1. **State inventarisieren** (Liste aller State-Elemente).
2. Jeden Punkt klassifizieren: Local / Global / Server / Derived / URL / Persistent.
3. Eine **Entscheidung** treffen (Context vs Zustand vs Redux vs Query-Library).
4. Den **Datenfluss** beschreiben (wer setzt was, wer liest was).
5. Side-Effects lokalisieren (wo passiert I/O und warum dort?).
6. Datei-/Ordnerstruktur vorschlagen, die die Trennung abbildet.

---

## Entscheidungsmatrix (Kurzform)

| Frage | Empfehlung |
|---|---|
| Nur eine Komponente braucht es | Local State |
| Mehrere nahe Komponenten, seltene Updates | Context |
| Mehrere entfernte Komponenten, pragmatisch | Zustand |
| Große App/Team, strikte Events/Middleware/DevTools | Redux Toolkit |
| Daten kommen vom Backend + Cache/Sync nötig | TanStack Query / SWR / Apollo |
| State soll „shareable“ sein (Link) | URL State (Router) |

---

## Beispiele

### Beispiel A: React + Zustand (UI/Domain) + TanStack Query (Server)

```ts
// store/uiStore.ts
import { create } from "zustand";

type UIState = {
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  isSettingsOpen: false,
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
}));
```

```ts
// api/users.ts
export async function fetchUser(userId: string) {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}
```

```tsx
// features/profile/Profile.tsx
import { useQuery } from "@tanstack/react-query";
import { fetchUser } from "../../api/users";

export function Profile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUser(userId),
  });

  if (isLoading) return <div>Lade…</div>;
  if (error) return <div>Fehler</div>;

  return <div>{data.name}</div>;
}
```

**Warum gut?**
- UI-State bleibt im UI-Store.
- Server-State (User) bleibt im Query-Cache.
- Keine doppelte Speicherung von API-Daten im Global Store.

---

### Beispiel B: Redux Toolkit Slice + Async Thunk (Side-Effect isoliert)

```ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const loadOrders = createAsyncThunk("orders/load", async () => {
  const res = await fetch("/api/orders");
  if (!res.ok) throw new Error("Failed to load orders");
  return (await res.json()) as { id: string; total: number }[];
});

type OrdersState = {
  items: { id: string; total: number }[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error?: string;
};

const initialState: OrdersState = { items: [], status: "idle" };

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(loadOrders.pending, (state) => {
        state.status = "loading";
        state.error = undefined;
      })
      .addCase(loadOrders.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(loadOrders.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export const ordersReducer = ordersSlice.reducer;
```

**Regel erfüllt:** Fetching (Side-Effect) ist im Thunk, Reducer bleibt deterministisch.

---

### Beispiel C: Context nur für seltene Werte (Theme)

```tsx
import { createContext, useContext } from "react";

type Theme = "light" | "dark";
const ThemeContext = createContext<Theme>("light");

export const useTheme = () => useContext(ThemeContext);
```

---

## Anti-Patterns (meist die Ursache für Chaos)

- **Server-State duplizieren**: API-Daten in Redux/Zustand kopieren *und* in Query-Cache halten.
- **Derived State speichern**: `filteredItems` als State statt via Selector/Filter berechnen.
- **Context für alles**: Context-Provider als „globaler Store“ missbrauchen → Re-Renders.
- **Seiteneffekte im Reducer**: Fetch/Storage/Navigation in State-Updates verstecken.
- **Unklare Ownership**: Niemand weiß, wer State „besitzt“ und wer ihn ändern darf.

---

## Prompt-Vorlage für Claude (Copy/Paste)

> **Rolle:** Du bist mein State- und Data-Flow-Architekt.  
> **Aufgabe:** Bevor du implementierst, inventarisiere alle State-Elemente, klassifiziere sie (Local/Global/Server/Derived/URL/Persistent) und schlage eine Architektur vor (Context vs Zustand vs Redux vs Query-Library). Definiere den Datenfluss (wer schreibt/liest) und isoliere Side-Effects. Implementiere danach die Lösung konsistent zur Entscheidung.

Optional ergänzen:
- „Wir nutzen bereits Zustand/Redux/React Query – halte dich daran.“
- „Keine neue Library hinzufügen.“
- „Bitte mit Dateistruktur und Codebeispielen.“

---

## Definition of Done

- [ ] Alle State-Elemente sind klassifiziert.
- [ ] Server-State liegt in einer Server-State-Library (oder klar begründet anders).
- [ ] Keine doppelten Quellen („Single Source of Truth“).
- [ ] Side-Effects sind isoliert und nachvollziehbar.
- [ ] Derived State wird berechnet (Selector/Computed), nicht gespeichert.
- [ ] Datenfluss ist dokumentiert (kurz: wer setzt/wer liest/wo invalidiert).
