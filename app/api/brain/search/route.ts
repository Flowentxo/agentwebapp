/**
 * Brain AI Search API with Streaming AI Responses
 * Endpoint: POST /api/brain/search
 *
 * Combines semantic search with OpenAI to provide intelligent,
 * context-aware answers to user queries.
 *
 * Flow:
 * 1. Query Brain AI knowledge base (semantic search)
 * 2. Retrieve relevant context (documents, memories, insights)
 * 3. Generate AI response using OpenAI with context
 * 4. Stream response back to client
 */

import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { brainService } from '@/lib/brain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface SearchRequest {
  query: string;
  userId?: string;
  workspaceId?: string;
  includeContext?: boolean;
  searchType?: 'semantic' | 'keyword' | 'hybrid';
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body: SearchRequest = await req.json();
    const { query, userId = 'default-user', workspaceId = 'default-workspace', includeContext = true, searchType = 'hybrid' } = body;

    if (!query || query.trim().length === 0) {
      return new Response('Query is required', { status: 400 });
    }

    // Step 1: Query Brain AI for relevant context
    let searchResults;
    try {
      searchResults = await brainService.query(query, {
        workspaceId,
        userId,
        searchType: searchType as any,
        limit: 5,
        minSimilarity: 0.6,
        includeContext: false, // Disable context until pgvector is installed
      });
    } catch (error) {
      console.warn('[Brain Search API] Search failed, using empty results:', error);
      // Fallback to empty results
      searchResults = {
        documents: [],
        totalResults: 0,
        searchType: 'fallback',
        responseTime: 0,
      };
    }

    // Step 2: Build context from search results
    const context = searchResults.documents.map((doc, i) =>
      `[Quelle ${i + 1}] ${doc.title}\n${doc.content.slice(0, 300)}...`
    ).join('\n\n');

    // Step 3: Build system prompt
    const systemPrompt = `Du bist Brain AI, ein intelligenter Assistent mit Zugriff auf das Wissen und die Daten des Users.

**DEINE ROLLE:**
- Beantworte Fragen präzise und hilfreich
- Nutze die bereitgestellten Quellen als Kontext
- Sei proaktiv und schlage relevante Follow-up Actions vor
- Verwende einen freundlichen, professionellen Ton

**VERFÜGBARE DATEN:**
${context || 'Keine spezifischen Daten gefunden. Nutze dein allgemeines Wissen.'}

**WICHTIG:**
- Wenn Daten vorhanden sind, referenziere sie mit [Quelle X]
- Wenn keine Daten vorhanden sind, sage das ehrlich
- Gebe konkrete, actionable Antworten
- Formatiere die Antwort mit Markdown (Listen, Überschriften, Code-Blöcke)`;

    // Step 4: Stream OpenAI response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const openaiStream = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: query }
            ],
            temperature: 0.7,
            max_tokens: 2000,
            stream: true,
          });

          for await (const chunk of openaiStream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk: content })}\n\n`)
              );
            }
          }

          // Send completion signal with metadata and search results
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              done: true,
              metadata: {
                sources: searchResults.documents.length,
                responseTime: searchResults.responseTime,
                searchType,
                results: searchResults.documents.map(doc => ({
                  id: doc.id,
                  title: doc.title,
                  content: doc.content.slice(0, 200),
                  similarity: doc.similarity,
                })),
              }
            })}\n\n`)
          );
        } catch (error) {
          console.error('[Brain Search API] Stream error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
          );
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[Brain Search API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process search', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// GET method for simple searches (non-streaming)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q') || searchParams.get('query');

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter "q" or "query" is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = searchParams.get('userId') || 'default-user';
    const workspaceId = searchParams.get('workspaceId') || 'default-workspace';

    // Quick search without streaming
    const searchResults = await brainService.query(query, {
      workspaceId,
      userId,
      searchType: 'hybrid',
      limit: 5,
    });

    return new Response(
      JSON.stringify({
        success: true,
        query,
        results: searchResults.documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.content.slice(0, 200),
          similarity: doc.similarity,
        })),
        totalResults: searchResults.totalResults,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Brain Search API GET] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process search', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
