'use client';

/**
 * Enterprise Agent Control Panel
 * A "cockpit view" sidebar for configuring AI agent parameters in real-time
 * High-tech IDE aesthetic with fine borders and high information density
 */

import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings2,
  Cpu,
  Shield,
  Brain,
  ChevronDown,
  ChevronRight,
  Zap,
  Globe,
  Mail,
  Database,
  FileText,
  Trash2,
  RefreshCw,
  Lock,
  Unlock,
  AlertTriangle,
  Check,
  Info,
  Sparkles,
  Gauge,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types - exported for parent component usage
export interface AgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  activeTools: string[];
}

interface Capability {
  id: string;
  name: string;
  icon: typeof Globe;
  enabled: boolean;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface KnowledgeFile {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'txt' | 'csv';
  size: string;
  addedAt: string;
}

interface AgentControlPanelProps {
  agentColor: string;
  agentName: string;
  // Config state from parent
  config: AgentConfig;
  onConfigChange: (config: AgentConfig) => void;
  onClearContext?: () => void;
}

// Available models
const AVAILABLE_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', badge: 'Flagship' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', badge: 'Fast' },
  { id: 'flowent-light', name: 'Flowent-Light', provider: 'Flowent', badge: 'Efficient' },
];

// Default capabilities
const DEFAULT_CAPABILITIES: Capability[] = [
  {
    id: 'web_search',
    name: 'Web Search',
    icon: Globe,
    enabled: true,
    description: 'Search the internet for real-time information',
    riskLevel: 'low',
  },
  {
    id: 'email_access',
    name: 'Email Access',
    icon: Mail,
    enabled: true,
    description: 'Read, send, and manage emails',
    riskLevel: 'medium',
  },
  {
    id: 'database_read',
    name: 'Database Read',
    icon: Database,
    enabled: true,
    description: 'Query and read from connected databases',
    riskLevel: 'medium',
  },
  {
    id: 'database_write',
    name: 'Database Write',
    icon: Database,
    enabled: false,
    description: 'Write and modify database records',
    riskLevel: 'high',
  },
  {
    id: 'file_access',
    name: 'File Access',
    icon: FileText,
    enabled: true,
    description: 'Read and analyze uploaded files',
    riskLevel: 'low',
  },
  {
    id: 'code_execution',
    name: 'Code Execution',
    icon: Zap,
    enabled: false,
    description: 'Execute code in sandbox environment',
    riskLevel: 'high',
  },
];

// Mock knowledge files
const MOCK_KNOWLEDGE_FILES: KnowledgeFile[] = [
  { id: '1', name: 'Q3_Financials.pdf', type: 'pdf', size: '2.4 MB', addedAt: '2 hours ago' },
  { id: '2', name: 'Brand_Guidelines.docx', type: 'doc', size: '1.1 MB', addedAt: '1 day ago' },
  { id: '3', name: 'Product_Catalog.csv', type: 'csv', size: '456 KB', addedAt: '3 days ago' },
];

// Collapsible Section Component
const Section = memo(function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  badge,
  badgeColor,
}: {
  title: string;
  icon: typeof Settings2;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-800/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-card/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">
            {title}
          </span>
          {badge && (
            <span
              className="px-1.5 py-0.5 text-[9px] font-bold rounded"
              style={{ backgroundColor: badgeColor || '#3b82f6', color: 'white' }}
            >
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Toggle Switch Component
const ToggleSwitch = memo(function ToggleSwitch({
  enabled,
  onChange,
  riskLevel,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  riskLevel: 'low' | 'medium' | 'high';
}) {
  const riskColors = {
    low: 'bg-emerald-500',
    medium: 'bg-amber-500',
    high: 'bg-red-500',
  };

  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative w-9 h-5 rounded-full transition-colors duration-200',
        enabled ? riskColors[riskLevel] : 'bg-gray-700'
      )}
    >
      <motion.div
        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-card shadow-sm"
        animate={{ x: enabled ? 16 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
});

// Main Component
export function AgentControlPanel({
  agentColor,
  agentName,
  config,
  onConfigChange,
  onClearContext,
}: AgentControlPanelProps) {
  // Derive capabilities from config.activeTools
  const [capabilities, setCapabilities] = useState<Capability[]>(() =>
    DEFAULT_CAPABILITIES.map(cap => ({
      ...cap,
      enabled: config.activeTools.includes(cap.id),
    }))
  );

  const [knowledgeFiles] = useState<KnowledgeFile[]>(MOCK_KNOWLEDGE_FILES);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Handlers - update parent state directly
  const handleModelChange = useCallback((modelId: string) => {
    onConfigChange({ ...config, model: modelId });
    setShowModelDropdown(false);
  }, [config, onConfigChange]);

  const handleTemperatureChange = useCallback((value: number) => {
    onConfigChange({ ...config, temperature: value });
  }, [config, onConfigChange]);

  const handleMaxTokensChange = useCallback((value: number) => {
    onConfigChange({ ...config, maxTokens: value });
  }, [config, onConfigChange]);

  const handleCapabilityToggle = useCallback((capabilityId: string) => {
    // Update local capabilities state for UI
    setCapabilities(prev =>
      prev.map(cap =>
        cap.id === capabilityId ? { ...cap, enabled: !cap.enabled } : cap
      )
    );

    // Update parent config's activeTools
    const isCurrentlyEnabled = config.activeTools.includes(capabilityId);
    const newActiveTools = isCurrentlyEnabled
      ? config.activeTools.filter(id => id !== capabilityId)
      : [...config.activeTools, capabilityId];

    onConfigChange({ ...config, activeTools: newActiveTools });
  }, [config, onConfigChange]);

  const selectedModel = AVAILABLE_MODELS.find(m => m.id === config.model);
  const enabledCapabilitiesCount = capabilities.filter(c => c.enabled).length;
  const highRiskEnabled = capabilities.some(c => c.enabled && c.riskLevel === 'high');

  return (
    <div className="h-full flex flex-col bg-background border-l border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: agentColor }}
          />
          <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
            Control Panel
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Configure {agentName}'s behavior in real-time
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Model Configuration Section */}
        <Section title="Model Config" icon={Cpu} badge="Live" badgeColor={agentColor}>
          {/* Model Selector */}
          <div className="mb-4">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Active Model
            </label>
            <div className="relative">
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="w-full px-3 py-2 bg-card/50 border border-gray-800 rounded-lg text-left hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: agentColor }}
                    />
                    <span className="text-sm text-gray-200">{selectedModel?.name}</span>
                    <span className="px-1.5 py-0.5 text-[9px] bg-gray-800 text-muted-foreground rounded">
                      {selectedModel?.badge}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </button>

              <AnimatePresence>
                {showModelDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
                  >
                    {AVAILABLE_MODELS.map(model => (
                      <button
                        key={model.id}
                        onClick={() => handleModelChange(model.id)}
                        className={cn(
                          'w-full px-3 py-2.5 text-left hover:bg-card/[0.03] transition-colors flex items-center justify-between',
                          model.id === config.model && 'bg-card/[0.05]'
                        )}
                      >
                        <div>
                          <div className="text-sm text-gray-200">{model.name}</div>
                          <div className="text-[10px] text-muted-foreground">{model.provider}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 text-[9px] bg-gray-800 text-muted-foreground rounded">
                            {model.badge}
                          </span>
                          {model.id === config.model && (
                            <Check className="w-3.5 h-3.5" style={{ color: agentColor }} />
                          )}
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Temperature Slider */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Gauge className="w-3 h-3" />
                Temperature
              </label>
              <span className="text-xs font-mono text-gray-300">
                {config.temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.temperature}
              onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${agentColor} 0%, ${agentColor} ${config.temperature * 100}%, #1f2937 ${config.temperature * 100}%, #1f2937 100%)`,
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-muted-foreground">Precise</span>
              <span className="text-[9px] text-muted-foreground">Creative</span>
            </div>
          </div>

          {/* Max Tokens Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3" />
                Max Tokens
              </label>
              <span className="text-xs font-mono text-gray-300">
                {config.maxTokens.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="256"
              max="8192"
              step="256"
              value={config.maxTokens}
              onChange={(e) => handleMaxTokensChange(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${agentColor} 0%, ${agentColor} ${(config.maxTokens / 8192) * 100}%, #1f2937 ${(config.maxTokens / 8192) * 100}%, #1f2937 100%)`,
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-muted-foreground">256</span>
              <span className="text-[9px] text-muted-foreground">8192</span>
            </div>
          </div>
        </Section>

        {/* Capabilities Section */}
        <Section
          title="Capabilities"
          icon={Shield}
          badge={`${enabledCapabilitiesCount}/${capabilities.length}`}
          badgeColor={highRiskEnabled ? '#ef4444' : '#22c55e'}
        >
          {/* Security Warning */}
          {highRiskEnabled && (
            <div className="mb-3 px-2.5 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-red-400 font-medium">High-risk capabilities enabled</p>
                <p className="text-[9px] text-red-400/70">Review security implications</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {capabilities.map(capability => {
              const CapIcon = capability.icon;
              const riskColors = {
                low: 'text-emerald-400',
                medium: 'text-amber-400',
                high: 'text-red-400',
              };

              return (
                <div
                  key={capability.id}
                  className={cn(
                    'px-2.5 py-2 rounded-lg border transition-colors',
                    capability.enabled
                      ? 'bg-card/[0.02] border-gray-800'
                      : 'bg-transparent border-gray-800/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CapIcon
                        className={cn(
                          'w-3.5 h-3.5',
                          capability.enabled ? riskColors[capability.riskLevel] : 'text-muted-foreground'
                        )}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'text-xs font-medium',
                              capability.enabled ? 'text-gray-200' : 'text-muted-foreground'
                            )}
                          >
                            {capability.name}
                          </span>
                          {capability.enabled ? (
                            <Unlock className="w-2.5 h-2.5 text-muted-foreground" />
                          ) : (
                            <Lock className="w-2.5 h-2.5 text-foreground" />
                          )}
                        </div>
                        <p className="text-[9px] text-muted-foreground">{capability.description}</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      enabled={capability.enabled}
                      onChange={() => handleCapabilityToggle(capability.id)}
                      riskLevel={capability.riskLevel}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Security Legend */}
          <div className="mt-3 pt-3 border-t border-gray-800/50">
            <p className="text-[9px] text-muted-foreground mb-2">Security Levels:</p>
            <div className="flex gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] text-muted-foreground">Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[9px] text-muted-foreground">Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[9px] text-muted-foreground">High</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Context & Memory Section */}
        <Section
          title="Context & Memory"
          icon={Brain}
          badge={`${knowledgeFiles.length} files`}
          badgeColor="#8b5cf6"
        >
          <div className="mb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              Active Knowledge Files (RAG)
            </p>
            <div className="space-y-1.5">
              {knowledgeFiles.map(file => {
                const typeColors: Record<string, string> = {
                  pdf: '#ef4444',
                  doc: '#3b82f6',
                  txt: '#6b7280',
                  csv: '#22c55e',
                };

                return (
                  <div
                    key={file.id}
                    className="px-2.5 py-2 bg-card/30 border border-gray-800/50 rounded-lg flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold uppercase"
                        style={{ backgroundColor: `${typeColors[file.type]}15`, color: typeColors[file.type] }}
                      >
                        {file.type}
                      </div>
                      <div>
                        <p className="text-xs text-gray-300 truncate max-w-[140px]">{file.name}</p>
                        <p className="text-[9px] text-muted-foreground">{file.size} • {file.addedAt}</p>
                      </div>
                    </div>
                    <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded transition-all">
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clear Context Button */}
          <button
            onClick={onClearContext}
            className="w-full px-3 py-2 bg-card/50 hover:bg-gray-800/50 border border-gray-800 rounded-lg text-xs text-muted-foreground hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3 h-3" />
            Clear Context
          </button>

          {/* Memory Stats */}
          <div className="mt-3 pt-3 border-t border-gray-800/50">
            <div className="grid grid-cols-2 gap-2">
              <div className="px-2 py-1.5 bg-card/30 rounded">
                <p className="text-[9px] text-muted-foreground">Context Window</p>
                <p className="text-xs font-mono text-gray-300">128K tokens</p>
              </div>
              <div className="px-2 py-1.5 bg-card/30 rounded">
                <p className="text-[9px] text-muted-foreground">Used</p>
                <p className="text-xs font-mono" style={{ color: agentColor }}>12.4K (9.7%)</p>
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" style={{ color: agentColor }} />
            <span className="text-[10px] text-muted-foreground">Enterprise Mode</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400">Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentControlPanel;
