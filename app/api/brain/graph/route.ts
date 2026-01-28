
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { brainDocuments } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

// GRAPH TYPES
interface GraphNode {
  id: string;
  name: string;
  group: 'doc' | 'tag' | 'category' | 'core';
  val: number; // Size
}

interface GraphLink {
  source: string;
  target: string;
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    // 1. Fetch Brain Documents
    const docs = await db.select().from(brainDocuments).limit(100).orderBy(desc(brainDocuments.createdAt));

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const tagMap = new Set<string>();
    const catMap = new Set<string>();

    // 2. Create Core Node
    nodes.push({ id: 'core', name: 'Brain Core', group: 'core', val: 40 });

    // 3. Process Docs
    docs.forEach(doc => {
      // DOC NODE
      nodes.push({
        id: doc.id,
        name: doc.title,
        group: 'doc',
        val: 10
      });

      // EXTRACT METADATA
      const meta = doc.metadata || {};
      const category = (meta.category || 'Uncategorized') as string;
      const tags = (meta.tags || []) as string[];

      // CATEGORY NODE & LINK
      if (category && category !== 'Uncategorized') {
         if (!catMap.has(category)) {
            catMap.add(category);
            nodes.push({ id: `cat-${category}`, name: category, group: 'category', val: 25 });
            // Link Category to Core
            links.push({ source: 'core', target: `cat-${category}` });
         }
         // Link Doc to Category
         links.push({ source: doc.id, target: `cat-${category}` });
      } else {
         // Link to Core if no category
         links.push({ source: doc.id, target: 'core' });
      }

      // TAG NODES & LINKS
      if (Array.isArray(tags)) {
        tags.forEach(tag => {
          if (!tag) return;
          const tagId = `tag-${tag}`;
          
          if (!tagMap.has(tagId)) {
             tagMap.add(tagId);
             nodes.push({ id: tagId, name: tag, group: 'tag', val: 5 });
             // Link Tag to Category? Or just float? 
             // Let's link Tag to Doc
          }
          links.push({ source: doc.id, target: tagId });
        });
      }
    });

    return NextResponse.json({ nodes, links });
    
  } catch (error) {
    console.error('[GraphAPI] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch graph' }, { status: 500 });
  }
}
