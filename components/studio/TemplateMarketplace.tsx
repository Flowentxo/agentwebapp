'use client';

/**
 * TEMPLATE MARKETPLACE
 *
 * Browse, search, and deploy pre-built workflow templates
 */

import { useState, useRef } from 'react';
import {
  Search,
  X,
  Download,
  Star,
  Clock,
  ChevronRight,
  Zap,
  Users,
  BarChart,
  PenTool,
  Search as SearchIcon,
  Mail,
  Shield,
  Sparkles,
  Upload,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkflowTemplate, TemplateCategory, TemplateDifficulty } from '@/lib/studio/types';
import {
  WORKFLOW_TEMPLATES,
  getTemplatesByCategory,
  getPopularTemplates,
  searchTemplates
} from '@/lib/studio/template-library';
import {
  exportTemplate,
  importTemplate,
  validateTemplate
} from '@/lib/studio/template-utils';

interface TemplateMarketplaceProps {
  onDeployTemplate: (template: WorkflowTemplate) => void;
  onClose: () => void;
}

export function TemplateMarketplace({ onDeployTemplate, onClose }: TemplateMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter templates
  const filteredTemplates = (() => {
    let templates = WORKFLOW_TEMPLATES;

    // Category filter
    if (selectedCategory !== 'all') {
      templates = getTemplatesByCategory(selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery);
    }

    return templates;
  })();

  const categories: Array<{ id: TemplateCategory | 'all'; label: string; icon: any }> = [
    { id: 'all', label: 'All Templates', icon: Sparkles },
    { id: 'customer-support', label: 'Customer Support', icon: Users },
    { id: 'data-analysis', label: 'Data Analysis', icon: BarChart },
    { id: 'content-creation', label: 'Content Creation', icon: PenTool },
    { id: 'automation', label: 'Automation', icon: Zap },
    { id: 'research', label: 'Research', icon: SearchIcon },
    { id: 'integration', label: 'Integration', icon: Mail }
  ];

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      const template = await importTemplate(file);

      // Validate template
      const validation = validateTemplate(template);
      if (!validation.valid) {
        setImportError(`Invalid template: ${validation.errors.join(', ')}`);
        return;
      }

      // Deploy imported template
      onDeployTemplate(template);
      onClose();
    } catch (error: any) {
      setImportError(error.message || 'Failed to import template');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-6xl h-[90vh] bg-surface-1 rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-white/10 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-text mb-1">Template Marketplace</h2>
              <p className="text-sm text-text-muted">
                Browse and deploy pre-built workflow templates
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImportClick}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-xs font-medium text-text transition hover:bg-card/5"
                title="Import Template"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-card/5 transition text-text-muted hover:text-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Import Error */}
          {importError && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-xs text-red-400">{importError}</p>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-0 border border-white/10 rounded-lg text-sm text-text placeholder-text-muted outline-none focus:border-[rgb(var(--accent))] transition"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="border-b border-white/10 px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'bg-[rgb(var(--accent))] text-white'
                      : 'text-text-muted hover:bg-card/5 hover:text-text'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <SearchIcon className="w-12 h-12 text-text-muted opacity-30 mb-3" />
              <p className="text-sm text-text-muted">No templates found</p>
              <p className="text-xs text-text-muted mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => setSelectedTemplate(template)}
                  onDeploy={() => onDeployTemplate(template)}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Template Details Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <TemplateDetailsModal
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            onDeploy={() => {
              onDeployTemplate(selectedTemplate);
              setSelectedTemplate(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// TEMPLATE CARD
// ============================================================================

interface TemplateCardProps {
  template: WorkflowTemplate;
  onSelect: () => void;
  onDeploy: () => void;
}

function TemplateCard({ template, onSelect, onDeploy }: TemplateCardProps) {
  const difficultyColors: Record<TemplateDifficulty, string> = {
    beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
    intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    advanced: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-surface-0 rounded-lg border border-white/10 hover:border-[rgb(var(--accent))]/50 transition overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
            style={{ backgroundColor: `${template.color}20`, color: template.color }}
          >
            {getIconComponent(template.icon)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text mb-1 truncate">
              {template.name}
            </h3>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                  difficultyColors[template.difficulty]
                }`}
              >
                {template.difficulty}
              </span>
              {template.rating && (
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {template.rating}
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-text-muted line-clamp-2 mb-3">
          {template.description}
        </p>

        <div className="flex items-center gap-3 text-xs text-text-muted">
          {template.downloads && (
            <div className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {template.downloads.toLocaleString()}
            </div>
          )}
          {template.estimatedTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {template.estimatedTime}
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex flex-wrap gap-1.5">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded-full bg-card/5 text-xs text-text-muted"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-card/5 text-xs text-text-muted">
              +{template.tags.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            exportTemplate(template);
          }}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-white/10 hover:bg-card/5 text-xs font-medium text-text transition"
          title="Export Template"
        >
          <FileDown className="w-3 h-3" />
        </button>
        <button
          onClick={onSelect}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-card/5 hover:bg-card/10 text-xs font-medium text-text transition"
        >
          View Details
          <ChevronRight className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeploy();
          }}
          className="px-4 py-2 rounded-md bg-[rgb(var(--accent))] hover:opacity-90 text-xs font-semibold text-white transition"
        >
          Deploy
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// TEMPLATE DETAILS MODAL
// ============================================================================

interface TemplateDetailsModalProps {
  template: WorkflowTemplate;
  onClose: () => void;
  onDeploy: () => void;
}

function TemplateDetailsModal({ template, onClose, onDeploy }: TemplateDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl max-h-[85vh] bg-surface-1 rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="border-b border-white/10 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div
                className="flex items-center justify-center w-14 h-14 rounded-xl flex-shrink-0"
                style={{ backgroundColor: `${template.color}20`, color: template.color }}
              >
                {getIconComponent(template.icon, 24)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-text mb-1">{template.name}</h2>
                <p className="text-sm text-text-muted">{template.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-card/5 transition text-text-muted hover:text-text"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            {template.rating && (
              <div className="flex items-center gap-1.5 text-text-muted">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-text">{template.rating}</span>
              </div>
            )}
            {template.downloads && (
              <div className="flex items-center gap-1.5 text-text-muted">
                <Download className="w-4 h-4" />
                <span>{template.downloads.toLocaleString()} downloads</span>
              </div>
            )}
            {template.estimatedTime && (
              <div className="flex items-center gap-1.5 text-text-muted">
                <Clock className="w-4 h-4" />
                <span>{template.estimatedTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Use Case */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-2">Use Case</h3>
            <p className="text-sm text-text-muted">{template.useCase}</p>
          </div>

          {/* Workflow Overview */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Workflow Overview</h3>
            <div className="bg-surface-0 border border-white/10 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Total Steps:</span>
                  <span className="font-medium text-text">{template.nodes.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Connections:</span>
                  <span className="font-medium text-text">{template.edges.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Category:</span>
                  <span className="font-medium text-text capitalize">
                    {template.category.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Difficulty:</span>
                  <span className="font-medium text-text capitalize">
                    {template.difficulty}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          {(template.requiredIntegrations || template.requiredVariables) && (
            <div>
              <h3 className="text-sm font-semibold text-text mb-3">Requirements</h3>
              <div className="space-y-3">
                {template.requiredIntegrations && template.requiredIntegrations.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-2">Required Integrations:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.requiredIntegrations.map((integration) => (
                        <span
                          key={integration}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-xs font-medium text-blue-400"
                        >
                          <Shield className="w-3 h-3" />
                          {integration}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {template.requiredVariables && template.requiredVariables.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-2">Required Variables:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.requiredVariables.map((variable) => (
                        <span
                          key={variable}
                          className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-xs font-mono text-purple-400"
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-card/5 text-xs text-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Author & Version */}
          <div className="flex items-center gap-6 text-xs text-text-muted">
            <div>
              <span className="font-medium">Author:</span> {template.author}
            </div>
            <div>
              <span className="font-medium">Version:</span> {template.version}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportTemplate(template)}
              className="px-4 py-2.5 rounded-lg border border-white/10 hover:bg-card/5 text-sm font-medium text-text transition flex items-center gap-2"
              title="Export Template"
            >
              <FileDown className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-white/10 hover:bg-card/5 text-sm font-medium text-text transition"
            >
              Cancel
            </button>
            <button
              onClick={onDeploy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[rgb(var(--accent))] hover:opacity-90 text-sm font-semibold text-white transition"
            >
              <Zap className="w-4 h-4" />
              Deploy Template
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getIconComponent(iconName: string, size: number = 16) {
  const iconMap: Record<string, any> = {
    MessageSquare: Users,
    BarChart: BarChart,
    PenTool: PenTool,
    Search: SearchIcon,
    Mail: Mail,
    Users: Users,
    Zap: Zap
  };

  const IconComponent = iconMap[iconName] || Sparkles;
  return <IconComponent style={{ width: size, height: size }} />;
}
