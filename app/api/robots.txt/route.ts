/**
 * 🤖 Robots.txt API Route
 * Dynamic robots.txt generation for search engine crawlers
 */

import { NextResponse } from 'next/server';
import { generateRobotsTxt } from '@/lib/seo/sitemap-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Generate robots.txt content
    const robotsTxt = generateRobotsTxt();

    // Return robots.txt with appropriate headers
    return new NextResponse(robotsTxt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
        'X-Robots-Tag': 'all',
      },
    });
  } catch (error) {
    console.error('Robots.txt generation error:', error);
    
    // Return error response with basic robots.txt
    const fallbackRobots = `User-agent: *
Allow: /

Sitemap: /sitemap.xml

# Error generating robots.txt
Disallow: /api/
Disallow: /admin/
Disallow: /private/`;

    return new NextResponse(fallbackRobots, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  }
}

// Handle HEAD requests for robots.txt validation
export async function HEAD() {
  try {
    // Just validate that we can generate robots.txt (don't need the result)
    generateRobotsTxt();
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'X-Robots-Tag': 'all',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}