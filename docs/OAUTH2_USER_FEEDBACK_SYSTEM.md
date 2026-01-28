# 🎤 OAuth2 Integration - User Feedback & Error Reporting

## In-App Feedback Component

**File:** `components/integrations/FeedbackButton.tsx`

```typescript
'use client';

import { useState } from 'react';

export function IntegrationFeedback({ integrationId }: { integrationId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [issueType, setIssueType] = useState<'bug' | 'improvement' | 'question'>('bug');

  const handleSubmit = async () => {
    await fetch('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        integration: integrationId,
        type: issueType,
        message: feedback,
        userAgent: navigator.userAgent,
        url: window.location.href,
      }),
    });
    // Show success toast
    setShowForm(false);
  };

  return (
    <div className="feedback-widget">
      <button onClick={() => setShowForm(true)}>Report Issue</button>
      {showForm && (
        <dialog open>
          <h3>Report Integration Issue</h3>
          <select value={issueType} onChange={(e) => setIssueType(e.target.value as any)}>
            <option value="bug">Bug/Error</option>
            <option value="improvement">Improvement</option>
            <option value="question">Question</option>
          </select>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <button onClick={handleSubmit}>Submit</button>
          <button onClick={() => setShowForm(false)}>Cancel</button>
        </dialog>
      )}
    </div>
  );
}
```

## Error Reporting API

**File:** `app/api/feedback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sendSlackAlert } from '@/lib/monitoring/slack-notifier';

export async function POST(req: NextRequest) {
  const data = await req.json();

  // Send to Slack
  await sendSlackAlert({
    severity: data.type === 'bug' ? 'warning' : 'info',
    title: `User Feedback: ${data.integration}`,
    message: data.message,
    details: {
      'Type': data.type,
      'User Agent': data.userAgent,
      'URL': data.url,
    },
  });

  // Log to Sentry
  Sentry.captureMessage(`User Feedback: ${data.type}`, {
    level: 'info',
    tags: { integration: data.integration, type: data.type },
    extra: data,
  });

  return NextResponse.json({ success: true });
}
```

## Support Email Template

**Subject:** OAuth Integration Issue - [Integration Name]

```
Hi [User Name],

We received your report about [Integration Name]:

Issue: [Description]
Time: [Timestamp]
Status: Investigating

We're looking into this and will update you within 24 hours.

In the meantime, you can try:
1. Disconnect and reconnect the integration
2. Check our status page: https://status.yourdomain.com
3. Review our troubleshooting guide: https://docs.yourdomain.com/oauth-troubleshooting

Best regards,
SINTRA Support Team
```

---

**Last Updated:** 2025-10-27
