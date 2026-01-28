"""
Scenario Planning Tool - Strategic Financial Modeling
======================================================

Multi-Scenario Financial Planning mit Best/Base/Worst Case Analysis.

Features:
- Best/Base/Worst Case Financial Projections
- Probability-Weighted Expected Values
- Key Assumptions Tracking mit Impact Analysis
- Sensitivity Analysis über multiple Variablen
- Risk-Adjusted Projections
- Decision Support mit Confidence Intervals
"""

from dataclasses import dataclass, asdict
from typing import Any, Optional, List, Dict
from enum import Enum
import json


class ScenarioType(Enum):
    """Szenario-Typen"""
    BEST_CASE = "best_case"
    BASE_CASE = "base_case"
    WORST_CASE = "worst_case"
    CUSTOM = "custom"


@dataclass
class KeyAssumption:
    """Schlüssel-Annahme für Szenario"""
    name: str  # "Revenue Growth", "Cost Inflation"
    best_case: float  # Optimistischer Wert
    base_case: float  # Realistischer Wert
    worst_case: float  # Pessimistischer Wert
    unit: str  # "%" oder "€" oder "units"
    impact_level: str  # "High", "Medium", "Low"

    def validate(self) -> tuple[bool, str]:
        """Validiert Annahmen-Logik"""
        if self.unit == "%":
            # Bei Prozenten: Prüfe auf sinnvolle Werte
            if abs(self.best_case) > 500 or abs(self.base_case) > 500 or abs(self.worst_case) > 500:
                return False, f"{self.name}: Prozent-Werte über 500% sind unrealistisch"

        if self.impact_level not in ["High", "Medium", "Low"]:
            return False, f"{self.name}: Impact Level muss 'High', 'Medium' oder 'Low' sein"

        return True, ""


@dataclass
class ScenarioProjection:
    """Finanzielle Projektion für ein Szenario"""
    scenario_type: ScenarioType
    scenario_name: str  # "Best Case 2025"
    probability: float  # 0.0 - 1.0 (z.B. 0.25 = 25%)

    # Financial Projections
    revenue: float
    costs: float
    operating_profit: float
    net_profit: float
    cash_flow: float

    # Key Metrics
    profit_margin: float  # Net Profit / Revenue
    roi: float  # Return on Investment
    break_even_months: Optional[float]  # Monate bis Break-Even

    # Assumptions Applied
    assumptions_used: Dict[str, float]  # {"revenue_growth": 0.15, ...}


@dataclass
class ScenarioPlanningResult:
    """Vollständige Szenario-Analyse"""

    # Base Information
    planning_horizon: str  # "2025", "Q1-Q4 2025"
    base_revenue: float  # Ausgangsumsatz
    base_costs: float  # Ausgangskosten

    # Key Assumptions
    assumptions: List[KeyAssumption]  # Liste aller Annahmen

    # Scenarios
    best_case: ScenarioProjection
    base_case: ScenarioProjection
    worst_case: ScenarioProjection
    custom_scenarios: List[ScenarioProjection]  # Optional weitere Szenarien

    # Probability-Weighted Analysis
    expected_revenue: float  # Probability-weighted
    expected_profit: float  # Probability-weighted
    expected_cash_flow: float  # Probability-weighted

    # Risk Metrics
    revenue_range: tuple[float, float]  # (Worst, Best)
    profit_range: tuple[float, float]  # (Worst, Best)
    downside_risk: float  # Base - Worst (€)
    upside_potential: float  # Best - Base (€)
    risk_reward_ratio: float  # Upside / Downside

    # Decision Support
    recommended_scenario: str  # "Prepare for Base Case, Plan for Best"
    confidence_level: str  # "High", "Moderate", "Low"
    strategic_recommendation: str

    warnings: List[str]


def create_scenario_plan(
    planning_horizon: str,  # "2025" oder "Q1-Q4 2025"
    base_revenue: float,  # Aktueller/erwarteter Umsatz
    base_costs: float,  # Aktuelle/erwartete Kosten
    assumptions: List[Dict[str, Any]],  # Liste von KeyAssumptions als Dicts
    probabilities: Dict[str, float] = None  # Optional: Custom probabilities
) -> Dict[str, Any]:
    """
    Erstellt Multi-Scenario Financial Planning.

    Default Probabilities:
    - Best Case: 20%
    - Base Case: 60%
    - Worst Case: 20%

    Args:
        planning_horizon: Zeitraum der Planung (z.B. "2025" oder "Q1-Q4 2025")
        base_revenue: Ausgangsumsatz (€)
        base_costs: Ausgangskosten (€)
        assumptions: Liste von Annahmen als Dicts
        probabilities: Optional custom probabilities für Szenarien

    Returns:
        Dict mit result und formatted_output
    """

    # 1. Input validieren
    if not assumptions or len(assumptions) == 0:
        return {
            "error": "Mindestens eine Annahme erforderlich",
            "formatted_output": "❌ **Fehler:** Keine Annahmen definiert"
        }

    if base_revenue <= 0 or base_costs <= 0:
        return {
            "error": "Revenue und Costs müssen positiv sein",
            "formatted_output": "❌ **Fehler:** Ungültige Revenue oder Costs"
        }

    # 2. KeyAssumptions erstellen
    key_assumptions = []
    for assumption_data in assumptions:
        try:
            assumption = KeyAssumption(**assumption_data)
            is_valid, error = assumption.validate()
            if not is_valid:
                return {
                    "error": f"Ungültige Annahme: {error}",
                    "formatted_output": f"❌ **Fehler:** {error}"
                }
            key_assumptions.append(assumption)
        except Exception as e:
            return {
                "error": f"Fehler beim Parsen der Annahme: {str(e)}",
                "formatted_output": f"❌ **Fehler:** Ungültiges Annahmen-Format"
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
            "formatted_output": f"❌ **Fehler:** Probabilities = {prob_sum*100:.1f}%"
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
    base_case = _calculate_scenario(
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
        base_case.revenue * base_case.probability +
        worst_case.revenue * worst_case.probability
    )

    expected_profit = (
        best_case.net_profit * best_case.probability +
        base_case.net_profit * base_case.probability +
        worst_case.net_profit * worst_case.probability
    )

    expected_cash_flow = (
        best_case.cash_flow * best_case.probability +
        base_case.cash_flow * base_case.probability +
        worst_case.cash_flow * worst_case.probability
    )

    # 6. Risk Metrics
    revenue_range = (worst_case.revenue, best_case.revenue)
    profit_range = (worst_case.net_profit, best_case.net_profit)

    downside_risk = base_case.net_profit - worst_case.net_profit
    upside_potential = best_case.net_profit - base_case.net_profit

    risk_reward_ratio = (upside_potential / downside_risk) if downside_risk > 0 else float('inf')

    # 7. Confidence Level
    # Basierend auf Spread zwischen Best und Worst
    profit_spread_percent = abs((best_case.net_profit - worst_case.net_profit) / base_case.net_profit * 100) if base_case.net_profit != 0 else 0

    if profit_spread_percent < 30:
        confidence_level = "High"  # Geringe Unsicherheit
    elif profit_spread_percent < 70:
        confidence_level = "Moderate"  # Moderate Unsicherheit
    else:
        confidence_level = "Low"  # Hohe Unsicherheit

    # 8. Strategic Recommendation
    recommendation = _generate_scenario_recommendation(
        best_case, base_case, worst_case,
        risk_reward_ratio, confidence_level
    )

    # 9. Recommended Scenario
    # Empfehlung welches Szenario als Planungsgrundlage dienen sollte
    if risk_reward_ratio > 2.0 and worst_case.net_profit > 0:
        recommended = "Prepare for Base Case, Plan for Best Case"
    elif worst_case.net_profit < 0:
        recommended = "Prepare for Worst Case, Hope for Base Case"
    else:
        recommended = "Prepare for Base Case, Monitor for Worst Case"

    # 10. Warnungen
    warnings = _check_scenario_warnings(
        best_case, base_case, worst_case,
        downside_risk, confidence_level
    )

    # 11. Result Object
    result = ScenarioPlanningResult(
        planning_horizon=planning_horizon,
        base_revenue=base_revenue,
        base_costs=base_costs,
        assumptions=key_assumptions,
        best_case=best_case,
        base_case=base_case,
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
        recommended_scenario=recommended,
        confidence_level=confidence_level,
        strategic_recommendation=recommendation,
        warnings=warnings
    )

    # 12. Output formatieren
    markdown_output = _format_scenario_planning_output(result)

    return {
        "result": result,
        "formatted_output": markdown_output
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
    use_values: str  # "best_case", "base_case", "worst_case"
) -> ScenarioProjection:
    """
    Berechnet finanzielle Projektion für ein Szenario.

    Wendet alle Assumptions an und berechnet Metriken.
    """
    # Annahmen anwenden
    assumptions_used = {}

    revenue = base_revenue
    costs = base_costs

    for assumption in assumptions:
        if use_values == "best_case":
            value = assumption.best_case
        elif use_values == "base_case":
            value = assumption.base_case
        else:  # worst_case
            value = assumption.worst_case

        assumptions_used[assumption.name] = value

        # Annahmen anwenden (vereinfachte Logik - in Realität komplexer)
        if "revenue" in assumption.name.lower() or "growth" in assumption.name.lower():
            if assumption.unit == "%":
                revenue *= (1 + value / 100)
            else:
                revenue += value

        if "cost" in assumption.name.lower() or "inflation" in assumption.name.lower():
            if assumption.unit == "%":
                costs *= (1 + value / 100)
            else:
                costs += value

    # Metriken berechnen
    operating_profit = revenue - costs
    # Vereinfachung: 25% Tax Rate
    net_profit = operating_profit * 0.75
    cash_flow = net_profit  # Vereinfachung

    profit_margin = (net_profit / revenue * 100) if revenue > 0 else 0
    roi = (net_profit / costs * 100) if costs > 0 else 0

    # Break-Even Months (vereinfachte Berechnung)
    monthly_profit = net_profit / 12
    break_even_months = abs(costs / monthly_profit) if monthly_profit > 0 else None

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
        break_even_months=break_even_months,
        assumptions_used=assumptions_used
    )


def _generate_scenario_recommendation(
    best_case: ScenarioProjection,
    base_case: ScenarioProjection,
    worst_case: ScenarioProjection,
    risk_reward_ratio: float,
    confidence_level: str
) -> str:
    """Generiert strategische Empfehlungen basierend auf Szenarien"""

    recommendations = []

    # Profit Analysis
    if worst_case.net_profit < 0:
        recommendations.append("⚠️ **Risiko:** Worst Case zeigt Verlust. Entwickle Contingency Plan.")

    if base_case.net_profit > 0 and best_case.net_profit > base_case.net_profit * 2:
        recommendations.append("🚀 **Chance:** Signifikantes Upside-Potenzial identifiziert.")

    # Risk-Reward Analysis
    if risk_reward_ratio > 3.0:
        recommendations.append(f"✅ **Attraktiv:** Hervorragendes Risk-Reward Verhältnis ({risk_reward_ratio:.1f}:1).")
    elif risk_reward_ratio < 1.0:
        recommendations.append(f"⚠️ **Vorsicht:** Ungünstiges Risk-Reward Verhältnis ({risk_reward_ratio:.1f}:1).")

    # Confidence Level
    if confidence_level == "Low":
        recommendations.append("📊 **Unsicherheit:** Geringe Confidence - mehr Daten sammeln oder Szenarien verfeinern.")
    elif confidence_level == "High":
        recommendations.append("✅ **Zuverlässig:** Hohe Confidence in Projektionen.")

    # ROI Analysis
    avg_roi = (best_case.roi + base_case.roi + worst_case.roi) / 3
    if avg_roi > 50:
        recommendations.append(f"💰 **Profitabel:** Durchschnittlicher ROI von {avg_roi:.1f}% sehr attraktiv.")
    elif avg_roi < 20:
        recommendations.append(f"⚠️ **Niedrig:** Durchschnittlicher ROI von {avg_roi:.1f}% könnte zu niedrig sein.")

    # Margin Analysis
    if base_case.profit_margin < 10:
        recommendations.append(f"⚠️ **Dünne Marge:** Profit Margin von {base_case.profit_margin:.1f}% lässt wenig Spielraum.")

    return "\n".join(recommendations) if recommendations else "✅ Solide finanzielle Planung mit ausgewogenem Risiko-Profil."


def _check_scenario_warnings(
    best_case: ScenarioProjection,
    base_case: ScenarioProjection,
    worst_case: ScenarioProjection,
    downside_risk: float,
    confidence_level: str
) -> List[str]:
    """Prüft Szenarien auf kritische Warnungen"""

    warnings = []

    # Worst Case Loss
    if worst_case.net_profit < 0:
        warnings.append(f"⚠️ Worst Case zeigt Verlust von €{abs(worst_case.net_profit):,.0f}")

    # High Downside Risk
    if downside_risk > base_case.net_profit * 0.5:
        warnings.append(f"⚠️ Hohes Downside-Risiko: €{downside_risk:,.0f} (>50% von Base Case)")

    # Low Confidence
    if confidence_level == "Low":
        warnings.append("⚠️ Geringe Confidence - Projektionen stark unsicher")

    # Negative Cash Flow
    if worst_case.cash_flow < 0:
        warnings.append("⚠️ Negativer Cash Flow im Worst Case möglich")

    # Low Margins
    if worst_case.profit_margin < 5:
        warnings.append(f"⚠️ Sehr dünne Profit Margin im Worst Case ({worst_case.profit_margin:.1f}%)")

    # Extreme Spread
    profit_spread = best_case.net_profit - worst_case.net_profit
    if profit_spread > base_case.net_profit * 2:
        warnings.append("⚠️ Sehr große Spread zwischen Best und Worst Case - hohe Unsicherheit")

    return warnings


def _format_scenario_planning_output(result: ScenarioPlanningResult) -> str:
    """Formatiert Scenario Planning Result als Markdown"""

    output = []

    # Header
    output.append(f"# 🎯 Szenario-Planung: {result.planning_horizon}")
    output.append("")

    # Executive Summary
    output.append("## Executive Summary")
    output.append("")
    output.append(f"**Basis:** Revenue €{result.base_revenue:,.0f} | Costs €{result.base_costs:,.0f}")
    output.append("")
    output.append(f"**Expected Values (Probability-Weighted):**")
    output.append(f"- Revenue: €{result.expected_revenue:,.0f}")
    output.append(f"- Profit: €{result.expected_profit:,.0f}")
    output.append(f"- Cash Flow: €{result.expected_cash_flow:,.0f}")
    output.append("")
    output.append(f"**Risk Profile:**")
    output.append(f"- Risk-Reward Ratio: {result.risk_reward_ratio:.2f}:1")
    output.append(f"- Confidence Level: {result.confidence_level}")
    output.append(f"- Empfehlung: {result.recommended_scenario}")
    output.append("")

    # Key Assumptions
    output.append("## 📋 Schlüssel-Annahmen")
    output.append("")
    output.append(_format_assumptions_table(result.assumptions))
    output.append("")

    # Scenario Comparison
    output.append("## 📊 Szenario-Vergleich")
    output.append("")
    output.append(_create_scenario_comparison_table(result.best_case, result.base_case, result.worst_case))
    output.append("")

    # Visualization
    output.append("## 📈 Visualisierung")
    output.append("")
    output.append(_create_probability_chart(result.best_case, result.base_case, result.worst_case))
    output.append("")

    # Risk Assessment
    output.append("## 📉 Risk Assessment")
    output.append("")
    output.append("| Metrik | Wert |")
    output.append("|--------|------|")
    output.append(f"| Revenue Range | €{result.revenue_range[0]:,.0f} - €{result.revenue_range[1]:,.0f} |")
    output.append(f"| Profit Range | €{result.profit_range[0]:,.0f} - €{result.profit_range[1]:,.0f} |")
    output.append(f"| Downside Risk | €{result.downside_risk:,.0f} |")
    output.append(f"| Upside Potential | €{result.upside_potential:,.0f} |")
    output.append(f"| Risk-Reward Ratio | {result.risk_reward_ratio:.2f}:1 |")
    output.append(f"| Confidence Level | {result.confidence_level} |")
    output.append("")

    # Strategic Recommendation
    output.append("## 🎯 Strategic Recommendation")
    output.append("")
    output.append(f"**Empfohlene Planungsgrundlage:** {result.recommended_scenario}")
    output.append("")
    output.append(result.strategic_recommendation)
    output.append("")

    # Warnings
    if result.warnings:
        output.append("## ⚠️ Wichtige Hinweise")
        output.append("")
        for warning in result.warnings:
            output.append(f"- {warning}")
        output.append("")

    # Sensitivity Analysis
    output.append("## 🔍 Sensitivity Analysis")
    output.append("")
    output.append(_calculate_sensitivity_impact(result.assumptions, result.base_case))
    output.append("")

    # Raw Data
    output.append("## 📄 Raw Data")
    output.append("")
    output.append("```json")

    # Convert result to dict (simplified)
    raw_data = {
        "planning_horizon": result.planning_horizon,
        "base_revenue": result.base_revenue,
        "base_costs": result.base_costs,
        "scenarios": {
            "best": {
                "revenue": result.best_case.revenue,
                "costs": result.best_case.costs,
                "net_profit": result.best_case.net_profit,
                "roi": result.best_case.roi,
                "probability": result.best_case.probability
            },
            "base": {
                "revenue": result.base_case.revenue,
                "costs": result.base_case.costs,
                "net_profit": result.base_case.net_profit,
                "roi": result.base_case.roi,
                "probability": result.base_case.probability
            },
            "worst": {
                "revenue": result.worst_case.revenue,
                "costs": result.worst_case.costs,
                "net_profit": result.worst_case.net_profit,
                "roi": result.worst_case.roi,
                "probability": result.worst_case.probability
            }
        },
        "expected_values": {
            "revenue": result.expected_revenue,
            "profit": result.expected_profit,
            "cash_flow": result.expected_cash_flow
        },
        "risk_metrics": {
            "downside_risk": result.downside_risk,
            "upside_potential": result.upside_potential,
            "risk_reward_ratio": result.risk_reward_ratio,
            "confidence_level": result.confidence_level
        }
    }

    output.append(json.dumps(raw_data, indent=2))
    output.append("```")

    return "\n".join(output)


def _format_assumptions_table(assumptions: List[KeyAssumption]) -> str:
    """Formatiert Assumptions als Tabelle"""

    lines = []
    lines.append("| Annahme | Best Case | Base Case | Worst Case | Impact |")
    lines.append("|---------|-----------|-----------|------------|--------|")

    for assumption in assumptions:
        best = f"{assumption.best_case:+.1f}{assumption.unit}"
        base = f"{assumption.base_case:+.1f}{assumption.unit}"
        worst = f"{assumption.worst_case:+.1f}{assumption.unit}"
        impact = assumption.impact_level

        lines.append(f"| {assumption.name} | {best} | {base} | {worst} | {impact} |")

    return "\n".join(lines)


def _create_scenario_comparison_table(
    best_case: ScenarioProjection,
    base_case: ScenarioProjection,
    worst_case: ScenarioProjection
) -> str:
    """Erstellt Vergleichstabelle der Szenarien"""

    lines = []
    lines.append("| Kennzahl | Best Case (20%) | Base Case (60%) | Worst Case (20%) |")
    lines.append("|----------|-----------------|-----------------|------------------|")
    lines.append(f"| Revenue | €{best_case.revenue:,.0f} | €{base_case.revenue:,.0f} | €{worst_case.revenue:,.0f} |")
    lines.append(f"| Costs | €{best_case.costs:,.0f} | €{base_case.costs:,.0f} | €{worst_case.costs:,.0f} |")
    lines.append(f"| Operating Profit | €{best_case.operating_profit:,.0f} | €{base_case.operating_profit:,.0f} | €{worst_case.operating_profit:,.0f} |")
    lines.append(f"| Net Profit | €{best_case.net_profit:,.0f} | €{base_case.net_profit:,.0f} | €{worst_case.net_profit:,.0f} |")
    lines.append(f"| Profit Margin | {best_case.profit_margin:.1f}% | {base_case.profit_margin:.1f}% | {worst_case.profit_margin:.1f}% |")
    lines.append(f"| ROI | {best_case.roi:.1f}% | {base_case.roi:.1f}% | {worst_case.roi:.1f}% |")

    return "\n".join(lines)


def _create_probability_chart(
    best_case: ScenarioProjection,
    base_case: ScenarioProjection,
    worst_case: ScenarioProjection
) -> str:
    """Erstellt ASCII Chart für Profit über Szenarien"""

    scenarios = [worst_case, base_case, best_case]
    max_profit = max(s.net_profit for s in scenarios)
    min_profit = min(s.net_profit for s in scenarios)

    lines = []
    lines.append("```")
    lines.append("Profit Range Over Scenarios:")
    lines.append("")

    # Chart bars
    for scenario in scenarios:
        profit = scenario.net_profit
        prob = scenario.probability

        # Calculate bar length (max 50 chars)
        if max_profit - min_profit != 0:
            bar_length = int(50 * (profit - min_profit) / (max_profit - min_profit))
        else:
            bar_length = 25

        bar = "█" * bar_length

        lines.append(f"{scenario.scenario_name:12} | {bar} €{profit:,.0f} ({prob*100:.0f}%)")

    lines.append("```")

    return "\n".join(lines)


def _calculate_sensitivity_impact(
    assumptions: List[KeyAssumption],
    base_case: ScenarioProjection
) -> str:
    """Berechnet Sensitivity Impact für jede Assumption"""

    lines = []
    lines.append("**Impact der Annahmen auf Net Profit:**")
    lines.append("")

    # Sort by impact level
    high_impact = [a for a in assumptions if a.impact_level == "High"]
    medium_impact = [a for a in assumptions if a.impact_level == "Medium"]
    low_impact = [a for a in assumptions if a.impact_level == "Low"]

    for impact_level, assumptions_list in [("High", high_impact), ("Medium", medium_impact), ("Low", low_impact)]:
        if assumptions_list:
            lines.append(f"**{impact_level} Impact:**")
            for assumption in assumptions_list:
                # Berechne Spread
                if assumption.unit == "%":
                    spread = assumption.best_case - assumption.worst_case
                    lines.append(f"- {assumption.name}: {spread:.1f} percentage points Spread")
                else:
                    spread = assumption.best_case - assumption.worst_case
                    lines.append(f"- {assumption.name}: €{abs(spread):,.0f} Spread")
            lines.append("")

    return "\n".join(lines)


# ============================================================================
# MAIN EXECUTION (für Testing)
# ============================================================================

if __name__ == "__main__":
    # Test Case: Product Launch
    print("=" * 80)
    print("TEST: Product Launch Scenario")
    print("=" * 80)

    result = create_scenario_plan(
        planning_horizon="2025",
        base_revenue=500000,
        base_costs=300000,
        assumptions=[
            {
                "name": "Revenue Growth",
                "best_case": 25.0,
                "base_case": 15.0,
                "worst_case": 5.0,
                "unit": "%",
                "impact_level": "High"
            },
            {
                "name": "Cost Inflation",
                "best_case": 2.0,
                "base_case": 5.0,
                "worst_case": 10.0,
                "unit": "%",
                "impact_level": "Medium"
            },
            {
                "name": "Market Penetration",
                "best_case": 8.0,
                "base_case": 5.0,
                "worst_case": 2.0,
                "unit": "%",
                "impact_level": "High"
            }
        ]
    )

    if "error" in result:
        print(f"ERROR: {result['error']}")
    else:
        print(result["formatted_output"])
