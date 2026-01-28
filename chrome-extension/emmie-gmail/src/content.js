/**
 * Emmie Gmail Extension - Ultimate AI Email Assistant
 * Version 2.0 - Complete Gmail Enhancement Suite
 *
 * Features:
 * - Smart Context Engine (Thread Summary, Action Items, Sentiment)
 * - One-Click Productivity (Meeting Scheduler, Follow-ups, Quick Tasks)
 * - Email Intelligence (Priority AI, Analytics, Smart Unsubscribe)
 * - Global Features (Translation, Grammar Check, Template Learning)
 */

(function() {
  'use strict';

  // ==========================================
  // CONFIGURATION
  // ==========================================
  const CONFIG = {
    API_BASE: 'http://localhost:3000',
    AGENT_ID: 'emmie',
    DEBUG: true,
    VERSION: '2.0.0',
    FEATURES: {
      SMART_CONTEXT: true,
      ONE_CLICK_ACTIONS: true,
      EMAIL_INTELLIGENCE: true,
      GLOBAL_FEATURES: true
    }
  };

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  let state = {
    sidebarOpen: false,
    currentEmail: null,
    currentThread: [],
    messages: [],
    isTyping: false,
    settings: {},
    analyzedEmails: new Map(),
    contactHistory: new Map(),
    followUpReminders: [],
    emailStats: {
      sent: 0,
      received: 0,
      avgResponseTime: 0
    },
    templates: [],
    recentActions: []
  };

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  const log = (...args) => CONFIG.DEBUG && console.log('[Emmie]', ...args);
  const generateId = () => Math.random().toString(36).substring(2, 15);
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  // ==========================================
  // SVG ICONS LIBRARY
  // ==========================================
  const ICONS = {
    emmie: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    sparkles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    reply: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>`,
    summarize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    translate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2v3"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>`,
    lightning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    task: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    priority: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    sentiment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    wand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h0"/><path d="M17.8 6.2L19 5"/><path d="M3 21l9-9"/><path d="M12.2 6.2L11 5"/></svg>`,
    loader: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="emmie-spin"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"/></svg>`,
    // New icons for Ultimate Edition
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    bookmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
    star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
    inbox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
    alertCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    thumbsUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`,
    messageCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
    fileText: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
  };

  // ==========================================
  // API COMMUNICATION
  // ==========================================
  async function callAPI(message, action = 'chat') {
    try {
      log(`API Call [${action}]:`, message.substring(0, 100) + '...');

      const response = await fetch(`${CONFIG.API_BASE}/api/extension/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: CONFIG.AGENT_ID,
          message: message,
          sessionId: `gmail-${action}-${generateId()}`
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const result = await response.json();
      log(`API Response [${action}]:`, result.success ? 'Success' : 'Failed');
      return result;
    } catch (error) {
      log('API Error:', error);
      throw error;
    }
  }

  // ==========================================
  // EMAIL CONTENT EXTRACTION
  // ==========================================
  function getEmailContent() {
    const subject = document.querySelector('h2[data-thread-perm-id]')?.textContent ||
                   document.querySelector('.hP')?.textContent || '';

    const bodyEl = document.querySelector('.a3s.aiL');
    const body = bodyEl?.textContent?.substring(0, 3000) || '';

    const from = document.querySelector('.gD')?.textContent ||
                document.querySelector('.go')?.textContent || '';

    const fromEmail = document.querySelector('.gD')?.getAttribute('email') ||
                     document.querySelector('.go')?.getAttribute('email') || '';

    const date = document.querySelector('.g3')?.textContent || '';

    return { subject, body, from, fromEmail, date };
  }

  function getEmailThread() {
    const messages = [];
    const messageEls = document.querySelectorAll('.gs');

    messageEls.forEach((msg, index) => {
      const from = msg.querySelector('.gD')?.textContent || '';
      const body = msg.querySelector('.a3s')?.textContent?.substring(0, 1000) || '';
      const date = msg.querySelector('.g3')?.textContent || '';

      if (body) {
        messages.push({ from, body, date, index });
      }
    });

    return messages;
  }

  // ==========================================
  // PHASE 1: SMART CONTEXT ENGINE
  // ==========================================

  // 1.1 Thread Summary
  async function summarizeThread() {
    const thread = getEmailThread();
    if (thread.length === 0) {
      showToast('No email thread found', 'warning');
      return null;
    }

    const threadText = thread.map(m => `[${m.from}]: ${m.body}`).join('\n\n');

    const prompt = `Summarize this email thread in 3-5 bullet points. Focus on:
- Main topic/request
- Key decisions made
- Action items mentioned
- Current status

Thread:
${threadText}`;

    try {
      const result = await callAPI(prompt, 'summarize-thread');
      if (result.success) {
        return result.response;
      }
    } catch (e) {
      log('Thread summary error:', e);
    }
    return null;
  }

  // 1.2 Action Item Extraction
  async function extractActionItems() {
    const email = getEmailContent();
    if (!email.body) {
      showToast('No email content found', 'warning');
      return [];
    }

    const prompt = `Extract ALL action items and tasks from this email. Return as JSON array:
[{"task": "description", "assignee": "person or 'me'", "deadline": "date if mentioned or null", "priority": "high/medium/low"}]

Email from: ${email.from}
Subject: ${email.subject}
Content: ${email.body}

Return ONLY the JSON array, no other text.`;

    try {
      const result = await callAPI(prompt, 'extract-actions');
      if (result.success) {
        const jsonMatch = result.response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      log('Action extraction error:', e);
    }
    return [];
  }

  // 1.3 Smart Reply with 3 Options
  async function generateSmartReplies() {
    const email = getEmailContent();
    if (!email.body) {
      showToast('No email to reply to', 'warning');
      return null;
    }

    const prompt = `Generate 3 different reply options for this email. Return as JSON:
{
  "quick": "A short, direct reply (1-2 sentences)",
  "detailed": "A comprehensive reply with full context",
  "professional": "A formal, business-appropriate reply"
}

Original Email:
From: ${email.from}
Subject: ${email.subject}
Content: ${email.body}

Return ONLY the JSON object, no other text.`;

    try {
      const result = await callAPI(prompt, 'smart-replies');
      if (result.success) {
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      log('Smart reply error:', e);
    }
    return null;
  }

  // 1.4 Sentiment Analysis
  async function analyzeSentiment(text) {
    if (!text || text.length < 20) return { sentiment: 'neutral', score: 0.5 };

    const prompt = `Analyze the sentiment and tone of this email. Return JSON only:
{"sentiment": "positive/negative/neutral/urgent", "score": 0.0-1.0, "tone": "friendly/formal/angry/worried/excited", "keywords": ["key", "emotional", "words"]}

Text: ${text.substring(0, 500)}

Return ONLY the JSON.`;

    try {
      const result = await callAPI(prompt, 'sentiment');
      if (result.success) {
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      log('Sentiment error:', e);
    }
    return { sentiment: 'neutral', score: 0.5 };
  }

  // ==========================================
  // PHASE 2: ONE-CLICK PRODUCTIVITY
  // ==========================================

  // 2.1 Meeting Scheduler
  async function createMeetingFromEmail() {
    const email = getEmailContent();
    if (!email.body) {
      showToast('No email content found', 'warning');
      return null;
    }

    const prompt = `Extract meeting details from this email and create a calendar invite. Return JSON:
{
  "title": "Meeting title",
  "description": "Brief description",
  "suggestedDuration": 30,
  "suggestedTimes": ["suggested date/time 1", "suggested date/time 2"],
  "attendees": ["email1", "email2"],
  "location": "location or 'Virtual'",
  "agenda": ["point 1", "point 2"]
}

Email from: ${email.from} (${email.fromEmail})
Subject: ${email.subject}
Content: ${email.body}

Return ONLY the JSON.`;

    try {
      const result = await callAPI(prompt, 'meeting');
      if (result.success) {
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      log('Meeting creation error:', e);
    }
    return null;
  }

  // 2.2 Follow-up Reminder
  function createFollowUpReminder(email, days = 3) {
    const reminder = {
      id: generateId(),
      email: email,
      createdAt: new Date().toISOString(),
      remindAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending'
    };

    state.followUpReminders.push(reminder);
    saveToStorage('followUpReminders', state.followUpReminders);

    showToast(`Follow-up reminder set for ${days} days`, 'success');
    return reminder;
  }

  // 2.3 Quick Task Creation
  async function createQuickTask() {
    const email = getEmailContent();
    const actionItems = await extractActionItems();

    return {
      title: email.subject,
      source: 'email',
      from: email.from,
      actionItems: actionItems,
      createdAt: new Date().toISOString()
    };
  }

  // 2.4 Contact Insights
  async function getContactInsights(email) {
    // Check cache first
    if (state.contactHistory.has(email)) {
      return state.contactHistory.get(email);
    }

    // In a real implementation, this would query email history
    const insights = {
      email: email,
      totalEmails: 0,
      lastContact: null,
      avgResponseTime: null,
      commonTopics: [],
      relationship: 'unknown'
    };

    state.contactHistory.set(email, insights);
    return insights;
  }

  // ==========================================
  // PHASE 3: EMAIL INTELLIGENCE
  // ==========================================

  // 3.1 Priority Analysis
  async function analyzeEmailPriority(emailData) {
    const prompt = `Analyze this email's priority. Return JSON:
{"priority": "critical/high/medium/low", "reason": "brief reason", "suggestedAction": "reply/delegate/archive/schedule", "responseTimeframe": "immediate/today/this week/no rush"}

From: ${emailData.from}
Subject: ${emailData.subject}
Preview: ${emailData.body?.substring(0, 300)}

Return ONLY the JSON.`;

    try {
      const result = await callAPI(prompt, 'priority');
      if (result.success) {
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      log('Priority analysis error:', e);
    }
    return { priority: 'medium', reason: 'Unable to analyze' };
  }

  // 3.2 Smart Unsubscribe Detection
  function detectNewsletter(emailBody) {
    const newsletterIndicators = [
      'unsubscribe',
      'opt-out',
      'email preferences',
      'manage subscriptions',
      'newsletter',
      'weekly digest',
      'daily update'
    ];

    const lowerBody = emailBody.toLowerCase();
    const isNewsletter = newsletterIndicators.some(indicator =>
      lowerBody.includes(indicator)
    );

    return {
      isNewsletter,
      hasUnsubscribeLink: lowerBody.includes('unsubscribe')
    };
  }

  // ==========================================
  // PHASE 4: GLOBAL FEATURES
  // ==========================================

  // 4.1 Real-time Translation
  async function translateEmail(targetLang = 'auto') {
    const email = getEmailContent();
    if (!email.body) {
      showToast('No email content to translate', 'warning');
      return null;
    }

    const prompt = `Translate this email to ${targetLang === 'auto' ? 'English (if not English) or German (if English)' : targetLang}.
Preserve formatting and tone. Return JSON:
{"originalLanguage": "detected language", "translatedText": "full translation", "summary": "1-line summary in target language"}

Text to translate:
${email.body}

Return ONLY the JSON.`;

    try {
      const result = await callAPI(prompt, 'translate');
      if (result.success) {
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      log('Translation error:', e);
    }
    return null;
  }

  // 4.2 Grammar & Tone Check
  async function checkGrammarAndTone(text) {
    if (!text || text.length < 10) return null;

    const prompt = `Check this email for grammar, spelling, and tone issues. Return JSON:
{
  "issues": [{"type": "grammar/spelling/tone", "original": "text", "suggestion": "fix", "explanation": "why"}],
  "overallTone": "professional/casual/friendly/formal",
  "readabilityScore": 1-10,
  "suggestions": ["improvement 1", "improvement 2"]
}

Text: ${text}

Return ONLY the JSON.`;

    try {
      const result = await callAPI(prompt, 'grammar');
      if (result.success) {
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      log('Grammar check error:', e);
    }
    return null;
  }

  // ==========================================
  // COMPOSE TOOLBAR ACTIONS
  // ==========================================
  async function handleComposeAction(action, composeBox, toolbar) {
    const email = getEmailContent();
    const currentText = composeBox.textContent.trim();

    const btn = toolbar.querySelector(`[data-action="${action}"]`);
    if (!btn) return;

    const originalContent = btn.innerHTML;
    btn.innerHTML = ICONS.loader;
    btn.disabled = true;
    btn.classList.add('loading');

    try {
      let result = null;

      switch (action) {
        case 'smart-reply':
          const replies = await generateSmartReplies();
          if (replies) {
            showReplyOptions(replies, composeBox);
          }
          break;

        case 'summarize':
          const summary = await summarizeThread();
          if (summary) {
            showResultPanel(summary, 'Thread Summary', composeBox);
          }
          break;

        case 'extract':
          const actions = await extractActionItems();
          if (actions.length > 0) {
            showActionItems(actions, composeBox);
          } else {
            showToast('No action items found', 'info');
          }
          break;

        case 'improve':
          if (!currentText) {
            showToast('Write something first', 'warning');
            break;
          }
          const improved = await improveText(currentText);
          if (improved) {
            composeBox.innerHTML = improved.replace(/\n/g, '<br>');
            showToast('Text improved!', 'success');
          }
          break;

        case 'shorten':
          if (!currentText) {
            showToast('Write something first', 'warning');
            break;
          }
          result = await callAPI(`Make this email more concise. Keep key points. Return ONLY the shortened text:\n\n${currentText}`, 'shorten');
          if (result.success) {
            composeBox.innerHTML = result.response.replace(/\n/g, '<br>');
            showToast('Shortened!', 'success');
          }
          break;

        case 'formal':
          if (!currentText) {
            showToast('Write something first', 'warning');
            break;
          }
          result = await callAPI(`Rewrite in formal, professional tone. Return ONLY the rewritten text:\n\n${currentText}`, 'formal');
          if (result.success) {
            composeBox.innerHTML = result.response.replace(/\n/g, '<br>');
            showToast('Made formal!', 'success');
          }
          break;

        case 'friendly':
          if (!currentText) {
            showToast('Write something first', 'warning');
            break;
          }
          result = await callAPI(`Rewrite in warm, friendly tone. Return ONLY the rewritten text:\n\n${currentText}`, 'friendly');
          if (result.success) {
            composeBox.innerHTML = result.response.replace(/\n/g, '<br>');
            showToast('Made friendly!', 'success');
          }
          break;

        case 'translate':
          const translation = await translateEmail();
          if (translation) {
            showResultPanel(translation.translatedText, `Translation (${translation.originalLanguage})`, composeBox);
          }
          break;

        case 'grammar':
          if (!currentText) {
            showToast('Write something first', 'warning');
            break;
          }
          const grammarResult = await checkGrammarAndTone(currentText);
          if (grammarResult) {
            showGrammarResult(grammarResult, composeBox);
          }
          break;

        case 'meeting':
          const meeting = await createMeetingFromEmail();
          if (meeting) {
            showMeetingPanel(meeting);
          }
          break;

        case 'followup':
          createFollowUpReminder(email, 3);
          break;
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      btn.innerHTML = originalContent;
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }

  async function improveText(text) {
    const result = await callAPI(`Improve this email. Fix errors, improve clarity and flow. Return ONLY the improved text:\n\n${text}`, 'improve');
    return result.success ? result.response : null;
  }

  // ==========================================
  // UI COMPONENTS
  // ==========================================

  function showReplyOptions(replies, composeBox) {
    removeExistingPanels();

    const panel = document.createElement('div');
    panel.className = 'emmie-reply-options';
    panel.innerHTML = `
      <div class="emmie-panel-header">
        <span>${ICONS.sparkles} Smart Reply Options</span>
        <button class="emmie-panel-close">${ICONS.close}</button>
      </div>
      <div class="emmie-reply-list">
        <div class="emmie-reply-option" data-type="quick">
          <div class="emmie-reply-label">${ICONS.zap} Quick</div>
          <div class="emmie-reply-preview">${replies.quick}</div>
        </div>
        <div class="emmie-reply-option" data-type="detailed">
          <div class="emmie-reply-label">${ICONS.fileText} Detailed</div>
          <div class="emmie-reply-preview">${replies.detailed}</div>
        </div>
        <div class="emmie-reply-option" data-type="professional">
          <div class="emmie-reply-label">${ICONS.user} Professional</div>
          <div class="emmie-reply-preview">${replies.professional}</div>
        </div>
      </div>
    `;

    panel.querySelector('.emmie-panel-close').addEventListener('click', () => panel.remove());

    panel.querySelectorAll('.emmie-reply-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const type = opt.dataset.type;
        composeBox.innerHTML = replies[type].replace(/\n/g, '<br>');
        panel.remove();
        showToast('Reply inserted!', 'success');
      });
    });

    composeBox.parentElement.insertBefore(panel, composeBox);
  }

  function showActionItems(actions, composeBox) {
    removeExistingPanels();

    const panel = document.createElement('div');
    panel.className = 'emmie-action-items-panel';
    panel.innerHTML = `
      <div class="emmie-panel-header">
        <span>${ICONS.task} Action Items (${actions.length})</span>
        <button class="emmie-panel-close">${ICONS.close}</button>
      </div>
      <div class="emmie-action-list">
        ${actions.map((item, i) => `
          <div class="emmie-action-item" data-index="${i}">
            <div class="emmie-action-checkbox"></div>
            <div class="emmie-action-content">
              <div class="emmie-action-task">${item.task}</div>
              <div class="emmie-action-meta">
                ${item.assignee ? `<span class="emmie-action-assignee">${ICONS.user} ${item.assignee}</span>` : ''}
                ${item.deadline ? `<span class="emmie-action-deadline">${ICONS.calendar} ${item.deadline}</span>` : ''}
                <span class="emmie-action-priority priority-${item.priority}">${item.priority}</span>
              </div>
            </div>
            <button class="emmie-action-add" title="Add to tasks">${ICONS.check}</button>
          </div>
        `).join('')}
      </div>
      <div class="emmie-action-footer">
        <button class="emmie-btn-secondary" id="emmie-copy-actions">${ICONS.copy} Copy All</button>
        <button class="emmie-btn-primary" id="emmie-add-all-tasks">${ICONS.task} Add All to Tasks</button>
      </div>
    `;

    panel.querySelector('.emmie-panel-close').addEventListener('click', () => panel.remove());

    panel.querySelector('#emmie-copy-actions').addEventListener('click', () => {
      const text = actions.map(a => `- ${a.task}${a.deadline ? ` (Due: ${a.deadline})` : ''}`).join('\n');
      navigator.clipboard.writeText(text);
      showToast('Action items copied!', 'success');
    });

    composeBox.parentElement.insertBefore(panel, composeBox);
  }

  function showResultPanel(content, title, composeBox) {
    removeExistingPanels();

    const panel = document.createElement('div');
    panel.className = 'emmie-result-panel';
    panel.innerHTML = `
      <div class="emmie-panel-header">
        <span>${ICONS.sparkles} ${title}</span>
        <div class="emmie-panel-actions">
          <button class="emmie-panel-btn" data-action="copy" title="Copy">${ICONS.copy}</button>
          <button class="emmie-panel-btn" data-action="insert" title="Insert">${ICONS.check}</button>
          <button class="emmie-panel-close">${ICONS.close}</button>
        </div>
      </div>
      <div class="emmie-result-content">${formatMessage(content)}</div>
    `;

    panel.querySelector('.emmie-panel-close').addEventListener('click', () => panel.remove());

    panel.querySelector('[data-action="copy"]').addEventListener('click', () => {
      navigator.clipboard.writeText(content);
      showToast('Copied!', 'success');
    });

    panel.querySelector('[data-action="insert"]').addEventListener('click', () => {
      composeBox.innerHTML = content.replace(/\n/g, '<br>');
      panel.remove();
      showToast('Inserted!', 'success');
    });

    composeBox.parentElement.insertBefore(panel, composeBox);
  }

  function showGrammarResult(result, composeBox) {
    removeExistingPanels();

    const panel = document.createElement('div');
    panel.className = 'emmie-grammar-panel';

    const issuesList = result.issues.length > 0
      ? result.issues.map(issue => `
          <div class="emmie-grammar-issue">
            <span class="emmie-issue-type ${issue.type}">${issue.type}</span>
            <span class="emmie-issue-original">"${issue.original}"</span>
            <span class="emmie-issue-arrow">→</span>
            <span class="emmie-issue-suggestion">"${issue.suggestion}"</span>
          </div>
        `).join('')
      : '<div class="emmie-no-issues">No issues found!</div>';

    panel.innerHTML = `
      <div class="emmie-panel-header">
        <span>${ICONS.check} Grammar & Tone Check</span>
        <button class="emmie-panel-close">${ICONS.close}</button>
      </div>
      <div class="emmie-grammar-stats">
        <div class="emmie-stat">
          <span class="emmie-stat-label">Tone</span>
          <span class="emmie-stat-value">${result.overallTone}</span>
        </div>
        <div class="emmie-stat">
          <span class="emmie-stat-label">Readability</span>
          <span class="emmie-stat-value">${result.readabilityScore}/10</span>
        </div>
      </div>
      <div class="emmie-grammar-issues">${issuesList}</div>
      ${result.suggestions.length > 0 ? `
        <div class="emmie-grammar-suggestions">
          <div class="emmie-suggestions-title">Suggestions:</div>
          <ul>${result.suggestions.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
      ` : ''}
    `;

    panel.querySelector('.emmie-panel-close').addEventListener('click', () => panel.remove());
    composeBox.parentElement.insertBefore(panel, composeBox);
  }

  function showMeetingPanel(meeting) {
    removeExistingPanels();

    const panel = document.createElement('div');
    panel.className = 'emmie-meeting-panel';
    panel.innerHTML = `
      <div class="emmie-panel-header">
        <span>${ICONS.calendar} Create Meeting</span>
        <button class="emmie-panel-close">${ICONS.close}</button>
      </div>
      <div class="emmie-meeting-form">
        <div class="emmie-form-group">
          <label>Title</label>
          <input type="text" id="emmie-meeting-title" value="${meeting.title}">
        </div>
        <div class="emmie-form-group">
          <label>Duration</label>
          <select id="emmie-meeting-duration">
            <option value="15">15 minutes</option>
            <option value="30" ${meeting.suggestedDuration === 30 ? 'selected' : ''}>30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60" ${meeting.suggestedDuration === 60 ? 'selected' : ''}>1 hour</option>
          </select>
        </div>
        <div class="emmie-form-group">
          <label>Location</label>
          <input type="text" id="emmie-meeting-location" value="${meeting.location}">
        </div>
        <div class="emmie-form-group">
          <label>Attendees</label>
          <input type="text" id="emmie-meeting-attendees" value="${meeting.attendees.join(', ')}">
        </div>
        ${meeting.agenda.length > 0 ? `
          <div class="emmie-meeting-agenda">
            <label>Agenda</label>
            <ul>${meeting.agenda.map(a => `<li>${a}</li>`).join('')}</ul>
          </div>
        ` : ''}
      </div>
      <div class="emmie-panel-footer">
        <button class="emmie-btn-secondary" id="emmie-meeting-cancel">Cancel</button>
        <button class="emmie-btn-primary" id="emmie-meeting-create">${ICONS.calendar} Open in Calendar</button>
      </div>
    `;

    panel.querySelector('.emmie-panel-close').addEventListener('click', () => panel.remove());
    panel.querySelector('#emmie-meeting-cancel').addEventListener('click', () => panel.remove());

    panel.querySelector('#emmie-meeting-create').addEventListener('click', () => {
      const title = panel.querySelector('#emmie-meeting-title').value;
      const duration = panel.querySelector('#emmie-meeting-duration').value;
      const location = panel.querySelector('#emmie-meeting-location').value;

      // Create Google Calendar URL
      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(meeting.description)}&location=${encodeURIComponent(location)}`;

      window.open(calendarUrl, '_blank');
      panel.remove();
      showToast('Opening Google Calendar...', 'success');
    });

    document.body.appendChild(panel);
  }

  function removeExistingPanels() {
    document.querySelectorAll('.emmie-reply-options, .emmie-action-items-panel, .emmie-result-panel, .emmie-grammar-panel, .emmie-meeting-panel').forEach(p => p.remove());
  }

  // ==========================================
  // SMART COMPOSE ENHANCEMENT
  // ==========================================
  const enhancedSendAreas = new WeakSet();

  function initSmartCompose() {
    log('Initializing Ultimate Smart Compose...');

    function findAndEnhanceComposeWindows() {
      cleanupDuplicateToolbars();

      const sendButtonVariants = [
        '[data-tooltip="Send"]',
        '[data-tooltip="Senden"]',
        '[data-tooltip="Envoyer"]',
        '[data-tooltip="Enviar"]',
        '.gU.Up',
        '.aoO'
      ];

      for (const btnSelector of sendButtonVariants) {
        const sendButtons = document.querySelectorAll(btnSelector);
        sendButtons.forEach(sendBtn => {
          const sendRow = findSendRow(sendBtn);
          if (sendRow && !enhancedSendAreas.has(sendRow) && !sendRow.querySelector('.emmie-send-toolbar')) {
            log('Enhancing compose window');
            enhanceSendRow(sendRow, sendBtn);
          }
        });
      }
    }

    function findSendRow(sendBtn) {
      let parent = sendBtn.parentElement;
      for (let i = 0; i < 6 && parent; i++) {
        if (parent.tagName === 'TR' ||
            parent.classList.contains('btC') ||
            parent.classList.contains('IZ') ||
            parent.classList.contains('aDh') ||
            parent.classList.contains('bAK')) {
          return parent;
        }
        const style = getComputedStyle(parent);
        if (style.display === 'flex' && parent.children.length > 1) {
          return parent;
        }
        parent = parent.parentElement;
      }
      return sendBtn.parentElement?.parentElement;
    }

    function cleanupDuplicateToolbars() {
      const containers = new Map();
      document.querySelectorAll('.emmie-send-toolbar').forEach(toolbar => {
        const parent = toolbar.parentElement;
        if (!parent) {
          toolbar.remove();
        } else if (containers.has(parent)) {
          toolbar.remove();
        } else {
          containers.set(parent, toolbar);
        }
      });
    }

    setTimeout(findAndEnhanceComposeWindows, 1000);
    setTimeout(findAndEnhanceComposeWindows, 2500);

    const observer = new MutationObserver(debounce(() => {
      findAndEnhanceComposeWindows();
    }, 500));

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    log('Smart Compose initialized');
  }

  function enhanceSendRow(sendRow, sendBtn) {
    if (sendRow.querySelector('.emmie-send-toolbar')) return;
    enhancedSendAreas.add(sendRow);

    const composeWindow = sendRow.closest('.M9') ||
                          sendRow.closest('.iN') ||
                          sendRow.closest('.nH.Hd') ||
                          sendRow.closest('div[role="dialog"]') ||
                          sendRow.closest('.aoP') ||
                          sendRow.closest('.AD');

    const composeBoxSelectors = [
      '.Am.Al.editable',
      '[aria-label="Message Body"]',
      '[aria-label="Nachrichtentext"]',
      '[contenteditable="true"][role="textbox"]',
      '.editable[contenteditable="true"]',
      'div[contenteditable="true"]'
    ];

    let composeBox = null;
    if (composeWindow) {
      for (const selector of composeBoxSelectors) {
        composeBox = composeWindow.querySelector(selector);
        if (composeBox) break;
      }
    }

    const email = getEmailContent();
    const isReply = email.body && email.body.length > 0;

    // Create Ultimate Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'emmie-send-toolbar';
    toolbar.id = 'emmie-toolbar-' + generateId();

    toolbar.innerHTML = `
      ${isReply ? `
        <button class="emmie-mini-btn emmie-btn-primary" data-action="smart-reply" title="Smart Reply (3 Options)">
          ${ICONS.sparkles}
        </button>
        <button class="emmie-mini-btn" data-action="summarize" title="Summarize Thread">
          ${ICONS.summarize}
        </button>
        <button class="emmie-mini-btn" data-action="extract" title="Extract Action Items">
          ${ICONS.task}
        </button>
      ` : ''}
      <button class="emmie-mini-btn" data-action="improve" title="Improve Text">
        ${ICONS.wand}
      </button>
      <button class="emmie-mini-btn" data-action="grammar" title="Grammar & Tone Check">
        ${ICONS.check}
      </button>
      <button class="emmie-mini-btn" data-action="formal" title="Make Formal">
        F
      </button>
      <button class="emmie-mini-btn" data-action="friendly" title="Make Friendly">
        ${ICONS.sentiment}
      </button>
      <button class="emmie-mini-btn" data-action="translate" title="Translate">
        ${ICONS.globe}
      </button>
      ${isReply ? `
        <div class="emmie-mini-divider"></div>
        <button class="emmie-mini-btn" data-action="meeting" title="Schedule Meeting">
          ${ICONS.calendar}
        </button>
        <button class="emmie-mini-btn" data-action="followup" title="Set Follow-up Reminder">
          ${ICONS.bell}
        </button>
      ` : ''}
      <div class="emmie-mini-divider"></div>
      <span class="emmie-mini-label">Emmie AI</span>
    `;

    // Insert toolbar
    try {
      const sendCell = sendBtn.closest('td');
      if (sendCell) {
        const toolbarCell = document.createElement('td');
        toolbarCell.style.cssText = 'vertical-align: middle; padding-left: 4px;';
        toolbarCell.appendChild(toolbar);
        sendCell.insertAdjacentElement('afterend', toolbarCell);
      } else {
        const sendBtnWrapper = sendBtn.closest('.gU') || sendBtn.closest('[role="button"]');
        if (sendBtnWrapper) {
          sendBtnWrapper.after(toolbar);
        } else {
          sendBtn.parentElement?.after(toolbar) || sendBtn.after(toolbar);
        }
      }
    } catch (e) {
      log('Toolbar insertion error:', e);
      return;
    }

    // Event handlers
    toolbar.addEventListener('mouseenter', (e) => e.stopPropagation());
    toolbar.addEventListener('mouseover', (e) => e.stopPropagation());
    toolbar.addEventListener('mousemove', (e) => e.stopPropagation());

    toolbar.querySelectorAll('.emmie-mini-btn').forEach(btn => {
      btn.addEventListener('mouseenter', (e) => e.stopPropagation());
      btn.addEventListener('mouseover', (e) => e.stopPropagation());

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        let targetBox = composeBox;
        if (!targetBox && composeWindow) {
          for (const selector of composeBoxSelectors) {
            targetBox = composeWindow.querySelector(selector);
            if (targetBox) break;
          }
        }
        if (!targetBox) {
          targetBox = document.querySelector('.Am.Al.editable') ||
                      document.querySelector('[contenteditable="true"][role="textbox"]');
        }

        if (targetBox) {
          handleComposeAction(btn.dataset.action, targetBox, toolbar);
          setTimeout(() => targetBox.focus(), 100);
        } else {
          showToast('Click in compose area first', 'warning');
        }
      });
    });

    log('Ultimate toolbar added');
  }

  // ==========================================
  // INBOX INTELLIGENCE
  // ==========================================
  function initInboxIntelligence() {
    log('Initializing Inbox Intelligence...');

    const observer = new MutationObserver(debounce(() => {
      enhanceInboxRows();
    }, 300));

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial enhancement
    setTimeout(enhanceInboxRows, 2000);
  }

  async function enhanceInboxRows() {
    const emailRows = document.querySelectorAll('tr.zA:not([data-emmie-enhanced])');

    emailRows.forEach(async (row) => {
      row.dataset.emmieEnhanced = 'true';

      const subjectEl = row.querySelector('.bog, .y6');
      const snippetEl = row.querySelector('.y2');
      const fromEl = row.querySelector('.yX, .zF');

      if (!subjectEl) return;

      const subject = subjectEl.textContent;
      const snippet = snippetEl?.textContent || '';
      const from = fromEl?.textContent || '';
      const emailId = row.querySelector('[data-thread-id]')?.dataset.threadId || generateId();

      // Check for newsletter
      const newsletterInfo = detectNewsletter(snippet);
      if (newsletterInfo.isNewsletter) {
        addNewsletterBadge(row);
      }

      // Analyze priority (throttled)
      if (!state.analyzedEmails.has(emailId)) {
        setTimeout(async () => {
          try {
            const analysis = await analyzeEmailPriority({ subject, body: snippet, from });
            state.analyzedEmails.set(emailId, analysis);
            addPriorityBadge(row, analysis);
          } catch (e) {
            // Silent fail for individual emails
          }
        }, Math.random() * 3000);
      } else {
        addPriorityBadge(row, state.analyzedEmails.get(emailId));
      }
    });
  }

  function addPriorityBadge(row, analysis) {
    const subjectCell = row.querySelector('.xT, .a4W');
    if (!subjectCell || subjectCell.querySelector('.emmie-priority-indicator')) return;

    const badge = document.createElement('span');
    badge.className = `emmie-priority-indicator priority-${analysis.priority}`;
    badge.title = analysis.reason;

    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };

    badge.textContent = icons[analysis.priority] || '';
    subjectCell.insertBefore(badge, subjectCell.firstChild);
  }

  function addNewsletterBadge(row) {
    const subjectCell = row.querySelector('.xT, .a4W');
    if (!subjectCell || subjectCell.querySelector('.emmie-newsletter-badge')) return;

    const badge = document.createElement('span');
    badge.className = 'emmie-newsletter-badge';
    badge.textContent = '📰';
    badge.title = 'Newsletter - Click to unsubscribe';

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast('Looking for unsubscribe link...', 'info');
      // In real implementation, would find and highlight unsubscribe link
    });

    subjectCell.insertBefore(badge, subjectCell.firstChild);
  }

  // ==========================================
  // FLOATING ACTION BUTTON & SIDEBAR
  // ==========================================
  function createFAB() {
    const fab = document.createElement('button');
    fab.className = 'emmie-fab';
    fab.innerHTML = `
      <div class="emmie-fab-icon">${ICONS.sparkles}</div>
      <div class="emmie-fab-pulse"></div>
    `;
    fab.title = 'Emmie AI Assistant';
    fab.addEventListener('click', toggleSidebar);
    document.body.appendChild(fab);
    return fab;
  }

  function createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.className = 'emmie-sidebar';
    sidebar.id = 'emmie-sidebar';

    sidebar.innerHTML = `
      <div class="emmie-header">
        <div class="emmie-header-title">
          <div class="emmie-logo">${ICONS.sparkles}</div>
          <div>
            <h2>Emmie AI</h2>
            <div class="emmie-header-subtitle">Ultimate Email Assistant</div>
          </div>
        </div>
        <button class="emmie-close-btn" id="emmie-close">${ICONS.close}</button>
      </div>

      <div class="emmie-quick-actions">
        <button class="emmie-action-btn" data-action="summarize-current">
          ${ICONS.summarize}
          <span>Summarize</span>
        </button>
        <button class="emmie-action-btn" data-action="smart-reply-current">
          ${ICONS.reply}
          <span>Smart Reply</span>
        </button>
        <button class="emmie-action-btn" data-action="extract-actions">
          ${ICONS.task}
          <span>Action Items</span>
        </button>
        <button class="emmie-action-btn" data-action="translate-current">
          ${ICONS.globe}
          <span>Translate</span>
        </button>
      </div>

      <div class="emmie-context" id="emmie-context" style="display: none;">
        <div class="emmie-context-label">Current Email</div>
        <div class="emmie-context-content">
          <div class="emmie-context-icon">${ICONS.mail}</div>
          <div class="emmie-context-info">
            <div class="emmie-context-title" id="emmie-context-title">No email selected</div>
            <div class="emmie-context-meta" id="emmie-context-meta">Select an email to get started</div>
          </div>
        </div>
      </div>

      <div class="emmie-stats-bar">
        <div class="emmie-stat-item">
          <span class="emmie-stat-icon">${ICONS.inbox}</span>
          <span class="emmie-stat-value" id="emmie-stat-analyzed">0</span>
          <span class="emmie-stat-label">Analyzed</span>
        </div>
        <div class="emmie-stat-item">
          <span class="emmie-stat-icon">${ICONS.bell}</span>
          <span class="emmie-stat-value" id="emmie-stat-reminders">${state.followUpReminders.length}</span>
          <span class="emmie-stat-label">Reminders</span>
        </div>
        <div class="emmie-stat-item">
          <span class="emmie-stat-icon">${ICONS.zap}</span>
          <span class="emmie-stat-value" id="emmie-stat-actions">${state.recentActions.length}</span>
          <span class="emmie-stat-label">Actions</span>
        </div>
      </div>

      <div class="emmie-chat-container">
        <div class="emmie-messages" id="emmie-messages">
          <div class="emmie-message assistant">
            <div class="emmie-message-content">
              Hi! I'm Emmie, your AI email assistant. I can help you:
              <ul>
                <li><strong>Summarize</strong> email threads</li>
                <li><strong>Generate</strong> smart replies</li>
                <li><strong>Extract</strong> action items</li>
                <li><strong>Schedule</strong> meetings</li>
                <li><strong>Translate</strong> emails</li>
                <li><strong>Check</strong> grammar & tone</li>
              </ul>
              Select an email or ask me anything!
            </div>
          </div>
        </div>
      </div>

      <div class="emmie-input-area">
        <div class="emmie-input-wrapper">
          <textarea class="emmie-input" id="emmie-input" placeholder="Ask Emmie anything..." rows="1"></textarea>
          <button class="emmie-send-btn" id="emmie-send">${ICONS.send}</button>
        </div>
      </div>
    `;

    document.body.appendChild(sidebar);

    // Event listeners
    document.getElementById('emmie-close').addEventListener('click', toggleSidebar);
    document.getElementById('emmie-send').addEventListener('click', sendChatMessage);

    const input = document.getElementById('emmie-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Quick action handlers
    sidebar.querySelectorAll('.emmie-action-btn').forEach(btn => {
      btn.addEventListener('click', () => handleSidebarAction(btn.dataset.action));
    });

    return sidebar;
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'emmie-overlay';
    overlay.id = 'emmie-overlay';
    overlay.addEventListener('click', toggleSidebar);
    document.body.appendChild(overlay);
    return overlay;
  }

  function toggleSidebar() {
    const sidebar = document.getElementById('emmie-sidebar');
    const overlay = document.getElementById('emmie-overlay');

    state.sidebarOpen = !state.sidebarOpen;

    if (state.sidebarOpen) {
      sidebar.classList.add('open');
      overlay.classList.add('visible');
      detectCurrentEmail();
      updateStats();
    } else {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    }
  }

  function detectCurrentEmail() {
    const email = getEmailContent();
    if (email.subject || email.body) {
      state.currentEmail = email;

      const contextEl = document.getElementById('emmie-context');
      const titleEl = document.getElementById('emmie-context-title');
      const metaEl = document.getElementById('emmie-context-meta');

      if (contextEl && titleEl && metaEl) {
        contextEl.style.display = 'block';
        titleEl.textContent = email.subject || 'No Subject';
        metaEl.textContent = `From: ${email.from}`;
      }
    }
  }

  function updateStats() {
    const analyzedEl = document.getElementById('emmie-stat-analyzed');
    const remindersEl = document.getElementById('emmie-stat-reminders');
    const actionsEl = document.getElementById('emmie-stat-actions');

    if (analyzedEl) analyzedEl.textContent = state.analyzedEmails.size;
    if (remindersEl) remindersEl.textContent = state.followUpReminders.length;
    if (actionsEl) actionsEl.textContent = state.recentActions.length;
  }

  async function handleSidebarAction(action) {
    const email = getEmailContent();

    switch (action) {
      case 'summarize-current':
        if (!email.body) {
          showToast('Open an email first', 'warning');
          return;
        }
        addChatMessage('Summarize this email', 'user');
        showTypingIndicator();
        const summary = await summarizeThread();
        hideTypingIndicator();
        if (summary) {
          addChatMessage(summary, 'assistant');
        }
        break;

      case 'smart-reply-current':
        if (!email.body) {
          showToast('Open an email first', 'warning');
          return;
        }
        addChatMessage('Generate smart replies', 'user');
        showTypingIndicator();
        const replies = await generateSmartReplies();
        hideTypingIndicator();
        if (replies) {
          addChatMessage(`Here are 3 reply options:\n\n**Quick:**\n${replies.quick}\n\n**Detailed:**\n${replies.detailed}\n\n**Professional:**\n${replies.professional}`, 'assistant');
        }
        break;

      case 'extract-actions':
        if (!email.body) {
          showToast('Open an email first', 'warning');
          return;
        }
        addChatMessage('Extract action items', 'user');
        showTypingIndicator();
        const actions = await extractActionItems();
        hideTypingIndicator();
        if (actions.length > 0) {
          const actionList = actions.map((a, i) => `${i + 1}. ${a.task}${a.deadline ? ` (Due: ${a.deadline})` : ''}`).join('\n');
          addChatMessage(`Found ${actions.length} action items:\n\n${actionList}`, 'assistant');
        } else {
          addChatMessage('No specific action items found in this email.', 'assistant');
        }
        break;

      case 'translate-current':
        if (!email.body) {
          showToast('Open an email first', 'warning');
          return;
        }
        addChatMessage('Translate this email', 'user');
        showTypingIndicator();
        const translation = await translateEmail();
        hideTypingIndicator();
        if (translation) {
          addChatMessage(`**Original Language:** ${translation.originalLanguage}\n\n**Translation:**\n${translation.translatedText}`, 'assistant');
        }
        break;
    }
  }

  async function sendChatMessage() {
    const input = document.getElementById('emmie-input');
    const message = input.value.trim();

    if (!message || state.isTyping) return;

    addChatMessage(message, 'user');
    input.value = '';
    input.style.height = 'auto';

    showTypingIndicator();

    try {
      let context = '';
      if (state.currentEmail) {
        context = `[Current Email]\nSubject: ${state.currentEmail.subject}\nFrom: ${state.currentEmail.from}\nBody: ${state.currentEmail.body?.substring(0, 500)}\n\n`;
      }

      const result = await callAPI(context + message, 'chat');
      hideTypingIndicator();

      if (result.success && result.response) {
        addChatMessage(result.response, 'assistant');
        state.recentActions.push({ type: 'chat', timestamp: new Date().toISOString() });
      } else {
        throw new Error('No response');
      }
    } catch (error) {
      hideTypingIndicator();
      addChatMessage(`Sorry, I encountered an error: ${error.message}`, 'assistant');
    }
  }

  function addChatMessage(content, role) {
    const messagesEl = document.getElementById('emmie-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `emmie-message ${role}`;
    messageDiv.innerHTML = `<div class="emmie-message-content">${formatMessage(content)}</div>`;
    messagesEl.appendChild(messageDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    state.messages.push({ role, content });
  }

  function showTypingIndicator() {
    const messagesEl = document.getElementById('emmie-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'emmie-typing';
    typingDiv.id = 'emmie-typing';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(typingDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    state.isTyping = true;
  }

  function hideTypingIndicator() {
    const typingEl = document.getElementById('emmie-typing');
    if (typingEl) typingEl.remove();
    state.isTyping = false;
  }

  // ==========================================
  // UTILITIES
  // ==========================================
  function formatMessage(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  function showToast(message, type = 'success') {
    const existing = document.querySelector('.emmie-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `emmie-toast ${type}`;

    const icons = {
      success: ICONS.check,
      error: ICONS.alertCircle,
      warning: ICONS.alertCircle,
      info: ICONS.sparkles
    };

    toast.innerHTML = `
      <div class="emmie-toast-icon">${icons[type] || icons.info}</div>
      <div class="emmie-toast-message">${message}</div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function saveToStorage(key, value) {
    try {
      localStorage.setItem(`emmie_${key}`, JSON.stringify(value));
    } catch (e) {
      log('Storage error:', e);
    }
  }

  function loadFromStorage(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(`emmie_${key}`);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================
  function init() {
    log(`Initializing Emmie Ultimate Edition v${CONFIG.VERSION}...`);

    const waitForGmail = setInterval(() => {
      if (document.querySelector('[role="main"]') || document.querySelector('.nH')) {
        clearInterval(waitForGmail);

        // Load saved state
        state.followUpReminders = loadFromStorage('followUpReminders', []);

        // Initialize core UI
        createOverlay();
        createSidebar();
        createFAB();

        // Initialize features
        if (CONFIG.FEATURES.SMART_CONTEXT) {
          initSmartCompose();
        }

        if (CONFIG.FEATURES.EMAIL_INTELLIGENCE) {
          initInboxIntelligence();
        }

        log(`Emmie Ultimate Edition v${CONFIG.VERSION} initialized!`);
        showToast('Emmie AI Ready!', 'success');
      }
    }, 500);

    setTimeout(() => clearInterval(waitForGmail), 15000);
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
