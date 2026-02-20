# Flowent Quality Gate Protocol — Scoring-System (1-10)

> **Version:** 1.0.0
> **Stand:** 15.02.2026
> **Zweck:** Selbst-Test und Qualitaetsbewertung fuer jeden Agenten vor Deployment
> **Anwendung:** Wird bei der Implementierung jedes Agenten durchgefuehrt

---

## Scoring-Skala

### 1-4: FAIL

> **Aktion:** Code verwerfen, komplett neu schreiben.

**Kriterien fuer FAIL:**

- Agent halluziniert (erfindet Daten, die nicht im Input stehen)
- Formatierung falsch (z.B. MM/DD/YYYY statt DD.MM.YYYY, Dollar statt Euro)
- Absturz bei leeren oder unerwarteten Inputs
- Keine Zod-Validierung vorhanden
- Antwort auf Englisch statt Deutsch
- Sicherheitsluecke (z.B. unsanitized Input wird durchgereicht)
- Diagnosen stellen (Medical Cluster) statt nur zu dokumentieren

**Beispiel Score 2:**

```
Input: {} (leeres Objekt)
Erwartung: Strukturierter Validierungsfehler
Ergebnis: TypeError: Cannot read properties of undefined
-> FAIL: Absturz bei leerem Input
```

**Beispiel Score 4:**

```
Input: { betrag: "1500.00" }
Erwartung: "EUR 1.500,00"
Ergebnis: "$1,500.00"
-> FAIL: Falsches Waehrungs- und Zahlenformat
```

---

### 5-7: BETA

> **Aktion:** Refactoring notwendig. Grundfunktion vorhanden, aber nicht produktionsreif.

**Kriterien fuer BETA:**

- Funktioniert grundsaetzlich, aber Sprache ist generisch/unpersoenlich
- Fehlerbehandlung vorhanden, aber zu allgemein ("Ein Fehler ist aufgetreten")
- Deutsche Formate teilweise korrekt
- Zod-Schema vorhanden, aber unvollstaendig
- Edge-Cases nicht abgedeckt
- Output ist korrekt, aber nicht hilfreich (keine Handlungsempfehlung)

**Beispiel Score 5:**

```
Input: { iban: "DE1234" }
Erwartung: Detaillierter Fehler mit IBAN-Format-Erklaerung
Ergebnis: { error: "Ungueltige IBAN" }
-> BETA: Fehler erkannt, aber keine hilfreiche Erklaerung
```

**Beispiel Score 7:**

```
Input: Reisekosten mit Verpflegungsmehraufwand
Erwartung: Korrekte Berechnung nach aktuellen Saetzen
Ergebnis: Berechnung korrekt, aber keine Angabe der Rechtsgrundlage
-> BETA: Funktional korrekt, aber nicht Enterprise-Qualitaet
```

---

### 8-9: PROD (Production Ready)

> **Aktion:** Bereit fuer Code Review und Staging-Deployment.

**Kriterien fuer PROD:**

- Robuste Zod-Validierung fuer alle Input/Output-Felder
- Deutsche Formate durchgaengig korrekt (Datum, Waehrung, Zahlen)
- Strukturierte Fehlerbehandlung mit hilfreichen deutschen Meldungen
- Formelle Anrede ("Sie") durchgaengig
- Agent verhaelt sich konsistent ueber verschiedene Inputs
- Logging aktiv (ohne personenbezogene Daten)
- Unit Tests vorhanden und bestanden

**Beispiel Score 8:**

```
Input: Rechnung mit IBAN und Betrag
Ergebnis:
- IBAN korrekt validiert (Pruefsumme)
- Betrag als "EUR 1.500,00" formatiert
- Datum als "15.02.2026" formatiert
- Fehler bei ungueltiger IBAN: "Die IBAN DE... ist ungueltig. Bitte pruefen Sie Stelle 5-6."
-> PROD: Robust und korrekt
```

**Beispiel Score 9:**

```
Wie Score 8, zusaetzlich:
- Warnung bei ungewoehnlich hohem Betrag
- Hinweis auf Skonto-Moeglichkeit
- Rechtsgrundlage zitiert
-> PROD: Uebertrifft Erwartungen
```

---

### 10: ENTERPRISE GOLD

> **Aktion:** Commit & Deploy. Keine weiteren Aenderungen noetig.

**Kriterien fuer ENTERPRISE GOLD:**

- ALLE Kriterien von PROD erfuellt
- Faengt Edge-Cases ab (z.B. ungueltige IBAN, Sonderzeichen in Namen, Grenzwerte)
- Bietet proaktiv Alternativen und Handlungsempfehlungen
- Verhaelt sich wie ein Senior-Experte mit 10+ Jahren Erfahrung
- Branchenspezifische Besonderheiten beruecksichtigt
- Compliance-Hinweise automatisch eingefuegt (GoBD, DSGVO, VOB, etc.)
- Performance: Antwort in unter 3 Sekunden (exkl. AI-Call)
- Graceful Degradation bei AI-Service-Ausfall

**Beispiel Score 10:**

```
Input: USt-ID Validierung fuer "ATU12345678"
Ergebnis:
- Format korrekt erkannt (oesterreichische USt-ID)
- Pruefsumme validiert
- Hinweis: "Dies ist eine oesterreichische USt-ID. Fuer innergemeinschaftliche
  Lieferungen ist eine Pruefung ueber das MIAS-System der EU empfohlen."
- Alternative: "Moechten Sie die Gueltigkeit ueber die EU-VIES-Datenbank pruefen lassen?"
- Compliance: "Gemaess § 18e UStG sind Sie verpflichtet, die USt-ID Ihres
  Geschaeftspartners zu ueberpruefen."
-> ENTERPRISE GOLD: Edge-Case, Alternative, Rechtsgrundlage
```

---

## Pruefprotokoll-Template

Fuer jeden implementierten Agenten wird folgendes Protokoll ausgefuellt:

```markdown
## Quality Gate: [Agent Name] (ID: XX)

**Datum:** TT.MM.JJJJ
**Pruefer:** Claude (Automated)
**Version:** 1.0.0

### Test-Ergebnisse

| Pruefkriterium | Ergebnis | Score |
| --- | --- | --- |
| Zod Input-Validierung | PASS/FAIL | X/10 |
| Zod Output-Validierung | PASS/FAIL | X/10 |
| Leerer Input Test | PASS/FAIL | X/10 |
| Deutscher Datumsformat-Test | PASS/FAIL | X/10 |
| Deutscher Waehrungsformat-Test | PASS/FAIL | X/10 |
| Fehlerbehandlung (strukturiert) | PASS/FAIL | X/10 |
| Formelle Anrede | PASS/FAIL | X/10 |
| Edge-Case Handling | PASS/FAIL | X/10 |
| Handlungsempfehlungen | PASS/FAIL | X/10 |
| Compliance-Hinweise | PASS/FAIL | X/10 |

### Gesamt-Score: X/10

### Bewertung: [FAIL / BETA / PROD / ENTERPRISE GOLD]

### Anmerkungen:
- ...

### Naechste Schritte:
- ...
```

---

## Automatisierte Tests (pro Agent)

Jeder Agent MUSS folgende automatisierte Tests bestehen:

1. **Happy Path:** Standard-Input, erwarteter Output
2. **Empty Input:** Leeres Objekt oder fehlende Pflichtfelder
3. **Invalid Types:** String statt Number, Number statt String
4. **Edge Cases:** Grenzwerte, Sonderzeichen, Unicode
5. **German Formats:** Datum, Waehrung, Zahlen im korrekten Format
6. **Error Response:** Strukturierter JSON-Fehler bei Fehler
7. **Timeout:** Verhalten bei AI-Service-Timeout
8. **Idempotenz:** Gleicher Input = Gleicher Output (wo anwendbar)
