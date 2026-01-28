# Dexter Agent - Setup Instructions

## 🎯 OpenAI Migration Complete!

The Dexter Agent has been successfully migrated from Anthropic Claude to OpenAI GPT-4.

---

## ✅ What's Been Done

### 1. **Code Migration**
- ✅ Replaced `anthropic` SDK with `openai` SDK
- ✅ Updated tool definitions from Claude format to OpenAI function calling
- ✅ Migrated message handling to OpenAI format
- ✅ Implemented service layer pattern for better architecture

### 2. **New Components Created**
- ✅ `lib/ai/openai_service.py` - OpenAI API wrapper
- ✅ `lib/ai/error_handler.py` - Retry logic & error handling
- ✅ `lib/ai/tool_converter.py` - Tool definitions in OpenAI format
- ✅ `MIGRATION_GUIDE.md` - Complete migration documentation
- ✅ `test_openai_integration.py` - Integration test suite

### 3. **Configuration Updates**
- ✅ `.env.example` updated for `OPENAI_API_KEY`
- ✅ `config.py` updated to use OpenAI
- ✅ `requirements.txt` updated with OpenAI SDK

### 4. **Backup Created**
- ✅ Original `main.py` backed up as `main_anthropic_backup.py`

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd C:\Users\luis\Desktop\Agents\dexter-agent
pip install -r requirements.txt
```

**Expected packages:**
- `openai>=1.0.0` (NEW)
- `numpy>=1.26.0`
- `pandas>=2.2.0`
- `python-dotenv>=1.0.0`
- And other existing dependencies...

### Step 2: Create `.env` File

Copy the example file:

```bash
cp .env.example .env
```

Or manually create `C:\Users\luis\Desktop\Agents\dexter-agent\.env`:

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Model Configuration
MODEL_NAME=gpt-4-turbo-preview
TEMPERATURE=0.0
MAX_TOKENS=4096

# Agent Configuration
AGENT_NAME=Dexter
AGENT_ROLE=Financial Analyst

# Directory Configuration
DATA_DIR=./data
REPORTS_DIR=./reports

# Financial Analysis Thresholds (unchanged)
ROI_EXCELLENT_THRESHOLD=20.0
ROI_GOOD_THRESHOLD=10.0
ROI_ACCEPTABLE_THRESHOLD=5.0

GROSS_MARGIN_HEALTHY=40.0
NET_MARGIN_HEALTHY=15.0
OPERATING_MARGIN_HEALTHY=20.0

CURRENT_RATIO_HEALTHY=2.0
QUICK_RATIO_HEALTHY=1.0

DEBT_TO_EQUITY_HEALTHY=1.5
DEBT_TO_ASSETS_HEALTHY=0.5

FORECAST_CONFIDENCE_THRESHOLD=0.75
MIN_DATA_POINTS_FOR_FORECAST=3

# Output Configuration
DECIMAL_PLACES=2
CURRENCY_SYMBOL=€
DATE_FORMAT=%Y-%m-%d

# Logging
LOG_LEVEL=INFO
ENABLE_DEBUG_MODE=False
```

### Step 3: Add Your OpenAI API Key

Get your API key from: https://platform.openai.com/api-keys

Then edit `.env` and replace:
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

With your actual key:
```env
OPENAI_API_KEY=sk-proj-aBcDeFgHiJkLmNoPqRsTuVwXyZ...
```

### Step 4: Run Tests

Verify the integration:

```bash
python test_openai_integration.py
```

**Expected output:**
```
🚀 DEXTER AGENT - OPENAI INTEGRATION TEST SUITE
============================================================

🧪 TEST: Imports
✓ Config import OK
✓ OpenAI Service import OK
✓ Error Handler import OK
✓ Tool Converter import OK
✓ Tools import OK

🧪 TEST: Configuration
✓ Config loaded: Dexter
✓ Model: gpt-4-turbo-preview
✓ API Key: ********************xyz
✓ Config validation passed

... (more tests)

📊 TEST SUMMARY
============================================================
  Imports................................. ✓ PASSED
  Configuration........................... ✓ PASSED
  Service Layer........................... ✓ PASSED
  Tool Converter.......................... ✓ PASSED
  Error Handler........................... ✓ PASSED
  DexterAgent............................. ✓ PASSED
  API Call................................ ✓ PASSED

Total: 7/7 tests passed

🎉 ALL TESTS PASSED! 🎉
✓ OpenAI integration is ready!
✓ You can now run: python main.py
```

### Step 5: Run Dexter Agent

```bash
python main.py
```

**Expected startup:**
```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  ██████╗ ███████╗██╗  ██╗████████╗███████╗██████╗          ║
║  ██╔══██╗██╔════╝╚██╗██╔╝╚══██╔══╝██╔════╝██╔══██╗         ║
║  ██║  ██║█████╗   ╚███╔╝    ██║   █████╗  ██████╔╝         ║
║  ██║  ██║██╔══╝   ██╔██╗    ██║   ██╔══╝  ██╔══██╗         ║
║  ██████╔╝███████╗██╔╝ ██╗   ██║   ███████╗██║  ██║         ║
║  ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝         ║
║                                                              ║
║           KI-Finanzanalyst für professionelle               ║
║              Unternehmensanalysen                            ║
║                 (OpenAI GPT-4 Edition)                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

Model: gpt-4-turbo-preview
Version: 4.0.0 (OpenAI Migration)

============================================================
Verfügbare Power-Ups:
  📊 ROI Calculator - Return on Investment Analysen
  📈 Sales Forecaster - Verkaufsprognosen
  💰 P&L Calculator - Gewinn- und Verlustrechnungen
  🏦 Balance Sheet - Bilanz-Generierung
  💸 Cash Flow Statement - Kapitalflussrechnung
  🎯 Break-Even Analysis - Gewinnschwellen-Analyse
============================================================

Befehle:
  'exit' oder 'quit' - Beenden
  'new' - Neue Session starten
  'help' - Hilfe anzeigen
============================================================

💬 Du: _
```

---

## 📚 Testing the Agent

### Test Query 1: Simple ROI Calculation

```
💬 Du: Berechne ROI für Investment von 50.000€ mit 75.000€ Revenue über 12 Monate

🤖 Dexter: [Uses Tool: calculate_roi]

# ROI-Analyse: Investment-Bewertung
## Executive Summary
...
```

### Test Query 2: Sales Forecast

```
💬 Du: Erstelle eine Verkaufsprognose für 6 Monate basierend auf folgenden Daten:
Jan: 10000€, Feb: 12000€, Mar: 11500€, Apr: 13000€

🤖 Dexter: [Uses Tool: forecast_sales]

# Sales Forecast Report
...
```

### Test Query 3: General Question

```
💬 Du: Was sind die wichtigsten Kennzahlen für die Bewertung der Liquidität?

🤖 Dexter: Die wichtigsten Liquiditätskennzahlen sind:

1. **Current Ratio** (Liquidität 1. Grades)
   - Formel: Umlaufvermögen / kurzfristige Verbindlichkeiten
   ...
```

---

## 🔧 Troubleshooting

### Problem: "OPENAI_API_KEY is not set"

**Solution:**
1. Make sure `.env` file exists in `C:\Users\luis\Desktop\Agents\dexter-agent\`
2. Verify the file contains: `OPENAI_API_KEY=sk-...`
3. Check there are no extra spaces or quotes around the key

### Problem: "Authentication failed"

**Possible causes:**
- Invalid API key
- API key expired
- No billing/credits on OpenAI account

**Solution:**
1. Go to https://platform.openai.com/api-keys
2. Generate a new API key
3. Update `.env` file
4. Check billing settings at https://platform.openai.com/account/billing

### Problem: "ModuleNotFoundError: No module named 'openai'"

**Solution:**
```bash
pip install openai>=1.0.0
```

Or reinstall all dependencies:
```bash
pip install -r requirements.txt
```

### Problem: "Rate limit exceeded"

**Solution:**
- Wait 60 seconds and try again
- The system has automatic retry logic with exponential backoff
- If persistent, check your OpenAI usage limits

---

## 📊 Model Options

You can switch between different OpenAI models by editing `.env`:

### Recommended Models

```env
# Best quality (expensive)
MODEL_NAME=gpt-4-turbo-preview

# Good balance
MODEL_NAME=gpt-4

# Faster & cheaper (may reduce accuracy)
MODEL_NAME=gpt-3.5-turbo
```

### Model Comparison

| Model | Context | Cost (Input) | Cost (Output) | Best For |
|-------|---------|--------------|---------------|----------|
| `gpt-4-turbo-preview` | 128K | $10/1M | $30/1M | Complex analysis |
| `gpt-4` | 8K | $30/1M | $60/1M | High accuracy |
| `gpt-3.5-turbo` | 16K | $0.50/1M | $1.50/1M | Quick queries |

---

## 📁 File Structure

```
dexter-agent/
├── .env                              # YOUR API KEY (create this!)
├── .env.example                      # Template (updated for OpenAI)
├── requirements.txt                  # Updated dependencies
├── config.py                         # Updated for OPENAI_API_KEY
├── main.py                           # NEW: OpenAI integration
├── main_anthropic_backup.py          # BACKUP: Original version
│
├── lib/                              # NEW: Service layer
│   ├── __init__.py
│   └── ai/
│       ├── __init__.py
│       ├── openai_service.py         # OpenAI wrapper
│       ├── error_handler.py          # Retry logic
│       └── tool_converter.py         # Tool definitions
│
├── tools/                            # Financial tools (unchanged)
│   ├── __init__.py
│   ├── roi_calculator.py
│   ├── sales_forecaster.py
│   ├── pnl_calculator.py
│   ├── balance_sheet.py
│   ├── cash_flow_statement.py
│   └── break_even_analysis.py
│
├── prompts/                          # System prompts (unchanged)
│   └── system_prompts.py
│
├── test_openai_integration.py        # NEW: Test suite
├── MIGRATION_GUIDE.md                # NEW: Migration docs
└── SETUP_INSTRUCTIONS.md             # THIS FILE
```

---

## 🎓 Next Steps

1. **Install dependencies**: `pip install -r requirements.txt`
2. **Create `.env` file** with your OpenAI API key
3. **Run tests**: `python test_openai_integration.py`
4. **Start agent**: `python main.py`
5. **Read migration guide**: `MIGRATION_GUIDE.md` for technical details

---

## 🆘 Need Help?

### Resources

- **OpenAI Platform**: https://platform.openai.com/
- **API Documentation**: https://platform.openai.com/docs
- **Function Calling Guide**: https://platform.openai.com/docs/guides/function-calling
- **Billing & Usage**: https://platform.openai.com/account/usage

### Common Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run tests
python test_openai_integration.py

# Start agent
python main.py

# Test individual tools
python tools/roi_calculator.py
python tools/sales_forecaster.py

# Test service layer
python -m lib.ai.openai_service
python -m lib.ai.error_handler
python -m lib.ai.tool_converter
```

---

## ✨ Features Preserved

All original Dexter features work exactly as before:

- ✅ 6 Financial Analysis Tools
- ✅ ROI Calculator with amortization
- ✅ Sales Forecaster with seasonality
- ✅ P&L Calculator with GAAP compliance
- ✅ Balance Sheet with financial ratios
- ✅ Cash Flow Statement with quality scoring
- ✅ Break-Even Analysis with scenarios
- ✅ German language support
- ✅ Markdown-formatted outputs
- ✅ Conversation history
- ✅ Interactive CLI

---

**Migration completed:** January 2025
**Version:** 4.0.0 (OpenAI Edition)
**Status:** ✅ Ready for production

---

Viel Erfolg mit Dexter Agent! 🚀
