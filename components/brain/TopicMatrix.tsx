'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, Lightbulb, Brain, HelpCircle, Layers, ArrowUpRight, Hash, Hash as HashIcon, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GraphNode {
  id: string;
  label: string;
  type: 'memory' | 'document' | 'idea' | 'question';
  connections: number;
  description?: string;
  createdAt?: string;
}

// Default mock nodes for fallback (same as before for consistency)
const defaultNodes: GraphNode[] = [
  { id: '1', label: 'Sales Strategy', type: 'memory', connections: 12, description: 'Q4 Sales-Strategie und Zielsetzung.' },
  { id: '2', label: 'Q4 Report.pdf', type: 'document', connections: 8, description: 'Quartalsbericht mit Kennzahlen.' },
  { id: '3', label: 'Automate Workflows', type: 'idea', connections: 15, description: 'Automatisierungspotenzial Analyse.' },
  { id: '4', label: 'Customer Insights', type: 'memory', connections: 24, description: 'Feedback Cluster Q3.' },
  { id: '5', label: 'Data Analysis', type: 'question', connections: 5, description: 'Offene Fragen zur Datenstrategie.' },
  { id: '6', label: 'Competitor Intel', type: 'document', connections: 18, description: 'Analyse der Konkurrenzprodukte.' },
  { id: '7', label: 'Product Roadmap', type: 'idea', connections: 9, description: 'Geplante Features für 2026.' },
  { id: '8', label: 'Pricing Model', type: 'memory', connections: 14, description: 'Preisstrukturanalyse Enterprise.' },
];

export function TopicMatrix() {
  const [nodes, setNodes] = useState<GraphNode[]>(defaultNodes);
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
    } catch {
      // Silently use default nodes
    } finally {
      setIsLoading(false);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'memory': return <Brain className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'idea': return <Lightbulb className="h-4 w-4" />;
      case 'question': return <HelpCircle className="h-4 w-4" />;
      default: return <HashIcon className="h-4 w-4" />;
    }
  };

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      memory: 'text-indigo-400 group-hover:text-indigo-300',
      document: 'text-emerald-400 group-hover:text-emerald-300',
      idea: 'text-amber-400 group-hover:text-amber-300',
      question: 'text-purple-400 group-hover:text-purple-300',
    };
    return colors[type] || 'text-muted-foreground';
  };

  const getBgColor = (type: string) => {
    const colors: Record<string, string> = {
        memory: 'bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30',
        document: 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30',
        idea: 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/20 group-hover:border-amber-500/30',
        question: 'bg-purple-500/10 border-purple-500/20 group-hover:bg-purple-500/20 group-hover:border-purple-500/30',
    };
    return colors[type] || 'bg-card/5 border-white/10';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            <h3 className="text-white font-bold tracking-tight">Active Neural Clusters</h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-card/5 border border-white/10">
            <Activity className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider inline-block pt-0.5">
                {nodes.length} Topics Active
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatePresence>
            {nodes.slice(0, 8).map((node, idx) => (
                <motion.div
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`group relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${getBgColor(node.type)}`}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                        <ArrowUpRight className={`h-4 w-4 ${getNodeColor(node.type)}`} />
                    </div>

                    <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg bg-black/20 ${getNodeColor(node.type)}`}>
                            {getNodeIcon(node.type)}
                        </div>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-white/90 mb-1 leading-tight line-clamp-1">
                        {node.label}
                    </h4>
                    
                    <p className="text-[11px] text-white/40 line-clamp-2 mb-4 h-8 leading-relaxed font-medium">
                        {node.description || 'System generated cluster based on data density.'}
                    </p>

                    <div className="flex items-center gap-2 mt-auto">
                        <div className="flex-1 h-1 bg-black/20 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full opacity-60 ${getNodeColor(node.type).replace('text-', 'bg-')}`} 
                                style={{ width: `${Math.min(node.connections * 5, 100)}%` }}
                            />
                        </div>
                        <span className="text-[9px] font-bold text-white/30 tabular-nums">
                            {node.connections} refs
                        </span>
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
        
        {/* 'View All' Card */}
        <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="group flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-white/10 hover:border-white/20 hover:bg-card/[0.02] transition-all"
        >
            <div className="p-3 rounded-full bg-card/5 group-hover:bg-card/10 mb-2 transition-colors">
                <Hash className="h-4 w-4 text-white/40 group-hover:text-white transition-colors" />
            </div>
            <span className="text-xs font-bold text-white/40 group-hover:text-white transition-colors uppercase tracking-wider">
                Explore All Topics
            </span>
        </motion.button>
      </div>
    </div>
  );
}
