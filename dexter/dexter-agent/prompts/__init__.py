"""
Prompts-Modul für den Dexter Financial Analyst Agent.

Dieses Modul enthält alle System-Prompts, Beispiel-Queries und
Prompt-Templates für die Finanzanalyse.
"""

from .system_prompts import DEXTER_SYSTEM_PROMPT, get_system_prompt
from .examples import EXAMPLE_QUERIES

__all__ = [
    "DEXTER_SYSTEM_PROMPT",
    "get_system_prompt",
    "EXAMPLE_QUERIES",
]
