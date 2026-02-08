'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  X,
  Settings,
  Zap,
  Clock,
  Globe,
  Mail,
  Database,
  Code2,
  Bot,
  MessageSquare,
  Sparkles,
  GitBranch,
  Filter,
  Send,
  ChevronDown,
  ChevronRight,
  Box,
  Copy,
  Check,
  Link2,
  Play,
  Terminal,
  Coins,
  Gauge,
  AlertCircle,
  CheckCircle2,
  Brain,
  Search,
  BookOpen,
  History,
  FileText,
  Tag,
  Activity,
  Timer,
  DollarSign,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { usePipelineStore, useSelectedNode, PipelineNodeData, PipelineNode, PipelineEdge, NodeExecutionOutput } from '../store/usePipelineStore';
import { NodeSettingsPanel } from '../../studio/panels/NodeSettingsPanel';
import { NodeSettings } from '@/types/workflow';

// ============================================
// AVAILABLE AGENTS
// ============================================

interface AvailableAgent {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

const AVAILABLE_AGENTS: AvailableAgent[] = [
  { id: 'dexter', name: 'Dexter', description: 'Data Analysis Agent', icon: Bot },
  { id: 'emmie', name: 'Emmie', description: 'Email Assistant Agent', icon: MessageSquare },
  { id: 'cassie', name: 'Cassie', description: 'Customer Support Agent', icon: Sparkles },
  { id: 'kai', name: 'Kai', description: 'Code Assistant Agent', icon: Code2 },
  { id: 'finn', name: 'Finn', description: 'Finance Agent', icon: Bot },
  { id: 'lex', name: 'Lex', description: 'Legal Advisor Agent', icon: Bot },
];

// ============================================
// ICON MAP
// ============================================

const iconMap: Record<string, LucideIcon> = {
  Zap,
  Clock,
  Globe,
  Mail,
  MessageSquare,
  GitBranch,
  Filter,
  Database,
  Code2,
  Send,
  Bot,
  Sparkles,
  Box,
};

// ============================================
// FORM COMPONENTS
// ============================================

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'textarea' | 'url';
  hint?: string;
}

function InputField({ label, value, onChange, placeholder, type = 'text', hint }: InputFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/60">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg bg-card/5 border border-white/10
            text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50
            focus:ring-1 focus:ring-violet-500/50 transition-all resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm rounded-lg bg-card/5 border border-white/10
            text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50
            focus:ring-1 focus:ring-violet-500/50 transition-all"
        />
      )}
      {hint && <p className="text-xs text-white/30">{hint}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}

function SelectField({ label, value, onChange, options, hint }: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/60">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg bg-card/5 border border-white/10
          text-white focus:outline-none focus:border-violet-500/50
          focus:ring-1 focus:ring-violet-500/50 transition-all"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#1A1A1F]">
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-xs text-white/30">{hint}</p>}
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-card/5 hover:bg-card/10 transition-colors"
      >
        <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">{title}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white/40" />
        )}
      </button>
      {isOpen && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

// ============================================
// TRIGGER CONFIG FORM
// ============================================

interface TriggerConfigFormProps {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
  nodeId: string;
}

function TriggerConfigForm({ config, onUpdate, nodeId }: TriggerConfigFormProps) {
  const isSchedule = nodeId.includes('schedule');

  if (isSchedule) {
    return (
      <CollapsibleSection title="Schedule Settings">
        <SelectField
          label="Interval"
          value={(config.interval as string) || 'hourly'}
          onChange={(v) => onUpdate({ ...config, interval: v })}
          options={[
            { value: 'minute', label: 'Every Minute' },
            { value: 'hourly', label: 'Every Hour' },
            { value: 'daily', label: 'Every Day' },
            { value: 'weekly', label: 'Every Week' },
            { value: 'custom', label: 'Custom Cron' },
          ]}
        />
        {config.interval === 'custom' && (
          <InputField
            label="Cron Expression"
            value={(config.cron as string) || ''}
            onChange={(v) => onUpdate({ ...config, cron: v })}
            placeholder="0 * * * *"
            hint="Standard cron format"
          />
        )}
      </CollapsibleSection>
    );
  }

  // Webhook trigger
  return (
    <CollapsibleSection title="Webhook Settings">
      <SelectField
        label="HTTP Method"
        value={(config.method as string) || 'POST'}
        onChange={(v) => onUpdate({ ...config, method: v })}
        options={[
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' },
        ]}
      />
      <InputField
        label="Path"
        value={(config.path as string) || '/webhook'}
        onChange={(v) => onUpdate({ ...config, path: v })}
        placeholder="/webhook/my-endpoint"
        hint="Webhook URL path"
      />
    </CollapsibleSection>
  );
}

// ============================================
// ACTION CONFIG FORM
// ============================================

interface ActionConfigFormProps {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
  nodeId: string;
}

function ActionConfigForm({ config, onUpdate, nodeId }: ActionConfigFormProps) {
  // HTTP Request
  if (nodeId.includes('http')) {
    return (
      <>
        <CollapsibleSection title="Request Settings">
          <SelectField
            label="Method"
            value={(config.method as string) || 'GET'}
            onChange={(v) => onUpdate({ ...config, method: v })}
            options={[
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
              { value: 'PUT', label: 'PUT' },
              { value: 'PATCH', label: 'PATCH' },
              { value: 'DELETE', label: 'DELETE' },
            ]}
          />
          <InputField
            label="URL"
            value={(config.url as string) || ''}
            onChange={(v) => onUpdate({ ...config, url: v })}
            placeholder="https://api.example.com/endpoint"
            type="url"
          />
        </CollapsibleSection>
        <CollapsibleSection title="Headers" defaultOpen={false}>
          <InputField
            label="Headers (JSON)"
            value={(config.headers as string) || '{}'}
            onChange={(v) => onUpdate({ ...config, headers: v })}
            type="textarea"
            placeholder='{"Authorization": "Bearer token"}'
          />
        </CollapsibleSection>
        <CollapsibleSection title="Body" defaultOpen={false}>
          <InputField
            label="Request Body (JSON)"
            value={(config.body as string) || ''}
            onChange={(v) => onUpdate({ ...config, body: v })}
            type="textarea"
            placeholder='{"key": "value"}'
          />
        </CollapsibleSection>
      </>
    );
  }

  // Email
  if (nodeId.includes('email')) {
    return (
      <CollapsibleSection title="Email Settings">
        <InputField
          label="To"
          value={(config.to as string) || ''}
          onChange={(v) => onUpdate({ ...config, to: v })}
          placeholder="recipient@example.com"
        />
        <InputField
          label="Subject"
          value={(config.subject as string) || ''}
          onChange={(v) => onUpdate({ ...config, subject: v })}
          placeholder="Email subject"
        />
        <InputField
          label="Body"
          value={(config.body as string) || ''}
          onChange={(v) => onUpdate({ ...config, body: v })}
          type="textarea"
          placeholder="Email content..."
        />
      </CollapsibleSection>
    );
  }

  // Database
  if (nodeId.includes('database')) {
    return (
      <CollapsibleSection title="Database Settings">
        <SelectField
          label="Operation"
          value={(config.operation as string) || 'select'}
          onChange={(v) => onUpdate({ ...config, operation: v })}
          options={[
            { value: 'select', label: 'SELECT' },
            { value: 'insert', label: 'INSERT' },
            { value: 'update', label: 'UPDATE' },
            { value: 'delete', label: 'DELETE' },
          ]}
        />
        <InputField
          label="Query"
          value={(config.query as string) || ''}
          onChange={(v) => onUpdate({ ...config, query: v })}
          type="textarea"
          placeholder="SELECT * FROM users WHERE id = $1"
        />
      </CollapsibleSection>
    );
  }

  // Code
  if (nodeId.includes('code')) {
    return (
      <CollapsibleSection title="Code Settings">
        <SelectField
          label="Language"
          value={(config.language as string) || 'javascript'}
          onChange={(v) => onUpdate({ ...config, language: v })}
          options={[
            { value: 'javascript', label: 'JavaScript' },
            { value: 'python', label: 'Python' },
            { value: 'typescript', label: 'TypeScript' },
          ]}
        />
        <InputField
          label="Code"
          value={(config.code as string) || ''}
          onChange={(v) => onUpdate({ ...config, code: v })}
          type="textarea"
          placeholder="// Your code here..."
        />
      </CollapsibleSection>
    );
  }

  // Default
  return (
    <CollapsibleSection title="Settings">
      <p className="text-xs text-white/50">No specific settings for this action.</p>
    </CollapsibleSection>
  );
}

// ============================================
// AGENT CONFIG FORM
// ============================================

interface AgentConfigFormProps {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
  nodeId: string;
}

function AgentConfigForm({ config, onUpdate, nodeId }: AgentConfigFormProps) {
  // Extract current agent from nodeId
  const currentAgent = nodeId.split('-')[0];
  const selectedAgent = AVAILABLE_AGENTS.find(a => a.id === (config.agentId || currentAgent)) || AVAILABLE_AGENTS[0];

  return (
    <>
      <CollapsibleSection title="Agent Selection">
        <SelectField
          label="AI Agent"
          value={(config.agentId as string) || currentAgent}
          onChange={(v) => {
            const agent = AVAILABLE_AGENTS.find(a => a.id === v);
            onUpdate({
              ...config,
              agentId: v,
              agentName: agent?.name || v,
            });
          }}
          options={AVAILABLE_AGENTS.map((a) => ({
            value: a.id,
            label: `${a.name} - ${a.description}`,
          }))}
        />
        <div className="flex items-center gap-2 p-2 rounded-lg bg-card/5">
          {selectedAgent && (
            <>
              <selectedAgent.icon className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-white">{selectedAgent.name}</p>
                <p className="text-xs text-white/50">{selectedAgent.description}</p>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Prompt Configuration">
        <InputField
          label="System Prompt Override"
          value={(config.systemPrompt as string) || ''}
          onChange={(v) => onUpdate({ ...config, systemPrompt: v })}
          type="textarea"
          placeholder="Optional: Override the default agent prompt..."
          hint="Leave empty to use default agent behavior"
        />
        <InputField
          label="User Message Template"
          value={(config.userPrompt as string) || '{{input}}'}
          onChange={(v) => onUpdate({ ...config, userPrompt: v })}
          type="textarea"
          placeholder="{{input}}"
          hint="Use {{input}} to insert the incoming data"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Advanced" defaultOpen={false}>
        <SelectField
          label="Model"
          value={(config.model as string) || 'gpt-4-turbo-preview'}
          onChange={(v) => onUpdate({ ...config, model: v })}
          options={[
            { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
            { value: 'gpt-4', label: 'GPT-4' },
            { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
            { value: 'gpt-4o', label: 'GPT-4o' },
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
            { value: 'gemini-flash', label: 'Gemini Flash (Speed)' },
            { value: 'gemini-pro', label: 'Gemini Pro' },
          ]}
        />
        <InputField
          label="Temperature"
          value={(config.temperature as string) || '0.7'}
          onChange={(v) => onUpdate({ ...config, temperature: v })}
          placeholder="0.7"
          hint="0 = deterministic, 1 = creative"
        />
      </CollapsibleSection>
    </>
  );
}

// ============================================
// RAG CONFIGURATION FORM (Phase 11)
// ============================================

interface RAGConfig {
  ragEnabled: boolean;
  ragThreshold: number;
  knowledgeTags: string[];
  includePreviousMemories: boolean;
  maxContextChunks: number;
  includeCitations: boolean;
  retrievalStrategy: 'hybrid' | 'semantic' | 'keyword';
}

interface RAGConfigFormProps {
  ragConfig: Partial<RAGConfig>;
  onUpdate: (config: Partial<RAGConfig>) => void;
}

function RAGConfigForm({ ragConfig, onUpdate }: RAGConfigFormProps) {
  const config: RAGConfig = {
    ragEnabled: ragConfig.ragEnabled ?? false,
    ragThreshold: ragConfig.ragThreshold ?? 0.7,
    knowledgeTags: ragConfig.knowledgeTags ?? [],
    includePreviousMemories: ragConfig.includePreviousMemories ?? false,
    maxContextChunks: ragConfig.maxContextChunks ?? 5,
    includeCitations: ragConfig.includeCitations ?? true,
    retrievalStrategy: ragConfig.retrievalStrategy ?? 'hybrid',
  };

  const [tagInput, setTagInput] = useState('');

  const handleAddTag = useCallback(() => {
    if (tagInput.trim() && !config.knowledgeTags.includes(tagInput.trim())) {
      onUpdate({
        ...config,
        knowledgeTags: [...config.knowledgeTags, tagInput.trim()],
      });
      setTagInput('');
    }
  }, [tagInput, config, onUpdate]);

  const handleRemoveTag = useCallback((tag: string) => {
    onUpdate({
      ...config,
      knowledgeTags: config.knowledgeTags.filter(t => t !== tag),
    });
  }, [config, onUpdate]);

  return (
    <CollapsibleSection title="Brain AI / RAG Settings" defaultOpen={false}>
      {/* Enable RAG Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <div>
            <p className="text-sm font-medium text-white">Enable RAG Context</p>
            <p className="text-[10px] text-white/50">Use knowledge base for context</p>
          </div>
        </div>
        <button
          onClick={() => onUpdate({ ...config, ragEnabled: !config.ragEnabled })}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            config.ragEnabled ? 'bg-purple-500' : 'bg-card/20'
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${
              config.ragEnabled ? 'left-5' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {config.ragEnabled && (
        <>
          {/* Retrieval Strategy */}
          <div className="space-y-1.5 mt-3">
            <label className="text-xs font-medium text-white/60 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Retrieval Strategy
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['hybrid', 'semantic', 'keyword'] as const).map((strategy) => (
                <button
                  key={strategy}
                  onClick={() => onUpdate({ ...config, retrievalStrategy: strategy })}
                  className={`px-2 py-1.5 text-[10px] font-medium rounded-lg transition-colors ${
                    config.retrievalStrategy === strategy
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-card/5 text-white/50 border border-white/10 hover:bg-card/10'
                  }`}
                >
                  {strategy.charAt(0).toUpperCase() + strategy.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/30">
              Hybrid combines semantic + keyword search for best results
            </p>
          </div>

          {/* Relevance Threshold */}
          <div className="space-y-1.5 mt-3">
            <label className="text-xs font-medium text-white/60 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              Relevance Threshold: {Math.round(config.ragThreshold * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.ragThreshold * 100}
              onChange={(e) => onUpdate({ ...config, ragThreshold: parseInt(e.target.value) / 100 })}
              className="w-full h-2 rounded-lg appearance-none bg-card/10 accent-purple-500"
            />
            <p className="text-[10px] text-white/30">
              Higher = stricter matching, Lower = more results
            </p>
          </div>

          {/* Max Context Chunks */}
          <div className="space-y-1.5 mt-3">
            <label className="text-xs font-medium text-white/60 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Max Context Chunks
            </label>
            <select
              value={config.maxContextChunks}
              onChange={(e) => onUpdate({ ...config, maxContextChunks: parseInt(e.target.value) })}
              className="w-full px-3 py-2 text-sm rounded-lg bg-card/5 border border-white/10
                text-white focus:outline-none focus:border-purple-500/50 transition-all"
            >
              {[3, 5, 7, 10, 15].map((n) => (
                <option key={n} value={n} className="bg-[#1A1A1F]">
                  {n} chunks
                </option>
              ))}
            </select>
          </div>

          {/* Knowledge Tags */}
          <div className="space-y-1.5 mt-3">
            <label className="text-xs font-medium text-white/60 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Knowledge Tags (Filter)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-card/5 border border-white/10
                  text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-2 text-sm font-medium rounded-lg bg-purple-500/20 text-purple-400
                  hover:bg-purple-500/30 transition-colors"
              >
                Add
              </button>
            </div>
            {config.knowledgeTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {config.knowledgeTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full
                      bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-[10px] text-white/30">
              Only retrieve documents with these tags
            </p>
          </div>

          {/* Include Previous Memories */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/5 border border-white/10 mt-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-xs font-medium text-white">Include Memories</p>
                <p className="text-[10px] text-white/40">Use previous session context</p>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ ...config, includePreviousMemories: !config.includePreviousMemories })}
              className={`relative w-9 h-4 rounded-full transition-colors ${
                config.includePreviousMemories ? 'bg-blue-500' : 'bg-card/20'
              }`}
            >
              <span
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-card shadow transition-transform ${
                  config.includePreviousMemories ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Include Citations */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/5 border border-white/10 mt-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-xs font-medium text-white">Include Citations</p>
                <p className="text-[10px] text-white/40">Reference sources in output</p>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ ...config, includeCitations: !config.includeCitations })}
              className={`relative w-9 h-4 rounded-full transition-colors ${
                config.includeCitations ? 'bg-green-500' : 'bg-card/20'
              }`}
            >
              <span
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-card shadow transition-transform ${
                  config.includeCitations ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </>
      )}
    </CollapsibleSection>
  );
}

// ============================================
// CONDITION CONFIG FORM
// ============================================

interface ConditionConfigFormProps {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
  nodeId: string;
}

function ConditionConfigForm({ config, onUpdate, nodeId }: ConditionConfigFormProps) {
  // If/Else
  if (nodeId.includes('condition')) {
    return (
      <CollapsibleSection title="Condition Settings">
        <InputField
          label="Field"
          value={(config.field as string) || ''}
          onChange={(v) => onUpdate({ ...config, field: v })}
          placeholder="data.status"
          hint="The field to check"
        />
        <SelectField
          label="Operator"
          value={(config.operator as string) || 'equals'}
          onChange={(v) => onUpdate({ ...config, operator: v })}
          options={[
            { value: 'equals', label: 'Equals (==)' },
            { value: 'notEquals', label: 'Not Equals (!=)' },
            { value: 'contains', label: 'Contains' },
            { value: 'greaterThan', label: 'Greater Than (>)' },
            { value: 'lessThan', label: 'Less Than (<)' },
            { value: 'exists', label: 'Exists' },
            { value: 'isEmpty', label: 'Is Empty' },
          ]}
        />
        <InputField
          label="Value"
          value={(config.value as string) || ''}
          onChange={(v) => onUpdate({ ...config, value: v })}
          placeholder="success"
        />
      </CollapsibleSection>
    );
  }

  // Filter
  return (
    <CollapsibleSection title="Filter Settings">
      <InputField
        label="Filter Expression"
        value={(config.expression as string) || ''}
        onChange={(v) => onUpdate({ ...config, expression: v })}
        type="textarea"
        placeholder="item.status === 'active'"
        hint="JavaScript expression that returns true/false"
      />
    </CollapsibleSection>
  );
}

// ============================================
// OUTPUT CONFIG FORM
// ============================================

interface OutputConfigFormProps {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
}

function OutputConfigForm({ config, onUpdate }: OutputConfigFormProps) {
  return (
    <CollapsibleSection title="Response Settings">
      <SelectField
        label="Response Type"
        value={(config.responseType as string) || 'json'}
        onChange={(v) => onUpdate({ ...config, responseType: v })}
        options={[
          { value: 'json', label: 'JSON' },
          { value: 'text', label: 'Plain Text' },
          { value: 'html', label: 'HTML' },
        ]}
      />
      <InputField
        label="Response Template"
        value={(config.template as string) || '{{result}}'}
        onChange={(v) => onUpdate({ ...config, template: v })}
        type="textarea"
        placeholder='{"success": true, "data": {{result}}}'
        hint="Use {{result}} to insert the pipeline result"
      />
    </CollapsibleSection>
  );
}

// ============================================
// DATA REFERENCE SECTION
// ============================================

interface DataReferenceSectionProps {
  nodeId: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

function DataReferenceSection({ nodeId, nodes, edges }: DataReferenceSectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Find all predecessor nodes (nodes that can be referenced)
  const predecessorNodes = useMemo(() => {
    // Build a set of all node IDs that come before this node
    const predecessors = new Set<string>();
    const visited = new Set<string>();

    // Traverse backwards from this node
    const queue = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Find all edges pointing to this node
      const incomingEdges = edges.filter((e) => e.target === currentId);
      for (const edge of incomingEdges) {
        if (!visited.has(edge.source)) {
          predecessors.add(edge.source);
          queue.push(edge.source);
        }
      }
    }

    // Return node info for predecessors
    return nodes.filter((n) => predecessors.has(n.id));
  }, [nodeId, nodes, edges]);

  const handleCopy = useCallback((id: string, template?: string) => {
    const textToCopy = template || `{{${id}}}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <CollapsibleSection title="Data References" defaultOpen={true}>
      {/* This Node's ID */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-white/60">This Node's ID</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 text-xs font-mono bg-card/5 border border-white/10 rounded-lg text-violet-400 truncate">
            {nodeId}
          </code>
          <button
            onClick={() => handleCopy(nodeId, nodeId)}
            className="p-2 rounded-lg hover:bg-card/10 transition-colors"
            title="Copy Node ID"
          >
            {copiedId === nodeId ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-white/60" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-white/40">
          Other nodes can reference this node's output using:{' '}
          <code className="text-violet-300">{`{{${nodeId}}}`}</code>
        </p>
      </div>

      {/* Available Previous Nodes */}
      {predecessorNodes.length > 0 && (
        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium text-white/60 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" />
            Available Data Sources
          </label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {predecessorNodes.map((node) => (
              <div
                key={node.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-card/5 border border-white/10 hover:border-violet-500/30 transition-colors group"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: node.data.color || '#6366F1' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{node.data.label}</p>
                  <code className="text-[10px] font-mono text-white/40 truncate block">
                    {`{{${node.id}}}`}
                  </code>
                </div>
                <button
                  onClick={() => handleCopy(node.id)}
                  className="p-1.5 rounded hover:bg-card/10 transition-colors opacity-0 group-hover:opacity-100"
                  title={`Copy {{${node.id}}}`}
                >
                  {copiedId === node.id ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-white/60" />
                  )}
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/40">
            Click to copy. Use paths like{' '}
            <code className="text-violet-300">{`{{nodeId.data.field}}`}</code>
          </p>
        </div>
      )}

      {/* Special References */}
      <div className="mt-4 space-y-2">
        <label className="text-xs font-medium text-white/60">Special References</label>
        <div className="space-y-1.5">
          <div
            className="flex items-center gap-2 p-2 rounded-lg bg-card/5 border border-white/10 hover:border-green-500/30 transition-colors group cursor-pointer"
            onClick={() => handleCopy('trigger', '{{trigger}}')}
          >
            <Zap className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white">Trigger Data</p>
              <code className="text-[10px] font-mono text-white/40">{`{{trigger}}`}</code>
            </div>
            {copiedId === 'trigger' ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-white/60 opacity-0 group-hover:opacity-100" />
            )}
          </div>
          <div
            className="flex items-center gap-2 p-2 rounded-lg bg-card/5 border border-white/10 hover:border-amber-500/30 transition-colors group cursor-pointer"
            onClick={() => handleCopy('variables', '{{variables}}')}
          >
            <Database className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white">Workflow Variables</p>
              <code className="text-[10px] font-mono text-white/40">{`{{variables}}`}</code>
            </div>
            {copiedId === 'variables' ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-white/60 opacity-0 group-hover:opacity-100" />
            )}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}

// ============================================
// TAB COMPONENT
// ============================================

type TabId = 'config' | 'output' | 'metrics';

interface TabButtonProps {
  id: TabId;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  hasData?: boolean;
}

function TabButton({ id, label, icon: Icon, active, onClick, hasData }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium
        transition-all duration-200 relative
        ${active
          ? 'text-white bg-card/10 border-b-2 border-violet-500'
          : 'text-white/50 hover:text-white/80 hover:bg-card/5 border-b-2 border-transparent'
        }
      `}
    >
      <Icon className="w-4 h-4" />
      {label}
      {hasData && !active && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      )}
    </button>
  );
}

// ============================================
// JSON TREE VIEWER COMPONENT
// ============================================

interface JsonTreeViewerProps {
  data: unknown;
  name?: string;
  defaultExpanded?: boolean;
}

function JsonTreeViewer({ data, name, defaultExpanded = true }: JsonTreeViewerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (data === null || data === undefined) {
    return <span className="text-white/40 italic">null</span>;
  }

  if (typeof data !== 'object') {
    if (typeof data === 'string') {
      return <span className="text-green-400">&quot;{data}&quot;</span>;
    }
    if (typeof data === 'number') {
      return <span className="text-blue-400">{data}</span>;
    }
    if (typeof data === 'boolean') {
      return <span className="text-purple-400">{data.toString()}</span>;
    }
    return <span className="text-white/60">{String(data)}</span>;
  }

  const isArray = Array.isArray(data);
  const entries = isArray ? data.map((v, i) => [i, v] as const) : Object.entries(data);
  const isEmpty = entries.length === 0;

  return (
    <div className="font-mono text-xs">
      <div className="flex items-center gap-1">
        {!isEmpty && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-card/10 rounded transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3 text-white/50" />
            ) : (
              <ChevronRight className="w-3 h-3 text-white/50" />
            )}
          </button>
        )}
        {name && <span className="text-violet-400">{name}</span>}
        {name && <span className="text-white/30">: </span>}
        <span className="text-white/50">{isArray ? '[' : '{'}</span>
        {!expanded && !isEmpty && <span className="text-white/30">...</span>}
        {isEmpty && <span className="text-white/50">{isArray ? ']' : '}'}</span>}
        {name && (
          <button
            onClick={handleCopy}
            className="ml-2 p-1 hover:bg-card/10 rounded text-white/30 hover:text-white/60 transition-colors"
            title="Copy JSON"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {expanded && !isEmpty && (
        <div className="ml-4 border-l border-white/10 pl-2">
          {entries.map(([key, value], index) => (
            <div key={key} className="py-0.5">
              <span className="text-cyan-400">{isArray ? '' : `"${key}"`}</span>
              {!isArray && <span className="text-white/30">: </span>}
              <JsonTreeViewer data={value} defaultExpanded={false} />
              {index < entries.length - 1 && <span className="text-white/30">,</span>}
            </div>
          ))}
        </div>
      )}

      {expanded && !isEmpty && (
        <span className="text-white/50">{isArray ? ']' : '}'}</span>
      )}
    </div>
  );
}

// ============================================
// METRICS VIEW COMPONENT
// ============================================

interface MetricsViewProps {
  nodeId: string;
  nodeType: string;
  output: NodeExecutionOutput | null;
  nodeStatus: string | null;
}

function MetricsView({ nodeId, nodeType, output, nodeStatus }: MetricsViewProps) {
  // No execution data yet
  if (!output && !nodeStatus) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-card/5 flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-white/20" />
        </div>
        <h3 className="text-sm font-medium text-white/60 mb-1">No Metrics Yet</h3>
        <p className="text-xs text-white/40 max-w-[200px]">
          Run the pipeline to see execution metrics for this node.
        </p>
      </div>
    );
  }

  // Node is currently running
  if (nodeStatus === 'running' && !output) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mb-4 animate-pulse">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <h3 className="text-sm font-medium text-violet-400 mb-1">Collecting Metrics...</h3>
        <p className="text-xs text-white/40">
          Waiting for node execution to complete.
        </p>
      </div>
    );
  }

  const data = output?.data || {};
  const hasError = !!output?.error;

  // Phase 19: Get metrics from either nested data or flat output structure
  const tokensUsed = output?.tokensUsed || data.tokensUsed;
  const cost = output?.cost ?? data.cost;
  const model = output?.model || data.model;
  const duration = output?.duration || data.processingTime || 0;

  return (
    <div className="space-y-4 p-4">
      {/* Execution Status */}
      <div className={`flex items-center gap-2 p-3 rounded-lg ${
        hasError
          ? 'bg-red-500/10 border border-red-500/20'
          : 'bg-green-500/10 border border-green-500/20'
      }`}>
        {hasError ? (
          <>
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">Execution Failed</p>
              <p className="text-xs text-red-300/60">{output?.error}</p>
            </div>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <p className="text-sm font-medium text-green-400">Execution Successful</p>
          </>
        )}
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Execution Duration */}
        <div className="p-3 rounded-lg bg-card/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium text-white/60">Duration</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {duration}
            <span className="text-sm font-normal text-white/40 ml-1">ms</span>
          </p>
        </div>

        {/* Status */}
        <div className="p-3 rounded-lg bg-card/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium text-white/60">Status</span>
          </div>
          <p className={`text-lg font-bold capitalize ${
            hasError ? 'text-red-400' : 'text-green-400'
          }`}>
            {hasError ? 'Error' : 'Success'}
          </p>
        </div>
      </div>

      {/* Token Metrics (for Agent nodes) */}
      {nodeType === 'agent' && tokensUsed && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
            <Coins className="w-3.5 h-3.5" />
            Token Usage
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {/* Total Tokens */}
            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-[10px] font-medium text-blue-400 uppercase mb-1">Total</p>
              <p className="text-lg font-bold text-white">{tokensUsed.total || 0}</p>
            </div>
            {/* Prompt Tokens */}
            <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-[10px] font-medium text-purple-400 uppercase mb-1">Prompt</p>
              <p className="text-lg font-bold text-white">{tokensUsed.prompt || 0}</p>
            </div>
            {/* Completion Tokens */}
            <div className="p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <p className="text-[10px] font-medium text-violet-400 uppercase mb-1">Completion</p>
              <p className="text-lg font-bold text-white">{tokensUsed.completion || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Cost Metrics (for Agent nodes) */}
      {nodeType === 'agent' && (cost !== undefined || tokensUsed) && (
        <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium text-white/80">Estimated Cost</span>
            </div>
            <p className="text-xl font-bold text-green-400">
              ${(cost || 0).toFixed(5)}
            </p>
          </div>
          {model && (
            <p className="text-xs text-white/40 mt-1">
              Model: {model}
            </p>
          )}
        </div>
      )}

      {/* Model & Confidence */}
      {nodeType === 'agent' && (
        <div className="grid grid-cols-2 gap-3">
          {model && (
            <div className="p-3 rounded-lg bg-card/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-medium text-white/60">Model</span>
              </div>
              <p className="text-sm font-medium text-white truncate">{model}</p>
            </div>
          )}
          {data.confidence !== undefined && (
            <div className="p-3 rounded-lg bg-card/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-white/60">Confidence</span>
              </div>
              <p className="text-sm font-medium text-amber-400">
                {Math.round((data.confidence || 0) * 100)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* RAG Metrics */}
      {data.ragContext?.enabled && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            RAG Context Metrics
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-[10px] font-medium text-purple-400 uppercase mb-1">Sources Used</p>
              <p className="text-lg font-bold text-white">{data.ragContext.sourcesUsed || 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-[10px] font-medium text-purple-400 uppercase mb-1">RAG Score</p>
              <p className="text-lg font-bold text-white">
                {Math.round((data.ragContext.confidenceScore || 0) * 100)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timestamp */}
      {(data.timestamp || output?.timestamp) && (
        <div className="flex items-center justify-between text-xs text-white/30 px-1 pt-2 border-t border-white/5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Executed at
          </span>
          <span>{new Date(data.timestamp || output?.timestamp).toLocaleString()}</span>
        </div>
      )}

      {/* Trace ID */}
      {data.traceId && (
        <div className="flex items-center justify-between text-[10px] text-white/20 px-1">
          <span>Trace ID</span>
          <code className="font-mono text-white/40">{data.traceId}</code>
        </div>
      )}
    </div>
  );
}

// ============================================
// OUTPUT VIEW COMPONENT
// ============================================

interface OutputViewProps {
  nodeId: string;
  nodeType: string;
  output: NodeExecutionOutput | null;
  nodeStatus: string | null;
}

function OutputView({ nodeId, nodeType, output, nodeStatus }: OutputViewProps) {
  const [copiedJson, setCopiedJson] = useState(false);

  const handleCopyJson = useCallback(() => {
    if (output?.data) {
      navigator.clipboard.writeText(JSON.stringify(output.data, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  }, [output]);

  // No execution data yet
  if (!output && !nodeStatus) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-card/5 flex items-center justify-center mb-4">
          <Play className="w-8 h-8 text-white/20" />
        </div>
        <h3 className="text-sm font-medium text-white/60 mb-1">No Execution Data</h3>
        <p className="text-xs text-white/40 max-w-[200px]">
          Run the pipeline to see the output from this node.
        </p>
      </div>
    );
  }

  // Node is currently running
  if (nodeStatus === 'running' && !output) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mb-4 animate-pulse">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <h3 className="text-sm font-medium text-violet-400 mb-1">Executing...</h3>
        <p className="text-xs text-white/40">
          Waiting for node to complete.
        </p>
      </div>
    );
  }

  // Node has error
  if (output?.error) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-red-400 mb-1">Execution Failed</h4>
            <p className="text-xs text-red-300/80">{output.error}</p>
          </div>
        </div>
        {output.duration && (
          <div className="text-xs text-white/40">
            Duration: {output.duration}ms
          </div>
        )}
      </div>
    );
  }

  // Check if this is an Agent node with special output
  const isAgentOutput = nodeType === 'agent' && output?.data?.response;

  if (isAgentOutput) {
    return <AgentOutputView output={output} onCopyJson={handleCopyJson} copiedJson={copiedJson} />;
  }

  // Generic output view
  return <GenericOutputView output={output} onCopyJson={handleCopyJson} copiedJson={copiedJson} />;
}

// ============================================
// AGENT OUTPUT VIEW
// ============================================

interface AgentOutputViewProps {
  output: NodeExecutionOutput;
  onCopyJson: () => void;
  copiedJson: boolean;
}

function AgentOutputView({ output, onCopyJson, copiedJson }: AgentOutputViewProps) {
  const data = output.data;

  return (
    <div className="space-y-4 p-4">
      {/* Success Badge */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-green-400" />
        <span className="text-xs font-medium text-green-400">Execution Successful</span>
        {data.usedFallback && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
            Fallback
          </span>
        )}
      </div>

      {/* Agent Info */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <Bot className="w-5 h-5 text-purple-400" />
        <div>
          <p className="text-sm font-medium text-white">{data.agentName || data.agentId}</p>
          <p className="text-[10px] text-white/40">Model: {data.model}</p>
        </div>
      </div>

      {/* AI Response */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-white/60 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          AI Response
        </label>
        <div className="p-3 rounded-lg bg-card/5 border border-white/10 max-h-64 overflow-y-auto">
          <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
            {data.response}
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Tokens */}
        <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Terminal className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] font-medium text-blue-400 uppercase">Tokens</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {data.tokensUsed?.total || 0}
          </p>
          {data.tokensUsed?.prompt > 0 && (
            <p className="text-[10px] text-white/40">
              {data.tokensUsed.prompt}↑ {data.tokensUsed.completion}↓
            </p>
          )}
        </div>

        {/* Cost */}
        <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Coins className="w-3 h-3 text-green-400" />
            <span className="text-[10px] font-medium text-green-400 uppercase">Cost</span>
          </div>
          <p className="text-lg font-semibold text-white">
            ${(data.cost || 0).toFixed(4)}
          </p>
        </div>

        {/* Confidence */}
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Gauge className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-medium text-amber-400 uppercase">Conf.</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {((data.confidence || 0) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Phase 11: RAG Context Info */}
      {data.ragContext?.enabled && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/60 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            RAG Context
          </label>
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/60">Sources Used</span>
              <span className="text-sm font-medium text-purple-400">{data.ragContext.sourcesUsed}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/60">Strategy</span>
              <span className="text-xs font-medium text-purple-300 capitalize">{data.ragContext.retrievalStrategy}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">RAG Confidence</span>
              <span className="text-sm font-medium text-purple-400">{((data.ragContext.confidenceScore || 0) * 100).toFixed(0)}%</span>
            </div>

            {/* Citations */}
            {data.ragContext.citations?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-purple-500/20">
                <p className="text-[10px] font-medium text-white/50 mb-2 uppercase">Citations</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {data.ragContext.citations.slice(0, 5).map((citation: any, idx: number) => (
                    <div key={citation.id || idx} className="flex items-start gap-2 text-xs">
                      <span className="text-purple-400 font-medium">[{idx + 1}]</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 truncate">{citation.title}</p>
                        <p className="text-white/40 text-[10px]">{Math.round(citation.relevance * 100)}% relevance</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trace ID for debugging */}
      {data.traceId && (
        <div className="flex items-center justify-between text-[10px] text-white/30 px-1">
          <span>Trace ID:</span>
          <code className="font-mono text-white/50">{data.traceId}</code>
        </div>
      )}

      {/* Processing Time */}
      <div className="flex items-center justify-between text-xs text-white/40">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {data.processingTime || output.duration}ms
        </span>
        <span>{data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : ''}</span>
      </div>

      {/* Copy Raw JSON */}
      <button
        onClick={onCopyJson}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium
          rounded-lg bg-card/5 border border-white/10 text-white/60
          hover:bg-card/10 hover:text-white transition-colors"
      >
        {copiedJson ? (
          <>
            <Check className="w-3.5 h-3.5 text-green-400" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            Copy Raw JSON
          </>
        )}
      </button>
    </div>
  );
}

// ============================================
// GENERIC OUTPUT VIEW
// ============================================

interface GenericOutputViewProps {
  output: NodeExecutionOutput;
  onCopyJson: () => void;
  copiedJson: boolean;
}

function GenericOutputView({ output, onCopyJson, copiedJson }: GenericOutputViewProps) {
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');

  return (
    <div className="space-y-4 p-4">
      {/* Success Badge */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-green-400" />
        <span className="text-xs font-medium text-green-400">Execution Successful</span>
      </div>

      {/* Duration */}
      {output.duration && (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Clock className="w-3.5 h-3.5" />
          <span>Completed in {output.duration}ms</span>
        </div>
      )}

      {/* JSON Output */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-white/60 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5" />
            Output Data
          </label>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg bg-card/5 border border-white/10 overflow-hidden">
              <button
                onClick={() => setViewMode('tree')}
                className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                Tree
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                  viewMode === 'raw'
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                Raw
              </button>
            </div>
            <button
              onClick={onCopyJson}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium
                rounded bg-card/5 text-white/50 hover:bg-card/10 hover:text-white transition-colors"
            >
              {copiedJson ? (
                <>
                  <Check className="w-3 h-3 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tree View */}
        {viewMode === 'tree' && (
          <div className="p-3 rounded-lg bg-[#0A0A0C] border border-white/10 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            <JsonTreeViewer data={output.data} name="output" defaultExpanded={true} />
          </div>
        )}

        {/* Raw View */}
        {viewMode === 'raw' && (
          <pre className="p-3 rounded-lg bg-[#0A0A0C] border border-white/10
            text-xs font-mono text-white/80 overflow-x-auto max-h-80 overflow-y-auto
            scrollbar-thin scrollbar-thumb-white/10">
            {JSON.stringify(output.data, null, 2)}
          </pre>
        )}
      </div>

      {/* Timestamp */}
      {output.timestamp && (
        <div className="text-[10px] text-white/30 text-right">
          {new Date(output.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
}

// ============================================
// NODE INSPECTOR MAIN COMPONENT
// ============================================

export function NodeInspector() {
  const selectedNode = useSelectedNode();
  const setSelectedNode = usePipelineStore((s) => s.setSelectedNode);
  const updateNode = usePipelineStore((s) => s.updateNode);
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);

  // Subscribe to execution state
  const executionId = usePipelineStore((s) => s.executionId);
  const nodeStatus = usePipelineStore((s) =>
    selectedNode ? s.nodeStatus[selectedNode.id] : null
  );
  const nodeOutput = usePipelineStore((s) =>
    selectedNode ? s.nodeOutputs[selectedNode.id] : null
  );

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('config');

  // Local state for form
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [ragConfig, setRagConfig] = useState<Partial<RAGConfig>>({});

  // Auto-switch to Output tab when node finishes executing
  useEffect(() => {
    if (nodeOutput && executionId) {
      setActiveTab('output');
    }
  }, [nodeOutput, executionId]);

  // Reset to config tab when selecting a different node
  useEffect(() => {
    if (selectedNode) {
      // Only reset to config if there's no output data for this node
      if (!nodeOutput) {
        setActiveTab('config');
      }
      setLabel(selectedNode.data.label || '');
      setDescription(selectedNode.data.description || '');
      setConfig(selectedNode.data.config || {});
      // Phase 11: Initialize RAG config from node data
      setRagConfig((selectedNode.data as any).ragConfig || {});
    }
  }, [selectedNode?.id]); // Only depend on selectedNode.id, not the full object

  // Update node in store
  const handleUpdate = useCallback((updates: Partial<PipelineNodeData>) => {
    if (selectedNode) {
      updateNode(selectedNode.id, updates);
    }
  }, [selectedNode, updateNode]);

  // Update config in store
  const handleConfigUpdate = useCallback((newConfig: Record<string, unknown>) => {
    setConfig(newConfig);
    handleUpdate({ config: newConfig });
  }, [handleUpdate]);

  // Phase 11: Update RAG config in store
  const handleRagConfigUpdate = useCallback((newRagConfig: Partial<RAGConfig>) => {
    setRagConfig(newRagConfig);
    handleUpdate({ ragConfig: newRagConfig } as any);
  }, [handleUpdate]);

  // Close panel
  const handleClose = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // Don't render if no node selected
  if (!selectedNode) {
    return null;
  }

  const nodeData = selectedNode.data;
  const Icon = nodeData.icon ? iconMap[nodeData.icon] || Box : Box;
  const color = nodeData.color || '#6366F1';

  return (
    <aside className="w-80 h-full flex flex-col bg-[#0F0F12]/95 backdrop-blur-xl border-l border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10">
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: `${color}10` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {nodeData.type}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-card/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-white/10">
        <TabButton
          id="config"
          label="Configure"
          icon={Settings}
          active={activeTab === 'config'}
          onClick={() => setActiveTab('config')}
        />
        <TabButton
          id="output"
          label="Output"
          icon={Terminal}
          active={activeTab === 'output'}
          onClick={() => setActiveTab('output')}
          hasData={!!nodeOutput}
        />
        <TabButton
          id="metrics"
          label="Metrics"
          icon={BarChart3}
          active={activeTab === 'metrics'}
          onClick={() => setActiveTab('metrics')}
          hasData={!!nodeOutput}
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="p-4 space-y-4">
            {/* Basic Settings */}
            <CollapsibleSection title="Basic Info">
              <InputField
                label="Label"
                value={label}
                onChange={(v) => {
                  setLabel(v);
                  handleUpdate({ label: v });
                }}
                placeholder="Node label"
              />
              <InputField
                label="Description"
                value={description}
                onChange={(v) => {
                  setDescription(v);
                  handleUpdate({ description: v });
                }}
                type="textarea"
                placeholder="Describe what this node does..."
              />
            </CollapsibleSection>

            {/* Type-specific Configuration */}
            {nodeData.type === 'trigger' && (
              <TriggerConfigForm
                config={config}
                onUpdate={handleConfigUpdate}
                nodeId={selectedNode.id}
              />
            )}

            {nodeData.type === 'action' && (
              <ActionConfigForm
                config={config}
                onUpdate={handleConfigUpdate}
                nodeId={selectedNode.id}
              />
            )}

            {nodeData.type === 'agent' && (
              <>
                <AgentConfigForm
                  config={config}
                  onUpdate={handleConfigUpdate}
                  nodeId={selectedNode.id}
                />
                {/* Phase 11: RAG Configuration for Agent Nodes */}
                <RAGConfigForm
                  ragConfig={ragConfig}
                  onUpdate={handleRagConfigUpdate}
                />
              </>
            )}

            {nodeData.type === 'condition' && (
              <ConditionConfigForm
                config={config}
                onUpdate={handleConfigUpdate}
                nodeId={selectedNode.id}
              />
            )}

            {nodeData.type === 'output' && (
              <OutputConfigForm
                config={config}
                onUpdate={handleConfigUpdate}
              />
            )}

            {/* Phase 7: Execution Settings (Retry & Error Handling) */}
            <NodeSettingsPanel
              settings={config as Partial<NodeSettings>}
              onChange={(newSettings) => {
                const updatedConfig = { ...config, ...newSettings };
                handleConfigUpdate(updatedConfig);
              }}
              nodeType={nodeData.type}
              defaultCollapsed={true}
            />

            {/* Data References Section */}
            <DataReferenceSection
              nodeId={selectedNode.id}
              nodes={nodes}
              edges={edges}
            />
          </div>
        )}

        {/* Output Tab */}
        {activeTab === 'output' && (
          <OutputView
            nodeId={selectedNode.id}
            nodeType={nodeData.type}
            output={nodeOutput}
            nodeStatus={nodeStatus}
          />
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <MetricsView
            nodeId={selectedNode.id}
            nodeType={nodeData.type}
            output={nodeOutput}
            nodeStatus={nodeStatus}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <button
          onClick={handleClose}
          className="w-full px-4 py-2 text-sm font-medium rounded-lg
            bg-violet-500/20 text-violet-400 hover:bg-violet-500/30
            transition-colors"
        >
          {activeTab === 'config' ? (
            <>
              <Settings className="w-4 h-4 inline mr-2" />
              Done Configuring
            </>
          ) : (
            <>
              <X className="w-4 h-4 inline mr-2" />
              Close Inspector
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
