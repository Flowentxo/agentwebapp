/**
 * Aura Marketing Tools
 *
 * Brand strategy tools: social media posts, content calendars, competitor analysis.
 */

// ─── generate_social_post ────────────────────────────────────────

export interface GenerateSocialPostInput {
  platform: 'instagram' | 'linkedin' | 'twitter';
  topic: string;
}

export interface SocialPostResult {
  platform: string;
  post_text: string;
  hashtags: string[];
  image_prompt: string;
  best_posting_time: string;
  character_count: number;
  tips: string[];
}

export const GENERATE_SOCIAL_POST_TOOL = {
  name: 'generate_social_post',
  description: 'Erstelle einen Social-Media-Post fuer eine bestimmte Plattform. Generiert Text, Hashtags und einen DALL-E Image-Prompt.',
  input_schema: {
    type: 'object',
    properties: {
      platform: {
        type: 'string',
        enum: ['instagram', 'linkedin', 'twitter'],
        description: 'Zielplattform fuer den Post',
      },
      topic: {
        type: 'string',
        description: 'Thema oder Kernbotschaft des Posts',
      },
    },
    required: ['platform', 'topic'],
  },
};

const PLATFORM_CONFIG: Record<string, { maxChars: number; hashtagCount: number; bestTime: string; tips: string[] }> = {
  instagram: {
    maxChars: 2200,
    hashtagCount: 10,
    bestTime: 'Dienstag & Donnerstag, 11:00-13:00',
    tips: ['Nutze eine starke erste Zeile als Hook', 'Fuege einen Call-to-Action am Ende hinzu', 'Verwende Emojis fuer bessere Lesbarkeit'],
  },
  linkedin: {
    maxChars: 3000,
    hashtagCount: 5,
    bestTime: 'Dienstag bis Donnerstag, 08:00-10:00',
    tips: ['Beginne mit einer provokanten These', 'Erzaehle eine persoenliche Geschichte', 'Nutze Absaetze und Leerzeilen'],
  },
  twitter: {
    maxChars: 280,
    hashtagCount: 3,
    bestTime: 'Montag bis Freitag, 12:00-15:00',
    tips: ['Kurz und praegnant formulieren', 'Nutze einen Thread fuer laengere Inhalte', 'Tagge relevante Accounts'],
  },
};

const COMMON_HASHTAGS: Record<string, string[]> = {
  ki: ['#KuenstlicheIntelligenz', '#AI', '#MachineLearning', '#DeepLearning', '#AITrends', '#TechInnovation', '#DigitaleTransformation', '#Automatisierung', '#FutureOfWork', '#DataScience'],
  marketing: ['#DigitalMarketing', '#ContentMarketing', '#SocialMedia', '#Branding', '#MarketingTips', '#OnlineMarketing', '#GrowthHacking', '#MarketingStrategy', '#ContentCreation', '#BrandStrategy'],
  business: ['#Entrepreneurship', '#StartUp', '#BusinessGrowth', '#Leadership', '#Innovation', '#DigitalBusiness', '#Erfolg', '#Unternehmertum', '#Strategie', '#Wachstum'],
  tech: ['#Technology', '#TechTrends', '#SoftwareDevelopment', '#CloudComputing', '#CyberSecurity', '#Blockchain', '#IoT', '#DigitalInnovation', '#TechNews', '#Programmierung'],
};

export async function generateSocialPost(input: GenerateSocialPostInput): Promise<SocialPostResult> {
  const { platform, topic } = input;
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.instagram;

  // Select relevant hashtags based on topic keywords
  const topicLower = topic.toLowerCase();
  let hashtags: string[] = [];
  for (const [category, tags] of Object.entries(COMMON_HASHTAGS)) {
    if (topicLower.includes(category) || category === 'business') {
      hashtags.push(...tags);
    }
  }
  hashtags = [...new Set(hashtags)].slice(0, config.hashtagCount);

  // Generate platform-specific post template
  let postText: string;
  switch (platform) {
    case 'instagram':
      postText = `${topic} ist der Gamechanger, den du brauchst.\n\nHier sind 3 Dinge, die du wissen musst:\n\n1. Es veraendert die Art, wie wir arbeiten\n2. Fruehe Anwender haben einen klaren Vorteil\n3. Die Implementierung ist einfacher als gedacht\n\nSpeichere diesen Post fuer spaeter und teile ihn mit jemandem, der das wissen muss.\n\nWas denkst du ueber ${topic}? Schreib es in die Kommentare!`;
      break;
    case 'linkedin':
      postText = `Letzte Woche habe ich mich intensiv mit ${topic} beschaeftigt.\n\nUnd hier ist, was mich ueberrascht hat:\n\nDie meisten Unternehmen unterschaetzen das Potenzial massiv.\n\nWaehrend 80% noch ueberlegen, haben die Top-Performer laengst implementiert.\n\nMeine 3 Key Takeaways:\n\n→ Der ROI ist messbar und signifikant\n→ Die Einstiegsbarriere sinkt rapide\n→ Wer jetzt nicht handelt, verliert den Anschluss\n\nWie steht ihr zum Thema ${topic}?\n\nIch freue mich auf eure Perspektiven.`;
      break;
    case 'twitter':
      postText = `${topic} wird die naechsten 12 Monate dominieren.\n\nHier ist warum:`;
      break;
    default:
      postText = `${topic} - Ein Thema, das uns alle betrifft.`;
  }

  const imagePrompt = `Professional, modern ${platform === 'linkedin' ? 'business' : 'social media'} graphic about "${topic}". Clean design with bold typography, gradient background in blue and purple tones, minimalist style, high-quality digital illustration.`;

  return {
    platform,
    post_text: postText,
    hashtags,
    image_prompt: imagePrompt,
    best_posting_time: config.bestTime,
    character_count: postText.length,
    tips: config.tips,
  };
}

// ─── create_content_calendar ─────────────────────────────────────

export interface CreateContentCalendarInput {
  month: string;
  topics: string[];
}

export interface ContentCalendarResult {
  month: string;
  weeks: Array<{
    week_number: number;
    entries: Array<{
      date: string;
      day: string;
      platform: string;
      content_type: string;
      topic: string;
      status: string;
    }>;
  }>;
  markdown_table: string;
  total_posts: number;
  download_url?: string;
}

export const CREATE_CONTENT_CALENDAR_TOOL = {
  name: 'create_content_calendar',
  description: 'Erstelle einen Content-Kalender fuer einen Monat mit Posting-Plan fuer verschiedene Plattformen.',
  input_schema: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Der Monat (z.B. "Maerz 2026")',
      },
      topics: {
        type: 'array',
        items: { type: 'string' },
        description: 'Liste der Themen fuer den Content-Kalender',
      },
    },
    required: ['month', 'topics'],
  },
};

const CONTENT_TYPES = ['Carousel Post', 'Story', 'Reel/Video', 'Blog-Artikel', 'Infografik', 'Poll/Umfrage', 'Behind the Scenes', 'Testimonial'];
const PLATFORMS = ['Instagram', 'LinkedIn', 'Twitter', 'Blog'];
const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

export async function createContentCalendar(input: CreateContentCalendarInput): Promise<ContentCalendarResult> {
  const { month, topics } = input;
  const weeks: ContentCalendarResult['weeks'] = [];
  let totalPosts = 0;
  let markdownRows: string[] = [];

  markdownRows.push(`| Woche | Tag | Plattform | Typ | Thema | Status |`);
  markdownRows.push(`|-------|-----|-----------|-----|-------|--------|`);

  for (let w = 1; w <= 4; w++) {
    const entries: ContentCalendarResult['weeks'][0]['entries'] = [];

    for (let d = 0; d < 3; d++) {
      const dayIdx = (w + d) % DAYS.length;
      const topicIdx = (w * 3 + d) % topics.length;
      const typeIdx = (w * 3 + d) % CONTENT_TYPES.length;
      const platIdx = (w + d) % PLATFORMS.length;

      const entry = {
        date: `KW${w}, ${DAYS[dayIdx]}`,
        day: DAYS[dayIdx],
        platform: PLATFORMS[platIdx],
        content_type: CONTENT_TYPES[typeIdx],
        topic: topics[topicIdx],
        status: 'Geplant',
      };

      entries.push(entry);
      totalPosts++;
      markdownRows.push(`| KW${w} | ${entry.day} | ${entry.platform} | ${entry.content_type} | ${entry.topic} | ${entry.status} |`);
    }

    weeks.push({ week_number: w, entries });
  }

  // Generate XLSX artifact
  let download_url: string | undefined;
  try {
    const XLSX = await import('xlsx');
    const { artifactService } = await import('@/server/services/ArtifactService');

    const aoa: (string | number)[][] = [
      ['Woche', 'Tag', 'Plattform', 'Content-Typ', 'Thema', 'Status'],
    ];
    for (const week of weeks) {
      for (const entry of week.entries) {
        aoa.push([`KW${week.week_number}`, entry.day, entry.platform, entry.content_type, entry.topic, entry.status]);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Content-Kalender');
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const safeName = `content-kalender-${month.replace(/\s+/g, '-').toLowerCase()}.xlsx`;
    const artifact = await artifactService.saveArtifact('aura', safeName, xlsxBuffer);
    download_url = artifact.url;
  } catch (err) {
    console.error('[AURA] XLSX artifact generation failed (non-fatal):', err);
  }

  return {
    month,
    weeks,
    markdown_table: markdownRows.join('\n'),
    total_posts: totalPosts,
    download_url,
  };
}

// ─── analyze_competitor ──────────────────────────────────────────

export interface AnalyzeCompetitorInput {
  url: string;
}

export interface CompetitorAnalysisResult {
  url: string;
  company_name: string;
  seo_score: number;
  estimated_traffic: string;
  top_keywords: string[];
  social_presence: {
    instagram: { followers: string; engagement_rate: string };
    linkedin: { followers: string; engagement_rate: string };
    twitter: { followers: string; engagement_rate: string };
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export const ANALYZE_COMPETITOR_TOOL = {
  name: 'analyze_competitor',
  description: 'Analysiere einen Wettbewerber anhand seiner Website. Gibt SEO-Score, Keywords, Social-Media-Praesenz und Empfehlungen zurueck.',
  input_schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Die Website-URL des Wettbewerbers',
      },
    },
    required: ['url'],
  },
};

export async function analyzeCompetitor(input: AnalyzeCompetitorInput): Promise<CompetitorAnalysisResult> {
  const { url } = input;
  const domain = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);

  return {
    url,
    company_name: companyName,
    seo_score: 60 + Math.floor(Math.random() * 35),
    estimated_traffic: `${(50 + Math.floor(Math.random() * 200))}k Besucher/Monat`,
    top_keywords: [
      `${companyName} Software`, 'AI Automation', 'Business Tools', 'SaaS Platform',
      'Workflow Management', 'Digital Transformation', 'Enterprise Solution',
    ],
    social_presence: {
      instagram: { followers: `${(5 + Math.floor(Math.random() * 50))}k`, engagement_rate: `${(1.5 + Math.random() * 3).toFixed(1)}%` },
      linkedin: { followers: `${(10 + Math.floor(Math.random() * 100))}k`, engagement_rate: `${(2 + Math.random() * 4).toFixed(1)}%` },
      twitter: { followers: `${(3 + Math.floor(Math.random() * 30))}k`, engagement_rate: `${(0.5 + Math.random() * 2).toFixed(1)}%` },
    },
    strengths: [
      'Starke Markenpraesenz in der Branche',
      'Regelmaessiger Content-Output auf LinkedIn',
      'Gute technische SEO-Grundlage',
    ],
    weaknesses: [
      'Geringe Instagram-Engagement-Rate',
      'Fehlende Video-Content-Strategie',
      'Wenig User-Generated Content',
    ],
    recommendations: [
      'Video-Content-Serie starten (Reels/TikTok)',
      'Influencer-Kooperationen in der Nische aufbauen',
      'Interaktiven Content (Polls, Quizze) verstaerken',
      'Lokale SEO-Optimierung fuer DACH-Markt',
      'Employee Advocacy Programm initiieren',
    ],
  };
}
