import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel (nur in Production)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (token) {
    mixpanel.init(token, {
      debug: false,
      track_pageview: true,
      persistence: 'localStorage',
    });
  }
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
    } else {
      console.log('[Analytics] Identify:', userId, traits);
    }
  },

  // Track Page View
  trackPageView: (pageName: string) => {
    if (process.env.NODE_ENV === 'production') {
      mixpanel.track_pageview({ page: pageName });
    } else {
      console.log('[Analytics] Page View:', pageName);
    }
  },
};
