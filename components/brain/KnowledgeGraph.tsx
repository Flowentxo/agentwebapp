'use client';

import { useState, useEffect, useRef } from 'react';
import { Network, Maximize2, Minimize2, X, FileText, Lightbulb, Brain, HelpCircle, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GraphNode {
  id: string;
  label: string;
  type: 'memory' | 'document' | 'idea' | 'question';
  connections: number;
  description?: string;
  createdAt?: string;
}

// Default mock nodes for fallback
const defaultNodes: GraphNode[] = [
  { id: '1', label: 'Sales Strategy', type: 'memory', connections: 5, description: 'Q4 Sales-Strategie und Zielsetzung für das kommende Quartal.' },
  { id: '2', label: 'Q4 Report.pdf', type: 'document', connections: 3, description: 'Quartalsbericht mit Kennzahlen und Analysen.' },
  { id: '3', label: 'Automate Workflows', type: 'idea', connections: 4, description: 'Idee zur Automatisierung wiederkehrender Prozesse.' },
  { id: '4', label: 'Customer Insights', type: 'memory', connections: 6, description: 'Erkenntnisse aus Kundengesprächen und Feedback.' },
  { id: '5', label: 'Data Analysis', type: 'question', connections: 2, description: 'Offene Frage zur Datenanalyse-Strategie.' },
];

export function KnowledgeGraph() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [nodes, setNodes] = useState<GraphNode[]>(defaultNodes);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef(false);

  // Fetch graph data from API
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/brain/metrics');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success && data.nodes?.length > 0) {
        setNodes(data.nodes);
      }
      // Keep default nodes as fallback
    } catch {
      // Silently use default nodes
    } finally {
      setIsLoading(false);
    }
  };

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      memory: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
      document: 'bg-green-500/20 border-green-500/50 text-green-300',
      idea: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
      question: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
    };
    return colors[type] || colors.memory;
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'memory': return <Brain className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'idea': return <Lightbulb className="h-4 w-4" />;
      case 'question': return <HelpCircle className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
  };

  const closeNodeDetail = () => {
    setSelectedNode(null);
  };

  // Node Detail Modal
  const NodeDetailModal = ({ node }: { node: GraphNode }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={closeNodeDetail}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md rounded-2xl border p-6 ${getNodeColor(node.type)} bg-card/95`}
        initial={{ y: 20 }}
        animate={{ y: 0 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getNodeColor(node.type)}`}>
              {getNodeIcon(node.type)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{node.label}</h3>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{node.type}</span>
            </div>
          </div>
          <button
            onClick={closeNodeDetail}
            className="p-1 rounded-lg hover:bg-card/10 transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-300 mb-4">
          {node.description || 'Keine Beschreibung verfügbar.'}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Link2 className="h-3 w-3" />
            <span>{node.connections} Verbindungen</span>
          </div>
          {node.createdAt && (
            <span>Erstellt: {new Date(node.createdAt).toLocaleDateString('de-DE')}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <button className="flex-1 px-4 py-2 bg-card/5 hover:bg-card/10 rounded-lg text-sm text-gray-300 transition-colors">
            Details anzeigen
          </button>
          <button className="flex-1 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg text-sm text-indigo-300 transition-colors">
            Verknüpfungen
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <>
      {/* Node Detail Modal */}
      <AnimatePresence>
        {selectedNode && <NodeDetailModal node={selectedNode} />}
      </AnimatePresence>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-6xl h-full max-h-[90vh] bg-card rounded-2xl border border-blue-500/30 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Network className="h-6 w-6 text-blue-400" />
                <h3 className="text-xl font-semibold text-white">Knowledge Graph</h3>
                <span className="text-xs text-muted-foreground ml-2">({nodes.length} Nodes)</span>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-lg hover:bg-card/10 transition-colors"
                aria-label="Close fullscreen"
              >
                <Minimize2 className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 overflow-auto">
              <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/5 border border-blue-500/30 p-6 h-full">
                <div className="relative h-full flex items-center justify-center min-h-[500px]">
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Central Hub */}
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-purple-500/30 border-2 border-purple-500/50 z-10">
                      <Network className="h-12 w-12 text-purple-400" />
                    </div>

                    {/* Nodes - Larger for fullscreen */}
                    {nodes.map((node, idx) => {
                      const angle = (idx / nodes.length) * 2 * Math.PI - Math.PI / 2;
                      const radius = 200;
                      const x = Math.cos(angle) * radius;
                      const y = Math.sin(angle) * radius;

                      return (
                        <motion.div
                          key={node.id}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          onClick={() => handleNodeClick(node)}
                          className={`absolute flex items-center gap-2 rounded-lg border px-6 py-3 ${getNodeColor(node.type)} transition-all hover:scale-110 cursor-pointer shadow-lg`}
                          style={{
                            transform: `translate(${x}px, ${y}px)`,
                          }}
                        >
                          {getNodeIcon(node.type)}
                          <span className="text-base font-medium whitespace-nowrap">{node.label}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-blue-500/50"></div>
                    <span className="text-sm text-muted-foreground">Memories</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-green-500/50"></div>
                    <span className="text-sm text-muted-foreground">Documents</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-yellow-500/50"></div>
                    <span className="text-sm text-muted-foreground">Ideas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-purple-500/50"></div>
                    <span className="text-sm text-muted-foreground">Questions</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regular View */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-blue-400" />
            <h3 className="text-white font-semibold">Knowledge Graph</h3>
            {isLoading && <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>}
          </div>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-2 rounded-lg hover:bg-card/10 transition-colors group"
            aria-label="Expand to fullscreen"
            title="Expand graph"
          >
            <Maximize2 className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
          </button>
        </div>

        <div className="oracle-glass-card oracle-glow-hover rounded-xl p-6">
          {/* Graph Visualization (Simplified) */}
          <div className="relative h-64 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Central Hub */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/30 border-2 border-purple-500/50 z-10">
                <Network className="h-8 w-8 text-purple-400" />
              </div>

              {/* Nodes */}
              {nodes.map((node, idx) => {
                const angle = (idx / nodes.length) * 2 * Math.PI - Math.PI / 2;
                const radius = 80;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => handleNodeClick(node)}
                    className={`absolute flex items-center justify-center rounded-lg border px-3 py-2 ${getNodeColor(node.type)} transition-all hover:scale-110 cursor-pointer`}
                    style={{
                      transform: `translate(${x}px, ${y}px)`,
                    }}
                  >
                    <span className="text-xs font-medium whitespace-nowrap">{node.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-blue-500/50"></div>
              <span className="text-xs text-muted-foreground">Memories</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-green-500/50"></div>
              <span className="text-xs text-muted-foreground">Documents</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-yellow-500/50"></div>
              <span className="text-xs text-muted-foreground">Ideas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-purple-500/50"></div>
              <span className="text-xs text-muted-foreground">Questions</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Klicke auf einen Knoten für Details. Nutze das Expand-Icon für die Vollbild-Ansicht.
        </p>
      </div>
    </>
  );
}
