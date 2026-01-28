'use client';

/**
 * FLOWENT AI STUDIO - NODE SELECTOR MODAL
 *
 * Hierarchical node browser with categories, search, and popular nodes.
 * Inspired by n8n's node selector for scalable tool selection.
 *
 * @version 2.0.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  ChevronRight,
  ChevronLeft,
  Star,
  Zap,
  Brain,
  Database,
  GitBranch,
  Code,
  Plug,
  Users,
  MessageSquare,
  CheckSquare,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
  Command,
  // Node icons
  Webhook,
  Play,
  Mail,
  Bell,
  Bot,
  Hash,
  FileText,
  HardDrive,
  Filter,
  PenLine,
  ListEnd,
  Calculator,
  Repeat,
  Calendar,
  Split,
  Merge,
  Route,
  Timer,
  GitFork,
  ShieldAlert,
  UserCheck,
  Globe,
  Workflow,
  Send,
  Smartphone,
  MessageCircle,
  UserPen,
  DollarSign,
  ClipboardList,
  Sheet,
  BookOpen,
  Table,
  Github,
} from 'lucide-react';
import {
  NodeDefinition,
  NodeCategory,
  NODE_CATEGORIES,
  ALL_NODES,
  getNodesByCategory,
  getPopularNodes,
  searchNodes,
  getNodeById,
  NodeCategoryDefinition,
} from '@/lib/studio/node-definitions';

// ============================================================================
// ICON MAPPING
// ============================================================================

const ICON_MAP: Record<string, React.ElementType> = {
  // Categories
  Zap,
  Brain,
  Database,
  GitBranch,
  Code,
  Plug,
  Users,
  MessageSquare,
  CheckSquare,
  // Node icons
  Webhook,
  Clock,
  Play,
  Mail,
  Bell,
  Bot,
  Hash,
  Search,
  FileText,
  HardDrive,
  Filter,
  PenLine,
  ListEnd,
  Calculator,
  Repeat,
  Calendar,
  Split,
  Merge,
  Route,
  Timer,
  GitFork,
  ShieldAlert,
  UserCheck,
  Globe,
  Workflow,
  Send,
  Smartphone,
  MessageCircle,
  UserPen,
  DollarSign,
  ClipboardList,
  Sheet,
  BookOpen,
  Table,
  Github,
  Star,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Command,
};

function getIconComponent(iconName: string): React.ElementType {
  return ICON_MAP[iconName] || Zap;
}

// ============================================================================
// PROPS & TYPES
// ============================================================================

export interface NodeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (node: NodeDefinition) => void;
  position?: { x: number; y: number };
  filterCategory?: NodeCategory;
}

// ============================================================================
// MODAL COMPONENT
// ============================================================================

export function NodeSelectorModal({
  isOpen,
  onClose,
  onSelectNode,
  position,
  filterCategory,
}: NodeSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory | null>(
    filterCategory || null
  );
  const [hoveredNode, setHoveredNode] = useState<NodeDefinition | null>(null);
  const [recentNodes, setRecentNodes] = useState<string[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load recent nodes from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('flowent-recent-nodes');
    if (stored) {
      try {
        setRecentNodes(JSON.parse(stored));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter and search nodes
  const displayedNodes = useMemo(() => {
    if (searchQuery.trim()) {
      return searchNodes(searchQuery);
    }
    if (selectedCategory) {
      return getNodesByCategory(selectedCategory);
    }
    return [];
  }, [searchQuery, selectedCategory]);

  // Get popular nodes for landing view
  const popularNodes = useMemo(() => getPopularNodes().slice(0, 8), []);

  // Get recent nodes
  const recentNodesList = useMemo(() => {
    return recentNodes
      .map(id => getNodeById(id))
      .filter((node): node is NodeDefinition => node !== undefined)
      .slice(0, 5);
  }, [recentNodes]);

  // Handle node selection
  const handleSelectNode = useCallback(
    (node: NodeDefinition) => {
      // Update recent nodes
      const updated = [node.id, ...recentNodes.filter(id => id !== node.id)].slice(0, 10);
      setRecentNodes(updated);
      localStorage.setItem('flowent-recent-nodes', JSON.stringify(updated));

      onSelectNode(node);
      onClose();
    },
    [onSelectNode, onClose, recentNodes]
  );

  // Navigate back to categories
  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSearchQuery('');
  };

  if (!isOpen) return null;

  const showLandingView = !searchQuery && !selectedCategory;
  const showCategoryView = selectedCategory && !searchQuery;
  const showSearchResults = !!searchQuery;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          ref={modalRef}
          className="relative z-10 w-[720px] max-h-[80vh] bg-[#1a1a2e] rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={
            position
              ? {
                  position: 'absolute',
                  left: position.x,
                  top: position.y,
                }
              : undefined
          }
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#16162a]">
            <div className="flex items-center gap-3">
              {selectedCategory && (
                <button
                  onClick={handleBackToCategories}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white/60" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                {selectedCategory
                  ? NODE_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Nodes'
                  : 'Add Node'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search nodes... (e.g., webhook, email, filter)"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-white/30 text-xs">
                <Command className="w-3 h-3" />
                <span>K</span>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Landing View - Categories + Popular */}
            {showLandingView && (
              <div className="p-4 space-y-6">
                {/* Recent Nodes */}
                {recentNodesList.length > 0 && (
                  <section>
                    <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Recently Used
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {recentNodesList.map(node => (
                        <NodeCard
                          key={node.id}
                          node={node}
                          onClick={() => handleSelectNode(node)}
                          onHover={setHoveredNode}
                          compact
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Popular Nodes */}
                <section>
                  <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Popular
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {popularNodes.map(node => (
                      <NodeCard
                        key={node.id}
                        node={node}
                        onClick={() => handleSelectNode(node)}
                        onHover={setHoveredNode}
                        compact
                      />
                    ))}
                  </div>
                </section>

                {/* Categories Grid */}
                <section>
                  <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                    <Plug className="w-4 h-4" />
                    Browse by Category
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {NODE_CATEGORIES.map(category => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        onClick={() => setSelectedCategory(category.id)}
                        nodeCount={getNodesByCategory(category.id).length}
                      />
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Category View - List of nodes in category */}
            {showCategoryView && (
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {displayedNodes.map(node => (
                    <NodeCard
                      key={node.id}
                      node={node}
                      onClick={() => handleSelectNode(node)}
                      onHover={setHoveredNode}
                    />
                  ))}
                </div>
                {displayedNodes.length === 0 && (
                  <div className="text-center py-12 text-white/40">
                    No nodes in this category yet
                  </div>
                )}
              </div>
            )}

            {/* Search Results */}
            {showSearchResults && (
              <div className="p-4">
                {displayedNodes.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {displayedNodes.map(node => (
                      <NodeCard
                        key={node.id}
                        node={node}
                        onClick={() => handleSelectNode(node)}
                        onHover={setHoveredNode}
                        highlightQuery={searchQuery}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40">
                      No nodes found for &quot;{searchQuery}&quot;
                    </p>
                    <p className="text-white/30 text-sm mt-1">
                      Try different keywords or browse categories
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Node Preview Panel */}
          <AnimatePresence>
            {hoveredNode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-0 left-0 right-0 bg-[#12122a] border-t border-white/10 p-4"
              >
                <NodePreview node={hoveredNode} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// CATEGORY CARD
// ============================================================================

interface CategoryCardProps {
  category: NodeCategoryDefinition;
  onClick: () => void;
  nodeCount: number;
}

function CategoryCard({ category, onClick, nodeCount }: CategoryCardProps) {
  const IconComponent = getIconComponent(category.icon);

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-lg transition-all text-left"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${category.color}20` }}
      >
        <IconComponent
          className="w-5 h-5"
          style={{ color: category.color }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{category.name}</div>
        <div className="text-xs text-white/40">{nodeCount} nodes</div>
      </div>
      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
    </button>
  );
}

// ============================================================================
// NODE CARD
// ============================================================================

interface NodeCardProps {
  node: NodeDefinition;
  onClick: () => void;
  onHover: (node: NodeDefinition | null) => void;
  compact?: boolean;
  highlightQuery?: string;
}

function NodeCard({
  node,
  onClick,
  onHover,
  compact = false,
  highlightQuery,
}: NodeCardProps) {
  const IconComponent = getIconComponent(node.icon);

  const highlightText = (text: string) => {
    if (!highlightQuery) return text;
    const parts = text.split(new RegExp(`(${highlightQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === highlightQuery.toLowerCase() ? (
        <span key={i} className="bg-yellow-500/30 text-yellow-200">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => onHover(node)}
        onMouseLeave={() => onHover(null)}
        className="flex items-center gap-2 p-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-lg transition-all text-left"
      >
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${node.color}20` }}
        >
          <IconComponent
            className="w-4 h-4"
            style={{ color: node.color }}
          />
        </div>
        <span className="text-sm text-white truncate">{node.name}</span>
        {node.popular && <Star className="w-3 h-3 text-yellow-500 shrink-0" />}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(node)}
      onMouseLeave={() => onHover(null)}
      className="group flex items-start gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-lg transition-all text-left"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${node.color}20` }}
      >
        <IconComponent
          className="w-5 h-5"
          style={{ color: node.color }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">
            {highlightText(node.name)}
          </span>
          {node.popular && <Star className="w-3 h-3 text-yellow-500 shrink-0" />}
          {node.beta && (
            <span className="px-1.5 py-0.5 text-[10px] bg-purple-500/30 text-purple-300 rounded uppercase">
              Beta
            </span>
          )}
        </div>
        <p className="text-xs text-white/50 truncate mt-0.5">
          {node.tagline || node.description}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0 mt-1" />
    </button>
  );
}

// ============================================================================
// NODE PREVIEW
// ============================================================================

interface NodePreviewProps {
  node: NodeDefinition;
}

function NodePreview({ node }: NodePreviewProps) {
  const IconComponent = getIconComponent(node.icon);

  return (
    <div className="flex items-start gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${node.color}30` }}
      >
        <IconComponent
          className="w-6 h-6"
          style={{ color: node.color }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-white">{node.name}</h4>
          {node.popular && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded">
              <Star className="w-3 h-3" />
              Popular
            </span>
          )}
        </div>
        <p className="text-sm text-white/60 line-clamp-2">{node.description}</p>
        {node.keywords && node.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {node.keywords.slice(0, 5).map(keyword => (
              <span
                key={keyword}
                className="px-2 py-0.5 text-[10px] bg-white/5 text-white/40 rounded"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm text-white/40">
          {node.inputs.length} in / {node.outputs.length} out
        </div>
        {node.requiredCredentials && node.requiredCredentials.length > 0 && (
          <div className="text-xs text-orange-400 mt-1">
            Requires: {node.requiredCredentials.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default NodeSelectorModal;
