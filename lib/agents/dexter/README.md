# Dexter Financial Analyst Agent

## Overview

Dexter is an AI-powered financial analyst integrated into the SINTRA AI Agent System. Powered by Anthropic's Claude Sonnet 3.5, Dexter provides professional financial analysis using specialized tools.

## Features

### ✅ Currently Implemented

- **ROI Calculator** - Return on Investment analysis with payback period calculation
- **Streaming Responses** - Real-time response streaming via Server-Sent Events
- **Error Handling** - Comprehensive error handling and validation
- **Health Checks** - API health monitoring endpoints

### 🚧 Coming Soon

- **Sales Forecaster** - AI-powered sales predictions with trend analysis
- **P&L Calculator** - Profit & Loss statement generation
- **Balance Sheet Generator** - Complete balance sheet with financial ratios
- **Cash Flow Statement** - Cash flow analysis with quality scoring
- **Break-Even Analysis** - Break-even point calculations

## Architecture

```
lib/agents/dexter/
├── config.ts              # Configuration & Anthropic client
├── prompts.ts             # System prompts for Claude
├── dexter-service.ts      # Main service class
├── tools/
│   └── roi-calculator.ts  # ROI calculation tool
└── README.md             # This file

app/api/agents/dexter/
├── chat/
│   └── route.ts          # Chat endpoint (streaming)
└── health/
    └── route.ts          # Health check endpoint
```

## API Endpoints

### Chat API

**Endpoint:** `POST /api/agents/dexter/chat`

**Request:**
```json
{
  "content": "Berechne ROI für 100.000€ Investment mit 180.000€ Revenue über 18 Monate"
}
```

**Response:** Server-Sent Events (SSE)
```
data: {"chunk":"📊 **ROI-ANALYSE ERGEBNIS**\n\n..."}
data: {"done":true}
```

### Health Check

**Endpoint:** `GET /api/agents/dexter/health`

**Response:**
```json
{
  "agent": "Dexter",
  "version": "3.0.0",
  "status": "healthy",
  "details": {
    "model": "claude-sonnet-3-5-20241022",
    "tools": 1
  }
}
```

### Agent Metadata

**Endpoint:** `GET /api/agents/dexter/chat`

**Response:**
```json
{
  "success": true,
  "agent": {
    "id": "dexter",
    "name": "Dexter",
    "role": "Financial Analyst & Data Expert",
    "version": "3.0.0",
    "capabilities": ["ROI Calculator", ...]
  }
}
```

## Configuration

### Environment Variables

Add to `.env.local`:

```bash
# Dexter Anthropic API Key (already configured in code)
DEXTER_ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXXXXXXXXXX...

# Optional overrides
DEXTER_MODEL=claude-sonnet-3-5-20241022
DEXTER_MAX_TOKENS=4096
DEXTER_TEMPERATURE=0.0
```

### Financial Thresholds

Configured in `config.ts`:

```typescript
FINANCIAL_THRESHOLDS = {
  roi: {
    excellent: 20.0,  // >20% ROI
    good: 10.0,       // 10-20% ROI
    acceptable: 5.0,  // 5-10% ROI
  },
  // ... more thresholds
}
```

## Usage Examples

### Frontend Integration (React/Next.js)

```typescript
// Send message to Dexter
const response = await fetch('/api/agents/dexter/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Berechne ROI für 50k€ Investment mit 120k€ Revenue über 24 Monate'
  })
});

// Handle streaming response
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));

      if (data.chunk) {
        console.log(data.chunk); // Display chunk
      }
      if (data.done) {
        console.log('Response complete');
      }
    }
  }
}
```

### cURL Example

```bash
curl -X POST http://localhost:3000/api/agents/dexter/chat \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Berechne ROI: Investment 100.000€, Revenue 180.000€ über 18 Monate"
  }'
```

## Tool Documentation

### ROI Calculator

**Purpose:** Calculate Return on Investment with detailed financial analysis

**Parameters:**
- `investment_cost` (number, required) - Initial investment in €
- `revenue_generated` (number, required) - Total revenue over period in €
- `timeframe_months` (number, required) - Time period in months
- `recurring_costs` (number, optional) - Monthly recurring costs in €

**Example:**
```json
{
  "investment_cost": 100000,
  "revenue_generated": 180000,
  "timeframe_months": 18,
  "recurring_costs": 2000
}
```

**Output:**
- ROI percentage
- ROI category (excellent/good/acceptable/poor/negative)
- Payback period
- Net profit
- Annualized ROI
- Detailed recommendation

## Error Handling

### API Errors

Dexter handles Anthropic API errors gracefully:

```typescript
try {
  const response = await dexter.chat(userMessage);
} catch (error) {
  if (error instanceof Anthropic.APIError) {
    // Handle rate limits, auth errors, etc.
  }
}
```

### Tool Errors

Invalid tool inputs are caught and returned with helpful messages:

```json
{
  "error": "Investment cost must be positive",
  "tool_name": "calculate_roi"
}
```

## Testing

### Run HTTP Tests

Use the provided test file:

```bash
# Open in VS Code with REST Client extension
# Or use any HTTP client (Postman, Insomnia, etc.)
tests/dexter-integration.http
```

### Health Check

```bash
curl http://localhost:3000/api/agents/dexter/health
```

### Simple Chat Test

```bash
curl -X POST http://localhost:3000/api/agents/dexter/chat \
  -H "Content-Type: application/json" \
  -d '{"content":"Hallo Dexter! Wer bist du?"}'
```

## Development

### Adding New Tools

1. Create tool implementation in `tools/`
2. Define tool schema (Anthropic format)
3. Register tool in `dexter-service.ts`:

```typescript
// In registerTools()
tools.push(MY_NEW_TOOL as Tool);

// In executeTool()
case 'my_new_tool':
  return await myNewTool(toolInput);
```

### Modifying Prompts

Edit `prompts.ts` to customize Dexter's personality and behavior.

### Adjusting Thresholds

Modify `FINANCIAL_THRESHOLDS` in `config.ts` to change financial rating criteria.

## Troubleshooting

### "API key is invalid"

Check that the Anthropic API key is correctly set in `config.ts`.

### "Model not found"

Verify the model name in `DEXTER_ANTHROPIC_CONFIG.model`.

### Streaming not working

Ensure your client properly handles Server-Sent Events (SSE).

### Tool not executing

Check console logs for tool execution errors. Verify tool input format matches schema.

## Performance

- **Average Response Time:** 2-5 seconds (depends on tool complexity)
- **Streaming Latency:** ~200-500ms for first chunk
- **Token Usage:** ~500-2000 tokens per request (varies by conversation length)

## Security

- API key stored securely in config (not in git)
- No sensitive data logged
- Input validation on all tool parameters
- Rate limiting via Anthropic API

## Support

For issues or questions:

1. Check console logs: `[Dexter]` prefix
2. Test health endpoint: `/api/agents/dexter/health`
3. Review test cases: `tests/dexter-integration.http`
4. Check Anthropic API status: https://status.anthropic.com

## Changelog

### v3.0.0 (2025-10-25)
- Initial integration with SINTRA
- Anthropic Claude SDK implementation
- ROI Calculator tool
- Streaming response support
- Health check endpoints
- Comprehensive error handling

## License

Part of SINTRA AI Agent System
