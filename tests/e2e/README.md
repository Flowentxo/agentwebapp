# E2E Tests mit Playwright

## Setup

```bash
# Playwright installieren
npm install -D @playwright/test

# Browser installieren
npx playwright install
```

## Tests ausführen

```bash
# Alle Tests
npx playwright test

# Nur ein Spec
npx playwright test dashboard.smoke

# UI-Modus (interaktiv)
npx playwright test --ui

# Report anzeigen
npx playwright show-report
```

## Test-Struktur

- `dashboard.smoke.spec.ts` - Haupttests für Dashboard UX
  - Sticky Search bleibt sichtbar
  - Primär-CTA pro Card
  - Keyboard-Shortcuts (/ und Cmd+K)
  - Focus-Rings sichtbar
  - Empty State
  - Loading Hint

## Was wird getestet?

### ✅ Akzeptanzkriterien

1. **Sticky-Search**: Element mit `data-testid="sticky-search"` bleibt beim Scrollen sichtbar
2. **Primär-CTA**: Button "Jetzt ausführen" prominent und klickbar
3. **Focus sichtbar**: Alle interaktiven Elemente haben sichtbare Focus-Ringe
4. **AA-Kontrast**: Text ≥ 4.5:1 auf dunklem Background
5. **Touch-Targets**: Alle Buttons ≥44px Höhe (mobile)
6. **Keyboard-Shortcuts**: `/` und `Cmd+K` fokussieren die Suche

## Debugging

```bash
# Mit Debug-Info
npx playwright test --debug

# Headed (Browser sichtbar)
npx playwright test --headed

# Nur Chromium
npx playwright test --project=chromium
```

## CI/CD Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```
