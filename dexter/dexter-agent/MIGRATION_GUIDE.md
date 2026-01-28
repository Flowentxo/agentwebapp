# Dexter Agent - OpenAI Migration Guide

## Version 4.0.0 - OpenAI GPT-4 Integration

This document describes the migration from Anthropic Claude API to OpenAI GPT-4 API.

---

## 📋 Migration Summary

### What Changed

| Component | Before (v3.0) | After (v4.0) |
|-----------|---------------|--------------|
| **AI Provider** | Anthropic Claude | OpenAI GPT-4 |
| **Model** | `claude-sonnet-3-5-20241022` | `gpt-4-turbo-preview` |
| **SDK** | `anthropic>=0.39.0` | `openai>=1.0.0` |
| **API Key** | `ANTHROPIC_API_KEY` | `OPENAI_API_KEY` |
| **Tool Pattern** | Tool-use blocks | Function Calling |
| **Architecture** | Direct SDK calls | Service Layer Pattern |

### What Stayed the Same

✅ **All 6 Financial Analysis Tools** - No changes to tool logic
✅ **System Prompts** - Dexter's personality unchanged
✅ **CLI Interface** - Same user experience
✅ **Data Processing** - All calculation logic preserved
✅ **Configuration System** - Same structure, different env vars

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd dexter-agent
pip install -r requirements.txt
```

### 2. Configure API Key

Create `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API Key:

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Model Configuration
MODEL_NAME=gpt-4-turbo-preview

# Other settings...
```

### 3. Run Dexter

```bash
python main.py
```

---

## 📦 New Architecture

### Service Layer Structure

```
dexter-agent/
├── main.py                          # Main agent (OpenAI integration)
├── config.py                        # Configuration (updated for OpenAI)
├── requirements.txt                 # Dependencies (openai instead of anthropic)
│
├── lib/                             # NEW: Service Layer
│   ├── __init__.py
│   └── ai/
│       ├── __init__.py
│       ├── openai_service.py        # OpenAI API wrapper
│       ├── error_handler.py         # Retry logic & error handling
│       └── tool_converter.py        # Tool definitions (OpenAI format)
│
├── tools/                           # Financial tools (unchanged)
│   ├── roi_calculator.py
│   ├── sales_forecaster.py
│   ├── pnl_calculator.py
│   ├── balance_sheet.py
│   ├── cash_flow_statement.py
│   └── break_even_analysis.py
│
└── prompts/                         # System prompts (unchanged)
    └── system_prompts.py
```

---

## 🔄 API Differences

### Message Format

**Anthropic (Before):**
```python
{
    "role": "assistant",
    "content": [
        {"type": "text", "text": "Hello"},
        {"type": "tool_use", "id": "...", "name": "...", "input": {...}}
    ]
}
```

**OpenAI (After):**
```python
{
    "role": "assistant",
    "content": "Hello",
    "tool_calls": [
        {
            "id": "...",
            "type": "function",
            "function": {"name": "...", "arguments": "..."}
        }
    ]
}
```

### Tool Definitions

**Anthropic (Before):**
```python
{
    "name": "calculate_roi",
    "description": "...",
    "input_schema": {
        "type": "object",
        "properties": {...},
        "required": [...]
    }
}
```

**OpenAI (After):**
```python
{
    "type": "function",
    "function": {
        "name": "calculate_roi",
        "description": "...",
        "parameters": {
            "type": "object",
            "properties": {...},
            "required": [...]
        }
    }
}
```

### Tool Execution Flow

**Anthropic (Before):**
1. User message → Claude
2. Claude returns `tool_use` blocks
3. Execute tools
4. Send `tool_result` messages → Claude
5. Claude generates final response

**OpenAI (After):**
1. User message → OpenAI
2. OpenAI returns `tool_calls` (finish_reason="tool_calls")
3. Execute functions
4. Send `role="tool"` messages → OpenAI
5. OpenAI generates final response (finish_reason="stop")

---

## 🛠️ New Features

### 1. Service Layer Pattern

**Before (v3.0):**
```python
# Direct SDK calls in main.py
response = self.client.messages.create(
    model=self.model,
    messages=self.conversation_history,
    tools=self.tools
)
```

**After (v4.0):**
```python
# Service layer abstraction
response = await self.openai_service.generate_response(
    messages=self.conversation_history,
    tools=self.tools
)
```

### 2. Error Handling & Retry Logic

```python
from lib.ai.error_handler import retry_on_error

@retry_on_error(max_retries=3, base_delay=1.0)
async def _call_openai(self, messages):
    return await self.openai_service.generate_response(
        messages=messages,
        tools=self.tools
    )
```

**Features:**
- Automatic retry on transient errors (503, timeout)
- Exponential backoff
- Rate limit handling (429)
- Non-retryable error detection (401, 400)

### 3. Token Management

```python
from lib.ai.openai_service import estimate_tokens, trim_conversation_history

# Estimate tokens
tokens = estimate_tokens("Your text here")

# Trim history to fit context
trimmed = trim_conversation_history(messages, max_tokens=8000)
```

---

## 🧪 Testing

### Unit Tests

Test the service layer:

```bash
# Test OpenAI service
python -m lib.ai.openai_service

# Test error handling
python -m lib.ai.error_handler

# Test tool converter
python -m lib.ai.tool_converter
```

### Integration Test

Test a simple query (requires valid `OPENAI_API_KEY`):

```python
from lib.ai.openai_service import generate_agent_response, ChatMessage

messages = [
    ChatMessage(role="system", content="You are a helpful assistant."),
    ChatMessage(role="user", content="Hello!")
]

response = await generate_agent_response(messages)
print(response.content)
```

---

## 🔐 Security Notes

### API Key Management

**❌ DON'T:**
- Commit `.env` file to Git
- Hardcode API keys in code
- Share API keys in logs

**✅ DO:**
- Use `.env.local` for local development
- Add `.env*` to `.gitignore`
- Rotate API keys regularly
- Use environment-specific keys

### Validation

The configuration system validates API keys:

```python
# config.py
if not self.api_key.startswith("sk-"):
    raise ValueError("OPENAI_API_KEY scheint ungültig zu sein")
```

---

## 📊 Model Comparison

| Feature | Claude Sonnet 3.5 | GPT-4 Turbo |
|---------|-------------------|-------------|
| **Context Window** | 200K tokens | 128K tokens |
| **Function Calling** | Tool-use blocks | Native function calling |
| **Cost (1M input tokens)** | $3.00 | $10.00 |
| **Cost (1M output tokens)** | $15.00 | $30.00 |
| **Temperature Range** | 0.0 - 1.0 | 0.0 - 2.0 |
| **Streaming** | Yes | Yes |
| **JSON Mode** | Via prompting | Native JSON mode |

---

## 🐛 Troubleshooting

### Error: "OPENAI_API_KEY not set"

**Solution:**
```bash
# Create .env file
cp .env.example .env

# Add your key
OPENAI_API_KEY=sk-your-key-here
```

### Error: "Authentication failed"

**Causes:**
- Invalid API key format
- Expired API key
- Insufficient credits

**Solution:**
- Check API key at https://platform.openai.com/api-keys
- Verify billing settings
- Generate new API key

### Error: "Rate limit exceeded"

**Solution:**
The system automatically retries with backoff. If persistent:
- Upgrade OpenAI plan
- Reduce request frequency
- Implement custom rate limiting

### Tools not being called

**Debug steps:**
1. Check tool definitions: `python -m lib.ai.tool_converter`
2. Enable debug logging: `LOG_LEVEL=DEBUG` in `.env`
3. Verify function names match
4. Check system prompt instructs tool usage

---

## 📈 Performance Tips

### 1. Token Optimization

```python
# Trim conversation history
from lib.ai.openai_service import trim_conversation_history

messages = trim_conversation_history(
    self.conversation_history,
    max_tokens=8000  # Leave room for response
)
```

### 2. Caching System Prompts

The system prompt is only added once (first turn):

```python
if not self.conversation_history:
    self.conversation_history.append(
        ChatMessage(role="system", content=self.system_prompt)
    )
```

### 3. Async Operations

All tool executions are async:

```python
result = await calculate_roi(**tool_input)
```

---

## 🔜 Future Enhancements

### Planned Features

- [ ] **Streaming Responses** - Real-time token streaming
- [ ] **Token Usage Tracking** - Cost analysis per session
- [ ] **Model Selection** - Switch between GPT-4 / GPT-3.5-Turbo
- [ ] **Conversation Export** - Save/load chat history
- [ ] **Multi-Agent Support** - Coordinate multiple agents
- [ ] **Web Interface** - FastAPI + React frontend

---

## 📝 Changelog

### Version 4.0.0 (2025-01-XX)
- ✨ **OpenAI GPT-4 Integration** - Migrated from Anthropic Claude
- 🏗️ **Service Layer Architecture** - Abstracted AI provider
- 🔄 **Retry Logic** - Automatic error handling with backoff
- 🛠️ **Tool Converter** - OpenAI function calling format
- 📚 **Documentation** - Complete migration guide

### Version 3.0.0 (Previous)
- Anthropic Claude Sonnet 3.5 integration
- 6 Financial Analysis Tools
- CLI interface

---

## 🆘 Support

### Resources

- **OpenAI Docs:** https://platform.openai.com/docs
- **Function Calling Guide:** https://platform.openai.com/docs/guides/function-calling
- **API Reference:** https://platform.openai.com/docs/api-reference

### Getting Help

1. Check this migration guide
2. Review error logs in `logs/dexter_YYYYMMDD.log`
3. Test individual components (service layer, tools)
4. Verify API key and billing

---

## 📄 License

Same license as original Dexter Agent project.

---

**Migrated by:** Dexter Agent Development Team
**Date:** January 2025
**Version:** 4.0.0
