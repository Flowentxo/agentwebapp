"""
Break-Even Analysis Tool für Dexter Agent

Berechnet Break-Even Point, Margin of Safety, Target Profit Analysis
und Scenario Analysis für strategische Geschäftsentscheidungen.

Features:
- Break-Even Point (Units & Revenue)
- Contribution Margin & Ratio
- Margin of Safety Analysis
- Target Profit Calculation
- Multi-Scenario Sensitivity Analysis
- Business Viability Score (0-100)
- Risk Assessment & Pricing Power Evaluation

Author: Dexter Agent Development Team
Version: 1.0.0
"""

from dataclasses import dataclass
from typing import Any, Optional, Dict, List
import asyncio


# ============================================================================
# DATACLASSES
# ============================================================================

@dataclass
class BreakEvenInput:
    """Input-Daten für Break-Even Analyse"""
    fixed_costs: float  # Fixkosten pro Periode
    variable_cost_per_unit: float  # Variable Stückkosten
    selling_price_per_unit: float  # Verkaufspreis pro Einheit
    current_sales_units: Optional[int] = None  # Aktuelle Verkaufsmenge
    target_profit: Optional[float] = None  # Gewinnziel

    def validate(self) -> tuple[bool, str]:
        """Validiert Input-Daten"""
        if self.fixed_costs < 0:
            return False, "Fixkosten können nicht negativ sein"
        if self.variable_cost_per_unit < 0:
            return False, "Variable Kosten können nicht negativ sein"
        if self.selling_price_per_unit <= 0:
            return False, "Verkaufspreis muss positiv sein"
        if self.selling_price_per_unit <= self.variable_cost_per_unit:
            return False, "Verkaufspreis muss höher als variable Kosten sein (sonst unmöglich profitabel)"
        if self.current_sales_units is not None and self.current_sales_units < 0:
            return False, "Aktuelle Verkaufsmenge kann nicht negativ sein"
        if self.target_profit is not None and self.target_profit < 0:
            return False, "Gewinnziel kann nicht negativ sein"
        return True, ""


@dataclass
class ScenarioAnalysis:
    """Ein Szenario für Sensitivity Analysis"""
    name: str  # z.B. "Preis +10%"
    break_even_units: float
    break_even_revenue: float
    change_percent: float  # Änderung vs. Base Case


@dataclass
class BreakEvenResult:
    """Vollständige Break-Even Analyse Ergebnisse"""

    # Input Summary
    fixed_costs: float
    variable_cost_per_unit: float
    selling_price_per_unit: float
    current_sales_units: Optional[int]

    # Core Break-Even Metrics
    contribution_margin: float  # Deckungsbeitrag pro Einheit
    contribution_margin_ratio: float  # Deckungsbeitragsquote (%)
    break_even_units: float  # Break-Even Menge (Stück)
    break_even_revenue: float  # Break-Even Umsatz (€)

    # Margin of Safety (wenn current_sales gegeben)
    margin_of_safety_units: Optional[float]  # Sicherheitsmarge in Stück
    margin_of_safety_revenue: Optional[float]  # Sicherheitsmarge in €
    margin_of_safety_percent: Optional[float]  # Sicherheitsmarge in %

    # Target Profit Analysis (wenn target_profit gegeben)
    target_profit: Optional[float]  # Gewinnziel
    target_profit_units: Optional[float]  # Benötigte Menge für Zielgewinn
    target_profit_revenue: Optional[float]  # Benötigter Umsatz für Zielgewinn

    # Scenario Analysis
    scenarios: List[ScenarioAnalysis]

    # Analysis & Assessment
    business_viability_score: int  # Score 0-100
    risk_level: str  # "Low", "Moderate", "High", "Critical"
    pricing_power: str  # "Strong", "Moderate", "Weak"

    recommendation: str
    warnings: List[str]


# ============================================================================
# MAIN FUNCTION
# ============================================================================

async def analyze_break_even(
    fixed_costs: float,
    variable_cost_per_unit: float,
    selling_price_per_unit: float,
    current_sales_units: Optional[int] = None,
    target_profit: Optional[float] = None
) -> Dict[str, Any]:
    """
    Führt vollständige Break-Even Analyse durch.

    Args:
        fixed_costs: Fixkosten pro Periode (z.B. Miete, Gehälter)
        variable_cost_per_unit: Variable Kosten pro Einheit
        selling_price_per_unit: Verkaufspreis pro Einheit
        current_sales_units: Optional - Aktuelle Verkaufsmenge (für MoS)
        target_profit: Optional - Gewinnziel (für Target Profit Analysis)

    Returns:
        Dict mit BreakEvenResult und formatted_output

    Formeln:
        - Contribution Margin = Selling Price - Variable Cost
        - CM Ratio = (CM / Selling Price) * 100
        - Break-Even Units = Fixed Costs / CM
        - Break-Even Revenue = BE Units * Selling Price
        - Margin of Safety = Current Sales - BE Units
        - Target Profit Units = (Fixed Costs + Target Profit) / CM
    """

    # 1. Input validieren
    input_data = BreakEvenInput(
        fixed_costs=fixed_costs,
        variable_cost_per_unit=variable_cost_per_unit,
        selling_price_per_unit=selling_price_per_unit,
        current_sales_units=current_sales_units,
        target_profit=target_profit
    )

    is_valid, error_msg = input_data.validate()
    if not is_valid:
        return {
            "error": error_msg,
            "formatted_output": f"❌ **Validierungsfehler:** {error_msg}"
        }

    # 2. Contribution Margin berechnen
    contribution_margin = selling_price_per_unit - variable_cost_per_unit
    contribution_margin_ratio = (contribution_margin / selling_price_per_unit) * 100

    # 3. Break-Even Point berechnen
    break_even_units = fixed_costs / contribution_margin
    break_even_revenue = break_even_units * selling_price_per_unit

    # 4. Margin of Safety (wenn current_sales gegeben)
    margin_of_safety_units = None
    margin_of_safety_revenue = None
    margin_of_safety_percent = None

    if current_sales_units is not None:
        margin_of_safety_units = current_sales_units - break_even_units
        margin_of_safety_revenue = margin_of_safety_units * selling_price_per_unit
        margin_of_safety_percent = (
            (margin_of_safety_units / current_sales_units) * 100
            if current_sales_units > 0 else 0
        )

    # 5. Target Profit Analysis (wenn target_profit gegeben)
    target_profit_units = None
    target_profit_revenue = None

    if target_profit is not None:
        target_profit_units = (fixed_costs + target_profit) / contribution_margin
        target_profit_revenue = target_profit_units * selling_price_per_unit

    # 6. Scenario Analysis
    scenarios = []

    # Szenario 1: Preis +10%
    scenarios.append(_calculate_scenario(
        "Preis +10%",
        fixed_costs,
        variable_cost_per_unit,
        selling_price_per_unit * 1.10,
        break_even_units
    ))

    # Szenario 2: Preis -10%
    scenarios.append(_calculate_scenario(
        "Preis -10%",
        fixed_costs,
        variable_cost_per_unit,
        selling_price_per_unit * 0.90,
        break_even_units
    ))

    # Szenario 3: Variable Kosten -10%
    scenarios.append(_calculate_scenario(
        "Variable Kosten -10%",
        fixed_costs,
        variable_cost_per_unit * 0.90,
        selling_price_per_unit,
        break_even_units
    ))

    # Szenario 4: Variable Kosten +10%
    scenarios.append(_calculate_scenario(
        "Variable Kosten +10%",
        fixed_costs,
        variable_cost_per_unit * 1.10,
        selling_price_per_unit,
        break_even_units
    ))

    # Szenario 5: Fixkosten +20%
    scenarios.append(_calculate_scenario(
        "Fixkosten +20%",
        fixed_costs * 1.20,
        variable_cost_per_unit,
        selling_price_per_unit,
        break_even_units
    ))

    # Szenario 6: Fixkosten -20%
    scenarios.append(_calculate_scenario(
        "Fixkosten -20%",
        fixed_costs * 0.80,
        variable_cost_per_unit,
        selling_price_per_unit,
        break_even_units
    ))

    # 7. Business Viability Score (0-100)
    viability_score = _calculate_viability_score(
        contribution_margin_ratio,
        margin_of_safety_percent,
        break_even_units,
        current_sales_units
    )

    # 8. Risk Level Assessment
    risk_level = _assess_risk_level(margin_of_safety_percent, contribution_margin_ratio)

    # 9. Pricing Power Evaluation
    pricing_power = _assess_pricing_power(contribution_margin_ratio)

    # 10. Warnungen prüfen
    warnings = _check_break_even_warnings(
        break_even_units,
        margin_of_safety_percent,
        contribution_margin_ratio,
        current_sales_units
    )

    # 11. Empfehlungen generieren
    recommendation = _generate_break_even_recommendation(
        viability_score,
        risk_level,
        pricing_power,
        margin_of_safety_percent,
        contribution_margin_ratio
    )

    # 12. Result Object
    result = BreakEvenResult(
        fixed_costs=fixed_costs,
        variable_cost_per_unit=variable_cost_per_unit,
        selling_price_per_unit=selling_price_per_unit,
        current_sales_units=current_sales_units,
        contribution_margin=contribution_margin,
        contribution_margin_ratio=contribution_margin_ratio,
        break_even_units=break_even_units,
        break_even_revenue=break_even_revenue,
        margin_of_safety_units=margin_of_safety_units,
        margin_of_safety_revenue=margin_of_safety_revenue,
        margin_of_safety_percent=margin_of_safety_percent,
        target_profit=target_profit,
        target_profit_units=target_profit_units,
        target_profit_revenue=target_profit_revenue,
        scenarios=scenarios,
        business_viability_score=viability_score,
        risk_level=risk_level,
        pricing_power=pricing_power,
        recommendation=recommendation,
        warnings=warnings
    )

    # 13. Formatted Output
    formatted_output = _format_break_even_output(result)

    return {
        "result": result.__dict__,
        "formatted_output": formatted_output
    }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _calculate_scenario(
    name: str,
    fixed_costs: float,
    variable_cost: float,
    selling_price: float,
    base_break_even: float
) -> ScenarioAnalysis:
    """Berechnet ein Was-wäre-wenn Szenario"""
    cm = selling_price - variable_cost

    if cm <= 0:
        # Unmögliches Szenario (Preis <= Variable Kosten)
        return ScenarioAnalysis(
            name=name,
            break_even_units=float('inf'),
            break_even_revenue=float('inf'),
            change_percent=float('inf')
        )

    be_units = fixed_costs / cm
    be_revenue = be_units * selling_price
    change = ((be_units - base_break_even) / base_break_even) * 100 if base_break_even > 0 else 0

    return ScenarioAnalysis(
        name=name,
        break_even_units=be_units,
        break_even_revenue=be_revenue,
        change_percent=change
    )


def _calculate_viability_score(
    cm_ratio: float,
    mos_percent: Optional[float],
    be_units: float,
    current_sales: Optional[int]
) -> int:
    """
    Berechnet Business Viability Score (0-100)

    Komponenten:
    - Contribution Margin Ratio (40 Punkte)
    - Margin of Safety (40 Punkte)
    - Break-Even Reachability (20 Punkte)
    """
    score = 0

    # 1. CM Ratio Component (0-40 Punkte)
    # > 60% = 40, > 40% = 30, > 20% = 20, sonst scaled
    if cm_ratio >= 60:
        score += 40
    elif cm_ratio >= 40:
        score += 30
    elif cm_ratio >= 20:
        score += 20
    else:
        score += int(cm_ratio / 60 * 40)

    # 2. Margin of Safety Component (0-40 Punkte)
    if mos_percent is not None:
        if mos_percent >= 50:
            score += 40
        elif mos_percent >= 30:
            score += 30
        elif mos_percent >= 10:
            score += 20
        elif mos_percent > 0:
            score += 10
        else:
            score += 0  # Unter Break-Even!
    else:
        # Fallback wenn keine current_sales gegeben (20 Punkte default)
        score += 20

    # 3. Break-Even Reachability (0-20 Punkte)
    if current_sales is not None:
        if current_sales >= be_units * 1.5:
            score += 20  # Weit über Break-Even
        elif current_sales >= be_units:
            score += 15  # Über Break-Even
        elif current_sales >= be_units * 0.8:
            score += 10  # Nahe Break-Even
        else:
            score += 5  # Weit unter Break-Even
    else:
        # Fallback: bewerte nach BE-Erreichbarkeit (10 Punkte default)
        if be_units < 1000:
            score += 20  # Niedrige BE-Schwelle
        elif be_units < 5000:
            score += 15
        else:
            score += 10

    return min(score, 100)


def _assess_risk_level(
    mos_percent: Optional[float],
    cm_ratio: float
) -> str:
    """Bewertet Risk Level basierend auf Margin of Safety"""
    if mos_percent is not None:
        if mos_percent > 40:
            return "Low"
        elif mos_percent > 20:
            return "Moderate"
        elif mos_percent > 0:
            return "High"
        else:
            return "Critical"  # Unter Break-Even!
    else:
        # Fallback wenn keine current_sales gegeben
        if cm_ratio > 50:
            return "Low"
        elif cm_ratio > 30:
            return "Moderate"
        else:
            return "High"


def _assess_pricing_power(cm_ratio: float) -> str:
    """Bewertet Pricing Power basierend auf CM Ratio"""
    if cm_ratio > 60:
        return "Strong"
    elif cm_ratio > 40:
        return "Moderate"
    else:
        return "Weak"


def _check_break_even_warnings(
    be_units: float,
    mos_percent: Optional[float],
    cm_ratio: float,
    current_sales: Optional[int]
) -> List[str]:
    """Prüft auf kritische Break-Even Situationen"""
    warnings = []

    # Warnung 1: Unter Break-Even
    if mos_percent is not None and mos_percent < 0:
        warnings.append(
            f"⚠️ KRITISCH: Aktuell {abs(mos_percent):.1f}% UNTER Break-Even! "
            f"Sofortmaßnahmen erforderlich."
        )

    # Warnung 2: Niedrige Margin of Safety
    if mos_percent is not None and 0 <= mos_percent < 10:
        warnings.append(
            f"⚠️ Sehr niedrige Sicherheitsmarge ({mos_percent:.1f}%). "
            f"Minimale Umsatzrückgänge führen zu Verlusten."
        )

    # Warnung 3: Schwache Contribution Margin
    if cm_ratio < 30:
        warnings.append(
            f"⚠️ Niedrige Deckungsbeitragsquote ({cm_ratio:.1f}%). "
            f"Wenig Spielraum für Fixkosten und Gewinn."
        )

    # Warnung 4: Hoher Break-Even Point
    if current_sales is not None and be_units > current_sales * 0.8:
        warnings.append(
            f"⚠️ Break-Even bei {be_units:.0f} Units liegt nahe aktuellen Verkäufen ({current_sales}). "
            f"Hohes operatives Risiko."
        )

    # Warnung 5: Sehr hoher Break-Even
    if be_units > 10000:
        warnings.append(
            f"⚠️ Sehr hoher Break-Even Point ({be_units:.0f} Units). "
            f"Prüfe Fixkosten-Reduktion oder Preisstrategie."
        )

    # Warnung 6: CM Ratio unter 20%
    if cm_ratio < 20:
        warnings.append(
            f"⚠️ KRITISCH: Deckungsbeitragsquote unter 20%. "
            f"Geschäftsmodell kaum nachhaltig profitabel."
        )

    return warnings


def _generate_break_even_recommendation(
    viability_score: int,
    risk_level: str,
    pricing_power: str,
    mos_percent: Optional[float],
    cm_ratio: float
) -> str:
    """Generiert strategische Empfehlungen"""

    recommendations = []

    # Basis-Empfehlung nach Viability Score
    if viability_score >= 80:
        recommendations.append(
            "✅ **Starke Position**: Geschäftsmodell ist gut aufgestellt. "
            "Fokus auf Wachstum und Skalierung möglich."
        )
    elif viability_score >= 60:
        recommendations.append(
            "⚠️ **Solide Basis**: Geschäftsmodell funktioniert, aber Optimierungspotenzial vorhanden. "
            "Überwache Kosten und Pricing kontinuierlich."
        )
    elif viability_score >= 40:
        recommendations.append(
            "⚠️ **Verbesserungsbedarf**: Geschäftsmodell unter Druck. "
            "Priorisiere Kostenoptimierung oder Preisstrategie-Review."
        )
    else:
        recommendations.append(
            "❌ **Kritisch**: Geschäftsmodell nicht nachhaltig. "
            "Fundamentale Änderungen bei Kosten oder Pricing erforderlich."
        )

    # Pricing Power Empfehlungen
    if pricing_power == "Weak":
        recommendations.append(
            "💡 **Pricing**: Schwache Preismacht erkannt. "
            "Optionen: (1) Kostensenkung priorisieren, (2) Differenzierung erhöhen, "
            "(3) Premium-Features hinzufügen."
        )
    elif pricing_power == "Strong":
        recommendations.append(
            "💪 **Pricing**: Starke Preismacht! "
            "Nutze Spielraum für strategische Investitionen oder höhere Margen."
        )

    # Risk Level Empfehlungen
    if risk_level == "Critical":
        recommendations.append(
            "🚨 **DRINGEND**: Unter Break-Even! "
            "Sofortmaßnahmen: (1) Kostenreduktion, (2) Preiserhöhung prüfen, "
            "(3) Verkaufsvolumen steigern."
        )
    elif risk_level == "High":
        recommendations.append(
            "⚠️ **Risiko**: Niedrige Sicherheitsmarge. "
            "Baue Buffer auf durch höhere Verkäufe oder Kosten-Optimierung."
        )

    # Margin of Safety Empfehlungen
    if mos_percent is not None:
        if mos_percent < 20:
            recommendations.append(
                "📊 **Margin of Safety**: Ziel sollte >20% sein. "
                "Aktuell zu anfällig für Markt-Schwankungen."
            )

    # CM Ratio Empfehlungen
    if cm_ratio < 40:
        recommendations.append(
            "💰 **Deckungsbeitrag**: Deckungsbeitragsquote unter 40%. "
            "Prüfe: (1) Produktkosten senken, (2) Preis erhöhen, (3) Produktmix optimieren."
        )

    return "\n\n".join(recommendations)


def _format_break_even_output(result: BreakEvenResult) -> str:
    """Formatiert Break-Even Analyse als Markdown"""

    lines = []

    # Header
    lines.append("=" * 80)
    lines.append("📊 BREAK-EVEN ANALYSE")
    lines.append("=" * 80)
    lines.append("")

    # Executive Summary
    lines.append("## 📋 Executive Summary")
    lines.append("")

    mos_text = "N/A"
    if result.margin_of_safety_percent is not None:
        if result.margin_of_safety_percent >= 0:
            mos_text = f"{result.margin_of_safety_percent:.1f}% über Break-Even"
        else:
            mos_text = f"{abs(result.margin_of_safety_percent):.1f}% UNTER Break-Even ⚠️"

    lines.append(f"**Break-Even Point:** {result.break_even_units:.0f} Einheiten "
                 f"(€{result.break_even_revenue:,.2f})")
    lines.append(f"**Margin of Safety:** {mos_text}")
    lines.append(f"**Risk Level:** {result.risk_level}")
    lines.append(f"**Viability Score:** {result.business_viability_score}/100")
    lines.append("")

    # Input-Daten
    lines.append("## 📊 Input-Daten")
    lines.append("")
    lines.append("| Parameter | Wert |")
    lines.append("|-----------|------|")
    lines.append(f"| Fixkosten pro Periode | €{result.fixed_costs:,.2f} |")
    lines.append(f"| Variable Kosten/Einheit | €{result.variable_cost_per_unit:,.2f} |")
    lines.append(f"| Verkaufspreis/Einheit | €{result.selling_price_per_unit:,.2f} |")
    if result.current_sales_units:
        lines.append(f"| Aktuelle Verkaufsmenge | {result.current_sales_units:,} Einheiten |")
    lines.append("")

    # Break-Even Berechnung
    lines.append("## 🎯 Break-Even Berechnung")
    lines.append("")

    lines.append("### Deckungsbeitrag (Contribution Margin)")
    lines.append(f"- **Deckungsbeitrag/Einheit:** €{result.contribution_margin:,.2f}")
    lines.append(f"- **Deckungsbeitragsquote:** {result.contribution_margin_ratio:.1f}%")
    lines.append("")

    lines.append("### Break-Even Point (Gewinnschwelle)")
    lines.append(f"- **Break-Even Menge:** {result.break_even_units:,.0f} Einheiten")
    lines.append(f"- **Break-Even Umsatz:** €{result.break_even_revenue:,.2f}")
    lines.append("")

    # Margin of Safety
    if result.margin_of_safety_units is not None:
        lines.append("### 🛡️ Margin of Safety (Sicherheitsmarge)")

        if result.margin_of_safety_units >= 0:
            lines.append(f"- **Sicherheitsmarge:** {result.margin_of_safety_units:,.0f} Einheiten "
                        f"über Break-Even ✅")
            lines.append(f"- **In Euro:** €{result.margin_of_safety_revenue:,.2f}")
            lines.append(f"- **In Prozent:** {result.margin_of_safety_percent:.1f}% "
                        f"der aktuellen Verkäufe")
        else:
            lines.append(f"- **Status:** {abs(result.margin_of_safety_units):,.0f} Einheiten "
                        f"UNTER Break-Even ⚠️")
            lines.append(f"- **Fehlbetrag:** €{abs(result.margin_of_safety_revenue):,.2f}")
            lines.append(f"- **Gap:** {abs(result.margin_of_safety_percent):.1f}% "
                        f"unter Ziel")
        lines.append("")

    # Break-Even Chart
    lines.append("## 📈 Break-Even Visualisierung")
    lines.append("")
    chart = _create_break_even_chart(result)
    lines.append(chart)
    lines.append("")

    # Target Profit Analysis
    if result.target_profit is not None:
        lines.append("## 🎯 Target Profit Analysis")
        lines.append("")
        lines.append(f"**Gewinnziel:** €{result.target_profit:,.2f}")
        lines.append("")
        lines.append(f"Um ein Gewinnziel von €{result.target_profit:,.2f} zu erreichen:")
        lines.append(f"- **Benötigte Verkaufsmenge:** {result.target_profit_units:,.0f} Einheiten")
        lines.append(f"- **Benötigter Umsatz:** €{result.target_profit_revenue:,.2f}")

        if result.current_sales_units:
            gap = result.target_profit_units - result.current_sales_units
            if gap > 0:
                lines.append(f"- **Gap zu aktuellen Verkäufen:** +{gap:,.0f} Einheiten "
                           f"({(gap/result.current_sales_units)*100:.1f}% Steigerung erforderlich)")
            else:
                lines.append(f"- **Status:** Gewinnziel bereits erreicht ✅")
        lines.append("")

    # Scenario Analysis
    lines.append("## 🔍 Szenario-Analyse")
    lines.append("")
    scenario_table = _format_scenario_table(result.scenarios, result.break_even_units)
    lines.append(scenario_table)
    lines.append("")

    # Business Assessment
    lines.append("## 📊 Business Viability Assessment")
    lines.append("")
    lines.append(f"- **Viability Score:** {result.business_viability_score}/100")
    lines.append(f"- **Risk Level:** {result.risk_level}")
    lines.append(f"- **Pricing Power:** {result.pricing_power}")
    lines.append("")

    # Recommendations
    lines.append("## 💡 Empfehlungen")
    lines.append("")
    lines.append(result.recommendation)
    lines.append("")

    # Warnings
    if result.warnings:
        lines.append("## ⚠️ Hinweise & Warnungen")
        lines.append("")
        for warning in result.warnings:
            lines.append(f"- {warning}")
        lines.append("")

    # Raw Data
    lines.append("## 📄 Raw Data")
    lines.append("")
    lines.append("```json")
    lines.append("{")
    lines.append(f'  "break_even_units": {result.break_even_units:.2f},')
    lines.append(f'  "break_even_revenue": {result.break_even_revenue:.2f},')
    lines.append(f'  "contribution_margin": {result.contribution_margin:.2f},')
    lines.append(f'  "contribution_margin_ratio": {result.contribution_margin_ratio:.2f},')
    if result.margin_of_safety_percent is not None:
        lines.append(f'  "margin_of_safety_percent": {result.margin_of_safety_percent:.2f},')
    lines.append(f'  "viability_score": {result.business_viability_score},')
    lines.append(f'  "risk_level": "{result.risk_level}",')
    lines.append(f'  "pricing_power": "{result.pricing_power}"')
    lines.append("}")
    lines.append("```")
    lines.append("")

    lines.append("=" * 80)

    return "\n".join(lines)


def _create_break_even_chart(result: BreakEvenResult) -> str:
    """Erstellt ASCII Chart für Break-Even Visualisierung"""

    lines = []
    lines.append("```")
    lines.append("Revenue & Costs")
    lines.append("    │")

    # Berechne Skalierung
    max_units = result.break_even_units * 1.5
    if result.current_sales_units:
        max_units = max(max_units, result.current_sales_units * 1.1)

    # 10 Zeilen Chart
    chart_height = 10

    for i in range(chart_height, -1, -1):
        units_at_line = (i / chart_height) * max_units
        revenue_at_line = units_at_line * result.selling_price_per_unit
        total_cost = result.fixed_costs + (units_at_line * result.variable_cost_per_unit)

        # Markierungen
        marker = "    │"

        # Break-Even Punkt markieren
        if abs(units_at_line - result.break_even_units) < (max_units * 0.1):
            marker = " BE ├─────────────── Break-Even Point"

        # Current Sales markieren
        if result.current_sales_units:
            if abs(units_at_line - result.current_sales_units) < (max_units * 0.1):
                marker = " CS ├─────────────── Current Sales"

        lines.append(marker)

    lines.append("    └" + "─" * 40 + "> Units")
    lines.append(f"    0{'':>20}{result.break_even_units:>10.0f}{'':>10}")
    lines.append("")
    lines.append("Legende:")
    lines.append("  BE = Break-Even Point")
    if result.current_sales_units:
        lines.append("  CS = Current Sales")
    lines.append("  ─────── = Revenue Line (steigt mit Units)")
    lines.append("  ─ ─ ─ ─ = Total Cost Line (Fixkosten + variable Kosten)")
    lines.append("```")

    return "\n".join(lines)


def _format_scenario_table(scenarios: List[ScenarioAnalysis], base_be: float) -> str:
    """Formatiert Scenario Analysis als Markdown-Tabelle"""

    lines = []
    lines.append("| Szenario | Break-Even Units | Break-Even Revenue | Änderung vs. Basis |")
    lines.append("|----------|------------------|--------------------|--------------------|")

    # Basis-Zeile
    lines.append(f"| **Basis** | **{base_be:,.0f}** | **€{base_be * 0:,.2f}** | **-** |")

    # Szenarien
    for scenario in scenarios:
        if scenario.break_even_units == float('inf'):
            lines.append(f"| {scenario.name} | ∞ (unmöglich) | ∞ | ∞ |")
        else:
            change_indicator = "↓" if scenario.change_percent < 0 else "↑"
            change_color = "🟢" if scenario.change_percent < 0 else "🔴"

            lines.append(
                f"| {scenario.name} | "
                f"{scenario.break_even_units:,.0f} | "
                f"€{scenario.break_even_revenue:,.2f} | "
                f"{change_color} {change_indicator} {abs(scenario.change_percent):.1f}% |"
            )

    return "\n".join(lines)


def get_break_even_tool_definition() -> dict:
    """
    Gibt Tool-Definition für Claude Agent SDK zurück
    """
    return {
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
                    "description": "Fixkosten pro Periode in Euro"
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
    }


# Für Testing
if __name__ == "__main__":
    print("Break-Even Analysis Tool v1.0.0")
    print("Verwende test_break_even_analysis.py für Tests")
