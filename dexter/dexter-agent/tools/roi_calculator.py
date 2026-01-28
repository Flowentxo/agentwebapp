"""
ROI Calculator Tool - Return on Investment Berechnungen.

Dieses Tool berechnet die Kapitalrendite (ROI) für Investitionen und Projekte,
inklusive Payback Period, Profitability Score und detaillierten Empfehlungen.
"""

import math
from dataclasses import dataclass, asdict
from typing import Any, Tuple, List
import sys
from pathlib import Path

# Füge Parent-Directory zum Path hinzu für Config-Import
sys.path.append(str(Path(__file__).parent.parent))

try:
    from config import get_config
    config = get_config()
except ImportError:
    # Fallback für Tests ohne Config
    config = None


@dataclass
class ROIInput:
    """Input-Parameter für ROI-Berechnung."""

    investment_cost: float      # Initiale Investition in €
    revenue_generated: float    # Generierte Einnahmen in €
    timeframe_months: int       # Zeitraum in Monaten
    recurring_costs: float = 0.0  # Optional: Monatliche laufende Kosten in €

    def validate(self) -> Tuple[bool, str]:
        """
        Validiert Input-Daten auf Plausibilität.

        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        # Prüfe auf negative Werte
        if self.investment_cost < 0:
            return False, "Investment-Kosten können nicht negativ sein"

        if self.revenue_generated < 0:
            return False, "Generierte Einnahmen können nicht negativ sein"

        if self.recurring_costs < 0:
            return False, "Laufende Kosten können nicht negativ sein"

        # Prüfe Zeitraum
        if self.timeframe_months <= 0:
            return False, "Zeitraum muss mindestens 1 Monat sein"

        if self.timeframe_months > 600:  # Max 50 Jahre
            return False, "Zeitraum ist unrealistisch lang (max. 600 Monate / 50 Jahre)"

        # Prüfe auf unrealistisch hohe Werte (> 1 Milliarde)
        if self.investment_cost > 1_000_000_000:
            return False, "Investment-Betrag ist unrealistisch hoch (> 1 Mrd. €)"

        if self.revenue_generated > 10_000_000_000:
            return False, "Umsatz ist unrealistisch hoch (> 10 Mrd. €)"

        # Prüfe auf Null-Investment (ergibt keinen Sinn)
        if self.investment_cost == 0 and self.recurring_costs == 0:
            return False, "Mindestens Investment-Kosten oder laufende Kosten müssen > 0 sein"

        return True, ""


@dataclass
class ROIResult:
    """Strukturiertes ROI-Ergebnis mit allen Kennzahlen."""

    roi_percentage: float          # ROI in %
    net_profit: float              # Netto-Gewinn in €
    total_investment: float        # Gesamt-Investment in €
    payback_period_months: float   # Amortisationszeit in Monaten (kann ∞ sein)
    monthly_profit: float          # Monatlicher Durchschnittsgewinn in €
    profitability_score: int       # Score 0-100
    category: str                  # "Exzellent", "Gut", "Moderat", "Verlust"
    recommendation: str            # Handlungsempfehlung
    warnings: List[str]            # Warnungen falls vorhanden

    # Input-Daten für Referenz
    input_investment: float
    input_revenue: float
    input_timeframe: int
    input_recurring_costs: float


def _calculate_profitability_score(
    roi_percentage: float,
    payback_months: float,
    net_profit: float
) -> int:
    """
    Berechnet Profitability Score von 0-100.

    Der Score kombiniert:
    - ROI Percentage (50% Gewichtung)
    - Payback Period (30% Gewichtung)
    - Absoluter Profit (20% Gewichtung)

    Args:
        roi_percentage: ROI in Prozent
        payback_months: Amortisationszeit in Monaten
        net_profit: Netto-Gewinn in €

    Returns:
        Score zwischen 0 und 100
    """
    # ROI-Component (0-50 Punkte)
    # Skalierung: 100% ROI = 50 Punkte, 0% = 25 Punkte, negativ = 0-25 linear
    if roi_percentage >= 100:
        roi_score = 50
    elif roi_percentage >= 0:
        roi_score = 25 + (roi_percentage / 100) * 25
    else:
        # Negativ: Linear von -100% (0 Punkte) bis 0% (25 Punkte)
        roi_score = max(0, 25 + (roi_percentage / 100) * 25)

    # Payback-Component (0-30 Punkte)
    # Schnellere Amortisation = besserer Score
    if math.isinf(payback_months) or payback_months < 0:
        payback_score = 0
    elif payback_months <= 6:
        payback_score = 30  # Sehr schnell
    elif payback_months <= 12:
        payback_score = 25  # Schnell
    elif payback_months <= 24:
        payback_score = 15  # Moderat
    elif payback_months <= 48:
        payback_score = 5   # Langsam
    else:
        payback_score = 0   # Sehr langsam

    # Profit-Component (0-20 Punkte)
    # Absoluter Gewinn zeigt Größenordnung der Chance
    if net_profit >= 100000:
        profit_score = 20  # Sehr hoher Gewinn
    elif net_profit >= 50000:
        profit_score = 15
    elif net_profit >= 10000:
        profit_score = 10
    elif net_profit >= 1000:
        profit_score = 5
    elif net_profit > 0:
        profit_score = 2
    else:
        profit_score = 0  # Verlust

    # Gesamtscore
    total_score = int(roi_score + payback_score + profit_score)

    return max(0, min(100, total_score))


def _categorize_roi(roi_percentage: float) -> str:
    """
    Kategorisiert ROI in Qualitätsstufen.

    Args:
        roi_percentage: ROI in Prozent

    Returns:
        Kategorie-String mit Emoji
    """
    if config:
        excellent = config.thresholds.roi_excellent
        good = config.thresholds.roi_good
        acceptable = config.thresholds.roi_acceptable
    else:
        # Fallback-Werte
        excellent = 50.0
        good = 20.0
        acceptable = 0.0

    if roi_percentage >= excellent:
        return "Exzellent ⭐"
    elif roi_percentage >= good:
        return "Gut ✅"
    elif roi_percentage >= acceptable:
        return "Moderat ⚠️"
    else:
        return "Verlust ❌"


def _generate_recommendation(result: ROIResult) -> str:
    """
    Generiert konkrete Handlungsempfehlung basierend auf ROI-Ergebnis.

    Args:
        result: ROI-Analyse-Ergebnis

    Returns:
        Detaillierte Handlungsempfehlung als String
    """
    roi = result.roi_percentage
    payback = result.payback_period_months
    score = result.profitability_score
    net_profit = result.net_profit

    # Verlust-Szenario
    if roi < 0:
        break_even_revenue = result.total_investment
        current_revenue = result.input_revenue
        revenue_gap = break_even_revenue - current_revenue

        return (
            f"⛔ **NICHT EMPFOHLEN** - Diese Investition generiert einen Verlust von "
            f"{_format_currency(abs(net_profit))}.\n\n"
            f"**Alternativen:**\n"
            f"1. Investment reduzieren auf max. {_format_currency(current_revenue * 0.8)}\n"
            f"2. Umsatz um {_format_currency(revenue_gap)} steigern für Break-Even\n"
            f"3. Laufende Kosten um {_format_percentage(abs(roi))} senken\n"
            f"4. Projekt nicht durchführen und Kapital anderweitig investieren"
        )

    # Niedriger ROI (0-5%)
    elif roi < 5:
        return (
            f"⚠️ **VORSICHT** - ROI von {_format_percentage(roi)} ist sehr niedrig.\n\n"
            f"**Empfehlung:** Nur durchführen wenn:\n"
            f"- Strategische Gründe vorliegen (Markterschließung, Lernen, etc.)\n"
            f"- Kein Alternativ-Investment mit besserem ROI verfügbar\n"
            f"- Risiko sehr gering ist\n\n"
            f"**Optimierungspotenzial:**\n"
            f"- Kosten um 20% senken → ROI würde auf ~{_format_percentage(roi * 1.25)} steigen\n"
            f"- Umsatz um 30% erhöhen → ROI würde auf ~{_format_percentage(roi * 1.8)} steigen"
        )

    # Moderater ROI (5-20%)
    elif roi < 20:
        return (
            f"👍 **AKZEPTABEL** - ROI von {_format_percentage(roi)} ist solide.\n\n"
            f"**Empfehlung:** Investition durchführen wenn:\n"
            f"- Payback Period akzeptabel ({payback:.1f} Monate)\n"
            f"- Risiko überschaubar\n"
            f"- Kapital verfügbar ohne Liquiditätsengpass\n\n"
            f"**Tipp:** Bei Optimierung der Kosten um 15% könnte ROI auf "
            f"~{_format_percentage(roi * 1.3)} steigen."
        )

    # Guter ROI (20-50%)
    elif roi < 50:
        return (
            f"✅ **EMPFOHLEN** - ROI von {_format_percentage(roi)} ist sehr gut.\n\n"
            f"**Empfehlung:** Investition durchführen!\n"
            f"- Starke Rendite in {payback:.1f} Monaten amortisiert\n"
            f"- Profitability Score: {score}/100\n"
            f"- Monatlicher Profit: {_format_currency(result.monthly_profit)}\n\n"
            f"**Skalierungspotenzial prüfen:** Bei diesem ROI könnte eine Erhöhung "
            f"des Investments lohnenswert sein."
        )

    # Exzellenter ROI (≥50%)
    else:
        warning = ""
        if roi > 200:
            warning = (
                "\n\n⚠️ **HINWEIS:** ROI über 200% ist ungewöhnlich hoch. "
                "Bitte Annahmen nochmals prüfen!"
            )

        return (
            f"⭐ **SEHR EMPFOHLEN** - ROI von {_format_percentage(roi)} ist exzellent!\n\n"
            f"**Empfehlung:** Priorität A - Sofort umsetzen!\n"
            f"- Außergewöhnliche Rendite\n"
            f"- Payback in nur {payback:.1f} Monaten\n"
            f"- Netto-Gewinn: {_format_currency(net_profit)}\n\n"
            f"**Maßnahmen:**\n"
            f"1. Investment priorisieren und Budget sicherstellen\n"
            f"2. Skalierungsmöglichkeiten evaluieren\n"
            f"3. Risikomanagement implementieren (zu schön um wahr zu sein?)\n"
            f"4. Quick Wins identifizieren für noch schnellere Amortisation"
            f"{warning}"
        )


def _check_warnings(result: ROIResult) -> List[str]:
    """
    Prüft ROI-Ergebnis auf Risiken und Anomalien.

    Args:
        result: ROI-Analyse-Ergebnis

    Returns:
        Liste von Warnmeldungen
    """
    warnings = []

    # Sehr lange Payback Period
    if not math.isinf(result.payback_period_months):
        if result.payback_period_months > 48:
            warnings.append(
                f"⏰ Sehr lange Amortisationszeit ({result.payback_period_months:.1f} Monate / "
                f"{result.payback_period_months/12:.1f} Jahre). "
                f"Erhöhtes Risiko durch lange Kapitalbindung."
            )
        elif result.payback_period_months > 24:
            warnings.append(
                f"⏰ Lange Amortisationszeit ({result.payback_period_months:.1f} Monate). "
                f"Sicherstellen dass Cashflow während dieser Zeit gesichert ist."
            )
    else:
        warnings.append(
            "⚠️ Amortisation nicht möglich - Investment wird nie zurückverdient. "
            "Monatliche Kosten übersteigen monatliche Einnahmen."
        )

    # Negative oder sehr niedrige monatliche Gewinne
    if result.monthly_profit < 0:
        warnings.append(
            f"📉 Negativer monatlicher Profit ({_format_currency(result.monthly_profit)}). "
            f"Laufende Kosten übersteigen laufende Einnahmen."
        )
    elif result.monthly_profit < 100 and result.monthly_profit > 0:
        warnings.append(
            f"💰 Sehr geringer monatlicher Profit ({_format_currency(result.monthly_profit)}). "
            f"Prüfen ob der Aufwand gerechtfertigt ist."
        )

    # Unrealistisch hoher ROI
    if result.roi_percentage > 500:
        warnings.append(
            f"🚨 ACHTUNG: ROI von {_format_percentage(result.roi_percentage)} ist extrem hoch! "
            f"Bitte alle Annahmen und Berechnungen nochmals sorgfältig prüfen. "
            f"Solche Renditen sind in der Realität sehr selten."
        )
    elif result.roi_percentage > 200:
        warnings.append(
            f"⚡ Sehr hoher ROI ({_format_percentage(result.roi_percentage)}). "
            f"Stelle sicher dass alle Kosten berücksichtigt wurden und die "
            f"Umsatzprognose realistisch ist."
        )

    # Sehr kleines Investment im Verhältnis zum Umsatz
    if result.input_investment > 0:
        revenue_to_investment_ratio = result.input_revenue / result.input_investment
        if revenue_to_investment_ratio > 50:
            warnings.append(
                f"🤔 Umsatz ist {revenue_to_investment_ratio:.1f}x höher als Investment. "
                f"Prüfe ob wirklich alle Kosten (Personal, Marketing, Infrastruktur, etc.) "
                f"berücksichtigt wurden."
            )

    # Sehr hohe laufende Kosten
    if result.input_recurring_costs > 0:
        if result.input_recurring_costs * result.input_timeframe > result.input_investment * 2:
            total_recurring = result.input_recurring_costs * result.input_timeframe
            warnings.append(
                f"💸 Laufende Kosten ({_format_currency(total_recurring)} gesamt) übersteigen "
                f"initiales Investment deutlich. Operating Leverage ist hoch - "
                f"Kostenkontrolle ist kritisch."
            )

    return warnings


def _format_roi_output(result: ROIResult) -> str:
    """
    Formatiert ROI-Ergebnis als strukturiertes Markdown.

    Args:
        result: ROI-Analyse-Ergebnis

    Returns:
        Formatierter Markdown-String
    """
    # Header
    output = "# 📊 ROI-Analyse\n\n"

    # Executive Summary
    output += "## Executive Summary\n\n"
    if result.roi_percentage >= 20:
        summary = (
            f"Die Investition von **{_format_currency(result.input_investment)}** "
            f"generiert einen **ROI von {_format_percentage(result.roi_percentage)}** "
            f"über {result.input_timeframe} Monate. "
            f"Das Investment amortisiert sich in **{result.payback_period_months:.1f} Monaten** "
            f"und generiert einen Netto-Gewinn von **{_format_currency(result.net_profit)}**. "
            f"Profitability Score: **{result.profitability_score}/100**."
        )
    elif result.roi_percentage >= 0:
        summary = (
            f"Die Investition von **{_format_currency(result.input_investment)}** "
            f"zeigt einen moderaten **ROI von {_format_percentage(result.roi_percentage)}**. "
            f"Der Netto-Gewinn beträgt {_format_currency(result.net_profit)} über "
            f"{result.input_timeframe} Monate. Amortisation in {result.payback_period_months:.1f} Monaten."
        )
    else:
        summary = (
            f"⚠️ Die Investition von **{_format_currency(result.input_investment)}** "
            f"generiert einen **Verlust von {_format_currency(abs(result.net_profit))}** "
            f"({_format_percentage(result.roi_percentage)} ROI). "
            f"Das Investment ist **nicht profitabel** und wird nicht empfohlen."
        )

    output += f"{summary}\n\n"

    # Kennzahlen-Tabelle
    output += "## 🔢 Finanzielle Kennzahlen\n\n"
    output += "| Kennzahl | Wert | Bewertung |\n"
    output += "|----------|------|----------|\n"
    output += f"| **Investment (Initial)** | {_format_currency(result.input_investment)} | - |\n"

    if result.input_recurring_costs > 0:
        total_recurring = result.input_recurring_costs * result.input_timeframe
        output += f"| Laufende Kosten | {_format_currency(result.input_recurring_costs)}/Monat | Total: {_format_currency(total_recurring)} |\n"

    output += f"| **Gesamt-Investment** | {_format_currency(result.total_investment)} | - |\n"
    output += f"| Generierter Umsatz | {_format_currency(result.input_revenue)} | {result.input_timeframe} Monate |\n"
    output += f"| **Netto-Gewinn** | {_format_currency(result.net_profit)} | {'✅' if result.net_profit > 0 else '❌'} |\n"

    # ROI mit Farb-Indikator
    roi_indicator = "⭐" if result.roi_percentage >= 50 else "✅" if result.roi_percentage >= 20 else "⚠️" if result.roi_percentage >= 0 else "❌"
    output += f"| **ROI** | **{_format_percentage(result.roi_percentage)}** | {roi_indicator} |\n"
    output += f"| Kategorie | {result.category} | - |\n"

    # Payback Period
    if math.isinf(result.payback_period_months):
        payback_display = "∞ (nie)"
        payback_indicator = "❌"
    else:
        payback_display = f"{result.payback_period_months:.1f} Monate ({result.payback_period_months/12:.1f} Jahre)"
        if result.payback_period_months <= 12:
            payback_indicator = "✅"
        elif result.payback_period_months <= 24:
            payback_indicator = "⚠️"
        else:
            payback_indicator = "⏰"

    output += f"| **Payback Period** | {payback_display} | {payback_indicator} |\n"
    output += f"| Monatlicher Profit | {_format_currency(result.monthly_profit)} | - |\n"
    output += f"| **Profitability Score** | **{result.profitability_score}/100** | {'Exzellent' if result.profitability_score >= 70 else 'Gut' if result.profitability_score >= 50 else 'Moderat'} |\n"

    output += "\n"

    # Payback Timeline Visualisierung (wenn sinnvoll)
    if not math.isinf(result.payback_period_months) and 0 < result.payback_period_months <= 60:
        output += "## 📈 Payback Timeline\n\n"
        output += "```\n"
        output += _create_payback_chart(result)
        output += "```\n\n"

    # Interpretation
    output += "## 📋 Interpretation\n\n"
    if result.roi_percentage >= 50:
        interpretation = (
            f"Mit einem ROI von {_format_percentage(result.roi_percentage)} liegt diese Investition "
            f"im **exzellenten Bereich**. Jeder investierte Euro generiert {result.roi_percentage/100 + 1:.2f}€ Rückfluss. "
            f"Die schnelle Amortisation in {result.payback_period_months:.1f} Monaten minimiert das Risiko."
        )
    elif result.roi_percentage >= 20:
        interpretation = (
            f"Der ROI von {_format_percentage(result.roi_percentage)} ist **sehr gut**. "
            f"Die Investition ist klar profitabel und amortisiert sich in einem akzeptablen Zeitraum "
            f"von {result.payback_period_months:.1f} Monaten."
        )
    elif result.roi_percentage >= 5:
        interpretation = (
            f"Mit {_format_percentage(result.roi_percentage)} ROI ist diese Investition **moderat profitabel**. "
            f"Die Rendite liegt unter typischen Benchmark-Werten. Prüfe ob es Optimierungspotenzial "
            f"bei Kosten oder Umsatz gibt."
        )
    elif result.roi_percentage >= 0:
        interpretation = (
            f"Der ROI von {_format_percentage(result.roi_percentage)} ist **sehr niedrig**. "
            f"Die Investition ist knapp profitabel, aber kaum lohnenswert. Kleine Abweichungen "
            f"vom Plan können schnell zu Verlusten führen."
        )
    else:
        loss_percentage = abs(result.roi_percentage)
        interpretation = (
            f"⚠️ Diese Investition generiert einen **Verlust von {_format_percentage(loss_percentage)}**. "
            f"Pro investiertem Euro verlierst du {loss_percentage/100:.2f}€. "
            f"Das Investment ist **nicht empfehlenswert** ohne fundamentale Änderungen."
        )

    output += f"{interpretation}\n\n"

    # Empfehlung
    output += "## 💡 Handlungsempfehlung\n\n"
    output += f"{result.recommendation}\n\n"

    # Warnings (falls vorhanden)
    if result.warnings:
        output += "## ⚠️ Wichtige Hinweise\n\n"
        for warning in result.warnings:
            output += f"- {warning}\n"
        output += "\n"

    # Raw Data
    output += "## 📋 Raw Data\n\n"
    output += "```json\n"

    # Erstelle sauberes Dict ohne interne Felder
    raw_data = {
        "tool": "roi_calculator",
        "input": {
            "investment_cost": result.input_investment,
            "revenue_generated": result.input_revenue,
            "timeframe_months": result.input_timeframe,
            "recurring_costs_monthly": result.input_recurring_costs
        },
        "results": {
            "roi_percentage": round(result.roi_percentage, 2),
            "net_profit": round(result.net_profit, 2),
            "total_investment": round(result.total_investment, 2),
            "payback_period_months": round(result.payback_period_months, 2) if not math.isinf(result.payback_period_months) else None,
            "monthly_profit": round(result.monthly_profit, 2),
            "profitability_score": result.profitability_score,
            "category": result.category
        }
    }

    import json
    output += json.dumps(raw_data, indent=2, ensure_ascii=False)
    output += "\n```\n"

    return output


def _create_payback_chart(result: ROIResult) -> str:
    """
    Erstellt ASCII-Chart für Payback Timeline.

    Args:
        result: ROI-Ergebnis

    Returns:
        ASCII-Chart als String
    """
    payback_months = int(result.payback_period_months)
    total_months = min(payback_months + 6, 36)  # Max 36 Monate darstellen

    chart = "Kapital-Rückfluss über Zeit:\n\n"
    chart += "Monat | Investment Status\n"
    chart += "------+--------------------------------\n"

    step = max(1, total_months // 20)  # Zeige max 20 Zeilen

    for month in range(0, total_months + 1, step):
        if month == 0:
            label = "Start"
            bar = "█" * 20 + " ← Investment"
        elif month < payback_months:
            progress = (month / payback_months)
            filled = int(progress * 20)
            bar = "█" * filled + "░" * (20 - filled) + f" {progress*100:.0f}% zurück"
        elif month == payback_months:
            bar = "█" * 20 + " ✓ Break-Even!"
        else:
            bar = "█" * 20 + " ✓ Profit"

        chart += f"{month:5d} | {bar}\n"

    chart += "\n"
    chart += f"✓ Break-Even erreicht nach {payback_months} Monaten\n"
    chart += f"💰 Danach: {_format_currency(result.monthly_profit)} Profit/Monat\n"

    return chart


def _format_currency(amount: float) -> str:
    """Formatiert Geldbetrag mit €-Symbol."""
    if config:
        return config.output.format_currency(amount)
    return f"€{amount:,.2f}"


def _format_percentage(value: float) -> str:
    """Formatiert Prozentwert."""
    if config:
        return config.output.format_percentage(value)
    return f"{value:.2f}%"


# Haupt-Tool-Funktion
async def calculate_roi(
    investment_cost: float,
    revenue_generated: float,
    timeframe_months: int,
    recurring_costs: float = 0.0
) -> dict[str, Any]:
    """
    Berechnet Return on Investment (ROI) mit vollständiger Finanzanalyse.

    Diese Funktion analysiert die Rentabilität einer Investition und liefert:
    - ROI in Prozent
    - Payback Period (Amortisationszeit)
    - Profitability Score (0-100)
    - Kategorisierung und Empfehlungen
    - Detaillierte Warnungen bei Risiken

    Args:
        investment_cost: Initiale Investitionskosten in € (einmalig)
        revenue_generated: Generierte Einnahmen in € über den Zeitraum
        timeframe_months: Betrachtungszeitraum in Monaten
        recurring_costs: Optional - Monatliche laufende Kosten in €

    Returns:
        Dictionary mit:
        - result: ROIResult Objekt mit allen Kennzahlen
        - formatted_output: Strukturiertes Markdown für Präsentation

    Example:
        >>> result = await calculate_roi(
        ...     investment_cost=50000,
        ...     revenue_generated=75000,
        ...     timeframe_months=12,
        ...     recurring_costs=2000
        ... )
        >>> print(result['formatted_output'])
    """
    # 1. Input validieren
    roi_input = ROIInput(
        investment_cost=investment_cost,
        revenue_generated=revenue_generated,
        timeframe_months=timeframe_months,
        recurring_costs=recurring_costs
    )

    is_valid, error_msg = roi_input.validate()
    if not is_valid:
        # Gebe Fehler-Output zurück
        error_output = (
            "# ❌ ROI-Berechnung Fehler\n\n"
            f"**Validierungsfehler:** {error_msg}\n\n"
            "Bitte korrigiere die Eingabedaten und versuche es erneut."
        )
        return {
            "error": error_msg,
            "formatted_output": error_output
        }

    # 2. Berechnungen durchführen

    # Total Investment = Initiale Kosten + alle laufenden Kosten über den Zeitraum
    total_costs = investment_cost + (recurring_costs * timeframe_months)

    # Netto-Gewinn = Einnahmen - Gesamt-Kosten
    net_profit = revenue_generated - total_costs

    # ROI in Prozent = (Netto-Gewinn / Gesamt-Kosten) * 100
    if total_costs > 0:
        roi_percentage = (net_profit / total_costs) * 100
    else:
        # Edge Case: Keine Kosten (theoretisch) = unendlicher ROI
        roi_percentage = float('inf') if net_profit > 0 else 0

    # Monatlicher Netto-Profit
    monthly_revenue = revenue_generated / timeframe_months if timeframe_months > 0 else 0
    monthly_net_profit = monthly_revenue - recurring_costs

    # Payback Period (Amortisationszeit)
    # = Initiales Investment / Monatlicher Netto-Profit
    if monthly_net_profit > 0:
        payback_period = investment_cost / monthly_net_profit
    elif net_profit > 0 and recurring_costs == 0:
        # Sonderfall: Kein laufendes Business, einmaliger Profit
        # Payback = Zeitraum bis Break-Even erreicht
        payback_period = timeframe_months * (investment_cost / revenue_generated)
    else:
        # Kein Profit oder negativer monatlicher Profit = nie amortisiert
        payback_period = float('inf')

    # 3. Profitability Score berechnen (0-100)
    profitability_score = _calculate_profitability_score(
        roi_percentage if not math.isinf(roi_percentage) else 100,
        payback_period,
        net_profit
    )

    # 4. Kategorisierung
    category = _categorize_roi(roi_percentage if not math.isinf(roi_percentage) else 100)

    # 5. ROI-Result-Objekt erstellen (vor Empfehlungen, da diese darauf zugreifen)
    result = ROIResult(
        roi_percentage=round(roi_percentage, 2) if not math.isinf(roi_percentage) else roi_percentage,
        net_profit=round(net_profit, 2),
        total_investment=round(total_costs, 2),
        payback_period_months=round(payback_period, 2) if not math.isinf(payback_period) else payback_period,
        monthly_profit=round(monthly_net_profit, 2),
        profitability_score=profitability_score,
        category=category,
        recommendation="",  # Wird gleich gesetzt
        warnings=[],  # Wird gleich gesetzt
        input_investment=investment_cost,
        input_revenue=revenue_generated,
        input_timeframe=timeframe_months,
        input_recurring_costs=recurring_costs
    )

    # 6. Empfehlungen generieren
    result.recommendation = _generate_recommendation(result)

    # 7. Warnings prüfen
    result.warnings = _check_warnings(result)

    # 8. Formatiertes Output erstellen
    markdown_output = _format_roi_output(result)

    return {
        "result": asdict(result),
        "formatted_output": markdown_output,
        "success": True
    }


# Tool-Registrierung für Claude Agent SDK
def get_roi_tool_definition() -> dict:
    """
    Gibt Tool-Definition für Claude Agent SDK zurück.

    Returns:
        Tool-Definition Dictionary
    """
    return {
        "name": "calculate_roi",
        "description": (
            "Berechnet Return on Investment (ROI) für Projekte oder Investitionen.\n\n"
            "Nutze dieses Tool wenn der User fragt nach:\n"
            "- ROI-Berechnung, Rentabilität, Profitabilität\n"
            "- 'Lohnt sich die Investition?'\n"
            "- Amortisationszeit, Payback Period\n"
            "- Investment-Bewertung, Investment-Vergleich\n\n"
            "Das Tool gibt detaillierte Finanzanalyse mit Empfehlungen zurück."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "investment_cost": {
                    "type": "number",
                    "description": "Initiale Investitionskosten in € (einmalig)"
                },
                "revenue_generated": {
                    "type": "number",
                    "description": "Generierte Einnahmen in € über den gesamten Zeitraum"
                },
                "timeframe_months": {
                    "type": "integer",
                    "description": "Betrachtungszeitraum in Monaten"
                },
                "recurring_costs": {
                    "type": "number",
                    "description": "Monatliche laufende Kosten in € (optional, Standard: 0)",
                    "default": 0.0
                }
            },
            "required": ["investment_cost", "revenue_generated", "timeframe_months"]
        }
    }


# Testing
if __name__ == "__main__":
    import asyncio

    print("=" * 80)
    print("ROI CALCULATOR - TEST SCENARIOS")
    print("=" * 80)

    async def run_tests():
        # Test 1: Profitables Investment (ROI ~35%)
        print("\n\n### TEST 1: Profitables Marketing-Investment ###\n")
        result1 = await calculate_roi(
            investment_cost=50000,
            revenue_generated=95000,
            timeframe_months=12,
            recurring_costs=1500
        )
        print(result1['formatted_output'])

        # Test 2: Break-Even Szenario (ROI ~0%)
        print("\n\n" + "=" * 80)
        print("### TEST 2: Break-Even Szenario ###\n")
        result2 = await calculate_roi(
            investment_cost=30000,
            revenue_generated=31500,
            timeframe_months=18,
            recurring_costs=0
        )
        print(result2['formatted_output'])

        # Test 3: Verlust-Szenario (ROI -15%)
        print("\n\n" + "=" * 80)
        print("### TEST 3: Verlust-Szenario ###\n")
        result3 = await calculate_roi(
            investment_cost=80000,
            revenue_generated=60000,
            timeframe_months=24,
            recurring_costs=500
        )
        print(result3['formatted_output'])

        # Test 4: Exzellentes Investment (ROI 120%)
        print("\n\n" + "=" * 80)
        print("### TEST 4: Exzellentes Investment ###\n")
        result4 = await calculate_roi(
            investment_cost=25000,
            revenue_generated=80000,
            timeframe_months=12,
            recurring_costs=1000
        )
        print(result4['formatted_output'])

        # Test 5: Validierungs-Fehler
        print("\n\n" + "=" * 80)
        print("### TEST 5: Validierungs-Fehler (negative Kosten) ###\n")
        result5 = await calculate_roi(
            investment_cost=-10000,
            revenue_generated=50000,
            timeframe_months=12
        )
        print(result5['formatted_output'])

    # Run all tests
    asyncio.run(run_tests())

    print("\n\n" + "=" * 80)
    print("TESTS COMPLETED")
    print("=" * 80)
