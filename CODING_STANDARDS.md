# 🏗️ Coding Standards & Best Practices - AIAgentWebApp

## 📋 Überblick
Dieses Dokument definiert die Coding Standards, Best Practices und Architekturrichtlinien für das AIAgentWebApp Projekt. Es basiert auf Enterprise-Standards und den Erkenntnissen aus der Code-Analyse.

## 🎯 Kernprinzipien

### 1. Clean Code
- **Lesbarkeit über Cleverness**: Code muss für andere Entwickler leicht verständlich sein
- **Selbstdokumentierender Code**: Variablen- und Methodennamen sollen die Absicht klar machen
- **KISS (Keep It Simple, Stupid)**: Einfache Lösungen bevorzugen
- **DRY (Don't Repeat Yourself)**: Duplikation vermeiden, wiederverwendbare Komponenten erstellen

### 2. TypeScript Excellence
- **Strict Mode**: Immer aktiviert
- **Keine `any` Typen**: Strikte Typisierung verwenden
- **Interfaces über Typen**: Für öffentliche APIs
- **Generics richtig einsetzen**: Für wiederverwendbare Komponenten

### 3. React/Next.js Best Practices
- **Server Components**: So viel wie möglich
- **Client Components**: Nur bei Interaktivität
- **Optimistic Updates**: Für bessere UX
- **Error Boundaries**: Für robuste Fehlerbehandlung

## 📁 Projektstruktur

### Backend (Server)
```
server/
├── domains/           # Domain-Driven Design
│   ├── core/         # Kern-Domänen (User, Auth, etc.)
│   ├── agents/       # Agent-Domäne
│   ├── workflows/    # Workflow-Domäne
│   └── shared/       # Gemeinsame Domänen-Logik
├── shared/           # Querschnittliche Funktionen
│   ├── errors/       # Error-Klassen
│   ├── utils/        # Hilfsfunktionen
│   └── types/        # Globale Typen
├── infrastructure/   # Technische Infrastruktur
│   ├── database/     # DB-Layer
│   ├── cache/        # Caching
│   └── messaging/    # Message Queue
└── api/              # API-Endpoints
```

### Frontend (Components)
```
components/
├── ui/              # Grundlegende UI-Komponenten
├── layout/          # Layout-Komponenten
├── features/        # Feature-spezifische Komponenten
│   ├── agents/      # Agent-bezogene Komponenten
│   ├── workflows/   # Workflow-Komponenten
│   └── analytics/   # Analytics-Komponenten
├── shared/          # Gemeinsam genutzte Komponenten
└── templates/       # Page-Templates
```

## 🔧 Technische Standards

### TypeScript Konfiguration
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

### Error Handling
```typescript
// Verwende hierarchische Error-Klassen
try {
  // Business Logic
} catch (error) {
  if (error instanceof ValidationError) {
    // Spezifische Behandlung
  } else if (error instanceof NotFoundError) {
    // Andere Behandlung
  } else {
    // Generische Behandlung
    throw new InternalServerError('Unexpected error', { originalError: error });
  }
}
```

### Dependency Injection
```typescript
// Service mit DI
@injectable()
class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: Logger
  ) {}
}

// Verwendung
const container = new Container();
container.register(UserRepository, { useClass: InMemoryUserRepository });
container.register(Logger, { useClass: ConsoleLogger });
```

### Testing Standards
- **Test Pyramide**: 70% Unit, 20% Integration, 10% E2E
- **Test Coverage**: Mindestens 70% für kritische Services
- **Test-Namen**: `describe('Komponente', () => { it('sollte ... wenn ...', () => {}) })`

## 📝 Code Style Guidelines

### Benennungskonventionen
- **Dateien**: kebab-case (z.B. `user-service.ts`)
- **Klassen/Methoden**: PascalCase (z.B. `UserService`)
- **Variablen/Funktionen**: camelCase (z.B. `getUserById`)
- **Konstanten**: UPPER_SNAKE_CASE (z.B. `MAX_RETRY_COUNT`)
- **Boolean-Variablen**: Präfix `is`, `has`, `should` (z.B. `isActive`)

### Kommentare
```typescript
/**
 * Berechnet den Gesamtpreis inklusive Steuern.
 * 
 * @param basePrice - Grundpreis ohne Steuern
 * @param taxRate - Steuersatz in Prozent (z.B. 19 für 19%)
 * @returns Gesamtpreis mit zwei Dezimalstellen
 * 
 * @example
 * const total = calculateTotal(100, 19); // 119.00
 */
function calculateTotal(basePrice: number, taxRate: number): string {
  const total = basePrice * (1 + taxRate / 100);
  return total.toFixed(2);
}
```

### Dateigrößen
- **Services**: Max. 300 Zeilen
- **Komponenten**: Max. 200 Zeilen
- **Test-Dateien**: Max. 500 Zeilen
- **Überlange Dateien**: In kleinere Module aufteilen

## 🚀 Performance Guidelines

### Backend
- **Database Queries**: N+1 Probleme vermeiden, Indizes nutzen
- **Caching**: Redis für häufige Anfragen
- **Connection Pooling**: Für Datenbankverbindungen
- **Batch Processing**: Bei großen Datenmengen

### Frontend
- **Code Splitting**: Dynamische Imports für große Komponenten
- **Lazy Loading**: Bilder und nicht-kritische Ressourcen
- **Memoization**: `useMemo` und `useCallback` bei teuren Berechnungen
- **Virtual Scrolling**: Bei langen Listen

## 🔒 Sicherheitsrichtlinien

### Authentication & Authorization
- **JWT Tokens**: Mit kurzer Gültigkeitsdauer
- **Refresh Tokens**: Secure, HttpOnly Cookies
- **Role-Based Access Control**: Klare Rollen und Berechtigungen
- **Input Validation**: Server-seitig immer validieren

### Data Protection
- **Sensitive Data**: Niemals im Client loggen
- **Environment Variables**: Keine Secrets im Code
- **Encryption**: Sensitive Daten verschlüsseln
- **GDPR Compliance**: Datenschutzrichtlinien beachten

## 📊 Monitoring & Logging

### Log Levels
```typescript
// Korrekte Log-Level-Nutzung
logger.debug('Debug-Informationen für Entwickler');
logger.info('Normale Betriebsinformationen');
logger.warn('Potenzielle Probleme');
logger.error('Fehler, die behoben werden müssen');
```

### Metriken
- **Response Times**: P95 unter 500ms
- **Error Rates**: Unter 1%
- **Memory Usage**: Unter 80% des Limits
- **CPU Usage**: Unter 70% im Durchschnitt

## 🔄 Git Workflow

### Commit Messages
```
feat: Neue Funktion hinzugefügt
fix: Bug behoben
docs: Dokumentation aktualisiert
style: Formatierung, keine funktionalen Änderungen
refactor: Code-Refactoring, keine funktionalen Änderungen
test: Tests hinzugefügt oder aktualisiert
chore: Wartungsaufgaben, Build-Skripte, etc.
```

### Branching Strategy
```
main          → Produktionscode
develop       → Entwicklungsbranch
feature/*     → Neue Features
bugfix/*      → Bugfixes
release/*     → Release-Vorbereitung
hotfix/*      → Kritische Hotfixes
```

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('UserService', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    service = new UserService(mockRepository);
  });

  it('sollte User nach ID finden', async () => {
    const mockUser = { id: '123', name: 'Test' };
    mockRepository.findById.mockResolvedValue(mockUser);

    const result = await service.getUserById('123');

    expect(result).toEqual(mockUser);
    expect(mockRepository.findById).toHaveBeenCalledWith('123');
  });
});
```

### Integration Tests
- **API-Endpoints**: Mit realer Datenbank
- **Service Integration**: Mehrere Services zusammen
- **E2E Flows**: Komplette User Journeys

## 📈 Code Review Checkliste

### Allgemein
- [ ] Code folgt den Coding Standards
- [ ] Keine unnötige Komplexität
- [ ] Ausreichende Dokumentation
- [ ] Tests vorhanden und sinnvoll

### Sicherheit
- [ ] Keine sensiblen Daten im Code
- [ ] Input Validation vorhanden
- [ ] Authentication/Authorization korrekt
- [ ] SQL Injection verhindert

### Performance
- [ ] Keine N+1 Probleme
- [ ] Caching korrekt eingesetzt
- [ ] Memory Leaks vermieden
- [ ] Bundle Size optimiert

### Wartbarkeit
- [ ] Code ist leicht verständlich
- [ ] Wiederverwendbare Komponenten
- [ ] Keine Magic Numbers/Strings
- [ ] Fehlerbehandlung robust

## 🎓 Onboarding für neue Entwickler

### Erste Schritte
1. Repository klonen
2. `npm install` ausführen
3. Entwicklungsumgebung einrichten
4. Coding Standards lesen
5. Ersten kleinen Issue bearbeiten

### Lernressourcen
- **TypeScript**: Official Handbook
- **React/Next.js**: Official Documentation
- **Architektur**: DDD & Clean Architecture Bücher
- **Best Practices**: Patterns.dev

---

*Letzte Aktualisierung: ${new Date().toLocaleDateString('de-DE')}*

Diese Standards werden regelmäßig überprüft und aktualisiert. Bei Fragen oder Verbesserungsvorschlägen, bitte ein Issue erstellen.