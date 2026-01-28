/**
 * 🗺️ Sitemap Generator - Automatic Sitemap Creation
 * Comprehensive sitemap generation for better SEO
 */

import { SEO_CONFIG } from './config';

// Define all routes in the application
export const SITE_ROUTES = {
  // Public routes
  home: {
    path: '/',
    priority: 1.0,
    changefreq: 'weekly',
    lastmod: new Date().toISOString(),
  },
  
  // App routes
  agents: {
    path: '/agents',
    priority: 0.9,
    changefreq: 'daily',
    lastmod: new Date().toISOString(),
  },
  'agents-dexter': {
    path: '/agents/dexter',
    priority: 0.8,
    changefreq: 'weekly',
    lastmod: new Date().toISOString(),
  },
  'agents-cassie': {
    path: '/agents/cassie',
    priority: 0.8,
    changefreq: 'weekly',
    lastmod: new Date().toISOString(),
  },
  'agents-emmie': {
    path: '/agents/emmie',
    priority: 0.8,
    changefreq: 'weekly',
    lastmod: new Date().toISOString(),
  },
  'agents-aura': {
    path: '/agents/aura',
    priority: 0.8,
    changefreq: 'weekly',
    lastmod: new Date().toISOString(),
  },
  
  dashboard: {
    path: '/dashboard',
    priority: 0.9,
    changefreq: 'daily',
    lastmod: new Date().toISOString(),
  },
  
  settings: {
    path: '/settings',
    priority: 0.7,
    changefreq: 'monthly',
    lastmod: new Date().toISOString(),
  },
  'settings-profile': {
    path: '/settings/profile',
    priority: 0.6,
    changefreq: 'monthly',
    lastmod: new Date().toISOString(),
  },
  'settings-integrations': {
    path: '/settings/integrations',
    priority: 0.6,
    changefreq: 'monthly',
    lastmod: new Date().toISOString(),
  },
  'settings-security': {
    path: '/settings/security',
    priority: 0.6,
    changefreq: 'monthly',
    lastmod: new Date().toISOString(),
  },
  'settings-billing': {
    path: '/settings/billing',
    priority: 0.6,
    changefreq: 'monthly',
    lastmod: new Date().toISOString(),
  },
  
  knowledge: {
    path: '/knowledge',
    priority: 0.8,
    changefreq: 'weekly',
    lastmod: new Date().toISOString(),
  },
  'knowledge-base': {
    path: '/knowledge-base',
    priority: 0.8,
    changefreq: 'weekly',
    lastmod: new Date().toISOString(),
  },
  
  collaboration: {
    path: '/collaboration',
    priority: 0.8,
    changefreq: 'daily',
    lastmod: new Date().toISOString(),
  },
  
  // Platform routes
  platform: {
    path: '/platform',
    priority: 0.7,
    changefreq: 'weekly',
    lastmod: new Date().toISOString(),
  },
  
  // Documentation routes
  docs: {
    path: '/docs',
    priority: 0.7,
    changefreq: 'weekly',
    lastmod: new Date().toISOString(),
  },
  'docs-api': {
    path: '/docs/api',
    priority: 0.6,
    changefreq: 'weekly',
    lastmod: new Date().toISOString(),
  },
  'docs-getting-started': {
    path: '/docs/getting-started',
    priority: 0.6,
    changefreq: 'monthly',
    lastmod: new Date().toISOString(),
  },
  'docs-tutorials': {
    path: '/docs/tutorials',
    priority: 0.6,
    changefreq: 'weekly',
    lastmod: new Date().toISOString(),
  },
  'docs-examples': {
    path: '/docs/examples',
    priority: 0.6,
    changefreq: 'weekly',
    lastmod: new Date().toISOString(),
  },
  
  // Marketplace routes
  marketplace: {
    path: '/marketplace',
    priority: 0.7,
    changefreq: 'daily',
    lastmod: new Date().toISOString(),
  },
  
  // Blog/News routes (if applicable)
  blog: {
    path: '/blog',
    priority: 0.6,
    changefreq: 'weekly',
    lastmod: new Date().toISOString(),
  },
  
  // Legal routes
  privacy: {
    path: '/privacy',
    priority: 0.3,
    changefreq: 'yearly',
    lastmod: new Date().toISOString(),
  },
  terms: {
    path: '/terms',
    priority: 0.3,
    changefreq: 'yearly',
    lastmod: new Date().toISOString(),
  },
  imprint: {
    path: '/imprint',
    priority: 0.3,
    changefreq: 'yearly',
    lastmod: new Date().toISOString(),
  },
};

// Generate XML sitemap
export const generateSitemapXML = (): string => {
  const baseUrl = SEO_CONFIG.site.url;
  const currentDate = new Date().toISOString();
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Add all routes
  Object.values(SITE_ROUTES).forEach((route) => {
    sitemap += `  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
  });

  // Add dynamic routes (agents, etc.)
  const dynamicRoutes = [
    '/agents/[id]',
    '/settings/[section]',
    '/knowledge/[id]',
    '/docs/[slug]',
    '/marketplace/[id]',
    '/blog/[slug]',
  ];

  dynamicRoutes.forEach(route => {
    sitemap += `  <url>
    <loc>${baseUrl}${route}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
`;
  });

  sitemap += `</urlset>`;
  
  return sitemap;
};

// Generate robots.txt content
export const generateRobotsTxt = (): string => {
  const baseUrl = SEO_CONFIG.site.url;
  
  return `# Robots.txt for Sintra AI Orchestration Platform
# Generated on ${new Date().toISOString()}

User-agent: *
Allow: /

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin and private routes
Disallow: /api/
Disallow: /admin/
Disallow: /private/
Disallow: /_next/
Disallow: /static/

# Allow important public routes
Allow: /agents
Allow: /dashboard
Allow: /settings
Allow: /knowledge
Allow: /collaboration
Allow: /platform
Allow: /docs
Allow: /marketplace

# Crawl-delay for respectful crawling
Crawl-delay: 1

# Specific bot rules
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /

# Block malicious bots
User-agent: SemrushBot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /
`;
};

// Generate sitemap index for multiple sitemaps
export const generateSitemapIndex = (): string => {
  const baseUrl = SEO_CONFIG.site.url;
  const currentDate = new Date().toISOString();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-pages.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-agents.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-docs.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-dynamic.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
</sitemapindex>`;
};

// Generate specialized sitemaps
export const generatePageSitemap = (): string => {
  const baseUrl = SEO_CONFIG.site.url;
  
  const pageRoutes = [
    { path: '/', priority: 1.0 },
    { path: '/agents', priority: 0.9 },
    { path: '/dashboard', priority: 0.9 },
    { path: '/settings', priority: 0.7 },
    { path: '/knowledge', priority: 0.8 },
    { path: '/collaboration', priority: 0.8 },
    { path: '/platform', priority: 0.7 },
    { path: '/docs', priority: 0.7 },
    { path: '/marketplace', priority: 0.7 },
    { path: '/blog', priority: 0.6 },
    { path: '/privacy', priority: 0.3 },
    { path: '/terms', priority: 0.3 },
    { path: '/imprint', priority: 0.3 },
  ];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  pageRoutes.forEach(route => {
    sitemap += `  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
  });

  sitemap += `</urlset>`;
  return sitemap;
};

export const generateAgentSitemap = (): string => {
  const baseUrl = SEO_CONFIG.site.url;
  
  const agentRoutes = [
    { path: '/agents', priority: 0.9 },
    { path: '/agents/dexter', priority: 0.8 },
    { path: '/agents/cassie', priority: 0.8 },
    { path: '/agents/emmie', priority: 0.8 },
    { path: '/agents/aura', priority: 0.8 },
    { path: '/agents/marketplace', priority: 0.7 },
  ];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  agentRoutes.forEach(route => {
    sitemap += `  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
  });

  sitemap += `</urlset>`;
  return sitemap;
};

export const generateDocsSitemap = (): string => {
  const baseUrl = SEO_CONFIG.site.url;
  
  const docRoutes = [
    { path: '/docs', priority: 0.7 },
    { path: '/docs/api', priority: 0.6 },
    { path: '/docs/getting-started', priority: 0.6 },
    { path: '/docs/tutorials', priority: 0.6 },
    { path: '/docs/examples', priority: 0.6 },
  ];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  docRoutes.forEach(route => {
    sitemap += `  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
  });

  sitemap += `</urlset>`;
  return sitemap;
};

export const generateDynamicSitemap = (): string => {
  const baseUrl = SEO_CONFIG.site.url;
  
  const dynamicRoutes = [
    '/agents/[id]',
    '/settings/[section]',
    '/knowledge/[id]',
    '/docs/[slug]',
    '/marketplace/[id]',
    '/blog/[slug]',
  ];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  dynamicRoutes.forEach(route => {
    sitemap += `  <url>
    <loc>${baseUrl}${route}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
`;
  });

  sitemap += `</urlset>`;
  return sitemap;
};

// Utility functions for sitemap management
export const SitemapUtils = {
  // Validate sitemap XML
  validateSitemapXML: (xml: string): boolean => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      
      // Check for parsing errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        console.error('Sitemap XML parsing error:', parserError.textContent);
        return false;
      }
      
      // Check for required elements
      const urlset = doc.querySelector('urlset');
      if (!urlset) {
        console.error('Missing urlset element in sitemap');
        return false;
      }
      
      const urls = doc.querySelectorAll('url');
      if (urls.length === 0) {
        console.error('No URL elements found in sitemap');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Sitemap validation error:', error);
      return false;
    }
  },

  // Generate sitemap for specific content type
  generateContentSitemap: (content: Array<{
    id: string;
    path: string;
    lastmod: string;
    priority?: number;
  }>): string => {
    const baseUrl = SEO_CONFIG.site.url;
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    content.forEach(item => {
      sitemap += `  <url>
    <loc>${baseUrl}${item.path}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${item.priority || 0.5}</priority>
  </url>
`;
    });

    sitemap += `</urlset>`;
    return sitemap;
  },

  // Generate sitemap for blog posts
  generateBlogSitemap: (posts: Array<{
    slug: string;
    title: string;
    published: string;
    modified: string;
  }>): string => {
    const baseUrl = SEO_CONFIG.site.url;
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    posts.forEach(post => {
      sitemap += `  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${post.modified}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    });

    sitemap += `</urlset>`;
    return sitemap;
  },
};