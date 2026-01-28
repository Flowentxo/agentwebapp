/**
 * Brain AI URL Scraping API
 * Endpoint: POST /api/brain/scrape
 * 
 * Fetches and extracts text content from web pages for knowledge ingestion
 */

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { knowledgeIndexer, type DocumentInput } from '@/lib/brain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface ScrapeRequest {
  url: string;
  category?: string;
  tags?: string[];
  selector?: string; // Optional CSS selector for specific content
}

function getUserId(req: NextRequest): string {
  return req.headers.get('x-user-id') || 'demo-user';
}

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

function extractMainContent($: cheerio.CheerioAPI, selector?: string): string {
  // If selector provided, try to use it
  if (selector) {
    const selected = $(selector).text();
    if (selected.trim()) {
      return cleanText(selected);
    }
  }

  // Remove script, style, nav, footer, header, aside elements
  $('script, style, nav, footer, header, aside, iframe, noscript, svg').remove();
  
  // Remove hidden elements
  $('[style*="display:none"], [style*="display: none"], [hidden]').remove();
  
  // Try common article/main content selectors
  const contentSelectors = [
    'article',
    'main',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#content',
    '.blog-post',
    '.post',
  ];

  for (const sel of contentSelectors) {
    const content = $(sel).first().text();
    if (content && content.trim().length > 200) {
      return cleanText(content);
    }
  }

  // Fallback: get body text
  const bodyText = $('body').text();
  return cleanText(bodyText);
}

function extractMetadata($: cheerio.CheerioAPI, url: string) {
  const getMetaContent = (name: string): string | undefined => {
    return $(`meta[name="${name}"]`).attr('content') ||
           $(`meta[property="${name}"]`).attr('content') ||
           $(`meta[property="og:${name}"]`).attr('content');
  };

  return {
    title: $('title').text() || 
           getMetaContent('og:title') || 
           $('h1').first().text() ||
           new URL(url).hostname,
    description: getMetaContent('description') || getMetaContent('og:description'),
    author: getMetaContent('author'),
    publishedAt: getMetaContent('article:published_time'),
    image: getMetaContent('og:image'),
    siteName: getMetaContent('og:site_name') || new URL(url).hostname,
  };
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const body: ScrapeRequest = await req.json();

    if (!body.url || !body.url.trim()) {
      return NextResponse.json(
        { success: false, error: 'URL ist erforderlich' },
        { status: 400 }
      );
    }

    if (!isValidUrl(body.url)) {
      return NextResponse.json(
        { success: false, error: 'Ungültige URL' },
        { status: 400 }
      );
    }

    // Fetch the page
    const response = await fetch(body.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrainAI/1.0; +https://brain.ai)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'de,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Konnte Seite nicht laden (HTTP ${response.status})` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return NextResponse.json(
        { success: false, error: 'URL muss eine HTML-Seite sein' },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract content and metadata
    const content = extractMainContent($, body.selector);
    const metadata = extractMetadata($, body.url);

    if (!content || content.length < 50) {
      return NextResponse.json(
        { success: false, error: 'Konnte keinen verwertbaren Text extrahieren' },
        { status: 400 }
      );
    }

    // Prepare for indexing
    const document: DocumentInput = {
      title: metadata.title,
      content: content,
      workspaceId: 'default-workspace',
      createdBy: userId,
      metadata: {
        category: body.category || 'general',
        tags: body.tags || [],
        sourceType: 'url' as const,
        source: body.url,
        siteName: metadata.siteName,
        description: metadata.description,
        author: metadata.author,
        scrapedAt: new Date().toISOString(),
      },
    };

    // Index the document
    let indexResult;
    try {
      const results = await knowledgeIndexer.indexDocuments([document]);
      indexResult = results[0];
    } catch (indexError) {
      console.warn('[Scrape API] Indexing failed:', indexError);
      // Continue without indexing - content was still extracted
    }

    const wordCount = content.split(/\s+/).length;

    return NextResponse.json({
      success: true,
      message: 'Webseite erfolgreich importiert',
      document: {
        id: indexResult?.id || `temp-${Date.now()}`,
        title: metadata.title,
        url: body.url,
        siteName: metadata.siteName,
        wordCount,
        preview: content.slice(0, 300) + (content.length > 300 ? '...' : ''),
      },
      metadata,
    });
  } catch (error) {
    console.error('[Scrape API] Error:', error);
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { success: false, error: 'Die Anfrage hat zu lange gedauert' },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Importieren der Webseite',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
