"""
Dexter Financial Analyst Agent - Hauptanwendung (OpenAI Integration)

Integriert alle 6 Financial Analysis Power-Ups mit OpenAI GPT-4:
- ROI Calculator
- Sales Forecaster
- P&L Calculator
- Balance Sheet Generator
- Cash Flow Statement Generator
- Break-Even Analysis

Author: Dexter Agent Development Team
Version: 4.0.0 (OpenAI Migration)
"""

import asyncio
import sys
import json
from pathlib import Path
from typing import AsyncIterator, Dict, Any, List
from datetime import datetime

# OpenAI Integration
from openai import AsyncOpenAI

# Lokale Imports
from config import get_config
from prompts.system_prompts import DEXTER_SYSTEM_PROMPT
from tools.roi_calculator import calculate_roi
from tools.sales_forecaster import forecast_sales
from tools.pnl_calculator import calculate_pnl
from tools.balance_sheet import generate_balance_sheet
from tools.cash_flow_statement import generate_cash_flow_statement
from tools.break_even_analysis import analyze_break_even

# AI Service Layer
from lib.ai.openai_service import ChatMessage, OpenAIService
from lib.ai.tool_converter import register_dexter_tools
from lib.ai.error_handler import retry_on_error, OpenAIError

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
# DEXTER AGENT CLASS (OpenAI)
# ============================================================================

class DexterAgent:
    """
    Dexter Financial Analyst Agent (OpenAI Integration)

    Orchestriert Financial Analysis Tools mit OpenAI GPT-4.
    Implementiert Function Calling Pattern für strukturierte Financial Analysis.
    """

    def __init__(self):
        """Initialisiert Dexter Agent mit OpenAI SDK"""
        self.openai_service = OpenAIService(api_key=config.api_key)
        self.model = config.model.model_name
        self.conversation_history: List[ChatMessage] = []
        self.tools = register_dexter_tools()  # OpenAI Format
        self.system_prompt = DEXTER_SYSTEM_PROMPT
        self.turn_count = 0

        logger.info(f"🤖 Dexter Agent initialisiert mit Model: {self.model}")
        logger.info(f"🔧 {len(self.tools)} Tools registriert (OpenAI Function Calling)")

    async def _execute_tool(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Führt ein Financial Analysis Tool aus

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

    @retry_on_error(max_retries=3, base_delay=1.0)
    async def _call_openai(self, messages: List[ChatMessage]) -> Any:
        """
        OpenAI API Call mit Retry-Logik

        Args:
            messages: Chat messages

        Returns:
            OpenAI Response
        """
        return await self.openai_service.generate_response(
            messages=messages,
            tools=self.tools
        )

    async def chat(self, user_message: str) -> AsyncIterator[str]:
        """
        Hauptmethode für Chat mit Dexter (OpenAI Function Calling)

        Implementiert Function Calling Pattern mit OpenAI:
        1. User Message → OpenAI
        2. OpenAI ruft Functions auf (tool_calls)
        3. Functions werden ausgeführt
        4. Function Results → OpenAI
        5. OpenAI generiert finale Antwort

        Args:
            user_message: User-Nachricht

        Yields:
            Response chunks als String
        """
        self.turn_count += 1
        logger.info(f"\n{'='*60}")
        logger.info(f"Turn {self.turn_count} - User: {user_message[:100]}...")
        logger.info(f"{'='*60}")

        # System prompt hinzufügen (nur beim ersten Turn)
        if not self.conversation_history:
            self.conversation_history.append(
                ChatMessage(role="system", content=self.system_prompt)
            )

        # User Message zur History hinzufügen
        self.conversation_history.append(
            ChatMessage(role="user", content=user_message)
        )

        # Haupt-Loop für Function Calling
        max_iterations = 10  # Verhindere Endlos-Schleifen
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            try:
                # OpenAI Request
                response = await self._call_openai(self.conversation_history)

                # Prüfe finish_reason
                if response.finish_reason == "stop":
                    # Normale Text-Response ohne Tool-Calls
                    if response.content:
                        self.conversation_history.append(
                            ChatMessage(role="assistant", content=response.content)
                        )
                        yield response.content
                    break

                elif response.finish_reason == "tool_calls" and response.tool_calls:
                    # OpenAI möchte Tools aufrufen
                    tool_calls = response.tool_calls

                    # Assistant Message mit tool_calls zur History
                    # Note: OpenAI erwartet tool_calls als special format
                    tool_calls_dict = [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments
                            }
                        }
                        for tc in tool_calls
                    ]

                    self.conversation_history.append(
                        ChatMessage(
                            role="assistant",
                            content="",  # Bei tool_calls ist content oft leer
                            tool_calls=tool_calls_dict
                        )
                    )

                    # Führe alle Tool-Calls aus
                    for tool_call in tool_calls:
                        tool_name = tool_call.function.name
                        tool_call_id = tool_call.id

                        # Parse Arguments (sind als JSON-String)
                        try:
                            tool_input = json.loads(tool_call.function.arguments)
                        except json.JSONDecodeError as e:
                            logger.error(f"Failed to parse tool arguments: {e}")
                            tool_input = {}

                        logger.info(f"🔧 Tool Call: {tool_name}")
                        yield f"\n\n[Verwende Tool: {tool_name}]\n\n"

                        # Tool ausführen
                        tool_result = await self._execute_tool(tool_name, tool_input)

                        # Zeige formatted output wenn vorhanden
                        if "formatted_output" in tool_result:
                            yield tool_result["formatted_output"]

                        # Tool Result zur History (im OpenAI Format)
                        # OpenAI erwartet: role="tool", content=result_string, tool_call_id=id
                        self.conversation_history.append(
                            ChatMessage(
                                role="tool",
                                content=json.dumps(tool_result, ensure_ascii=False),
                                tool_call_id=tool_call_id,
                                name=tool_name
                            )
                        )

                    # Nach Tool-Execution: Nächste Iteration (OpenAI verarbeitet Results)
                    continue

                else:
                    # Unerwarteter finish_reason
                    logger.warning(f"Unexpected finish_reason: {response.finish_reason}")
                    if response.content:
                        yield response.content
                    break

            except OpenAIError as e:
                logger.error(f"OpenAI Error: {e}")
                yield f"\n\n❌ Ein Fehler ist aufgetreten: {e.message}\n\n"
                break

            except Exception as e:
                logger.error(f"Unexpected Error: {e}", exc_info=True)
                yield f"\n\n❌ Ein unerwarteter Fehler ist aufgetreten: {str(e)}\n\n"
                break

        if iteration >= max_iterations:
            logger.warning(f"Max iterations ({max_iterations}) reached")
            yield "\n\n⚠️ Maximale Anzahl an Iterationen erreicht.\n\n"

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
║                 (OpenAI GPT-4 Edition)                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
""")

    print(f"Model: {config.model.model_name}")
    print(f"Version: 4.0.0 (OpenAI Migration)")
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
        print("Bitte überprüfe deinen OPENAI_API_KEY in .env")
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
