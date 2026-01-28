"""
Financial Analysis Tools für den Dexter Agent.

Dieses Modul enthält alle spezialisierten Finanzanalyse-Tools:
- ROI Calculator: Return on Investment Berechnungen ✅ IMPLEMENTED
- Sales Forecaster: Verkaufsprognosen mit Trend-Analyse ✅ IMPLEMENTED
- P&L Calculator: Gewinn- und Verlustrechnungen ✅ IMPLEMENTED
- Balance Sheet Generator: Bilanz-Generierung und Kennzahlen-Analyse ✅ IMPLEMENTED
- Cash Flow Statement: Kapitalflussrechnung mit OCF/ICF/FCF ✅ IMPLEMENTED
- Break-Even Analysis: Gewinnschwellen-Analyse mit Scenario Planning ✅ IMPLEMENTED
"""

# Tools werden hier importiert sobald implementiert
from .roi_calculator import calculate_roi, ROIInput, ROIResult, get_roi_tool_definition
from .sales_forecaster import forecast_sales, SalesDataPoint, ForecastDataPoint, SalesForecastResult, get_sales_forecaster_tool_definition
from .pnl_calculator import calculate_pnl, OperatingExpenses, PnLResult, get_pnl_tool_definition
from .balance_sheet import generate_balance_sheet, Assets, Liabilities, Equity, BalanceSheetResult, get_balance_sheet_tool_definition
from .cash_flow_statement import generate_cash_flow_statement, OperatingActivities, InvestingActivities, FinancingActivities, CashFlowResult, get_cash_flow_tool_definition
from .break_even_analysis import analyze_break_even, BreakEvenInput, ScenarioAnalysis, BreakEvenResult, get_break_even_tool_definition

__all__ = [
    "calculate_roi",
    "ROIInput",
    "ROIResult",
    "get_roi_tool_definition",
    "forecast_sales",
    "SalesDataPoint",
    "ForecastDataPoint",
    "SalesForecastResult",
    "get_sales_forecaster_tool_definition",
    "calculate_pnl",
    "OperatingExpenses",
    "PnLResult",
    "get_pnl_tool_definition",
    "generate_balance_sheet",
    "Assets",
    "Liabilities",
    "Equity",
    "BalanceSheetResult",
    "get_balance_sheet_tool_definition",
    "generate_cash_flow_statement",
    "OperatingActivities",
    "InvestingActivities",
    "FinancingActivities",
    "CashFlowResult",
    "get_cash_flow_tool_definition",
    "analyze_break_even",
    "BreakEvenInput",
    "ScenarioAnalysis",
    "BreakEvenResult",
    "get_break_even_tool_definition",
]

__version__ = "6.0.0"
