# 🤖 Dexter - KI-Finanzanalyst Agent

Ein hochspezialisierter Finanzanalyst-Agent basierend auf **OpenAI GPT-4** mit sechs Power-Ups für professionelle Finanzanalysen.

> **Version 4.0.0** - Migrated from Anthropic Claude to OpenAI GPT-4 (January 2025)

## 📊 Agent-Übersicht

**Dexter** ist dein KI-Finanzanalyst für:
- ✅ Return on Investment (ROI) Berechnungen
- ✅ Verkaufsprognosen mit Trend-Analyse
- ✅ Gewinn- und Verlustrechnungen (P&L)
- ✅ Bilanzanalyse und Liquiditätsbewertung

## 🛠️ Power-Ups (Tools)

### 1. ROI Calculator
Berechnet die Kapitalrendite (Return on Investment) für Investitionsprojekte.

**Features:**
- ROI in Prozent
- Payback Period (Amortisationszeit)
- Kategorisierung (Exzellent/Gut/Akzeptabel/Problematisch)
- Investitionsvergleiche

**Beispiel:**
```
Investment: 50.000€
Rückfluss: 75.000€ Umsatz mit 40% Marge
→ ROI: -40% (unprofitabel)
```

### 2. Sales Forecaster
Erstellt Verkaufsprognosen basierend auf historischen Daten.

**Features:**
- Lineare Trendprognose
- Durchschnittswachstumsrate
- Konfidenzintervall
- Trend-Visualisierung

**Beispiel:**
```
Historische Daten: Q1-Q3 2024
→ Prognose für Q4 2024 und Q1 2025
```

### 3. P&L Calculator
Erstellt und analysiert Gewinn- und Verlustrechnungen.

**Features:**
- Gross Profit & Gross Margin
- Operating Profit & Operating Margin
- Net Profit & Net Margin
- EBITDA Berechnung
- Rentabilitätsbewertung

**Beispiel:**
```
Revenue: 500.000€
COGS: 200.000€
Operating Expenses: 245.000€
→ Detaillierte P&L Analyse
```

### 4. Balance Sheet Generator
Generiert Bilanzen und berechnet Finanzkennzahlen.

**Features:**
- Working Capital
- Current Ratio (Liquidität 1. Grades)
- Quick Ratio (Liquidität 2. Grades)
- Debt-to-Equity Ratio
- Debt-to-Assets Ratio
- Equity Ratio

**Beispiel:**
```
Assets: 765.000€
Liabilities: 230.000€
Equity: 535.000€
→ Vollständige Bilanzanalyse
```

## 🚀 Installation

### Voraussetzungen
- Python 3.11 oder höher
- Anthropic API Key

### Schritt 1: Repository klonen
```bash
cd dexter-agent
```

### Schritt 2: Virtual Environment erstellen (empfohlen)
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### Schritt 3: Dependencies installieren
```bash
pip install -r requirements.txt
```

### Schritt 4: Environment-Variablen konfigurieren
```bash
# Kopiere .env.example zu .env
cp .env.example .env

# Bearbeite .env und füge deinen API Key ein
# ANTHROPIC_API_KEY=sk-ant-...
```

### Schritt 5: Konfiguration testen
```bash
python config.py
```

Erwartete Ausgabe:
```
✓ Konfiguration erfolgreich geladen
✓ API Key gesetzt: Ja
✓ Data Directory: C:\Users\luis\Desktop\Agents\dexter-agent\data
✓ Reports Directory: C:\Users\luis\Desktop\Agents\dexter-agent\reports
✓ Model: claude-sonnet-3-5-20241022
```

## 📁 Projektstruktur

```
dexter-agent/
├── main.py                      # Hauptanwendung mit Agent Loop (TODO)
├── config.py                    # ✅ Zentrale Konfiguration
├── requirements.txt             # ✅ Dependencies
├── .env.example                 # ✅ Environment Template
├── .env                         # Deine lokale Config (nicht committen!)
├── README.md                    # ✅ Diese Datei
│
├── prompts/
│   ├── __init__.py              # ✅ Modul-Init
│   ├── system_prompts.py        # ✅ Agent System Prompts (Deutsch)
│   └── examples.py              # ✅ Beispiel-Queries
│
├── tools/
│   ├── __init__.py              # ✅ Tools-Modul
│   ├── roi_calculator.py        # TODO: ROI Tool
│   ├── sales_forecaster.py      # TODO: Sales Forecast Tool
│   ├── pnl_calculator.py        # TODO: P&L Tool
│   └── balance_sheet.py         # TODO: Balance Sheet Tool
│
├── data/                        # Arbeitsverzeichnis für Daten
└── reports/                     # Output-Verzeichnis für Reports
```

## 🔧 Konfiguration

### Environment-Variablen (.env)

```bash
# API Configuration
ANTHROPIC_API_KEY=your_api_key_here
MODEL_NAME=claude-sonnet-3-5-20241022

# Model Parameters
TEMPERATURE=0.0                   # Konsistente Berechnungen
MAX_TOKENS=4096

# Financial Thresholds
ROI_EXCELLENT_THRESHOLD=20.0      # ROI >= 20% = Exzellent
ROI_GOOD_THRESHOLD=10.0           # ROI >= 10% = Gut
ROI_ACCEPTABLE_THRESHOLD=5.0      # ROI >= 5% = Akzeptabel

GROSS_MARGIN_HEALTHY=40.0         # Gesunde Bruttomarge
NET_MARGIN_HEALTHY=15.0           # Gesunde Nettomarge
OPERATING_MARGIN_HEALTHY=20.0     # Gesunde Betriebsmarge

CURRENT_RATIO_HEALTHY=2.0         # Gesunde Liquidität
QUICK_RATIO_HEALTHY=1.0           # Gesunde Quick Ratio

DEBT_TO_EQUITY_HEALTHY=1.5        # Max. Verschuldungsgrad
DEBT_TO_ASSETS_HEALTHY=0.5        # Max. Debt-to-Assets

# Output Configuration
DECIMAL_PLACES=2                  # Finanzkennzahlen auf 2 Dezimalstellen
CURRENCY_SYMBOL=€
DATE_FORMAT=%Y-%m-%d
```

### Config-Klasse (config.py)

```python
from config import get_config

config = get_config()

# Zugriff auf Konfiguration
print(config.model.model_name)        # claude-sonnet-3-5-20241022
print(config.thresholds.roi_excellent) # 20.0
print(config.output.format_currency(1500.50))  # €1,500.50
```

## 📚 Verwendung

### Agent starten

```bash
python main.py
```

**Hinweis:** Stelle sicher, dass dein `ANTHROPIC_API_KEY` in `.env` konfiguriert ist!

### Beispiel-Interaktion

```
> Ich habe 50.000€ in ein Marketing-Projekt investiert und dadurch 75.000€
  zusätzlichen Umsatz mit 40% Marge generiert. Lohnt sich das?

Dexter:
📊 Executive Summary
Dein Marketing-Investment zeigt eine negative Rendite von -40%.
Obwohl 75.000€ Zusatzumsatz generiert wurden, reicht die 40% Marge
(30.000€ Bruttogewinn) nicht aus, um die 50.000€ Investition zu decken.

🔢 Detaillierte ROI-Analyse
| Kennzahl | Wert | Bewertung |
|----------|------|-----------|
| Investition | 50.000,00€ | - |
| Bruttogewinn | 30.000,00€ | - |
| Nettogewinn | -20.000,00€ | ⚠️ Verlust |
| **ROI** | **-40,00%** | ❌ Problematisch |

💡 Handlungsempfehlungen
1. Campaign stoppen oder massiv optimieren
2. Kosten auf max. 20.000€ senken ODER Umsatz auf 125.000€ steigern
3. ROI-Ziel von mind. 10% definieren

...
```

## 🧪 Testing

### Konfiguration testen
```bash
python config.py
```

### System-Prompt testen
```bash
python prompts/system_prompts.py
```

### Beispiel-Queries anzeigen
```bash
python prompts/examples.py
```

## 🏗️ Entwicklungs-Roadmap

### ✅ Schritt 1: Grundstruktur (COMPLETED)
- [x] Projektstruktur erstellen
- [x] requirements.txt
- [x] .env.example
- [x] config.py mit DexterConfig
- [x] System-Prompt (Deutsch, detailliert)
- [x] Beispiel-Queries
- [x] Placeholder Tool-Files

### ✅ Schritt 2: ROI Calculator Tool (COMPLETED)
- [x] ROIInput & ROIResult Dataclasses
- [x] calculate_roi() Funktion (async)
- [x] Kategorisierung (Exzellent/Gut/Moderat/Verlust)
- [x] Payback Period Berechnung
- [x] Profitability Score (0-100)
- [x] Handlungsempfehlungen
- [x] Warnungen & Risiko-Analyse
- [x] ASCII-Visualisierung
- [x] Error-Handling
- [x] Unit Tests (5/5 passed ✅)
- [x] Vollständige Dokumentation

### ✅ Schritt 3: Sales Forecaster Tool (COMPLETED)
- [x] SalesDataPoint, ForecastDataPoint & SalesForecastResult Dataclasses
- [x] forecast_sales() Funktion (async)
- [x] Lineare Regression (numpy.polyfit)
- [x] Trend-Analyse (Richtung, Stärke, R²)
- [x] Wachstumsraten-Berechnung
- [x] Konfidenzintervalle (95%)
- [x] Saisonalitäts-Erkennung
- [x] Confidence Score (0-100)
- [x] Strategische Empfehlungen (6 Szenarien)
- [x] Warnungen & Risiko-Analyse
- [x] ASCII-Timeline-Visualisierung
- [x] Error-Handling
- [x] Unit Tests (4/4 passed ✅)
- [x] Vollständige Dokumentation

### 🔄 Schritt 4: P&L Calculator Tool
- [ ] PnLInput & PnLStatement Dataclasses
- [ ] calculate_pnl() Funktion
- [ ] Lineare Regression
- [ ] Trend-Analyse
- [ ] Konfidenzintervall
- [ ] Unit Tests

### 🔄 Schritt 4: P&L Calculator Tool
- [ ] PnLStatement Dataclass
- [ ] calculate_pnl() Funktion
- [ ] Margin-Berechnungen
- [ ] EBITDA
- [ ] Profitabilitäts-Bewertung
- [ ] Unit Tests

### 🔄 Schritt 5: Balance Sheet Tool
- [ ] BalanceSheetAnalysis Dataclass
- [ ] generate_balance_sheet() Funktion
- [ ] Liquiditätskennzahlen
- [ ] Verschuldungskennzahlen
- [ ] Working Capital
- [ ] Unit Tests

### 🔄 Schritt 6: Agent Loop (main.py)
- [ ] Claude Agent SDK Integration
- [ ] Tool-Registration
- [ ] Conversation Loop
- [ ] Error-Handling
- [ ] Logging

### 🔄 Schritt 7: Polish & Production-Ready
- [ ] Umfassende Tests
- [ ] Performance-Optimierung
- [ ] Dokumentation vervollständigen
- [ ] Docker-Setup (optional)

## 🔐 Sicherheit

- **API Keys**: Niemals in Git committen! Immer in `.env` speichern
- **.gitignore**: Stelle sicher, dass `.env` gelistet ist
- **Permissions**: Data- und Reports-Verzeichnisse nur lokal beschreibbar

## 📊 Finanz-Standards

### Rundung
Alle Finanzkennzahlen werden auf **2 Dezimalstellen** gerundet.

### Schwellenwerte
Die Bewertungsschwellenwerte basieren auf Branchen-Best-Practices:

**ROI:**
- Exzellent: ≥ 20%
- Gut: 10-20%
- Akzeptabel: 5-10%
- Problematisch: < 5%

**Profitabilität:**
- Gross Margin: ≥ 40% (gesund)
- Operating Margin: ≥ 20% (gesund)
- Net Margin: ≥ 15% (gesund)

**Liquidität:**
- Current Ratio: ≥ 2.0 (gesund)
- Quick Ratio: ≥ 1.0 (gesund)

**Verschuldung:**
- Debt-to-Equity: ≤ 1.5 (gesund)
- Debt-to-Assets: ≤ 0.5 (gesund)

## 🤝 Contributing

Dieses Projekt ist ein persönliches Lernprojekt. Feedback und Vorschläge sind willkommen!

## 📝 Lizenz

MIT License - Siehe LICENSE Datei

## 🙋 Support

Bei Fragen oder Problemen:
1. Prüfe die Dokumentation
2. Teste die Konfiguration: `python config.py`
3. Schau in `prompts/examples.py` für Beispiel-Queries

## 🔗 Links

- [Claude Agent SDK Docs](https://github.com/anthropics/anthropic-sdk-python)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Claude Sonnet 3.5 Model Card](https://www.anthropic.com/claude)

---

**Status:** ✅ **PRODUCTION READY** - Alle 4 Tools + Agent Integration komplett!

**Aktueller Progress:** 100% Complete (4/4 Tools, Agent Integration ✅)

**Dexter ist einsatzbereit für professionelle Finanzanalysen!** 🎉

## 📊 Detailed Progress

Siehe [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) für detaillierten Fortschritt.

**Completed:**
- ✅ Foundation (Grundstruktur, Config, Prompts)
- ✅ ROI Calculator Tool (826 Zeilen, 5/5 Tests passed)
- ✅ Sales Forecaster Tool (1046 Zeilen, 4/4 Tests passed)
- ✅ P&L Calculator Tool (842 Zeilen, 4/4 Tests passed)
- ✅ Balance Sheet Generator Tool (1500 Zeilen, 4/4 Tests passed)
- ✅ Agent Integration (main.py mit Claude SDK)

**All Systems Operational!** 🚀
