/**
 * PIPELINE TEMPLATE TYPE DEFINITIONS
 *
 * Shared TypeScript interfaces for pipeline templates between
 * frontend and backend.
 *
 * Part of Phase 7: AI Workflow Wizard
 */

// Node types for React Flow
export type NodeType =
  | 'trigger'
  | 'agent'
  | 'action'
  | 'condition'
  | 'transform'
  | 'delay'
  | 'human-approval';

export interface WorkflowNodeData {
  label: string;
  description?: string;
  config?: Record<string, unknown>;
  color?: string;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
}

// Template categories (synced with DB enum)
export type TemplateCategory =
  | 'customer-support'
  | 'data-analysis'
  | 'content-generation'
  | 'automation'
  | 'research'
  | 'sales'
  | 'marketing'
  | 'other';

// Template complexity levels
export type TemplateComplexity = 'beginner' | 'intermediate' | 'advanced';

// Category display info for UI
export interface CategoryInfo {
  id: TemplateCategory | 'all';
  label: string;
  labelDe: string;
  icon: string; // Lucide icon name
  color: string;
}

export const CATEGORY_INFO: CategoryInfo[] = [
  { id: 'all', label: 'All', labelDe: 'Alle', icon: 'Sparkles', color: '#8B5CF6' },
  { id: 'sales', label: 'Sales', labelDe: 'Verkauf', icon: 'Target', color: '#F59E0B' },
  { id: 'marketing', label: 'Marketing', labelDe: 'Marketing', icon: 'TrendingUp', color: '#EC4899' },
  { id: 'automation', label: 'Automation', labelDe: 'Automatisierung', icon: 'Zap', color: '#8B5CF6' },
  { id: 'customer-support', label: 'Support', labelDe: 'Kundenservice', icon: 'MessageSquare', color: '#06B6D4' },
  { id: 'data-analysis', label: 'Data', labelDe: 'Daten', icon: 'BarChart', color: '#10B981' },
  { id: 'content-generation', label: 'Content', labelDe: 'Inhalte', icon: 'FileText', color: '#6366F1' },
  { id: 'research', label: 'Research', labelDe: 'Recherche', icon: 'Search', color: '#F97316' },
  { id: 'other', label: 'Other', labelDe: 'Sonstige', icon: 'Layers', color: '#6B7280' },
];

// Full template interface (from database)
export interface PipelineTemplate {
  id: string;
  name: string;
  description: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: 'draft' | 'active' | 'archived';
  visibility: 'private' | 'team' | 'public';
  isTemplate: boolean;
  templateCategory: TemplateCategory | null;
  tags: string[];

  // Enterprise template fields
  roiBadge: string | null;
  businessBenefit: string | null;
  complexity: TemplateComplexity | null;
  estimatedSetupMinutes: number | null;
  isFeatured: boolean;
  downloadCount: number;
  rating: string | null; // Stored as numeric in DB
  ratingCount: number;
  iconName: string | null;
  colorAccent: string | null;
  targetAudience: string[];
  useCases: string[];

  // Metadata
  userId: string;
  version: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

// Lightweight template for list views (API response)
export interface PipelineTemplateListItem {
  id: string;
  name: string;
  description: string | null;
  templateCategory: TemplateCategory | null;
  tags: string[];

  // Business value
  roiBadge: string | null;
  businessBenefit: string | null;
  complexity: TemplateComplexity | null;
  estimatedSetupMinutes: number | null;

  // Social proof
  isFeatured: boolean;
  downloadCount: number;
  rating: number;
  ratingCount: number;

  // Visual
  iconName: string;
  colorAccent: string;

  // Preview data (lightweight)
  nodeCount: number;
  edgeCount: number;
  nodeTypes: NodeType[];

  // For MiniGraphPreview
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

// API Response types
export interface TemplatesApiResponse {
  success: boolean;
  data: {
    templates: PipelineTemplateListItem[];
    total: number;
    featured: number;
    categories: {
      category: TemplateCategory;
      count: number;
    }[];
  };
  meta: {
    timestamp: string;
    cached: boolean;
  };
}

export interface TemplateApiResponse {
  success: boolean;
  data: {
    template: PipelineTemplate;
  };
}

// Clone template request
export interface CloneTemplateRequest {
  templateId: string;
  name?: string;
  workspaceId?: string;
}

export interface CloneTemplateResponse {
  success: boolean;
  data: {
    workflowId: string;
    name: string;
    message: string;
  };
}

// Icon mapping for node types (used in MiniGraphPreview)
export const NODE_TYPE_ICONS: Record<NodeType, string> = {
  trigger: 'Zap',
  agent: 'Bot',
  action: 'Play',
  condition: 'GitBranch',
  transform: 'Shuffle',
  delay: 'Clock',
  'human-approval': 'UserCheck',
};

// Color mapping for node types
export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  trigger: '#8B5CF6',
  agent: '#06B6D4',
  action: '#3B82F6',
  condition: '#6366F1',
  transform: '#F59E0B',
  delay: '#6B7280',
  'human-approval': '#F97316',
};

// Complexity info for UI
export const COMPLEXITY_INFO: Record<TemplateComplexity, { label: string; labelDe: string; color: string }> = {
  beginner: { label: 'Beginner', labelDe: 'Einsteiger', color: '#10B981' },
  intermediate: { label: 'Intermediate', labelDe: 'Fortgeschritten', color: '#F59E0B' },
  advanced: { label: 'Advanced', labelDe: 'Experte', color: '#EF4444' },
};
