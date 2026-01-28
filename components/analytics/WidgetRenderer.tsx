'use client';

import { Widget } from '@/lib/analytics/mockData';
import { Activity, TrendingUp, TrendingDown, Minus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// --- SUB-COMPONENTS (INLINED FOR SPEED, CAN BE SEPARATED LATER) ---


interface WidgetProps {
   widget: Widget;
   onDrillDown?: (metric: string) => void;
}

function NumberWidget({ widget, onDrillDown }: WidgetProps) {
  const { config, data } = widget;
  const isPositive = config.trend === 'up';
  const isNeutral = config.trend === 'neutral';
  
  const isClickable = !!config.metric && !!onDrillDown;

  return (
    <div 
      className={cn(
        "flex flex-col justify-between h-full transition-all",
        isClickable && "cursor-pointer group-hover:translate-x-1"
      )}
      onClick={() => isClickable && config.metric && onDrillDown(config.metric)}
    >
      <div>
        <div className="text-3xl font-bold text-white tracking-tight mb-1">{data.value}</div>
        <div className="text-xs font-medium text-white/40 uppercase tracking-wider">{widget.title}</div>
      </div>
      
      <div className="flex items-center gap-2 mt-4">
        {config.change && (
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold",
            isPositive && "bg-emerald-500/10 text-emerald-400",
            !isPositive && !isNeutral && "bg-amber-500/10 text-amber-400",
            isNeutral && "bg-card/5 text-white/40"
          )}>
            {isPositive && <TrendingUp className="w-3 h-3" />}
            {!isPositive && !isNeutral && <TrendingDown className="w-3 h-3" />}
            {config.change}
          </div>
        )}
        {data.subLabel && (
          <span className="text-xs text-white/20">{data.subLabel}</span>
        )}
      </div>
    </div>
   );
}


function LineChartWidget({ widget }: { widget: Widget }) {
  return (
    <div className="h-full w-full flex flex-col">
       <div className="h-full min-h-[200px] w-full pt-4" style={{ minHeight: 200 }}>
         <ResponsiveContainer width="100%" height="100%" minHeight={180}>
           <LineChart data={widget.data}>
             <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
             <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} 
                dy={10}
             />
             <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} 
             />
             <RechartsTooltip 
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#fff' }}
             />
             <Line 
                type="monotone" 
                dataKey="success" 
                stroke={widget.config.color || "#6366f1"} 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4, fill: '#fff' }} 
             />
             {widget.data[0].failed !== undefined && (
                <Line 
                  type="monotone" 
                  dataKey="failed" 
                  stroke="#ef4444" 
                  strokeWidth={2} 
                  dot={false} 
                />
             )}
           </LineChart>
         </ResponsiveContainer>
       </div>
    </div>
  );
}

function TableWidget({ widget }: { widget: Widget }) {
  const { columns, rows } = widget.data;
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/5">
            {columns.map((col: string) => (
              <th key={col} className="pb-3 text-xs font-bold text-white/30 uppercase tracking-wider">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row: any) => (
            <tr key={row.id} className="group hover:bg-card/[0.02] transition-colors">
              <td className="py-3 text-white/40 font-mono text-xs">{row.timestamp}</td>
              <td className="py-3 text-white font-medium">{row.agent}</td>
              <td className="py-3 text-red-400">{row.error}</td>
              <td className="py-3">
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                  row.status === 'Resolved' && "border-emerald-500/20 text-emerald-400 bg-emerald-500/5",
                  row.status === 'Failed' && "border-red-500/20 text-red-400 bg-red-500/5",
                  row.status === 'Retrying' && "border-amber-500/20 text-amber-400 bg-amber-500/5",
                  row.status === 'Ignored' && "border-white/10 text-white/20 bg-card/5",
                )}>
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PieChartWidget({ widget }: { widget: Widget }) {
   return (
      <div className="h-full w-full" style={{ minHeight: 200 }}>
         <ResponsiveContainer width="100%" height="100%" minHeight={180}>
            <PieChart>
               <Pie
                  data={widget.data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
               >
                  {widget.data.map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                  ))}
               </Pie>
               <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '10px', opacity: 0.6 }} />
               <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
            </PieChart>
         </ResponsiveContainer>
      </div>
   );
}



// --- NEW WIDGETS ---

// --- NEW WIDGETS ---

function GaugeWidget({ widget }: { widget: Widget }) {
   const { value, target, unit } = widget.data;
   const numericValue = typeof value === 'string' ? parseFloat(value) : value;
   const numericTarget = typeof target === 'string' ? parseFloat(target) : target;
   const percentage = (numericValue / numericTarget) * 100;
   
   return (
      <div className="flex flex-col items-center justify-center h-full">
         <div className="relative w-40 h-20 overflow-hidden">
            <div className="absolute top-0 left-0 w-40 h-40 rounded-full border-[16px] border-white/5 box-border" />
            <div 
               className="absolute top-0 left-0 w-40 h-40 rounded-full border-[16px] border-transparent border-t-emerald-500 transition-all duration-1000 ease-out box-border"
               style={{ transform: `rotate(${Math.min(percentage, 100) * 1.8 - 180}deg)` }}
            />
         </div>
         <div className="flex flex-col items-center -mt-8">
            <span className="text-3xl font-bold text-white tracking-tight">{value}{unit}</span>
            <span className="text-xs text-white/40 uppercase tracking-widest mt-1">Target: {target}{unit}</span>
         </div>
      </div>
   );
}

function HeatmapWidget({ widget }: { widget: Widget }) {
   const { xLabels, yLabels, data } = widget.data;
   // data is 2D array [row][col]
   
   // Normalize
   const max = Math.max(...data.flat());
   
   return (
      <div className="h-full flex flex-col justify-center">
         <div className="grid grid-cols-[auto_1fr] gap-4">
            {/* Y-Axis Labels */}
            <div className="flex flex-col justify-around text-xs font-medium text-white/30 text-right py-2">
               {yLabels.map((l: string) => <div key={l}>{l}</div>)}
            </div>
            
            {/* Grid */}
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${xLabels.length}, 1fr)` }}>
               {data.map((row: number[], rowIndex: number) => (
                  row.map((val: number, colIndex: number) => {
                     const opacity = (val / max);
                     return (
                        <div 
                           key={`${rowIndex}-${colIndex}`}
                           className="aspect-[3/1] rounded bg-indigo-500 transition-all hover:scale-105 hover:brightness-125 relative group"
                           style={{ opacity: Math.max(opacity, 0.1) }}
                        >
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] font-bold text-white drop-shadow-md">{val}</span>
                            </div>
                        </div>
                     );
                  })
               )).flat()}
               
               {/* X-Axis Labels */}
               {xLabels.map((l: string) => <div key={l} className="text-center text-xs font-medium text-white/30">{l}</div>)}
            </div>
         </div>
      </div>
   );
}

function TimelineWidget({ widget }: { widget: Widget }) {
   return (
      <div className="h-full w-full overflow-x-auto overflow-y-hidden pb-2 hide-scrollbar">
         <div className="flex items-center h-full min-w-max px-4 gap-8">
             {widget.data.map((item: any, idx: number) => (
                 <div key={idx} className="relative flex flex-col items-center group">
                     {/* Line Connector */}
                     {idx < widget.data.length - 1 && (
                         <div className="absolute top-[15px] left-[50%] w-[calc(100%+32px)] h-[2px] bg-card/5 -z-10" />
                     )}
                     
                     {/* Node */}
                     <div className={cn(
                        "w-8 h-8 rounded-full border-4 border-[#18181b] flex items-center justify-center shrink-0 mb-3 transition-transform group-hover:scale-110",
                        item.type === 'error' ? 'bg-red-500 shadow-[0_0_15px_-3px_rgba(239,68,68,0.5)]' : 
                        item.type === 'warning' ? 'bg-amber-500 shadow-[0_0_15px_-3px_rgba(245,158,11,0.5)]' :
                        item.type === 'success' ? 'bg-emerald-500 shadow-[0_0_15px_-3px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)]'
                     )}>
                        <div className="w-2 h-2 rounded-full bg-card/50" />
                     </div>
                     
                     {/* Content */}
                     <div className="flex flex-col items-center text-center w-32">
                         <span className="text-xs font-bold text-white mb-0.5 whitespace-nowrap">{item.time}</span>
                         <span className="text-sm font-medium text-white/90 leading-tight mb-1">{item.label}</span>
                         {item.subtext && (
                             <span className="text-[10px] text-white/40 leading-tight line-clamp-2">{item.subtext}</span>
                         )}
                     </div>
                 </div>
             ))}
         </div>
      </div>
   );
}


// --- MAIN RENDERER ---

interface RendererProps {
   widget: Widget;
   onDrillDown?: (metric: string) => void;
}

export function WidgetRenderer({ widget, onDrillDown }: RendererProps) {
  const renderContent = () => {
    switch (widget.type) {
      case 'number':
        return <NumberWidget widget={widget} onDrillDown={onDrillDown} />;
      case 'gauge':
        return <GaugeWidget widget={widget} />;
      case 'line':
        return <LineChartWidget widget={widget} />;
      case 'table':
        return <TableWidget widget={widget} />;
      case 'pie':
        return <PieChartWidget widget={widget} />;
      case 'heatmap':
        return <HeatmapWidget widget={widget} />;
      case 'timeline':
         return <TimelineWidget widget={widget} />;
      case 'bar':
         // Reusing LineChart structure for now, can separate if needed
         return <div className="text-white/20 text-xs">Chart not implemented</div>; 
      default:
        return <div className="text-white/20 text-xs">Widget type '{widget.type}' not found</div>;
    }
  };

  return (
    <div className="h-full flex flex-col p-5 bg-card/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all group relative overflow-hidden">
       {/* Header */}
       <div className="flex items-center justify-between mb-4 z-10">
          {widget.type !== 'number' && widget.type !== 'gauge' && (
             <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                {widget.title}
             </h3>
          )}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
             <button className="p-1 hover:bg-card/10 rounded text-white/40 hover:text-white">
                <MoreHorizontal className="w-4 h-4" />
             </button>
          </div>
       </div>
       
       {/* Content */}
       <div className="flex-1 min-h-0 relative z-10">
          {renderContent()}
       </div>

       {/* Decorator for Number Cards */}
       {(widget.type === 'number') && (
           <div className={`absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl pointer-events-none ${widget.config.color?.replace('text-', 'bg-') || 'bg-card'}/20`} />
       )}
    </div>
  );
}
