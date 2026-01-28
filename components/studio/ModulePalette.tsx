'use client';

/**
 * MODULE PALETTE
 *
 * Drag-and-drop library of available modules
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Zap,
  Puzzle,
  Clock,
  Code,
  ChevronDown,
  ChevronRight,
  Search,
  Wrench
} from 'lucide-react';
import {
  MODULE_LIBRARY,
  SKILL_MODULES,
  ACTION_MODULES,
  DATA_SOURCE_MODULES,
  CRM_DATA_MODULES,      // 🔥 CRM Pipeline Data
  CRM_ACTION_MODULES,    // 🔥 CRM Actions
  INTEGRATION_MODULES,
  TRIGGER_MODULES,
  LOGIC_MODULES
} from '@/lib/studio/module-library';
import { ModuleTemplate } from '@/lib/studio/types';
import { getCustomToolModules } from '@/lib/studio/custom-tool-module';

const ICON_MAP: Record<string, any> = {
  Brain,
  Zap,
  Puzzle,
  Clock,
  Code,
  Wrench
};

interface ModulePaletteProps {
  onDragStart: (module: ModuleTemplate) => void;
  onDragEnd?: () => void;
}

interface CategorySection {
  id: string;
  name: string;
  icon: string;
  color: string;
  modules: ModuleTemplate[];
}

export function ModulePalette({ onDragStart, onDragEnd }: ModulePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['crm-data', 'crm-actions', 'data-sources', 'skills', 'actions', 'custom-tools'])
  );
  const [customToolModules, setCustomToolModules] = useState<ModuleTemplate[]>([]);

  // Load custom tools on mount
  useEffect(() => {
    const loadCustomTools = () => {
      const tools = getCustomToolModules();
      setCustomToolModules(tools);
    };

    loadCustomTools();

    // Reload custom tools when window gains focus (in case new tools were added)
    const handleFocus = () => loadCustomTools();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const categories: CategorySection[] = [
    {
      id: 'custom-tools',
      name: 'Custom Tools',
      icon: 'Wrench',
      color: '#A855F7',
      modules: customToolModules
    },
    // 🔥 CRM-NATIVE MODULES (SINTRA'S KILLER FEATURE!)
    {
      id: 'crm-data',
      name: '🔥 CRM Pipeline',
      icon: 'Database',
      color: '#F59E0B',
      modules: CRM_DATA_MODULES
    },
    {
      id: 'crm-actions',
      name: '🔥 CRM Actions',
      icon: 'Zap',
      color: '#F59E0B',
      modules: CRM_ACTION_MODULES
    },
    // Standard Modules
    {
      id: 'data-sources',
      name: 'Data Sources',
      icon: 'Database',
      color: '#3B82F6',
      modules: DATA_SOURCE_MODULES
    },
    {
      id: 'skills',
      name: 'Skills',
      icon: 'Brain',
      color: '#8B5CF6',
      modules: SKILL_MODULES
    },
    {
      id: 'actions',
      name: 'Actions',
      icon: 'Zap',
      color: '#10B981',
      modules: ACTION_MODULES
    },
    {
      id: 'integrations',
      name: 'Integrations',
      icon: 'Puzzle',
      color: '#10B981',
      modules: INTEGRATION_MODULES
    },
    {
      id: 'triggers',
      name: 'Triggers',
      icon: 'Clock',
      color: '#3B82F6',
      modules: TRIGGER_MODULES
    },
    {
      id: 'logic',
      name: 'Logic & Flow',
      icon: 'Code',
      color: '#EC4899',
      modules: LOGIC_MODULES
    }
  ];

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const filteredCategories = categories.map(category => ({
    ...category,
    modules: category.modules.filter(module =>
      module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }));

  const handleDragStart = (e: React.DragEvent, module: ModuleTemplate) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/reactflow', JSON.stringify(module));
    onDragStart(module);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    onDragEnd?.();
  };

  return (
    <div className="flex h-full flex-col border-r border-white/10 bg-surface-1">
      {/* Header */}
      <div className="border-b border-white/10 p-4">
        <h2 className="text-lg font-semibold text-text mb-3">Module Library</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-surface-0 py-2 pl-10 pr-4 text-sm text-text placeholder-text-muted outline-none transition focus:border-[rgb(var(--accent))]"
          />
        </div>
      </div>

      {/* Module Categories */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredCategories.map(category => {
          if (category.modules.length === 0 && searchQuery) return null;

          const isExpanded = expandedCategories.has(category.id);
          const CategoryIcon = ICON_MAP[category.icon] || Brain;

          return (
            <div key={category.id} className="rounded-lg border border-white/10 bg-surface-0">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex w-full items-center gap-3 p-3 transition hover:bg-card/5"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <CategoryIcon
                    className="h-4 w-4"
                    style={{ color: category.color }}
                  />
                </div>

                <div className="flex-1 text-left">
                  <h3 className="text-sm font-semibold text-text">{category.name}</h3>
                  <p className="text-xs text-text-muted">
                    {category.modules.length} module{category.modules.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-text-muted" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                )}
              </button>

              {/* Module List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1 p-2">
                      {category.modules.map(module => (
                        <div
                          key={module.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, module)}
                          onDragEnd={handleDragEnd}
                          className="cursor-grab rounded-lg border border-white/10 bg-surface-1 p-3 transition hover:border-[rgb(var(--accent))]/50 hover:bg-card/5 active:cursor-grabbing"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded"
                              style={{ backgroundColor: `${module.color}30` }}
                            >
                              <div
                                className="h-3 w-3 rounded-sm"
                                style={{ backgroundColor: module.color }}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-semibold text-text">{module.name}</h4>
                              <p className="mt-0.5 text-xs text-text-muted line-clamp-2">
                                {module.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {searchQuery && filteredCategories.every(c => c.modules.length === 0) && (
          <div className="py-8 text-center">
            <p className="text-sm text-text-muted">No modules found</p>
            <p className="text-xs text-text-muted mt-1">
              Try a different search term
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <p className="text-xs text-text-muted text-center">
          Drag modules to canvas to build your agent
        </p>
      </div>
    </div>
  );
}
