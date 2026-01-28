# 🧪 Predictive Context Engine - Testing & Validation Guide

## ✅ Complete Testing Checklist

Use this guide to validate that the Predictive Context Engine is working perfectly after OAuth setup.

---

## Prerequisites

Before testing, ensure:

- ✅ Backend running on port 4000
- ✅ Frontend running on port 3000
- ✅ PostgreSQL running
- ✅ Google OAuth credentials set in `.env.local`
- ✅ Database migration completed

---

## Phase 1: Backend API Testing (cURL)

### 1.1 Calendar Status Check

```bash
curl http://localhost:4000/api/calendar/status -H "x-user-id: demo-user"
```

**Expected Response (Before OAuth):**
```json
{
  "connected": false,
  "message": "No calendar integration found"
}
```

**Expected Response (After OAuth):**
```json
{
  "connected": true,
  "email": "your@email.com",
  "provider": "google",
  "lastSync": "2025-01-18T10:30:00.000Z"
}
```

---

### 1.2 Get OAuth URL

```bash
curl http://localhost:4000/api/calendar/auth -H "x-user-id: demo-user"
```

**Expected Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=...",
  "message": "Redirect user to this URL to authorize calendar access"
}
```

✅ **Validation**: URL should contain `accounts.google.com` and `scope=calendar`

---

### 1.3 Sync Calendar (After OAuth)

```bash
curl -X POST http://localhost:4000/api/calendar/sync -H "x-user-id: demo-user"
```

**Expected Response:**
```json
{
  "success": true,
  "eventsSynced": 15,
  "lastSync": "2025-01-18T10:35:00.000Z"
}
```

✅ **Validation**: `eventsSynced` > 0 if you have upcoming events

---

### 1.4 Get Upcoming Events

```bash
curl "http://localhost:4000/api/calendar/events?hours=24" -H "x-user-id: demo-user"
```

**Expected Response:**
```json
{
  "events": [
    {
      "id": "uuid-here",
      "title": "Team Standup",
      "startTime": "2025-01-18T14:00:00.000Z",
      "endTime": "2025-01-18T14:30:00.000Z",
      "location": "Google Meet",
      "attendees": [...],
      "meetingLink": "https://meet.google.com/..."
    }
  ]
}
```

✅ **Validation**: Events array should contain your real calendar events

---

### 1.5 Predict Context for Event

```bash
# Replace EVENT_ID with actual event ID from previous response
curl -X POST http://localhost:4000/api/predictions/predict/EVENT_ID \
  -H "x-user-id: demo-user"
```

**Expected Response:**
```json
{
  "prediction": {
    "id": "uuid-here",
    "eventId": "event-uuid",
    "predictedContext": [
      {
        "type": "company",
        "value": "Acme Corp",
        "relevance": 0.95,
        "source": "recent_conversation"
      },
      {
        "type": "pain_point",
        "value": "Pricing concerns",
        "relevance": 0.87,
        "source": "support_ticket"
      }
    ],
    "confidence": "high",
    "createdAt": "2025-01-18T10:40:00.000Z"
  }
}
```

✅ **Validation**:
- `predictedContext` array has 5-15 items
- `confidence` is one of: low, medium, high, critical
- Each context has `type`, `value`, `relevance`, `source`

---

### 1.6 Generate Briefing

```bash
# Replace EVENT_ID with actual event ID
curl -X POST http://localhost:4000/api/predictions/briefing/EVENT_ID \
  -H "x-user-id: demo-user"
```

**Expected Response:**
```json
{
  "briefing": {
    "id": "uuid-here",
    "eventId": "event-uuid",
    "title": "Briefing: Team Standup",
    "summary": "This is a recurring team standup meeting...",
    "keyPoints": [
      "Discuss sprint progress",
      "Review blockers",
      "Plan for next sprint"
    ],
    "suggestedTalkingPoints": [
      "Review Q4 roadmap alignment",
      "Discuss resource allocation",
      ...
    ],
    "lastInteractions": [...],
    "painPoints": [...],
    "competitorIntel": [...],
    "actionItems": [...],
    "confidence": "high"
  }
}
```

✅ **Validation**:
- `summary` is 2-3 sentences
- `keyPoints` array has 3-5 items
- `suggestedTalkingPoints` array has 5-7 items
- All sections properly formatted

---

### 1.7 Get Existing Briefing

```bash
# Replace EVENT_ID with actual event ID
curl http://localhost:4000/api/predictions/briefing/EVENT_ID \
  -H "x-user-id: demo-user"
```

**Expected Response:** Same as 1.6

✅ **Validation**: Briefing is retrieved from database (faster than generation)

---

### 1.8 Check Scheduler Status

```bash
curl http://localhost:4000/api/predictions/scheduler/status
```

**Expected Response:**
```json
{
  "running": true,
  "checkIntervalMs": 900000,
  "predictionWindowMinutes": 60,
  "lastCheck": "2025-01-18T10:45:00.000Z",
  "nextCheck": "2025-01-18T11:00:00.000Z"
}
```

✅ **Validation**: `running: true` confirms scheduler is active

---

### 1.9 Manual Scheduler Trigger

```bash
curl -X POST http://localhost:4000/api/predictions/scheduler/trigger
```

**Expected Response:**
```json
{
  "success": true,
  "processedEvents": 3,
  "predictionsCreated": 2,
  "briefingsGenerated": 2,
  "duration": 8543
}
```

✅ **Validation**: Events are processed and briefings generated

---

## Phase 2: Frontend UI Testing

### 2.1 Navigate to Brain AI Tab

1. Open browser: `http://localhost:3000/brain`
2. Scroll to **"Predictive Context Engine"** section (top of page)

✅ **Expected**: Blue/green gradient box visible

---

### 2.2 Test Calendar Connection (Before OAuth)

**What you should see:**
- 🔵 Blue gradient box
- Title: "🔮 Predictive Context Engine"
- Subtitle explaining the feature
- Button: "Connect Google Calendar"

**Action**: Click "Connect Google Calendar"

**Expected Behavior:**
- Redirects to `accounts.google.com/o/oauth2/v2/auth...`
- Shows Google account selection
- Shows permission request for Calendar access

---

### 2.3 Complete OAuth Flow

1. Select your Google account
2. Review permissions:
   - ✅ View your calendars
   - ✅ View events on all your calendars
3. Click "Allow"

**Expected Behavior:**
- Redirects back to: `http://localhost:3000/api/oauth/google/callback?code=...`
- Then redirects to: `http://localhost:3000/brain` (or configured redirect)
- Calendar Connect box changes from blue to **green**

---

### 2.4 Test Calendar Connection (After OAuth)

**What you should see:**
- 🟢 Green gradient box
- Title: "Calendar Connected"
- Your email address displayed
- Provider: "Google"
- Button: "Disconnect"

✅ **Validation**: Connection successful

---

### 2.5 Test Upcoming Meetings Widget

**What you should see:**
- Section title: "📅 Upcoming Meetings (Next 24h)"
- List of your upcoming meetings
- Each meeting card shows:
  - Meeting title
  - Time badge (e.g., "In 2h 30min")
  - Location (if available)
  - Attendees count
  - "Join Meeting" link (for video calls)
  - Status badge or action button

**Action**: Wait for auto-refresh (5 minutes) or reload page

✅ **Validation**: Real calendar events are displayed

---

### 2.6 Test Generate Briefing (Manual)

**Find a meeting without a briefing badge**

**Action**: Click "Generate Briefing" button

**Expected Behavior:**
1. Button text changes to "Generating..." with spinner
2. Wait 8-12 seconds
3. Button changes to "View Briefing" with green badge "Briefing Ready 🌟"

✅ **Validation**: Briefing generation works

---

### 2.7 Test View Briefing Modal

**Action**: Click "View Briefing" button

**Expected Behavior:**
1. Full-screen modal opens
2. Header shows:
   - Meeting title
   - Time and date
   - Confidence badge (Low/Medium/High/Critical)
   - Close button (X)

3. Sections displayed:
   - 📄 **Summary**: Blue box with 2-3 sentence overview
   - 🎯 **Key Points**: Bulleted list with green checkmarks
   - 💬 **Recent Interactions**: Purple boxes with timeline
   - ⚠️ **Pain Points**: Orange boxes with alerts
   - 💡 **Suggested Talking Points**: Yellow boxes (5-7 items)
   - 🏆 **Competitor Intelligence**: Red boxes (if applicable)
   - 💰 **Pricing Information**: Green box (if applicable)
   - ✅ **Action Items**: Blue boxes with todo list

4. Bottom of modal:
   - Feedback buttons: 👍 "Very Helpful" | 👎 "Not Helpful"

**Action**: Click 👍 "Very Helpful"

**Expected**: Feedback submitted successfully

**Action**: Click X to close modal

✅ **Validation**: Briefing displays all sections properly

---

### 2.8 Test Auto-Refresh

**Wait 5 minutes** (or reload page)

**Expected Behavior:**
- Upcoming meetings widget refreshes automatically
- New briefings show "Briefing Ready" badge
- No page reload required

✅ **Validation**: Auto-refresh works

---

### 2.9 Test Disconnect Calendar

**Action**: Click "Disconnect" button in Calendar Connect box

**Expected Behavior:**
1. Box changes from green back to blue
2. "Connect Google Calendar" button appears
3. Upcoming Meetings widget shows "Connect calendar to see meetings"

✅ **Validation**: Disconnect works

---

## Phase 3: Automated Testing Script

### 3.1 Run Integration Test Suite

```bash
npx tsx scripts/test-predictive-context.ts
```

**Expected Output:**
```
🧪 Starting Predictive Context Engine Integration Tests...

Backend URL: http://localhost:4000
Test User ID: demo-user

✅ 1. Calendar Status Check - PASSED (123ms)
   Calendar connected: true
   Email: your@email.com
   Provider: google

✅ 2. OAuth URL Generation - PASSED (45ms)
   OAuth URL generated: https://accounts.google.com/o/oauth2/v2/auth?access_type=offline...

✅ 3. Calendar Sync - PASSED (1876ms)
   Events synced: 12
   Sync time: 1/18/2025, 10:30:00 AM

✅ 4. Get Events - PASSED (234ms)
   Events found: 5
   First event: "Team Standup" at 1/18/2025, 2:00:00 PM

✅ 5. Predict Context - PASSED (987ms)
   Contexts predicted: 12
   Confidence: high

✅ 6. Generate Briefing - PASSED (9543ms)
   Briefing generated: "Briefing: Team Standup"
   Summary length: 287 chars
   Key points: 5
   Talking points: 7

✅ 7. Get Briefing - PASSED (156ms)
   Briefing retrieved: "Briefing: Team Standup"

✅ 8. Scheduler Status - PASSED (67ms)
   Scheduler running: true
   Check interval: 900000ms (15 minutes)
   Prediction window: 60 minutes
   Last check: 2025-01-18T10:45:00.000Z

✅ 9. Manual Scheduler Trigger - PASSED (8234ms)
   Scheduler triggered manually
   Events processed: 3
   Predictions created: 2
   Briefings generated: 2

================================================================================
📊 TEST SUMMARY
================================================================================
Total Tests: 9
✅ Passed: 9
❌ Failed: 0
⏭️  Skipped: 0

Detailed Results:
✅ 1. Calendar Status Check - PASS (123ms)
✅ 2. OAuth URL Generation - PASS (45ms)
✅ 3. Calendar Sync - PASS (1876ms)
✅ 4. Get Events - PASS (234ms)
✅ 5. Predict Context - PASS (987ms)
✅ 6. Generate Briefing - PASS (9543ms)
✅ 7. Get Briefing - PASS (156ms)
✅ 8. Scheduler Status - PASS (67ms)
✅ 9. Manual Scheduler Trigger - PASS (8234ms)
================================================================================

🎉 ALL TESTS PASSED! Predictive Context Engine is working perfectly!
```

✅ **Validation**: All 9 tests should pass

---

## Phase 4: Real-World Testing

### 4.1 Create Test Meeting

1. Go to Google Calendar
2. Create a meeting for **30 minutes from now**:
   - Title: "Sales Call with Acme Corp"
   - Add attendee: someone@acme.com
   - Add video link
3. Save event

---

### 4.2 Wait for Auto-Prediction

**Timeline:**
- **0 min**: Meeting created
- **15 min**: Scheduler runs (first check)
- **16 min**: Briefing should be auto-generated
- **30 min**: Meeting starts

**Check Progress:**
1. Refresh Brain AI page after 16 minutes
2. Look for "Briefing Ready 🌟" badge on new meeting
3. Click "View Briefing"
4. Verify briefing was auto-generated (without manual click!)

✅ **Validation**: Background automation works!

---

### 4.3 Test Briefing Accuracy

**Review the generated briefing for:**

1. **Summary**: Does it accurately describe the meeting?
2. **Key Points**: Are they relevant?
3. **Suggested Talking Points**: Are they actionable?
4. **Context**: Does it reference related data (if available)?

**Give Feedback:**
- 👍 if briefing is helpful
- 👎 if not helpful

---

## Phase 5: Performance Testing

### 5.1 Measure Response Times

| Operation | Expected Time | Acceptable Range |
|-----------|---------------|------------------|
| Calendar Status Check | < 100ms | 50-200ms |
| OAuth URL Generation | < 100ms | 50-200ms |
| Calendar Sync (50 events) | ~2s | 1-5s |
| Get Events | < 300ms | 100-500ms |
| Predict Context | ~1s | 500ms-2s |
| Generate Briefing (GPT-4) | ~10s | 8-15s |
| Get Existing Briefing | < 200ms | 100-400ms |
| Scheduler Check | < 100ms | 50-200ms |

✅ **Validation**: Times within acceptable range

---

### 5.2 Test Auto-Refresh Performance

1. Open Brain AI tab
2. Open browser DevTools (F12) → Network tab
3. Wait 5 minutes
4. Check auto-refresh requests

**Expected:**
- Request to `/api/calendar/events?hours=24` every 5 minutes
- No page reload
- Smooth update without flicker

✅ **Validation**: Auto-refresh doesn't impact performance

---

## Phase 6: Edge Cases Testing

### 6.1 No Upcoming Events

1. Ensure your calendar has **no events** in next 24h
2. Refresh Brain AI page

**Expected:**
- Empty state message: "No upcoming meetings in the next 24 hours"
- No error messages

---

### 6.2 Event Without Attendees

1. Create solo event (no attendees)
2. Wait for sync
3. Generate briefing

**Expected:**
- Briefing still generates
- Focuses on event title/description only

---

### 6.3 Very Long Event Title

1. Create event with 200+ character title
2. Sync and view in UI

**Expected:**
- Title truncates gracefully in list view
- Full title shows in briefing modal

---

### 6.4 Token Expiry

1. Connect calendar
2. Wait until token expires (check `tokenExpiry` in database)
3. Try to sync

**Expected:**
- Token auto-refreshes before expiry
- Sync continues without error

---

### 6.5 Network Error

1. Stop backend server
2. Try to generate briefing in frontend

**Expected:**
- Error message displayed to user
- No white screen/crash
- Graceful error handling

---

## Troubleshooting

### Issue: "Redirect URI mismatch"

**Solution:**
1. Check Google Cloud Console → OAuth Client
2. Verify redirect URI exactly matches: `http://localhost:3000/api/oauth/google/callback`
3. No trailing slash!
4. Save and wait 1-2 minutes

---

### Issue: "Calendar not syncing"

**Solution:**
1. Check backend logs for errors
2. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
3. Restart backend server
4. Try manual sync: `POST /api/calendar/sync`

---

### Issue: "Briefing generation fails"

**Solution:**
1. Check `OPENAI_API_KEY` is set
2. Check OpenAI account has credits
3. Check backend logs for OpenAI errors
4. Try with simpler event title

---

### Issue: "Scheduler not running"

**Solution:**
1. Check backend logs on startup
2. Should see: "✅ Predictive Context Engine scheduler started"
3. Check `/api/predictions/scheduler/status`
4. Restart backend if needed

---

## Success Criteria

✅ **MVP is successful if:**

1. ✅ User can connect Google Calendar via OAuth
2. ✅ Events sync automatically from Google Calendar
3. ✅ User can manually generate briefings
4. ✅ Briefings auto-generate 60 minutes before meetings
5. ✅ User can view briefings in beautiful modal
6. ✅ User finds briefings helpful (positive feedback)
7. ✅ Background scheduler runs every 15 minutes
8. ✅ No crashes or white screens

---

## Performance Benchmarks

**Acceptable Metrics:**

- Calendar Sync: < 5s for 100 events
- Context Prediction: < 2s for 15 contexts
- Briefing Generation: < 15s (depends on GPT-4)
- Scheduler Cycle: < 30s for 10 events
- Frontend Load: < 2s initial render
- Auto-Refresh: < 500ms

---

## Next Steps After Validation

Once all tests pass:

1. ✅ **Demo Video**: Record screen demo (2-min)
2. ✅ **User Testing**: Test with real users
3. ✅ **Feedback Collection**: Track 👍/👎 ratings
4. ✅ **Iterate**: Improve based on feedback
5. ✅ **Launch**: Ship to production!

---

**Status**: Ready for testing once OAuth setup is complete! 🚀

**Expected Testing Time**: ~30 minutes (comprehensive)

**Quick Smoke Test**: ~5 minutes (just verify it works)
