"""
Zentrale Konfiguration für den Dexter Financial Analyst Agent.

Dieses Modul verwaltet alle Konfigurationsparameter, API-Zugangsdaten,
Finanz-Kennzahlen-Schwellenwerte und Verzeichnispfade.
"""

import os
from pathlib import Path
from typing import Optional
from dataclasses import dataclass
from dotenv import load_dotenv

# Lade Environment-Variablen aus .env Datei
load_dotenv()


@dataclass
class FinancialThresholds:
    """Schwellenwerte für Finanzkennzahlen zur Bewertung der Unternehmensgesundheit."""

    # ROI Schwellenwerte (Return on Investment in Prozent)
    roi_excellent: float = 20.0  # Exzellente Rendite
    roi_good: float = 10.0       # Gute Rendite
    roi_acceptable: float = 5.0  # Akzeptable Rendite

    # Profitabilitätskennzahlen (in Prozent)
    gross_margin_healthy: float = 40.0      # Gesunde Bruttomarge
    net_margin_healthy: float = 15.0        # Gesunde Nettomarge
    operating_margin_healthy: float = 20.0  # Gesunde Betriebsmarge

    # Liquiditätskennzahlen
    current_ratio_healthy: float = 2.0  # Liquidität 1. Grades
    quick_ratio_healthy: float = 1.0    # Liquidität 2. Grades (Quick Ratio)

    # Verschuldungskennzahlen
    debt_to_equity_healthy: float = 1.5   # Gesundes Verhältnis Schulden zu Eigenkapital
    debt_to_assets_healthy: float = 0.5   # Gesundes Verhältnis Schulden zu Vermögen

    # Sales Forecast Thresholds
    forecast_confidence_threshold: float = 0.75  # Mindest-Konfidenz für Prognosen
    min_data_points_for_forecast: int = 3        # Mindestanzahl Datenpunkte


@dataclass
class ModelConfig:
    """Konfiguration für das OpenAI-Sprachmodell."""

    model_name: str = "gpt-4-turbo-preview"
    temperature: float = 0.0  # Konsistente, deterministische Berechnungen
    max_tokens: int = 4096

    def __post_init__(self):
        """Validiere Modell-Parameter."""
        if not 0.0 <= self.temperature <= 1.0:
            raise ValueError("Temperature muss zwischen 0.0 und 1.0 liegen")
        if self.max_tokens <= 0:
            raise ValueError("max_tokens muss positiv sein")


@dataclass
class OutputConfig:
    """Konfiguration für Output-Formatierung."""

    decimal_places: int = 2
    currency_symbol: str = "€"
    date_format: str = "%Y-%m-%d"
    percentage_format: str = "{:.2f}%"

    def format_currency(self, amount: float) -> str:
        """Formatiere Geldbetrag mit Währungssymbol."""
        return f"{self.currency_symbol}{amount:,.{self.decimal_places}f}"

    def format_percentage(self, value: float) -> str:
        """Formatiere Prozentwert."""
        return self.percentage_format.format(value)

    def round_financial(self, value: float) -> float:
        """Runde Finanzkennzahl auf konfigurierte Dezimalstellen."""
        return round(value, self.decimal_places)


class DexterConfig:
    """
    Zentrale Konfigurationsklasse für den Dexter Financial Analyst Agent.

    Diese Klasse lädt alle Konfigurationsparameter aus Environment-Variablen
    und stellt sie strukturiert zur Verfügung.
    """

    def __init__(self):
        """Initialisiere Konfiguration aus Environment-Variablen."""

        # API-Konfiguration
        self.api_key: str = self._get_required_env("OPENAI_API_KEY")

        # Agent-Identität
        self.agent_name: str = os.getenv("AGENT_NAME", "Dexter")
        self.agent_role: str = os.getenv("AGENT_ROLE", "Financial Analyst")

        # Verzeichnisse
        self.base_dir: Path = Path(__file__).parent
        self.data_dir: Path = self._resolve_path(os.getenv("DATA_DIR", "./data"))
        self.reports_dir: Path = self._resolve_path(os.getenv("REPORTS_DIR", "./reports"))

        # Erstelle Verzeichnisse falls nicht vorhanden
        self.data_dir.mkdir(exist_ok=True, parents=True)
        self.reports_dir.mkdir(exist_ok=True, parents=True)

        # Model-Konfiguration
        self.model = ModelConfig(
            model_name=os.getenv("MODEL_NAME", "gpt-4-turbo-preview"),
            temperature=float(os.getenv("TEMPERATURE", "0.0")),
            max_tokens=int(os.getenv("MAX_TOKENS", "4096"))
        )

        # Output-Konfiguration
        self.output = OutputConfig(
            decimal_places=int(os.getenv("DECIMAL_PLACES", "2")),
            currency_symbol=os.getenv("CURRENCY_SYMBOL", "€"),
            date_format=os.getenv("DATE_FORMAT", "%Y-%m-%d")
        )

        # Financial Thresholds
        self.thresholds = FinancialThresholds(
            roi_excellent=float(os.getenv("ROI_EXCELLENT_THRESHOLD", "20.0")),
            roi_good=float(os.getenv("ROI_GOOD_THRESHOLD", "10.0")),
            roi_acceptable=float(os.getenv("ROI_ACCEPTABLE_THRESHOLD", "5.0")),
            gross_margin_healthy=float(os.getenv("GROSS_MARGIN_HEALTHY", "40.0")),
            net_margin_healthy=float(os.getenv("NET_MARGIN_HEALTHY", "15.0")),
            operating_margin_healthy=float(os.getenv("OPERATING_MARGIN_HEALTHY", "20.0")),
            current_ratio_healthy=float(os.getenv("CURRENT_RATIO_HEALTHY", "2.0")),
            quick_ratio_healthy=float(os.getenv("QUICK_RATIO_HEALTHY", "1.0")),
            debt_to_equity_healthy=float(os.getenv("DEBT_TO_EQUITY_HEALTHY", "1.5")),
            debt_to_assets_healthy=float(os.getenv("DEBT_TO_ASSETS_HEALTHY", "0.5")),
            forecast_confidence_threshold=float(os.getenv("FORECAST_CONFIDENCE_THRESHOLD", "0.75")),
            min_data_points_for_forecast=int(os.getenv("MIN_DATA_POINTS_FOR_FORECAST", "3"))
        )

        # Logging
        self.log_level: str = os.getenv("LOG_LEVEL", "INFO")
        self.debug_mode: bool = os.getenv("ENABLE_DEBUG_MODE", "False").lower() == "true"

    def _get_required_env(self, key: str) -> str:
        """
        Hole erforderliche Environment-Variable.

        Args:
            key: Name der Environment-Variable

        Returns:
            Wert der Variable

        Raises:
            ValueError: Wenn Variable nicht gesetzt ist
        """
        value = os.getenv(key)
        if not value:
            raise ValueError(
                f"Erforderliche Environment-Variable '{key}' ist nicht gesetzt. "
                f"Bitte .env Datei erstellen (siehe .env.example)"
            )
        return value

    def _resolve_path(self, path: str) -> Path:
        """
        Löse Pfad relativ zum Projektverzeichnis auf.

        Args:
            path: Relativer oder absoluter Pfad

        Returns:
            Aufgelöster absoluter Pfad
        """
        p = Path(path)
        if p.is_absolute():
            return p
        return (self.base_dir / p).resolve()

    def get_data_file(self, filename: str) -> Path:
        """Hole Pfad zu Datei im Data-Verzeichnis."""
        return self.data_dir / filename

    def get_report_file(self, filename: str) -> Path:
        """Hole Pfad zu Datei im Reports-Verzeichnis."""
        return self.reports_dir / filename

    def validate(self) -> bool:
        """
        Validiere Konfiguration.

        Returns:
            True wenn Konfiguration valide ist

        Raises:
            ValueError: Bei ungültiger Konfiguration
        """
        # Prüfe API Key Format (beginnt mit sk-)
        if not self.api_key.startswith("sk-"):
            raise ValueError("OPENAI_API_KEY scheint ungültig zu sein (sollte mit 'sk-' beginnen)")

        # Prüfe Verzeichnisse
        if not self.data_dir.exists():
            raise ValueError(f"Data-Verzeichnis existiert nicht: {self.data_dir}")
        if not self.reports_dir.exists():
            raise ValueError(f"Reports-Verzeichnis existiert nicht: {self.reports_dir}")

        return True

    def __repr__(self) -> str:
        """String-Repräsentation der Konfiguration (ohne API Key)."""
        return (
            f"DexterConfig(\n"
            f"  agent='{self.agent_name}',\n"
            f"  model='{self.model.model_name}',\n"
            f"  temperature={self.model.temperature},\n"
            f"  data_dir='{self.data_dir}',\n"
            f"  reports_dir='{self.reports_dir}'\n"
            f")"
        )


# Singleton-Instanz für einfachen Import
_config: Optional[DexterConfig] = None


def get_config() -> DexterConfig:
    """
    Hole Singleton-Instanz der Konfiguration.

    Returns:
        DexterConfig Instanz
    """
    global _config
    if _config is None:
        _config = DexterConfig()
        _config.validate()
    return _config


# Für direkten Import: from config import config
config = get_config()


if __name__ == "__main__":
    # Test der Konfiguration
    try:
        cfg = get_config()
        print("✓ Konfiguration erfolgreich geladen:")
        print(cfg)
        print(f"\n✓ API Key gesetzt: {'Ja' if cfg.api_key else 'Nein'}")
        print(f"✓ Data Directory: {cfg.data_dir}")
        print(f"✓ Reports Directory: {cfg.reports_dir}")
        print(f"✓ Model: {cfg.model.model_name}")
        print(f"✓ Temperature: {cfg.model.temperature}")
        print(f"\nFinancial Thresholds:")
        print(f"  - ROI Excellent: {cfg.thresholds.roi_excellent}%")
        print(f"  - Gross Margin Healthy: {cfg.thresholds.gross_margin_healthy}%")
        print(f"  - Current Ratio Healthy: {cfg.thresholds.current_ratio_healthy}")
    except ValueError as e:
        print(f"✗ Fehler beim Laden der Konfiguration: {e}")
        print("\nBitte erstelle eine .env Datei basierend auf .env.example")
