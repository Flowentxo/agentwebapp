'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllAgents, type AgentPersona } from '@/lib/agents/personas';
import {
  Search, Plus, BarChart2,
  Zap, ArrowRight,
  ChevronRight,
  CheckCircle, AlertCircle,
  Grid3X3, List, RefreshCw,
  Cpu, Target, Activity, X, Shield
} from 'lucide-react';
import '@/app/my-agents-premium.css';

// Department configuration
const DEPARTMENTS = {
  revenue: { name: 'Revenue', color: '#10B981', agents: ['dexter', 'finn', 'nova'] },
  support: { name: 'Customer Success', color: '#3B82F6', agents: ['cassie', 'echo'] },
  operations: { name: 'Operations', color: '#8B5CF6', agents: ['aura', 'kai', 'lex', 'omni'] },
  creative: { name: 'Creative', color: '#EC4899', agents: ['emmie', 'ari', 'vera'] },
};

// Live activity feed
const LIVE_ACTIVITIES = [
  { id: 1, agent: 'Cassie', action: 'resolved ticket #4521', time: '2m ago', type: 'success', icon: CheckCircle },
  { id: 2, agent: 'Dexter', action: 'generated Q4 forecast report', time: '5m ago', type: 'success', icon: BarChart2 },
  { id: 3, agent: 'Echo', action: 'escalated issue to human', time: '8m ago', type: 'warning', icon: AlertCircle },
  { id: 4, agent: 'Kai', action: 'deployed hotfix v2.4.1', time: '12m ago', type: 'success', icon: Cpu },
  { id: 5, agent: 'Emmie', action: 'sent 847 campaign emails', time: '15m ago', type: 'success', icon: Activity },
  { id: 6, agent: 'Aura', action: 'optimized workflow pipeline', time: '18m ago', type: 'success', icon: Zap },
  { id: 7, agent: 'Finn', action: 'processed 23 invoices', time: '22m ago', type: 'success', icon: Target },
];

const AGENT_LIVE_DATA: Record<string, any> = {
  dexter: { status: 'running', tasksToday: 47, tasksWeek: 312, successRate: 98.5, avgResponseTime: '1.2s', lastActive: 'Just now', department: 'revenue', priority: 'critical', trend: [65, 78, 82, 75, 88, 95, 98.5], action: 'Analyzing Revenue Leakage', serialId: 'REV-DX-001', expertise: 'Forecasting' },
  cassie: { status: 'running', tasksToday: 156, tasksWeek: 1089, successRate: 99.1, avgResponseTime: '0.8s', lastActive: '2m ago', department: 'support', priority: 'critical', trend: [95, 94, 96, 98, 97, 99, 99.1], action: 'Triaging High-Priority Tickets', serialId: 'SUP-CS-024', expertise: 'Conflict Resolution' },
  emmie: { status: 'running', tasksToday: 89, tasksWeek: 623, successRate: 97.8, avgResponseTime: '1.5s', lastActive: '5m ago', department: 'creative', priority: 'high', trend: [80, 85, 82, 88, 92, 95, 97.8], action: 'Synthesizing Q4 Visuals', serialId: 'CRT-EM-012', expertise: 'Visual Narrative' },
  aura: { status: 'running', tasksToday: 34, tasksWeek: 238, successRate: 99.9, avgResponseTime: '0.5s', lastActive: 'Just now', department: 'operations', priority: 'critical', trend: [99, 99.5, 99.8, 99.7, 99.9, 99.9, 99.9], action: 'Balancing Neural Clusters', serialId: 'OPS-AR-404', expertise: 'Cluster Management' },
  nova: { status: 'idle', tasksToday: 23, tasksWeek: 161, successRate: 96.2, avgResponseTime: '2.1s', lastActive: '1h ago', department: 'revenue', priority: 'normal', trend: [90, 92, 91, 94, 95, 96, 96.2], action: 'Sleeping (Ready to Execute)', serialId: 'REV-NV-009', expertise: 'Growth Hacking' },
  kai: { status: 'running', tasksToday: 78, tasksWeek: 546, successRate: 99.4, avgResponseTime: '0.9s', lastActive: '1m ago', department: 'operations', priority: 'high', trend: [94, 95, 97, 98, 98.5, 99, 99.4], action: 'Patching API v2 endpoints', serialId: 'OPS-KI-777', expertise: 'Hotfix Deployment' },
  lex: { status: 'paused', tasksToday: 12, tasksWeek: 84, successRate: 100, avgResponseTime: '3.2s', lastActive: '4h ago', department: 'operations', priority: 'normal', trend: [100, 100, 100, 100, 100, 100, 100], action: 'Maintenance Window', serialId: 'OPS-LX-808', expertise: 'Architecture' },
  finn: { status: 'running', tasksToday: 41, tasksWeek: 287, successRate: 98.9, avgResponseTime: '1.1s', lastActive: '3m ago', department: 'revenue', priority: 'high', trend: [92, 94, 95, 96, 97, 98, 98.9], action: 'Scouting New Segments', serialId: 'REV-FN-101', expertise: 'Segment Discovery' },
  ari: { status: 'idle', tasksToday: 8, tasksWeek: 56, successRate: 95.5, avgResponseTime: '2.8s', lastActive: '2h ago', department: 'creative', priority: 'normal', trend: [90, 91, 92, 93, 94, 95, 95.5], action: 'Indexing Reference Models', serialId: 'CRT-AR-202', expertise: 'Style Transfer' },
  echo: { status: 'running', tasksToday: 112, tasksWeek: 784, successRate: 99.2, avgResponseTime: '0.7s', lastActive: 'Just now', department: 'support', priority: 'critical', trend: [96, 97, 98, 97, 98.5, 99, 99.2], action: 'Real-time Voice Synthesis', serialId: 'SUP-EC-303', expertise: 'Vocal Empathy' },
  vera: { status: 'idle', tasksToday: 15, tasksWeek: 105, successRate: 97.1, avgResponseTime: '1.9s', lastActive: '45m ago', department: 'creative', priority: 'normal', trend: [92, 93, 94, 95, 96, 97, 97.1], action: 'Auditing Brand Guardrails', serialId: 'CRT-VR-001', expertise: 'Safety Ops' },
  omni: { status: 'running', tasksToday: 28, tasksWeek: 196, successRate: 99.8, avgResponseTime: '0.4s', lastActive: 'Just now', department: 'operations', priority: 'high', trend: [98, 98.5, 99, 99.5, 99.7, 99.8, 99.8], action: 'Managing Cross-Chain Auth', serialId: 'OPS-OM-999', expertise: 'Multi-Core Logic' },
};

export default function MyAgentsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [agents, setAgents] = useState<AgentPersona[]>([]);
  const [filter] = useState<'all' | 'running' | 'idle' | 'critical'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [modalType, setModalType] = useState<'none' | 'system' | 'neural'>('none');

  useEffect(() => {
    setAgents(getAllAgents());
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === 'Escape') {
        setCommandOpen(false);
        setModalType('none');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredAgents = useMemo(() => {
    let result = agents;
    if (selectedDepartment) {
      const deptAgents = DEPARTMENTS[selectedDepartment as keyof typeof DEPARTMENTS]?.agents || [];
      result = result.filter(agent => deptAgents.includes(agent.id));
    }
    if (filter !== 'all') {
      result = result.filter(agent => {
        const data = AGENT_LIVE_DATA[agent.id];
        if (filter === 'running') return data?.status === 'running';
        if (filter === 'critical') return data?.priority === 'critical';
        return data?.status === 'idle' || data?.status === 'paused';
      });
    }
    if (searchQuery.trim()) {
      result = result.filter(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return result;
  }, [agents, searchQuery, filter, selectedDepartment]);

  const runningCount = Object.values(AGENT_LIVE_DATA).filter(d => d.status === 'running').length;
  const totalTasks = Object.values(AGENT_LIVE_DATA).reduce((sum, d) => sum + d.tasksToday, 0);

  return (
    <div className="min-h-full bg-transparent agents-layout-integrated overflow-hidden relative">
      <div className="relative">
        <main className="max-w-[1600px] mx-auto px-10 py-10 pb-32">
          {/* Header */}
          <div className="enterprise-header-wrap mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="breadcrumb-item cursor-pointer">Dashboard</span>
                <ChevronRight className="w-3 h-3 text-white/10" />
                <span className="breadcrumb-item cursor-pointer text-white/60 uppercase text-[10px] font-black tracking-widest">AI Workforce</span>
              </div>
              
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-bold text-white tracking-tight">
                  My <span className="text-indigo-400">Workforce</span>
                </h1>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none">System Active</span>
                </div>
              </div>

              <div className="flex items-center gap-8 mt-6">
                <StatItem label="Active Agents" value={runningCount} badge="Live" />
                <div className="w-px h-8 bg-card/5" />
                <StatItem label="Tasks Completed" value={totalTasks} badge="Today" />
                <div className="w-px h-8 bg-card/5" />
                <StatItem label="Efficiency" value="99.9%" badge="Target" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <SearchButton onClick={() => setCommandOpen(true)} />
              <div className="flex items-center p-1 bg-card/[0.03] border border-white/5 rounded-2xl">
                <button onClick={() => setView('grid')} className={`p-2.5 rounded-xl transition-all ${view === 'grid' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/30 hover:text-white'}`}><Grid3X3 className="w-4 h-4" /></button>
                <button onClick={() => setView('list')} className={`p-2.5 rounded-xl transition-all ${view === 'list' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/30 hover:text-white'}`}><List className="w-4 h-4" /></button>
              </div>
              <button onClick={() => router.push('/revolution')} className="h-10 px-6 rounded-2xl bg-card text-black text-[12px] font-black uppercase tracking-widest hover:bg-card/90 transition-all flex items-center gap-2">
                <Plus className="w-4 h-4" /> Deploy
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Main Content Area */}
            <div className="xl:col-span-3 space-y-8">
              {/* Category Nav */}
              <div className="flex items-center justify-between">
                <div className="premium-filter-nav border-none bg-transparent p-0 gap-2">
                  <button onClick={() => setSelectedDepartment(null)} className={`filter-nav-btn px-6 py-2.5 rounded-2xl ${!selectedDepartment ? 'bg-indigo-500 text-white' : 'bg-card/5 text-white/40 hover:bg-card/10'}`}>All Workforce</button>
                  {Object.entries(DEPARTMENTS).map(([key, dept]) => (
                    <button key={key} onClick={() => setSelectedDepartment(key)} className={`filter-nav-btn px-6 py-2.5 rounded-2xl flex items-center gap-3 ${selectedDepartment === key ? 'bg-indigo-500 text-white' : 'bg-card/5 text-white/40 hover:bg-card/10'}`}>
                      <div className="w-2 h-2 rounded-full" style={{ background: dept.color }} />
                      {dept.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent Grid/List */}
              <AnimatePresence mode="wait">
                {view === 'grid' ? (
                  <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {filteredAgents.map((agent, index) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        data={AGENT_LIVE_DATA[agent.id]}
                        index={index}
                        isSelected={selectedAgents.includes(agent.id)}
                        onToggleSelect={(e: any) => {
                          e.stopPropagation();
                          setSelectedAgents(prev => prev.includes(agent.id) ? prev.filter(id => id !== agent.id) : [...prev, agent.id]);
                        }}
                        onClick={() => router.push(`/agents/${agent.id}/chat`)}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    {filteredAgents.map((agent, index) => (
                      <AgentListItem
                        key={agent.id}
                        agent={agent}
                        data={AGENT_LIVE_DATA[agent.id]}
                        index={index}
                        isSelected={selectedAgents.includes(agent.id)}
                        onToggleSelect={(e: any) => {
                          e.stopPropagation();
                          setSelectedAgents(prev => prev.includes(agent.id) ? prev.filter(id => id !== agent.id) : [...prev, agent.id]);
                        }}
                        onClick={() => router.push(`/agents/${agent.id}/chat`)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar Controls */}
            <div className="space-y-6">
              <SidebarWidget title="Intelligence Stream">
                <div className="space-y-1 max-h-[400px] overflow-y-auto no-scrollbar">
                  {LIVE_ACTIVITIES.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </SidebarWidget>

              <SidebarWidget title="System Status" interactive onClick={() => setModalType('system')}>
                <div className="space-y-5">
                  <LoadBar label="Processing Power" value={42} color="#6366f1" />
                  <LoadBar label="Memory Usage" value={68} color="#8b5cf6" />
                  <p className="text-[10px] text-white/20 font-bold uppercase text-center mt-4">All systems normal</p>
                </div>
              </SidebarWidget>

              <SidebarWidget title="Shortcuts">
                <div className="grid grid-cols-1 gap-2">
                  <SideAction icon={<Shield />} label="Security Check" />
                  <SideAction icon={<Target />} label="Optimize Tasks" />
                  <SideAction icon={<RefreshCw />} label="Sync Data" />
                </div>
              </SidebarWidget>
            </div>
          </div>
        </main>
      </div>

      {/* Overlays (Modals, Palette, Bulk Bar) */}
      <BulkActionBar selectedCount={selectedAgents.length} onCancel={() => setSelectedAgents([])} />
      <SystemModal isOpen={modalType === 'system'} onClose={() => setModalType('none')} />
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} agents={agents} searchQuery={searchQuery} setSearchQuery={setSearchQuery} router={router} />
    </div>
  );
}

// --- SUBCOMPONENTS WITH ENHANCED PERSONALITY ---

function AgentCard({ agent, data, index, isSelected, onToggleSelect, onClick }: any) {
  const Icon = agent.icon;
  const status = data?.status || 'idle';
  const dept = data?.department || 'operations';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      onClick={onToggleSelect}
      className={`premium-agent-card group relative p-8 rounded-[2.5rem] border overflow-hidden transition-all duration-500 cursor-pointer domain-${dept} ${isSelected ? 'is-selected' : ''}`}
      style={{ borderColor: isSelected ? agent.color : 'rgba(255, 255, 255, 0.05)' }}
    >
      {/* Entity DNA Pattern */}
      <div className="dna-pattern" style={{ color: agent.color }} />
      
      {/* Selection Control */}
      <div 
        onClick={onToggleSelect}
        className={`absolute top-6 left-6 w-6 h-6 rounded-full border flex items-center justify-center transition-all z-20 ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/10 bg-card/5 group-hover:bg-card/10'}`}
      >
        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
      </div>

      {/* Identity & Status */}
      <div className="agent-dossier-header relative z-10 ml-6">
        <div className="agent-avatar-ring" style={{ color: agent.color }}>
          <Icon className="w-7 h-7" style={{ color: agent.color }} />
        </div>
        <div className="agent-identity-wrap">
          <h3 className="text-2xl font-bold text-white leading-none tracking-tight">{agent.name}</h3>
          <p className="text-[12px] text-indigo-400 font-semibold mt-1 uppercase tracking-wider">{agent.specialties[0]}</p>
        </div>
      </div>

      {/* Task Insight - Clean and Minimal */}
      <div className="relative z-10 mb-8 border-t border-white/[0.04] pt-6">
        <div className="agent-objective-box bg-card/[0.01] border border-white/[0.04] p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'running' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-card/20'}`} />
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Currently Doing</span>
          </div>
          <p className="text-[13px] text-white/70 font-medium leading-relaxed italic">
            "{data?.action}"
          </p>
        </div>
      </div>

      {/* Refined Capability Footer */}
      <div className="grid grid-cols-2 gap-[1px] bg-card/[0.05] border-t border-white/[0.05] -mx-8 -mb-8 relative z-10">
        <div className="p-5 flex flex-col justify-center bg-zinc-900/60 backdrop-blur-sm">
          <span className="text-[9px] font-bold text-white/20 uppercase tracking-wider mb-1">Reliability</span>
          <span className="text-sm font-bold text-white/80">99.9% Optimal</span>
        </div>
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="p-5 flex flex-col justify-center items-center bg-indigo-500 hover:bg-indigo-600 transition-all cursor-pointer group/btn active:scale-95"
        >
          <div className="flex items-center gap-2">
             <ArrowRight className="w-4 h-4 text-white" />
             <span className="text-[11px] font-bold text-white uppercase tracking-wider">Open Agent</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatItem({ label, value, badge }: { label: string, value: any, badge?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase font-bold text-white/20 tracking-wider mb-1.5">{label}</span>
      <div className="flex items-center gap-2.5">
        <span className="text-2xl font-bold text-white tracking-tight leading-none">{value}</span>
        {badge && <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md uppercase tracking-widest">{badge}</span>}
      </div>
    </div>
  );
}

function SearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-4 h-11 px-5 bg-card/[0.03] border border-white/5 rounded-2xl text-[13px] text-white/40 hover:bg-card/[0.06] transition-all group">
      <Search className="w-4 h-4 group-hover:text-indigo-400" />
      <span className="font-bold uppercase tracking-wider">Search Agents</span>
      <kbd className="ml-4 px-2 py-0.5 bg-muted/40 rounded-lg text-[10px] text-muted-foreground border border-border">⌘K</kbd>
    </button>
  );
}

function SidebarWidget({ title, children, interactive, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`bg-card/[0.02] border border-white/5 rounded-[2rem] overflow-hidden transition-all duration-300 ${interactive ? 'cursor-pointer hover:bg-card/[0.04] active:scale-[0.98]' : ''}`}
    >
      <div className="px-6 py-4 border-b border-white/[0.04] bg-card/[0.02] flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/40">{title}</h3>
        {interactive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function ActivityItem({ activity }: any) {
  return (
    <div className="flex items-start gap-4 p-3.5 rounded-2xl hover:bg-card/[0.04] transition-all group cursor-pointer border border-transparent">
      <div className={`p-2 rounded-xl bg-card/5 ${activity.type === 'success' ? 'text-emerald-400' : 'text-amber-400'} border border-white/5`}>
        <activity.icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-white/70 font-medium leading-tight"><span className="text-white font-bold">{activity.agent}</span> {activity.action}</p>
        <p className="text-[10px] text-white/20 mt-1 font-bold uppercase tracking-widest">{activity.time}</p>
      </div>
    </div>
  );
}

function LoadBar({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[11px] font-bold text-white/30 uppercase tracking-wider">
        <span>{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 bg-card/5 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} className="h-full rounded-full" style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}

function SideAction({ icon, label }: any) {
  return (
    <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card/[0.02] border border-white/5 hover:bg-card/[0.05] hover:border-white/10 transition-all group text-left">
      <span className="text-white/40 group-hover:text-indigo-400 transition-colors">{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 group-hover:text-white transition-colors">{label}</span>
    </button>
  );
}

function BulkActionBar({ selectedCount, onCancel }: any) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div initial={{ y: 100, x: '-50%' }} animate={{ y: 0, x: '-50%' }} exit={{ y: 100, x: '-50%' }} className="fixed bottom-10 left-1/2 -translate-x-1/2 h-20 px-10 bg-card backdrop-blur-3xl border border-border rounded-3xl flex items-center gap-10 z-[100] shadow-2xl">
          <div className="flex items-center gap-4 pr-10 border-r border-white/10">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">{selectedCount}</div>
            <span className="text-[12px] font-bold uppercase tracking-wider text-white">Selected Units</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="text-[11px] font-bold uppercase tracking-wider text-white/40 hover:text-white px-4">Cancel</button>
            <button className="h-10 px-6 rounded-xl bg-card text-black text-[11px] font-bold uppercase tracking-wider flex items-center gap-3">
              <RefreshCw className="w-4 h-4" /> Restart Selected
            </button>
            <button className="h-10 px-6 rounded-xl bg-transparent border border-white/20 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-card/5">
              Bulk Actions
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SystemModal({ isOpen, onClose }: any) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200]" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl z-[201] p-6">
             <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="p-10 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"><Cpu className="w-8 h-8 text-indigo-400" /></div>
                    <div>
                      <h4 className="text-3xl font-bold text-white tracking-tight">System Health</h4>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mt-1">Infrastructure Diagnostics</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-3 rounded-full hover:bg-card/5 text-white/20 hover:text-white transition-all"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-10 space-y-10">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 rounded-2xl bg-card/[0.03] border border-white/5">
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-wider mb-2 block">System Latency</span>
                        <p className="text-3xl font-bold text-white tracking-tight">14.2ms</p>
                      </div>
                      <div className="p-6 rounded-2xl bg-card/[0.03] border border-white/5">
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-wider mb-2 block">Memory Usage</span>
                        <p className="text-3xl font-bold text-white tracking-tight">84.1%</p>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-white/30 uppercase tracking-wider">Network Status</span><span className="text-emerald-400 text-[11px] font-bold uppercase">All Green</span></div>
                      <div className="h-1.5 bg-card/5 rounded-full overflow-hidden flex gap-[2px]">
                         <div className="h-full w-[30%] bg-indigo-600" />
                         <div className="h-full w-[25%] bg-indigo-400" />
                         <div className="h-full w-[45%] bg-card/10" />
                      </div>
                   </div>
                   <button className="w-full h-16 rounded-2xl bg-card text-black text-[14px] font-bold uppercase tracking-widest hover:bg-card/90 transition-all flex items-center justify-center gap-4">Refresh All Connections <RefreshCw className="w-5 h-5" /></button>
                </div>
             </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CommandPalette({ isOpen, onClose, agents, searchQuery, setSearchQuery, router }: any) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300]" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -40 }} className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-3xl z-[301] px-4">
              <div className="bg-[#121214]/90 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-6 p-8 border-b border-white/5">
                  <Search className="w-6 h-6 text-indigo-500" />
                  <input 
                    autoFocus 
                    placeholder="Search agents or actions..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-2xl font-bold tracking-tight text-white outline-none placeholder:text-white/10" 
                  />
                </div>
                <div className="max-h-[500px] overflow-y-auto p-4 no-scrollbar">
                  <p className="px-6 py-4 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Active Units</p>
                  <div className="grid grid-cols-1 gap-2">
                    {agents.filter((a: any) => !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8).map((agent: any) => (
                      <button 
                        key={agent.id} 
                        onClick={() => { onClose(); router.push(`/agents/${agent.id}/chat`); }}
                        className="flex items-center gap-6 p-4 rounded-2xl hover:bg-card/5 transition-all text-left border border-transparent group"
                      >
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-card/5 border border-white/10 transition-transform"><agent.icon className="w-6 h-6" style={{ color: agent.color }} /></div>
                        <div className="flex-1">
                          <p className="text-xl font-bold text-white tracking-tight">{agent.name}</p>
                          <p className="text-[11px] font-medium text-white/30 uppercase tracking-widest">{agent.role}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-white transition-all transform group-hover:translate-x-2" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function AgentListItem({ agent, data, index, isSelected, onToggleSelect, onClick }: any) {
  const Icon = agent.icon;
  const status = data?.status || 'idle';
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
      onClick={onToggleSelect}
      className={`group flex items-center gap-8 p-6 rounded-[2rem] border transition-all duration-300 cursor-pointer ${isSelected ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-card/[0.02] border-white/5 hover:bg-card/[0.05] hover:border-white/10'}`}
    >
      <div onClick={onToggleSelect} className="flex-shrink-0">
        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${isSelected ? 'bg-card border-white' : 'border-white/10 bg-card/5'}`}>
          {isSelected && <CheckCircle className="w-4 h-4 text-black" />}
        </div>
      </div>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-card/5 border border-white/10 flex-shrink-0"><Icon className="w-6 h-6" style={{ color: agent.color }} /></div>
      <div className="flex-1 min-w-0">
        <h3 className="text-2xl font-bold text-white tracking-tight truncate leading-none">{agent.name}</h3>
        <p className="text-[12px] text-indigo-400 font-semibold mt-1 truncate uppercase tracking-wider">{agent.specialties[0]}</p>
      </div>
      <div className="hidden 2xl:block px-10 border-x border-white/5">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-wider mb-1">Current Activity</p>
        <p className="text-[13px] text-white/60 font-medium truncate max-w-[200px]">{data?.action}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className={`px-4 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${status === 'running' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-white/10 text-white/30 bg-card/5'}`}>
          {status === 'running' ? 'Active' : 'Standby'}
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="h-11 px-8 rounded-xl bg-card text-black text-[12px] font-bold uppercase tracking-wider flex items-center gap-3 hover:bg-card/90 transition-all active:scale-95"
        >
          <ArrowRight className="w-4 h-4" /> Open Agent
        </button>
      </div>
    </motion.div>
  );
}
