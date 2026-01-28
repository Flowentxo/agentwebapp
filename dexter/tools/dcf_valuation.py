"""
DCF Valuation Tool - Discounted Cash Flow Unternehmensbewertung

Dieses Modul ermöglicht:
- Zukunftsorientierte Unternehmensbewertung via Discounted Cash Flow
- Berechnung von Enterprise Value und Equity Value
- Terminal Value via Perpetuity Growth oder Exit Multiple
- Sensitivitätsanalyse über WACC und Wachstumsraten
- Multi-Szenario-Bewertung (Base/Upside/Downside)
- Professional CFO-Level Financial Reports
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
import math

# Tool decorator import (nur wenn LangChain verfügbar)
try:
    from langchain_core.tools import tool
except ImportError:
    # Fallback für standalone execution
    def tool(func):
        return func


class TerminalValueMethod(Enum):
    """Methoden zur Terminal Value Berechnung"""
    PERPETUITY_GROWTH = "perpetuity_growth"
    EXIT_MULTIPLE = "exit_multiple"


@dataclass
class DCFProjection:
    """
    Free Cash Flow Projektion für ein Jahr

    Attributes:
        year: Jahr der Projektion (z.B. 2025)
        free_cash_flow: Freier Cash Flow in € (nach Investitionen)
        revenue: Optional - Umsatz des Jahres
        ebitda: Optional - EBITDA für Exit Multiple Berechnung
        description: Beschreibung/Kontext
    """
    year: int
    free_cash_flow: float
    revenue: Optional[float] = None
    ebitda: Optional[float] = None
    description: str = ""

    def validate(self) -> Tuple[bool, str]:
        """Validiert die Projektion"""
        if self.year < 2000 or self.year > 2100:
            return False, f"Jahr {self.year} liegt außerhalb sinnvollem Bereich (2000-2100)"

        # FCF kann negativ sein (bei Wachstumsunternehmen in frühen Jahren)
        # aber wir warnen bei extremen Werten
        if abs(self.free_cash_flow) > 1_000_000_000_000:  # 1 Trillion
            return False, f"FCF {self.free_cash_flow} ist unrealistisch hoch"

        return True, ""


@dataclass
class DCFScenario:
    """
    DCF Bewertungs-Szenario mit Parametern und Ergebnissen

    Attributes:
        scenario_name: Name des Szenarios (z.B. "Base Case")
        projections: Liste der FCF-Projektionen
        wacc: Weighted Average Cost of Capital (%)
        terminal_growth_rate: Langfristige Wachstumsrate (%)
        terminal_value_method: Methode für Terminal Value
        exit_multiple: Optional - Exit Multiple für TV-Berechnung
        net_debt: Optional - Nettoverschuldung (für Equity Value)
        cash: Optional - Cash-Bestand (für Equity Value)
        shares_outstanding: Optional - Anzahl Aktien

        # Berechnete Werte
        present_values: Liste der diskontierten FCFs
        terminal_value: Terminal Value (undiskontiert)
        terminal_value_pv: Terminal Value Present Value
        enterprise_value: Unternehmenswert
        equity_value: Eigenkapitalwert
        value_per_share: Wert pro Aktie
    """
    scenario_name: str
    projections: List[DCFProjection]
    wacc: float  # in %
    terminal_growth_rate: float  # in %
    terminal_value_method: TerminalValueMethod = TerminalValueMethod.PERPETUITY_GROWTH
    exit_multiple: Optional[float] = None
    net_debt: float = 0.0
    cash: float = 0.0
    shares_outstanding: Optional[float] = None

    # Berechnete Werte (werden von calculate() gefüllt)
    present_values: List[float] = field(default_factory=list)
    terminal_value: float = 0.0
    terminal_value_pv: float = 0.0
    enterprise_value: float = 0.0
    equity_value: float = 0.0
    value_per_share: Optional[float] = None

    def validate(self) -> Tuple[bool, str]:
        """Validiert Szenario-Parameter"""
        if not self.projections or len(self.projections) == 0:
            return False, "Mindestens eine FCF-Projektion erforderlich"

        if self.wacc <= 0:
            return False, f"WACC muss positiv sein (erhalten: {self.wacc}%)"

        if self.wacc > 50:
            return False, f"WACC von {self.wacc}% ist unrealistisch hoch"

        if self.terminal_growth_rate < 0:
            return False, f"Terminal Growth Rate sollte nicht negativ sein (erhalten: {self.terminal_growth_rate}%)"

        if self.terminal_growth_rate >= self.wacc:
            return False, f"Terminal Growth ({self.terminal_growth_rate}%) muss kleiner als WACC ({self.wacc}%) sein"

        if self.terminal_value_method == TerminalValueMethod.EXIT_MULTIPLE:
            if self.exit_multiple is None or self.exit_multiple <= 0:
                return False, "Exit Multiple erforderlich für Exit Multiple Methode"

            # Prüfe ob EBITDA in letzter Projektion vorhanden
            last_proj = self.projections[-1]
            if last_proj.ebitda is None:
                return False, "EBITDA in letzter Projektion erforderlich für Exit Multiple Methode"

        # Validiere alle Projektionen
        for proj in self.projections:
            valid, error = proj.validate()
            if not valid:
                return False, f"Projektion {proj.year}: {error}"

        return True, ""

    def calculate(self):
        """
        Berechnet alle DCF-Werte für dieses Szenario

        Setzt: present_values, terminal_value, terminal_value_pv,
               enterprise_value, equity_value, value_per_share
        """
        self.present_values = []

        # 1. Diskontiere alle FCFs
        for i, proj in enumerate(self.projections):
            years_from_now = i + 1
            discount_factor = (1 + self.wacc / 100) ** years_from_now
            pv = proj.free_cash_flow / discount_factor
            self.present_values.append(pv)

        # 2. Berechne Terminal Value
        last_fcf = self.projections[-1].free_cash_flow

        if self.terminal_value_method == TerminalValueMethod.PERPETUITY_GROWTH:
            # TV = FCF_n+1 / (WACC - g) = FCF_n * (1+g) / (WACC - g)
            g = self.terminal_growth_rate / 100
            r = self.wacc / 100
            fcf_next = last_fcf * (1 + g)
            self.terminal_value = fcf_next / (r - g)

        else:  # EXIT_MULTIPLE
            last_ebitda = self.projections[-1].ebitda
            self.terminal_value = last_ebitda * self.exit_multiple

        # 3. Diskontiere Terminal Value
        n = len(self.projections)
        discount_factor = (1 + self.wacc / 100) ** n
        self.terminal_value_pv = self.terminal_value / discount_factor

        # 4. Enterprise Value = Summe aller PVs + TV PV
        self.enterprise_value = sum(self.present_values) + self.terminal_value_pv

        # 5. Equity Value = EV - Net Debt + Cash
        self.equity_value = self.enterprise_value - self.net_debt + self.cash

        # 6. Value per Share
        if self.shares_outstanding and self.shares_outstanding > 0:
            self.value_per_share = self.equity_value / self.shares_outstanding


@dataclass
class DCFValuationResult:
    """
    Gesamtergebnis einer DCF-Bewertung

    Attributes:
        company_name: Name des Unternehmens/Projekts
        valuation_date: Bewertungsdatum
        base_scenario: Basis-Szenario
        upside_scenario: Optional - Optimistisches Szenario
        downside_scenario: Optional - Pessimistisches Szenario
        sensitivity_analysis: Sensitivitätsanalyse (WACC x Growth Matrix)
        weighted_valuation: Wahrscheinlichkeitsgewichtete Bewertung
        recommendation: Empfehlung/Interpretation
        key_assumptions: Liste wichtiger Annahmen
        warnings: Liste von Warnungen
    """
    company_name: str
    valuation_date: str
    base_scenario: DCFScenario
    upside_scenario: Optional[DCFScenario] = None
    downside_scenario: Optional[DCFScenario] = None
    sensitivity_analysis: Dict[str, Dict[str, float]] = field(default_factory=dict)
    weighted_valuation: Optional[float] = None
    recommendation: str = ""
    key_assumptions: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def get_scenarios(self) -> List[DCFScenario]:
        """Gibt alle vorhandenen Szenarien zurück"""
        scenarios = [self.base_scenario]
        if self.upside_scenario:
            scenarios.append(self.upside_scenario)
        if self.downside_scenario:
            scenarios.append(self.downside_scenario)
        return scenarios


# ============================================================================
# HELPER FUNCTIONS - DCF-Berechnungen
# ============================================================================

def calculate_npv(cash_flows: List[float], discount_rate: float) -> float:
    """
    Berechnet Net Present Value einer Cash Flow-Serie

    Args:
        cash_flows: Liste von Cash Flows (Jahr 1, Jahr 2, ...)
        discount_rate: Diskontierungssatz in % (z.B. WACC)

    Returns:
        Net Present Value
    """
    r = discount_rate / 100
    npv = 0.0

    for i, cf in enumerate(cash_flows):
        years = i + 1
        pv = cf / ((1 + r) ** years)
        npv += pv

    return npv


def calculate_terminal_value_perpetuity(
    last_fcf: float,
    wacc: float,
    growth_rate: float
) -> float:
    """
    Berechnet Terminal Value mittels Perpetuity Growth Model

    TV = FCF_n+1 / (WACC - g)

    Args:
        last_fcf: Letzter projizierter Free Cash Flow
        wacc: WACC in %
        growth_rate: Langfristige Wachstumsrate in %

    Returns:
        Terminal Value
    """
    g = growth_rate / 100
    r = wacc / 100

    if r <= g:
        raise ValueError(f"WACC ({wacc}%) muss größer als Growth Rate ({growth_rate}%) sein")

    fcf_next = last_fcf * (1 + g)
    tv = fcf_next / (r - g)

    return tv


def calculate_terminal_value_exit_multiple(
    last_ebitda: float,
    exit_multiple: float
) -> float:
    """
    Berechnet Terminal Value mittels Exit Multiple

    TV = EBITDA_n * Exit Multiple

    Args:
        last_ebitda: EBITDA im letzten Projektionsjahr
        exit_multiple: Exit Multiple (z.B. 10x)

    Returns:
        Terminal Value
    """
    return last_ebitda * exit_multiple


def perform_sensitivity_analysis(
    base_scenario: DCFScenario,
    wacc_range: Tuple[float, float, float],  # (min, max, step)
    growth_range: Tuple[float, float, float]  # (min, max, step)
) -> Dict[str, Dict[str, float]]:
    """
    Führt Sensitivitätsanalyse durch

    Variiert WACC und Terminal Growth Rate und berechnet
    resultierende Enterprise Values

    Args:
        base_scenario: Basis-Szenario
        wacc_range: (min_wacc, max_wacc, step)
        growth_range: (min_growth, max_growth, step)

    Returns:
        Dict mit Sensitivity-Matrix {wacc: {growth: ev}}
    """
    sensitivity = {}

    wacc_min, wacc_max, wacc_step = wacc_range
    growth_min, growth_max, growth_step = growth_range

    # Generiere WACC-Werte
    wacc_values = []
    w = wacc_min
    while w <= wacc_max + 0.001:  # Float-Toleranz
        wacc_values.append(round(w, 2))
        w += wacc_step

    # Generiere Growth-Werte
    growth_values = []
    g = growth_min
    while g <= growth_max + 0.001:
        growth_values.append(round(g, 2))
        g += growth_step

    # Berechne Enterprise Value für jede Kombination
    for wacc in wacc_values:
        sensitivity[f"{wacc}%"] = {}

        for growth in growth_values:
            # Validiere: growth < wacc
            if growth >= wacc:
                sensitivity[f"{wacc}%"][f"{growth}%"] = 0.0
                continue

            # Erstelle temporäres Szenario
            temp_scenario = DCFScenario(
                scenario_name="Sensitivity",
                projections=base_scenario.projections,
                wacc=wacc,
                terminal_growth_rate=growth,
                terminal_value_method=base_scenario.terminal_value_method,
                exit_multiple=base_scenario.exit_multiple,
                net_debt=base_scenario.net_debt,
                cash=base_scenario.cash
            )

            temp_scenario.calculate()
            sensitivity[f"{wacc}%"][f"{growth}%"] = temp_scenario.enterprise_value

    return sensitivity


def calculate_weighted_valuation(
    scenarios: List[Tuple[DCFScenario, float]]  # (scenario, probability)
) -> float:
    """
    Berechnet wahrscheinlichkeitsgewichtete Bewertung

    Args:
        scenarios: Liste von (Szenario, Wahrscheinlichkeit) Tupeln

    Returns:
        Gewichteter Enterprise Value
    """
    weighted_ev = 0.0

    for scenario, probability in scenarios:
        weighted_ev += scenario.enterprise_value * probability

    return weighted_ev


def generate_valuation_recommendation(result: DCFValuationResult) -> str:
    """
    Generiert Bewertungsempfehlung basierend auf DCF-Ergebnis

    Args:
        result: DCF Valuation Result

    Returns:
        Empfehlungstext
    """
    recommendations = []

    base_ev = result.base_scenario.enterprise_value
    base_equity = result.base_scenario.equity_value

    # Szenariovergleich
    if result.upside_scenario and result.downside_scenario:
        upside_ev = result.upside_scenario.enterprise_value
        downside_ev = result.downside_scenario.enterprise_value

        upside_pct = ((upside_ev - base_ev) / base_ev) * 100
        downside_pct = ((base_ev - downside_ev) / base_ev) * 100

        recommendations.append(f"📊 **Bewertungsspanne**: €{downside_ev:,.0f} bis €{upside_ev:,.0f}")
        recommendations.append(f"   Upside: +{upside_pct:.1f}% | Downside: -{downside_pct:.1f}%")

        if upside_pct > downside_pct * 1.5:
            recommendations.append("   ✅ **Asymmetrie**: Mehr Upside als Downside")
        elif downside_pct > upside_pct * 1.5:
            recommendations.append("   ⚠️ **Risiko**: Mehr Downside als Upside")

    # Terminal Value Anteil
    tv_share = (result.base_scenario.terminal_value_pv / base_ev) * 100
    if tv_share > 75:
        recommendations.append(f"⚠️ **Terminal Value dominiert**: {tv_share:.1f}% des Werts liegt im TV")
        recommendations.append("   Langfristige Annahmen kritisch hinterfragen")
    elif tv_share < 50:
        recommendations.append(f"✅ **Solide Basis**: Nur {tv_share:.1f}% des Werts im TV")

    # WACC Plausibilität
    wacc = result.base_scenario.wacc
    if wacc < 5:
        recommendations.append(f"⚠️ **WACC niedrig**: {wacc}% - sehr optimistisch, ggf. zu niedrig")
    elif wacc > 20:
        recommendations.append(f"⚠️ **WACC hoch**: {wacc}% - hohes Risiko eingepreist")

    # Growth Rate Plausibilität
    growth = result.base_scenario.terminal_growth_rate
    if growth > 4:
        recommendations.append(f"⚠️ **Terminal Growth hoch**: {growth}% - langfristig eher 2-3% realistisch")

    # Equity Value Bewertung
    if result.base_scenario.value_per_share:
        vps = result.base_scenario.value_per_share
        recommendations.append(f"💰 **Wert pro Aktie**: €{vps:.2f}")

    return "\n".join(recommendations) if recommendations else "✅ Plausible Bewertung basierend auf gegebenen Annahmen"


def check_valuation_warnings(result: DCFValuationResult) -> List[str]:
    """
    Prüft DCF-Bewertung auf Warnungen

    Args:
        result: DCF Valuation Result

    Returns:
        Liste von Warnungen
    """
    warnings = []

    base = result.base_scenario

    # Negativ FCFs
    negative_fcfs = [p.year for p in base.projections if p.free_cash_flow < 0]
    if negative_fcfs:
        warnings.append(f"⚠️ Negative FCFs in Jahren: {', '.join(map(str, negative_fcfs))}")

    # Terminal Value > 80% des Enterprise Value
    tv_share = (base.terminal_value_pv / base.enterprise_value) * 100
    if tv_share > 80:
        warnings.append(f"⚠️ Terminal Value macht {tv_share:.1f}% des EV aus - sehr spekulativ")

    # WACC vs Growth Spread zu gering
    spread = base.wacc - base.terminal_growth_rate
    if spread < 2:
        warnings.append(f"⚠️ WACC-Growth Spread nur {spread:.1f}% - Terminal Value sehr sensitiv")

    # Negative Equity Value
    if base.equity_value < 0:
        warnings.append(f"⚠️ Negativer Equity Value (€{base.equity_value:,.0f}) - Überschuldung")

    # Sehr hohe Net Debt
    if base.net_debt > base.enterprise_value * 0.7:
        debt_pct = (base.net_debt / base.enterprise_value) * 100
        warnings.append(f"⚠️ Hohe Verschuldung: {debt_pct:.1f}% des Enterprise Value")

    # Projektionszeitraum zu kurz
    if len(base.projections) < 5:
        warnings.append(f"⚠️ Projektionszeitraum nur {len(base.projections)} Jahre - mindestens 5-7 empfohlen")

    return warnings


# ============================================================================
# HELPER FUNCTIONS - Visualisierung & Formatierung
# ============================================================================

def format_fcf_projections_table(projections: List[DCFProjection]) -> str:
    """
    Formatiert FCF-Projektionen als Markdown-Tabelle

    Args:
        projections: Liste von DCF-Projektionen

    Returns:
        Markdown-Tabelle
    """
    table = ["| Jahr | Free Cash Flow | Revenue | EBITDA | Beschreibung |"]
    table.append("|------|---------------|---------|--------|--------------|")

    for proj in projections:
        revenue_str = f"€{proj.revenue:,.0f}" if proj.revenue else "-"
        ebitda_str = f"€{proj.ebitda:,.0f}" if proj.ebitda else "-"

        table.append(
            f"| {proj.year} | €{proj.free_cash_flow:,.0f} | "
            f"{revenue_str} | {ebitda_str} | {proj.description} |"
        )

    return "\n".join(table)


def format_dcf_calculation_table(scenario: DCFScenario) -> str:
    """
    Formatiert DCF-Berechnung als detaillierte Tabelle

    Args:
        scenario: DCF-Szenario (bereits berechnet)

    Returns:
        Markdown-Tabelle
    """
    table = ["| Jahr | FCF | Discount Factor | Present Value |"]
    table.append("|------|-----|----------------|---------------|")

    for i, proj in enumerate(scenario.projections):
        years = i + 1
        discount_factor = (1 + scenario.wacc / 100) ** years
        pv = scenario.present_values[i]

        table.append(
            f"| {proj.year} | €{proj.free_cash_flow:,.0f} | "
            f"{discount_factor:.3f} | €{pv:,.0f} |"
        )

    # Terminal Value Zeile
    n = len(scenario.projections)
    tv_discount_factor = (1 + scenario.wacc / 100) ** n

    table.append("|------|-----|----------------|---------------|")
    table.append(
        f"| TV | €{scenario.terminal_value:,.0f} | "
        f"{tv_discount_factor:.3f} | €{scenario.terminal_value_pv:,.0f} |"
    )

    return "\n".join(table)


def format_scenario_comparison_table(scenarios: List[DCFScenario]) -> str:
    """
    Formatiert Szenariovergleich als Tabelle

    Args:
        scenarios: Liste von DCF-Szenarien

    Returns:
        Markdown-Tabelle
    """
    table = ["| Kennzahl | " + " | ".join(s.scenario_name for s in scenarios) + " |"]
    table.append("|----------|" + "|".join(["----------"] * len(scenarios)) + "|")

    # WACC
    row = "| **WACC** |"
    for s in scenarios:
        row += f" {s.wacc:.1f}% |"
    table.append(row)

    # Terminal Growth
    row = "| **Terminal Growth** |"
    for s in scenarios:
        row += f" {s.terminal_growth_rate:.1f}% |"
    table.append(row)

    # Enterprise Value
    row = "| **Enterprise Value** |"
    for s in scenarios:
        row += f" €{s.enterprise_value:,.0f} |"
    table.append(row)

    # Terminal Value PV
    row = "| **Terminal Value PV** |"
    for s in scenarios:
        row += f" €{s.terminal_value_pv:,.0f} |"
    table.append(row)

    # TV als % von EV
    row = "| **TV % von EV** |"
    for s in scenarios:
        tv_pct = (s.terminal_value_pv / s.enterprise_value) * 100 if s.enterprise_value > 0 else 0
        row += f" {tv_pct:.1f}% |"
    table.append(row)

    # Equity Value
    row = "| **Equity Value** |"
    for s in scenarios:
        row += f" €{s.equity_value:,.0f} |"
    table.append(row)

    # Value per Share
    if any(s.value_per_share for s in scenarios):
        row = "| **Value per Share** |"
        for s in scenarios:
            vps_str = f"€{s.value_per_share:.2f}" if s.value_per_share else "-"
            row += f" {vps_str} |"
        table.append(row)

    return "\n".join(table)


def format_sensitivity_matrix(sensitivity: Dict[str, Dict[str, float]]) -> str:
    """
    Formatiert Sensitivitätsmatrix als Markdown-Tabelle

    Args:
        sensitivity: Sensitivitäts-Dict {wacc: {growth: ev}}

    Returns:
        Markdown-Tabelle
    """
    # Extrahiere WACC und Growth Werte
    wacc_values = sorted(sensitivity.keys())
    growth_values = sorted(sensitivity[wacc_values[0]].keys()) if wacc_values else []

    # Header
    table = ["| WACC \\ Growth | " + " | ".join(growth_values) + " |"]
    table.append("|" + "|".join(["---------------"] * (len(growth_values) + 1)) + "|")

    # Zeilen
    for wacc in wacc_values:
        row = f"| **{wacc}** |"
        for growth in growth_values:
            ev = sensitivity[wacc][growth]
            if ev > 0:
                row += f" €{ev:,.0f} |"
            else:
                row += " - |"
        table.append(row)

    return "\n".join(table)


def create_fcf_visualization(scenario: DCFScenario) -> str:
    """
    Erstellt ASCII-Visualisierung der FCF-Entwicklung

    Args:
        scenario: DCF-Szenario

    Returns:
        ASCII-Chart
    """
    fcfs = [p.free_cash_flow for p in scenario.projections]
    years = [p.year for p in scenario.projections]

    max_fcf = max(fcfs)
    min_fcf = min(fcfs)

    lines = []
    lines.append("```")
    lines.append("Free Cash Flow Entwicklung:")
    lines.append("")

    # Chart bars
    for year, fcf in zip(years, fcfs):
        # Berechne Balkenlänge (max 50 chars)
        if max_fcf - min_fcf != 0:
            bar_length = int(50 * (fcf - min_fcf) / (max_fcf - min_fcf))
        else:
            bar_length = 25

        bar = "█" * bar_length if fcf >= 0 else ""

        lines.append(f"{year} | {bar} €{fcf:,.0f}")

    lines.append("```")

    return "\n".join(lines)


# ============================================================================
# MAIN TOOL FUNCTION
# ============================================================================

@tool
async def perform_dcf_valuation(
    company_name: str,
    projections: List[Dict[str, any]],
    wacc: float,
    terminal_growth_rate: float,
    terminal_value_method: str = "perpetuity_growth",
    exit_multiple: Optional[float] = None,
    net_debt: float = 0.0,
    cash: float = 0.0,
    shares_outstanding: Optional[float] = None,
    include_scenarios: bool = True,
    sensitivity_wacc_range: Optional[List[float]] = None,
    sensitivity_growth_range: Optional[List[float]] = None
) -> str:
    """
    Führt DCF (Discounted Cash Flow) Unternehmensbewertung durch.

    Berechnet Enterprise Value und Equity Value basierend auf diskontierten
    Free Cash Flows und Terminal Value. Unterstützt Multi-Szenario-Bewertung
    und Sensitivitätsanalyse.

    Args:
        company_name: Name des Unternehmens/Projekts
        projections: Liste von FCF-Projektionen, jede mit:
            - year: Jahr (int)
            - free_cash_flow: Freier Cash Flow in € (float)
            - revenue: Optional - Umsatz (float)
            - ebitda: Optional - EBITDA (float)
            - description: Optional - Beschreibung (str)
        wacc: Weighted Average Cost of Capital in % (z.B. 10.0)
        terminal_growth_rate: Langfristige Wachstumsrate in % (z.B. 2.5)
        terminal_value_method: "perpetuity_growth" oder "exit_multiple"
        exit_multiple: Exit Multiple für TV-Berechnung (nur bei exit_multiple Methode)
        net_debt: Nettoverschuldung in € (für Equity Value Berechnung)
        cash: Cash-Bestand in € (für Equity Value Berechnung)
        shares_outstanding: Anzahl ausstehender Aktien (für Value per Share)
        include_scenarios: Automatisch Upside/Downside Szenarien erstellen
        sensitivity_wacc_range: [min, max, step] für WACC Sensitivität
        sensitivity_growth_range: [min, max, step] für Growth Sensitivität

    Returns:
        Ausführlicher Markdown-formatierter DCF Bewertungs-Report

    Example:
        >>> projections = [
        ...     {"year": 2025, "free_cash_flow": 100000, "revenue": 500000, "ebitda": 150000},
        ...     {"year": 2026, "free_cash_flow": 120000, "revenue": 600000, "ebitda": 180000},
        ...     {"year": 2027, "free_cash_flow": 140000, "revenue": 720000, "ebitda": 210000},
        ...     {"year": 2028, "free_cash_flow": 160000, "revenue": 860000, "ebitda": 240000},
        ...     {"year": 2029, "free_cash_flow": 180000, "revenue": 1000000, "ebitda": 270000}
        ... ]
        >>> result = await perform_dcf_valuation(
        ...     company_name="TechStartup GmbH",
        ...     projections=projections,
        ...     wacc=12.0,
        ...     terminal_growth_rate=2.5,
        ...     terminal_value_method="perpetuity_growth",
        ...     net_debt=50000,
        ...     cash=20000,
        ...     shares_outstanding=100000
        ... )
    """
    # ========================================
    # 1. INPUT-VALIDIERUNG
    # ========================================

    if not company_name or not isinstance(company_name, str):
        return "❌ **ERROR**: Unternehmensname muss angegeben werden"

    if not projections or len(projections) == 0:
        return "❌ **ERROR**: Mindestens eine FCF-Projektion erforderlich"

    if wacc <= 0:
        return f"❌ **ERROR**: WACC muss positiv sein (erhalten: {wacc}%)"

    if terminal_growth_rate < 0:
        return f"❌ **ERROR**: Terminal Growth Rate sollte nicht negativ sein (erhalten: {terminal_growth_rate}%)"

    if terminal_growth_rate >= wacc:
        return f"❌ **ERROR**: Terminal Growth ({terminal_growth_rate}%) muss kleiner als WACC ({wacc}%) sein"

    # Terminal Value Method validieren
    try:
        tv_method = TerminalValueMethod(terminal_value_method.lower())
    except ValueError:
        return f"❌ **ERROR**: Ungültige Terminal Value Methode '{terminal_value_method}'. Nutze 'perpetuity_growth' oder 'exit_multiple'"

    # ========================================
    # 2. PROJEKTIONEN KONVERTIEREN
    # ========================================

    try:
        dcf_projections = []
        for proj_dict in projections:
            projection = DCFProjection(
                year=int(proj_dict.get("year", 2025)),
                free_cash_flow=float(proj_dict.get("free_cash_flow", 0)),
                revenue=float(proj_dict["revenue"]) if "revenue" in proj_dict and proj_dict["revenue"] is not None else None,
                ebitda=float(proj_dict["ebitda"]) if "ebitda" in proj_dict and proj_dict["ebitda"] is not None else None,
                description=proj_dict.get("description", "")
            )

            valid, error = projection.validate()
            if not valid:
                return f"❌ **ERROR**: Ungültige Projektion für Jahr {projection.year}: {error}"

            dcf_projections.append(projection)

    except (ValueError, KeyError, TypeError) as e:
        return f"❌ **ERROR**: Ungültige Projektionsdaten: {str(e)}"

    # Sortiere Projektionen nach Jahr
    dcf_projections.sort(key=lambda p: p.year)

    # ========================================
    # 3. BASE CASE SZENARIO ERSTELLEN
    # ========================================

    base_scenario = DCFScenario(
        scenario_name="Base Case",
        projections=dcf_projections,
        wacc=wacc,
        terminal_growth_rate=terminal_growth_rate,
        terminal_value_method=tv_method,
        exit_multiple=exit_multiple,
        net_debt=net_debt,
        cash=cash,
        shares_outstanding=shares_outstanding
    )

    # Validiere Szenario
    valid, error = base_scenario.validate()
    if not valid:
        return f"❌ **ERROR**: Ungültiges Base Case Szenario: {error}"

    # Berechne Base Case
    base_scenario.calculate()

    # ========================================
    # 4. UPSIDE/DOWNSIDE SZENARIEN (OPTIONAL)
    # ========================================

    upside_scenario = None
    downside_scenario = None

    if include_scenarios:
        # Upside: WACC -2%, Growth +0.5%
        upside_wacc = max(wacc - 2.0, 1.0)
        upside_growth = min(terminal_growth_rate + 0.5, upside_wacc - 0.5)

        upside_scenario = DCFScenario(
            scenario_name="Upside Case",
            projections=dcf_projections,
            wacc=upside_wacc,
            terminal_growth_rate=upside_growth,
            terminal_value_method=tv_method,
            exit_multiple=exit_multiple,
            net_debt=net_debt,
            cash=cash,
            shares_outstanding=shares_outstanding
        )
        upside_scenario.calculate()

        # Downside: WACC +2%, Growth -0.5%
        downside_wacc = wacc + 2.0
        downside_growth = max(terminal_growth_rate - 0.5, 0.0)

        if downside_growth < downside_wacc:  # Validierung
            downside_scenario = DCFScenario(
                scenario_name="Downside Case",
                projections=dcf_projections,
                wacc=downside_wacc,
                terminal_growth_rate=downside_growth,
                terminal_value_method=tv_method,
                exit_multiple=exit_multiple,
                net_debt=net_debt,
                cash=cash,
                shares_outstanding=shares_outstanding
            )
            downside_scenario.calculate()

    # ========================================
    # 5. SENSITIVITÄTSANALYSE (OPTIONAL)
    # ========================================

    sensitivity_analysis = {}

    if sensitivity_wacc_range and sensitivity_growth_range:
        try:
            wacc_range = tuple(sensitivity_wacc_range)
            growth_range = tuple(sensitivity_growth_range)

            sensitivity_analysis = perform_sensitivity_analysis(
                base_scenario, wacc_range, growth_range
            )
        except Exception as e:
            # Fehler bei Sensitivitätsanalyse nicht kritisch
            pass

    # ========================================
    # 6. WEIGHTED VALUATION
    # ========================================

    weighted_valuation = None

    if upside_scenario and downside_scenario:
        scenarios_with_probs = [
            (downside_scenario, 0.25),
            (base_scenario, 0.50),
            (upside_scenario, 0.25)
        ]
        weighted_valuation = calculate_weighted_valuation(scenarios_with_probs)

    # ========================================
    # 7. RESULT-OBJEKT ERSTELLEN
    # ========================================

    from datetime import datetime

    result = DCFValuationResult(
        company_name=company_name,
        valuation_date=datetime.now().strftime("%Y-%m-%d"),
        base_scenario=base_scenario,
        upside_scenario=upside_scenario,
        downside_scenario=downside_scenario,
        sensitivity_analysis=sensitivity_analysis,
        weighted_valuation=weighted_valuation
    )

    # Empfehlung generieren
    result.recommendation = generate_valuation_recommendation(result)

    # Warnungen prüfen
    result.warnings = check_valuation_warnings(result)

    # Key Assumptions
    result.key_assumptions = [
        f"WACC: {wacc}%",
        f"Terminal Growth Rate: {terminal_growth_rate}%",
        f"Terminal Value Methode: {tv_method.value}",
        f"Projektionszeitraum: {len(dcf_projections)} Jahre ({dcf_projections[0].year}-{dcf_projections[-1].year})"
    ]

    if net_debt > 0:
        result.key_assumptions.append(f"Net Debt: €{net_debt:,.0f}")
    if cash > 0:
        result.key_assumptions.append(f"Cash: €{cash:,.0f}")

    # ========================================
    # 8. MARKDOWN-OUTPUT GENERIEREN
    # ========================================

    output = []

    # Header
    output.append(f"# 💼 DCF VALUATION REPORT: {company_name}")
    output.append(f"**Bewertungsdatum**: {result.valuation_date}")
    output.append("")

    # ========================================
    # EXECUTIVE SUMMARY
    # ========================================

    output.append("## 🎯 EXECUTIVE SUMMARY")
    output.append("")
    output.append(f"**Enterprise Value (Base Case)**: **€{base_scenario.enterprise_value:,.0f}**")
    output.append(f"**Equity Value (Base Case)**: **€{base_scenario.equity_value:,.0f}**")

    if base_scenario.value_per_share:
        output.append(f"**Value per Share**: **€{base_scenario.value_per_share:.2f}**")

    if weighted_valuation:
        output.append("")
        output.append(f"**Probability-Weighted Valuation**: €{weighted_valuation:,.0f}")

    output.append("")

    # Bewertungsspanne
    if upside_scenario and downside_scenario:
        output.append(f"**Bewertungsspanne**: €{downside_scenario.enterprise_value:,.0f} - €{upside_scenario.enterprise_value:,.0f}")
        output.append("")

    # ========================================
    # KEY ASSUMPTIONS
    # ========================================

    output.append("## 📋 SCHLÜSSELANNAHMEN")
    output.append("")
    for assumption in result.key_assumptions:
        output.append(f"- {assumption}")
    output.append("")

    # ========================================
    # FCF PROJEKTIONEN
    # ========================================

    output.append("## 💰 FREE CASH FLOW PROJEKTIONEN")
    output.append("")
    output.append(format_fcf_projections_table(dcf_projections))
    output.append("")

    # Visualisierung
    output.append(create_fcf_visualization(base_scenario))
    output.append("")

    # ========================================
    # DCF BERECHNUNG (BASE CASE)
    # ========================================

    output.append("## 🧮 DCF BERECHNUNG - BASE CASE")
    output.append("")
    output.append(f"**WACC**: {base_scenario.wacc}%")
    output.append(f"**Terminal Growth Rate**: {base_scenario.terminal_growth_rate}%")
    output.append("")
    output.append(format_dcf_calculation_table(base_scenario))
    output.append("")

    # Terminal Value Details
    output.append("### Terminal Value Berechnung")
    output.append("")
    if tv_method == TerminalValueMethod.PERPETUITY_GROWTH:
        last_fcf = dcf_projections[-1].free_cash_flow
        fcf_next = last_fcf * (1 + terminal_growth_rate / 100)
        output.append(f"**Methode**: Perpetuity Growth")
        output.append(f"- FCF Jahr {dcf_projections[-1].year}: €{last_fcf:,.0f}")
        output.append(f"- FCF Jahr {dcf_projections[-1].year + 1} (mit {terminal_growth_rate}% Growth): €{fcf_next:,.0f}")
        output.append(f"- Terminal Value = FCF_{dcf_projections[-1].year + 1} / (WACC - g)")
        output.append(f"- Terminal Value = €{fcf_next:,.0f} / ({wacc}% - {terminal_growth_rate}%)")
        output.append(f"- **Terminal Value = €{base_scenario.terminal_value:,.0f}**")
    else:  # EXIT_MULTIPLE
        last_ebitda = dcf_projections[-1].ebitda
        output.append(f"**Methode**: Exit Multiple")
        output.append(f"- EBITDA Jahr {dcf_projections[-1].year}: €{last_ebitda:,.0f}")
        output.append(f"- Exit Multiple: {exit_multiple}x")
        output.append(f"- **Terminal Value = €{base_scenario.terminal_value:,.0f}**")

    output.append("")
    output.append(f"**Terminal Value Present Value**: €{base_scenario.terminal_value_pv:,.0f}")
    tv_pct = (base_scenario.terminal_value_pv / base_scenario.enterprise_value) * 100
    output.append(f"**TV als % von Enterprise Value**: {tv_pct:.1f}%")
    output.append("")

    # Zusammenfassung
    output.append("### Bewertungszusammenfassung")
    output.append("")
    output.append(f"- **Summe PV der FCFs**: €{sum(base_scenario.present_values):,.0f}")
    output.append(f"- **Terminal Value PV**: €{base_scenario.terminal_value_pv:,.0f}")
    output.append(f"- **Enterprise Value**: €{base_scenario.enterprise_value:,.0f}")
    output.append(f"- **- Net Debt**: €{net_debt:,.0f}")
    output.append(f"- **+ Cash**: €{cash:,.0f}")
    output.append(f"- **= Equity Value**: €{base_scenario.equity_value:,.0f}")

    if base_scenario.value_per_share:
        output.append(f"- **÷ Shares Outstanding**: {shares_outstanding:,.0f}")
        output.append(f"- **= Value per Share**: €{base_scenario.value_per_share:.2f}")

    output.append("")

    # ========================================
    # SZENARIO-VERGLEICH
    # ========================================

    if upside_scenario and downside_scenario:
        output.append("## 📊 SZENARIO-VERGLEICH")
        output.append("")
        scenarios = [downside_scenario, base_scenario, upside_scenario]
        output.append(format_scenario_comparison_table(scenarios))
        output.append("")

        # Interpretation
        output.append("### Interpretation")
        output.append("")
        ev_range = upside_scenario.enterprise_value - downside_scenario.enterprise_value
        ev_range_pct = (ev_range / base_scenario.enterprise_value) * 100
        output.append(f"- **Bewertungsspanne**: €{ev_range:,.0f} ({ev_range_pct:.1f}% vom Base Case)")

        upside_delta = upside_scenario.enterprise_value - base_scenario.enterprise_value
        downside_delta = base_scenario.enterprise_value - downside_scenario.enterprise_value

        output.append(f"- **Upside-Potenzial**: +€{upside_delta:,.0f}")
        output.append(f"- **Downside-Risiko**: -€{downside_delta:,.0f}")

        if upside_delta > downside_delta:
            output.append(f"- ✅ **Asymmetrie**: Upside überwiegt Downside")
        else:
            output.append(f"- ⚠️ **Risiko**: Downside überwiegt Upside")

        output.append("")

    # ========================================
    # SENSITIVITÄTSANALYSE
    # ========================================

    if sensitivity_analysis:
        output.append("## 🔍 SENSITIVITÄTSANALYSE")
        output.append("")
        output.append("**Enterprise Value bei verschiedenen WACC und Terminal Growth Rates:**")
        output.append("")
        output.append(format_sensitivity_matrix(sensitivity_analysis))
        output.append("")

    # ========================================
    # EMPFEHLUNGEN & WARNUNGEN
    # ========================================

    output.append("## 💡 BEWERTUNGSEMPFEHLUNG")
    output.append("")
    output.append(result.recommendation)
    output.append("")

    if result.warnings:
        output.append("## ⚠️ WICHTIGE HINWEISE")
        output.append("")
        for warning in result.warnings:
            output.append(f"- {warning}")
        output.append("")

    # ========================================
    # ZUSAMMENFASSUNG & NEXT STEPS
    # ========================================

    output.append("## ✅ ZUSAMMENFASSUNG & NEXT STEPS")
    output.append("")
    output.append(f"1. **Fair Value ermittelt**: Enterprise Value von €{base_scenario.enterprise_value:,.0f}")

    if base_scenario.value_per_share:
        output.append(f"2. **Value per Share**: €{base_scenario.value_per_share:.2f} als Bewertungsreferenz")

    output.append("3. **Annahmen validieren**: WACC und Terminal Growth kritisch prüfen")
    output.append("4. **Sensitivität beachten**: Bewertung stark abhängig von Langfristannahmen")

    if tv_pct > 70:
        output.append("5. **Terminal Value hinterfragen**: Sehr hoher Anteil - Projektion verlängern oder konservativere Annahmen")

    output.append("")

    # Footer
    output.append("---")
    output.append("*Erstellt mit SINTRA DCF Valuation Tool v1.0*")
    output.append("")
    output.append("**Disclaimer**: Diese DCF-Bewertung basiert auf den gegebenen Annahmen und Projektionen.")
    output.append("Sie stellt keine Anlageempfehlung dar. Konsultieren Sie einen Finanzberater für Investitionsentscheidungen.")

    return "\n".join(output)


# ============================================================================
# TESTING & EXAMPLES
# ============================================================================

if __name__ == "__main__":
    import asyncio

    print("=" * 80)
    print("DCF VALUATION TOOL - TEST SUITE")
    print("=" * 80)
    print()

    # ========================================
    # TEST 1: STABLE GROWTH COMPANY
    # ========================================

    print("TEST 1: Stable Growth Company (7 Jahre Projektion)")
    print("-" * 80)

    projections_1 = [
        {"year": 2025, "free_cash_flow": 100000, "revenue": 500000, "ebitda": 150000, "description": "Jahr 1"},
        {"year": 2026, "free_cash_flow": 115000, "revenue": 575000, "ebitda": 172500, "description": "Jahr 2"},
        {"year": 2027, "free_cash_flow": 132250, "revenue": 661250, "ebitda": 198375, "description": "Jahr 3"},
        {"year": 2028, "free_cash_flow": 152088, "revenue": 760438, "ebitda": 228131, "description": "Jahr 4"},
        {"year": 2029, "free_cash_flow": 174901, "revenue": 874503, "ebitda": 262351, "description": "Jahr 5"},
        {"year": 2030, "free_cash_flow": 201136, "revenue": 1005679, "ebitda": 301704, "description": "Jahr 6"},
        {"year": 2031, "free_cash_flow": 231307, "revenue": 1156530, "ebitda": 346959, "description": "Jahr 7"}
    ]

    result_1 = asyncio.run(perform_dcf_valuation(
        company_name="StableGrowth AG",
        projections=projections_1,
        wacc=10.0,
        terminal_growth_rate=2.5,
        terminal_value_method="perpetuity_growth",
        net_debt=200000,
        cash=50000,
        shares_outstanding=100000,
        include_scenarios=True,
        sensitivity_wacc_range=[8.0, 12.0, 1.0],
        sensitivity_growth_range=[1.5, 3.5, 0.5]
    ))

    print(result_1)
    print("\n\n")

    # ========================================
    # TEST 2: HIGH GROWTH STARTUP
    # ========================================

    print("TEST 2: High Growth Startup (5 Jahre)")
    print("-" * 80)

    projections_2 = [
        {"year": 2025, "free_cash_flow": -50000, "revenue": 200000, "ebitda": -20000, "description": "Initial Investment"},
        {"year": 2026, "free_cash_flow": 20000, "revenue": 400000, "ebitda": 50000, "description": "Breakeven"},
        {"year": 2027, "free_cash_flow": 100000, "revenue": 800000, "ebitda": 150000, "description": "Acceleration"},
        {"year": 2028, "free_cash_flow": 200000, "revenue": 1600000, "ebitda": 300000, "description": "Scaling"},
        {"year": 2029, "free_cash_flow": 350000, "revenue": 3000000, "ebitda": 550000, "description": "Maturity"}
    ]

    result_2 = asyncio.run(perform_dcf_valuation(
        company_name="TechUnicorn GmbH",
        projections=projections_2,
        wacc=15.0,
        terminal_growth_rate=3.0,
        terminal_value_method="exit_multiple",
        exit_multiple=12.0,
        net_debt=100000,
        cash=500000,
        shares_outstanding=500000,
        include_scenarios=True
    ))

    print(result_2)
    print("\n\n")

    print("=" * 80)
    print("ALLE TESTS ABGESCHLOSSEN")
    print("=" * 80)
