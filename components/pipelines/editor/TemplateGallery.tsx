'use client';

/**
 * TEMPLATE GALLERY v2.0
 *
 * This component renders inside a React Portal to escape all parent CSS contexts.
 * It uses z-[9999] to ensure it appears above everything else.
 *
 * FEATURES:
 * - Two-step flow: Grid View → Detail View → Load
 * - Preview with mini-map visualization
 * - DYNAMIC configuration form based on template requirements
 * - Smooth animations between views
 * - Uses FlowentTemplate unified schema
 *
 * IMPORTANT: This component should be rendered at the ROOT level of the application,
 * NOT inside any Toolbar or Header component.
 *
 * @version 2.0.0 - Now uses FlowentTemplate with dynamic requirements
 */

import { useState, useCallback, useMemo, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  LayoutGrid,
  Coins,
  Headphones,
  Megaphone,
  Settings,
  Zap,
  FileText,
  MessageSquare,
  Mail,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Bot,
  Globe,
  Database,
  Code2,
  GitBranch,
  Send,
  Clock,
  Info,
  Key,
  Link,
  Webhook,
  Star,
  Download,
  Users,
  CreditCard,
  Phone,
  Table,
  Brain,
  Cloud,
  Hash,
  Variable,
  type LucideIcon,
} from 'lucide-react';
import {
  TEMPLATE_CATEGORIES,
  FLOWENT_TEMPLATES,
  getFlowentTemplatesByCategory,
  searchFlowentTemplates,
  // Legacy exports for backwards compatibility
  PIPELINE_TEMPLATES,
  PipelineTemplate,
  getTemplatesByCategory,
  searchTemplates,
} from '@/lib/pipelines/templates';
import {
  FlowentTemplate,
  TemplateRequirement,
} from '@/lib/studio/types';
import {
  injectTemplateData,
  validateTemplateConfig,
  getRequirementIcon,
  groupRequirementsByType,
  getRequirementTypeLabel,
  type ConfigurationValues,
} from '@/lib/studio/template-utils';
import { usePipelineStore } from '../store/usePipelineStore';

// ============================================
// ICON MAP (Extended for FlowentTemplate)
// ============================================

const iconMap: Record<string, LucideIcon> = {
  // Layout & Navigation
  LayoutGrid,

  // Categories
  Coins,
  HeadphonesIcon: Headphones,
  Megaphone,
  Settings,
  Zap,
  FileText,
  MessageSquare,
  Mail,
  RefreshCw,

  // Node Types
  Bot,
  Globe,
  Database,
  Code2,
  GitBranch,
  Send,
  Clock,

  // Requirements
  Key,
  Link,
  Webhook,
  Sparkles,
  Brain,
  Users,
  Cloud,
  CreditCard,
  Phone,
  Table,
  Hash,
  Variable,

  // Social Proof
  Star,
  Download,
};

/**
 * Get icon component from name string
 * Falls back to Key icon for unknown icons
 */
function getIconComponent(iconName: string): LucideIcon {
  return iconMap[iconName] || Key;
}

// ============================================
// PROPS
// ============================================

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// CONFIRMATION DIALOG - FlowentTemplate
// ============================================

interface ConfirmDialogProps {
  isOpen: boolean;
  template: FlowentTemplate | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ isOpen, template, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen || !template) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1A1A1F] rounded-xl border border-white/10 p-6 max-w-md mx-4 shadow-2xl animate-scale-in">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Load Template?</h3>
            <p className="text-sm text-white/60">
              This will replace your current canvas with the <strong className="text-white">{template.name}</strong> template.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6">
          <p className="text-xs text-amber-300">
            ⚠️ Any unsaved changes to your current pipeline will be lost.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg
              bg-card/5 text-white/70 hover:bg-card/10 hover:text-white
              transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg
              bg-indigo-500 text-white hover:bg-indigo-600
              transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Load Template
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUCCESS TOAST
// ============================================

interface SuccessToastProps {
  isVisible: boolean;
  templateName: string;
}

function SuccessToast({ isVisible, templateName }: SuccessToastProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[10000] animate-slide-up">
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 shadow-lg backdrop-blur-sm">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-green-400">Template Loaded!</p>
          <p className="text-xs text-green-300/70">{templateName} is ready to use</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// TEMPLATE CARD (Grid View) - FlowentTemplate
// ============================================

interface TemplateCardProps {
  template: FlowentTemplate;
  onSelect: (template: FlowentTemplate) => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const Icon = getIconComponent(template.icon);
  const requiredCount = template.requirements.filter((r) => r.required).length;

  // Difficulty badge colors
  const difficultyColors = {
    beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
    intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div
      className="group relative p-4 rounded-xl bg-card/5 border border-white/10
        hover:border-indigo-500/50 hover:bg-card/10 transition-all duration-200 cursor-pointer"
      onClick={() => onSelect(template)}
    >
      {/* Featured Badge */}
      {template.isFeatured && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[9px] font-bold text-white shadow-lg">
          FEATURED
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${template.color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: template.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
            {template.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${template.color}20`, color: template.color }}
            >
              {template.category}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${difficultyColors[template.difficulty]}`}>
              {template.difficulty}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-white/50 line-clamp-2 mb-3 min-h-[32px]">
        {template.description}
      </p>

      {/* ROI Badge & Requirements */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {template.roiBadge && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
            <Sparkles className="w-3 h-3 text-green-400" />
            <span className="text-[10px] text-green-400 font-medium">
              {template.roiBadge}
            </span>
          </div>
        )}
        {requiredCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
            <Key className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-amber-400 font-medium">
              {requiredCount} required
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {template.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-full bg-card/5 text-white/40"
          >
            {tag}
          </span>
        ))}
        {template.tags.length > 3 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-card/5 text-white/40">
            +{template.tags.length - 3}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-3 text-[10px] text-white/40">
          <span>{template.nodes.length} nodes</span>
          {template.rating && (
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-amber-400" fill="currentColor" />
              {template.rating.toFixed(1)}
            </span>
          )}
          {template.downloadCount && template.downloadCount > 0 && (
            <span className="flex items-center gap-0.5">
              <Download className="w-3 h-3" />
              {template.downloadCount > 1000
                ? `${(template.downloadCount / 1000).toFixed(1)}k`
                : template.downloadCount}
            </span>
          )}
        </div>
        <button
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg
            bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white
            transition-all duration-200"
        >
          Preview
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// MINI NODE PREVIEW (for Detail View)
// ============================================

interface MiniNodeProps {
  node: any;
  scale?: number;
}

function MiniNode({ node, scale = 0.6 }: MiniNodeProps) {
  const Icon = iconMap[node.data?.icon] || Zap;
  const color = node.data?.color || '#6366F1';

  return (
    <div
      className="absolute bg-[#1A1A1F] rounded-lg border border-white/10 p-2 shadow-md"
      style={{
        left: node.position.x * scale,
        top: node.position.y * scale,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
        <span className="text-[10px] text-white/80 font-medium truncate max-w-[80px]">
          {node.data?.label || 'Node'}
        </span>
      </div>
    </div>
  );
}

// ============================================
// DETAIL VIEW (Preview & Configure) - FlowentTemplate v2.0
// ============================================

interface DetailViewProps {
  template: FlowentTemplate;
  onBack: () => void;
  onConfirm: () => void;
  configValues: ConfigurationValues;
  onConfigChange: (id: string, value: string) => void;
}

function DetailView({ template, onBack, onConfirm, configValues, onConfigChange }: DetailViewProps) {
  const Icon = getIconComponent(template.icon);

  // Get requirements directly from the template (dynamic!)
  const requirements = template.requirements;

  // Group requirements by type for better organization
  const groupedRequirements = groupRequirementsByType(requirements);

  // Validate configuration
  const validation = validateTemplateConfig(requirements, configValues);
  const allRequiredFilled = validation.valid;

  // Difficulty badge colors
  const difficultyColors = {
    beginner: 'bg-green-500/20 text-green-400',
    intermediate: 'bg-amber-500/20 text-amber-400',
    advanced: 'bg-red-500/20 text-red-400',
  };

  // Calculate canvas bounds for mini-map
  const canvasBounds = useMemo(() => {
    if (!template.nodes.length) return { minX: 0, minY: 0, maxX: 400, maxY: 300 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    template.nodes.forEach((node) => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + 150);
      maxY = Math.max(maxY, node.position.y + 50);
    });
    return { minX, minY, maxX, maxY };
  }, [template.nodes]);

  const scale = Math.min(
    350 / (canvasBounds.maxX - canvasBounds.minX + 100),
    250 / (canvasBounds.maxY - canvasBounds.minY + 100),
    0.5
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 animate-slide-in-right">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-card/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${template.color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color: template.color }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{template.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-white/50">{template.category}</span>
                <span className="text-white/30">•</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${difficultyColors[template.difficulty]}`}>
                  {template.difficulty}
                </span>
                <span className="text-white/30">•</span>
                <span className="text-xs text-white/50">{template.nodes.length} nodes</span>
                {template.rating && (
                  <>
                    <span className="text-white/30">•</span>
                    <span className="flex items-center gap-0.5 text-xs text-amber-400">
                      <Star className="w-3 h-3" fill="currentColor" />
                      {template.rating.toFixed(1)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-card/10 transition-colors"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Content: Two Columns */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Left Column: Preview */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Template Preview
            </h4>

            {/* Mini-Map Canvas */}
            <div className="relative h-64 bg-[#0A0A0D] rounded-xl border border-white/10 overflow-hidden">
              {/* Grid Background */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle, #ffffff10 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              />

              {/* Nodes */}
              <div
                className="absolute"
                style={{
                  left: 20 - canvasBounds.minX * scale,
                  top: 20 - canvasBounds.minY * scale,
                }}
              >
                {template.nodes.map((node) => (
                  <MiniNode key={node.id} node={node} scale={scale} />
                ))}

                {/* Edges (simplified lines) */}
                <svg
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    width: (canvasBounds.maxX - canvasBounds.minX + 200) * scale,
                    height: (canvasBounds.maxY - canvasBounds.minY + 200) * scale
                  }}
                >
                  {template.edges.map((edge) => {
                    const sourceNode = template.nodes.find((n) => n.id === edge.source);
                    const targetNode = template.nodes.find((n) => n.id === edge.target);
                    if (!sourceNode || !targetNode) return null;

                    const x1 = (sourceNode.position.x + 75) * scale;
                    const y1 = (sourceNode.position.y + 25) * scale;
                    const x2 = (targetNode.position.x) * scale;
                    const y2 = (targetNode.position.y + 25) * scale;

                    return (
                      <line
                        key={edge.id}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#6366F1"
                        strokeWidth="2"
                        strokeOpacity="0.4"
                        strokeDasharray="4"
                      />
                    );
                  })}
                </svg>
              </div>

              {/* Zoom Badge */}
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/40 text-[10px] text-white/50">
                Preview
              </div>
            </div>

            {/* Description */}
            <div className="p-4 rounded-xl bg-card/5 border border-white/10">
              <h5 className="text-sm font-medium text-white mb-2">About this template</h5>
              <p className="text-sm text-white/60 leading-relaxed">{template.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Included Nodes */}
            <div className="p-4 rounded-xl bg-card/5 border border-white/10">
              <h5 className="text-sm font-medium text-white mb-3">Included Components</h5>
              <div className="space-y-2">
                {template.nodes.map((node) => {
                  const NodeIcon = iconMap[node.data?.icon] || Zap;
                  return (
                    <div key={node.id} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${node.data?.color}20` }}
                      >
                        <NodeIcon className="w-3 h-3" style={{ color: node.data?.color }} />
                      </div>
                      <span className="text-white/70">{node.data?.label}</span>
                      <span className="text-white/30">({node.data?.type})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Configuration */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              Configuration
            </h4>

            {requirements.length === 0 ? (
              <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-green-400 font-medium">Ready to Install</p>
                <p className="text-xs text-green-300/70 mt-1">
                  No configuration required - this template works out of the box
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Grouped Requirements */}
                {Array.from(groupedRequirements.entries()).map(([type, reqs]) => (
                  <div key={type} className="space-y-3">
                    {/* Type Header */}
                    <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider">
                      <span>{getRequirementTypeLabel(type)}</span>
                      <div className="flex-1 h-px bg-card/10" />
                    </div>

                    {/* Requirements in this group */}
                    {reqs.map((req) => {
                      const iconName = getRequirementIcon(req);
                      const ReqIcon = getIconComponent(iconName);
                      const hasValue = Boolean(configValues[req.id]?.trim());

                      return (
                        <div
                          key={req.id}
                          className={`p-4 rounded-xl border transition-all ${
                            hasValue && req.required
                              ? 'bg-green-500/5 border-green-500/20'
                              : 'bg-card/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                hasValue && req.required
                                  ? 'bg-green-500/20'
                                  : 'bg-indigo-500/20'
                              }`}
                            >
                              {hasValue && req.required ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <ReqIcon className="w-4 h-4 text-indigo-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">{req.label}</span>
                                {req.provider && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                                    {req.provider}
                                  </span>
                                )}
                                {req.required ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                                    Required
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-card/10 text-white/40">
                                    Optional
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-white/50 mt-0.5">{req.description}</p>
                            </div>
                          </div>

                          <input
                            type={req.type === 'api_key' ? 'password' : 'text'}
                            value={configValues[req.id] || req.defaultValue || ''}
                            onChange={(e) => onConfigChange(req.id, e.target.value)}
                            placeholder={req.placeholder || `Enter ${req.label.toLowerCase()}...`}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 border border-white/10
                              text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50
                              focus:ring-1 focus:ring-indigo-500/50 transition-all"
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Validation Status */}
                {!validation.valid && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-300">
                      <strong>Missing:</strong> {validation.missingFields.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Info Box */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-300">
                    <strong>Tip:</strong> You can always configure these settings later in the
                    Node Inspector after loading the template.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#0A0A0D]/50">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
            bg-card/5 text-white/70 hover:bg-card/10 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Gallery
        </button>

        <button
          onClick={onConfirm}
          disabled={requirements.length > 0 && requirements.some((r) => r.required) && !allRequiredFilled}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg
            bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200 shadow-lg shadow-indigo-500/25"
        >
          <Check className="w-4 h-4" />
          Load Template
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// CATEGORY BUTTON
// ============================================

interface CategoryButtonProps {
  category: string;
  label: string;
  icon: string;
  color: string;
  isActive: boolean;
  count: number;
  onClick: () => void;
}

function CategoryButton({ category, label, icon, color, isActive, count, onClick }: CategoryButtonProps) {
  const Icon = iconMap[icon] || LayoutGrid;

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
        ${isActive
          ? 'bg-indigo-500/20 border border-indigo-500/30 text-white'
          : 'hover:bg-card/5 text-white/60 hover:text-white border border-transparent'
        }
      `}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: isActive ? `${color}30` : 'transparent' }}
      >
        <Icon className="w-4 h-4" style={{ color: isActive ? color : undefined }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
      </div>
      <span
        className={`text-xs px-2 py-0.5 rounded-full ${
          isActive ? 'bg-indigo-500/30 text-indigo-300' : 'bg-card/5 text-white/40'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ============================================
// MAIN COMPONENT - FlowentTemplate v2.0
// ============================================

export function TemplateGallery({ isOpen, onClose }: TemplateGalleryProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<FlowentTemplate | null>(null);
  const [confirmTemplate, setConfirmTemplate] = useState<FlowentTemplate | null>(null);
  const [configValues, setConfigValues] = useState<ConfigurationValues>({});
  const [showToast, setShowToast] = useState(false);
  const [loadedTemplateName, setLoadedTemplateName] = useState('');
  const [mounted, setMounted] = useState(false);

  // Ensure we only render portal on client side
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate(null);
      setConfigValues({});
      setSearchQuery('');
    }
  }, [isOpen]);

  // Store actions
  const loadPipeline = usePipelineStore((s) => s.loadPipeline);
  const setDirty = usePipelineStore((s) => s.setDirty);
  const resetExecution = usePipelineStore((s) => s.resetExecution);
  const pipelineId = usePipelineStore((s) => s.pipelineId);

  // Filter templates using FlowentTemplates
  const filteredTemplates = useMemo(() => {
    if (searchQuery) {
      return searchFlowentTemplates(searchQuery);
    }
    return getFlowentTemplatesByCategory(activeCategory);
  }, [activeCategory, searchQuery]);

  // Category counts from FlowentTemplates
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: FLOWENT_TEMPLATES.length };
    FLOWENT_TEMPLATES.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, []);

  // Handle template selection (goes to detail view)
  const handleSelectTemplate = useCallback((template: FlowentTemplate) => {
    setSelectedTemplate(template);
    // Pre-fill default values from template requirements
    const defaults: ConfigurationValues = {};
    template.requirements.forEach((req) => {
      if (req.defaultValue) {
        defaults[req.id] = req.defaultValue;
      }
    });
    setConfigValues(defaults);
  }, []);

  // Handle back from detail view
  const handleBackToGrid = useCallback(() => {
    setSelectedTemplate(null);
    setConfigValues({});
  }, []);

  // Handle config value change
  const handleConfigChange = useCallback((id: string, value: string) => {
    setConfigValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  // Handle confirm from detail view
  const handleConfirmFromDetail = useCallback(() => {
    if (!selectedTemplate) return;
    setConfirmTemplate(selectedTemplate);
  }, [selectedTemplate]);

  // Handle final confirm load - Uses injectTemplateData for dynamic configuration
  const handleConfirmLoad = useCallback(() => {
    if (!confirmTemplate) return;

    // Use the unified injectTemplateData utility to apply config values
    // This handles placeholder replacement and configPath-based injection
    const configuredNodes = injectTemplateData(confirmTemplate, configValues);

    // Load template into store with configured nodes
    loadPipeline(
      pipelineId,
      configuredNodes as any[], // Cast for store compatibility
      confirmTemplate.edges as any[],
      confirmTemplate.name,
      undefined
    );
    setDirty(true);
    resetExecution();

    // Show success toast
    setLoadedTemplateName(confirmTemplate.name);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    // Close dialogs
    setConfirmTemplate(null);
    setSelectedTemplate(null);
    onClose();
  }, [confirmTemplate, configValues, loadPipeline, pipelineId, setDirty, resetExecution, onClose]);

  // Handle cancel
  const handleCancelConfirm = useCallback(() => {
    setConfirmTemplate(null);
  }, []);

  // Don't render anything if not open or not mounted (SSR safety)
  if (!isOpen || !mounted) return null;

  // Render via Portal to escape all parent CSS contexts
  const modalContent = (
    <>
      {/* Backdrop - z-[9998] */}
      <div
        className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      {/* Modal - z-[9999] to be above EVERYTHING */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-5xl max-h-[90vh] bg-[#0F0F12]/95 backdrop-blur-xl rounded-2xl border border-white/10
            shadow-2xl shadow-black/50 overflow-hidden flex pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0 bg-[#0A0A0D] border-r border-white/10 p-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Templates</h2>
                <p className="text-xs text-white/50">Quick start workflows</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedTemplate(null);
                }}
                placeholder="Search templates..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg bg-card/5 border border-white/10
                  text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50
                  focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>

            {/* Categories */}
            <div className="flex-1 space-y-1 overflow-y-auto">
              {Object.entries(TEMPLATE_CATEGORIES).map(([key, { label, icon, color }]) => (
                <CategoryButton
                  key={key}
                  category={key}
                  label={label}
                  icon={icon}
                  color={color}
                  isActive={activeCategory === key && !searchQuery}
                  count={categoryCounts[key] || 0}
                  onClick={() => {
                    setActiveCategory(key);
                    setSearchQuery('');
                    setSelectedTemplate(null);
                  }}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-[10px] text-white/30 text-center">
                {FLOWENT_TEMPLATES.length} templates available
              </p>
            </div>
          </div>

          {/* Main Content - Either Grid or Detail View */}
          {selectedTemplate ? (
            <DetailView
              template={selectedTemplate}
              onBack={handleBackToGrid}
              onConfirm={handleConfirmFromDetail}
              configValues={configValues}
              onConfigChange={handleConfigChange}
            />
          ) : (
            <div className="flex-1 flex flex-col min-w-0 animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {searchQuery
                      ? `Search Results (${filteredTemplates.length})`
                      : TEMPLATE_CATEGORIES[activeCategory as keyof typeof TEMPLATE_CATEGORIES]?.label || 'All Templates'
                    }
                  </h3>
                  <p className="text-sm text-white/50">
                    Click a template to preview and configure
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-card/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                {filteredTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-card/5 flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-white/20" />
                    </div>
                    <h4 className="text-sm font-medium text-white/60 mb-1">No templates found</h4>
                    <p className="text-xs text-white/40">
                      Try adjusting your search or category
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={handleSelectTemplate}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Confirmation Dialog */}
          <ConfirmDialog
            isOpen={!!confirmTemplate}
            template={confirmTemplate}
            onConfirm={handleConfirmLoad}
            onCancel={handleCancelConfirm}
          />
        </div>
      </div>

      {/* Success Toast */}
      <SuccessToast isVisible={showToast} templateName={loadedTemplateName} />

      {/* Animation Styles */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out forwards;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );

  // Use React Portal to render outside the DOM hierarchy
  return createPortal(modalContent, document.body);
}
