"""
Scenario Planning Tool für Dexter Agent

Erstellt strategische Multi-Scenario Financial Modeling mit Best/Base/Worst Case
Analysis, Probability-Weighted Projections und Risk Assessment.

Features:
- Best/Base/Worst Case Financial Modeling
- Probability-Weighted Expected Values
- Key Assumptions Tracking & Impact Analysis
- Multi-Variable Sensitivity Analysis
- Risk-Adjusted Projections
- Decision Support mit Confidence Intervals
- Strategic Recommendations

Author: Dexter Agent Development Team
Version: 1.0.0
"""

from dataclasses import dataclass, field
from typing import Any, Optional, List, Dict
from enum import Enum
import asyncio


# ============================================================================
# ENUMS & DATACLASSES
# ============================================================================

class ScenarioType(Enum):
    """Szenario-Typen für Financial Modeling"""
    BEST_CASE = "best_case"
    BASE_CASE = "base_case"
    WORST_CASE = "worst_case"
    CUSTOM = "custom"


@dataclass
class KeyAssumption:
    """Schlüssel-Annahme für Szenario-Planung"""
    name: str  # "Revenue Growth", "Cost Inflation"
    best_case: float  # Optimistischer Wert
    base_case: float  # Realistischer Wert
    worst_case: float  # Pessimistischer Wert
    unit: str  # "%" oder "€" oder "units"
    impact_level: str = "Medium"  # "High", "Medium", "Low"

    def validate(self) -> tuple[bool, str]:
        """Validiert Annahmen-Logik"""
        if self.unit not in ["%", "€", "EUR", "units", "$", "USD"]:
            return False, f"Ungültige Unit: {self.unit}. Verwende %, €, USD oder units"

        if self.impact_level not in ["High", "Medium", "Low"]:
            return False, f"Ungültiges Impact Level: {self.impact_level}"

        return True, ""


@dataclass
class ScenarioProjection:
    """Finanzielle Projektion für ein Szenario"""
    scenario_type: ScenarioType
    scenario_name: str
    probability: float  # 0.0 - 1.0

    # Financial Projections
    revenue: float
    costs: float
    operating_profit: float
    net_profit: float
    cash_flow: float

    # Key Metrics
    profit_margin: float  # %
    roi: float  # %
    break_even_months: Optional[float] = None

    # Assumptions Applied
    assumptions_used: Dict[str, float] = field(default_factory=dict)


@dataclass
class ScenarioPlanningResult:
    """Vollständige Szenario-Analyse Ergebnisse"""

    # Base Information
    planning_horizon: str
    base_revenue: float
    base_costs: float

    # Key Assumptions
    assumptions: List[KeyAssumption]

    # Scenarios
    best_case: ScenarioProjection
    base_case: ScenarioProjection
    worst_case: ScenarioProjection
    custom_scenarios: List[ScenarioProjection] = field(default_factory=list)

    # Probability-Weighted Analysis
    expected_revenue: float
    expected_profit: float
    expected_cash_flow: float

    # Risk Metrics
    revenue_range: tuple[float, float]
    profit_range: tuple[float, float]
    downside_risk: float
    upside_potential: float
    risk_reward_ratio: float

    # Decision Support
    recommended_scenario: str
    confidence_level: str
    strategic_recommendation: str

    warnings: List[str] = field(default_factory=list)


# ============================================================================
# MAIN FUNCTION
# ============================================================================

async def create_scenario_plan(
    planning_horizon: str,
    base_revenue: float,
    base_costs: float,
    assumptions: List[Dict[str, Any]],
    probabilities: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Erstellt strategische Multi-Scenario Financial Planning.

    Args:
        planning_horizon: Planungshorizont (z.B. "2025" oder "Q1-Q4 2025")
        base_revenue: Ausgangsumsatz in Euro
        base_costs: Ausgangskosten in Euro
        assumptions: Liste von KeyAssumptions als Dicts
        probabilities: Optional - Custom probabilities für Szenarien

    Returns:
        Dict mit ScenarioPlanningResult und formatted_output

    Default Probabilities:
        - Best Case: 20%
        - Base Case: 60%
        - Worst Case: 20%
    """

    # 1. Input validieren
    if not assumptions or len(assumptions) == 0:
        return {
            "error": "Mindestens eine Annahme erforderlich",
            "formatted_output": "❌ **Fehler:** Keine Annahmen definiert. Bitte mindestens eine KeyAssumption angeben."
        }

    if base_revenue <= 0:
        return {
            "error": "Base Revenue muss positiv sein",
            "formatted_output": "❌ **Fehler:** Ausgangsumsatz muss größer als 0 sein."
        }

    # 2. KeyAssumptions erstellen und validieren
    key_assumptions = []
    for assumption_data in assumptions:
        try:
            assumption = KeyAssumption(**assumption_data)
            is_valid, error = assumption.validate()
            if not is_valid:
                return {
                    "error": f"Ungültige Annahme: {error}",
                    "formatted_output": f"❌ **Validierungsfehler:** {error}"
                }
            key_assumptions.append(assumption)
        except Exception as e:
            return {
                "error": f"Fehler beim Erstellen der Annahme: {str(e)}",
                "formatted_output": f"❌ **Fehler:** {str(e)}"
            }

    # 3. Probabilities setzen (Default oder Custom)
    if probabilities is None:
        probabilities = {
            "best_case": 0.20,
            "base_case": 0.60,
            "worst_case": 0.20
        }

    # Validiere: Summe muss 1.0 sein
    prob_sum = sum(probabilities.values())
    if abs(prob_sum - 1.0) > 0.01:
        return {
            "error": f"Probabilities müssen 100% ergeben (aktuell: {prob_sum*100:.1f}%)",
            "formatted_output": f"❌ **Fehler:** Wahrscheinlichkeiten ergeben {prob_sum*100:.1f}% statt 100%"
        }

    # 4. Scenarios berechnen

    # BEST CASE Scenario
    best_case = _calculate_scenario(
        scenario_type=ScenarioType.BEST_CASE,
        scenario_name="Best Case",
        probability=probabilities.get("best_case", 0.20),
        base_revenue=base_revenue,
        base_costs=base_costs,
        assumptions=key_assumptions,
        use_values="best_case"
    )

    # BASE CASE Scenario
    base_case_proj = _calculate_scenario(
        scenario_type=ScenarioType.BASE_CASE,
        scenario_name="Base Case",
        probability=probabilities.get("base_case", 0.60),
        base_revenue=base_revenue,
        base_costs=base_costs,
        assumptions=key_assumptions,
        use_values="base_case"
    )

    # WORST CASE Scenario
    worst_case = _calculate_scenario(
        scenario_type=ScenarioType.WORST_CASE,
        scenario_name="Worst Case",
        probability=probabilities.get("worst_case", 0.20),
        base_revenue=base_revenue,
        base_costs=base_costs,
        assumptions=key_assumptions,
        use_values="worst_case"
    )

    # 5. Probability-Weighted Expected Values
    expected_revenue = (
        best_case.revenue * best_case.probability +
        base_case_proj.revenue * base_case_proj.probability +
        worst_case.revenue * worst_case.probability
    )

    expected_profit = (
        best_case.net_profit * best_case.probability +
        base_case_proj.net_profit * base_case_proj.probability +
        worst_case.net_profit * worst_case.probability
    )

    expected_cash_flow = (
        best_case.cash_flow * best_case.probability +
        base_case_proj.cash_flow * base_case_proj.probability +
        worst_case.cash_flow * worst_case.probability
    )

    # 6. Risk Metrics
    revenue_range = (worst_case.revenue, best_case.revenue)
    profit_range = (worst_case.net_profit, best_case.net_profit)

    downside_risk = base_case_proj.net_profit - worst_case.net_profit
    upside_potential = best_case.net_profit - base_case_proj.net_profit

    risk_reward_ratio = (
        (upside_potential / downside_risk) if downside_risk > 0 else float('inf')
    )

    # 7. Confidence Level berechnen
    confidence_level = _calculate_confidence_level(
        best_case, base_case_proj, worst_case
    )

    # 8. Strategic Recommendation generieren
    strategic_recommendation = _generate_scenario_recommendation(
        best_case, base_case_proj, worst_case,
        risk_reward_ratio, confidence_level
    )

    # 9. Recommended Scenario
    recommended_scenario = _determine_recommended_scenario(
        best_case, base_case_proj, worst_case,
        risk_reward_ratio
    )

    # 10. Warnungen prüfen
    warnings = _check_scenario_warnings(
        best_case, base_case_proj, worst_case,
        downside_risk, confidence_level
    )

    # 11. Result Object erstellen
    result = ScenarioPlanningResult(
        planning_horizon=planning_horizon,
        base_revenue=base_revenue,
        base_costs=base_costs,
        assumptions=key_assumptions,
        best_case=best_case,
        base_case=base_case_proj,
        worst_case=worst_case,
        custom_scenarios=[],
        expected_revenue=expected_revenue,
        expected_profit=expected_profit,
        expected_cash_flow=expected_cash_flow,
        revenue_range=revenue_range,
        profit_range=profit_range,
        downside_risk=downside_risk,
        upside_potential=upside_potential,
        risk_reward_ratio=risk_reward_ratio,
        recommended_scenario=recommended_scenario,
        confidence_level=confidence_level,
        strategic_recommendation=strategic_recommendation,
        warnings=warnings
    )

    # 12. Formatted Output
    formatted_output = _format_scenario_planning_output(result)

    return {
        "result": result.__dict__,
        "formatted_output": formatted_output
    }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _calculate_scenario(
    scenario_type: ScenarioType,
    scenario_name: str,
    probability: float,
    base_revenue: float,
    base_costs: float,
    assumptions: List[KeyAssumption],
    use_values: str
) -> ScenarioProjection:
    """
    Berechnet finanzielle Projektion für ein Szenario.

    Wendet alle Assumptions an und berechnet Financial Metrics.
    """
    assumptions_used = {}

    revenue = base_revenue
    costs = base_costs

    # Annahmen anwenden
    for assumption in assumptions:
        if use_values == "best_case":
            value = assumption.best_case
        elif use_values == "base_case":
            value = assumption.base_case
        else:  # worst_case
            value = assumption.worst_case

        assumptions_used[assumption.name] = value

        # Annahmen anwenden basierend auf Namen und Unit
        name_lower = assumption.name.lower()

        if "revenue" in name_lower or "growth" in name_lower or "sales" in name_lower:
            if assumption.unit == "%":
                revenue *= (1 + value / 100)
            else:
                revenue += value

        if "cost" in name_lower or "expense" in name_lower or "inflation" in name_lower:
            if assumption.unit == "%":
                costs *= (1 + value / 100)
            else:
                costs += value

    # Metriken berechnen
    operating_profit = revenue - costs

    # Vereinfachte Tax Rate: 25%
    tax_rate = 0.25
    net_profit = operating_profit * (1 - tax_rate)

    # Cash Flow (vereinfacht: = Net Profit für diese Zwecke)
    cash_flow = net_profit

    # Kennzahlen
    profit_margin = (net_profit / revenue * 100) if revenue > 0 else 0
    roi = (net_profit / costs * 100) if costs > 0 else 0

    return ScenarioProjection(
        scenario_type=scenario_type,
        scenario_name=scenario_name,
        probability=probability,
        revenue=revenue,
        costs=costs,
        operating_profit=operating_profit,
        net_profit=net_profit,
        cash_flow=cash_flow,
        profit_margin=profit_margin,
        roi=roi,
        break_even_months=None,
        assumptions_used=assumptions_used
    )


def _calculate_confidence_level(
    best_case: ScenarioProjection,
    base_case: ScenarioProjection,
    worst_case: ScenarioProjection
) -> str:
    """Berechnet Confidence Level basierend auf Spread zwischen Szenarien"""

    if base_case.net_profit == 0:
        return "Low"

    # Spread zwischen Best und Worst in Prozent vom Base Case
    profit_spread_percent = abs(
        (best_case.net_profit - worst_case.net_profit) / base_case.net_profit * 100
    )

    if profit_spread_percent < 30:
        return "High"  # Geringe Unsicherheit
    elif profit_spread_percent < 70:
        return "Moderate"  # Moderate Unsicherheit
    else:
        return "Low"  # Hohe Unsicherheit


def _determine_recommended_scenario(
    best_case: ScenarioProjection,
    base_case: ScenarioProjection,
    worst_case: ScenarioProjection,
    risk_reward_ratio: float
) -> str:
    """Bestimmt empfohlene Planungsgrundlage"""

    # Analyse der Situation
    if risk_reward_ratio > 2.0 and worst_case.net_profit > 0:
        # Hohes Upside-Potential bei positivem Worst Case
        return "Prepare for Base Case, Plan for Best Case"
    elif worst_case.net_profit < 0:
        # Worst Case ist negativ - Vorsicht geboten
        return "Prepare for Worst Case, Hope for Base Case"
    elif risk_reward_ratio < 0.5:
        # Downside überwiegt Upside
        return "Prepare for Worst Case, Monitor for Base Case"
    else:
        # Ausgewogene Situation
        return "Prepare for Base Case, Monitor for Worst Case"


def _generate_scenario_recommendation(
    best_case: ScenarioProjection,
    base_case: ScenarioProjection,
    worst_case: ScenarioProjection,
    risk_reward_ratio: float,
    confidence_level: str
) -> str:
    """Generiert strategische Empfehlungen"""

    recommendations = []

    # 1. Basis-Empfehlung nach Confidence Level
    if confidence_level == "High":
        recommendations.append(
            "✅ **Hohe Planungssicherheit**: Geringe Streuung zwischen Szenarien. "
            "Fokus auf Execution des Base Case Plans mit gelegentlichem Monitoring."
        )
    elif confidence_level == "Moderate":
        recommendations.append(
            "⚠️ **Moderate Unsicherheit**: Bedeutende Streuung zwischen Szenarien erkannt. "
            "Empfehlung: Quartalsweise Reviews und flexible Ressourcenplanung."
        )
    else:  # Low
        recommendations.append(
            "🚨 **Hohe Unsicherheit**: Sehr breite Streuung der Szenarien. "
            "Empfehlung: Monatliche Reviews, agile Planung, starke Contingency Pläne."
        )

    # 2. Risk-Reward Analysis
    if risk_reward_ratio > 3.0:
        recommendations.append(
            f"💰 **Ausgezeichnetes Risk-Reward** ({risk_reward_ratio:.1f}:1): "
            f"Upside-Potential deutlich größer als Downside-Risiko. "
            f"Erwäge aggressive Investitionsstrategie."
        )
    elif risk_reward_ratio > 1.5:
        recommendations.append(
            f"📊 **Positives Risk-Reward** ({risk_reward_ratio:.1f}:1): "
            f"Upside überwiegt Downside. Balanced Growth Strategy empfohlen."
        )
    elif risk_reward_ratio > 0.8:
        recommendations.append(
            f"⚖️ **Ausgewogenes Risk-Reward** ({risk_reward_ratio:.1f}:1): "
            f"Upside und Downside etwa gleich. Conservative Growth mit Hedging-Optionen."
        )
    else:
        recommendations.append(
            f"⚠️ **Negatives Risk-Reward** ({risk_reward_ratio:.1f}:1): "
            f"Downside-Risiko überwiegt Upside. Fokus auf Risiko-Minimierung."
        )

    # 3. Worst Case Analysis
    if worst_case.net_profit < 0:
        recommendations.append(
            f"🚨 **Worst Case Verlust**: €{abs(worst_case.net_profit):,.0f} Verlust möglich. "
            f"KRITISCH: Entwickle Contingency Plan für Kostenreduktion oder zusätzliche Finanzierung."
        )
    elif worst_case.profit_margin < 5:
        recommendations.append(
            f"⚠️ **Niedrige Worst Case Margin** ({worst_case.profit_margin:.1f}%): "
            f"Sicherheitspolster sehr gering. Baue Cost Buffer ein."
        )

    # 4. Best Case Potential
    if best_case.profit_margin > base_case.profit_margin * 1.5:
        recommendations.append(
            f"🚀 **Signifikantes Upside-Potential**: Best Case Margin {best_case.profit_margin:.1f}% "
            f"vs. Base {base_case.profit_margin:.1f}%. "
            f"Erwäge skalierbare Infrastruktur für mögliches Wachstum."
        )

    # 5. Strategische Aktionen
    recommendations.append("\n**Empfohlene Maßnahmen:**")

    if confidence_level == "Low":
        recommendations.append("- Implementiere monatliche Scenario Review Meetings")
        recommendations.append("- Entwickle detaillierte Contingency Pläne für Worst Case")
        recommendations.append("- Schaffe flexible Kostenstrukturen (variable > fixed)")

    if worst_case.net_profit < 0:
        recommendations.append("- Identifiziere kritische Frühwarnindikatoren")
        recommendations.append("- Bereite Finanzierungsoptionen vor (Credit Line, Investor)")
        recommendations.append("- Plane Kostenreduktions-Szenarien (10%, 20%, 30%)")

    if risk_reward_ratio > 2.0:
        recommendations.append("- Investiere in Wachstums-Enabler (Marketing, Sales)")
        recommendations.append("- Skaliere Infrastruktur für Best Case Szenario")

    return "\n\n".join(recommendations)


def _check_scenario_warnings(
    best_case: ScenarioProjection,
    base_case: ScenarioProjection,
    worst_case: ScenarioProjection,
    downside_risk: float,
    confidence_level: str
) -> List[str]:
    """Prüft auf kritische Scenario Planning Situationen"""

    warnings = []

    # Warnung 1: Worst Case Verlust
    if worst_case.net_profit < 0:
        warnings.append(
            f"🚨 KRITISCH: Worst Case führt zu Verlust von €{abs(worst_case.net_profit):,.0f}. "
            f"Wahrscheinlichkeit: {worst_case.probability*100:.0f}%. Contingency Plan erforderlich!"
        )

    # Warnung 2: Hohes Downside-Risiko
    if downside_risk > base_case.net_profit * 0.5:
        warnings.append(
            f"⚠️ Hohes Downside-Risiko: €{downside_risk:,.0f} "
            f"({(downside_risk/base_case.net_profit*100):.0f}% des Base Case Profits). "
            f"Erwäge Risiko-Hedging Strategien."
        )

    # Warnung 3: Niedrige Confidence
    if confidence_level == "Low":
        warnings.append(
            f"⚠️ Niedrige Planungssicherheit: Sehr breite Streuung zwischen Szenarien. "
            f"Empfehlung: Häufigere Reviews und flexible Planung."
        )

    # Warnung 4: Negative Worst Case Margin
    if worst_case.profit_margin < 0:
        warnings.append(
            f"⚠️ Negative Profit Margin im Worst Case ({worst_case.profit_margin:.1f}%). "
            f"Geschäftsmodell nicht resilient genug."
        )

    # Warnung 5: Geringe Best Case Verbesserung
    improvement = ((best_case.net_profit - base_case.net_profit) / base_case.net_profit * 100) if base_case.net_profit > 0 else 0
    if improvement < 20:
        warnings.append(
            f"⚠️ Geringes Upside-Potential: Best Case nur {improvement:.0f}% über Base Case. "
            f"Limitierte Wachstumschancen erkannt."
        )

    # Warnung 6: Alle Szenarien negativ
    if best_case.net_profit < 0 and base_case.net_profit < 0 and worst_case.net_profit < 0:
        warnings.append(
            f"🚨 KRITISCH: Alle Szenarien führen zu Verlusten! "
            f"Fundamentale Überarbeitung des Business Plans erforderlich."
        )

    return warnings


def _format_scenario_planning_output(result: ScenarioPlanningResult) -> str:
    """Formatiert Scenario Planning Analysis als Markdown"""

    lines = []

    # Header
    lines.append("=" * 80)
    lines.append(f"🎯 SZENARIO-PLANUNG: {result.planning_horizon}")
    lines.append("=" * 80)
    lines.append("")

    # Executive Summary
    lines.append("## 📋 Executive Summary")
    lines.append("")
    lines.append(f"**Expected Revenue:** €{result.expected_revenue:,.2f}")
    lines.append(f"**Expected Profit:** €{result.expected_profit:,.2f}")
    lines.append(f"**Risk-Reward Ratio:** {result.risk_reward_ratio:.2f}:1")
    lines.append(f"**Confidence Level:** {result.confidence_level}")
    lines.append(f"**Empfehlung:** {result.recommended_scenario}")
    lines.append("")

    # Schlüssel-Annahmen
    lines.append("## 📊 Schlüssel-Annahmen")
    lines.append("")
    assumptions_table = _format_assumptions_table(result.assumptions)
    lines.append(assumptions_table)
    lines.append("")

    # Szenario-Vergleich
    lines.append("## 🎲 Szenario-Vergleich")
    lines.append("")
    comparison_table = _create_scenario_comparison_table(
        result.best_case, result.base_case, result.worst_case
    )
    lines.append(comparison_table)
    lines.append("")

    # Visualisierung
    lines.append("## 📊 Visualisierung")
    lines.append("")
    chart = _create_probability_chart(
        result.best_case, result.base_case, result.worst_case
    )
    lines.append(chart)
    lines.append("")

    # Probability-Weighted Analysis
    lines.append("## 🎲 Probability-Weighted Analysis")
    lines.append("")
    lines.append(f"Basierend auf den definierten Wahrscheinlichkeiten:")
    lines.append(f"- Best Case: {result.best_case.probability*100:.0f}%")
    lines.append(f"- Base Case: {result.base_case.probability*100:.0f}%")
    lines.append(f"- Worst Case: {result.worst_case.probability*100:.0f}%")
    lines.append("")
    lines.append(f"**Expected Revenue:** €{result.expected_revenue:,.2f}")
    lines.append(f"**Expected Net Profit:** €{result.expected_profit:,.2f}")
    lines.append(f"**Expected Cash Flow:** €{result.expected_cash_flow:,.2f}")
    lines.append("")

    # Risk Assessment
    lines.append("## 📉 Risk Assessment")
    lines.append("")
    lines.append("| Metrik | Wert |")
    lines.append("|--------|------|")
    lines.append(f"| Revenue Range | €{result.revenue_range[0]:,.2f} - €{result.revenue_range[1]:,.2f} |")
    lines.append(f"| Profit Range | €{result.profit_range[0]:,.2f} - €{result.profit_range[1]:,.2f} |")
    lines.append(f"| Downside Risk | €{result.downside_risk:,.2f} |")
    lines.append(f"| Upside Potential | €{result.upside_potential:,.2f} |")

    rr_indicator = "✅" if result.risk_reward_ratio > 1.5 else "⚠️" if result.risk_reward_ratio > 0.8 else "🚨"
    lines.append(f"| Risk-Reward Ratio | {rr_indicator} {result.risk_reward_ratio:.2f}:1 |")
    lines.append(f"| Confidence Level | {result.confidence_level} |")
    lines.append("")

    # Sensitivity Impact
    lines.append("## 🔍 Sensitivity Impact Analysis")
    lines.append("")
    sensitivity = _calculate_sensitivity_impact(result.assumptions, result.base_case)
    lines.append(sensitivity)
    lines.append("")

    # Strategic Recommendation
    lines.append("## 🎯 Strategic Recommendation")
    lines.append("")
    lines.append(f"**Empfohlene Planungsgrundlage:**")
    lines.append(f"{result.recommended_scenario}")
    lines.append("")
    lines.append("**Detaillierte Analyse:**")
    lines.append("")
    lines.append(result.strategic_recommendation)
    lines.append("")

    # Warnings
    if result.warnings:
        lines.append("## ⚠️ Wichtige Hinweise & Warnungen")
        lines.append("")
        for warning in result.warnings:
            lines.append(f"- {warning}")
        lines.append("")

    # Raw Data
    lines.append("## 📄 Raw Data")
    lines.append("")
    lines.append("```json")
    lines.append("{")
    lines.append(f'  "planning_horizon": "{result.planning_horizon}",')
    lines.append(f'  "expected_revenue": {result.expected_revenue:.2f},')
    lines.append(f'  "expected_profit": {result.expected_profit:.2f},')
    lines.append(f'  "expected_cash_flow": {result.expected_cash_flow:.2f},')
    lines.append(f'  "risk_reward_ratio": {result.risk_reward_ratio:.2f},')
    lines.append(f'  "confidence_level": "{result.confidence_level}",')
    lines.append(f'  "best_case_profit": {result.best_case.net_profit:.2f},')
    lines.append(f'  "base_case_profit": {result.base_case.net_profit:.2f},')
    lines.append(f'  "worst_case_profit": {result.worst_case.net_profit:.2f}')
    lines.append("}")
    lines.append("```")
    lines.append("")

    lines.append("=" * 80)

    return "\n".join(lines)


def _format_assumptions_table(assumptions: List[KeyAssumption]) -> str:
    """Formatiert Key Assumptions als Markdown-Tabelle"""

    lines = []
    lines.append("| Annahme | Best Case | Base Case | Worst Case | Impact |")
    lines.append("|---------|-----------|-----------|------------|--------|")

    for assumption in assumptions:
        unit_symbol = assumption.unit if assumption.unit == "%" else " " + assumption.unit

        best_str = f"{assumption.best_case:+.1f}{unit_symbol}" if assumption.unit == "%" else f"{assumption.best_case:,.0f}{unit_symbol}"
        base_str = f"{assumption.base_case:+.1f}{unit_symbol}" if assumption.unit == "%" else f"{assumption.base_case:,.0f}{unit_symbol}"
        worst_str = f"{assumption.worst_case:+.1f}{unit_symbol}" if assumption.unit == "%" else f"{assumption.worst_case:,.0f}{unit_symbol}"

        impact_icon = "🔴" if assumption.impact_level == "High" else "🟡" if assumption.impact_level == "Medium" else "🟢"

        lines.append(
            f"| {assumption.name} | {best_str} | {base_str} | {worst_str} | "
            f"{impact_icon} {assumption.impact_level} |"
        )

    return "\n".join(lines)


def _create_scenario_comparison_table(
    best_case: ScenarioProjection,
    base_case: ScenarioProjection,
    worst_case: ScenarioProjection
) -> str:
    """Erstellt Vergleichstabelle für alle Szenarien"""

    # Expected values berechnen
    exp_revenue = (
        best_case.revenue * best_case.probability +
        base_case.revenue * base_case.probability +
        worst_case.revenue * worst_case.probability
    )
    exp_profit = (
        best_case.net_profit * best_case.probability +
        base_case.net_profit * base_case.probability +
        worst_case.net_profit * worst_case.probability
    )
    exp_margin = (exp_profit / exp_revenue * 100) if exp_revenue > 0 else 0

    lines = []
    lines.append(f"| Kennzahl | Best ({best_case.probability*100:.0f}%) | "
                 f"Base ({base_case.probability*100:.0f}%) | "
                 f"Worst ({worst_case.probability*100:.0f}%) | Expected |")
    lines.append("|----------|------------|-------------|--------------|----------|")

    lines.append(f"| **Revenue** | €{best_case.revenue:,.0f} | "
                 f"€{base_case.revenue:,.0f} | €{worst_case.revenue:,.0f} | "
                 f"€{exp_revenue:,.0f} |")

    lines.append(f"| **Costs** | €{best_case.costs:,.0f} | "
                 f"€{base_case.costs:,.0f} | €{worst_case.costs:,.0f} | - |")

    # Profit mit Farb-Indikatoren
    best_profit_str = f"✅ €{best_case.net_profit:,.0f}" if best_case.net_profit > 0 else f"❌ €{best_case.net_profit:,.0f}"
    base_profit_str = f"✅ €{base_case.net_profit:,.0f}" if base_case.net_profit > 0 else f"❌ €{base_case.net_profit:,.0f}"
    worst_profit_str = f"✅ €{worst_case.net_profit:,.0f}" if worst_case.net_profit > 0 else f"❌ €{worst_case.net_profit:,.0f}"
    exp_profit_str = f"✅ €{exp_profit:,.0f}" if exp_profit > 0 else f"❌ €{exp_profit:,.0f}"

    lines.append(f"| **Net Profit** | {best_profit_str} | {base_profit_str} | "
                 f"{worst_profit_str} | {exp_profit_str} |")

    lines.append(f"| **Margin** | {best_case.profit_margin:.1f}% | "
                 f"{base_case.profit_margin:.1f}% | {worst_case.profit_margin:.1f}% | "
                 f"{exp_margin:.1f}% |")

    lines.append(f"| **ROI** | {best_case.roi:.1f}% | "
                 f"{base_case.roi:.1f}% | {worst_case.roi:.1f}% | - |")

    return "\n".join(lines)


def _create_probability_chart(
    best_case: ScenarioProjection,
    base_case: ScenarioProjection,
    worst_case: ScenarioProjection
) -> str:
    """Erstellt ASCII Chart für Profit-Verteilung"""

    lines = []
    lines.append("```")
    lines.append("Profit Distribution")
    lines.append("")

    # Skalierung
    max_profit = max(best_case.net_profit, base_case.net_profit, abs(worst_case.net_profit))

    scenarios = [
        ("Worst", worst_case.net_profit, worst_case.probability),
        ("Base ", base_case.net_profit, base_case.probability),
        ("Best ", best_case.net_profit, best_case.probability)
    ]

    for name, profit, prob in scenarios:
        bar_length = int((abs(profit) / max_profit) * 40) if max_profit > 0 else 0
        bar = "█" * bar_length

        sign = "+" if profit >= 0 else "-"
        lines.append(f"{name} ({prob*100:>3.0f}%) │{bar} {sign}€{abs(profit):,.0f}")

    lines.append("         └" + "─" * 45)
    lines.append(f"          0{'':>20}€{max_profit:,.0f}")
    lines.append("```")

    return "\n".join(lines)


def _calculate_sensitivity_impact(
    assumptions: List[KeyAssumption],
    base_case: ScenarioProjection
) -> str:
    """Berechnet und formatiert Sensitivity Impact der Assumptions"""

    lines = []
    lines.append("Zeigt wie stark jede Annahme das Ergebnis beeinflusst:")
    lines.append("")

    for assumption in assumptions:
        # Berechne Delta zwischen Best und Worst
        delta = abs(assumption.best_case - assumption.worst_case)

        if assumption.unit == "%":
            impact_desc = f"±{delta/2:.1f} Prozentpunkte"
        else:
            impact_desc = f"±€{delta/2:,.0f}"

        icon = "🔴" if assumption.impact_level == "High" else "🟡" if assumption.impact_level == "Medium" else "🟢"

        lines.append(f"- {icon} **{assumption.name}**: {impact_desc} Schwankung → {assumption.impact_level} Impact")

    return "\n".join(lines)


def get_scenario_planning_tool_definition() -> dict:
    """
    Gibt Tool-Definition für Claude Agent SDK zurück
    """
    return {
        "name": "create_scenario_plan",
        "description": """Erstellt strategische Szenario-Planung mit Best/Base/Worst Case Analysis.

Nutze dieses Tool für:
- Strategische Zukunftsplanung (1-3 Jahre)
- Best/Worst/Base Case Financial Modeling
- Risk Assessment & Contingency Planning
- "Was passiert wenn X eintritt?"
- Investment Decision Support
- Budgetplanung mit Unsicherheit

Das Tool erstellt probability-weighted Projektionen mit Sensitivity Analysis.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "planning_horizon": {
                    "type": "string",
                    "description": "Planungshorizont (z.B. '2025' oder 'Q1-Q4 2025')"
                },
                "base_revenue": {
                    "type": "number",
                    "description": "Ausgangsumsatz in Euro"
                },
                "base_costs": {
                    "type": "number",
                    "description": "Ausgangskosten in Euro"
                },
                "assumptions": {
                    "type": "array",
                    "description": "Liste von KeyAssumptions",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "best_case": {"type": "number"},
                            "base_case": {"type": "number"},
                            "worst_case": {"type": "number"},
                            "unit": {"type": "string"},
                            "impact_level": {"type": "string"}
                        },
                        "required": ["name", "best_case", "base_case", "worst_case", "unit"]
                    }
                },
                "probabilities": {
                    "type": "object",
                    "description": "Optional: Custom probabilities für Szenarien",
                    "properties": {
                        "best_case": {"type": "number"},
                        "base_case": {"type": "number"},
                        "worst_case": {"type": "number"}
                    }
                }
            },
            "required": ["planning_horizon", "base_revenue", "base_costs", "assumptions"]
        }
    }


# Für Testing
if __name__ == "__main__":
    print("Scenario Planning Tool v1.0.0")
    print("Verwende test_scenario_planning.py für Tests")
