# 📊 Analytics & Feature Tracking Setup

**Ziel:** Messen, wie User Brain AI nutzen → Datenbasierte Produktentscheidungen

**Empfohlene Tools:**
- **Vercel Analytics** (Recommended für Next.js) – Einfachstes Setup
- **Mixpanel** (Recommended für Feature-Tracking) – Beste UX für Product Analytics
- **Google Analytics 4** (Fallback) – Kostenlos, aber komplexer

---

## Option 1: Vercel Analytics (Recommended für Performance)

### Vorteile:
✅ Zero-Config Setup für Next.js
✅ Web Vitals automatisch getrackt
✅ Real User Monitoring
✅ Privacy-friendly (kein GDPR-Banner nötig)

### Setup (2 Minuten):

**1. Install Package:**
```bash
npm install @vercel/analytics
```

**2. Add to Root Layout:**

**`app/layout.tsx`**
```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

**3. Deploy to Vercel:**
```bash
# Analytics automatically aktiviert auf Vercel
# Dashboard: https://vercel.com/your-project/analytics
```

**Fertig!** ✅

### Was wird getrackt:
- ✅ Page Views
- ✅ Core Web Vitals (LCP, FID, CLS)
- ✅ Real User Experience Score
- ✅ Bounce Rate
- ✅ Top Pages

**Nachteil:** Kein Feature-spezifisches Tracking (z.B. "Document uploaded", "Search performed")

---

## Option 2: Mixpanel (Recommended für Feature Analytics)

### Vorteile:
✅ **Feature Usage Tracking** – Sieh genau, welche Features genutzt werden
✅ **User Journeys** – Wie navigieren User durch Brain AI?
✅ **Funnels** – Wo brechen User ab?
✅ **Cohort Analysis** – Vergleiche verschiedene User-Gruppen
✅ **A/B Testing** – Teste neue Features

### Setup:

**1. Mixpanel Account erstellen:**
```
https://mixpanel.com/register/
```

**2. Install Package:**
```bash
npm install mixpanel-browser
```

**3. Initialize Mixpanel:**

**`lib/analytics.ts`**
```typescript
import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel (nur in Production)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN!, {
    debug: false,
    track_pageview: true,
    persistence: 'localStorage',
  });
}

// Helper functions
export const analytics = {
  // Track Events
  track: (eventName: string, properties?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'production') {
      mixpanel.track(eventName, properties);
    } else {
      console.log('[Analytics]', eventName, properties);
    }
  },

  // Identify User
  identify: (userId: string, traits?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'production') {
      mixpanel.identify(userId);
      if (traits) {
        mixpanel.people.set(traits);
      }
    }
  },

  // Set User Properties
  setUserProperties: (properties: Record<string, any>) => {
    if (process.env.NODE_ENV === 'production') {
      mixpanel.people.set(properties);
    }
  },

  // Track Page View
  trackPageView: (pageName: string) => {
    if (process.env.NODE_ENV === 'production') {
      mixpanel.track_pageview({ page: pageName });
    }
  },
};
```

**4. Environment Variables:**

**`.env.local`**
```env
NEXT_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-token
```

---

### Brain AI Feature Tracking

#### **Semantic Search Tracking**

**`app/(app)/brain/page.tsx`**
```typescript
import { analytics } from '@/lib/analytics';

const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault();

  // Track search initiated
  analytics.track('Brain AI: Search Initiated', {
    searchType: useSemanticSearch ? 'semantic' : 'keyword',
    queryLength: searchQuery.length,
    feature: 'brain-ai',
  });

  try {
    // ... search logic

    // Track search completed
    analytics.track('Brain AI: Search Completed', {
      searchType: useSemanticSearch ? 'semantic' : 'keyword',
      resultCount: searchMetadata?.results?.length || 0,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    // Track search failed
    analytics.track('Brain AI: Search Failed', {
      searchType: useSemanticSearch ? 'semantic' : 'keyword',
      error: error.message,
    });
  }
};
```

#### **Document Upload Tracking**

**`components/brain/DocumentUpload.tsx`**
```typescript
import { analytics } from '@/lib/analytics';

const uploadFile = async (file: File) => {
  // Track upload started
  analytics.track('Brain AI: Document Upload Started', {
    fileType: file.type,
    fileSize: file.size,
    fileName: file.name.split('.').pop(), // Extension only
  });

  try {
    const response = await fetch('/api/brain/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    // Track upload completed
    analytics.track('Brain AI: Document Upload Completed', {
      fileType: file.type,
      fileSize: file.size,
      wordCount: result.data.wordCount,
      chunks: result.data.chunks,
      processingTime: Date.now() - startTime,
    });

    // Track insights viewed
    analytics.track('Brain AI: Document Insights Viewed', {
      hasActionItems: result.data.insights.actionItems.length > 0,
      hasPeople: result.data.insights.entities.people.length > 0,
      sentiment: result.data.insights.sentiment.overall,
    });
  } catch (error) {
    analytics.track('Brain AI: Document Upload Failed', {
      fileType: file.type,
      error: error.message,
    });
  }
};
```

#### **Meeting Intelligence Tracking**

**`components/brain/PredictiveContextEngine.tsx`**
```typescript
import { analytics } from '@/lib/analytics';

useEffect(() => {
  // Track feature viewed
  analytics.track('Brain AI: Meeting Intelligence Viewed', {
    upcomingMeetingsCount: upcomingMeetings.length,
  });
}, []);

const handleBriefingClick = (meeting: any) => {
  analytics.track('Brain AI: Meeting Briefing Opened', {
    meetingTitle: meeting.title,
    timeUntilMeeting: meeting.timeUntil,
    confidence: meeting.confidence,
  });
};
```

#### **Meeting Briefing Feedback Tracking**

**`components/brain/MeetingBriefingModal.tsx`**
```typescript
import { analytics } from '@/lib/analytics';

const submitFeedback = async (feedback: 'very_helpful' | 'helpful' | 'not_helpful') => {
  // Track feedback
  analytics.track('Brain AI: Briefing Feedback Given', {
    feedback,
    confidence: briefing.confidence,
    hasComment: !!comment.trim(),
  });

  // Send to backend...
};
```

#### **Business Ideas Tracking**

**`components/brain/BusinessIdeas.tsx`**
```typescript
import { analytics } from '@/lib/analytics';

const generateNewIdeas = async () => {
  analytics.track('Brain AI: Ideas Generation Started', {
    existingIdeasCount: ideas.length,
  });

  try {
    const response = await fetch('/api/business-ideas/generate', {
      method: 'POST',
      body: JSON.stringify({ count: 3 }),
    });

    const data = await response.json();

    analytics.track('Brain AI: Ideas Generation Completed', {
      newIdeasCount: data.ideas.length,
      categories: data.ideas.map((i: any) => i.category),
    });
  } catch (error) {
    analytics.track('Brain AI: Ideas Generation Failed', {
      error: error.message,
    });
  }
};

const updateStatus = async (ideaId: string, status: string) => {
  analytics.track('Brain AI: Idea Status Changed', {
    newStatus: status,
    previousStatus: ideas.find(i => i.id === ideaId)?.status,
  });
};
```

#### **Learning Streak Tracking**

**`components/brain/DailyLearningQuestions.tsx`**
```typescript
import { analytics } from '@/lib/analytics';

const submitAnswer = async (questionId: string, answer: string) => {
  analytics.track('Brain AI: Learning Question Answered', {
    questionId,
    answerLength: answer.length,
    currentStreak: streak,
  });

  // Track streak milestones
  if (streak === 7) {
    analytics.track('Brain AI: Learning Streak Milestone', {
      milestone: '7-day-streak',
    });
  }
};
```

#### **Tab Navigation Tracking**

**`app/(app)/brain/page.tsx`**
```typescript
const setActiveTabTracked = (tab: TabType) => {
  setActiveTab(tab);

  analytics.track('Brain AI: Tab Changed', {
    previousTab: activeTab,
    newTab: tab,
  });
};
```

---

### User Journey Tracking

**`app/(app)/brain/page.tsx`**
```typescript
import { analytics } from '@/lib/analytics';

useEffect(() => {
  // Track page view
  analytics.trackPageView('Brain AI');

  // Identify user (optional)
  analytics.identify('demo-user', {
    name: 'Demo User',
    joinedAt: new Date().toISOString(),
  });
}, []);
```

---

## Key Events to Track

### Core Events (Must-Have)
```typescript
// Page Views
analytics.trackPageView('Brain AI');

// Feature Usage
analytics.track('Brain AI: Search Initiated', { ... });
analytics.track('Brain AI: Document Uploaded', { ... });
analytics.track('Brain AI: Meeting Briefing Viewed', { ... });
analytics.track('Brain AI: Ideas Generated', { ... });
analytics.track('Brain AI: Learning Question Answered', { ... });

// Engagement
analytics.track('Brain AI: Tab Changed', { ... });
analytics.track('Brain AI: Feature Discovered', { ... });

// Outcomes
analytics.track('Brain AI: Idea Implemented', { ... });
analytics.track('Brain AI: 7-Day Streak Achieved', { ... });
```

### Success Metrics Events
```typescript
// Retention
analytics.track('Brain AI: Daily Return', { daysInRow: 3 });

// Activation
analytics.track('Brain AI: First Document Uploaded');
analytics.track('Brain AI: First Search Completed');
analytics.track('Brain AI: First Meeting Briefing');

// Referral
analytics.track('Brain AI: Invited Friend');
```

---

## Mixpanel Dashboard Setup

### Key Reports to Create:

**1. Feature Adoption Funnel**
```
Step 1: Brain AI Page Viewed
Step 2: First Search OR Document Upload
Step 3: Second Feature Used
Step 4: Daily Return
```

**2. Most Used Features**
```
Chart: Bar Chart
Events: All "Brain AI: *" events
Group by: Event Name
Timeframe: Last 30 days
```

**3. Retention Curve**
```
Chart: Retention
Event: Brain AI Page Viewed
Return Event: Brain AI Page Viewed
Timeframe: Daily, up to 30 days
```

**4. Ideas to Implementation Funnel**
```
Step 1: Ideas Generation Started
Step 2: Idea Status Changed to "Planning"
Step 3: Idea Status Changed to "Implemented"
```

**5. Learning Streak Distribution**
```
Chart: Distribution
Event: Learning Question Answered
Breakdown by: Current Streak
```

---

## Privacy & GDPR Compliance

**`components/CookieBanner.tsx`** (Optional)
```typescript
'use client';

import { useState, useEffect } from 'react';
import { analytics } from '@/lib/analytics';

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('analytics-consent');
    if (!consent) {
      setShowBanner(true);
    } else if (consent === 'accepted') {
      // Enable analytics
      analytics.track('Page Viewed');
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('analytics-consent', 'accepted');
    setShowBanner(false);
    analytics.track('Consent Given');
  };

  const handleDecline = () => {
    localStorage.setItem('analytics-consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <p className="text-sm text-gray-600">
          Wir nutzen Cookies für Analytics. Keine personenbezogenen Daten werden gespeichert.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Ablehnen
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Testing Analytics

**Development Mode:**
```typescript
// lib/analytics.ts already logs to console in dev mode

// Test events:
analytics.track('Test Event', { foo: 'bar' });
// Console: [Analytics] Test Event { foo: 'bar' }
```

**Production Mode:**
```bash
# 1. Deploy to Production
# 2. Open Mixpanel Dashboard
# 3. Go to "Live View"
# 4. Perform actions in Brain AI
# 5. See events appear in real-time
```

---

## Launch Checklist

### Setup
- [ ] Mixpanel Account erstellt
- [ ] Token in .env.local gesetzt
- [ ] analytics.ts implementiert
- [ ] Alle Core Events getrackt

### Testing
- [ ] Events in Dev Mode getestet (Console)
- [ ] Events in Production getestet (Mixpanel Live View)
- [ ] Cookie Banner funktioniert (falls GDPR)

### Dashboard
- [ ] Feature Adoption Funnel erstellt
- [ ] Retention Curve erstellt
- [ ] Most Used Features Report

---

## Next Steps

1. ✅ **Mixpanel Account erstellen** → https://mixpanel.com
2. ✅ **Install Package** → `npm install mixpanel-browser`
3. ✅ **lib/analytics.ts erstellen**
4. ✅ **Events in Brain AI Features einbauen**
5. ✅ **Deploy & Testen**
6. ✅ **Dashboards erstellen**
7. ✅ **Wöchentlich auswerten**

---

**Support:**
- 📖 Mixpanel Docs: https://docs.mixpanel.com
- 💬 Mixpanel Community: https://community.mixpanel.com
- 📧 Support: support@mixpanel.com

---

**Last Updated:** 2025-11-19
