# testing-guidelines

> **Kategorie:** 4️⃣ Testing  
> **Zweck:** Tests konsequent einfordern, schreiben, ausführen und sauber strukturieren – weil LLMs Tests ohne harte Vorgaben fast immer „vergessen“.

---

## Warum wird Testing ohne Skill ignoriert?

- **LLMs optimieren auf „fertigen Code“** und nicht auf Absicherung.
- **Tests sind oft nicht „sichtbar nötig“** für das unmittelbare Ziel (Feature/Refactor), werden daher ausgelassen.
- **Ohne explizite Definition von „Done“** wird ein Change häufig als abgeschlossen betrachtet, sobald der Code kompiliert.

**Regel:** *Ein Change ist erst fertig, wenn die dazugehörigen Tests existieren und grün sind.*

---

## Skill-Zweck

Dieser Skill sorgt dafür, dass bei Code-Änderungen:

1. **Pflichttests** ergänzt/angepasst werden,
2. die **richtigen Test-Tools** genutzt werden (Vitest/Jest/RTL),
3. eine **stabile Teststruktur** eingehalten wird,
4. klar ist, **wann Tests sinnvoll sind** – und wann nicht.

---

## Definition von „Done“ (verbindlich)

Ein Task gilt erst als abgeschlossen, wenn:

- ✅ relevante Tests geschrieben/aktualisiert wurden
- ✅ Tests lokal ausgeführt wurden (grün)
- ✅ der Test-Output keine Flakes / Race Conditions erkennen lässt
- ✅ Testnamen und Struktur verständlich sind
- ✅ keine unnötigen Snapshots / Over-Mocking eingeführt wurden

---

## Welche Tests sind Pflicht?

### 1) Unit Tests (Logik / Utilities / Services)
Pflicht, wenn:
- neue Logik hinzugefügt wurde
- bestehende Logik verändert wurde
- ein Bug gefixt wurde (**Regressionstest ist Pflicht**)

Mindestens abdecken:
- **Happy Path**
- **Error Path / Exceptions**
- **Edge Cases** (z. B. leere Arrays, `null/undefined`, Grenzwerte)

### 2) Component Tests (React) mit React Testing Library (RTL)
Pflicht, wenn:
- UI-Interaktionen geändert wurden
- Rendering-Logik verändert wurde
- Props/State/Conditional Rendering angepasst wurde

Mindestens abdecken:
- **Render** (wichtige Texte/Labels/Rollen)
- **Interaktion** (click/type/submit)
- **State-Änderung / Side Effects**
- **A11y-Basics**: nutze Rollen/Labels statt CSS-Klassen

### 3) Integration Tests (mehrere Module zusammen)
Pflicht, wenn:
- mehrere Schichten zusammenspielen (UI ↔ API ↔ State)
- Routing/Permissions/Feature Flags beteiligt sind
- die Änderung „systemisch“ ist (Refactor über mehrere Dateien)

Mindestens abdecken:
- 1–2 **realistische User-Flows**
- **Fehlerszenario** (z. B. API 500, Validation Error)

### 4) Regression Tests bei Bugfixes
**Immer Pflicht.**  
Der Test muss:
- **vor** dem Fix fehlschlagen (oder plausibel zeigen, dass er es würde),
- **nach** dem Fix grün sein.

---

## Test-Tools (Vitest / Jest / RTL)

### Wann Vitest?
- Vite-basierte Projekte
- schnelle Unit-/Component-Tests
- gute ESM-Unterstützung

### Wann Jest?
- bestehende Jest-Setups
- Legacy/Node-Umgebungen
- wenn das Projekt bereits darauf standardisiert ist

### RTL (React Testing Library)
- **immer** für React-UI-Tests (Black-Box/Behavior statt Implementation Details)
- verwende `screen.getByRole`, `getByLabelText`, `findByText` etc.

**Regel:** Teste Verhalten, nicht Implementierung.  
👉 Keine Tests auf private Funktionen, Hook-Interna, CSS-Klassen oder DOM-Strukturen, die nicht Teil des User-Verhaltens sind.

---

## Teststruktur

### Ordner & Dateinamen (Beispiele)

**Option A – co-located (empfohlen)**
```
src/
  features/
    checkout/
      CheckoutForm.tsx
      CheckoutForm.test.tsx
      checkout.ts
      checkout.test.ts
```

**Option B – __tests__**
```
src/
  features/
    checkout/
      CheckoutForm.tsx
      __tests__/
        CheckoutForm.test.tsx
```

**Regeln**
- Testdatei endet auf: `.test.ts` / `.test.tsx`
- Pro Datei/Komponente mindestens **eine** passende Testdatei
- Testbeschreibung klar: *„should … when …“* oder *„renders …“*

### Struktur im Testfile

**Empfohlenes Muster**
- `describe('<Unit/Component>')`
  - `describe('given …')`
    - `it('when … should …')`

Oder pragmatischer:
- `describe(...)` für Kontext
- `it(...)` für konkrete Erwartungen

**AAA-Pattern (Arrange / Act / Assert)**
- Arrange: Setup
- Act: Aktion ausführen
- Assert: Erwartung prüfen

---

## Wann testen, wann nicht?

### Testen (Ja)
- neue Features
- Bugfixes (Regressionstest Pflicht)
- Refactors mit Verhaltensänderung oder Risiko
- komplexe Bedingungen (Permissions, Feature Flags, Business Rules)
- API-Interaktionen / Datenmapping / Validierung
- kritische User-Flows (Login, Checkout, Payment, Settings)

### Nicht testen (oder sehr leicht)
- reine Formatierung (Prettier), Umbenennungen ohne Logikänderung
- triviale Getter/Setter oder „1:1 Wrapper“ ohne Verhalten
- generierter Code (falls stabil und extern abgesichert)
- rein visuelle Änderungen, die bereits durch visuelle Tests/E2E abgedeckt sind  
  (aber: mindestens sicherstellen, dass bestehende Tests nicht brechen)

**Regel:** Wenn du unsicher bist → lieber testen.

---

## Best Practices (kurz & verbindlich)

- ✅ **Mocke nur an den Grenzen** (Netzwerk, Zeit, Storage) – nicht intern alles kaputtmocken.
- ✅ **Keine Snapshot-Flut**: Snapshots nur, wenn sie wirklich Signal liefern.
- ✅ **Stabile Selektoren**: Rollen/Labels/Texts statt CSS-Klassen.
- ✅ **Asynchronität sauber**: `findBy*`, `waitFor` nur wenn nötig.
- ✅ **Testdaten bewusst**: kleine, aussagekräftige Fixtures.
- ✅ **Fehlermeldungen prüfen**: bei Validierung/Errors immer assert auf user-sichtbare Ausgabe.

---

## Standard-Checkliste pro Change

1. Was ist das **neue/angepasste Verhalten**?
2. Welche **Pflichttests** sind betroffen (Unit/Component/Integration)?
3. Welche Mocks sind nötig – und welche **nicht**?
4. Test schreiben/aktualisieren.
5. Tests ausführen:
   - `pnpm test` / `npm test`
   - ggf. gezielt: `pnpm vitest <pattern>` / `jest <pattern>`
6. Sicherstellen: kein Flake, kein unnötiger Snapshot, klare Namen.

---

## Typische Skill-Ausgabe

Wenn du Änderungen lieferst, liefere **immer** auch:

- **Welche Tests** du ergänzt/angepasst hast
- **Wie man sie ausführt** (komplette Befehle)
- **Welche Fälle** abgedeckt sind (Happy/Error/Edge)
- ggf. **Warum** bestimmte Dinge nicht getestet wurden (kurz, konkret)

---

## Mini-Beispiele

### Unit Test (Vitest)
```ts
import { describe, it, expect } from "vitest";
import { clamp } from "./clamp";

describe("clamp", () => {
  it("returns min when value is below min", () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it("returns max when value is above max", () => {
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it("returns value when within bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
});
```

### Component Test (RTL)
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Counter } from "./Counter";

describe("<Counter />", () => {
  it("increments when clicking the button", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    expect(screen.getByRole("status")).toHaveTextContent("0");
    await user.click(screen.getByRole("button", { name: /increment/i }));
    expect(screen.getByRole("status")).toHaveTextContent("1");
  });
});
```

---

## Name dieser Skill-Datei

Speichere diese Datei als:

- `testing-guidelines.md`

