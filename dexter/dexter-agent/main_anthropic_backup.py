"""
Dexter Financial Analyst Agent - Hauptanwendung

Integriert alle 6 Financial Analysis Power-Ups mit Claude Agent SDK:
- ROI Calculator
- Sales Forecaster
- P&L Calculator
- Balance Sheet Generator
- Cash Flow Statement Generator
- Break-Even Analysis

Author: Dexter Agent Development Team
Version: 3.0.0
"""

import asyncio
import sys
from pathlib import Path
from typing import AsyncIterator
from datetime import datetime

# Claude Agent SDK
from anthropic import Anthropic

# Lokale Imports
from config import get_config
from prompts.system_prompts import DEXTER_MAIN_SYSTEM_PROMPT
from tools.roi_calculator import calculate_roi
from tools.sales_forecaster import forecast_sales
from tools.pnl_calculator import calculate_pnl
from tools.balance_sheet import generate_balance_sheet
from tools.cash_flow_statement import generate_cash_flow_statement
from tools.break_even_analysis import analyze_break_even

# Konfiguration laden
config = get_config()

# Logging Setup
import logging

# Logs Directory erstellen
logs_dir = Path(__file__).parent / "logs"
logs_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(logs_dir / f'dexter_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# ============================================================================
# DEXTER AGENT CLASS
# ============================================================================

class DexterAgent:
    """
    Dexter Financial Analyst Agent

    Orchestriert Financial Analysis Tools mit Claude Sonnet 3.5.
    Implementiert Tool-Use Pattern für strukturierte Financial Analysis.
    """

    def __init__(self):
        """Initialisiert Dexter Agent mit Claude SDK"""
        self.client = Anthropic(api_key=config.api_key)
        self.model = config.model.name
        self.conversation_history = []
        self.tools = self._register_tools()
        self.system_prompt = DEXTER_MAIN_SYSTEM_PROMPT
        self.turn_count = 0

        logger.info(f"🤖 Dexter Agent initialisiert mit Model: {self.model}")
        logger.info(f"🔧 {len(self.tools)} Tools registriert")

    def _register_tools(self) -> list[dict]:
        """
        Registriert alle 4 Financial Analysis Tools für Claude

        Returns:
            Liste von Tool-Definitionen im Claude Format
        """
        tools = []

        # 1. ROI Calculator
        tools.append({
            "name": "calculate_roi",
            "description": """Berechnet Return on Investment (ROI) für Projekte oder Investitionen.

Nutze dieses Tool wenn der User fragt nach:
- ROI-Berechnung, Rentabilität, Profitabilität
- "Lohnt sich die Investition?"
- Amortisationszeit, Payback Period
- Investment-Bewertung

Das Tool gibt detaillierte Finanzanalyse mit Empfehlungen zurück.""",
            "input_schema": {
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
        })

        # 2. Sales Forecaster
        tools.append({
            "name": "forecast_sales",
            "description": """Erstellt Verkaufsprognosen basierend auf historischen Daten.

Nutze dieses Tool für:
- Sales Predictions, Verkaufsprognosen
- Trend-Analysen, Wachstumsraten
- Revenue Forecasting
- "Wie entwickeln sich die Verkäufe?"

Das Tool nutzt lineare Regression mit optionaler Saisonalitäts-Anpassung.""",
            "input_schema": {
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
        })

        # 3. P&L Calculator
        tools.append({
            "name": "calculate_pnl",
            "description": """Berechnet vollständige Gewinn- und Verlustrechnung (P&L Statement).

Nutze dieses Tool für:
- P&L, GuV, Income Statement
- Profitability Analysis, Rentabilitätsanalyse
- Margin Analysis (Gross, Operating, Net Margin)
- "Wie profitabel ist das Geschäft?"

Das Tool erstellt detailliertes P&L Statement nach GAAP-Standards.""",
            "input_schema": {
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
        })

        # 4. Balance Sheet Generator
        tools.append({
            "name": "generate_balance_sheet",
            "description": """Generiert vollständige Bilanz (Balance Sheet) mit Financial Ratios.

Nutze dieses Tool für:
- Bilanz, Balance Sheet, Vermögensübersicht
- Financial Position, Finanzielle Lage
- Liquiditätsanalyse, Working Capital
- Verschuldungsgrad, Debt-to-Equity

Das Tool erstellt GAAP/IFRS-konforme Bilanzen mit 6 Key Ratios und Health Score.""",
            "input_schema": {
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
        })

        # 5. Cash Flow Statement
        tools.append({
            "name": "generate_cash_flow_statement",
            "description": """Generiert vollständige Kapitalflussrechnung (Cash Flow Statement) mit Qualitäts-Analyse.

Nutze dieses Tool für:
- Cash Flow Statement, Kapitalflussrechnung
- Liquiditätsanalyse, Cash Generation
- Free Cash Flow (FCF) Berechnung
- Operating/Investing/Financing Cash Flows
- Cash Flow Quality Score

Das Tool erstellt GAAP/IFRS-konforme Statements nach der Indirect Method mit detaillierter Liquiditätsbewertung.""",
            "input_schema": {
                "type": "object",
                "properties": {
                    "operating_activities": {
                        "type": "object",
                        "description": "Operating Cash Flow Komponenten",
                        "properties": {
                            "net_income": {"type": "number"},
                            "depreciation_amortization": {"type": "number"},
                            "changes_in_receivables": {"type": "number"},
                            "changes_in_inventory": {"type": "number"},
                            "changes_in_payables": {"type": "number"},
                            "other_operating": {"type": "number"}
                        }
                    },
                    "investing_activities": {
                        "type": "object",
                        "description": "Investing Cash Flow Komponenten",
                        "properties": {
                            "capital_expenditures": {"type": "number"},
                            "acquisition_of_businesses": {"type": "number"},
                            "sale_of_assets": {"type": "number"},
                            "investment_purchases": {"type": "number"},
                            "investment_sales": {"type": "number"},
                            "other_investing": {"type": "number"}
                        }
                    },
                    "financing_activities": {
                        "type": "object",
                        "description": "Financing Cash Flow Komponenten",
                        "properties": {
                            "debt_issued": {"type": "number"},
                            "debt_repayment": {"type": "number"},
                            "equity_issued": {"type": "number"},
                            "dividends_paid": {"type": "number"},
                            "share_buybacks": {"type": "number"},
                            "other_financing": {"type": "number"}
                        }
                    },
                    "beginning_cash": {
                        "type": "number",
                        "description": "Cash-Bestand zu Periodenbeginn in Euro"
                    },
                    "period": {
                        "type": "string",
                        "description": "Zeitraum z.B. 'Q1 2025' oder 'FY 2025'"
                    },
                    "revenue": {
                        "type": "number",
                        "description": "Optional: Umsatz für Cash Flow Margin Berechnung"
                    }
                },
                "required": ["operating_activities", "investing_activities", "financing_activities", "beginning_cash", "period"]
            }
        })

        # 6. Break-Even Analysis
        tools.append({
            "name": "analyze_break_even",
            "description": """Führt Break-Even Analyse für Produkte oder Geschäftsmodelle durch.

Nutze dieses Tool für:
- Break-Even Point Berechnung (Gewinnschwelle)
- Margin of Safety (Sicherheitsmarge)
- Target Profit Analysis (Gewinnziel-Planung)
- Pricing Strategy Evaluation
- "Ab wann ist das Geschäft profitabel?"
- "Wie viele Units muss ich verkaufen?"

Das Tool berechnet Break-Even in Units und Revenue plus Scenario Analysis.""",
            "input_schema": {
                "type": "object",
                "properties": {
                    "fixed_costs": {
                        "type": "number",
                        "description": "Fixkosten pro Periode in Euro (Miete, Gehälter, etc.)"
                    },
                    "variable_cost_per_unit": {
                        "type": "number",
                        "description": "Variable Kosten pro Einheit in Euro"
                    },
                    "selling_price_per_unit": {
                        "type": "number",
                        "description": "Verkaufspreis pro Einheit in Euro"
                    },
                    "current_sales_units": {
                        "type": "integer",
                        "description": "Optional: Aktuelle Verkaufsmenge (für Margin of Safety)"
                    },
                    "target_profit": {
                        "type": "number",
                        "description": "Optional: Gewinnziel in Euro (für Target Profit Analysis)"
                    }
                },
                "required": ["fixed_costs", "variable_cost_per_unit", "selling_price_per_unit"]
            }
        })

        logger.info(f"✅ Alle {len(tools)} Tools erfolgreich registriert")
        return tools

    async def _execute_tool(self, tool_name: str, tool_input: dict) -> dict:
        """
        Führt Tool aus basierend auf Namen

        Args:
            tool_name: Name des Tools
            tool_input: Input-Parameter für Tool

        Returns:
            Tool-Ergebnis als dict
        """
        logger.info(f"🔧 Executing Tool: {tool_name}")
        logger.debug(f"Tool Input: {tool_input}")

        try:
            if tool_name == "calculate_roi":
                result = await calculate_roi(**tool_input)
            elif tool_name == "forecast_sales":
                result = await forecast_sales(**tool_input)
            elif tool_name == "calculate_pnl":
                result = await calculate_pnl(**tool_input)
            elif tool_name == "generate_balance_sheet":
                result = await generate_balance_sheet(**tool_input)
            elif tool_name == "generate_cash_flow_statement":
                result = await generate_cash_flow_statement(**tool_input)
            elif tool_name == "analyze_break_even":
                result = await analyze_break_even(**tool_input)
            else:
                raise ValueError(f"Unknown tool: {tool_name}")

            logger.info(f"✅ Tool {tool_name} erfolgreich ausgeführt")
            return result

        except Exception as e:
            logger.error(f"❌ Tool Execution Error: {str(e)}", exc_info=True)
            return {
                "error": str(e),
                "tool_name": tool_name
            }

    async def chat(self, user_message: str) -> AsyncIterator[str]:
        """
        Hauptmethode für Chat mit Dexter

        Implementiert Tool-Use Pattern mit Claude:
        1. User Message → Claude
        2. Claude ruft Tools auf (tool_use blocks)
        3. Tools werden ausgeführt
        4. Tool Results → Claude
        5. Claude generiert finale Antwort

        Args:
            user_message: User-Nachricht

        Yields:
            Response chunks als String
        """
        self.turn_count += 1
        logger.info(f"\n{'='*60}")
        logger.info(f"Turn {self.turn_count} - User: {user_message[:100]}...")
        logger.info(f"{'='*60}")

        # User Message zur History hinzufügen
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })

        # Initiale Claude Request
        response = await asyncio.to_thread(
            self.client.messages.create,
            model=self.model,
            max_tokens=config.model.max_tokens,
            temperature=config.model.temperature,
            system=self.system_prompt,
            messages=self.conversation_history,
            tools=self.tools
        )

        # Verarbeite Response (kann Tool-Calls enthalten)
        assistant_message = {"role": "assistant", "content": []}

        for block in response.content:
            if block.type == "text":
                # Text-Response
                assistant_message["content"].append(block)
                yield block.text

            elif block.type == "tool_use":
                # Tool wird aufgerufen
                assistant_message["content"].append(block)

                tool_name = block.name
                tool_input = block.input
                tool_use_id = block.id

                logger.info(f"🔧 Tool Call: {tool_name}")
                yield f"\n\n[Verwende Tool: {tool_name}]\n\n"

                # Tool ausführen
                tool_result = await self._execute_tool(tool_name, tool_input)

                # Zeige formatted output wenn vorhanden
                if "formatted_output" in tool_result:
                    yield tool_result["formatted_output"]

                # Tool Result zur History
                self.conversation_history.append(assistant_message)
                self.conversation_history.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,
                        "content": str(tool_result)
                    }]
                })

                # Continuation Request (Claude verarbeitet Tool Result)
                continuation_response = await asyncio.to_thread(
                    self.client.messages.create,
                    model=self.model,
                    max_tokens=config.model.max_tokens,
                    temperature=config.model.temperature,
                    system=self.system_prompt,
                    messages=self.conversation_history,
                    tools=self.tools
                )

                # Verarbeite Continuation (kann weitere Tools oder Text sein)
                continuation_message = {"role": "assistant", "content": []}
                for cont_block in continuation_response.content:
                    continuation_message["content"].append(cont_block)
                    if cont_block.type == "text":
                        yield f"\n\n{cont_block.text}"

                # Continuation zur History
                self.conversation_history.append(continuation_message)

        # Finale Assistant Message zur History (nur wenn noch nicht hinzugefügt)
        if response.content and not any(
            msg.get("role") == "assistant" and msg.get("content") == response.content
            for msg in self.conversation_history[-2:]
        ):
            self.conversation_history.append({
                "role": "assistant",
                "content": response.content
            })

    def reset_conversation(self):
        """Startet neue Conversation (löscht History)"""
        self.conversation_history = []
        self.turn_count = 0
        logger.info("🔄 Conversation zurückgesetzt")


# ============================================================================
# INTERACTIVE CLI
# ============================================================================

async def main():
    """Haupt-CLI für Dexter Agent"""

    # ASCII Art Banner
    print("""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  ██████╗ ███████╗██╗  ██╗████████╗███████╗██████╗          ║
║  ██╔══██╗██╔════╝╚██╗██╔╝╚══██╔══╝██╔════╝██╔══██╗         ║
║  ██║  ██║█████╗   ╚███╔╝    ██║   █████╗  ██████╔╝         ║
║  ██║  ██║██╔══╝   ██╔██╗    ██║   ██╔══╝  ██╔══██╗         ║
║  ██████╔╝███████╗██╔╝ ██╗   ██║   ███████╗██║  ██║         ║
║  ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝         ║
║                                                              ║
║           KI-Finanzanalyst für professionelle               ║
║              Unternehmensanalysen                            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
""")

    print(f"Model: {config.model.name}")
    print(f"Version: 3.0.0")
    print(f"\n{'='*60}")
    print("Verfügbare Power-Ups:")
    print("  📊 ROI Calculator - Return on Investment Analysen")
    print("  📈 Sales Forecaster - Verkaufsprognosen")
    print("  💰 P&L Calculator - Gewinn- und Verlustrechnungen")
    print("  🏦 Balance Sheet - Bilanz-Generierung")
    print("  💸 Cash Flow Statement - Kapitalflussrechnung")
    print("  🎯 Break-Even Analysis - Gewinnschwellen-Analyse")
    print(f"{'='*60}")
    print("\nBefehle:")
    print("  'exit' oder 'quit' - Beenden")
    print("  'new' - Neue Session starten")
    print("  'help' - Hilfe anzeigen")
    print(f"{'='*60}\n")

    # Agent initialisieren
    try:
        agent = DexterAgent()
    except Exception as e:
        print(f"❌ Fehler beim Initialisieren: {e}")
        print("Bitte überprüfe deinen ANTHROPIC_API_KEY in .env")
        return

    # Main Loop
    while True:
        try:
            # User Input
            user_input = input("\n💬 Du: ").strip()

            if not user_input:
                continue

            # Befehle verarbeiten
            if user_input.lower() in ["exit", "quit", "bye"]:
                print("\n👋 Auf Wiedersehen! Bis zum nächsten Mal.")
                break

            if user_input.lower() == "new":
                agent.reset_conversation()
                print("\n✨ Neue Session gestartet. Conversation-History gelöscht.")
                continue

            if user_input.lower() == "help":
                print("\n📚 Hilfe:")
                print("\nBeispiel-Anfragen:")
                print("  - 'Berechne ROI für Investment von 100k€ mit 180k€ Revenue über 18 Monate'")
                print("  - 'Erstelle Sales Forecast für die nächsten 6 Monate'")
                print("  - 'Generiere P&L Statement für Q1 2025'")
                print("  - 'Erstelle Bilanz zum 30.06.2025'")
                print("\nDexter analysiert deine Anfrage und nutzt automatisch die passenden Tools.")
                continue

            # Agent Response
            print(f"\n🤖 Dexter: ", end="", flush=True)

            async for chunk in agent.chat(user_input):
                print(chunk, end="", flush=True)

            print()  # Newline nach Response

        except KeyboardInterrupt:
            print("\n\n⚠️ Unterbrochen. Nutze 'exit' zum Beenden.")
            continue
        except Exception as e:
            logger.error(f"Error in main loop: {e}", exc_info=True)
            print(f"\n❌ Ein Fehler ist aufgetreten: {e}")
            print("Versuche es erneut oder nutze 'new' für eine neue Session.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Programm beendet.")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        print(f"\n❌ Kritischer Fehler: {e}")
        sys.exit(1)
