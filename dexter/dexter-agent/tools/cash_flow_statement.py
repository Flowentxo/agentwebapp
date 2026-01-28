"""
Cash Flow Statement Generator Tool für Dexter Agent.

Dieses Tool generiert vollständige Kapitalflussrechnungen (Cash Flow Statements)
nach GAAP/IFRS Standards mit Operating, Investing und Financing Activities.

Features:
- Drei Hauptkategorien: Operating, Investing, Financing Cash Flows
- Free Cash Flow (FCF) Berechnung
- Cash Flow Quality Score (0-100)
- Liquiditäts-Trend Analyse
- Cash Generation Strength Assessment
- Strategic Recommendations
- Comprehensive Warnings (7 Checks)
- ASCII Waterfall Visualization

Author: Dexter Agent Development Team
Version: 1.0.0
"""

import json
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Tuple, Optional
from config import get_config

# Konfiguration laden
config = get_config()


# ============================================================================
# DATACLASSES
# ============================================================================

@dataclass
class OperatingActivities:
    """
    Operativer Cash Flow - Geschäftstätigkeit.

    Startet mit Net Income und adjustiert für non-cash items
    und Working Capital Änderungen (Indirect Method nach GAAP/IFRS).
    """
    net_income: float = 0.0                    # Jahresüberschuss/Nettogewinn
    depreciation_amortization: float = 0.0     # Abschreibungen (non-cash expense)
    changes_in_receivables: float = 0.0        # Veränderung Forderungen (negativ = Anstieg)
    changes_in_inventory: float = 0.0          # Veränderung Vorräte (negativ = Anstieg)
    changes_in_payables: float = 0.0           # Veränderung Verbindlichkeiten (positiv = Anstieg)
    other_operating: float = 0.0               # Sonstige operative Änderungen

    def total(self) -> float:
        """Operating Cash Flow (OCF)"""
        return sum([
            self.net_income,
            self.depreciation_amortization,
            self.changes_in_receivables,
            self.changes_in_inventory,
            self.changes_in_payables,
            self.other_operating
        ])

    def validate(self) -> Tuple[bool, str]:
        """Validiert Operating Activities"""
        # Keine speziellen Constraints - Werte können positiv/negativ sein
        return True, ""


@dataclass
class InvestingActivities:
    """
    Investitions-Cash Flow - Investitionstätigkeit.

    Ausgaben (CapEx, Acquisitions) sind negativ.
    Einnahmen (Asset Sales) sind positiv.
    """
    capital_expenditures: float = 0.0          # Investitionen in Anlagen (negativ = Ausgabe)
    acquisition_of_businesses: float = 0.0     # Unternehmenskäufe (negativ = Ausgabe)
    sale_of_assets: float = 0.0                # Verkauf von Anlagen (positiv = Einnahme)
    investment_purchases: float = 0.0          # Wertpapierkäufe (negativ = Ausgabe)
    investment_sales: float = 0.0              # Wertpapierverkäufe (positiv = Einnahme)
    other_investing: float = 0.0               # Sonstige Investitionen

    def total(self) -> float:
        """Investing Cash Flow (ICF)"""
        return sum([
            self.capital_expenditures,
            self.acquisition_of_businesses,
            self.sale_of_assets,
            self.investment_purchases,
            self.investment_sales,
            self.other_investing
        ])

    def validate(self) -> Tuple[bool, str]:
        """Validiert Investing Activities"""
        # CapEx sollte typischerweise negativ sein (aber nicht erzwingen)
        return True, ""


@dataclass
class FinancingActivities:
    """
    Finanzierungs-Cash Flow - Finanzierungstätigkeit.

    Debt/Equity Issued sind positiv (Einnahmen).
    Repayments, Dividends, Buybacks sind negativ (Ausgaben).
    """
    debt_issued: float = 0.0                   # Aufnahme Kredite (positiv = Einnahme)
    debt_repayment: float = 0.0                # Tilgung Kredite (negativ = Ausgabe)
    equity_issued: float = 0.0                 # Kapitalerhöhung (positiv = Einnahme)
    dividends_paid: float = 0.0                # Dividenden (negativ = Ausgabe)
    share_buybacks: float = 0.0                # Aktienrückkäufe (negativ = Ausgabe)
    other_financing: float = 0.0               # Sonstige Finanzierung

    def total(self) -> float:
        """Financing Cash Flow (nicht verwechseln mit Free Cash Flow!)"""
        return sum([
            self.debt_issued,
            self.debt_repayment,
            self.equity_issued,
            self.dividends_paid,
            self.share_buybacks,
            self.other_financing
        ])

    def validate(self) -> Tuple[bool, str]:
        """Validiert Financing Activities"""
        return True, ""


@dataclass
class CashFlowResult:
    """
    Vollständige Kapitalflussrechnung mit Analyse.
    """
    # Periode
    period: str

    # Drei Hauptkategorien
    operating_activities: Dict[str, float]
    investing_activities: Dict[str, float]
    financing_activities: Dict[str, float]

    # Summen
    operating_cash_flow: float
    investing_cash_flow: float
    financing_cash_flow: float

    net_cash_flow: float
    beginning_cash: float
    ending_cash: float

    # Key Metrics
    free_cash_flow: float                      # OCF - CapEx
    cash_flow_margin: Optional[float]          # OCF / Revenue (%)
    fcf_yield: Optional[float]                 # FCF / Market Cap (optional)

    # Analysis
    cash_flow_quality_score: int               # 0-100
    liquidity_trend: str                       # "Improving", "Stable", "Declining"
    cash_generation_strength: str              # "Strong", "Moderate", "Weak"

    # Empfehlungen & Warnungen
    recommendation: str
    warnings: List[str]


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _calculate_cash_flow_quality(
    ocf: float,
    net_income: float,
    free_cash_flow: float,
    net_cash_flow: float
) -> int:
    """
    Berechnet Cash Flow Quality Score (0-100).

    Faktoren:
    - OCF vs Net Income (40%): OCF > Net Income ist gute Qualität
    - FCF positiv (30%): Kann Dividenden zahlen, investieren
    - Net Cash Flow positiv (30%): Cash Position verbessert sich

    Args:
        ocf: Operating Cash Flow
        net_income: Jahresüberschuss
        free_cash_flow: Free Cash Flow (OCF - CapEx)
        net_cash_flow: Total Net Cash Flow

    Returns:
        Quality Score (0-100)
    """
    score = 0

    # Factor 1: OCF vs Net Income (40 Punkte max)
    if ocf > 0 and net_income > 0:
        ocf_to_ni_ratio = ocf / net_income if net_income != 0 else 0
        if ocf_to_ni_ratio >= 1.2:  # OCF >= 120% von Net Income
            score += 40
        elif ocf_to_ni_ratio >= 1.0:  # OCF >= Net Income
            score += 30
        elif ocf_to_ni_ratio >= 0.8:  # OCF >= 80% von Net Income
            score += 20
        else:
            score += 10
    elif ocf > 0:
        score += 20  # Zumindest positiv
    else:
        score += 0  # Negativer OCF ist schlecht

    # Factor 2: Free Cash Flow (30 Punkte max)
    if free_cash_flow > 0:
        if free_cash_flow > net_income * 0.5:  # FCF > 50% Net Income
            score += 30
        else:
            score += 20
    else:
        score += 0

    # Factor 3: Net Cash Flow (30 Punkte max)
    if net_cash_flow > 0:
        score += 30
    elif net_cash_flow >= 0:
        score += 15
    else:
        score += 0

    return int(score)


def _generate_cash_flow_recommendation(
    quality_score: int,
    liquidity_trend: str,
    cash_generation: str,
    ocf: float,
    fcf: float
) -> str:
    """
    Generiert strategische Empfehlung basierend auf Cash Flow Profil.

    6+ Szenarien:
    1. Cash Burn Crisis (negativer OCF)
    2. Investment Phase (negativer FCF trotz pos. OCF)
    3. Strong Position (hoher Quality Score)
    4. Moderate Position (mittlerer Score)
    5. Declining Liquidity (sinkender Trend)
    6. Stable but Weak (stabiler aber schwacher CF)

    Args:
        quality_score: Cash Flow Quality Score
        liquidity_trend: Liquiditäts-Trend
        cash_generation: Cash Generation Strength
        ocf: Operating Cash Flow
        fcf: Free Cash Flow

    Returns:
        Detaillierte Empfehlung
    """
    # Szenario 1: Cash Burn Crisis
    if ocf < 0:
        return f"""⚠️ **CASH BURN CRISIS - DRINGENDE MASSNAHMEN ERFORDERLICH**

Negativer Operating Cash Flow ({config.output.format_currency(ocf)}) signalisiert akute Liquiditätsprobleme!

**Sofortmaßnahmen:**
1. **Kostennotprogramm:** Drastische Reduktion der Operating Expenses
2. **Working Capital Management:**
   - Forderungen aggressiv eintreiben (Factoring erwägen)
   - Zahlungsziele mit Lieferanten verlängern
   - Lagerbestände reduzieren (Sale & Leaseback für Vorräte)
3. **Liquidität sichern:**
   - Kreditlinien erhöhen oder Bridge Financing
   - Asset Sales erwägen
   - Notfall-Kapitalerhöhung vorbereiten
4. **Profitabilität wiederherstellen:**
   - Revenue-Fokus (Preiserhöhungen wo möglich)
   - Loss-Making Produkte/Services einstellen

**Ziel:** Positiver OCF innerhalb 3 Monate! Runway analysieren und verlängern."""

    # Szenario 2: Investment Phase (pos. OCF, neg. FCF)
    if ocf > 0 and fcf < 0:
        return f"""📊 **INVESTITIONSPHASE - WACHSTUM FINANZIERT DURCH CASH FLOW**

Positiver Operating Cash Flow ({config.output.format_currency(ocf)}) aber negativer Free Cash Flow ({config.output.format_currency(fcf)}) durch hohe Investitionen.

**Analyse:**
Dies ist typisch für Wachstumsphasen - operatives Geschäft generiert Cash, der in CapEx reinvestiert wird.

**Empfehlungen:**
1. **Investment ROI überwachen:**
   - Jede CapEx-Investition auf ROI > 15% prüfen
   - Payback Period < 3 Jahre anstreben
   - Non-Core Assets nicht binden

2. **Balance wahren:**
   - CapEx sollte < 70% von OCF sein (sonst FCF zu negativ)
   - Mindestens 30% OCF für Schuldendienst/Dividenden reservieren

3. **Finanzierung optimieren:**
   - Langfristiges Debt für langfristige Assets nutzen
   - Equity-Finanzierung für hohe CapEx-Phasen erwägen

**Status:** Gesunde Wachstumsdynamik - aber Investment-Returns kritisch tracken!"""

    # Szenario 3: Strong Position
    if quality_score >= 70:
        return f"""💚 **STARKE CASH FLOW POSITION - EXZELLENTE LIQUIDITÄT**

Cash Flow Quality Score {quality_score}/100 - Hervorragende Cash-Generierung!

**Strategische Optionen:**
1. **Shareholder Returns:**
   - Dividendenerhöhungen möglich (Free Cash Flow: {config.output.format_currency(fcf)})
   - Aktienrückkäufe erwägen bei Undervaluation
   - Special Dividends bei Excess Cash

2. **Wachstumsinvestitionen:**
   - M&A-Aktivitäten finanzierbar
   - Organisches Wachstum (neue Märkte, Produkte)
   - R&D-Investitionen erhöhen

3. **Bilanzoptimierung:**
   - Teure Schulden vorzeitig tilgen
   - Debt-to-Equity optimieren
   - Credit Rating verbessern

4. **Cash Deployment:**
   - Überschussliquidität gewinnbringend anlegen
   - Treasury-Management optimieren
   - Working Capital weiter effizienter machen

**Maintaining Excellence:**
- OCF/Net Income Ratio > 1.0 halten
- FCF Conversion > 50% beibehalten
- Cash Reserves für 6+ Monate Operating Expenses"""

    # Szenario 4: Declining Liquidity
    if liquidity_trend == "Declining":
        return f"""⚠️ **SINKENDE LIQUIDITÄT - GEGENSTEUERUNG ERFORDERLICH**

Liquidity Trend: {liquidity_trend} - Cash Position verschlechtert sich.

**Restrukturierungsplan:**
1. **Root Cause Analysis:**
   - Ist OCF das Problem? (Operating-Schwäche)
   - Oder hohe Investments? (CapEx/Acquisitions)
   - Oder Debt Repayment? (Financing-Druck)

2. **Working Capital Optimization:**
   - Days Sales Outstanding (DSO) reduzieren (Target: < 45 Tage)
   - Days Inventory Outstanding (DIO) optimieren
   - Days Payable Outstanding (DPO) verlängern (ohne Lieferanten zu verärgern)
   - Cash Conversion Cycle verkürzen

3. **CapEx-Disziplin:**
   - Nur kritische Investments durchführen
   - Maintenance CapEx vs Growth CapEx separieren
   - Asset-Light Modelle evaluieren (Leasing statt Kauf)

4. **Cash Flow Forecasting:**
   - Rolling 13-Week Cash Flow Forecast implementieren
   - Scenario Planning (Best/Worst/Expected Case)
   - Trigger-Points für Funding-Maßnahmen definieren

**Ziel:** Liquidity Trend innerhalb 6 Monate auf "Stable" verbessern."""

    # Szenario 5: Moderate Position
    if quality_score >= 40:
        return f"""📊 **SOLIDE CASH FLOW BASIS - OPTIMIERUNGSPOTENZIAL VORHANDEN**

Cash Flow Quality Score {quality_score}/100 - Fundament ist stabil, Verbesserungen empfohlen.

**Optimierungsansätze:**
1. **Operating Cash Flow steigern:**
   - Profitabilität erhöhen (Margin Expansion)
   - Working Capital effizienter managen
   - Non-cash adjustments optimieren

2. **Free Cash Flow Conversion verbessern:**
   - CapEx-Effizienz erhöhen (ROI tracken)
   - Unnecessary CapEx eliminieren
   - Asset Utilization maximieren

3. **Liquiditätsreserve aufbauen:**
   - Target: 3-6 Monate Operating Expenses als Cash Reserve
   - Credit Lines als Backup sichern
   - Diversifizierte Funding-Quellen

4. **Cash Culture etablieren:**
   - "Cash is King" Mindset im gesamten Unternehmen
   - Incentives für Divisions basierend auf FCF-Beitrag
   - Transparentes Cash Flow Reporting

**Ziel:** Quality Score > 70 für robuste finanzielle Position."""

    # Szenario 6: Weak Position
    return f"""⚠️ **SCHWACHE CASH FLOW POSITION - STRUKTURELLE VERBESSERUNGEN NÖTIG**

Cash Flow Quality Score {quality_score}/100 - Signifikante Schwächen erkennbar.

**Kritische Maßnahmen:**
1. **Profitabilität wiederherstellen:**
   - Operating Margins sind vermutlich zu niedrig
   - Revenue-Strategie überdenken (Pricing, Mix)
   - Cost-Base fundamental überarbeiten

2. **Working Capital Sanierung:**
   - Receivables Collection intensivieren
   - Excess Inventory abbauen
   - Payables-Management professionalisieren

3. **Investment-Disziplin:**
   - Nur absolute Pflicht-CapEx durchführen
   - Growth Investments pausieren bis OCF gesund
   - Non-Core Assets verkaufen für Liquidity

4. **Finanzielle Restrukturierung:**
   - Debt-Refinancing prüfen (längere Laufzeiten, bessere Terms)
   - Equity-Injection von Shareholdern diskutieren
   - Strategische Optionen evaluieren (M&A, Partnerships)

**Status:** Dringender Handlungsbedarf! CFO-Review empfohlen."""


def _check_cash_flow_warnings(
    ocf: float,
    fcf: float,
    net_cash_flow: float,
    ending_cash: float,
    net_income: float
) -> List[str]:
    """
    Prüft 7 verschiedene Warning-Bedingungen.

    Checks:
    1. Negativer Operating Cash Flow
    2. Negativer Free Cash Flow
    3. Negativer Net Cash Flow
    4. Low Cash Balance (< 10% beginnender Cash)
    5. OCF < Net Income (schlechte Cash Conversion)
    6. Ending Cash near zero (< 50k)
    7. OCF declining vs previous period (wenn Daten vorhanden)

    Returns:
        Liste von Warnmeldungen
    """
    warnings = []

    # 1. Negativer Operating Cash Flow
    if ocf < 0:
        warnings.append(
            f"⚠️ **Negativer Operating Cash Flow!** OCF: {config.output.format_currency(ocf)}. "
            f"Das operative Geschäft verbrennt Cash - sofortige Maßnahmen zur Profitabilitätssteigerung erforderlich!"
        )

    # 2. Negativer Free Cash Flow
    if fcf < 0:
        warnings.append(
            f"⚠️ **Negativer Free Cash Flow!** FCF: {config.output.format_currency(fcf)}. "
            f"Nach Investments bleibt kein freier Cash Flow für Dividenden/Schuldenabbau. "
            f"CapEx-Disziplin prüfen!"
        )

    # 3. Negativer Net Cash Flow
    if net_cash_flow < 0:
        warnings.append(
            f"⚠️ **Negativer Net Cash Flow!** {config.output.format_currency(net_cash_flow)}. "
            f"Cash Position verschlechtert sich. Liquiditätsreserven werden aufgebraucht!"
        )

    # 4. OCF < Net Income (schlechte Cash Conversion)
    if ocf < net_income and net_income > 0:
        conversion_rate = (ocf / net_income * 100) if net_income != 0 else 0
        warnings.append(
            f"⚠️ **Schlechte Cash Conversion!** OCF nur {conversion_rate:.1f}% von Net Income. "
            f"Profite werden nicht in Cash umgewandelt - Working Capital Management überprüfen!"
        )

    # 5. Low Ending Cash (< 50k)
    if ending_cash < 50000 and ending_cash > 0:
        warnings.append(
            f"⚠️ **Niedrige Cash-Reserve!** Ending Cash: {config.output.format_currency(ending_cash)} < €50,000. "
            f"Liquiditätspolster zu gering - Kreditlinien oder Kapitalerhöhung erwägen!"
        )

    # 6. Ending Cash negativ oder null
    if ending_cash <= 0:
        warnings.append(
            f"⚠️ **KRITISCH: Cash aufgebraucht!** Ending Cash: {config.output.format_currency(ending_cash)}. "
            f"Zahlungsunfähigkeit droht! Sofortige Liquiditätssicherung erforderlich!"
        )

    # 7. OCF sehr niedrig relativ zu potential
    if 0 < ocf < net_income * 0.5 and net_income > 0:
        warnings.append(
            f"⚠️ **Sehr niedrige OCF-Conversion!** OCF nur {ocf/net_income*100:.1f}% von Net Income. "
            f"Investigate: Sind Receivables/Inventory stark gestiegen? Working Capital bindet zu viel Cash!"
        )

    return warnings


def _analyze_liquidity_trend(beginning_cash: float, ending_cash: float) -> Tuple[str, float]:
    """
    Analysiert Liquiditäts-Trend.

    Args:
        beginning_cash: Cash zu Periodenanfang
        ending_cash: Cash zu Periodenende

    Returns:
        (trend_status, change_percent)
        - "Improving": Ending > Beginning (+10%+)
        - "Stable": Ending ≈ Beginning (±10%)
        - "Declining": Ending < Beginning (-10%+)
    """
    if beginning_cash == 0:
        # Fallback wenn Beginning Cash 0 ist
        if ending_cash > 0:
            return "Improving", 100.0
        else:
            return "Stable", 0.0

    cash_change_percent = ((ending_cash - beginning_cash) / beginning_cash * 100)

    if cash_change_percent > 10:
        trend = "Improving"
    elif cash_change_percent < -10:
        trend = "Declining"
    else:
        trend = "Stable"

    return trend, cash_change_percent


def _categorize_cash_generation(
    cash_flow_margin: Optional[float],
    ocf: float,
    fcf: float
) -> str:
    """
    Kategorisiert Cash Generation Strength.

    Args:
        cash_flow_margin: OCF / Revenue (%) wenn verfügbar
        ocf: Operating Cash Flow
        fcf: Free Cash Flow

    Returns:
        "Strong", "Moderate", "Weak"
    """
    # Primär: Cash Flow Margin (wenn verfügbar)
    if cash_flow_margin is not None:
        if cash_flow_margin > 15:
            return "Strong"
        elif cash_flow_margin > 8:
            return "Moderate"
        else:
            return "Weak"

    # Fallback: Basierend auf OCF & FCF absolut
    if ocf > 0 and fcf > 0 and fcf > ocf * 0.3:
        return "Strong"
    elif ocf > 0:
        return "Moderate"
    else:
        return "Weak"


def _create_cash_flow_waterfall(
    beginning_cash: float,
    ocf: float,
    icf: float,
    fcf_financing: float,
    ending_cash: float
) -> str:
    """
    Erstellt ASCII Waterfall Chart für Cash Flow.

    Shows: Beginning Cash → +OCF → +ICF → +FCF → Ending Cash

    Args:
        beginning_cash: Starting cash position
        ocf: Operating Cash Flow
        icf: Investing Cash Flow
        fcf_financing: Financing Cash Flow
        ending_cash: Ending cash position

    Returns:
        ASCII Waterfall als String
    """
    # Berechne max Betrag für Scaling
    max_value = max(abs(beginning_cash), abs(ocf), abs(icf), abs(fcf_financing), abs(ending_cash))
    if max_value == 0:
        max_value = 1  # Avoid division by zero

    # Scale für Bar-Länge (max 30 Zeichen)
    max_bar = 30

    def get_bar(value: float) -> str:
        """Generiert Bar für Wert"""
        bar_len = int(abs(value) / max_value * max_bar)
        if value >= 0:
            return "█" * bar_len
        else:
            return "▓" * bar_len  # Unterschiedliches Zeichen für negative

    chart = f"""
┌────────────────────────────────────────────────────────────────┐
│              CASH FLOW WATERFALL (Bewegungen)                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Beginning Cash                                                │
│  {get_bar(beginning_cash):<30}  {config.output.format_currency(beginning_cash):>15}  │
│                                                                │
│  + Operating Cash Flow                                         │
│  {get_bar(ocf):<30}  {config.output.format_currency(ocf):>15}  │
│                                                                │
│  + Investing Cash Flow                                         │
│  {get_bar(icf):<30}  {config.output.format_currency(icf):>15}  │
│                                                                │
│  + Financing Cash Flow                                         │
│  {get_bar(fcf_financing):<30}  {config.output.format_currency(fcf_financing):>15}  │
│                                                                │
│  ───────────────────────────────────────────────────────────  │
│                                                                │
│  = Ending Cash                                                 │
│  {get_bar(ending_cash):<30}  {config.output.format_currency(ending_cash):>15}  │
│                                                                │
└────────────────────────────────────────────────────────────────┘

Legende: █ Positiver Beitrag  ▓ Negativer Beitrag
"""

    return chart


def _format_cash_flow_activity_table(activities: Dict[str, float], category: str) -> str:
    """
    Formatiert Activity-Tabelle (Operating/Investing/Financing).

    Args:
        activities: Dict mit Activity-Items
        category: "Operating", "Investing", "Financing"

    Returns:
        Markdown-Tabelle als String
    """
    output = []

    # Labels basierend auf Kategorie
    labels = {
        "Operating": {
            "net_income": "Jahresüberschuss (Net Income)",
            "depreciation_amortization": "+ Abschreibungen",
            "changes_in_receivables": "± Veränderung Forderungen",
            "changes_in_inventory": "± Veränderung Vorräte",
            "changes_in_payables": "± Veränderung Verbindlichkeiten",
            "other_operating": "± Sonstige operative Änderungen"
        },
        "Investing": {
            "capital_expenditures": "Capital Expenditures (CapEx)",
            "acquisition_of_businesses": "Unternehmenskäufe",
            "sale_of_assets": "Verkauf von Anlagen",
            "investment_purchases": "Wertpapierkäufe",
            "investment_sales": "Wertpapierverkäufe",
            "other_investing": "Sonstige Investitionen"
        },
        "Financing": {
            "debt_issued": "Kreditaufnahme",
            "debt_repayment": "Kredittilgung",
            "equity_issued": "Kapitalerhöhung",
            "dividends_paid": "Dividendenzahlungen",
            "share_buybacks": "Aktienrückkäufe",
            "other_financing": "Sonstige Finanzierungen"
        }
    }

    category_labels = labels.get(category, {})

    output.append("| Position | Betrag |")
    output.append("|:---------|-------:|")

    for key, value in activities.items():
        label = category_labels.get(key, key)
        formatted_value = config.output.format_currency(value)
        output.append(f"| {label} | {formatted_value} |")

    return "\n".join(output)


def _format_cash_flow_output(result: CashFlowResult) -> str:
    """
    Formatiert Cash Flow Result als strukturiertes Markdown.

    Args:
        result: CashFlowResult Dataclass

    Returns:
        Markdown-formatierter Output
    """
    output = []

    # Header
    output.append("# 💰 KAPITALFLUSSRECHNUNG (CASH FLOW STATEMENT)")
    output.append(f"**Periode:** {result.period}")
    output.append("\n" + "=" * 80 + "\n")

    # Executive Summary
    output.append("## 📋 Executive Summary\n")

    # Quality Score mit Emoji
    if result.cash_flow_quality_score >= 70:
        quality_emoji = "🟢"
        quality_label = "Exzellent"
    elif result.cash_flow_quality_score >= 40:
        quality_emoji = "🟡"
        quality_label = "Moderat"
    else:
        quality_emoji = "🔴"
        quality_label = "Schwach"

    output.append(f"**Cash Flow Quality Score:** {result.cash_flow_quality_score}/100 {quality_emoji} {quality_label}")
    output.append(f"**Liquiditäts-Trend:** {result.liquidity_trend}")
    output.append(f"**Cash Generation:** {result.cash_generation_strength}")
    output.append(f"**Net Cash Flow:** {config.output.format_currency(result.net_cash_flow)}")
    output.append(f"**Ending Cash Position:** {config.output.format_currency(result.ending_cash)}")

    output.append("\n" + "=" * 80 + "\n")

    # Cash Flow nach Kategorien
    output.append("## 📊 Cash Flow nach Kategorien\n")

    # Operating Activities
    output.append("### Operating Activities (Operative Geschäftstätigkeit)\n")
    output.append(_format_cash_flow_activity_table(result.operating_activities, "Operating"))
    output.append(f"\n| **Operating Cash Flow** | **{config.output.format_currency(result.operating_cash_flow)}** |\n")

    # Investing Activities
    output.append("### Investing Activities (Investitionstätigkeit)\n")
    output.append(_format_cash_flow_activity_table(result.investing_activities, "Investing"))
    output.append(f"\n| **Investing Cash Flow** | **{config.output.format_currency(result.investing_cash_flow)}** |\n")

    # Financing Activities
    output.append("### Financing Activities (Finanzierungstätigkeit)\n")
    output.append(_format_cash_flow_activity_table(result.financing_activities, "Financing"))
    output.append(f"\n| **Financing Cash Flow** | **{config.output.format_currency(result.financing_cash_flow)}** |\n")

    output.append("=" * 80 + "\n")

    # Cash Flow Zusammenfassung
    output.append("## 💵 Cash Flow Zusammenfassung\n")
    output.append("| Kennzahl | Betrag |")
    output.append("|:---------|-------:|")
    output.append(f"| Operating Cash Flow | {config.output.format_currency(result.operating_cash_flow)} |")
    output.append(f"| Investing Cash Flow | {config.output.format_currency(result.investing_cash_flow)} |")
    output.append(f"| Financing Cash Flow | {config.output.format_currency(result.financing_cash_flow)} |")
    output.append(f"| **Net Cash Flow** | **{config.output.format_currency(result.net_cash_flow)}** |")
    output.append("")
    output.append(f"| Cash zu Beginn | {config.output.format_currency(result.beginning_cash)} |")
    output.append(f"| + Net Cash Flow | {config.output.format_currency(result.net_cash_flow)} |")
    output.append(f"| **Cash am Ende** | **{config.output.format_currency(result.ending_cash)}** |")

    output.append("\n" + "=" * 80 + "\n")

    # Cash Flow Waterfall
    output.append("## 📈 Cash Flow Waterfall\n")
    output.append(_create_cash_flow_waterfall(
        result.beginning_cash,
        result.operating_cash_flow,
        result.investing_cash_flow,
        result.financing_cash_flow,
        result.ending_cash
    ))

    output.append("\n" + "=" * 80 + "\n")

    # Key Metrics
    output.append("## 🔍 Key Metrics\n")
    output.append("| Kennzahl | Wert | Bewertung |")
    output.append("|:---------|-----:|:----------|")

    # Free Cash Flow
    fcf_status = "✅ Positiv" if result.free_cash_flow > 0 else "⚠️ Negativ"
    output.append(f"| Free Cash Flow | {config.output.format_currency(result.free_cash_flow)} | {fcf_status} |")

    # Cash Flow Margin
    if result.cash_flow_margin is not None:
        margin_status = "💚 Stark" if result.cash_flow_margin > 15 else "✅ Gesund" if result.cash_flow_margin > 8 else "⚠️ Schwach"
        output.append(f"| Cash Flow Margin | {result.cash_flow_margin:.1f}% | {margin_status} |")

    # Quality Score
    output.append(f"| Quality Score | {result.cash_flow_quality_score}/100 | {quality_emoji} {quality_label} |")

    output.append("\n" + "=" * 80 + "\n")

    # Analyse
    output.append("## 📊 Cash Flow Analyse\n")
    output.append(f"**Liquiditäts-Trend:** {result.liquidity_trend}\n")
    output.append(f"**Cash Generation:** {result.cash_generation_strength}\n")

    # Interpretation
    output.append("\n### Interpretation\n")

    if result.operating_cash_flow < 0:
        interpretation = "❌ **Kritisch!** Negativer Operating Cash Flow bedeutet das operative Geschäft verbrennt Cash. Sofortige Maßnahmen zur Profitabilitätssteigerung erforderlich!"
    elif result.free_cash_flow < 0 and result.operating_cash_flow > 0:
        interpretation = "⚠️ **Investitionsphase.** Positiver OCF wird durch hohe Investitionen absorbiert. Investment-ROI kritisch überwachen!"
    elif result.cash_flow_quality_score >= 70:
        interpretation = "💚 **Exzellente Cash-Generierung!** Das Unternehmen wandelt Profite effizient in Cash um und hat starke Liquidität. Beste Voraussetzungen für Dividenden, Investments oder Schuldenabbau."
    elif result.cash_flow_quality_score >= 40:
        interpretation = "✅ **Solide Cash Flow Basis.** Das Unternehmen generiert Cash, aber Optimierungspotenzial vorhanden. Working Capital Management und CapEx-Effizienz verbessern."
    else:
        interpretation = "⚠️ **Schwache Cash-Position.** Strukturelle Probleme bei Cash-Generierung. Profitabilität und Working Capital Management fundamental überarbeiten."

    output.append(interpretation + "\n")

    output.append("\n" + "=" * 80 + "\n")

    # Empfehlungen
    output.append("## 💡 Strategische Empfehlung\n")
    output.append(result.recommendation)
    output.append("\n")

    output.append("=" * 80 + "\n")

    # Warnungen
    if result.warnings:
        output.append("## ⚠️ Wichtige Hinweise\n")
        for warning in result.warnings:
            output.append(f"{warning}\n")
        output.append("\n" + "=" * 80 + "\n")

    # Raw Data
    output.append("## 📄 Raw Data (JSON)\n")
    output.append("```json")
    output.append(json.dumps({
        "period": result.period,
        "operating_cash_flow": result.operating_cash_flow,
        "investing_cash_flow": result.investing_cash_flow,
        "financing_cash_flow": result.financing_cash_flow,
        "net_cash_flow": result.net_cash_flow,
        "beginning_cash": result.beginning_cash,
        "ending_cash": result.ending_cash,
        "free_cash_flow": result.free_cash_flow,
        "cash_flow_margin": result.cash_flow_margin,
        "quality_score": result.cash_flow_quality_score,
        "liquidity_trend": result.liquidity_trend,
        "cash_generation": result.cash_generation_strength
    }, indent=2, ensure_ascii=False))
    output.append("```")

    return "\n".join(output)


# ============================================================================
# MAIN FUNCTION
# ============================================================================

async def generate_cash_flow_statement(
    operating_activities: Dict[str, float],
    investing_activities: Dict[str, float],
    financing_activities: Dict[str, float],
    beginning_cash: float,
    period: str,
    revenue: Optional[float] = None
) -> Dict[str, Any]:
    """
    Generiert vollständige Kapitalflussrechnung (Cash Flow Statement).

    Diese Funktion erstellt eine professionelle Kapitalflussrechnung nach
    GAAP/IFRS Standards mit Analyse der Liquiditätsposition.

    Args:
        operating_activities: Dict mit Operating Cash Flow Items
            {
                "net_income": 150000,
                "depreciation_amortization": 50000,
                "changes_in_receivables": -20000,
                "changes_in_inventory": -30000,
                "changes_in_payables": 15000,
                "other_operating": 5000
            }

        investing_activities: Dict mit Investing Cash Flow Items
            {
                "capital_expenditures": -80000,
                "acquisition_of_businesses": -50000,
                "sale_of_assets": 30000,
                "investment_purchases": -20000,
                "investment_sales": 10000,
                "other_investing": 0
            }

        financing_activities: Dict mit Financing Cash Flow Items
            {
                "debt_issued": 100000,
                "debt_repayment": -40000,
                "equity_issued": 50000,
                "dividends_paid": -30000,
                "share_buybacks": -20000,
                "other_financing": 0
            }

        beginning_cash: Cash-Position zu Periodenanfang
        period: Periode (z.B. "Q1 2025", "FY 2024")
        revenue: Optional - Revenue für Cash Flow Margin Berechnung

    Returns:
        Dict mit:
        - result: CashFlowResult Dataclass
        - formatted_output: Markdown-formatierter Report

    Raises:
        ValueError: Bei ungültigen Inputs

    Key Calculations:
        - Operating Cash Flow (OCF) = Σ Operating Activities
        - Investing Cash Flow (ICF) = Σ Investing Activities
        - Financing Cash Flow (FCF) = Σ Financing Activities
        - Net Cash Flow = OCF + ICF + FCF
        - Ending Cash = Beginning Cash + Net Cash Flow
        - Free Cash Flow = OCF - CapEx
        - Cash Flow Margin = (OCF / Revenue) * 100

    Cash Flow Quality Score (0-100):
        - OCF vs Net Income (40%): OCF > NI ist gute Qualität
        - FCF positiv (30%): Kann Dividenden zahlen
        - Net Cash Flow positiv (30%): Cash Position verbessert sich
    """
    try:
        # 1. Input validieren & in Dataclasses konvertieren
        operating_obj = OperatingActivities(**operating_activities)
        investing_obj = InvestingActivities(**investing_activities)
        financing_obj = FinancingActivities(**financing_activities)

        # Validierung
        is_valid, error = operating_obj.validate()
        if not is_valid:
            raise ValueError(f"Operating Activities Validierung fehlgeschlagen: {error}")

        is_valid, error = investing_obj.validate()
        if not is_valid:
            raise ValueError(f"Investing Activities Validierung fehlgeschlagen: {error}")

        is_valid, error = financing_obj.validate()
        if not is_valid:
            raise ValueError(f"Financing Activities Validierung fehlgeschlagen: {error}")

        # 2. Cash Flows berechnen
        ocf = operating_obj.total()
        icf = investing_obj.total()
        fcf_financing = financing_obj.total()

        # 3. Net Cash Flow
        net_cash_flow = ocf + icf + fcf_financing

        # 4. Ending Cash Position
        ending_cash = beginning_cash + net_cash_flow

        # 5. Free Cash Flow (echtes FCF!)
        # FCF = Operating Cash Flow - Capital Expenditures
        capex = investing_activities.get("capital_expenditures", 0)
        free_cash_flow = ocf + capex  # CapEx ist negativ, daher Addition

        # 6. Cash Flow Ratios
        cash_flow_margin = (ocf / revenue * 100) if revenue and revenue > 0 else None
        fcf_yield = None  # Würde Market Cap benötigen

        # 7. Cash Flow Quality Score (0-100)
        net_income = operating_activities.get("net_income", 0)
        quality_score = _calculate_cash_flow_quality(
            ocf,
            net_income,
            free_cash_flow,
            net_cash_flow
        )

        # 8. Liquiditäts-Trend
        liquidity_trend, cash_change_percent = _analyze_liquidity_trend(
            beginning_cash,
            ending_cash
        )

        # 9. Cash Generation Strength
        cash_generation = _categorize_cash_generation(
            cash_flow_margin,
            ocf,
            free_cash_flow
        )

        # 10. Warnungen prüfen
        warnings = _check_cash_flow_warnings(
            ocf,
            free_cash_flow,
            net_cash_flow,
            ending_cash,
            net_income
        )

        # 11. Empfehlungen generieren
        recommendation = _generate_cash_flow_recommendation(
            quality_score,
            liquidity_trend,
            cash_generation,
            ocf,
            free_cash_flow
        )

        # 12. Result Object erstellen
        result = CashFlowResult(
            period=period,
            operating_activities=operating_activities,
            investing_activities=investing_activities,
            financing_activities=financing_activities,
            operating_cash_flow=ocf,
            investing_cash_flow=icf,
            financing_cash_flow=fcf_financing,
            net_cash_flow=net_cash_flow,
            beginning_cash=beginning_cash,
            ending_cash=ending_cash,
            free_cash_flow=free_cash_flow,
            cash_flow_margin=cash_flow_margin,
            fcf_yield=fcf_yield,
            cash_flow_quality_score=quality_score,
            liquidity_trend=liquidity_trend,
            cash_generation_strength=cash_generation,
            recommendation=recommendation,
            warnings=warnings
        )

        # 13. Output formatieren
        formatted_output = _format_cash_flow_output(result)

        return {
            "result": result,
            "formatted_output": formatted_output,
            "raw_data": {
                "period": period,
                "operating_cash_flow": ocf,
                "investing_cash_flow": icf,
                "financing_cash_flow": fcf_financing,
                "net_cash_flow": net_cash_flow,
                "free_cash_flow": free_cash_flow,
                "quality_score": quality_score
            }
        }

    except Exception as e:
        raise ValueError(f"Cash Flow Statement Generierung fehlgeschlagen: {str(e)}")


def get_cash_flow_tool_definition() -> dict:
    """
    Gibt Tool-Definition für Claude Agent SDK zurück.

    Returns:
        Dict mit Tool-Definition
    """
    return {
        "name": "generate_cash_flow_statement",
        "description": """Generiert vollständige Kapitalflussrechnung (Cash Flow Statement) nach GAAP/IFRS.

Nutze dieses Tool für:
- Cash Flow Statement, Kapitalflussrechnung
- Operating/Investing/Financing Cash Flows
- Free Cash Flow (FCF) Berechnung
- Liquiditätsanalyse über Zeit
- "Woher kommt das Cash? Wohin fließt es?"

Das Tool erstellt GAAP/IFRS-konforme Cash Flow Statements mit Quality Score.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "operating_activities": {
                    "type": "object",
                    "description": "Operating Cash Flow Items",
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
                    "description": "Investing Cash Flow Items",
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
                    "description": "Financing Cash Flow Items",
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
                    "description": "Cash-Position zu Periodenanfang"
                },
                "period": {
                    "type": "string",
                    "description": "Periode (z.B. 'Q1 2025')"
                },
                "revenue": {
                    "type": "number",
                    "description": "Optional: Revenue für Cash Flow Margin"
                }
            },
            "required": ["operating_activities", "investing_activities", "financing_activities", "beginning_cash", "period"]
        }
    }


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    import asyncio

    print("Cash Flow Statement Generator Tool - Standalone Test")
    print("=" * 80)
    print("\nTesting Tool Definition...")

    tool_def = get_cash_flow_tool_definition()
    print(f"✓ Tool Name: {tool_def['name']}")
    print(f"✓ Tool Description: {tool_def['description'][:100]}...")
    print(f"✓ Required Parameters: {tool_def['input_schema']['required']}")

    print("\n" + "=" * 80)
    print("Run 'python test_cash_flow_statement.py' for comprehensive testing with 4 scenarios.")
