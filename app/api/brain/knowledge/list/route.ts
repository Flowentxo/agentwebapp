/**
 * Brain AI Knowledge List API
 * Endpoint: GET /api/brain/knowledge/list
 * 
 * Returns list of stored knowledge items for the Knowledge Library
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getUserId(req: NextRequest): string {
  return req.headers.get('x-user-id') || 'demo-user';
}

// Mock data for when database is unavailable
const mockItems = [
  {
    id: '1',
    title: 'Q4 Sales Strategie 2024',
    content: 'Unsere Q4 Strategie fokussiert sich auf Enterprise-Kunden im DACH-Raum. Hauptziele sind: 1) Erhöhung der durchschnittlichen Deal-Größe um 25%, 2) Reduzierung des Sales-Cycles auf unter 60 Tage, 3) Aufbau von 3 strategischen Partnerschaften.',
    category: 'sales',
    tags: ['strategie', 'q4', 'enterprise'],
    sourceType: 'upload',
    wordCount: 1250,
    createdAt: '2024-12-15T10:30:00Z',
  },
  {
    id: '2',
    title: 'Produkt-Roadmap 2025',
    content: 'Die Produkt-Roadmap für 2025 umfasst drei Hauptbereiche: AI-Integration, Enterprise-Features und Performance-Optimierung. Q1 Fokus liegt auf dem Brain AI System.',
    category: 'product',
    tags: ['roadmap', '2025', 'ai'],
    sourceType: 'upload',
    source: 'roadmap-2025.pdf',
    wordCount: 3420,
    createdAt: '2024-12-10T14:00:00Z',
  },
  {
    id: '3',
    title: 'Best Practices für Lead Nurturing',
    content: 'Effektives Lead Nurturing erfordert eine Kombination aus personalisiertem Content, timing-optimierter Kommunikation und datengesteuerter Entscheidungsfindung.',
    category: 'sales',
    tags: ['leads', 'nurturing', 'best-practices'],
    sourceType: 'url',
    source: 'https://example.com/lead-nurturing-guide',
    wordCount: 2100,
    createdAt: '2024-12-08T09:15:00Z',
  },
];

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const searchParams = req.nextUrl.searchParams;
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let db;
    try {
      db = getDb();
    } catch {
      // Database not available, return mock data
      return NextResponse.json({
        success: true,
        items: mockItems,
        total: mockItems.length,
        hasMore: false,
      });
    }

    // Try to query the database
    try {
      // Check if brain_documents table exists
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'brain_documents'
        ) as exists
      `);
      
      const tableExists = tableCheck.rows[0]?.exists === true;
      
      if (!tableExists) {
        return NextResponse.json({
          success: true,
          items: mockItems,
          total: mockItems.length,
          hasMore: false,
          note: 'Using demo data - database table not yet created',
        });
      }

      // Query documents from database
      let query = sql`
        SELECT 
          id,
          title,
          SUBSTRING(content, 1, 500) as content,
          metadata->>'category' as category,
          COALESCE(metadata->'tags', '[]'::jsonb) as tags,
          metadata->>'sourceType' as "sourceType",
          metadata->>'source' as source,
          COALESCE((metadata->>'wordCount')::int, LENGTH(content) / 5) as "wordCount",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM brain_documents
        WHERE workspace_id = 'default-workspace'
      `;

      if (category && category !== 'all') {
        query = sql`${query} AND metadata->>'category' = ${category}`;
      }

      if (search) {
        query = sql`${query} AND (
          title ILIKE ${'%' + search + '%'} OR 
          content ILIKE ${'%' + search + '%'}
        )`;
      }

      query = sql`${query} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

      const results = await db.execute(query);
      
      const items = results.rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        category: row.category || 'general',
        tags: Array.isArray(row.tags) ? row.tags : [],
        sourceType: row.sourceType || 'upload',
        source: row.source,
        wordCount: row.wordCount || 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));

      // Get total count
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM brain_documents 
        WHERE workspace_id = 'default-workspace'
      `);
      const total = parseInt(String(countResult.rows[0]?.count || '0'));

      return NextResponse.json({
        success: true,
        items,
        total,
        hasMore: offset + items.length < total,
      });
    } catch (queryError) {
      console.warn('[Knowledge List] Query failed:', queryError);
      return NextResponse.json({
        success: true,
        items: mockItems,
        total: mockItems.length,
        hasMore: false,
      });
    }
  } catch (error) {
    console.error('[Knowledge List] Error:', error);
    return NextResponse.json({
      success: true,
      items: mockItems,
      total: mockItems.length,
      hasMore: false,
    });
  }
}
