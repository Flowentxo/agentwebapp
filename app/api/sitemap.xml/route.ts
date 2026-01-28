/**
 * 🗺️ Sitemap XML API Route
 * Dynamic sitemap generation for search engines
 */

import { NextResponse } from 'next/server';
import { generateSitemapXML, SitemapUtils } from '@/lib/seo/sitemap-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Generate sitemap XML
    const sitemapXML = generateSitemapXML();
    
    // Validate generated sitemap
    const isValid = SitemapUtils.validateSitemapXML(sitemapXML);
    if (!isValid) {
      console.error('Generated sitemap XML is invalid');
      return NextResponse.json(
        { error: 'Invalid sitemap generated' },
        { status: 500 }
      );
    }

    // Return sitemap with appropriate headers
    return new NextResponse(sitemapXML, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
        'X-Robots-Tag': 'all',
      },
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to generate sitemap',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// Handle HEAD requests for sitemap validation
export async function HEAD() {
  try {
    // Generate sitemap XML for validation
    const sitemapXML = generateSitemapXML();
    
    // Validate generated sitemap
    const isValid = SitemapUtils.validateSitemapXML(sitemapXML);
    
    return new NextResponse(null, {
      status: isValid ? 200 : 500,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Robots-Tag': 'all',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}