"""
Tool Definition Converter: Anthropic → OpenAI Format

Konvertiert Tool-Definitionen von Anthropic Claude Format zu OpenAI Function Calling Format.
"""

from typing import Dict, List, Any


def convert_anthropic_tool_to_openai(anthropic_tool: Dict[str, Any]) -> Dict[str, Any]:
    """
    Konvertiert ein Tool von Anthropic zu OpenAI Format

    Anthropic Format:
    {
        "name": "tool_name",
        "description": "Tool description",
        "input_schema": {
            "type": "object",
            "properties": {...},
            "required": [...]
        }
    }

    OpenAI Format:
    {
        "type": "function",
        "function": {
            "name": "tool_name",
            "description": "Tool description",
            "parameters": {
                "type": "object",
                "properties": {...},
                "required": [...]
            }
        }
    }

    Args:
        anthropic_tool: Tool-Definition im Anthropic Format

    Returns:
        Tool-Definition im OpenAI Format
    """
    return {
        "type": "function",
        "function": {
            "name": anthropic_tool["name"],
            "description": anthropic_tool["description"],
            "parameters": anthropic_tool["input_schema"]
        }
    }


def convert_tools_to_openai(anthropic_tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Konvertiert Liste von Tools zu OpenAI Format

    Args:
        anthropic_tools: Liste von Tools im Anthropic Format

    Returns:
        Liste von Tools im OpenAI Format
    """
    return [convert_anthropic_tool_to_openai(tool) for tool in anthropic_tools]


def register_dexter_tools() -> List[Dict[str, Any]]:
    """
    Registriert alle Dexter Financial Analysis Tools im OpenAI Format

    Returns:
        Liste von 6 Tool-Definitionen (OpenAI Function Calling Format)
    """
    tools = []

    # 1. ROI Calculator
    tools.append({
        "type": "function",
        "function": {
            "name": "calculate_roi",
            "description": """Berechnet Return on Investment (ROI) für Projekte oder Investitionen.

Nutze dieses Tool wenn der User fragt nach:
- ROI-Berechnung, Rentabilität, Profitabilität
- "Lohnt sich die Investition?"
- Amortisationszeit, Payback Period
- Investment-Bewertung

Das Tool gibt detaillierte Finanzanalyse mit Empfehlungen zurück.""",
            "parameters": {
                "type": "object",
                "properties": {
                    "investment_cost": {
                        "type": "number",
                        "description": "Initiale Investitionskosten in Euro"
                    },
                    "revenue_generated": {
                        "type": "number",
                        "description": "Generierte Einnahmen über den Zeitraum in Euro"
                    },
                    "timeframe_months": {
                        "type": "integer",
                        "description": "Zeitraum in Monaten"
                    },
                    "recurring_costs": {
                        "type": "number",
                        "description": "Optional: Monatliche laufende Kosten in Euro"
                    }
                },
                "required": ["investment_cost", "revenue_generated", "timeframe_months"]
            }
        }
    })

    # 2. Sales Forecaster
    tools.append({
        "type": "function",
        "function": {
            "name": "forecast_sales",
            "description": """Erstellt Verkaufsprognosen basierend auf historischen Daten.

Nutze dieses Tool für:
- Sales Predictions, Verkaufsprognosen
- Trend-Analysen, Wachstumsraten
- Revenue Forecasting
- "Wie entwickeln sich die Verkäufe?"

Das Tool nutzt lineare Regression mit optionaler Saisonalitäts-Anpassung.""",
            "parameters": {
                "type": "object",
                "properties": {
                    "historical_sales": {
                        "type": "array",
                        "description": "Liste historischer Verkaufsdaten",
                        "items": {
                            "type": "object",
                            "properties": {
                                "date": {"type": "string", "description": "Datum im Format YYYY-MM-DD"},
                                "amount": {"type": "number", "description": "Verkaufsbetrag"}
                            },
                            "required": ["date", "amount"]
                        }
                    },
                    "forecast_months": {
                        "type": "integer",
                        "description": "Anzahl Monate für Prognose (empfohlen: 1-12)"
                    },
                    "include_seasonality": {
                        "type": "boolean",
                        "description": "Saisonalität berücksichtigen? (benötigt >= 12 Monate Daten)"
                    }
                },
                "required": ["historical_sales", "forecast_months"]
            }
        }
    })

    # 3. P&L Calculator
    tools.append({
        "type": "function",
        "function": {
            "name": "calculate_pnl",
            "description": """Berechnet vollständige Gewinn- und Verlustrechnung (P&L Statement).

Nutze dieses Tool für:
- P&L, GuV, Income Statement
- Profitability Analysis, Rentabilitätsanalyse
- Margin Analysis (Gross, Operating, Net Margin)
- "Wie profitabel ist das Geschäft?"

Das Tool erstellt detailliertes P&L Statement nach GAAP-Standards.""",
            "parameters": {
                "type": "object",
                "properties": {
                    "revenue": {
                        "type": "number",
                        "description": "Gesamtumsatz in Euro"
                    },
                    "cost_of_goods_sold": {
                        "type": "number",
                        "description": "Wareneinsatz/Produktionskosten in Euro"
                    },
                    "operating_expenses": {
                        "type": "object",
                        "description": "Betriebsausgaben nach Kategorien",
                        "properties": {
                            "salaries": {"type": "number"},
                            "marketing": {"type": "number"},
                            "rent": {"type": "number"},
                            "utilities": {"type": "number"},
                            "software_it": {"type": "number"},
                            "insurance": {"type": "number"},
                            "depreciation": {"type": "number"},
                            "other": {"type": "number"}
                        }
                    },
                    "period": {
                        "type": "string",
                        "description": "Zeitraum z.B. 'Q1 2025' oder 'FY 2025'"
                    },
                    "tax_rate": {
                        "type": "number",
                        "description": "Steuersatz (0.25 = 25%)"
                    }
                },
                "required": ["revenue", "cost_of_goods_sold", "operating_expenses", "period"]
            }
        }
    })

    # 4. Balance Sheet Generator
    tools.append({
        "type": "function",
        "function": {
            "name": "generate_balance_sheet",
            "description": """Generiert vollständige Bilanz (Balance Sheet) mit Financial Ratios.

Nutze dieses Tool für:
- Bilanz, Balance Sheet, Vermögensübersicht
- Financial Position, Finanzielle Lage
- Liquiditätsanalyse, Working Capital
- Verschuldungsgrad, Debt-to-Equity

Das Tool erstellt GAAP/IFRS-konforme Bilanzen mit 6 Key Ratios und Health Score.""",
            "parameters": {
                "type": "object",
                "properties": {
                    "assets": {
                        "type": "object",
                        "description": "Aktiva (Current & Fixed Assets)",
                        "properties": {
                            "cash": {"type": "number"},
                            "accounts_receivable": {"type": "number"},
                            "inventory": {"type": "number"},
                            "prepaid_expenses": {"type": "number"},
                            "other_current": {"type": "number"},
                            "property": {"type": "number"},
                            "equipment": {"type": "number"},
                            "vehicles": {"type": "number"},
                            "intangible_assets": {"type": "number"},
                            "other_fixed": {"type": "number"}
                        }
                    },
                    "liabilities": {
                        "type": "object",
                        "description": "Verbindlichkeiten (Current & Long-term)",
                        "properties": {
                            "accounts_payable": {"type": "number"},
                            "short_term_debt": {"type": "number"},
                            "accrued_expenses": {"type": "number"},
                            "unearned_revenue": {"type": "number"},
                            "other_current": {"type": "number"},
                            "long_term_debt": {"type": "number"},
                            "bonds_payable": {"type": "number"},
                            "deferred_tax": {"type": "number"},
                            "pension_obligations": {"type": "number"},
                            "other_long_term": {"type": "number"}
                        }
                    },
                    "equity": {
                        "type": "object",
                        "description": "Eigenkapital",
                        "properties": {
                            "share_capital": {"type": "number"},
                            "capital_reserves": {"type": "number"},
                            "retained_earnings": {"type": "number"},
                            "current_year_profit": {"type": "number"}
                        }
                    },
                    "date": {
                        "type": "string",
                        "description": "Bilanzstichtag im Format YYYY-MM-DD"
                    }
                },
                "required": ["assets", "liabilities", "equity", "date"]
            }
        }
    })

    # 5. Cash Flow Statement
    tools.append({
        "type": "function",
        "function": {
            "name": "generate_cash_flow_statement",
            "description": """Generiert vollständige Kapitalflussrechnung (Cash Flow Statement) mit Qualitäts-Analyse.

Nutze dieses Tool für:
- Cash Flow Statement, Kapitalflussrechnung
- Liquiditätsanalyse, Cash Generation
- Free Cash Flow (FCF) Berechnung
- Operating/Investing/Financing Cash Flows
- Cash Flow Quality Score

Das Tool erstellt GAAP/IFRS-konforme Statements nach der Indirect Method mit detaillierter Liquiditätsbewertung.""",
            "parameters": {
                "type": "object",
                "properties": {
                    "operating_activities": {
                        "type": "object",
                        "description": "Operating Cash Flow Komponenten",
                        "properties": {
                            "net_income": {"type": "number"},
                            "depreciation": {"type": "number"},
                            "amortization": {"type": "number"},
                            "change_in_receivables": {"type": "number"},
                            "change_in_inventory": {"type": "number"},
                            "change_in_payables": {"type": "number"},
                            "other_operating": {"type": "number"}
                        }
                    },
                    "investing_activities": {
                        "type": "object",
                        "description": "Investing Cash Flow Komponenten",
                        "properties": {
                            "capex": {"type": "number"},
                            "asset_sales": {"type": "number"},
                            "investments_purchased": {"type": "number"},
                            "investments_sold": {"type": "number"},
                            "other_investing": {"type": "number"}
                        }
                    },
                    "financing_activities": {
                        "type": "object",
                        "description": "Financing Cash Flow Komponenten",
                        "properties": {
                            "debt_issued": {"type": "number"},
                            "debt_repaid": {"type": "number"},
                            "equity_issued": {"type": "number"},
                            "dividends_paid": {"type": "number"},
                            "other_financing": {"type": "number"}
                        }
                    },
                    "beginning_cash": {
                        "type": "number",
                        "description": "Kassenbestand zu Beginn der Periode"
                    },
                    "period": {
                        "type": "string",
                        "description": "Zeitraum z.B. 'Q1 2025'"
                    }
                },
                "required": ["operating_activities", "investing_activities", "financing_activities", "beginning_cash", "period"]
            }
        }
    })

    # 6. Break-Even Analysis
    tools.append({
        "type": "function",
        "function": {
            "name": "analyze_break_even",
            "description": """Berechnet Break-Even-Point und erstellt Profitabilitätsanalyse.

Nutze dieses Tool für:
- Break-Even-Analyse, Gewinnschwelle
- "Ab wann sind wir profitabel?"
- Deckungsbeitragsrechnung
- Szenario-Analysen (Best/Base/Worst Case)

Das Tool berechnet Break-Even-Units, Safety Margin und zeigt Profitabilitätsverlauf über 12 Monate.""",
            "parameters": {
                "type": "object",
                "properties": {
                    "fixed_costs": {
                        "type": "number",
                        "description": "Fixkosten pro Periode (monatlich) in Euro"
                    },
                    "variable_cost_per_unit": {
                        "type": "number",
                        "description": "Variable Kosten pro Einheit in Euro"
                    },
                    "price_per_unit": {
                        "type": "number",
                        "description": "Verkaufspreis pro Einheit in Euro"
                    },
                    "expected_units": {
                        "type": "integer",
                        "description": "Erwartete Verkaufsmenge (Einheiten)"
                    },
                    "run_scenarios": {
                        "type": "boolean",
                        "description": "Szenario-Analysen durchführen? (Best/Base/Worst Case)"
                    }
                },
                "required": ["fixed_costs", "variable_cost_per_unit", "price_per_unit", "expected_units"]
            }
        }
    })

    return tools


if __name__ == "__main__":
    # Test Tool Conversion
    print("🧪 Teste Tool Converter...")

    # Register all tools
    tools = register_dexter_tools()
    print(f"\n✓ {len(tools)} Tools registriert im OpenAI Format")

    # Print first tool as example
    import json
    print("\nBeispiel - ROI Calculator:")
    print(json.dumps(tools[0], indent=2, ensure_ascii=False))

    print("\n✅ Tool Converter erfolgreich!")
