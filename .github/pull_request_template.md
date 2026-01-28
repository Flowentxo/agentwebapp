# Sintra Dashboard – UX/A11y Refactor

## 🎯 Ziel
Klarere Informationshierarchie, eindeutige Primäraktionen, bessere Kontraste, robuste Loading/Empty/Error States (WCAG AA konform).

## 📋 Änderungen (Kurz)

### UI/UX
- ✅ **Page-Intro** mit Titel + Untertitel für Orientierung
- ✅ **Sticky-Search** mit max-width (scrollt nicht mehr weg)
- ✅ **AgentCard Redesign**: Primär-CTA links, Sekundär rechts, Icon-Actions im Dropdown
- ✅ **Kontrast erhöht**: `bg-slate-900/80` statt `bg-card/40`, Text mit `text-slate-100/200/300`
- ✅ **Focus-Ringe** vereinheitlicht mit `ring-2 ring-offset-2`

### States & Feedback
- ✅ **Loading**: ≤2s Skeleton, danach `aria-live="polite"` mit Retry-Button
- ✅ **Empty State**: Icon + "Agent erstellen" CTA
- ✅ **Error State**: Icon + "Nochmal versuchen" + "Logs anzeigen →"

### A11y
- ✅ Kontrast ≥ 4.5:1 (WCAG AA)
- ✅ Alle interaktiven Elemente min-h-44px (WCAG 2.5.5)
- ✅ Keyboard-Navigation mit sichtbaren Focus-Ringen
- ✅ `aria-live` Regionen für dynamische Inhalte

## 📸 Screenshots

### Desktop (≥1280px)
- [ ] Dashboard mit 3-Spalten Grid
- [ ] AgentCard mit Primär-CTA hervorgehoben
- [ ] Sticky-Search beim Scrollen
- [ ] Empty State
- [ ] Error State mit Retry

### Tablet (768-1279px)
- [ ] 2-Spalten Grid
- [ ] Touch-Targets ≥44px

### Mobile (<768px)
- [ ] 1-Spalten Layout
- [ ] Sticky-Header funktional
- [ ] Filter-Chips vertikal

## ♿ Accessibility Checks

### Manuell
- [ ] **Kontrast**: Text/Surface ≥ 4.5:1 (Chrome DevTools)
- [ ] **Keyboard**: Tab durch alle Cards, Enter auf CTA funktioniert
- [ ] **Focus**: Ring sichtbar auf allen interaktiven Elementen
- [ ] **Screen Reader**: VoiceOver (Mac) / NVDA (Win) Test

### Automatisiert
- [ ] **axe-core**: Keine critical/serious violations
- [ ] **Lighthouse**: Accessibility Score ≥95
- [ ] **Playwright**: A11y-Gates passing

## 🧪 Tests

### E2E (Playwright)
```bash
pnpm test:e2e:a11y
```
- [ ] `dashboard.a11y.spec.ts` passing
- [ ] Sticky-Search bleibt sichtbar beim Scrollen
- [ ] 1 Primär-CTA pro Card vorhanden

### Visual Regression
```bash
pnpm test:vrt
```
- [ ] AgentCard Screenshot-Diff <150px
- [ ] Dashboard Layout stabil

### Unit (Vitest)
```bash
pnpm test:unit
```
- [ ] ClassicAgentCard Props-Tests
- [ ] Loading/Empty/Error State Rendering

## 📊 Performance

### Lighthouse CI
```bash
pnpm lighthouse:ci
```
- [ ] Performance ≥85
- [ ] Accessibility ≥95
- [ ] Best Practices ≥90

### Core Web Vitals
- [ ] LCP <2.5s
- [ ] FID <100ms
- [ ] CLS <0.1

## 🚀 Rollout

### Feature Flag
```env
NEXT_PUBLIC_FLAG_NEW_DASHBOARD=1
```
- [ ] Flag aktiviert in `.env.local`
- [ ] Fallback zu Legacy-Dashboard funktioniert

### Telemetrie
- [ ] `dashboard_ttfas` Event feuert
- [ ] `agent_run_clicked` Event feuert
- [ ] `agent_details_opened` Event feuert

### Monitoring
- [ ] Sentry Error-Tracking aktiv
- [ ] Analytics Dashboard updated

## 🔍 Review Checklist

### Code Quality
- [ ] Keine Hardcoded Colors (nur Tailwind-Tokens)
- [ ] Props TypeScript-typisiert
- [ ] Keine Breaking Changes in Public APIs
- [ ] eslint/prettier passing

### A11y Compliance
- [ ] 1 Primäraktion pro Card
- [ ] `aria-label` nur wo nötig (nicht redundant)
- [ ] Tap-Targets ≥44px
- [ ] Color-Kontrast geprüft

### Browser Support
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari/Chrome

## 📚 Documentation

- [ ] Component Props dokumentiert
- [ ] Storybook Stories updated
- [ ] A11y-Patterns dokumentiert (Wiki/Confluence)

## 🔗 Related Issues

Closes #XXX - Dashboard UX Improvement
Closes #YYY - A11y Audit Findings

---

## Review Notes

<!-- Reviewer: Füge hier Feedback, Risks, Follow-ups ein -->
