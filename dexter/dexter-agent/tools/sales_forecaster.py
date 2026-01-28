"""
Sales Forecaster Tool - Verkaufsprognosen mit Trend-Analyse.

Dieses Tool erstellt Verkaufsprognosen basierend auf historischen Daten
mit linearer Regression, Konfidenzintervallen und optionaler Saisonalitäts-Anpassung.
"""

import math
import json
from dataclasses import dataclass, asdict
from typing import Any, Tuple, List, Optional
from datetime import datetime, timedelta
from dateutil import parser as date_parser
import sys
from pathlib import Path

# Füge Parent-Directory zum Path hinzu für Config-Import
sys.path.append(str(Path(__file__).parent.parent))

try:
    import numpy as np
except ImportError:
    raise ImportError(
        "numpy ist erforderlich für Sales Forecaster. "
        "Installiere mit: pip install numpy"
    )

try:
    from config import get_config
    config = get_config()
except ImportError:
    config = None


@dataclass
class SalesDataPoint:
    """Einzelner historischer Verkaufsdatenpunkt."""

    date: str          # Format: "YYYY-MM-DD" oder "YYYY-MM"
    amount: float      # Verkaufsbetrag in €

    def validate(self) -> Tuple[bool, str]:
        """
        Validiert Verkaufsdatenpunkt.

        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        # Prüfe Betrag
        if self.amount < 0:
            return False, f"Verkaufsbetrag kann nicht negativ sein: {self.amount}"

        # Prüfe Datum
        try:
            parsed_date = date_parser.parse(self.date)
            # Akzeptiere nur Daten bis heute
            if parsed_date > datetime.now():
                return False, f"Datum liegt in der Zukunft: {self.date}"
        except Exception as e:
            return False, f"Ungültiges Datumsformat: {self.date} ({str(e)})"

        return True, ""

    def get_parsed_date(self) -> datetime:
        """Parsed Datum als datetime-Objekt."""
        return date_parser.parse(self.date)


@dataclass
class ForecastDataPoint:
    """Prognostizierter Verkaufspunkt mit Konfidenzintervall."""

    date: str                   # Prognose-Datum
    predicted_amount: float     # Prognostizierter Betrag
    confidence_level: str       # "high", "medium", "low"
    lower_bound: float          # Untere Grenze (95% Konfidenz)
    upper_bound: float          # Obere Grenze (95% Konfidenz)


@dataclass
class SalesForecastResult:
    """Strukturiertes Sales Forecast-Ergebnis."""

    forecasts: List[ForecastDataPoint]  # Liste der Prognosen
    historical_average: float           # Durchschnitt historisch
    forecast_average: float             # Durchschnitt Prognose
    growth_rate_percentage: float       # Wachstumsrate in %
    trend_direction: str                # "upward", "stable", "downward"
    trend_strength: str                 # "strong", "moderate", "weak"
    confidence_score: int               # Gesamt-Konfidenz 0-100
    seasonality_detected: bool          # Saisonalität erkannt?
    recommendation: str                 # Strategische Empfehlung
    warnings: List[str]                 # Warnungen

    # Zusätzliche Metadaten
    historical_min: float
    historical_max: float
    volatility_percentage: float
    trend_slope: float
    r_squared: float


def _calculate_trend(sales_data: List[SalesDataPoint]) -> Tuple[float, float, float]:
    """
    Berechnet Trend mittels linearer Regression.

    Args:
        sales_data: Liste von Verkaufsdaten (chronologisch sortiert)

    Returns:
        Tuple[float, float, float]: (slope, intercept, r_squared)
    """
    # X-Werte: 0, 1, 2, ... (Zeitindex)
    x = np.arange(len(sales_data))

    # Y-Werte: Verkaufsbeträge
    y = np.array([point.amount for point in sales_data])

    # Lineare Regression: y = slope * x + intercept
    slope, intercept = np.polyfit(x, y, 1)

    # R² berechnen (Bestimmtheitsmaß)
    y_pred = slope * x + intercept
    ss_res = np.sum((y - y_pred) ** 2)  # Sum of Squares Residual
    ss_tot = np.sum((y - np.mean(y)) ** 2)  # Total Sum of Squares

    r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
    r_squared = max(0, min(1, r_squared))  # Clamp zwischen 0 und 1

    return float(slope), float(intercept), float(r_squared)


def _calculate_seasonality_factors(sales_data: List[SalesDataPoint]) -> Optional[List[float]]:
    """
    Berechnet monatliche Saisonalitäts-Faktoren.

    Benötigt mindestens 12 Monate Daten.

    Args:
        sales_data: Liste von Verkaufsdaten

    Returns:
        Liste von 12 Faktoren (einer pro Monat), oder None wenn zu wenig Daten
    """
    if len(sales_data) < 12:
        return None

    # Gruppiere nach Monat (1-12)
    monthly_groups = {i: [] for i in range(1, 13)}

    for point in sales_data:
        month = point.get_parsed_date().month
        monthly_groups[month].append(point.amount)

    # Berechne Durchschnitt pro Monat
    monthly_averages = {}
    for month, amounts in monthly_groups.items():
        if amounts:
            monthly_averages[month] = np.mean(amounts)

    # Wenn nicht alle Monate vorhanden, keine Saisonalität
    if len(monthly_averages) < 12:
        return None

    # Gesamt-Durchschnitt
    overall_avg = np.mean(list(monthly_averages.values()))

    # Faktoren berechnen (relativ zu Gesamt-Durchschnitt)
    factors = []
    for month in range(1, 13):
        factor = monthly_averages[month] / overall_avg if overall_avg != 0 else 1.0
        factors.append(factor)

    return factors


def _calculate_confidence_intervals(
    predicted: float,
    std_dev: float,
    months_ahead: int
) -> Tuple[float, float]:
    """
    Berechnet 95%-Konfidenzintervall für Prognose.

    Das Intervall wächst mit der Prognose-Distanz.

    Args:
        predicted: Prognostizierter Wert
        std_dev: Standardabweichung der historischen Daten
        months_ahead: Anzahl Monate in die Zukunft

    Returns:
        Tuple[float, float]: (lower_bound, upper_bound)
    """
    # Z-Score für 95% Konfidenz
    z_score = 1.96

    # Confidence Factor steigt mit Distanz (10% pro Monat)
    confidence_factor = 1.0 + (months_ahead * 0.1)

    # Margin of Error
    margin = z_score * std_dev * confidence_factor

    lower = max(0, predicted - margin)  # Keine negativen Verkäufe
    upper = predicted + margin

    return lower, upper


def _calculate_forecast_confidence(
    data_points: int,
    r_squared: float,
    volatility: float
) -> int:
    """
    Berechnet Gesamt-Konfidenz-Score (0-100).

    Kombiniert:
    - Anzahl historischer Datenpunkte (30%)
    - Trend-Stärke / R² (40%)
    - Volatilität (30%, weniger ist besser)

    Args:
        data_points: Anzahl historischer Datenpunkte
        r_squared: R² der linearen Regression (0-1)
        volatility: Volatilität in Prozent (CoV)

    Returns:
        Confidence Score zwischen 0 und 100
    """
    # Data Points Score (30 Punkte max)
    # Optimal: >= 12 Monate
    if data_points >= 12:
        data_score = 30
    elif data_points >= 6:
        data_score = 20 + ((data_points - 6) / 6) * 10
    else:
        data_score = (data_points / 6) * 20

    # R² Score (40 Punkte max)
    # R² ist bereits 0-1, direkt skalieren
    r_score = r_squared * 40

    # Volatility Score (30 Punkte max)
    # Niedrige Volatilität = höherer Score
    # 0% Volatilität = 30 Punkte, 50%+ = 0 Punkte
    if volatility <= 10:
        vol_score = 30
    elif volatility <= 20:
        vol_score = 25
    elif volatility <= 30:
        vol_score = 15
    elif volatility <= 50:
        vol_score = 5
    else:
        vol_score = 0

    total = int(data_score + r_score + vol_score)
    return max(0, min(100, total))


def _generate_forecast_recommendation(result: SalesForecastResult) -> str:
    """
    Generiert strategische Empfehlung basierend auf Forecast.

    Args:
        result: Forecast-Ergebnis

    Returns:
        Detaillierte Handlungsempfehlung
    """
    trend = result.trend_direction
    growth = result.growth_rate_percentage
    confidence = result.confidence_score
    strength = result.trend_strength

    # Starkes Wachstum (> 20%)
    if trend == "upward" and growth > 20:
        return (
            f"📈 **WACHSTUMS-CHANCE** - Starkes Wachstum von {growth:.1f}% prognostiziert!\n\n"
            f"**Empfohlene Maßnahmen:**\n"
            f"1. **Kapazitäten ausbauen**: Sicherstelle dass Produktion/Lager/Personal das Wachstum bewältigen kann\n"
            f"2. **Marketing skalieren**: Erfolgreiche Kanäle mit höherem Budget verstärken\n"
            f"3. **Inventory Management**: Stock-Levels für {result.forecast_average:.0f}€/Monat anpassen\n"
            f"4. **Cashflow-Planung**: Working Capital für Wachstum sichern\n"
            f"5. **Recruiting priorisieren**: Team rechtzeitig aufbauen\n\n"
            f"**Risiken:** Wachstum könnte Ressourcen überlasten. Frühzeitig skalieren!\n"
            f"**Konfidenz:** {confidence}/100 - {'Hohe' if confidence >= 70 else 'Moderate'} Verlässlichkeit"
        )

    # Moderates Wachstum (5-20%)
    elif trend == "upward" and growth > 5:
        return (
            f"✅ **STABILES WACHSTUM** - Gesundes Wachstum von {growth:.1f}% erwartet.\n\n"
            f"**Empfohlene Maßnahmen:**\n"
            f"1. **Optimierung**: Fokus auf Effizienz und Marge-Verbesserung\n"
            f"2. **A/B-Testing**: Experimente für Wachstumsbeschleunigung\n"
            f"3. **Kundenbindung**: Retention optimieren, Churn reduzieren\n"
            f"4. **Forecast-Monitoring**: Monatlich aktuelle Zahlen mit Prognose abgleichen\n"
            f"5. **Neue Vertriebskanäle**: Zusätzliche Wachstums-Hebel identifizieren\n\n"
            f"**Status:** Solides, nachhaltiges Wachstum. Weiter so!\n"
            f"**Konfidenz:** {confidence}/100"
        )

    # Stagnation (-5% bis +5%)
    elif trend == "stable" or (trend == "upward" and growth <= 5):
        return (
            f"⚠️ **STAGNATION** - Verkäufe bleiben flach ({growth:+.1f}%).\n\n"
            f"**Empfohlene Maßnahmen:**\n"
            f"1. **Root-Cause-Analyse**: Warum kein Wachstum? Markt? Produkt? Marketing?\n"
            f"2. **Wachstums-Initiativen**: Neue Features, Märkte oder Kundensegmente\n"
            f"3. **Pricing-Review**: Sind Preise wettbewerbsfähig und profitabel?\n"
            f"4. **Marketing-Mix überprüfen**: Welche Kanäle performen schlecht?\n"
            f"5. **Wettbewerbs-Analyse**: Wo verlieren wir Marktanteile?\n\n"
            f"**Warnung:** Stagnation ist oft Vorstufe zum Rückgang. Jetzt handeln!\n"
            f"**Konfidenz:** {confidence}/100"
        )

    # Leichter Rückgang (-5% bis -15%)
    elif trend == "downward" and growth > -15:
        return (
            f"📉 **RÜCKGANG ERWARTET** - Verkäufe sinken um {abs(growth):.1f}%.\n\n"
            f"**SOFORT-MASSNAHMEN:**\n"
            f"1. **Ursachen identifizieren**: Sales-Team-Feedback, Kunden-Interviews\n"
            f"2. **Reaktivierungs-Campaign**: Ehemalige Kunden zurückgewinnen\n"
            f"3. **Promo-Aktionen**: Rabatte/Bundles für kurzfristige Stabilisierung\n"
            f"4. **Cost-Control**: Kosten dem sinkenden Revenue anpassen\n"
            f"5. **Pivot prüfen**: Muss Strategie/Produkt angepasst werden?\n\n"
            f"**KRITISCH:** Trend muss gestoppt werden. Quartalsweise Review!\n"
            f"**Konfidenz:** {confidence}/100"
        )

    # Starker Rückgang (< -15%)
    else:
        return (
            f"🚨 **KRISENINTERVENTION NÖTIG** - Drastischer Rückgang von {abs(growth):.1f}%!\n\n"
            f"**NOTFALL-MASSNAHMEN:**\n"
            f"1. **Leadership-Meeting**: C-Level muss Krisenstrategie definieren\n"
            f"2. **Cashflow sichern**: Liquidität für mindestens 6 Monate garantieren\n"
            f"3. **Kosten massiv senken**: Nicht-essentielle Ausgaben streichen\n"
            f"4. **Produkt-Market-Fit überprüfen**: Ist das Produkt noch relevant?\n"
            f"5. **Strategic Options**: Pivot, Merger, neue Märkte evaluieren\n"
            f"6. **Stakeholder informieren**: Transparenz gegenüber Investoren/Board\n\n"
            f"**KRITISCH:** Ohne Intervention droht Business-Failure. SOFORT handeln!\n"
            f"**Konfidenz:** {confidence}/100 - "
            f"{'Prognose verlässlich' if confidence >= 60 else 'Daten mit Vorsicht interpretieren'}"
        )


def _check_forecast_warnings(
    result: SalesForecastResult,
    historical_count: int,
    volatility: float
) -> List[str]:
    """
    Prüft Forecast-Ergebnis auf Risiken und Anomalien.

    Args:
        result: Forecast-Ergebnis
        historical_count: Anzahl historischer Datenpunkte
        volatility: Volatilität in Prozent

    Returns:
        Liste von Warnmeldungen
    """
    warnings = []

    # Zu wenig historische Daten
    if historical_count < 6:
        warnings.append(
            f"📊 Nur {historical_count} Monate historische Daten. "
            f"Für verlässlichere Prognosen werden mindestens 6-12 Monate empfohlen."
        )

    # Hohe Volatilität
    if volatility > 30:
        warnings.append(
            f"⚠️ Hohe Volatilität ({volatility:.1f}%). "
            f"Verkäufe schwanken stark. Prognosen mit größerer Unsicherheit behaftet."
        )
    elif volatility > 50:
        warnings.append(
            f"🚨 Sehr hohe Volatilität ({volatility:.1f}%)! "
            f"Geschäft ist extrem unvorhersehbar. Prognosen nur als grobe Orientierung nutzen."
        )

    # Unrealistisches Wachstum
    if result.growth_rate_percentage > 200:
        warnings.append(
            f"📈 Extrem hohes Wachstum ({result.growth_rate_percentage:.1f}%) prognostiziert. "
            f"Prüfe ob Trend nachhaltig ist oder ob es einmalige Effekte gab."
        )
    elif result.growth_rate_percentage > 100:
        warnings.append(
            f"⚡ Sehr hohes Wachstum ({result.growth_rate_percentage:.1f}%). "
            f"Stelle sicher dass Ressourcen für Verdopplung vorhanden sind."
        )

    # Starker Rückgang
    if result.growth_rate_percentage < -30:
        warnings.append(
            f"📉 Starker Rückgang ({result.growth_rate_percentage:.1f}%) prognostiziert. "
            f"Krisenintervention erforderlich! Führungskräfte müssen sofort handeln."
        )

    # Negative Prognosen
    negative_forecasts = [f for f in result.forecasts if f.predicted_amount <= 0]
    if negative_forecasts:
        warnings.append(
            f"⛔ {len(negative_forecasts)} Prognose(n) sind negativ oder null. "
            f"Dies deutet auf Business-Failure hin. Modell ggf. nicht anwendbar."
        )

    # Schwacher Trend bei hoher Konfidenz-Behauptung
    if result.trend_strength == "weak" and result.confidence_score > 70:
        warnings.append(
            f"🤔 Trend ist schwach (R²={result.r_squared:.2f}), aber Konfidenz-Score hoch. "
            f"Prognosen mit Vorsicht interpretieren."
        )

    # Niedrige Konfidenz
    if result.confidence_score < 50:
        warnings.append(
            f"⚠️ Niedriger Konfidenz-Score ({result.confidence_score}/100). "
            f"Prognosen sind unsicher. Mehr historische Daten sammeln."
        )

    return warnings


def _format_forecast_output(
    result: SalesForecastResult,
    historical_data: List[dict],
    include_seasonality: bool
) -> str:
    """
    Formatiert Forecast-Ergebnis als strukturiertes Markdown.

    Args:
        result: Forecast-Ergebnis
        historical_data: Historische Verkaufsdaten
        include_seasonality: Wurde Saisonalität berücksichtigt?

    Returns:
        Formatierter Markdown-String
    """
    output = "# 📈 Verkaufsprognose\n\n"

    # Executive Summary
    output += "## Executive Summary\n\n"

    trend_emoji = "📈" if result.trend_direction == "upward" else "📉" if result.trend_direction == "downward" else "📊"
    growth_indicator = f"+{result.growth_rate_percentage:.2f}%" if result.growth_rate_percentage >= 0 else f"{result.growth_rate_percentage:.2f}%"

    summary = (
        f"Basierend auf **{len(historical_data)} Monaten** historischer Daten zeigen die Verkäufe "
        f"einen **{result.trend_direction}** Trend {trend_emoji} mit "
        f"**{result.trend_strength}** Stärke (R²={result.r_squared:.2f}). "
        f"Prognostiziertes Wachstum: **{growth_indicator}**. "
        f"Durchschnittliche Prognose: **{_format_currency(result.forecast_average)}**/Monat. "
        f"Konfidenz: **{result.confidence_score}/100**."
    )

    if result.seasonality_detected:
        summary += " Saisonalität wurde erkannt und berücksichtigt."

    output += f"{summary}\n\n"

    # Historische Daten
    output += "## 📊 Historische Daten\n\n"
    output += f"- **Durchschnitt**: {_format_currency(result.historical_average)}/Monat\n"
    output += f"- **Minimum**: {_format_currency(result.historical_min)}\n"
    output += f"- **Maximum**: {_format_currency(result.historical_max)}\n"

    first_date = historical_data[0]['date']
    last_date = historical_data[-1]['date']
    output += f"- **Zeitraum**: {first_date} bis {last_date}\n"
    output += f"- **Datenpunkte**: {len(historical_data)} Monate\n"
    output += f"- **Volatilität**: {result.volatility_percentage:.1f}% (CoV)\n\n"

    # Trend-Analyse
    output += "## 🔍 Trend-Analyse\n\n"
    output += "| Metrik | Wert | Bewertung |\n"
    output += "|--------|------|----------|\n"

    trend_icon = "📈" if result.trend_direction == "upward" else "📉" if result.trend_direction == "downward" else "📊"
    output += f"| **Richtung** | {result.trend_direction.capitalize()} {trend_icon} | - |\n"

    strength_icon = "💪" if result.trend_strength == "strong" else "👍" if result.trend_strength == "moderate" else "🤷"
    output += f"| **Stärke** | {result.trend_strength.capitalize()} {strength_icon} | R²={result.r_squared:.3f} |\n"

    growth_icon = "✅" if result.growth_rate_percentage > 10 else "⚠️" if result.growth_rate_percentage > 0 else "❌"
    output += f"| **Wachstumsrate** | {growth_indicator} | {growth_icon} |\n"

    conf_icon = "✅" if result.confidence_score >= 70 else "⚠️" if result.confidence_score >= 50 else "❌"
    output += f"| **Konfidenz** | {result.confidence_score}/100 | {conf_icon} |\n"

    if result.seasonality_detected:
        output += f"| **Saisonalität** | Erkannt ✓ | Berücksichtigt |\n"
    elif include_seasonality:
        output += f"| **Saisonalität** | Nicht erkennbar | Zu wenig Daten |\n"

    output += "\n"

    # Prognose-Tabelle
    output += f"## 🔮 Prognose für nächste {len(result.forecasts)} Monate\n\n"
    output += "| Monat | Prognose | Konfidenz | Bereich (95%) |\n"
    output += "|-------|----------|-----------|---------------|\n"

    for forecast in result.forecasts:
        conf_badge = "🟢" if forecast.confidence_level == "high" else "🟡" if forecast.confidence_level == "medium" else "🔴"
        output += (
            f"| {forecast.date} | {_format_currency(forecast.predicted_amount)} | "
            f"{forecast.confidence_level.capitalize()} {conf_badge} | "
            f"{_format_currency(forecast.lower_bound)} - {_format_currency(forecast.upper_bound)} |\n"
        )

    output += f"\n**Durchschnittliche Prognose**: {_format_currency(result.forecast_average)}/Monat\n\n"

    # Visualisierung
    output += "## 📊 Visualisierung\n\n"
    output += "```\n"
    output += _create_forecast_chart(historical_data, result.forecasts)
    output += "```\n\n"

    # Interpretation
    output += "## 📋 Interpretation\n\n"

    if result.trend_direction == "upward":
        if result.trend_strength == "strong":
            interp = (
                f"Die Verkäufe zeigen einen **starken Aufwärtstrend** (R²={result.r_squared:.2f}). "
                f"Das prognostizierte Wachstum von {growth_indicator} ist gut durch historische Daten gestützt. "
                f"Mit einer Konfidenz von {result.confidence_score}/100 ist diese Prognose verlässlich."
            )
        else:
            interp = (
                f"Die Verkäufe wachsen, aber der Trend ist **{result.trend_strength}** (R²={result.r_squared:.2f}). "
                f"Das Wachstum von {growth_indicator} könnte volatil sein. "
                f"Regelmäßiges Monitoring empfohlen."
            )
    elif result.trend_direction == "downward":
        interp = (
            f"⚠️ Die Verkäufe zeigen einen **Abwärtstrend** mit einem Rückgang von {abs(result.growth_rate_percentage):.1f}%. "
            f"Dies erfordert sofortige Aufmerksamkeit und Gegenmaßnahmen. "
            f"Die Trend-Stärke ist {result.trend_strength}, was bedeutet dass der Rückgang "
            f"{'klar erkennbar' if result.trend_strength != 'weak' else 'möglicherweise reversibel'} ist."
        )
    else:
        interp = (
            f"Die Verkäufe sind **stabil** mit minimaler Veränderung ({growth_indicator}). "
            f"Weder Wachstum noch Rückgang sind signifikant. "
            f"Für langfristigen Erfolg sollten Wachstums-Initiativen gestartet werden."
        )

    output += f"{interp}\n\n"

    # Empfehlung
    output += "## 💡 Strategische Empfehlung\n\n"
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
        "tool": "sales_forecaster",
        "input": {
            "historical_data_points": len(historical_data),
            "forecast_months": len(result.forecasts),
            "seasonality_included": include_seasonality
        },
        "historical_stats": {
            "average": round(result.historical_average, 2),
            "min": round(result.historical_min, 2),
            "max": round(result.historical_max, 2),
            "volatility_percent": round(result.volatility_percentage, 2)
        },
        "trend": {
            "direction": result.trend_direction,
            "strength": result.trend_strength,
            "slope": round(result.trend_slope, 2),
            "r_squared": round(result.r_squared, 3),
            "growth_rate_percent": round(result.growth_rate_percentage, 2)
        },
        "forecast": {
            "average": round(result.forecast_average, 2),
            "confidence_score": result.confidence_score,
            "seasonality_detected": result.seasonality_detected,
            "predictions": [
                {
                    "date": f.date,
                    "amount": round(f.predicted_amount, 2),
                    "confidence": f.confidence_level,
                    "range": [round(f.lower_bound, 2), round(f.upper_bound, 2)]
                }
                for f in result.forecasts
            ]
        }
    }

    output += json.dumps(raw_data, indent=2, ensure_ascii=False)
    output += "\n```\n"

    return output


def _create_forecast_chart(
    historical_data: List[dict],
    forecasts: List[ForecastDataPoint]
) -> str:
    """
    Erstellt ASCII-Chart mit historischen Daten + Prognosen.

    Args:
        historical_data: Historische Verkaufsdaten
        forecasts: Prognosen

    Returns:
        ASCII-Chart als String
    """
    # Kombiniere alle Datenpunkte
    all_amounts = [d['amount'] for d in historical_data] + [f.predicted_amount for f in forecasts]
    min_amount = min(all_amounts)
    max_amount = max(all_amounts)
    amount_range = max_amount - min_amount if max_amount != min_amount else max_amount

    chart = "Sales Timeline (Historical + Forecast):\n\n"

    # Y-Achse Skala (5 Levels)
    levels = 5
    for i in range(levels, -1, -1):
        value = min_amount + (amount_range * i / levels)
        chart += f"{_format_currency(value):>12} │"

        # Zeige Datenpunkte auf diesem Level
        for j, data in enumerate(historical_data + [{"amount": f.predicted_amount, "date": f.date} for f in forecasts]):
            normalized = (data['amount'] - min_amount) / amount_range if amount_range > 0 else 0.5
            level_normalized = i / levels

            if abs(normalized - level_normalized) < 0.1:
                if j < len(historical_data):
                    chart += "●"  # Historisch
                else:
                    chart += "○"  # Prognose
            else:
                chart += " "

        chart += "\n"

    # X-Achse
    chart += " " * 13 + "└" + "─" * (len(historical_data) + len(forecasts)) + "\n"
    chart += " " * 14 + "←" + f" {len(historical_data)} hist " + "| " + f"{len(forecasts)} forecast →" + "\n\n"

    chart += "Legende: ● = Historische Daten | ○ = Prognose\n"

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
async def forecast_sales(
    historical_sales: List[dict],
    forecast_months: int,
    include_seasonality: bool = False
) -> dict[str, Any]:
    """
    Erstellt Verkaufsprognose mit Trend-Analyse.

    Diese Funktion analysiert historische Verkaufsdaten und erstellt Prognosen mit:
    - Linearer Regression für Trend
    - Konfidenzintervallen (95%)
    - Optional: Saisonalitäts-Anpassung
    - Wachstumsraten und Volatilität
    - Strategischen Empfehlungen

    Args:
        historical_sales: Liste von Verkaufsdaten
            Format: [{"date": "2025-01-15", "amount": 120000}, ...]
            Min. 3 Datenpunkte erforderlich
        forecast_months: Anzahl Monate für Prognose (1-24, optimal 1-12)
        include_seasonality: Optional Saisonalitäts-Adjustment (benötigt >= 12 Monate Daten)

    Returns:
        Dictionary mit:
        - result: SalesForecastResult mit allen Kennzahlen
        - formatted_output: Strukturiertes Markdown

    Example:
        >>> result = await forecast_sales(
        ...     historical_sales=[
        ...         {"date": "2024-01", "amount": 100000},
        ...         {"date": "2024-02", "amount": 110000},
        ...         {"date": "2024-03", "amount": 125000}
        ...     ],
        ...     forecast_months=3
        ... )
    """
    # 1. Input validieren
    if not historical_sales:
        return {
            "error": "Keine historischen Daten angegeben",
            "formatted_output": "# ❌ Forecast-Fehler\n\nKeine historischen Verkaufsdaten vorhanden."
        }

    if len(historical_sales) < 3:
        return {
            "error": "Mindestens 3 historische Datenpunkte erforderlich",
            "formatted_output": (
                "# ❌ Forecast-Fehler\n\n"
                f"**Zu wenig Daten**: Nur {len(historical_sales)} Datenpunkt(e) vorhanden.\n\n"
                "Für eine Verkaufsprognose werden **mindestens 3 Monate** historische Daten benötigt.\n"
                "Optimal sind 6-12 Monate für verlässliche Prognosen."
            )
        }

    if forecast_months < 1:
        return {
            "error": "Forecast-Horizont muss mindestens 1 Monat sein",
            "formatted_output": "# ❌ Forecast-Fehler\n\nForecast-Horizont muss mindestens 1 Monat betragen."
        }

    if forecast_months > 24:
        return {
            "error": "Forecast-Horizont zu lang (max. 24 Monate)",
            "formatted_output": (
                "# ❌ Forecast-Fehler\n\n"
                f"Forecast-Horizont von {forecast_months} Monaten ist zu lang.\n\n"
                "Maximum: 24 Monate. Empfohlen: 3-12 Monate für verlässliche Prognosen."
            )
        }

    # Konvertiere zu SalesDataPoint und validiere
    sales_data = []
    for i, data in enumerate(historical_sales):
        if 'date' not in data or 'amount' not in data:
            return {
                "error": f"Datenpunkt {i+1} fehlen 'date' oder 'amount'",
                "formatted_output": (
                    f"# ❌ Forecast-Fehler\n\n"
                    f"Datenpunkt {i+1} ist ungültig. Erwartetes Format:\n"
                    f'```json\n{{"date": "2025-01", "amount": 120000}}```'
                )
            }

        point = SalesDataPoint(date=data['date'], amount=float(data['amount']))
        is_valid, error_msg = point.validate()

        if not is_valid:
            return {
                "error": error_msg,
                "formatted_output": f"# ❌ Forecast-Fehler\n\n**Validierung fehlgeschlagen**: {error_msg}"
            }

        sales_data.append(point)

    # Sortiere chronologisch
    sales_data.sort(key=lambda x: x.get_parsed_date())

    # 2. Historische Daten analysieren
    amounts = np.array([point.amount for point in sales_data])

    historical_avg = float(np.mean(amounts))
    historical_min = float(np.min(amounts))
    historical_max = float(np.max(amounts))
    std_dev = float(np.std(amounts))

    # Volatilität als Coefficient of Variation (CoV)
    volatility_pct = (std_dev / historical_avg * 100) if historical_avg != 0 else 0

    # 3. Trend-Analyse (Lineare Regression)
    slope, intercept, r_squared = _calculate_trend(sales_data)

    # Trend-Richtung bestimmen
    # Normalisiere Slope relativ zum Durchschnitt
    normalized_slope = (slope / historical_avg * 100) if historical_avg != 0 else 0

    if normalized_slope > 0.5:  # > 0.5% Wachstum pro Monat
        trend_direction = "upward"
    elif normalized_slope < -0.5:  # < -0.5% Rückgang pro Monat
        trend_direction = "downward"
    else:
        trend_direction = "stable"

    # Trend-Stärke basierend auf R²
    if r_squared > 0.7:
        trend_strength = "strong"
    elif r_squared > 0.4:
        trend_strength = "moderate"
    else:
        trend_strength = "weak"

    # 4. Saisonalität berechnen (optional)
    seasonality_factors = None
    seasonality_detected = False

    if include_seasonality and len(sales_data) >= 12:
        seasonality_factors = _calculate_seasonality_factors(sales_data)
        if seasonality_factors:
            seasonality_detected = True

    # 5. Prognosen generieren
    forecasts = []
    last_date = sales_data[-1].get_parsed_date()

    for month_ahead in range(1, forecast_months + 1):
        # Nächstes Datum
        forecast_date = last_date + timedelta(days=30 * month_ahead)
        date_str = forecast_date.strftime("%Y-%m")

        # Basis-Prognose aus Trend-Linie
        t = len(sales_data) + month_ahead - 1
        predicted = slope * t + intercept

        # Saisonalitäts-Anpassung
        if seasonality_factors:
            month_index = forecast_date.month - 1  # 0-11
            seasonal_factor = seasonality_factors[month_index]
            predicted *= seasonal_factor

        # Konfidenzintervall
        lower, upper = _calculate_confidence_intervals(predicted, std_dev, month_ahead)

        # Confidence Level
        if month_ahead <= 3:
            conf_level = "high"
        elif month_ahead <= 6:
            conf_level = "medium"
        else:
            conf_level = "low"

        forecast_point = ForecastDataPoint(
            date=date_str,
            predicted_amount=round(predicted, 2),
            confidence_level=conf_level,
            lower_bound=round(lower, 2),
            upper_bound=round(upper, 2)
        )

        forecasts.append(forecast_point)

    # 6. Gesamt-Statistiken
    forecast_avg = np.mean([f.predicted_amount for f in forecasts])

    # Wachstumsrate
    growth_rate = ((forecast_avg - historical_avg) / historical_avg * 100) if historical_avg != 0 else 0

    # 7. Konfidenz-Score
    confidence_score = _calculate_forecast_confidence(
        data_points=len(sales_data),
        r_squared=r_squared,
        volatility=volatility_pct
    )

    # 8. Ergebnis erstellen
    result = SalesForecastResult(
        forecasts=forecasts,
        historical_average=round(historical_avg, 2),
        forecast_average=round(forecast_avg, 2),
        growth_rate_percentage=round(growth_rate, 2),
        trend_direction=trend_direction,
        trend_strength=trend_strength,
        confidence_score=confidence_score,
        seasonality_detected=seasonality_detected,
        recommendation="",  # Wird gleich gesetzt
        warnings=[],        # Wird gleich gesetzt
        historical_min=round(historical_min, 2),
        historical_max=round(historical_max, 2),
        volatility_percentage=round(volatility_pct, 2),
        trend_slope=round(slope, 2),
        r_squared=round(r_squared, 3)
    )

    # 9. Empfehlung generieren
    result.recommendation = _generate_forecast_recommendation(result)

    # 10. Warnungen prüfen
    result.warnings = _check_forecast_warnings(result, len(sales_data), volatility_pct)

    # 11. Output formatieren
    markdown_output = _format_forecast_output(result, historical_sales, include_seasonality)

    return {
        "result": asdict(result),
        "formatted_output": markdown_output,
        "success": True
    }


# Tool-Definition für Claude Agent SDK
def get_sales_forecaster_tool_definition() -> dict:
    """
    Gibt Tool-Definition für Claude Agent SDK zurück.

    Returns:
        Tool-Definition Dictionary
    """
    return {
        "name": "forecast_sales",
        "description": (
            "Erstellt Verkaufsprognosen basierend auf historischen Daten.\n\n"
            "Nutze dieses Tool wenn der User fragt nach:\n"
            "- Sales Forecasting, Verkaufsprognosen\n"
            "- 'Wie entwickeln sich die Verkäufe?'\n"
            "- Umsatzplanung, Revenue Forecasting\n"
            "- Trend-Analysen, Wachstumsprognosen\n\n"
            "Das Tool nutzt lineare Regression mit optionaler Saisonalitäts-Anpassung."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "historical_sales": {
                    "type": "array",
                    "description": (
                        "Liste historischer Verkaufsdaten. "
                        'Format: [{"date": "2025-01", "amount": 120000}, ...]. '
                        "Mindestens 3 Datenpunkte erforderlich."
                    ),
                    "items": {
                        "type": "object",
                        "properties": {
                            "date": {"type": "string"},
                            "amount": {"type": "number"}
                        }
                    }
                },
                "forecast_months": {
                    "type": "integer",
                    "description": "Anzahl Monate für Prognose (1-24, optimal 3-12)"
                },
                "include_seasonality": {
                    "type": "boolean",
                    "description": "Saisonalität berücksichtigen? (benötigt >= 12 Monate Daten)",
                    "default": False
                }
            },
            "required": ["historical_sales", "forecast_months"]
        }
    }


# Testing
if __name__ == "__main__":
    import asyncio

    print("=" * 80)
    print("SALES FORECASTER - TEST SCENARIOS")
    print("=" * 80)

    async def run_tests():
        # Test 1: Wachstums-Trend (positiver Trend, starke Korrelation)
        print("\n\n### TEST 1: Starkes Wachstum ###\n")
        result1 = await forecast_sales(
            historical_sales=[
                {"date": "2024-01", "amount": 100000},
                {"date": "2024-02", "amount": 110000},
                {"date": "2024-03", "amount": 125000},
                {"date": "2024-04", "amount": 135000},
                {"date": "2024-05", "amount": 150000},
                {"date": "2024-06", "amount": 165000},
            ],
            forecast_months=6
        )
        print(result1['formatted_output'])

        # Test 2: Stabiler Trend
        print("\n\n" + "=" * 80)
        print("### TEST 2: Stabiler Trend ###\n")
        result2 = await forecast_sales(
            historical_sales=[
                {"date": "2024-01", "amount": 50000},
                {"date": "2024-02", "amount": 52000},
                {"date": "2024-03", "amount": 49000},
                {"date": "2024-04", "amount": 51000},
                {"date": "2024-05", "amount": 50500},
                {"date": "2024-06", "amount": 49500},
            ],
            forecast_months=4
        )
        print(result2['formatted_output'])

        # Test 3: Rückgang
        print("\n\n" + "=" * 80)
        print("### TEST 3: Rückgang ###\n")
        result3 = await forecast_sales(
            historical_sales=[
                {"date": "2024-01", "amount": 80000},
                {"date": "2024-02", "amount": 75000},
                {"date": "2024-03", "amount": 68000},
                {"date": "2024-04", "amount": 62000},
                {"date": "2024-05", "amount": 55000},
            ],
            forecast_months=3
        )
        print(result3['formatted_output'])

        # Test 4: Saisonalität (12 Monate mit Muster)
        print("\n\n" + "=" * 80)
        print("### TEST 4: Saisonalität ###\n")
        result4 = await forecast_sales(
            historical_sales=[
                {"date": "2023-01", "amount": 60000},
                {"date": "2023-02", "amount": 65000},
                {"date": "2023-03", "amount": 70000},
                {"date": "2023-04", "amount": 80000},
                {"date": "2023-05", "amount": 90000},
                {"date": "2023-06", "amount": 100000},
                {"date": "2023-07", "amount": 110000},
                {"date": "2023-08", "amount": 105000},
                {"date": "2023-09", "amount": 95000},
                {"date": "2023-10", "amount": 85000},
                {"date": "2023-11", "amount": 120000},  # Black Friday
                {"date": "2023-12", "amount": 150000},  # Weihnachten
            ],
            forecast_months=6,
            include_seasonality=True
        )
        print(result4['formatted_output'])

    # Run tests
    asyncio.run(run_tests())

    print("\n\n" + "=" * 80)
    print("TESTS COMPLETED")
    print("=" * 80)
