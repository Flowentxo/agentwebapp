"""
Beispiel-Queries für den Dexter Financial Analyst Agent.

Diese Beispiele zeigen typische Anfragen und erwartete Antworten
für jeden der vier Finanz-Tools.
"""

from typing import List, Dict

# Beispiel-Queries für jedes Tool
EXAMPLE_QUERIES: Dict[str, List[str]] = {
    "roi_calculator": [
        "Ich habe 50.000€ in ein Marketing-Projekt investiert und dadurch 75.000€ zusätzlichen Umsatz mit 40% Marge generiert. Lohnt sich das?",
        "Berechne den ROI für eine Maschineninvestition: Kosten 120.000€, erwarteter jährlicher Mehrgewinn 35.000€ über 5 Jahre",
        "Investition: 10.000€, Rückfluss nach 2 Jahren: 15.500€. Was ist der ROI und die Amortisationszeit?",
        "Vergleiche zwei Projekte: Projekt A (100k Investment, 25k jährlicher Gewinn) vs Projekt B (150k Investment, 45k jährlicher Gewinn)",
    ],

    "sales_forecaster": [
        "Basierend auf folgenden Quartalsumsätzen, was kannst du für Q4 2024 prognostizieren: Q1: 120k, Q2: 135k, Q3: 155k, Q4: 180k, Q1 2024: 145k, Q2 2024: 170k, Q3 2024: 190k",
        "Verkaufszahlen der letzten 6 Monate: Jan: 45k, Feb: 52k, März: 48k, Apr: 61k, Mai: 58k, Jun: 67k. Prognose für Juli bis Dezember?",
        "Erstelle eine 12-Monats-Prognose basierend auf: 2023 Gesamtumsatz 1.2M€, 2022: 980k€, 2021: 820k€",
        "Sales-Daten: Monat 1-12: [23k, 25k, 29k, 27k, 31k, 35k, 33k, 38k, 42k, 40k, 45k, 51k]. Forecaste die nächsten 6 Monate.",
    ],

    "pnl_calculator": [
        "Erstelle eine P&L Analyse: Umsatz 500.000€, Wareneinsatz 200.000€, Personalkosten 150.000€, Miete 30.000€, Marketing 40.000€, Sonstige Kosten 25.000€",
        "P&L für Q3 2024: Revenue 1.2M€, COGS 480k€, Operating Expenses 550k€ (davon Gehälter 350k€, Marketing 120k€, Overheads 80k€)",
        "Bewerte die Profitabilität: Gesamtumsatz 850.000€, direkte Kosten 340.000€, indirekte Kosten 380.000€, Steuern 25%, Zinsen 15.000€",
        "Vergleiche zwei Produktlinien: Produkt A (300k Umsatz, 120k COGS, 80k OpEx) vs Produkt B (450k Umsatz, 200k COGS, 150k OpEx)",
    ],

    "balance_sheet": [
        "Erstelle eine Bilanzanalyse: Aktiva (Cash 120k, AR 85k, Inventory 60k, Equipment 200k), Passiva (AP 45k, Loans 150k, Equity 270k)",
        "Bewerte die Liquidität: Umlaufvermögen (Kasse 50k, Forderungen 120k, Vorräte 80k), kurzfristige Verbindlichkeiten 180k",
        "Balance Sheet Check: Assets (Current: 450k, Fixed: 800k), Liabilities (Current: 220k, Long-term: 600k), Equity: 430k",
        "Analyse für Kreditantrag: Total Assets 1.5M€, davon 600k kurzfristig. Schulden: 400k kurzfristig, 500k langfristig. Eigenkapital?",
    ],

    "general": [
        "Was sind die wichtigsten Finanzkennzahlen für ein SaaS-Startup?",
        "Erkläre mir den Unterschied zwischen Bruttomarge und Nettomarge",
        "Wie interpretiere ich eine Current Ratio von 1.5?",
        "Was ist ein gesunder ROI für Marketing-Investitionen?",
        "Welche Tools hast du und wofür sind sie gut?",
    ]
}


# Erwartete Antwort-Strukturen (Templates)
EXPECTED_RESPONSE_STRUCTURE = {
    "roi_calculator": """
## 📊 Executive Summary
[Zusammenfassung: ROI-Wert und Bewertung]

## 🔢 Detaillierte ROI-Analyse

| Kennzahl | Wert | Bewertung |
|----------|------|-----------|
| Investition | X,XX€ | - |
| Rückfluss/Gewinn | X,XX€ | - |
| **ROI** | **X,XX%** | [Kategorie] |
| Payback Period | X,XX Jahre | - |

### Interpretation
[Detaillierte Analyse des ROI-Wertes]

## 💡 Handlungsempfehlungen
1. [Konkrete Maßnahme]
2. [Weitere Maßnahme]

## 📋 Raw Data
```json
{
  "tool_used": "roi_calculator",
  "input_data": {...},
  "calculated_results": {...}
}
```
""",

    "sales_forecaster": """
## 📊 Executive Summary
[Zusammenfassung: Trend und Prognose]

## 🔢 Sales Forecast Ergebnisse

### Historische Daten
| Periode | Umsatz | Wachstum |
|---------|--------|----------|
| ... | ... | ... |

### Prognose
| Periode | Forecast | Konfidenz |
|---------|----------|-----------|
| ... | ... | ... |

### Trend-Analyse
- Durchschnittliches Wachstum: X,XX%
- Trend: [Steigend/Fallend/Stabil]

## 💡 Handlungsempfehlungen
[Planungsempfehlungen basierend auf Forecast]

## 📋 Raw Data
```json
{
  "tool_used": "sales_forecaster",
  "historical_data": [...],
  "forecast": [...],
  "metrics": {...}
}
```
""",

    "pnl_calculator": """
## 📊 Executive Summary
[Profitabilitäts-Zusammenfassung]

## 🔢 Gewinn- und Verlustrechnung

| Position | Betrag | % vom Umsatz |
|----------|--------|--------------|
| **Umsatz** | X,XX€ | 100,00% |
| COGS | X,XX€ | XX,XX% |
| **Bruttogewinn** | X,XX€ | **XX,XX%** |
| Operating Expenses | X,XX€ | XX,XX% |
| **Betriebsgewinn (EBIT)** | X,XX€ | **XX,XX%** |
| Zinsen & Steuern | X,XX€ | XX,XX% |
| **Nettogewinn** | X,XX€ | **XX,XX%** |

### Kennzahlen-Bewertung
- Bruttomarge: [Bewertung]
- Betriebsmarge: [Bewertung]
- Nettomarge: [Bewertung]

## 💡 Handlungsempfehlungen
[Maßnahmen zur Margin-Verbesserung]

## 📋 Raw Data
```json
{
  "tool_used": "pnl_calculator",
  "income_statement": {...},
  "margins": {...}
}
```
""",

    "balance_sheet": """
## 📊 Executive Summary
[Finanzpositions-Zusammenfassung]

## 🔢 Bilanzanalyse

### Bilanz
| Aktiva | Betrag | Passiva | Betrag |
|--------|--------|---------|--------|
| Umlaufvermögen | X,XX€ | Kurzfr. Verbindlichkeiten | X,XX€ |
| Anlagevermögen | X,XX€ | Langfr. Verbindlichkeiten | X,XX€ |
| | | Eigenkapital | X,XX€ |
| **Summe Aktiva** | **X,XX€** | **Summe Passiva** | **X,XX€** |

### Kennzahlen
| Kennzahl | Wert | Bewertung |
|----------|------|-----------|
| Working Capital | X,XX€ | - |
| Current Ratio | X,XX | [Status] |
| Quick Ratio | X,XX | [Status] |
| Debt-to-Equity | X,XX | [Status] |
| Equity Ratio | XX,XX% | [Status] |

## 💡 Handlungsempfehlungen
[Liquiditäts- und Kapitalstruktur-Optimierung]

## 📋 Raw Data
```json
{
  "tool_used": "balance_sheet_generator",
  "balance_sheet": {...},
  "ratios": {...}
}
```
"""
}


# Test-Daten für Tool-Entwicklung
TEST_DATA = {
    "roi_test_case": {
        "investment": 50000.00,
        "revenue_generated": 75000.00,
        "margin_percent": 40.00
    },

    "sales_test_case": {
        "historical_sales": [
            {"period": "2024-Q1", "amount": 145000},
            {"period": "2024-Q2", "amount": 170000},
            {"period": "2024-Q3", "amount": 190000},
        ],
        "forecast_periods": 4
    },

    "pnl_test_case": {
        "revenue": 500000.00,
        "cogs": 200000.00,
        "operating_expenses": {
            "salaries": 150000.00,
            "rent": 30000.00,
            "marketing": 40000.00,
            "other": 25000.00
        },
        "interest": 5000.00,
        "tax_rate": 0.25
    },

    "balance_sheet_test_case": {
        "assets": {
            "current": {
                "cash": 120000.00,
                "accounts_receivable": 85000.00,
                "inventory": 60000.00
            },
            "non_current": {
                "equipment": 200000.00,
                "property": 300000.00
            }
        },
        "liabilities": {
            "current": {
                "accounts_payable": 45000.00,
                "short_term_loans": 35000.00
            },
            "non_current": {
                "long_term_loans": 150000.00
            }
        }
    }
}


def get_example_queries_by_tool(tool_name: str) -> List[str]:
    """
    Hole Beispiel-Queries für ein bestimmtes Tool.

    Args:
        tool_name: Name des Tools (roi_calculator, sales_forecaster, etc.)

    Returns:
        Liste von Beispiel-Queries
    """
    return EXAMPLE_QUERIES.get(tool_name, [])


def get_all_examples() -> Dict[str, List[str]]:
    """Hole alle Beispiel-Queries."""
    return EXAMPLE_QUERIES


def get_test_data(test_case: str) -> Dict:
    """
    Hole Test-Daten für Tool-Entwicklung.

    Args:
        test_case: Name des Test-Cases

    Returns:
        Test-Daten Dictionary
    """
    return TEST_DATA.get(test_case, {})


if __name__ == "__main__":
    # Zeige Beispiele für jedes Tool
    print("=== DEXTER EXAMPLE QUERIES ===\n")

    for tool, queries in EXAMPLE_QUERIES.items():
        print(f"\n📊 {tool.upper().replace('_', ' ')}")
        print("=" * 60)
        for i, query in enumerate(queries, 1):
            print(f"{i}. {query}")

    print(f"\n\nGesamt: {sum(len(q) for q in EXAMPLE_QUERIES.values())} Beispiel-Queries")
