/**
 * 🎯 SEO Head Component - Dynamic Meta Tags and Structured Data
 * Comprehensive SEO implementation for all pages
 */

'use client';

import { useEffect } from 'react';
import Head from 'next/head';
import { SEO_CONFIG, PAGE_SEO, SOCIAL_META, generateStructuredData, SEO_UTILS } from './config';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  twitterImage?: string;
  structuredData?: any;
  noIndex?: boolean;
  noFollow?: boolean;
  breadcrumbs?: Array<{ name: string; url: string }>;
  article?: {
    title: string;
    description: string;
    author: string;
    datePublished: string;
    dateModified: string;
    image?: string;
    url: string;
  };
  faq?: Array<{ question: string; answer: string }>;
  product?: {
    name: string;
    description: string;
    category: string;
    url: string;
    image?: string;
  };
  children?: React.ReactNode;
}

export default function SEOHead({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  ogType = 'website',
  twitterImage,
  structuredData,
  noIndex = false,
  noFollow = false,
  breadcrumbs,
  article,
  faq,
  product,
  children,
}: SEOHeadProps) {
  // Default values
  const pageTitle = title || SEO_CONFIG.site.name;
  const pageDescription = description || SEO_CONFIG.site.description;
  const pageKeywords = keywords || PAGE_SEO.home.keywords;
  const pageCanonical = canonical || SEO_UTILS.canonical('');
  const pageOgImage = ogImage || SEO_CONFIG.site.image;
  const pageTwitterImage = twitterImage || pageOgImage;

  // Generate structured data
  const structuredDataArray = [];

  // Always include organization and website schema
  structuredDataArray.push(SEO_CONFIG.organization);
  structuredDataArray.push(SEO_CONFIG.website);

  // Add software schema for application pages
  if (ogType === 'website' || !ogType) {
    structuredDataArray.push(SEO_CONFIG.software);
  }

  // Add breadcrumb schema
  if (breadcrumbs && breadcrumbs.length > 0) {
    structuredDataArray.push(generateStructuredData('breadcrumb', breadcrumbs));
  }

  // Add article schema
  if (article) {
    structuredDataArray.push(generateStructuredData('article', article));
  }

  // Add FAQ schema
  if (faq && faq.length > 0) {
    structuredDataArray.push(generateStructuredData('faq', faq));
  }

  // Add product schema
  if (product) {
    structuredDataArray.push(generateStructuredData('product', product));
  }

  // Add custom structured data
  if (structuredData) {
    structuredDataArray.push(structuredData);
  }

  // Generate robots meta content
  const robotsContent = SEO_UTILS.robots({
    index: !noIndex,
    follow: !noFollow,
    googleBot: {
      index: !noIndex,
      follow: !noFollow,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  });

  // Generate alternate hreflang links
  const hreflangLinks = SEO_UTILS.hreflang('', ['de', 'en']);

  useEffect(() => {
    // Update document title
    document.title = pageTitle;

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', pageDescription);
    }

    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = pageCanonical;

    // Update Open Graph tags
    const updateOrCreateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Open Graph tags
    updateOrCreateMeta('og:title', pageTitle);
    updateOrCreateMeta('og:description', pageDescription);
    updateOrCreateMeta('og:image', pageOgImage);
    updateOrCreateMeta('og:url', pageCanonical);
    updateOrCreateMeta('og:type', ogType);
    updateOrCreateMeta('og:site_name', SEO_CONFIG.site.name);
    updateOrCreateMeta('og:locale', SEO_CONFIG.site.locale);

    // Twitter Card tags
    updateOrCreateMeta('twitter:card', SOCIAL_META.twitter.card);
    updateOrCreateMeta('twitter:site', SOCIAL_META.twitter.site);
    updateOrCreateMeta('twitter:creator', SOCIAL_META.twitter.creator);
    updateOrCreateMeta('twitter:title', pageTitle);
    updateOrCreateMeta('twitter:description', pageDescription);
    updateOrCreateMeta('twitter:image', pageTwitterImage);

    // Additional meta tags
    updateOrCreateMeta('twitter:image:alt', pageTitle);
    updateOrCreateMeta('og:image:alt', pageTitle);
    updateOrCreateMeta('og:image:width', '1200');
    updateOrCreateMeta('og:image:height', '630');

    // Keywords meta tag
    let keywordsMeta = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
    if (!keywordsMeta) {
      keywordsMeta = document.createElement('meta');
      keywordsMeta.name = 'keywords';
      document.head.appendChild(keywordsMeta);
    }
    keywordsMeta.setAttribute('content', pageKeywords);

    // Robots meta tag
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', robotsContent);

    // Additional SEO meta tags
    updateOrCreateMeta('author', 'Sintra AI');
    updateOrCreateMeta('publisher', 'Sintra AI');
    updateOrCreateMeta('robots', robotsContent);

    // Viewport meta tag (ensure it's present)
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      viewportMeta.content = 'width=device-width, initial-scale=1';
      document.head.appendChild(viewportMeta);
    }

    // Theme color meta tag
    let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      themeColorMeta.content = '#000000';
      document.head.appendChild(themeColorMeta);
    }

    // Microsoft meta tags
    updateOrCreateMeta('msapplication-TileColor', '#000000');
    updateOrCreateMeta('msapplication-config', '/browser-config.xml');

  }, [pageTitle, pageDescription, pageKeywords, pageCanonical, pageOgImage, pageTwitterImage, ogType, robotsContent]);

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <meta name="author" content="Sintra AI" />
      <meta name="robots" content={robotsContent} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#000000" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={pageCanonical} />
      
      {/* Alternate Languages */}
      {hreflangLinks.map((link, index) => (
        <link key={index} rel="alternate" hrefLang={link.hrefLang} href={link.href} />
      ))}
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageOgImage} />
      <meta property="og:url" content={pageCanonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SEO_CONFIG.site.name} />
      <meta property="og:locale" content={SEO_CONFIG.site.locale} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={pageTitle} />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={SOCIAL_META.twitter.card} />
      <meta name="twitter:site" content={SOCIAL_META.twitter.site} />
      <meta name="twitter:creator" content={SOCIAL_META.twitter.creator} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageTwitterImage} />
      <meta name="twitter:image:alt" content={pageTitle} />
      
      {/* Microsoft Meta Tags */}
      <meta name="msapplication-TileColor" content="#000000" />
      <meta name="msapplication-config" content="/browser-config.xml" />
      
      {/* Apple Meta Tags */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Sintra AI" />
      
      {/* Structured Data */}
      {structuredDataArray.map((data, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(data, null, 2),
          }}
        />
      ))}
      
      {/* Additional Head Content */}
      {children}
    </Head>
  );
}

// Pre-configured SEO components for common pages
export const HomeSEO = () => (
  <SEOHead
    title={PAGE_SEO.home.title}
    description={PAGE_SEO.home.description}
    keywords={PAGE_SEO.home.keywords}
    ogImage={PAGE_SEO.home.ogImage}
    structuredData={generateStructuredData('organization', {})}
  />
);

export const AgentsSEO = () => (
  <SEOHead
    title={PAGE_SEO.agents.title}
    description={PAGE_SEO.agents.description}
    keywords={PAGE_SEO.agents.keywords}
    ogImage={PAGE_SEO.agents.ogImage}
    breadcrumbs={[
      { name: 'Home', url: '/' },
      { name: 'AI Agents', url: '/agents' },
    ]}
  />
);

export const DashboardSEO = () => (
  <SEOHead
    title={PAGE_SEO.dashboard.title}
    description={PAGE_SEO.dashboard.description}
    keywords={PAGE_SEO.dashboard.keywords}
    ogImage={PAGE_SEO.dashboard.ogImage}
    breadcrumbs={[
      { name: 'Home', url: '/' },
      { name: 'Dashboard', url: '/dashboard' },
    ]}
  />
);

export const SettingsSEO = () => (
  <SEOHead
    title={PAGE_SEO.settings.title}
    description={PAGE_SEO.settings.description}
    keywords={PAGE_SEO.settings.keywords}
    ogImage={PAGE_SEO.settings.ogImage}
    breadcrumbs={[
      { name: 'Home', url: '/' },
      { name: 'Settings', url: '/settings' },
    ]}
  />
);

export const KnowledgeSEO = () => (
  <SEOHead
    title={PAGE_SEO.knowledge.title}
    description={PAGE_SEO.knowledge.description}
    keywords={PAGE_SEO.knowledge.keywords}
    ogImage={PAGE_SEO.knowledge.ogImage}
    breadcrumbs={[
      { name: 'Home', url: '/' },
      { name: 'Knowledge Base', url: '/knowledge' },
    ]}
  />
);

export const CollaborationSEO = () => (
  <SEOHead
    title={PAGE_SEO.collaboration.title}
    description={PAGE_SEO.collaboration.description}
    keywords={PAGE_SEO.collaboration.keywords}
    ogImage={PAGE_SEO.collaboration.ogImage}
    breadcrumbs={[
      { name: 'Home', url: '/' },
      { name: 'Collaboration', url: '/collaboration' },
    ]}
  />
);