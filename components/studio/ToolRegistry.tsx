'use client';

/**
 * TOOL REGISTRY
 *
 * Browse, create, and manage custom tools
 */

import { useState, useEffect } from 'react';
import {
  Search,
  X,
  Plus,
  Play,
  Code2,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Settings,
  FileText,
  Database,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomTool } from '@/lib/studio/types';
import { getToolRegistry } from '@/lib/studio/tool-registry';
import { executeCustomTool, testCustomTool } from '@/lib/studio/tool-executor';
import { CreateToolDialog } from './CreateToolDialog';

interface ToolRegistryProps {
  onClose: () => void;
  onSelectTool?: (tool: CustomTool) => void;
}

export function ToolRegistry({ onClose, onSelectTool }: ToolRegistryProps) {
  const [tools, setTools] = useState<CustomTool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTool, setSelectedTool] = useState<CustomTool | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = () => {
    const registry = getToolRegistry();
    setTools(registry.getAllTools());
  };

  // Filter tools
  const filteredTools = (() => {
    let filtered = tools;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  })();

  const categories = [
    { id: 'all', label: 'All Tools', icon: Zap },
    { id: 'utility', label: 'Utility', icon: Settings },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'transformation', label: 'Transform', icon: ArrowRight },
    { id: 'validation', label: 'Validation', icon: CheckCircle2 }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-6xl h-[90vh] bg-card rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Custom Tool Registry</h2>
              <p className="text-sm text-muted-foreground">
                Browse and manage custom tools for your workflows
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Create Tool
              </button>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-muted transition text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="border-b border-border px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tool Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
          {filteredTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Code2 className="w-12 h-12 text-muted-foreground opacity-30 mb-3" />
              <p className="text-sm text-muted-foreground">No tools found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onSelect={() => setSelectedTool(tool)}
                  onUse={() => onSelectTool?.(tool)}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Tool Details Modal */}
      <AnimatePresence>
        {selectedTool && (
          <ToolDetailsModal
            tool={selectedTool}
            onClose={() => setSelectedTool(null)}
            onUse={() => {
              onSelectTool?.(selectedTool);
              setSelectedTool(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Create Tool Dialog */}
      <AnimatePresence>
        {showCreateDialog && (
          <CreateToolDialog
            onClose={() => setShowCreateDialog(false)}
            onSave={() => {
              loadTools();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// TOOL CARD
// ============================================================================

interface ToolCardProps {
  tool: CustomTool;
  onSelect: () => void;
  onUse: () => void;
}

function ToolCard({ tool, onSelect, onUse }: ToolCardProps) {
  const categoryColors: Record<string, string> = {
    utility: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    data: 'bg-green-500/10 text-green-600 border-green-500/20',
    transformation: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    validation: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    api: 'bg-red-500/10 text-red-600 border-red-500/20'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 flex-shrink-0">
            <Code2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {tool.name}
              </h3>
              {tool.verified && (
                <Shield className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
              )}
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border ${
                categoryColors[tool.category] || 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {tool.category}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {tool.description}
        </p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Settings className="w-3 h-3" />
            {tool.parameters.length} params
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {tool.timeout}ms
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex flex-wrap gap-1.5">
          {tool.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {tool.tags.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
              +{tool.tags.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 flex items-center gap-2">
        <button
          onClick={onSelect}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-medium text-foreground transition"
        >
          View Details
          <ArrowRight className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUse();
          }}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground transition"
        >
          Use Tool
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// TOOL DETAILS MODAL
// ============================================================================

interface ToolDetailsModalProps {
  tool: CustomTool;
  onClose: () => void;
  onUse: () => void;
}

function ToolDetailsModal({ tool, onClose, onUse }: ToolDetailsModalProps) {
  const [testResults, setTestResults] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const results = await testCustomTool(tool);
      setTestResults(results);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[85vh] bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10">
                <Code2 className="w-7 h-7 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-foreground">{tool.name}</h2>
                  {tool.verified && (
                    <Shield className="w-5 h-5 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-muted transition text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Parameters */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Parameters</h3>
            <div className="space-y-2">
              {tool.parameters.map((param) => (
                <div
                  key={param.name}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground font-mono">
                        {param.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        {param.type}
                      </span>
                      {param.required && (
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20">
                          required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{param.description}</p>
                    {param.default !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Default: <span className="font-mono">{JSON.stringify(param.default)}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Code Preview */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Implementation</h3>
            <div className="rounded-xl bg-muted/50 border border-border p-4 overflow-x-auto">
              <pre className="text-xs text-foreground font-mono">
                {tool.code}
              </pre>
            </div>
          </div>

          {/* Test Cases */}
          {tool.testCases && tool.testCases.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Test Cases</h3>
                <button
                  onClick={handleTest}
                  disabled={isTesting}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground transition disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <Clock className="w-3 h-3 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      Run Tests
                    </>
                  )}
                </button>
              </div>

              {testResults && (
                <div className="mb-3 p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      {testResults.passed} passed
                    </span>
                    <span className="flex items-center gap-1.5 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      {testResults.failed} failed
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {tool.testCases.map((testCase, idx) => (
                  <div
                    key={testCase.id}
                    className="p-3 rounded-xl bg-muted/50 border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-foreground">{testCase.name}</span>
                      {testResults?.results[idx] && (
                        <span className={`text-xs ${testResults.results[idx].passed ? 'text-green-600' : 'text-red-600'}`}>
                          {testResults.results[idx].passed ? '✓ Passed' : '✗ Failed'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      <div>Input: {JSON.stringify(testCase.input)}</div>
                      <div>Expected: {JSON.stringify(testCase.expectedOutput)}</div>
                      {testResults?.results[idx]?.output && (
                        <div>Actual: {JSON.stringify(testResults.results[idx].output)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Author:</span>
              <span className="ml-2 font-medium text-foreground">{tool.author}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Version:</span>
              <span className="ml-2 font-medium text-foreground">{tool.version}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Runtime:</span>
              <span className="ml-2 font-medium text-foreground">{tool.runtime}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Timeout:</span>
              <span className="ml-2 font-medium text-foreground">{tool.timeout}ms</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-sm font-medium text-foreground transition"
            >
              Close
            </button>
            <button
              onClick={onUse}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-sm font-semibold text-primary-foreground transition"
            >
              <Zap className="w-4 h-4" />
              Use in Workflow
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
