/**
 * 🎯 SEO Configuration - Comprehensive SEO Setup
 * Global meta tags, structured data, and search optimization
 */

export const SEO_CONFIG = {
  // Site Information
  site: {
    name: 'Sintra AI Orchestration Platform',
    description: 'Enterprise-grade AI orchestration platform for intelligent automation and workflow management. Build, deploy, and scale AI agents with advanced capabilities.',
    url: 'https://sintra-ai.com',
    locale: 'de_DE',
    type: 'website',
    image: 'https://sintra-ai.com/og-image.jpg',
    twitter: '@sintra_ai',
    linkedin: 'https://linkedin.com/company/sintra-ai',
    github: 'https://github.com/sintra-ai',
  },

  // Organization Schema
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Sintra AI',
    url: 'https://sintra-ai.com',
    logo: 'https://sintra-ai.com/logo.png',
    description: 'Enterprise AI orchestration platform for intelligent automation',
    foundingDate: '2024',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'DE',
      addressLocality: 'Berlin',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['German', 'English'],
    },
    sameAs: [
      'https://linkedin.com/company/sintra-ai',
      'https://twitter.com/sintra_ai',
      'https://github.com/sintra-ai',
    ],
  },

  // WebSite Schema
  website: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sintra AI Orchestration Platform',
    url: 'https://sintra-ai.com',
    description: 'Enterprise-grade AI orchestration platform',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://sintra-ai.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  },

  // Software Application Schema
  software: {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Sintra AI Orchestration Platform',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    description: 'Enterprise AI orchestration platform for intelligent automation and workflow management',
    url: 'https://sintra-ai.com',
    author: {
      '@type': 'Organization',
      name: 'Sintra AI',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '127',
    },
  },

  // Breadcrumb Schema Template
  breadcrumb: (items: Array<{ name: string; url: string }>) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }),

  // Article Schema Template
  article: (data: {
    title: string;
    description: string;
    author: string;
    datePublished: string;
    dateModified: string;
    image?: string;
    url: string;
  }) => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.description,
    author: {
      '@type': 'Person',
      name: data.author,
    },
    datePublished: data.datePublished,
    dateModified: data.dateModified,
    image: data.image,
    url: data.url,
    publisher: {
      '@type': 'Organization',
      name: 'Sintra AI',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sintra-ai.com/logo.png',
      },
    },
  }),

  // FAQ Schema Template
  faq: (faqs: Array<{ question: string; answer: string }>) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }),

  // Product Schema Template (for AI Agents)
  product: (data: {
    name: string;
    description: string;
    category: string;
    url: string;
    image?: string;
  }) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: data.name,
    description: data.description,
    category: data.category,
    url: data.url,
    image: data.image,
    brand: {
      '@type': 'Brand',
      name: 'Sintra AI',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
  }),
};

// Page-specific SEO configurations
export const PAGE_SEO = {
  home: {
    title: 'Sintra AI - Enterprise AI Orchestration Platform',
    description: 'Revolutionary AI orchestration platform for intelligent automation. Build, deploy, and scale AI agents with advanced workflow management capabilities.',
    keywords: 'AI orchestration, artificial intelligence, workflow automation, AI agents, enterprise AI, machine learning, automation platform',
    ogImage: 'https://sintra-ai.com/og-home.jpg',
  },

  agents: {
    title: 'AI Agents - Sintra AI Orchestration Platform',
    description: 'Discover and deploy powerful AI agents for business automation. From data analysis to customer service - find the perfect AI solution for your needs.',
    keywords: 'AI agents, business automation, artificial intelligence, chatbot, virtual assistant, AI solutions',
    ogImage: 'https://sintra-ai.com/og-agents.jpg',
  },

  dashboard: {
    title: 'Dashboard - Sintra AI Orchestration Platform',
    description: 'Monitor and manage your AI agents and workflows from a unified dashboard. Real-time analytics and performance insights.',
    keywords: 'AI dashboard, workflow monitoring, agent management, analytics, performance tracking',
    ogImage: 'https://sintra-ai.com/og-dashboard.jpg',
  },

  settings: {
    title: 'Settings - Sintra AI Orchestration Platform',
    description: 'Configure your AI orchestration platform settings, integrations, and user preferences.',
    keywords: 'AI settings, platform configuration, user preferences, integrations',
    ogImage: 'https://sintra-ai.com/og-settings.jpg',
  },

  knowledge: {
    title: 'Knowledge Base - Sintra AI Orchestration Platform',
    description: 'Access comprehensive documentation, tutorials, and guides for the Sintra AI platform.',
    keywords: 'AI documentation, tutorials, guides, knowledge base, help, support',
    ogImage: 'https://sintra-ai.com/og-knowledge.jpg',
  },

  collaboration: {
    title: 'Collaboration - Sintra AI Orchestration Platform',
    description: 'Collaborate with AI agents on complex projects. Multi-agent workflows for enhanced productivity.',
    keywords: 'AI collaboration, multi-agent workflows, team productivity, project management',
    ogImage: 'https://sintra-ai.com/og-collaboration.jpg',
  },
};

// Social Media Meta Tags
export const SOCIAL_META = {
  twitter: {
    card: 'summary_large_image',
    site: '@sintra_ai',
    creator: '@sintra_ai',
  },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    siteName: 'Sintra AI',
  },
};

// Generate structured data for different page types
export const generateStructuredData = (type: string, data: any) => {
  switch (type) {
    case 'organization':
      return SEO_CONFIG.organization;
    case 'website':
      return SEO_CONFIG.website;
    case 'software':
      return SEO_CONFIG.software;
    case 'breadcrumb':
      return SEO_CONFIG.breadcrumb(data);
    case 'article':
      return SEO_CONFIG.article(data);
    case 'faq':
      return SEO_CONFIG.faq(data);
    case 'product':
      return SEO_CONFIG.product(data);
    default:
      return null;
  }
};

// SEO Utilities
export const SEO_UTILS = {
  // Generate canonical URL
  canonical: (path: string) => `${SEO_CONFIG.site.url}${path}`,

  // Generate alternate hreflang links
  hreflang: (path: string, locales: string[] = ['de', 'en']) => 
    locales.map(locale => ({
      href: `${SEO_CONFIG.site.url}/${locale}${path}`,
      hrefLang: locale,
    })),

  // Generate robots meta content
  robots: (options: {
    index?: boolean;
    follow?: boolean;
    googleBot?: {
      index?: boolean;
      follow?: boolean;
      'max-image-preview'?: 'none' | 'large' | 'standard';
      'max-snippet'?: number;
      'max-video-preview'?: number;
    };
  } = {}) => {
    const parts = [];
    
    if (options.index !== false) parts.push('index');
    else parts.push('noindex');
    
    if (options.follow !== false) parts.push('follow');
    else parts.push('nofollow');
    
    if (options.googleBot) {
      const botParts = [];
      if (options.googleBot.index !== false) botParts.push('index');
      else botParts.push('noindex');
      
      if (options.googleBot.follow !== false) botParts.push('follow');
      else botParts.push('nofollow');
      
      if (options.googleBot['max-image-preview']) {
        botParts.push(`max-image-preview:${options.googleBot['max-image-preview']}`);
      }
      
      if (options.googleBot['max-snippet'] !== undefined) {
        botParts.push(`max-snippet:${options.googleBot['max-snippet']}`);
      }
      
      if (options.googleBot['max-video-preview'] !== undefined) {
        botParts.push(`max-video-preview:${options.googleBot['max-video-preview']}`);
      }
      
      parts.push(`googlebot: ${botParts.join(', ')}`);
    }
    
    return parts.join(', ');
  },

  // Generate meta description with truncation
  description: (text: string, maxLength: number = 160) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  },

  // Generate keywords array from string
  keywords: (keywordString: string) => 
    keywordString.split(',').map(k => k.trim()).filter(k => k.length > 0),
};