"""
Balance Sheet Generator Tool für Dexter Agent.

Dieses Tool generiert vollständige Bilanzen (Balance Sheets) nach GAAP/IFRS Standards
mit umfassender Financial Health Analyse, Liquiditäts- und Verschuldungskennzahlen.

Features:
- Strukturierte Bilanz: Assets, Liabilities, Equity
- 6 Key Financial Ratios (Current Ratio, Quick Ratio, D/E, D/A, Equity Ratio, Working Capital)
- Financial Health Score (0-100) mit Liquidity & Leverage Sub-Scores
- Automatische Bilanz-Validierung (Assets = Liabilities + Equity)
- Liquiditäts- und Verschuldungs-Kategorisierung
- Strategische Empfehlungen (6 Szenarien)
- Comprehensive Warnings (8 Checks)
- ASCII Balance Structure Visualization

Author: Dexter Agent Development Team
Version: 1.0.0
"""

import json
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any, Dict, List, Tuple
from config import get_config

# Konfiguration laden
config = get_config()


# ============================================================================
# DATACLASSES
# ============================================================================

@dataclass
class Assets:
    """
    Aktiva-Struktur mit Current & Fixed Assets nach GAAP/IFRS.

    Current Assets (Umlaufvermögen): Vermögenswerte mit Liquidität < 1 Jahr
    Fixed Assets (Anlagevermögen): Langfristige Vermögenswerte
    """
    # Current Assets (Umlaufvermögen)
    cash: float = 0.0                       # Kasse & Bank
    accounts_receivable: float = 0.0        # Forderungen aus L&L
    inventory: float = 0.0                  # Vorräte/Lagerbestände
    prepaid_expenses: float = 0.0           # Aktive Rechnungsabgrenzung
    other_current: float = 0.0              # Sonstiges Umlaufvermögen

    # Fixed Assets (Anlagevermögen)
    property: float = 0.0                   # Grundstücke & Gebäude
    equipment: float = 0.0                  # Maschinen & Technische Anlagen
    vehicles: float = 0.0                   # Fuhrpark
    intangible_assets: float = 0.0          # Immaterielle Vermögenswerte
    other_fixed: float = 0.0                # Sonstiges Anlagevermögen

    def current_total(self) -> float:
        """Summe Umlaufvermögen (Current Assets)"""
        return sum([
            self.cash,
            self.accounts_receivable,
            self.inventory,
            self.prepaid_expenses,
            self.other_current
        ])

    def fixed_total(self) -> float:
        """Summe Anlagevermögen (Fixed Assets)"""
        return sum([
            self.property,
            self.equipment,
            self.vehicles,
            self.intangible_assets,
            self.other_fixed
        ])

    def total(self) -> float:
        """Gesamt Aktiva (Total Assets)"""
        return self.current_total() + self.fixed_total()

    def validate(self) -> Tuple[bool, str]:
        """
        Validiert Assets-Werte.

        Returns:
            (is_valid, error_message)
        """
        # Alle Assets müssen >= 0 sein
        for field, value in asdict(self).items():
            if value < 0:
                return False, f"Asset '{field}' darf nicht negativ sein (Wert: {value})"

        # Mindestens ein Asset > 0
        if self.total() <= 0:
            return False, "Mindestens ein Asset muss > 0 sein"

        return True, ""


@dataclass
class Liabilities:
    """
    Passiva-Struktur - Verbindlichkeiten (Current & Long-term).

    Current Liabilities: Kurzfristige Verbindlichkeiten (< 1 Jahr)
    Long-term Liabilities: Langfristige Verbindlichkeiten (> 1 Jahr)
    """
    # Current Liabilities (Kurzfristige Verbindlichkeiten)
    accounts_payable: float = 0.0           # Verbindlichkeiten aus L&L
    short_term_debt: float = 0.0            # Kurzfristige Kredite
    accrued_expenses: float = 0.0           # Rückstellungen
    unearned_revenue: float = 0.0           # Erhaltene Anzahlungen
    other_current: float = 0.0              # Sonstige kurzfristige Verbindlichkeiten

    # Long-term Liabilities (Langfristige Verbindlichkeiten)
    long_term_debt: float = 0.0             # Langfristige Kredite
    bonds_payable: float = 0.0              # Ausgegebene Anleihen
    deferred_tax: float = 0.0               # Latente Steuerschulden
    pension_obligations: float = 0.0        # Pensionsverpflichtungen
    other_long_term: float = 0.0            # Sonstige langfristige Verbindlichkeiten

    def current_total(self) -> float:
        """Summe kurzfristige Verbindlichkeiten (Current Liabilities)"""
        return sum([
            self.accounts_payable,
            self.short_term_debt,
            self.accrued_expenses,
            self.unearned_revenue,
            self.other_current
        ])

    def long_term_total(self) -> float:
        """Summe langfristige Verbindlichkeiten (Long-term Liabilities)"""
        return sum([
            self.long_term_debt,
            self.bonds_payable,
            self.deferred_tax,
            self.pension_obligations,
            self.other_long_term
        ])

    def total(self) -> float:
        """Gesamt Verbindlichkeiten (Total Liabilities)"""
        return self.current_total() + self.long_term_total()

    def validate(self) -> Tuple[bool, str]:
        """
        Validiert Liabilities-Werte.

        Returns:
            (is_valid, error_message)
        """
        # Alle Liabilities müssen >= 0 sein
        for field, value in asdict(self).items():
            if value < 0:
                return False, f"Liability '{field}' darf nicht negativ sein (Wert: {value})"

        return True, ""


@dataclass
class Equity:
    """
    Eigenkapital-Struktur nach GAAP/IFRS.

    Eigenkapital kann negativ sein (Überschuldung).
    """
    share_capital: float = 0.0              # Gezeichnetes Kapital / Grundkapital
    capital_reserves: float = 0.0           # Kapitalrücklage
    retained_earnings: float = 0.0          # Gewinnrücklagen
    current_year_profit: float = 0.0        # Jahresüberschuss/-fehlbetrag

    def total(self) -> float:
        """Gesamt Eigenkapital (Total Equity)"""
        return sum([
            self.share_capital,
            self.capital_reserves,
            self.retained_earnings,
            self.current_year_profit
        ])

    def validate(self) -> Tuple[bool, str]:
        """
        Validiert Equity-Werte.

        Eigenkapital KANN negativ sein (Überschuldung ist ein valider Zustand).

        Returns:
            (is_valid, error_message)
        """
        # Share Capital sollte >= 0 sein (Grundkapital kann nicht negativ sein)
        if self.share_capital < 0:
            return False, "Gezeichnetes Kapital (share_capital) darf nicht negativ sein"

        return True, ""


@dataclass
class BalanceSheetResult:
    """
    Vollständiges Balance Sheet Ergebnis mit Financial Health Analyse.
    """
    # Bilanzstichtag
    date: str

    # Strukturierte Balance Sheet Daten
    assets: Dict[str, Any]
    liabilities: Dict[str, Any]
    equity: Dict[str, Any]

    # Summen
    total_assets: float
    total_current_assets: float
    total_fixed_assets: float
    total_liabilities: float
    total_current_liabilities: float
    total_long_term_liabilities: float
    total_equity: float
    total_liabilities_and_equity: float

    # Bilanz-Validierung
    is_balanced: bool
    balance_difference: float

    # Financial Ratios (6 Key Ratios)
    current_ratio: float
    quick_ratio: float
    debt_to_equity_ratio: float
    debt_to_assets_ratio: float
    equity_ratio: float
    working_capital: float

    # Scores & Kategorien
    financial_health_score: int
    liquidity_score: int
    leverage_score: int
    liquidity_status: str
    leverage_status: str

    # Empfehlungen & Warnungen
    recommendation: str
    warnings: List[str]


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _calculate_liquidity_score(
    current_ratio: float,
    quick_ratio: float,
    working_capital: float,
    total_assets: float
) -> int:
    """
    Berechnet Liquiditäts-Score (0-100).

    Faktoren:
    - Current Ratio (50%): Fähigkeit kurzfristige Verbindlichkeiten zu decken
    - Quick Ratio (30%): Liquidität ohne Vorräte (Acid Test)
    - Working Capital (20%): Nettoumlaufvermögen relativ zu Assets

    Args:
        current_ratio: Current Assets / Current Liabilities
        quick_ratio: (Current Assets - Inventory) / Current Liabilities
        working_capital: Current Assets - Current Liabilities
        total_assets: Gesamt Assets

    Returns:
        Liquidity Score (0-100)
    """
    score = 0

    # Current Ratio (50 Punkte max)
    if current_ratio == float('inf'):
        score += 50  # Keine Current Liabilities = perfekt
    elif current_ratio >= 2.0:
        score += 50
    elif current_ratio >= 1.5:
        score += 35
    elif current_ratio >= 1.0:
        score += 20
    elif current_ratio >= 0.8:
        score += 10
    else:
        score += 0  # Kritisch

    # Quick Ratio (30 Punkte max)
    if quick_ratio == float('inf'):
        score += 30
    elif quick_ratio >= 1.0:
        score += 30
    elif quick_ratio >= 0.8:
        score += 20
    elif quick_ratio >= 0.5:
        score += 10
    else:
        score += 0

    # Working Capital (20 Punkte max)
    wc_ratio = (working_capital / total_assets) if total_assets > 0 else 0
    if wc_ratio >= 0.2:  # >= 20% von Assets
        score += 20
    elif wc_ratio >= 0.1:
        score += 15
    elif wc_ratio > 0:
        score += 10
    else:
        score += 0  # Negatives Working Capital = kritisch

    return int(score)


def _calculate_leverage_score(
    debt_to_equity: float,
    debt_to_assets: float,
    equity_ratio: float
) -> int:
    """
    Berechnet Verschuldungs-Score (0-100).

    Faktoren:
    - Debt-to-Equity Ratio (40%): Verschuldungsgrad
    - Debt-to-Assets Ratio (30%): Fremdkapitalquote
    - Equity Ratio (30%): Eigenkapitalquote

    Args:
        debt_to_equity: Total Liabilities / Total Equity
        debt_to_assets: Total Liabilities / Total Assets
        equity_ratio: (Total Equity / Total Assets) * 100

    Returns:
        Leverage Score (0-100)
    """
    score = 0

    # Debt-to-Equity Ratio (40 Punkte max)
    if debt_to_equity == float('inf'):
        score += 0  # Negatives/Null Equity = kritisch
    elif debt_to_equity <= 0.5:
        score += 40  # Konservativ
    elif debt_to_equity <= 1.0:
        score += 25  # Moderat
    elif debt_to_equity <= 2.0:
        score += 10  # Aggressiv
    else:
        score += 0  # Riskant

    # Debt-to-Assets Ratio (30 Punkte max)
    if debt_to_assets <= 0.4:
        score += 30
    elif debt_to_assets <= 0.6:
        score += 20
    elif debt_to_assets <= 0.8:
        score += 10
    else:
        score += 0

    # Equity Ratio (30 Punkte max)
    if equity_ratio >= 40:
        score += 30
    elif equity_ratio >= 30:
        score += 20
    elif equity_ratio >= 20:
        score += 10
    else:
        score += 0

    return int(score)


def _categorize_liquidity(current_ratio: float) -> str:
    """
    Kategorisiert Liquiditätsstatus basierend auf Current Ratio.

    Benchmarks:
    - >= 2.0: Exzellent (kann kurzfristige Verbindlichkeiten 2x decken)
    - 1.5-2.0: Gut (solide Liquidität)
    - 1.0-1.5: Moderat (knapp aber ausreichend)
    - < 1.0: Kritisch (Zahlungsunfähigkeit droht!)

    Args:
        current_ratio: Current Assets / Current Liabilities

    Returns:
        Kategorie: "Exzellent", "Gut", "Moderat", "Kritisch"
    """
    if current_ratio == float('inf'):
        return "Exzellent"
    elif current_ratio >= 2.0:
        return "Exzellent"
    elif current_ratio >= 1.5:
        return "Gut"
    elif current_ratio >= 1.0:
        return "Moderat"
    else:
        return "Kritisch"


def _categorize_leverage(debt_to_equity: float) -> str:
    """
    Kategorisiert Verschuldungsstatus basierend auf Debt-to-Equity Ratio.

    Benchmarks:
    - <= 0.5: Konservativ (wenig Fremdkapital, sehr stabil)
    - 0.5-1.0: Moderat (gesunde Balance)
    - 1.0-2.0: Aggressiv (hohes Fremdkapital, mehr Risiko)
    - > 2.0: Riskant (Überschuldungsrisiko!)

    Args:
        debt_to_equity: Total Liabilities / Total Equity

    Returns:
        Kategorie: "Konservativ", "Moderat", "Aggressiv", "Riskant"
    """
    if debt_to_equity == float('inf'):
        return "Riskant"  # Negatives/Null Equity
    elif debt_to_equity <= 0.5:
        return "Konservativ"
    elif debt_to_equity <= 1.0:
        return "Moderat"
    elif debt_to_equity <= 2.0:
        return "Aggressiv"
    else:
        return "Riskant"


def _generate_balance_sheet_recommendation(
    health_score: int,
    liquidity_status: str,
    leverage_status: str,
    current_ratio: float,
    total_equity: float
) -> str:
    """
    Generiert strategische Empfehlung basierend auf Financial Health.

    6 Szenarien:
    1. Exzellente Position (Score > 80)
    2. Gute Position (Score 60-80)
    3. Verbesserungsbedarf (Score 40-60)
    4. Kritische Situation (Score < 40)
    5. Liquiditätskrise (Current Ratio < 1.0)
    6. Überschuldung (Equity < 0)

    Args:
        health_score: Financial Health Score (0-100)
        liquidity_status: Liquiditätskategorie
        leverage_status: Verschuldungskategorie
        current_ratio: Current Assets / Current Liabilities
        total_equity: Gesamt Eigenkapital

    Returns:
        Detaillierte Handlungsempfehlung
    """
    # Szenario 6: Überschuldung (Kritisch!)
    if total_equity < 0:
        return """⚠️ **ÜBERSCHULDUNG ERKANNT - SOFORTMASSNAHMEN ERFORDERLICH**

Ihr Unternehmen ist überschuldet (Eigenkapital negativ). Dies ist eine kritische Situation!

**Sofortmaßnahmen:**
1. **Krisenmanagement:** Sofort Sanierungsberater/Insolvenzexperten konsultieren
2. **Kapitalerhöhung:** Gesellschafter-Einlagen oder Investoren gewinnen
3. **Asset-Verkauf:** Nicht-essenzielle Vermögenswerte liquidieren
4. **Restrukturierung:** Mit Gläubigern über Stundung/Forderungsverzicht verhandeln
5. **Kostennotprogramm:** Drastische Ausgabenkürzungen umsetzen

⚠️ **Rechtlicher Hinweis:** Bei Überschuldung besteht ggf. Insolvenzantragspflicht! Lassen Sie die Situation rechtlich prüfen."""

    # Szenario 5: Liquiditätskrise
    if current_ratio < 1.0:
        return """⚠️ **LIQUIDITÄTSKRISE - DRINGENDE HANDLUNG ERFORDERLICH**

Current Ratio unter 1.0 bedeutet: Kurzfristige Verbindlichkeiten > liquide Mittel!
Zahlungsunfähigkeit droht.

**Dringliche Maßnahmen:**
1. **Liquidität sichern:** Sofort Kreditlinie erhöhen oder Überbrückungskredit aufnehmen
2. **Forderungsmanagement:** Außenstände aggressiv eintreiben, Skonto anbieten
3. **Zahlungsziele:** Mit Lieferanten Stundungen/längere Zahlungsziele verhandeln
4. **Asset-Liquidation:** Überflüssige Vorräte/Assets schnell verkaufen
5. **Cash-Fokus:** Alle Ausgaben auf absolute Notwendigkeit prüfen

Ziel: Current Ratio auf mindestens 1.5 erhöhen innerhalb 90 Tage."""

    # Szenario 4: Kritische Situation (Score < 40)
    if health_score < 40:
        return """⚠️ **KRITISCHE FINANZIELLE LAGE - RESTRUKTURIERUNG NÖTIG**

Financial Health Score unter 40 signalisiert ernsthafte finanzielle Probleme.

**Restrukturierungsplan:**
1. **Finanzanalyse:** Detaillierte Schwachstellenanalyse durchführen
2. **Liquidität verbessern:** Working Capital Management optimieren
   - Forderungen: Zahlungsziele verkürzen (von 60 auf 30 Tage)
   - Vorräte: Lagerbestände reduzieren (Just-in-Time)
   - Verbindlichkeiten: Zahlungsziele strecken (von 30 auf 60 Tage)
3. **Verschuldung abbauen:** Schuldenabbauplan erstellen
   - Hochverzinste Kredite prioritär tilgen
   - Ggf. Umschuldung zu besseren Konditionen
4. **Eigenkapital stärken:** Gewinne thesaurieren, keine Ausschüttungen
5. **Profitabilität steigern:** Kosteneffizienz & Margen verbessern

Ziel: Health Score > 60 innerhalb 12 Monate."""

    # Szenario 3: Verbesserungsbedarf (Score 40-60)
    if health_score < 60:
        return f"""📊 **SOLIDE BASIS MIT OPTIMIERUNGSPOTENZIAL**

Financial Health Score {health_score}/100 - Das Fundament ist stabil, aber Verbesserungen empfohlen.

**Optimierungsmaßnahmen:**
1. **Liquidität stärken:**
   - Liquiditätsreserve aufbauen (Ziel: 3 Monate Betriebskosten)
   - Forderungsmanagement intensivieren
   - Working Capital Cycle verkürzen

2. **Verschuldung optimieren:**
   - Verschuldungsgrad reduzieren (Ziel: D/E Ratio < 1.0)
   - Langfristige Finanzierung für Investitionen nutzen
   - Eigenkapitalquote erhöhen (Ziel: > 30%)

3. **Finanzstruktur balancieren:**
   - Anlagendeckung prüfen (Anlagevermögen mit Eigenkapital finanziert?)
   - Fristenkongruenz sicherstellen

Ziel: Health Score > 70 erreichen für mehr finanzielle Stabilität."""

    # Szenario 2: Gute Position (Score 60-80)
    if health_score < 80:
        return f"""✅ **GUTE FINANZIELLE POSITION - WACHSTUM MÖGLICH**

Financial Health Score {health_score}/100 - Ihre finanzielle Basis ist solide!

**Strategische Empfehlungen:**
1. **Position festigen:**
   - Liquiditätsreserve weiter ausbauen
   - Eigenkapitalquote stabilisieren (> 40%)
   - Verschuldungsgrad niedrig halten

2. **Wachstum finanzieren:**
   - Investitionen möglich dank guter Bonität
   - Günstige Fremdkapitalkonditionen nutzbar
   - Expansion aus Eigenmitteln/gemischter Finanzierung

3. **Effizienz steigern:**
   - Working Capital Optimization fortsetzen
   - Asset Utilization maximieren
   - Return on Assets (ROA) verbessern

4. **Risikomanagement:**
   - Währungs-/Zinsrisiken absichern
   - Diversifikation der Finanzierungsquellen

Ziel: Exzellenz-Niveau (> 80) erreichen für optimale Kreditwürdigkeit."""

    # Szenario 1: Exzellente Position (Score > 80)
    return f"""💚 **EXZELLENTE FINANZIELLE POSITION - BEST-IN-CLASS**

Financial Health Score {health_score}/100 - Gratulation! Ihre Bilanz ist vorbildlich.

**Strategische Optionen:**
1. **Wachstumsoffensive:**
   - M&A-Aktivitäten möglich (Übernahmen finanzierbar)
   - Marktexpansion in neue Regionen/Produkte
   - Aggressive Investitionen in Innovation & Infrastruktur

2. **Shareholder Value:**
   - Dividendenausschüttungen möglich
   - Aktienrückkäufe erwägen
   - Langfristige Wertsteigerung kommunizieren

3. **Finanzoptimierung:**
   - Überschussliquidität gewinnbringend anlegen
   - Tax-Optimierung prüfen
   - Kapitalstruktur weiter optimieren (WACC minimieren)

4. **Best-Practice-Status:**
   - Benchmarking: Als Industry-Leader positionieren
   - ESG-Rating verbessern (nachhaltige Finanzierung)
   - Investor Relations intensivieren

**Maintaining Excellence:**
- Current Ratio: > 2.0 halten
- Equity Ratio: > 40% beibehalten
- Debt-to-Equity: < 0.5 stabilisieren

Ihre finanzielle Stärke ist ein strategischer Wettbewerbsvorteil! Nutzen Sie ihn."""


def _check_balance_sheet_warnings(
    is_balanced: bool,
    balance_diff: float,
    current_ratio: float,
    quick_ratio: float,
    debt_to_equity: float,
    equity_ratio: float,
    cash: float,
    total_current_assets: float,
    total_equity: float
) -> List[str]:
    """
    Prüft 8 verschiedene Warning-Bedingungen.

    Checks:
    1. Bilanz nicht ausgeglichen
    2. Negatives Working Capital
    3. Current Ratio < 1.0 (Liquiditätskrise)
    4. Quick Ratio < 0.5 (Kritische Liquidität)
    5. Debt-to-Equity > 3.0 (Überschuldungsrisiko)
    6. Equity Ratio < 20% (zu wenig Eigenkapital)
    7. Cash < 10% von Current Assets (Liquiditätsproblem)
    8. Negatives Eigenkapital (Überschuldung)

    Returns:
        Liste von Warnmeldungen
    """
    warnings = []

    # 1. Bilanz nicht ausgeglichen
    if not is_balanced:
        warnings.append(
            f"⚠️ **Bilanz nicht ausgeglichen!** Differenz: {config.output.format_currency(balance_diff)}. "
            f"Assets müssen exakt Liabilities + Equity entsprechen."
        )

    # 2. Negatives Working Capital
    working_capital = total_current_assets - (
        # Current Liabilities werden vom Caller nicht direkt übergeben
        # Wir berechnen es über Current Ratio
        total_current_assets / current_ratio if current_ratio > 0 and current_ratio != float('inf') else 0
    )
    if working_capital < 0:
        warnings.append(
            f"⚠️ **Negatives Working Capital** ({config.output.format_currency(working_capital)}). "
            f"Kurzfristige Verbindlichkeiten übersteigen liquide Mittel - Zahlungsschwierigkeiten möglich!"
        )

    # 3. Current Ratio < 1.0 (Liquiditätskrise)
    if current_ratio < 1.0 and current_ratio != float('inf'):
        warnings.append(
            f"⚠️ **Liquiditätskrise!** Current Ratio {current_ratio:.2f} < 1.0. "
            f"Unternehmen kann kurzfristige Verbindlichkeiten nicht vollständig decken. "
            f"Zahlungsunfähigkeit droht!"
        )

    # 4. Quick Ratio < 0.5 (Kritische Liquidität ohne Vorräte)
    if quick_ratio < 0.5 and quick_ratio != float('inf'):
        warnings.append(
            f"⚠️ **Kritische Liquidität!** Quick Ratio {quick_ratio:.2f} < 0.5. "
            f"Selbst ohne Vorräte ist Liquidität unzureichend. Sofortmaßnahmen erforderlich!"
        )

    # 5. Debt-to-Equity > 3.0 (Überschuldungsrisiko)
    if debt_to_equity > 3.0 and debt_to_equity != float('inf'):
        warnings.append(
            f"⚠️ **Hohes Überschuldungsrisiko!** Debt-to-Equity {debt_to_equity:.2f} > 3.0. "
            f"Fremdkapital ist 3x höher als Eigenkapital - sehr riskante Verschuldung!"
        )

    # 6. Equity Ratio < 20% (zu wenig Eigenkapital)
    if equity_ratio < 20 and equity_ratio > 0:
        warnings.append(
            f"⚠️ **Schwache Eigenkapitalbasis!** Eigenkapitalquote {equity_ratio:.1f}% < 20%. "
            f"Kreditwürdigkeit eingeschränkt, Finanzierungskosten höher. Eigenkapital stärken!"
        )

    # 7. Cash < 10% von Current Assets (Liquiditätsproblem)
    cash_ratio = (cash / total_current_assets * 100) if total_current_assets > 0 else 0
    if cash_ratio < 10 and total_current_assets > 0:
        warnings.append(
            f"⚠️ **Geringe Liquiditätsreserve!** Cash nur {cash_ratio:.1f}% von Current Assets (< 10%). "
            f"Zu wenig unmittelbar verfügbare Mittel - Liquiditätsengpässe möglich."
        )

    # 8. Negatives Eigenkapital (Überschuldung)
    if total_equity < 0:
        warnings.append(
            f"⚠️ **ÜBERSCHULDUNG!** Eigenkapital negativ ({config.output.format_currency(total_equity)}). "
            f"Verbindlichkeiten übersteigen Vermögen. Insolvenzgefahr! Sofort Sanierungsexperten konsultieren."
        )

    return warnings


def _format_ratio_with_status(
    ratio_name: str,
    ratio_value: float,
    benchmark: str,
    higher_is_better: bool,
    benchmark_value: float
) -> str:
    """
    Formatiert Financial Ratio mit Status-Emoji.

    Args:
        ratio_name: Name der Kennzahl
        ratio_value: Wert der Kennzahl
        benchmark: Beschreibung des Benchmarks
        higher_is_better: True wenn höhere Werte besser sind
        benchmark_value: Numerischer Benchmark-Wert

    Returns:
        Formatierte Zeile mit Status (💚/✅/⚠️/❌)
    """
    # Status bestimmen
    if ratio_value == float('inf'):
        status = "💚 Exzellent"
        display_value = "∞"
    else:
        if higher_is_better:
            # Höher ist besser (z.B. Current Ratio, Equity Ratio)
            if ratio_value >= benchmark_value * 1.2:  # 20% über Benchmark
                status = "💚 Exzellent"
            elif ratio_value >= benchmark_value:
                status = "✅ Gut"
            elif ratio_value >= benchmark_value * 0.8:  # 80% vom Benchmark
                status = "⚠️ Moderat"
            else:
                status = "❌ Kritisch"
        else:
            # Niedriger ist besser (z.B. Debt-to-Equity, Debt-to-Assets)
            if ratio_value == float('inf'):
                status = "❌ Kritisch"
            elif ratio_value <= benchmark_value * 0.5:  # 50% unter Benchmark
                status = "💚 Exzellent"
            elif ratio_value <= benchmark_value:
                status = "✅ Gut"
            elif ratio_value <= benchmark_value * 1.5:  # 50% über Benchmark
                status = "⚠️ Moderat"
            else:
                status = "❌ Kritisch"

        # Wert formatieren
        if ratio_name in ["Equity Ratio"]:
            display_value = f"{ratio_value:.1f}%"
        elif ratio_name in ["Working Capital"]:
            display_value = config.output.format_currency(ratio_value)
        else:
            display_value = f"{ratio_value:.2f}"

    return f"| {ratio_name:<20} | {display_value:>12} | {benchmark:>15} | {status:>18} |"


def _create_balance_structure_chart(
    total_assets: float,
    total_liabilities: float,
    total_equity: float
) -> str:
    """
    Erstellt ASCII-Visualisierung der Bilanzstruktur.

    Zeigt grafisch: Assets = Liabilities + Equity

    Args:
        total_assets: Gesamt Assets
        total_liabilities: Gesamt Liabilities
        total_equity: Gesamt Equity

    Returns:
        ASCII Chart als String
    """
    total = total_assets

    # Berechne Anteile (in %)
    liability_pct = (total_liabilities / total * 100) if total > 0 else 0
    equity_pct = (total_equity / total * 100) if total > 0 else 0

    # Bar-Länge (max 50 Zeichen)
    max_bar_length = 50
    asset_bar = "█" * max_bar_length
    liability_bar = "█" * int(liability_pct / 100 * max_bar_length)
    equity_bar = "█" * int(equity_pct / 100 * max_bar_length)

    chart = f"""
┌─────────────────────────────────────────────────────────────────────┐
│                    BILANZSTRUKTUR (Balance Structure)               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AKTIVA (Assets)                                                    │
│  {asset_bar}  100.0%                │
│  {config.output.format_currency(total_assets):>60}  │
│                                                                     │
│                                  =                                  │
│                                                                     │
│  PASSIVA (Liabilities + Equity)                                     │
│                                                                     │
│  Verbindlichkeiten (Liabilities)                                    │
│  {liability_bar:<50}  {liability_pct:>5.1f}%  │
│  {config.output.format_currency(total_liabilities):>60}  │
│                                                                     │
│  Eigenkapital (Equity)                                              │
│  {equity_bar:<50}  {equity_pct:>5.1f}%  │
│  {config.output.format_currency(total_equity):>60}  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
"""

    return chart


def _format_balance_sheet_output(result: BalanceSheetResult) -> str:
    """
    Formatiert Balance Sheet Result als strukturiertes Markdown.

    Args:
        result: BalanceSheetResult Dataclass

    Returns:
        Markdown-formatierter Output
    """
    output = []

    # Header
    output.append("# 📊 BILANZ (BALANCE SHEET)")
    output.append(f"**Stichtag:** {result.date}")
    output.append("\n" + "=" * 80 + "\n")

    # Executive Summary
    output.append("## 📋 Executive Summary\n")

    # Health Score mit Color-Coding
    if result.financial_health_score >= 80:
        health_emoji = "🟢"
        health_label = "Exzellent"
    elif result.financial_health_score >= 60:
        health_emoji = "🟡"
        health_label = "Gut"
    elif result.financial_health_score >= 40:
        health_emoji = "🟠"
        health_label = "Moderat"
    else:
        health_emoji = "🔴"
        health_label = "Kritisch"

    output.append(f"**Financial Health Score:** {result.financial_health_score}/100 {health_emoji} {health_label}")
    output.append(f"**Liquidität:** {result.liquidity_status} (Score: {result.liquidity_score}/100)")
    output.append(f"**Verschuldung:** {result.leverage_status} (Score: {result.leverage_score}/100)")

    # Balance Status
    if result.is_balanced:
        output.append(f"**Bilanzprüfung:** ✅ Ausgeglichen")
    else:
        output.append(
            f"**Bilanzprüfung:** ❌ Nicht ausgeglichen "
            f"(Differenz: {config.output.format_currency(result.balance_difference)})"
        )

    output.append("\n" + "=" * 80 + "\n")

    # AKTIVA (Assets)
    output.append("## 🏦 AKTIVA (Assets)\n")

    # Current Assets
    output.append("### Umlaufvermögen (Current Assets)\n")
    output.append("| Position | Betrag | Anteil |")
    output.append("|:---------|-------:|-------:|")

    assets = result.assets
    current_assets = assets['current']
    total_assets = result.total_assets

    for key, label in [
        ('cash', 'Kasse & Bank'),
        ('accounts_receivable', 'Forderungen aus L&L'),
        ('inventory', 'Vorräte/Lagerbestände'),
        ('prepaid_expenses', 'Aktive Rechnungsabgrenzung'),
        ('other_current', 'Sonstiges Umlaufvermögen')
    ]:
        value = current_assets.get(key, 0)
        pct = (value / total_assets * 100) if total_assets > 0 else 0
        output.append(f"| {label} | {config.output.format_currency(value)} | {pct:.1f}% |")

    current_total_pct = (result.total_current_assets / total_assets * 100) if total_assets > 0 else 0
    output.append(f"| **Gesamt Umlaufvermögen** | **{config.output.format_currency(result.total_current_assets)}** | **{current_total_pct:.1f}%** |")

    # Fixed Assets
    output.append("\n### Anlagevermögen (Fixed Assets)\n")
    output.append("| Position | Betrag | Anteil |")
    output.append("|:---------|-------:|-------:|")

    fixed_assets = assets['fixed']

    for key, label in [
        ('property', 'Grundstücke & Gebäude'),
        ('equipment', 'Maschinen & Technische Anlagen'),
        ('vehicles', 'Fuhrpark'),
        ('intangible_assets', 'Immaterielle Vermögenswerte'),
        ('other_fixed', 'Sonstiges Anlagevermögen')
    ]:
        value = fixed_assets.get(key, 0)
        pct = (value / total_assets * 100) if total_assets > 0 else 0
        output.append(f"| {label} | {config.output.format_currency(value)} | {pct:.1f}% |")

    fixed_total_pct = (result.total_fixed_assets / total_assets * 100) if total_assets > 0 else 0
    output.append(f"| **Gesamt Anlagevermögen** | **{config.output.format_currency(result.total_fixed_assets)}** | **{fixed_total_pct:.1f}%** |")

    output.append(f"\n| **GESAMT AKTIVA** | **{config.output.format_currency(result.total_assets)}** | **100.0%** |\n")

    output.append("=" * 80 + "\n")

    # PASSIVA (Liabilities & Equity)
    output.append("## 🏛️ PASSIVA (Liabilities & Equity)\n")

    # Current Liabilities
    output.append("### Kurzfristige Verbindlichkeiten (Current Liabilities)\n")
    output.append("| Position | Betrag | Anteil |")
    output.append("|:---------|-------:|-------:|")

    liabilities = result.liabilities
    current_liabilities = liabilities['current']

    for key, label in [
        ('accounts_payable', 'Verbindlichkeiten aus L&L'),
        ('short_term_debt', 'Kurzfristige Kredite'),
        ('accrued_expenses', 'Rückstellungen'),
        ('unearned_revenue', 'Erhaltene Anzahlungen'),
        ('other_current', 'Sonstige kurzfristige Verbindlichkeiten')
    ]:
        value = current_liabilities.get(key, 0)
        pct = (value / total_assets * 100) if total_assets > 0 else 0
        output.append(f"| {label} | {config.output.format_currency(value)} | {pct:.1f}% |")

    current_liab_pct = (result.total_current_liabilities / total_assets * 100) if total_assets > 0 else 0
    output.append(f"| **Gesamt kurzfristige Verbindlichkeiten** | **{config.output.format_currency(result.total_current_liabilities)}** | **{current_liab_pct:.1f}%** |")

    # Long-term Liabilities
    output.append("\n### Langfristige Verbindlichkeiten (Long-term Liabilities)\n")
    output.append("| Position | Betrag | Anteil |")
    output.append("|:---------|-------:|-------:|")

    long_term_liabilities = liabilities['long_term']

    for key, label in [
        ('long_term_debt', 'Langfristige Kredite'),
        ('bonds_payable', 'Ausgegebene Anleihen'),
        ('deferred_tax', 'Latente Steuerschulden'),
        ('pension_obligations', 'Pensionsverpflichtungen'),
        ('other_long_term', 'Sonstige langfristige Verbindlichkeiten')
    ]:
        value = long_term_liabilities.get(key, 0)
        pct = (value / total_assets * 100) if total_assets > 0 else 0
        output.append(f"| {label} | {config.output.format_currency(value)} | {pct:.1f}% |")

    long_term_liab_pct = (result.total_long_term_liabilities / total_assets * 100) if total_assets > 0 else 0
    output.append(f"| **Gesamt langfristige Verbindlichkeiten** | **{config.output.format_currency(result.total_long_term_liabilities)}** | **{long_term_liab_pct:.1f}%** |")

    total_liab_pct = (result.total_liabilities / total_assets * 100) if total_assets > 0 else 0
    output.append(f"\n| **Gesamt Verbindlichkeiten** | **{config.output.format_currency(result.total_liabilities)}** | **{total_liab_pct:.1f}%** |")

    # Equity
    output.append("\n### Eigenkapital (Equity)\n")
    output.append("| Position | Betrag | Anteil |")
    output.append("|:---------|-------:|-------:|")

    equity = result.equity

    for key, label in [
        ('share_capital', 'Gezeichnetes Kapital'),
        ('capital_reserves', 'Kapitalrücklage'),
        ('retained_earnings', 'Gewinnrücklagen'),
        ('current_year_profit', 'Jahresüberschuss/-fehlbetrag')
    ]:
        value = equity.get(key, 0)
        pct = (value / total_assets * 100) if total_assets > 0 else 0
        output.append(f"| {label} | {config.output.format_currency(value)} | {pct:.1f}% |")

    equity_pct = (result.total_equity / total_assets * 100) if total_assets > 0 else 0
    output.append(f"| **Gesamt Eigenkapital** | **{config.output.format_currency(result.total_equity)}** | **{equity_pct:.1f}%** |")

    output.append(f"\n| **GESAMT PASSIVA** | **{config.output.format_currency(result.total_liabilities_and_equity)}** | **100.0%** |\n")

    output.append("=" * 80 + "\n")

    # Balance Structure Visualization
    output.append("## 📊 Bilanzstruktur-Visualisierung\n")
    output.append(_create_balance_structure_chart(
        result.total_assets,
        result.total_liabilities,
        result.total_equity
    ))

    output.append("\n" + "=" * 80 + "\n")

    # Financial Ratios
    output.append("## 📈 Financial Ratios & Analyse\n")
    output.append("| Kennzahl | Wert | Benchmark | Status |")
    output.append("|:---------|-----:|----------:|:-------|")

    # Current Ratio
    output.append(_format_ratio_with_status(
        "Current Ratio",
        result.current_ratio,
        ">= 2.0",
        True,
        2.0
    ))

    # Quick Ratio
    output.append(_format_ratio_with_status(
        "Quick Ratio",
        result.quick_ratio,
        ">= 1.0",
        True,
        1.0
    ))

    # Debt-to-Equity
    output.append(_format_ratio_with_status(
        "Debt-to-Equity",
        result.debt_to_equity_ratio,
        "<= 1.0",
        False,
        1.0
    ))

    # Debt-to-Assets
    debt_to_assets_pct = result.debt_to_assets_ratio * 100
    output.append(_format_ratio_with_status(
        "Debt-to-Assets",
        debt_to_assets_pct,
        "<= 40%",
        False,
        40.0
    ))

    # Equity Ratio
    output.append(_format_ratio_with_status(
        "Equity Ratio",
        result.equity_ratio,
        ">= 30%",
        True,
        30.0
    ))

    # Working Capital
    output.append(_format_ratio_with_status(
        "Working Capital",
        result.working_capital,
        "> 0",
        True,
        0.0
    ))

    output.append("\n" + "=" * 80 + "\n")

    # Financial Health Assessment
    output.append("## 🏥 Financial Health Assessment\n")
    output.append(f"**Financial Health Score:** {result.financial_health_score}/100 {health_emoji}\n")
    output.append(f"**Liquidität:** {result.liquidity_status} 💧 (Score: {result.liquidity_score}/100)\n")
    output.append(f"**Verschuldung:** {result.leverage_status} 📊 (Score: {result.leverage_score}/100)\n")

    # Interpretation
    output.append("\n### Interpretation\n")

    if result.total_equity < 0:
        interpretation = "❌ **Überschuldung erkannt!** Das Unternehmen ist überschuldet (Eigenkapital negativ). Verbindlichkeiten übersteigen das Vermögen. Dies ist eine kritische Situation, die sofortiges Handeln erfordert."
    elif result.current_ratio < 1.0:
        interpretation = "⚠️ **Liquiditätskrise!** Das Unternehmen kann kurzfristige Verbindlichkeiten nicht vollständig aus liquiden Mitteln decken. Zahlungsunfähigkeit droht."
    elif result.financial_health_score >= 80:
        interpretation = "💚 **Exzellente finanzielle Gesundheit!** Das Unternehmen verfügt über eine starke Bilanzstruktur mit ausgezeichneter Liquidität und konservativer Verschuldung. Beste Voraussetzungen für Wachstum und Investitionen."
    elif result.financial_health_score >= 60:
        interpretation = "✅ **Gute finanzielle Position.** Das Unternehmen ist solide aufgestellt mit gesunder Liquidität und moderater Verschuldung. Finanzielle Stabilität ist gegeben."
    elif result.financial_health_score >= 40:
        interpretation = "⚠️ **Verbesserungsbedarf erkennbar.** Die finanzielle Position ist stabil, aber Optimierungen bei Liquidität oder Verschuldung sind empfehlenswert."
    else:
        interpretation = "❌ **Kritische finanzielle Lage.** Das Unternehmen zeigt strukturelle finanzielle Schwächen. Restrukturierungsmaßnahmen sind dringend erforderlich."

    output.append(interpretation + "\n")

    output.append("\n" + "=" * 80 + "\n")

    # Recommendations
    output.append("## 💡 Strategische Empfehlung\n")
    output.append(result.recommendation)
    output.append("\n")

    output.append("=" * 80 + "\n")

    # Warnings
    if result.warnings:
        output.append("## ⚠️ Wichtige Hinweise\n")
        for warning in result.warnings:
            output.append(f"{warning}\n")
        output.append("\n" + "=" * 80 + "\n")

    # Raw Data
    output.append("## 📄 Raw Data (JSON)\n")
    output.append("```json")
    output.append(json.dumps({
        "date": result.date,
        "total_assets": result.total_assets,
        "total_liabilities": result.total_liabilities,
        "total_equity": result.total_equity,
        "is_balanced": result.is_balanced,
        "ratios": {
            "current_ratio": result.current_ratio if result.current_ratio != float('inf') else None,
            "quick_ratio": result.quick_ratio if result.quick_ratio != float('inf') else None,
            "debt_to_equity": result.debt_to_equity_ratio if result.debt_to_equity_ratio != float('inf') else None,
            "debt_to_assets": result.debt_to_assets_ratio,
            "equity_ratio": result.equity_ratio,
            "working_capital": result.working_capital
        },
        "scores": {
            "financial_health": result.financial_health_score,
            "liquidity": result.liquidity_score,
            "leverage": result.leverage_score
        }
    }, indent=2, ensure_ascii=False))
    output.append("```")

    return "\n".join(output)


# ============================================================================
# MAIN FUNCTION
# ============================================================================

async def generate_balance_sheet(
    assets: Dict[str, float],
    liabilities: Dict[str, float],
    equity: Dict[str, float],
    date: str
) -> Dict[str, Any]:
    """
    Generiert vollständige Bilanz (Balance Sheet) mit Financial Health Analyse.

    Diese Funktion erstellt eine professionelle Bilanz nach GAAP/IFRS Standards
    mit detaillierter Analyse der finanziellen Gesundheit des Unternehmens.

    Args:
        assets: Dict mit Asset-Kategorien
            {
                "cash": 50000,
                "accounts_receivable": 80000,
                "inventory": 120000,
                "prepaid_expenses": 5000,
                "other_current": 10000,
                "property": 200000,
                "equipment": 150000,
                "vehicles": 50000,
                "intangible_assets": 30000,
                "other_fixed": 20000
            }

        liabilities: Dict mit Liability-Kategorien
            {
                "accounts_payable": 40000,
                "short_term_debt": 30000,
                "accrued_expenses": 15000,
                "unearned_revenue": 5000,
                "other_current": 5000,
                "long_term_debt": 150000,
                "bonds_payable": 0,
                "deferred_tax": 10000,
                "pension_obligations": 0,
                "other_long_term": 5000
            }

        equity: Dict mit Equity-Kategorien
            {
                "share_capital": 250000,
                "capital_reserves": 100000,
                "retained_earnings": 120000,
                "current_year_profit": 65000
            }

        date: Bilanzstichtag im Format "YYYY-MM-DD" (z.B. "2025-06-30")

    Returns:
        Dict mit:
        - result: BalanceSheetResult Dataclass
        - formatted_output: Markdown-formatierter Report

    Raises:
        ValueError: Bei ungültigen Inputs

    Financial Ratios (6 Key Ratios):
        - Current Ratio = Current Assets / Current Liabilities
        - Quick Ratio = (Current Assets - Inventory) / Current Liabilities
        - Debt-to-Equity = Total Liabilities / Total Equity
        - Debt-to-Assets = Total Liabilities / Total Assets
        - Equity Ratio = (Total Equity / Total Assets) * 100
        - Working Capital = Current Assets - Current Liabilities

    Financial Health Score (0-100):
        - Liquidity Score (50%): Current Ratio, Quick Ratio, Working Capital
        - Leverage Score (40%): Debt-to-Equity, Debt-to-Assets, Equity Ratio
        - Balance Quality (10%): Bilanz ausgeglichen?
    """
    try:
        # 1. Input validieren & in Dataclasses konvertieren
        assets_obj = Assets(**assets)
        liabilities_obj = Liabilities(**liabilities)
        equity_obj = Equity(**equity)

        # Validierung
        is_valid, error = assets_obj.validate()
        if not is_valid:
            raise ValueError(f"Assets Validierung fehlgeschlagen: {error}")

        is_valid, error = liabilities_obj.validate()
        if not is_valid:
            raise ValueError(f"Liabilities Validierung fehlgeschlagen: {error}")

        is_valid, error = equity_obj.validate()
        if not is_valid:
            raise ValueError(f"Equity Validierung fehlgeschlagen: {error}")

        # Datum validieren
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise ValueError(f"Ungültiges Datumsformat: {date}. Erwartet: YYYY-MM-DD")

        # 2. Summen berechnen
        total_assets = assets_obj.total()
        total_current_assets = assets_obj.current_total()
        total_fixed_assets = assets_obj.fixed_total()

        total_liabilities = liabilities_obj.total()
        total_current_liabilities = liabilities_obj.current_total()
        total_long_term_liabilities = liabilities_obj.long_term_total()

        total_equity = equity_obj.total()
        total_liabilities_and_equity = total_liabilities + total_equity

        # 3. Bilanz-Validierung (Tolerance: 0.01€)
        balance_diff = abs(total_assets - total_liabilities_and_equity)
        is_balanced = balance_diff < 0.01

        # 4. Financial Ratios berechnen

        # Current Ratio = Current Assets / Current Liabilities
        current_ratio = (
            total_current_assets / total_current_liabilities
            if total_current_liabilities > 0
            else float('inf')
        )

        # Quick Ratio = (Current Assets - Inventory) / Current Liabilities
        quick_assets = total_current_assets - assets_obj.inventory
        quick_ratio = (
            quick_assets / total_current_liabilities
            if total_current_liabilities > 0
            else float('inf')
        )

        # Debt-to-Equity Ratio = Total Liabilities / Total Equity
        debt_to_equity = (
            total_liabilities / total_equity
            if total_equity > 0
            else float('inf')
        )

        # Debt-to-Assets Ratio = Total Liabilities / Total Assets
        debt_to_assets = (
            total_liabilities / total_assets
            if total_assets > 0
            else 0
        )

        # Equity Ratio = (Total Equity / Total Assets) * 100
        equity_ratio = (
            (total_equity / total_assets) * 100
            if total_assets > 0
            else 0
        )

        # Working Capital = Current Assets - Current Liabilities
        working_capital = total_current_assets - total_current_liabilities

        # 5. Liquidity Score berechnen (0-100)
        liquidity_score = _calculate_liquidity_score(
            current_ratio,
            quick_ratio,
            working_capital,
            total_assets
        )

        # 6. Leverage Score berechnen (0-100)
        leverage_score = _calculate_leverage_score(
            debt_to_equity,
            debt_to_assets,
            equity_ratio
        )

        # 7. Financial Health Score (0-100)
        balance_quality = 10 if is_balanced else 0
        financial_health_score = int(
            (liquidity_score * 0.5) + (leverage_score * 0.4) + balance_quality
        )

        # 8. Kategorisierung
        liquidity_status = _categorize_liquidity(current_ratio)
        leverage_status = _categorize_leverage(debt_to_equity)

        # 9. Warnungen prüfen
        warnings = _check_balance_sheet_warnings(
            is_balanced,
            balance_diff,
            current_ratio,
            quick_ratio,
            debt_to_equity,
            equity_ratio,
            assets_obj.cash,
            total_current_assets,
            total_equity
        )

        # 10. Empfehlungen generieren
        recommendation = _generate_balance_sheet_recommendation(
            financial_health_score,
            liquidity_status,
            leverage_status,
            current_ratio,
            total_equity
        )

        # 11. Result-Object erstellen
        result = BalanceSheetResult(
            date=date,
            assets={
                'current': {
                    'cash': assets_obj.cash,
                    'accounts_receivable': assets_obj.accounts_receivable,
                    'inventory': assets_obj.inventory,
                    'prepaid_expenses': assets_obj.prepaid_expenses,
                    'other_current': assets_obj.other_current
                },
                'fixed': {
                    'property': assets_obj.property,
                    'equipment': assets_obj.equipment,
                    'vehicles': assets_obj.vehicles,
                    'intangible_assets': assets_obj.intangible_assets,
                    'other_fixed': assets_obj.other_fixed
                }
            },
            liabilities={
                'current': {
                    'accounts_payable': liabilities_obj.accounts_payable,
                    'short_term_debt': liabilities_obj.short_term_debt,
                    'accrued_expenses': liabilities_obj.accrued_expenses,
                    'unearned_revenue': liabilities_obj.unearned_revenue,
                    'other_current': liabilities_obj.other_current
                },
                'long_term': {
                    'long_term_debt': liabilities_obj.long_term_debt,
                    'bonds_payable': liabilities_obj.bonds_payable,
                    'deferred_tax': liabilities_obj.deferred_tax,
                    'pension_obligations': liabilities_obj.pension_obligations,
                    'other_long_term': liabilities_obj.other_long_term
                }
            },
            equity={
                'share_capital': equity_obj.share_capital,
                'capital_reserves': equity_obj.capital_reserves,
                'retained_earnings': equity_obj.retained_earnings,
                'current_year_profit': equity_obj.current_year_profit
            },
            total_assets=total_assets,
            total_current_assets=total_current_assets,
            total_fixed_assets=total_fixed_assets,
            total_liabilities=total_liabilities,
            total_current_liabilities=total_current_liabilities,
            total_long_term_liabilities=total_long_term_liabilities,
            total_equity=total_equity,
            total_liabilities_and_equity=total_liabilities_and_equity,
            is_balanced=is_balanced,
            balance_difference=balance_diff,
            current_ratio=current_ratio,
            quick_ratio=quick_ratio,
            debt_to_equity_ratio=debt_to_equity,
            debt_to_assets_ratio=debt_to_assets,
            equity_ratio=equity_ratio,
            working_capital=working_capital,
            financial_health_score=financial_health_score,
            liquidity_score=liquidity_score,
            leverage_score=leverage_score,
            liquidity_status=liquidity_status,
            leverage_status=leverage_status,
            recommendation=recommendation,
            warnings=warnings
        )

        # 12. Output formatieren
        formatted_output = _format_balance_sheet_output(result)

        return {
            "result": result,
            "formatted_output": formatted_output,
            "raw_data": {
                "date": date,
                "total_assets": total_assets,
                "total_liabilities": total_liabilities,
                "total_equity": total_equity,
                "is_balanced": is_balanced,
                "financial_health_score": financial_health_score
            }
        }

    except Exception as e:
        raise ValueError(f"Balance Sheet Generierung fehlgeschlagen: {str(e)}")


def get_balance_sheet_tool_definition() -> dict:
    """
    Gibt Tool-Definition für Claude Agent SDK zurück.

    Returns:
        Dict mit Tool-Definition
    """
    return {
        "name": "generate_balance_sheet",
        "description": """Generiert vollständige Bilanz (Balance Sheet) nach GAAP/IFRS mit Financial Health Analyse.

Nutze dieses Tool wenn der User fragt nach:
- Bilanz, Balance Sheet, Vermögensübersicht
- Financial Position, Finanzielle Lage
- Assets & Liabilities Aufstellung
- Liquiditätsanalyse, Working Capital
- Verschuldungsgrad, Debt-to-Equity
- Eigenkapitalquote

Das Tool erstellt professionelle Bilanzen mit 6 Key Ratios und Financial Health Score.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "assets": {
                    "type": "object",
                    "description": "Assets (Aktiva) aufgeschlüsselt nach Current & Fixed",
                    "properties": {
                        "cash": {"type": "number", "description": "Kasse & Bank"},
                        "accounts_receivable": {"type": "number", "description": "Forderungen aus L&L"},
                        "inventory": {"type": "number", "description": "Vorräte/Lagerbestände"},
                        "prepaid_expenses": {"type": "number", "description": "Aktive Rechnungsabgrenzung"},
                        "other_current": {"type": "number", "description": "Sonstiges Umlaufvermögen"},
                        "property": {"type": "number", "description": "Grundstücke & Gebäude"},
                        "equipment": {"type": "number", "description": "Maschinen & Technische Anlagen"},
                        "vehicles": {"type": "number", "description": "Fuhrpark"},
                        "intangible_assets": {"type": "number", "description": "Immaterielle Vermögenswerte"},
                        "other_fixed": {"type": "number", "description": "Sonstiges Anlagevermögen"}
                    }
                },
                "liabilities": {
                    "type": "object",
                    "description": "Liabilities (Verbindlichkeiten) nach Current & Long-term",
                    "properties": {
                        "accounts_payable": {"type": "number", "description": "Verbindlichkeiten aus L&L"},
                        "short_term_debt": {"type": "number", "description": "Kurzfristige Kredite"},
                        "accrued_expenses": {"type": "number", "description": "Rückstellungen"},
                        "unearned_revenue": {"type": "number", "description": "Erhaltene Anzahlungen"},
                        "other_current": {"type": "number", "description": "Sonstige kurzfristige Verbindlichkeiten"},
                        "long_term_debt": {"type": "number", "description": "Langfristige Kredite"},
                        "bonds_payable": {"type": "number", "description": "Ausgegebene Anleihen"},
                        "deferred_tax": {"type": "number", "description": "Latente Steuerschulden"},
                        "pension_obligations": {"type": "number", "description": "Pensionsverpflichtungen"},
                        "other_long_term": {"type": "number", "description": "Sonstige langfristige Verbindlichkeiten"}
                    }
                },
                "equity": {
                    "type": "object",
                    "description": "Equity (Eigenkapital)",
                    "properties": {
                        "share_capital": {"type": "number", "description": "Gezeichnetes Kapital"},
                        "capital_reserves": {"type": "number", "description": "Kapitalrücklage"},
                        "retained_earnings": {"type": "number", "description": "Gewinnrücklagen"},
                        "current_year_profit": {"type": "number", "description": "Jahresüberschuss/-fehlbetrag"}
                    }
                },
                "date": {
                    "type": "string",
                    "description": "Bilanzstichtag (Format: YYYY-MM-DD)"
                }
            },
            "required": ["assets", "liabilities", "equity", "date"]
        }
    }


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    import asyncio

    print("Balance Sheet Generator Tool - Standalone Test")
    print("=" * 80)
    print("\nTesting Tool Definition...")

    tool_def = get_balance_sheet_tool_definition()
    print(f"✓ Tool Name: {tool_def['name']}")
    print(f"✓ Tool Description: {tool_def['description'][:100]}...")
    print(f"✓ Required Parameters: {tool_def['input_schema']['required']}")

    print("\n" + "=" * 80)
    print("Run 'python test_balance_sheet.py' for comprehensive testing with 4 scenarios.")
