# HubSpot Webhooks Integration Guide

Complete guide for setting up and using HubSpot webhooks with the Revolution AI Agent System.

## Overview

The HubSpot webhooks integration allows automatic agent execution when specific events occur in your HubSpot CRM, such as:
- Contact lifecycle stage changes
- Deal stage updates
- New contact creation
- Property value changes

## Architecture

```
HubSpot CRM → Webhook Event → /api/webhooks/hubspot
                ↓
         Signature Validation
                ↓
         Event Processing
                ↓
         Agent Execution (BullMQ)
                ↓
         OpenAI GPT-4 Response
```

## Setup Guide

### 1. Configure Environment Variables

Add to your `.env.local`:

```bash
# HubSpot OAuth
HUBSPOT_CLIENT_ID=your-hubspot-client-id
HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret
HUBSPOT_REDIRECT_URI=http://localhost:3000/api/oauth/hubspot/callback

# HubSpot Webhook Secret (for signature validation)
HUBSPOT_WEBHOOK_SECRET=your-webhook-secret-from-hubspot

# App URL (important for webhook registration)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Get HubSpot Credentials

1. Go to [HubSpot Developer Portal](https://app.hubspot.com/)
2. Navigate to **Settings** → **Integrations** → **Private Apps**
3. Click **Create a private app**
4. Configure the app:
   - **Name**: Revolution AI Agent System
   - **Description**: AI-powered agent automation
   - **Logo**: (optional)

5. Add **Scopes**:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
   - `crm.schemas.contacts.read`
   - `crm.schemas.deals.read`

6. Click **Create app** and copy:
   - Client ID
   - Client Secret

### 3. Get Webhook Secret

1. In HubSpot, go to **Settings** → **Integrations** → **Webhooks**
2. Note the **Webhook Secret** (used for signature validation)
3. Copy this secret to `HUBSPOT_WEBHOOK_SECRET` in your `.env.local`

### 4. Connect HubSpot via OAuth

1. Start the application:
   ```bash
   npm run dev
   ```

2. Navigate to the Revolution page: `http://localhost:3000/revolution`

3. Click **Connect HubSpot**

4. Authorize the app in HubSpot

5. After redirect, webhooks will be automatically registered

## Webhook Events

### Automatically Registered Webhooks

When you connect HubSpot via OAuth, these webhooks are automatically registered:

#### 1. Contact Lifecycle Stage Change
- **Event**: `contact.propertyChange`
- **Property**: `lifecyclestage`
- **Triggers**: When contact moves to different lifecycle stages
- **Example**: Subscriber → Lead → Customer

#### 2. New Contact Creation
- **Event**: `contact.creation`
- **Triggers**: When a new contact is created in HubSpot

#### 3. Deal Stage Change
- **Event**: `deal.propertyChange`
- **Property**: `dealstage`
- **Triggers**: When deal moves through pipeline stages
- **Example**: Qualified → Proposal → Closed Won

## Agent Execution Rules

### When Does an Agent Get Triggered?

Agents are automatically executed when:

1. **Contact becomes Customer**:
   ```
   Event: contact.propertyChange
   Property: lifecyclestage
   Value: customer
   ```

2. **Deal is Closed Won**:
   ```
   Event: deal.propertyChange
   Property: dealstage
   Value: closedwon
   ```

3. **New Contact Created**:
   ```
   Event: contact.creation
   ```

### Customizing Trigger Rules

Edit `lib/services/hubspot-webhook-service.ts` → `shouldTriggerAgentExecution()`:

```typescript
function shouldTriggerAgentExecution(
  event: HubSpotWebhookEvent,
  webhook: any
): boolean {
  // Example: Trigger on any lifecycle stage change
  if (event.subscriptionType === 'contact.propertyChange' &&
      event.propertyName === 'lifecyclestage') {
    return true;
  }

  // Example: Trigger on specific email domain
  if (event.subscriptionType === 'contact.creation') {
    const email = event.propertyValue;
    if (email?.endsWith('@enterprise.com')) {
      return true;
    }
  }

  return false;
}
```

## API Endpoints

### 1. Webhook Receiver

**Endpoint**: `POST /api/webhooks/hubspot`

**Headers**:
- `X-HubSpot-Signature`: HMAC-SHA256 signature for validation

**Request Body**:
```json
[
  {
    "objectId": 12345,
    "propertyName": "lifecyclestage",
    "propertyValue": "customer",
    "subscriptionType": "contact.propertyChange",
    "portalId": 987654,
    "eventId": 567890,
    "subscriptionId": 111222,
    "occurredAt": 1640000000000
  }
]
```

**Response**:
```json
{
  "success": true,
  "processed": 1,
  "successCount": 1,
  "failureCount": 0
}
```

### 2. List User Webhooks

**Endpoint**: `GET /api/revolution/webhooks`

**Headers**:
- `x-user-id`: User ID

**Response**:
```json
{
  "success": true,
  "count": 3,
  "webhooks": [
    {
      "id": "uuid-1",
      "eventType": "contact.propertyChange",
      "objectType": "contact",
      "propertyName": "lifecyclestage",
      "status": "active",
      "triggerCount": 42,
      "lastTriggeredAt": "2025-01-15T10:30:00Z",
      "hubspotPortalId": "987654",
      "agentId": "agent-uuid",
      "createdAt": "2025-01-10T08:00:00Z"
    }
  ]
}
```

### 3. Deactivate Webhook

**Endpoint**: `DELETE /api/revolution/webhooks?id=webhook-id`

**Headers**:
- `x-user-id`: User ID

**Response**:
```json
{
  "success": true,
  "message": "Webhook deactivated successfully"
}
```

## Security

### Signature Validation

All webhook requests are validated using HMAC-SHA256:

```typescript
import crypto from 'crypto';

function validateHubSpotSignature(
  requestBody: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(requestBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature.replace('sha256=', ''))
  );
}
```

**Why This Matters**:
- Prevents unauthorized webhook calls
- Ensures events are from HubSpot
- Protects against replay attacks

### Best Practices

1. **Keep Webhook Secret Secure**:
   - Never commit to Git
   - Use environment variables
   - Rotate periodically

2. **Use HTTPS in Production**:
   ```bash
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

3. **Monitor Webhook Logs**:
   - Check `hubspot_sync_logs` table
   - Track error counts
   - Alert on signature validation failures

## Database Schema

### hubspot_webhooks Table

Stores webhook subscriptions:

```sql
CREATE TABLE hubspot_webhooks (
  id UUID PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  agent_id UUID REFERENCES custom_agents(id),
  hubspot_portal_id VARCHAR(255) NOT NULL,
  subscription_id VARCHAR(255),
  event_type VARCHAR(100) NOT NULL,
  object_type VARCHAR(100) NOT NULL,
  property_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  trigger_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### hubspot_sync_logs Table

Logs all webhook events and API calls:

```sql
CREATE TABLE hubspot_sync_logs (
  id UUID PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  agent_id UUID,
  operation VARCHAR(100) NOT NULL,
  object_type VARCHAR(100) NOT NULL,
  object_id VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Testing

### 1. Local Testing with ngrok

Since HubSpot needs a public URL, use ngrok for local testing:

```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm run dev

# In another terminal, create tunnel
ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Update .env.local:
NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
```

### 2. Manual Webhook Testing

Send a test webhook using curl:

```bash
# Calculate signature
echo -n '{"objectId":123}' | \
  openssl dgst -sha256 -hmac "your-webhook-secret" | \
  awk '{print "sha256=" $2}'

# Send webhook
curl -X POST http://localhost:3000/api/webhooks/hubspot \
  -H "Content-Type: application/json" \
  -H "X-HubSpot-Signature: sha256=<calculated-signature>" \
  -d '[{"objectId":123,"subscriptionType":"contact.creation","portalId":987654}]'
```

### 3. HubSpot Test Events

Use HubSpot's webhook testing tool:
1. Go to **Settings** → **Integrations** → **Webhooks**
2. Find your webhook subscription
3. Click **Test** to send a sample event

## Agent Input Format

When a webhook triggers an agent execution, the input looks like:

```json
{
  "trigger": "hubspot_webhook",
  "eventType": "contact.propertyChange",
  "objectType": "contacts",
  "objectId": 12345,
  "propertyName": "lifecyclestage",
  "propertyValue": "customer",
  "objectData": {
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "company": "Acme Inc",
    "lifecyclestage": "customer"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

The agent can use this data to:
- Send personalized welcome emails
- Update CRM fields
- Trigger workflows
- Send Slack notifications
- Create tasks for sales reps

## Example Use Cases

### 1. Welcome New Customers

**Trigger**: Contact lifecycle stage → Customer

**Agent Action**:
```
1. Fetch contact details from HubSpot
2. Generate personalized welcome email
3. Create onboarding tasks
4. Send Slack notification to CSM team
5. Update HubSpot with onboarding status
```

### 2. Deal Won Automation

**Trigger**: Deal stage → Closed Won

**Agent Action**:
```
1. Extract deal and contact information
2. Generate contract draft
3. Schedule kickoff meeting
4. Create project in PM tool
5. Send celebration message to team
```

### 3. Lead Nurturing

**Trigger**: New contact creation

**Agent Action**:
```
1. Analyze contact's company and industry
2. Assign to appropriate sales rep
3. Generate personalized intro email
4. Schedule follow-up tasks
5. Add to nurture sequence
```

## Troubleshooting

### Webhook Not Triggering

**Check**:
1. Webhook is registered: `GET /api/revolution/webhooks`
2. Status is `active` in database
3. HubSpot subscription is active (check HubSpot dashboard)
4. Public URL is accessible (use ngrok for local)

**Logs**:
```sql
-- Check webhook events
SELECT * FROM hubspot_sync_logs
WHERE operation = 'webhook_received'
ORDER BY created_at DESC
LIMIT 10;

-- Check webhook errors
SELECT * FROM hubspot_sync_logs
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Signature Validation Failing

**Check**:
1. `HUBSPOT_WEBHOOK_SECRET` matches HubSpot dashboard
2. Request body is not modified before validation
3. Signature header format: `sha256=<hash>`

**Debug**:
```typescript
console.log('Request body:', requestBody);
console.log('Signature header:', signature);
console.log('Expected signature:', expectedSignature);
```

### Agent Not Executing

**Check**:
1. `shouldTriggerAgentExecution()` returns true
2. Agent ID is set in webhook record
3. BullMQ worker is running: `npm run worker`
4. Redis is running
5. Check `agent_executions` table for job status

## Production Deployment

### 1. Environment Variables

```bash
# Production .env
NEXT_PUBLIC_APP_URL=https://api.yourcompany.com
HUBSPOT_WEBHOOK_SECRET=<secure-random-string>
REDIS_URL=redis://production-redis:6379
DATABASE_URL=postgresql://user:pass@db:5432/production
```

### 2. Webhook URL Configuration

Update HubSpot webhook URL to production:
- Go to HubSpot **Settings** → **Webhooks**
- Update webhook URL to: `https://api.yourcompany.com/api/webhooks/hubspot`

### 3. Monitoring

Set up monitoring for:
- Webhook event volume
- Signature validation failures
- Agent execution success rate
- Average processing time

**Example Monitoring Query**:
```sql
-- Webhook stats for last 24 hours
SELECT
  event_type,
  COUNT(*) as event_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failures,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time
FROM hubspot_sync_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type;
```

## Advanced Configuration

### Custom Webhook Subscriptions

Register additional webhook types programmatically:

```typescript
import { registerHubSpotWebhook } from '@/lib/services/hubspot-webhook-service';

// Register custom property change
await registerHubSpotWebhook(accessToken, portalId, {
  eventType: 'contact.propertyChange',
  objectType: 'contact',
  propertyName: 'lead_score',
});

// Register company creation
await registerHubSpotWebhook(accessToken, portalId, {
  eventType: 'company.creation',
  objectType: 'company',
});
```

### Rate Limiting

Webhook processing respects rate limits:
- Max 10 concurrent webhook events
- Queued via BullMQ if limit exceeded
- Exponential backoff on HubSpot API errors

## Resources

- [HubSpot Webhooks Documentation](https://developers.hubspot.com/docs/api/webhooks)
- [HubSpot OAuth Guide](https://developers.hubspot.com/docs/api/oauth)
- [HMAC Signature Validation](https://developers.hubspot.com/docs/api/webhooks/validating-requests)

## Support

For issues:
1. Check logs in `hubspot_sync_logs` table
2. Review webhook status: `GET /api/revolution/webhooks`
3. Test signature validation locally
4. Verify HubSpot subscription is active

---

**Last Updated**: 2025-01-15
**Version**: 1.0.0
