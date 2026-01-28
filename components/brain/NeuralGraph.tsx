
'use client';

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';

export default function NeuralGraph() {
  const fgRef = useRef();
  const [data, setData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  // Load Real Data
  useEffect(() => {
    const fetchGraph = async () => {
       try {
          const res = await fetch('/api/brain/graph');
          if (!res.ok) throw new Error('Failed to load graph');
          const graphData = await res.json();
          setData(graphData);
       } catch (err) {
          console.error('Graph Load Error:', err);
       } finally {
          setLoading(false);
       }
    };
    fetchGraph();
  }, []);

  const nodeColor = (node: any) => {
    switch (node.group) {
       case 'core': return '#6366f1'; // Indigo-500
       case 'category': return '#10b981'; // Emerald-500
       case 'doc': return '#a855f7'; // Purple-500
       case 'tag': return '#f59e0b'; // Amber-500
       default: return '#ffffff';
    }
  };

  const nodeVal = (node: any) => {
      // If server provides size, use it, else default
      return node.val || 5;
  };

  return (
    <div className="h-[600px] w-full rounded-3xl overflow-hidden border border-white/5 bg-black/20 relative">
       <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
          <h3 className="text-white font-bold text-sm uppercase tracking-widest bg-black/50 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
             Neural Knowledge Graph
          </h3>
          <span className="text-[10px] text-white/40 px-2">
             {data.nodes.length} Nodes • {data.links.length} Links
          </span>
       </div>

       {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
             <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Building Synapses...</span>
             </div>
          </div>
       )}

       <ForceGraph3D
          ref={fgRef}
          graphData={data}
          nodeLabel="name"
          nodeColor={nodeColor}
          nodeVal={nodeVal}
          nodeRelSize={6}
          linkColor={() => 'rgba(255,255,255,0.2)'}
          linkOpacity={0.3}
          linkWidth={1}
          backgroundColor="rgba(0,0,0,0)"
          showNavInfo={false}
          onNodeClick={node => {
             // In Phase 2.1: Open Document Details
             console.log('Clicked node:', node);
          }}
          // Auto-rotate
          onEngineStop={() => {
             if (fgRef.current) {
                // @ts-ignore
                fgRef.current.d3Force('charge').strength(-120);
             }
          }}
       />
    </div>
  );
}
