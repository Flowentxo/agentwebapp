'use client';

import { useState, useEffect } from 'react';
import { Plus, Code, Link, Database, Webhook, Settings, Play, Trash2, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import { CreateToolDialog } from '@/components/tools/CreateToolDialog';
import { TestConsole } from '@/components/tools/TestConsole';

// ============================================================
// TYPES
// ============================================================

interface CustomTool {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category: string;
  icon?: string;
  type: 'api_call' | 'code_execution' | 'database_query' | 'webhook';
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
}

// ============================================================
// TOOL MANAGER PAGE
// ============================================================

export default function ToolsPage() {
  const [tools, setTools] = useState<CustomTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedToolForTest, setSelectedToolForTest] = useState<CustomTool | null>(null);

  // Fetch tools
  useEffect(() => {
    fetchTools();
  }, [selectedType]);

  const fetchTools = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }

      const response = await fetch(`/api/custom-tools?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch tools');

      const data = await response.json();
      setTools(data.tools || []);
    } catch (error) {
      console.error('Failed to fetch tools:', error);
      setTools([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter tools by search query
  const filteredTools = tools.filter(tool =>
    tool.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tool type icons
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'api_call':
        return <Link className="w-4 h-4" />;
      case 'code_execution':
        return <Code className="w-4 h-4" />;
      case 'database_query':
        return <Database className="w-4 h-4" />;
      case 'webhook':
        return <Webhook className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  // Tool type colors
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'api_call':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'code_execution':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'database_query':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'webhook':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-muted/500/10 text-muted-foreground border-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Custom Tools
            </h1>
            <p className="text-muted-foreground">
              Create and manage custom tools for your agents
            </p>
          </div>

          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Tool
          </button>
        </motion.div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Link className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-muted-foreground text-sm">API Tools</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {tools.filter(t => t.type === 'api_call').length}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Code className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-muted-foreground text-sm">Code Tools</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {tools.filter(t => t.type === 'code_execution').length}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Database className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-muted-foreground text-sm">Database Tools</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {tools.filter(t => t.type === 'database_query').length}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Webhook className="w-5 h-5 text-orange-400" />
              </div>
              <span className="text-muted-foreground text-sm">Webhooks</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {tools.filter(t => t.type === 'webhook').length}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Type Filter */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'api_call', label: 'API' },
              { value: 'code_execution', label: 'Code' },
              { value: 'database_query', label: 'Database' },
              { value: 'webhook', label: 'Webhook' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedType(filter.value)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedType === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-muted-foreground hover:bg-gray-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredTools.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="inline-block p-6 bg-gray-800/50 rounded-full mb-4">
              <Settings className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No tools yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first custom tool to get started
            </p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create Tool
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool, index) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-blue-500/50 transition-colors"
              >
                {/* Tool Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${getTypeColor(tool.type)}`}>
                      {getTypeIcon(tool.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {tool.displayName}
                      </h3>
                      <span className="text-sm text-muted-foreground">{tool.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${tool.isActive ? 'bg-green-500' : 'bg-muted/500'}`} />
                  </div>
                </div>

                {/* Description */}
                {tool.description && (
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {tool.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>{tool.usageCount} executions</span>
                  {tool.lastUsedAt && (
                    <span>
                      Last used: {new Date(tool.lastUsedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedToolForTest(tool)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Test
                  </button>
                  <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Tool Dialog */}
      <CreateToolDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          fetchTools();
          setShowCreateDialog(false);
        }}
      />

      {/* Test Console */}
      <TestConsole
        tool={selectedToolForTest as any}
        isOpen={selectedToolForTest !== null}
        onClose={() => setSelectedToolForTest(null)}
      />
    </div>
  );
}
