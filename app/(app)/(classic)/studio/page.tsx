import dynamic from 'next/dynamic';
import { getDb } from '@/lib/db';
import { workflows } from '@/lib/db/schema-workflows';
import { eq, and } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';

// Dynamic import to avoid SSR issues with React Flow
const PipelineEditor = dynamic(
  () => import('@/components/pipelines/editor/PipelineEditor').then((mod) => mod.PipelineEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full w-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading Pipeline Studio...</p>
          <p className="text-xs text-muted-foreground/60">Initializing workflow editor</p>
        </div>
      </div>
    ),
  }
);

/**
 * Pipeline data type for hydration
 */
export interface PipelineInitialData {
  id: string;
  name: string;
  description?: string | null;
  nodes: any[];
  edges: any[];
  viewport: { x: number; y: number; zoom: number };
  status: string;
  version: string;
}

/**
 * Fetch pipeline data on the server
 */
async function getPipelineData(id: string | null): Promise<PipelineInitialData | null> {
  if (!id) return null;

  try {
    const db = getDb();

    // For server-side, we get user from headers or cookies
    // In production, this would use proper auth
    const userId = 'demo-user';

    const [pipeline] = await db
      .select({
        id: workflows.id,
        name: workflows.name,
        description: workflows.description,
        nodes: workflows.nodes,
        edges: workflows.edges,
        viewport: workflows.viewport,
        status: workflows.status,
        version: workflows.version,
      })
      .from(workflows)
      .where(
        and(
          eq(workflows.id, id),
          eq(workflows.userId, userId)
        )
      )
      .limit(1);

    if (!pipeline) {
      return null;
    }

    return {
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      nodes: pipeline.nodes || [],
      edges: pipeline.edges || [],
      viewport: pipeline.viewport || { x: 0, y: 0, zoom: 1 },
      status: pipeline.status,
      version: pipeline.version,
    };
  } catch (error) {
    console.error('[STUDIO_PAGE] Failed to fetch pipeline:', error);
    return null;
  }
}

/**
 * Pipeline Studio - Visual Workflow Editor
 *
 * Now integrated into the Dashboard shell with collapsible sidebar.
 * Access via: /studio (internal navigation)
 *
 * Features:
 * - Drag & drop node placement
 * - Visual connection editor
 * - Node configuration inspector
 * - Real-time validation
 * - Server-side hydration for existing pipelines
 */
export default async function PipelineStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const pipelineId = params.id || null;

  // Fetch pipeline data on server if ID is present
  const initialData = pipelineId ? await getPipelineData(pipelineId) : null;

  return <PipelineEditor initialData={initialData} />;
}
