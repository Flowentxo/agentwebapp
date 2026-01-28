"""
P&L Calculator Tool - Profit & Loss Statement (Gewinn- und Verlustrechnung).

Dieses Tool erstellt vollständige P&L Statements nach GAAP-Standards mit
detaillierter Margin-Analyse und Profitability Assessment.
"""

import json
from dataclasses import dataclass, asdict
from typing import Any, Tuple, List, Dict
import sys
from pathlib import Path

# Füge Parent-Directory zum Path hinzu für Config-Import
sys.path.append(str(Path(__file__).parent.parent))

try:
    from config import get_config
    config = get_config()
except ImportError:
    config = None


@dataclass
class OperatingExpenses:
    """Betriebsausgaben nach Kategorien."""

    salaries: float = 0.0           # Personalkosten
    marketing: float = 0.0          # Marketing & Werbung
    rent: float = 0.0               # Miete & Immobilien
    utilities: float = 0.0          # Strom, Wasser, Internet
    software_it: float = 0.0        # IT & Software
    insurance: float = 0.0          # Versicherungen
    depreciation: float = 0.0       # Abschreibungen
    other: float = 0.0              # Sonstige

    def total(self) -> float:
        """Summe aller Betriebsausgaben."""
        return sum([
            self.salaries, self.marketing, self.rent,
            self.utilities, self.software_it, self.insurance,
            self.depreciation, self.other
        ])

    def validate(self) -> Tuple[bool, str]:
        """Validiert dass alle Ausgaben >= 0 sind."""
        for field, value in asdict(self).items():
            if value < 0:
                return False, f"{field} kann nicht negativ sein: {value}"
        return True, ""

    def as_dict(self) -> Dict[str, float]:
        """Konvertiert zu Dictionary."""
        return asdict(self)


@dataclass
class PnLResult:
    """Vollständige Gewinn- und Verlustrechnung."""

    period: str  # "Q1 2025" oder "FY 2025"

    # Revenue
    revenue: float  # Gesamtumsatz

    # Cost of Goods Sold
    cost_of_goods_sold: float  # Wareneinsatz
    gross_profit: float  # Bruttogewinn
    gross_margin_percent: float  # Bruttomarge %

    # Operating Expenses
    operating_expenses: Dict[str, float]  # Kategorisierte OpEx
    total_operating_expenses: float  # Summe OpEx

    # Operating Profit (EBIT)
    operating_profit: float  # Betriebsgewinn
    operating_margin_percent: float  # Betriebsmarge %

    # Taxes & Net Profit
    tax_rate: float  # Steuersatz
    taxes: float  # Steuern
    net_profit: float  # Nettogewinn
    net_margin_percent: float  # Nettomarge %

    # Analysis
    profitability_score: int  # Score 0-100
    profitability_category: str  # "Exzellent", "Gut", "Moderat", "Verlust"
    largest_expense_category: str  # Größte Ausgaben-Kategorie
    largest_expense_amount: float  # Betrag der größten Kategorie
    expense_ratio: float  # OpEx / Revenue Ratio
    break_even_revenue: float  # Break-Even Umsatz

    recommendation: str  # Handlungsempfehlung
    warnings: List[str]  # Warnungen


def _calculate_profitability_score(
    net_margin: float,
    operating_margin: float,
    expense_ratio: float
) -> int:
    """
    Berechnet Profitability Score (0-100).

    Gewichtung:
    - Net Margin (50%): >20% = 50 Punkte
    - Operating Margin (30%): >15% = 30 Punkte
    - Expense Ratio (20%): <50% = 20 Punkte
    """
    # Net Margin Score (50 Punkte max)
    if net_margin >= 20:
        net_score = 50
    elif net_margin >= 0:
        net_score = (net_margin / 20) * 50
    else:
        # Negativ: Linear von -50% (0 Punkte) bis 0% (0 Punkte)
        net_score = max(0, 50 + (net_margin / 50) * 50)

    # Operating Margin Score (30 Punkte max)
    if operating_margin >= 15:
        op_score = 30
    elif operating_margin >= 0:
        op_score = (operating_margin / 15) * 30
    else:
        op_score = 0

    # Expense Ratio Score (20 Punkte max)
    # Niedrigeres Ratio = besser
    if expense_ratio <= 50:
        exp_score = 20
    elif expense_ratio <= 70:
        exp_score = 20 - ((expense_ratio - 50) / 20) * 15
    elif expense_ratio <= 90:
        exp_score = 5 - ((expense_ratio - 70) / 20) * 5
    else:
        exp_score = 0

    total = int(net_score + op_score + exp_score)
    return max(0, min(100, total))


def _categorize_profitability(net_margin: float) -> str:
    """Kategorisiert Profitabilität basierend auf Net Margin."""
    if config:
        threshold = config.thresholds.net_margin_healthy
    else:
        threshold = 15.0

    if net_margin >= 20:
        return "Exzellent ⭐"
    elif net_margin >= 10:
        return "Gut ✅"
    elif net_margin >= 0:
        return "Moderat ⚠️"
    else:
        return "Verlust ❌"


def _find_largest_expense(opex: Dict[str, float]) -> Tuple[str, float]:
    """Findet größte Ausgaben-Kategorie."""
    if not opex:
        return "None", 0.0

    max_category = max(opex.items(), key=lambda x: x[1])
    return max_category[0], max_category[1]


def _calculate_break_even(cogs: float, opex: float, tax_rate: float) -> float:
    """
    Berechnet Break-Even Revenue.

    Break-Even = (COGS + OpEx) / (1 - Tax Rate)
    """
    if tax_rate >= 1.0:
        return float('inf')  # Unmöglich mit 100% Steuern

    return (cogs + opex) / (1 - tax_rate) if (1 - tax_rate) > 0 else float('inf')


def _generate_pnl_recommendation(result: PnLResult) -> str:
    """Generiert Handlungsempfehlung basierend auf P&L."""
    net_margin = result.net_margin_percent
    op_margin = result.operating_margin_percent
    gross_margin = result.gross_margin_percent
    exp_ratio = result.expense_ratio

    # Hochprofitabel (Net Margin > 20%)
    if net_margin > 20:
        return (
            f"⭐ **EXZELLENTE PROFITABILITÄT** - Net Margin von {net_margin:.1f}% ist outstanding!\n\n"
            f"**Empfohlene Maßnahmen:**\n"
            f"1. **Skalierung**: Nutze starke Profitabilität für Wachstumsinvestitionen\n"
            f"2. **Marktanteil ausbauen**: Aggressive Expansion bei dieser Margin möglich\n"
            f"3. **R&D erhöhen**: Investiere in Innovation für nachhaltigen Vorsprung\n"
            f"4. **Talent akquirieren**: Top-Talente mit starker Profitabilität anziehen\n"
            f"5. **Dividenden/Rücklagen**: Überschüsse strategisch einsetzen\n\n"
            f"**Status:** Best-in-Class Profitabilität. Position halten und ausbauen!\n"
            f"**Profitability Score:** {result.profitability_score}/100"
        )

    # Gute Profitabilität (10-20%)
    elif net_margin > 10:
        return (
            f"✅ **GUTE PROFITABILITÄT** - Net Margin von {net_margin:.1f}% ist solid.\n\n"
            f"**Empfohlene Maßnahmen:**\n"
            f"1. **Margin-Optimierung**: Fokus auf weitere 2-3% Margin-Verbesserung\n"
            f"2. **Kosteneffizienz**: Identifiziere größte Kostentreiber (aktuell: {result.largest_expense_category})\n"
            f"3. **Revenue Growth**: Skaliere profitable Produktlinien/Services\n"
            f"4. **Prozess-Optimierung**: Automatisierung für bessere Operating Margin\n"
            f"5. **Pricing-Review**: Prüfe ob Preiserhöhungen möglich\n\n"
            f"**Ziel:** Net Margin auf 15%+ steigern für exzellente Profitabilität\n"
            f"**Profitability Score:** {result.profitability_score}/100"
        )

    # Moderate Profitabilität (0-10%)
    elif net_margin > 0:
        return (
            f"⚠️ **MODERATE PROFITABILITÄT** - Net Margin von {net_margin:.1f}% ist niedrig.\n\n"
            f"**KRITISCHE MASSNAHMEN:**\n"
            f"1. **Kostenanalyse**: OpEx von {result.expense_ratio:.1f}% ist "
            f"{'zu hoch' if result.expense_ratio > 60 else 'verbesserbar'}. "
            f"Größter Kostentreiber: {result.largest_expense_category}\n"
            f"2. **Gross Margin verbessern**: {gross_margin:.1f}% "
            f"{'kritisch niedrig' if gross_margin < 30 else 'ausbaufähig'}\n"
            f"3. **Umsatzsteigerung**: Mehr Revenue bei gleichen Fixkosten = bessere Margin\n"
            f"4. **Unprofitable eliminieren**: Produkte/Services mit negativem Contribution Margin streichen\n"
            f"5. **Notfall-Budget**: Plane für Break-Even von {_format_currency(result.break_even_revenue)}\n\n"
            f"**WARNUNG:** Geringe Profitabilität = hohes Risiko. Dringend optimieren!\n"
            f"**Profitability Score:** {result.profitability_score}/100"
        )

    # Verlust (Net Margin < 0)
    else:
        loss_amount = abs(result.net_profit)
        return (
            f"🚨 **VERLUST-SITUATION** - Verlust von {_format_currency(loss_amount)} "
            f"(Net Margin {net_margin:.1f}%)!\n\n"
            f"**SOFORT-MASSNAHMEN:**\n"
            f"1. **Kostensenkungs-Programm**: OpEx Ratio von {result.expense_ratio:.1f}% drastisch senken\n"
            f"   - Größter Hebel: {result.largest_expense_category} ({_format_currency(result.largest_expense_amount)})\n"
            f"   - Ziel: OpEx um mindestens 20% reduzieren\n"
            f"2. **Break-Even erreichen**: Umsatz auf mind. {_format_currency(result.break_even_revenue)} steigern\n"
            f"3. **Cashflow sichern**: Liquidität für 6+ Monate garantieren\n"
            f"4. **Stakeholder informieren**: Transparenz über Verlust-Situation\n"
            f"5. **Turnaround-Plan**: 90-Tage-Plan für Profitabilität entwickeln\n"
            f"6. **Strategic Review**: Geschäftsmodell hinterfragen - ist es viable?\n\n"
            f"**KRITISCH:** Ohne schnelle Korrektur droht Insolvenz. Leadership-Intervention nötig!\n"
            f"**Profitability Score:** {result.profitability_score}/100"
        )


def _check_pnl_warnings(result: PnLResult) -> List[str]:
    """Prüft P&L auf Risiken und Anomalien."""
    warnings = []

    # Verlust
    if result.net_profit < 0:
        warnings.append(
            f"❌ **VERLUST**: Net Profit von {_format_currency(result.net_profit)} ist negativ. "
            f"Geschäft ist nicht profitabel!"
        )

    # Niedrige Gross Margin
    if result.gross_margin_percent < 30:
        warnings.append(
            f"⚠️ Sehr niedrige Gross Margin ({result.gross_margin_percent:.1f}%). "
            f"COGS sind zu hoch relativ zum Umsatz. Kostenstruktur überprüfen!"
        )
    elif result.gross_margin_percent < 40:
        warnings.append(
            f"📊 Niedrige Gross Margin ({result.gross_margin_percent:.1f}%). "
            f"Für gesunde Profitabilität sollte diese >40% sein."
        )

    # Hohe OpEx Ratio
    if result.expense_ratio > 70:
        warnings.append(
            f"🚨 Sehr hohe OpEx Ratio ({result.expense_ratio:.1f}%)! "
            f"Betriebskosten fressen den Großteil des Umsatzes auf. Dringend senken!"
        )
    elif result.expense_ratio > 60:
        warnings.append(
            f"⚠️ Hohe OpEx Ratio ({result.expense_ratio:.1f}%). "
            f"Ziel sollte <50% sein für gesunde Profitabilität."
        )

    # Einzelne OpEx-Kategorie zu hoch
    revenue = result.revenue
    for category, amount in result.operating_expenses.items():
        if revenue > 0 and (amount / revenue) > 0.4:
            warnings.append(
                f"💰 {category} macht {(amount/revenue)*100:.1f}% des Umsatzes aus! "
                f"Diese Kategorie ist ungewöhnlich hoch. Review erforderlich."
            )

    # Negatives Operating Profit aber positives Net Profit (unmöglich)
    if result.operating_profit < 0 and result.net_profit > 0:
        warnings.append(
            f"🤔 **ANOMALIE**: Operating Profit ist negativ, aber Net Profit positiv? "
            f"Dies ist unmöglich. Daten überprüfen!"
        )

    # Operating Profit positiv aber Net Profit negativ (sehr hohe Steuern)
    if result.operating_profit > 0 and result.net_profit < 0:
        effective_tax_rate = (result.taxes / result.operating_profit) * 100
        warnings.append(
            f"⚠️ Positive EBIT aber negative Net Profit. "
            f"Effektiver Steuersatz von {effective_tax_rate:.1f}% erscheint sehr hoch!"
        )

    # Sehr hohe Steuerlast
    if result.tax_rate > 0.4:
        warnings.append(
            f"💸 Hoher Steuersatz von {result.tax_rate*100:.1f}%. "
            f"Steueroptimierung prüfen (legale Strukturierung)."
        )

    # Break-Even sehr hoch
    if result.break_even_revenue > result.revenue * 1.5:
        warnings.append(
            f"📈 Break-Even Revenue ({_format_currency(result.break_even_revenue)}) "
            f"liegt 50%+ über aktuellem Umsatz. Signifikantes Wachstum nötig!"
        )

    return warnings


def _format_pnl_output(result: PnLResult) -> str:
    """Formatiert P&L Statement als strukturiertes Markdown."""
    output = f"# 💰 Gewinn- und Verlustrechnung (P&L Statement)\n\n"
    output += f"**Periode:** {result.period}\n\n"

    # Executive Summary
    output += "## Executive Summary\n\n"

    profit_status = "profitabel" if result.net_profit >= 0 else "unprofitabel (Verlust)"
    category_emoji = "⭐" if "Exzellent" in result.profitability_category else "✅" if "Gut" in result.profitability_category else "⚠️" if "Moderat" in result.profitability_category else "❌"

    summary = (
        f"Das Geschäft ist **{profit_status}** mit einem Nettogewinn von "
        f"**{_format_currency(result.net_profit)}** ({result.profitability_category} {category_emoji}). "
        f"Die Nettomarge liegt bei **{result.net_margin_percent:.2f}%**. "
        f"Betriebsausgaben machen **{result.expense_ratio:.1f}%** des Umsatzes aus. "
        f"Größter Kostentreiber: **{result.largest_expense_category}** "
        f"({_format_currency(result.largest_expense_amount)}). "
        f"Profitability Score: **{result.profitability_score}/100**."
    )

    output += f"{summary}\n\n"

    # Detaillierte P&L
    output += "## 📊 Detaillierte P&L-Rechnung\n\n"

    # Umsatz & Bruttogewinn
    output += "### Umsatz & Bruttogewinn\n\n"
    output += "| Position | Betrag | Anteil am Umsatz |\n"
    output += "|----------|--------|------------------|\n"
    output += f"| **Umsatz (Revenue)** | {_format_currency(result.revenue)} | 100.0% |\n"
    output += f"| Wareneinsatz (COGS) | {_format_currency(result.cost_of_goods_sold)} | {(result.cost_of_goods_sold/result.revenue*100) if result.revenue > 0 else 0:.1f}% |\n"

    gross_indicator = "✅" if result.gross_margin_percent >= 40 else "⚠️" if result.gross_margin_percent >= 30 else "❌"
    output += f"| **Bruttogewinn (Gross Profit)** | **{_format_currency(result.gross_profit)}** | **{result.gross_margin_percent:.1f}%** {gross_indicator} |\n\n"

    # Betriebsausgaben
    output += "### Betriebsausgaben (Operating Expenses)\n\n"
    output += "| Kategorie | Betrag | Anteil am Umsatz |\n"
    output += "|-----------|--------|------------------|\n"

    opex_labels = {
        "salaries": "Personalkosten",
        "marketing": "Marketing & Werbung",
        "rent": "Miete & Immobilien",
        "utilities": "Strom/Wasser/Internet",
        "software_it": "IT & Software",
        "insurance": "Versicherungen",
        "depreciation": "Abschreibungen",
        "other": "Sonstige"
    }

    for key, amount in result.operating_expenses.items():
        label = opex_labels.get(key, key.capitalize())
        percentage = (amount / result.revenue * 100) if result.revenue > 0 else 0
        highlight = "**" if key == result.largest_expense_category else ""
        output += f"| {highlight}{label}{highlight} | {_format_currency(amount)} | {percentage:.1f}% |\n"

    expense_indicator = "✅" if result.expense_ratio <= 50 else "⚠️" if result.expense_ratio <= 70 else "❌"
    output += f"| **Gesamt Betriebsausgaben** | **{_format_currency(result.total_operating_expenses)}** | **{result.expense_ratio:.1f}%** {expense_indicator} |\n\n"

    # Betriebsgewinn
    output += "### Betriebsgewinn (Operating Profit / EBIT)\n\n"
    output += "| Position | Betrag | Margin |\n"
    output += "|----------|--------|--------|\n"

    op_indicator = "✅" if result.operating_margin_percent >= 15 else "⚠️" if result.operating_margin_percent >= 5 else "❌"
    output += f"| **Betriebsgewinn (EBIT)** | **{_format_currency(result.operating_profit)}** | **{result.operating_margin_percent:.1f}%** {op_indicator} |\n\n"

    # Steuern & Nettogewinn
    output += "### Steuern & Nettogewinn\n\n"
    output += "| Position | Betrag |\n"
    output += "|----------|--------|\n"
    output += f"| Steuern ({result.tax_rate*100:.0f}%) | {_format_currency(result.taxes)} |\n"

    net_indicator = "✅" if result.net_profit > 0 else "❌"
    output += f"| **Nettogewinn (Net Profit)** | **{_format_currency(result.net_profit)}** {net_indicator} |\n"
    output += f"| **Nettomarge (Net Margin)** | **{result.net_margin_percent:.2f}%** |\n\n"

    # Waterfall
    output += "## 📊 Waterfall-Visualisierung\n\n"
    output += "```\n"
    output += _create_waterfall_chart(
        result.revenue,
        result.cost_of_goods_sold,
        result.total_operating_expenses,
        result.taxes,
        result.net_profit
    )
    output += "```\n\n"

    # Profitabilitäts-Analyse
    output += "## 📈 Profitabilitäts-Analyse\n\n"
    output += "| Kennzahl | Wert | Benchmark | Bewertung |\n"
    output += "|----------|------|-----------|----------|\n"

    gross_bench = "40%"
    gross_status = "Exzellent" if result.gross_margin_percent >= 50 else "Gut" if result.gross_margin_percent >= 40 else "Moderat" if result.gross_margin_percent >= 30 else "Niedrig"
    output += f"| Bruttomarge (Gross Margin) | {result.gross_margin_percent:.1f}% | {gross_bench} | {gross_status} |\n"

    op_bench = "15%"
    op_status = "Exzellent" if result.operating_margin_percent >= 20 else "Gut" if result.operating_margin_percent >= 15 else "Moderat" if result.operating_margin_percent >= 5 else "Niedrig"
    output += f"| Betriebsmarge (Operating Margin) | {result.operating_margin_percent:.1f}% | {op_bench} | {op_status} |\n"

    net_bench = "15%"
    net_status = "Exzellent" if result.net_margin_percent >= 20 else "Gut" if result.net_margin_percent >= 10 else "Moderat" if result.net_margin_percent >= 0 else "Verlust"
    output += f"| Nettomarge (Net Margin) | {result.net_margin_percent:.2f}% | {net_bench} | {net_status} |\n"

    exp_bench = "<50%"
    exp_status = "Exzellent" if result.expense_ratio <= 40 else "Gut" if result.expense_ratio <= 50 else "Moderat" if result.expense_ratio <= 60 else "Hoch"
    output += f"| OpEx Ratio | {result.expense_ratio:.1f}% | {exp_bench} | {exp_status} |\n"

    score_status = "Exzellent" if result.profitability_score >= 80 else "Gut" if result.profitability_score >= 60 else "Moderat" if result.profitability_score >= 40 else "Niedrig"
    output += f"| **Profitability Score** | **{result.profitability_score}/100** | >70 | **{score_status}** |\n\n"

    # Zusätzliche Metriken
    output += "### Zusätzliche Metriken\n\n"
    output += f"- **Break-Even Revenue**: {_format_currency(result.break_even_revenue)}\n"
    output += f"- **Größter Kostentreiber**: {result.largest_expense_category} ({_format_currency(result.largest_expense_amount)})\n"
    output += f"- **Profitabilitäts-Kategorie**: {result.profitability_category}\n\n"

    # Empfehlung
    output += "## 💡 Handlungsempfehlung\n\n"
    output += f"{result.recommendation}\n\n"

    # Warnungen
    if result.warnings:
        output += "## ⚠️ Wichtige Hinweise\n\n"
        for warning in result.warnings:
            output += f"- {warning}\n"
        output += "\n"

    # Raw Data
    output += "## 📋 Raw Data\n\n"
    output += "```json\n"

    raw_data = {
        "tool": "pnl_calculator",
        "period": result.period,
        "revenue": round(result.revenue, 2),
        "cogs": round(result.cost_of_goods_sold, 2),
        "gross_profit": round(result.gross_profit, 2),
        "gross_margin_percent": round(result.gross_margin_percent, 2),
        "operating_expenses": {k: round(v, 2) for k, v in result.operating_expenses.items()},
        "total_opex": round(result.total_operating_expenses, 2),
        "operating_profit": round(result.operating_profit, 2),
        "operating_margin_percent": round(result.operating_margin_percent, 2),
        "taxes": round(result.taxes, 2),
        "net_profit": round(result.net_profit, 2),
        "net_margin_percent": round(result.net_margin_percent, 2),
        "profitability_score": result.profitability_score,
        "break_even_revenue": round(result.break_even_revenue, 2)
    }

    output += json.dumps(raw_data, indent=2, ensure_ascii=False)
    output += "\n```\n"

    return output


def _create_waterfall_chart(
    revenue: float,
    cogs: float,
    opex: float,
    taxes: float,
    net: float
) -> str:
    """Erstellt ASCII Waterfall-Chart von Revenue zu Net Profit."""
    chart = "P&L Waterfall (Revenue → Net Profit):\n\n"

    # Berechne relative Höhen
    values = [revenue, revenue - cogs, revenue - cogs - opex, revenue - cogs - opex - taxes]
    max_val = max(values)

    if max_val == 0:
        return chart + "Keine Daten zum Visualisieren.\n"

    # 10 Zeilen Höhe
    levels = 10

    chart += f"{'Value':>12} │ Revenue    Gross    Operating   Net\n"
    chart += " " * 13 + "│            Profit   Profit      Profit\n"
    chart += "─" * 13 + "┼" + "─" * 45 + "\n"

    for i in range(levels, -1, -1):
        threshold = (i / levels) * max_val
        value_str = f"{_format_currency(threshold):>12}"

        chart += f"{value_str} │"

        # Revenue
        chart += " ███" if revenue >= threshold else "    "
        chart += "       "

        # Gross Profit
        chart += " ███" if (revenue - cogs) >= threshold else "    "
        chart += "      "

        # Operating Profit
        chart += " ███" if (revenue - cogs - opex) >= threshold else "    "
        chart += "      "

        # Net Profit
        chart += " ███" if net >= threshold else "    "

        chart += "\n"

    chart += "\n"
    chart += f"Revenue:     {_format_currency(revenue)}\n"
    chart += f"- COGS:      {_format_currency(cogs)} ({(cogs/revenue*100) if revenue > 0 else 0:.1f}%)\n"
    chart += f"= Gross:     {_format_currency(revenue - cogs)}\n"
    chart += f"- OpEx:      {_format_currency(opex)} ({(opex/revenue*100) if revenue > 0 else 0:.1f}%)\n"
    chart += f"= Operating: {_format_currency(revenue - cogs - opex)}\n"
    chart += f"- Taxes:     {_format_currency(taxes)}\n"
    chart += f"= Net:       {_format_currency(net)}\n"

    return chart


def _format_currency(amount: float) -> str:
    """Formatiert Geldbetrag."""
    if config:
        return config.output.format_currency(amount)
    return f"€{amount:,.2f}"


# Haupt-Tool-Funktion
async def calculate_pnl(
    revenue: float,
    cost_of_goods_sold: float,
    operating_expenses: Dict[str, float],
    period: str,
    tax_rate: float = 0.25
) -> dict[str, Any]:
    """
    Erstellt vollständige Gewinn- und Verlustrechnung.

    Diese Funktion berechnet ein vollständiges P&L Statement mit:
    - Gross Profit & Margin
    - Operating Profit & Margin
    - Net Profit & Margin
    - Profitability Score
    - Break-Even Analysis

    Args:
        revenue: Gesamtumsatz in €
        cost_of_goods_sold: Wareneinsatz/Produktionskosten in €
        operating_expenses: Dict mit Betriebsausgaben nach Kategorien
        period: Periode (z.B. "Q1 2025", "FY 2025")
        tax_rate: Steuersatz (0.25 = 25%)

    Returns:
        Dictionary mit P&L-Result und formatiertem Output
    """
    # 1. Input validieren
    if revenue <= 0:
        return {
            "error": "Revenue muss größer als 0 sein",
            "formatted_output": "# ❌ P&L-Fehler\n\nUmsatz muss größer als 0 sein."
        }

    if cost_of_goods_sold < 0:
        return {
            "error": "COGS kann nicht negativ sein",
            "formatted_output": "# ❌ P&L-Fehler\n\nCOGS kann nicht negativ sein."
        }

    if cost_of_goods_sold > revenue:
        return {
            "error": "COGS kann nicht größer als Revenue sein",
            "formatted_output": (
                "# ❌ P&L-Fehler\n\n"
                f"COGS ({_format_currency(cost_of_goods_sold)}) kann nicht größer als "
                f"Revenue ({_format_currency(revenue)}) sein."
            )
        }

    if not (0 <= tax_rate <= 1):
        return {
            "error": "Tax Rate muss zwischen 0 und 1 liegen",
            "formatted_output": "# ❌ P&L-Fehler\n\nSteuersatz muss zwischen 0% und 100% liegen."
        }

    # Validiere Operating Expenses
    opex_obj = OperatingExpenses(**operating_expenses)
    is_valid, error_msg = opex_obj.validate()
    if not is_valid:
        return {
            "error": error_msg,
            "formatted_output": f"# ❌ P&L-Fehler\n\n{error_msg}"
        }

    # 2. Gross Profit berechnen
    gross_profit = revenue - cost_of_goods_sold
    gross_margin = (gross_profit / revenue * 100) if revenue > 0 else 0

    # 3. Operating Expenses summieren
    total_opex = opex_obj.total()

    # 4. Operating Profit (EBIT)
    operating_profit = gross_profit - total_opex
    operating_margin = (operating_profit / revenue * 100) if revenue > 0 else 0

    # 5. Taxes & Net Profit
    taxes = max(0, operating_profit * tax_rate)  # Nur bei Gewinn
    net_profit = operating_profit - taxes
    net_margin = (net_profit / revenue * 100) if revenue > 0 else 0

    # 6. Zusätzliche Metriken
    expense_ratio = (total_opex / revenue * 100) if revenue > 0 else 0
    largest_cat, largest_amount = _find_largest_expense(opex_obj.as_dict())
    break_even = _calculate_break_even(cost_of_goods_sold, total_opex, tax_rate)

    # 7. Profitability Score
    score = _calculate_profitability_score(net_margin, operating_margin, expense_ratio)

    # 8. Kategorisierung
    category = _categorize_profitability(net_margin)

    # 9. Result erstellen
    result = PnLResult(
        period=period,
        revenue=round(revenue, 2),
        cost_of_goods_sold=round(cost_of_goods_sold, 2),
        gross_profit=round(gross_profit, 2),
        gross_margin_percent=round(gross_margin, 2),
        operating_expenses=opex_obj.as_dict(),
        total_operating_expenses=round(total_opex, 2),
        operating_profit=round(operating_profit, 2),
        operating_margin_percent=round(operating_margin, 2),
        tax_rate=tax_rate,
        taxes=round(taxes, 2),
        net_profit=round(net_profit, 2),
        net_margin_percent=round(net_margin, 2),
        profitability_score=score,
        profitability_category=category,
        largest_expense_category=largest_cat,
        largest_expense_amount=round(largest_amount, 2),
        expense_ratio=round(expense_ratio, 2),
        break_even_revenue=round(break_even, 2),
        recommendation="",  # Wird gleich gesetzt
        warnings=[]  # Wird gleich gesetzt
    )

    # 10. Empfehlungen & Warnungen
    result.recommendation = _generate_pnl_recommendation(result)
    result.warnings = _check_pnl_warnings(result)

    # 11. Output formatieren
    markdown_output = _format_pnl_output(result)

    return {
        "result": asdict(result),
        "formatted_output": markdown_output,
        "success": True
    }


# Tool-Definition für Claude Agent SDK
def get_pnl_tool_definition() -> dict:
    """Gibt Tool-Definition für Claude Agent SDK zurück."""
    return {
        "name": "calculate_pnl",
        "description": (
            "Berechnet vollständige Gewinn- und Verlustrechnung (P&L Statement).\n\n"
            "Nutze dieses Tool wenn der User fragt nach:\n"
            "- P&L, GuV, Gewinn- und Verlustrechnung\n"
            "- Profitability Analysis, Rentabilitätsanalyse\n"
            "- Income Statement\n"
            "- 'Wie profitabel ist das Geschäft?'\n"
            "- Margin Analysis\n\n"
            "Das Tool erstellt detailliertes P&L Statement nach GAAP-Standards."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "revenue": {
                    "type": "number",
                    "description": "Gesamtumsatz in €"
                },
                "cost_of_goods_sold": {
                    "type": "number",
                    "description": "Wareneinsatz/Produktionskosten in €"
                },
                "operating_expenses": {
                    "type": "object",
                    "description": (
                        "Betriebsausgaben nach Kategorien. "
                        "Verfügbare Kategorien: salaries, marketing, rent, utilities, "
                        "software_it, insurance, depreciation, other"
                    ),
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
                    "description": "Periode (z.B. 'Q1 2025', 'FY 2025')"
                },
                "tax_rate": {
                    "type": "number",
                    "description": "Steuersatz (0.25 = 25%)",
                    "default": 0.25
                }
            },
            "required": ["revenue", "cost_of_goods_sold", "operating_expenses", "period"]
        }
    }


# Testing
if __name__ == "__main__":
    import asyncio

    print("=" * 80)
    print("P&L CALCULATOR - TEST SCENARIOS")
    print("=" * 80)

    async def run_tests():
        # Test 1: Hochprofitabel (Net Margin 25%)
        print("\n\n### TEST 1: Hochprofitables Unternehmen ###\n")
        result1 = await calculate_pnl(
            revenue=1000000,
            cost_of_goods_sold=300000,
            operating_expenses={
                "salaries": 250000,
                "marketing": 80000,
                "rent": 40000,
                "utilities": 10000,
                "software_it": 20000,
                "insurance": 15000,
                "depreciation": 25000,
                "other": 10000
            },
            period="Q4 2024",
            tax_rate=0.25
        )
        print(result1['formatted_output'])

        # Test 2: Break-Even (Net Margin ~0%)
        print("\n\n" + "=" * 80)
        print("### TEST 2: Break-Even Szenario ###\n")
        result2 = await calculate_pnl(
            revenue=500000,
            cost_of_goods_sold=200000,
            operating_expenses={
                "salaries": 180000,
                "marketing": 50000,
                "rent": 30000,
                "utilities": 8000,
                "software_it": 12000,
                "insurance": 5000,
                "depreciation": 10000,
                "other": 5000
            },
            period="Q1 2025",
            tax_rate=0.20
        )
        print(result2['formatted_output'])

        # Test 3: Verlust (Net Margin -10%)
        print("\n\n" + "=" * 80)
        print("### TEST 3: Verlust-Situation ###\n")
        result3 = await calculate_pnl(
            revenue=400000,
            cost_of_goods_sold=180000,
            operating_expenses={
                "salaries": 200000,
                "marketing": 60000,
                "rent": 25000,
                "utilities": 7000,
                "software_it": 15000,
                "insurance": 4000,
                "depreciation": 8000,
                "other": 5000
            },
            period="Q2 2024",
            tax_rate=0.25
        )
        print(result3['formatted_output'])

        # Test 4: Hohe OpEx aber profitabel
        print("\n\n" + "=" * 80)
        print("### TEST 4: Hohe OpEx aber profitabel ###\n")
        result4 = await calculate_pnl(
            revenue=800000,
            cost_of_goods_sold=100000,
            operating_expenses={
                "salaries": 350000,
                "marketing": 150000,
                "rent": 50000,
                "utilities": 15000,
                "software_it": 30000,
                "insurance": 10000,
                "depreciation": 20000,
                "other": 15000
            },
            period="FY 2024",
            tax_rate=0.25
        )
        print(result4['formatted_output'])

    asyncio.run(run_tests())

    print("\n\n" + "=" * 80)
    print("TESTS COMPLETED")
    print("=" * 80)
