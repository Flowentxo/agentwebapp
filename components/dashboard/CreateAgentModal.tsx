'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bot,
  Brain,
  FileText,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Wand2,
  Zap,
  Shield,
  Globe,
  Code,
  Database,
  Check,
  Palette,
  User,
  MessageSquare,
  Settings2,
  Mail,
  Hash,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useDashboardStore, useFiles, type KnowledgeFileState } from '@/store/useDashboardStore';

// ============================================================================
// TYPES
// ============================================================================

interface NewAgentData {
  // Step 1: Identity
  name: string;
  role: string;
  color: string;
  icon: string;
  // Step 2: Intelligence
  systemPrompt: string;
  temperature: number;
  capabilities: {
    internetAccess: boolean;
    longTermMemory: boolean;
    codeExecution: boolean;
    canSendEmail: boolean;      // Level 12: Email capability
    canPostToSlack: boolean;    // Level 12: Slack capability
  };
  // Step 3: Knowledge
  accessibleFiles: string[];
}

type WizardStep = 'identity' | 'intelligence' | 'knowledge' | 'review';

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 'identity', label: 'Identity', icon: User },
  { id: 'intelligence', label: 'Intelligence', icon: Brain },
  { id: 'knowledge', label: 'Knowledge', icon: FileText },
  { id: 'review', label: 'Review', icon: CheckCircle },
];

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
];

const ICON_OPTIONS = [
  { id: 'bot', icon: Bot, label: 'Bot' },
  { id: 'brain', icon: Brain, label: 'Brain' },
  { id: 'sparkles', icon: Sparkles, label: 'Sparkles' },
  { id: 'wand', icon: Wand2, label: 'Wand' },
  { id: 'zap', icon: Zap, label: 'Zap' },
  { id: 'shield', icon: Shield, label: 'Shield' },
  { id: 'globe', icon: Globe, label: 'Globe' },
  { id: 'code', icon: Code, label: 'Code' },
  { id: 'database', icon: Database, label: 'Database' },
  { id: 'message', icon: MessageSquare, label: 'Message' },
];

const ROLE_SUGGESTIONS = [
  'Financial Analyst',
  'Customer Support',
  'Email Manager',
  'Data Scientist',
  'Content Writer',
  'Research Assistant',
  'Code Reviewer',
  'Marketing Strategist',
];

const DEFAULT_AGENT_DATA: NewAgentData = {
  name: '',
  role: '',
  color: PRESET_COLORS[0],
  icon: 'bot',
  systemPrompt: '',
  temperature: 0.7,
  capabilities: {
    internetAccess: true,
    longTermMemory: true,
    codeExecution: false,
    canSendEmail: false,      // Level 12: Disabled by default (requires API key)
    canPostToSlack: false,    // Level 12: Disabled by default (requires webhook URL)
  },
  accessibleFiles: [],
};

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface StepProps {
  data: NewAgentData;
  onChange: (updates: Partial<NewAgentData>) => void;
}

// Step 1: Identity
function IdentityStep({ data, onChange }: StepProps) {
  const selectedIcon = ICON_OPTIONS.find((i) => i.id === data.icon) || ICON_OPTIONS[0];
  const IconComponent = selectedIcon.icon;

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="flex justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <div
            className="w-24 h-24 rounded-2xl border-2 flex items-center justify-center transition-all duration-300"
            style={{
              backgroundColor: `${data.color}15`,
              borderColor: `${data.color}50`,
              boxShadow: `0 0 30px ${data.color}20`,
            }}
          >
            <IconComponent className="w-10 h-10" style={{ color: data.color }} />
          </div>
          {data.name && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
            >
              <p className="text-sm font-medium text-white">{data.name}</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Name Input */}
      <div className="pt-6">
        <label className="block text-sm font-medium text-zinc-400 mb-2">Agent Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g., Atlas, Nova, Echo..."
          className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
          maxLength={20}
        />
        <p className="mt-1.5 text-xs text-zinc-500">{data.name.length}/20 characters</p>
      </div>

      {/* Role Input with Suggestions */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">Role / Specialty</label>
        <input
          type="text"
          value={data.role}
          onChange={(e) => onChange({ role: e.target.value })}
          placeholder="e.g., Financial Analyst"
          className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {ROLE_SUGGESTIONS.slice(0, 4).map((role) => (
            <button
              key={role}
              onClick={() => onChange({ role })}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                data.role === role
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Avatar Color
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onChange({ color })}
              className={`w-10 h-10 rounded-xl transition-all duration-200 ${
                data.color === color
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            >
              {data.color === color && (
                <Check className="w-5 h-5 text-white mx-auto" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Icon Picker */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">Avatar Icon</label>
        <div className="flex flex-wrap gap-2">
          {ICON_OPTIONS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onChange({ icon: id })}
              className={`p-3 rounded-xl transition-all duration-200 ${
                data.icon === id
                  ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300'
                  : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 border border-transparent'
              }`}
              title={label}
            >
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 2: Intelligence
function IntelligenceStep({ data, onChange }: StepProps) {
  const temperatureLabels = ['Precise', 'Balanced', 'Creative'];
  const temperatureIndex = data.temperature <= 0.3 ? 0 : data.temperature >= 0.8 ? 2 : 1;

  return (
    <div className="space-y-6">
      {/* System Prompt */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          System Prompt <span className="text-zinc-500">(Optional)</span>
        </label>
        <textarea
          value={data.systemPrompt}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          placeholder="Define the agent's personality, expertise, and behavior guidelines..."
          rows={5}
          className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          Leave empty to use default prompts based on role
        </p>
      </div>

      {/* Temperature Slider */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-zinc-400 flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Creativity Level
          </label>
          <span className="px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-300 text-xs font-medium">
            {temperatureLabels[temperatureIndex]}
          </span>
        </div>
        <div className="relative">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={data.temperature}
            onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
            className="w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-violet-500"
            style={{
              background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${data.temperature * 100}%, #3f3f46 ${data.temperature * 100}%, #3f3f46 100%)`,
            }}
          />
          <div className="flex justify-between mt-2 text-xs text-zinc-500">
            <span>Precise (0.0)</span>
            <span>Creative (1.0)</span>
          </div>
        </div>
      </div>

      {/* Capabilities */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-3">Capabilities</label>
        <div className="space-y-3">
          {/* Internet Access */}
          <div
            onClick={() =>
              onChange({
                capabilities: { ...data.capabilities, internetAccess: !data.capabilities.internetAccess },
              })
            }
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              data.capabilities.internetAccess
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    data.capabilities.internetAccess ? 'bg-emerald-500/20' : 'bg-zinc-700/50'
                  }`}
                >
                  <Globe
                    className={`w-5 h-5 ${
                      data.capabilities.internetAccess ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  />
                </div>
                <div>
                  <p className={`text-sm font-medium ${data.capabilities.internetAccess ? 'text-white' : 'text-zinc-400'}`}>
                    Internet Access
                  </p>
                  <p className="text-xs text-zinc-500">Search and browse the web</p>
                </div>
              </div>
              <div
                className={`w-10 h-6 rounded-full transition-colors ${
                  data.capabilities.internetAccess ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-card shadow-md transform transition-transform mt-0.5 ${
                    data.capabilities.internetAccess ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'
                  }`}
                  style={{ marginLeft: data.capabilities.internetAccess ? '18px' : '2px' }}
                />
              </div>
            </div>
          </div>

          {/* Long Term Memory */}
          <div
            onClick={() =>
              onChange({
                capabilities: { ...data.capabilities, longTermMemory: !data.capabilities.longTermMemory },
              })
            }
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              data.capabilities.longTermMemory
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    data.capabilities.longTermMemory ? 'bg-blue-500/20' : 'bg-zinc-700/50'
                  }`}
                >
                  <Database
                    className={`w-5 h-5 ${
                      data.capabilities.longTermMemory ? 'text-blue-400' : 'text-zinc-500'
                    }`}
                  />
                </div>
                <div>
                  <p className={`text-sm font-medium ${data.capabilities.longTermMemory ? 'text-white' : 'text-zinc-400'}`}>
                    Long-Term Memory
                  </p>
                  <p className="text-xs text-zinc-500">Remember context across sessions</p>
                </div>
              </div>
              <div
                className={`w-10 h-6 rounded-full transition-colors ${
                  data.capabilities.longTermMemory ? 'bg-blue-500' : 'bg-zinc-700'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full bg-card shadow-md transform transition-transform mt-0.5"
                  style={{ marginLeft: data.capabilities.longTermMemory ? '18px' : '2px' }}
                />
              </div>
            </div>
          </div>

          {/* Code Execution */}
          <div
            onClick={() =>
              onChange({
                capabilities: { ...data.capabilities, codeExecution: !data.capabilities.codeExecution },
              })
            }
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              data.capabilities.codeExecution
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    data.capabilities.codeExecution ? 'bg-amber-500/20' : 'bg-zinc-700/50'
                  }`}
                >
                  <Code
                    className={`w-5 h-5 ${
                      data.capabilities.codeExecution ? 'text-amber-400' : 'text-zinc-500'
                    }`}
                  />
                </div>
                <div>
                  <p className={`text-sm font-medium ${data.capabilities.codeExecution ? 'text-white' : 'text-zinc-400'}`}>
                    Code Execution
                  </p>
                  <p className="text-xs text-zinc-500">Run code snippets and scripts</p>
                </div>
              </div>
              <div
                className={`w-10 h-6 rounded-full transition-colors ${
                  data.capabilities.codeExecution ? 'bg-amber-500' : 'bg-zinc-700'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full bg-card shadow-md transform transition-transform mt-0.5"
                  style={{ marginLeft: data.capabilities.codeExecution ? '18px' : '2px' }}
                />
              </div>
            </div>
          </div>

          {/* Level 12: Real-World Integrations Section */}
          <div className="pt-4 border-t border-zinc-700/50">
            <p className="text-xs text-zinc-500 mb-3 flex items-center gap-2">
              <Zap className="w-3 h-3" />
              Real-World Integrations
            </p>

            {/* Email Sending */}
            <div
              onClick={() =>
                onChange({
                  capabilities: { ...data.capabilities, canSendEmail: !data.capabilities.canSendEmail },
                })
              }
              className={`p-4 rounded-xl border cursor-pointer transition-all mb-3 ${
                data.capabilities.canSendEmail
                  ? 'bg-pink-500/10 border-pink-500/30'
                  : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      data.capabilities.canSendEmail ? 'bg-pink-500/20' : 'bg-zinc-700/50'
                    }`}
                  >
                    <Mail
                      className={`w-5 h-5 ${
                        data.capabilities.canSendEmail ? 'text-pink-400' : 'text-zinc-500'
                      }`}
                    />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${data.capabilities.canSendEmail ? 'text-white' : 'text-zinc-400'}`}>
                      Email Sending
                    </p>
                    <p className="text-xs text-zinc-500">Send emails via Resend API</p>
                  </div>
                </div>
                <div
                  className={`w-10 h-6 rounded-full transition-colors ${
                    data.capabilities.canSendEmail ? 'bg-pink-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full bg-card shadow-md transform transition-transform mt-0.5"
                    style={{ marginLeft: data.capabilities.canSendEmail ? '18px' : '2px' }}
                  />
                </div>
              </div>
            </div>

            {/* Slack Notifications */}
            <div
              onClick={() =>
                onChange({
                  capabilities: { ...data.capabilities, canPostToSlack: !data.capabilities.canPostToSlack },
                })
              }
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                data.capabilities.canPostToSlack
                  ? 'bg-purple-500/10 border-purple-500/30'
                  : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      data.capabilities.canPostToSlack ? 'bg-purple-500/20' : 'bg-zinc-700/50'
                    }`}
                  >
                    <Hash
                      className={`w-5 h-5 ${
                        data.capabilities.canPostToSlack ? 'text-purple-400' : 'text-zinc-500'
                      }`}
                    />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${data.capabilities.canPostToSlack ? 'text-white' : 'text-zinc-400'}`}>
                      Slack Notifications
                    </p>
                    <p className="text-xs text-zinc-500">Post messages to Slack channels</p>
                  </div>
                </div>
                <div
                  className={`w-10 h-6 rounded-full transition-colors ${
                    data.capabilities.canPostToSlack ? 'bg-purple-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full bg-card shadow-md transform transition-transform mt-0.5"
                    style={{ marginLeft: data.capabilities.canPostToSlack ? '18px' : '2px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 3: Knowledge
function KnowledgeStep({ data, onChange }: StepProps) {
  const files = useFiles();
  const readyFiles = files.filter((f) => f.status === 'ready');

  const toggleFile = (fileId: string) => {
    const newAccessibleFiles = data.accessibleFiles.includes(fileId)
      ? data.accessibleFiles.filter((id) => id !== fileId)
      : [...data.accessibleFiles, fileId];
    onChange({ accessibleFiles: newAccessibleFiles });
  };

  const selectAll = () => {
    onChange({ accessibleFiles: readyFiles.map((f) => f.id) });
  };

  const clearAll = () => {
    onChange({ accessibleFiles: [] });
  };

  if (readyFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No Knowledge Files</h3>
        <p className="text-sm text-zinc-500 max-w-xs">
          Upload documents to your knowledge base to give this agent access to specific information.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          Select files this agent can access ({data.accessibleFiles.length}/{readyFiles.length})
        </p>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-300 text-xs hover:bg-violet-500/20 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={clearAll}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:bg-zinc-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
        {readyFiles.map((file) => {
          const isSelected = data.accessibleFiles.includes(file.id);
          return (
            <div
              key={file.id}
              onClick={() => toggleFile(file.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-violet-500/10 border-violet-500/30'
                  : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'bg-violet-500 border-violet-500' : 'border-zinc-600'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <FileText className={`w-4 h-4 ${isSelected ? 'text-violet-400' : 'text-zinc-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                    {file.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {file.type.toUpperCase()} • {file.chunks} chunks
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Step 4: Review
function ReviewStep({ data }: { data: NewAgentData }) {
  const selectedIcon = ICON_OPTIONS.find((i) => i.id === data.icon) || ICON_OPTIONS[0];
  const IconComponent = selectedIcon.icon;
  const files = useFiles();

  const accessibleFileNames = data.accessibleFiles
    .map((id) => files.find((f) => f.id === id)?.name)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Agent Preview Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="p-6 rounded-2xl border border-zinc-700/50 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50"
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center"
            style={{
              backgroundColor: `${data.color}15`,
              borderColor: `${data.color}50`,
              boxShadow: `0 0 30px ${data.color}20`,
            }}
          >
            <IconComponent className="w-8 h-8" style={{ color: data.color }} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{data.name || 'Unnamed Agent'}</h3>
            <p className="text-sm text-muted-foreground">{data.role || 'No role specified'}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Creativity</p>
            <p className="text-sm font-medium text-foreground">
              {data.temperature <= 0.3 ? 'Precise' : data.temperature >= 0.8 ? 'Creative' : 'Balanced'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Capabilities</p>
            <p className="text-sm font-medium text-foreground">
              {Object.values(data.capabilities).filter(Boolean).length}/5 active
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Knowledge</p>
            <p className="text-sm font-medium text-foreground">{data.accessibleFiles.length} files</p>
          </div>
        </div>
      </motion.div>

      {/* Configuration Summary */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Configuration Summary</h4>

        {/* Capabilities */}
        <div className="flex flex-wrap gap-2">
          {data.capabilities.internetAccess && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/20">
              <Globe className="w-3 h-3" /> Internet
            </span>
          )}
          {data.capabilities.longTermMemory && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 text-xs border border-blue-500/20">
              <Database className="w-3 h-3" /> Memory
            </span>
          )}
          {data.capabilities.codeExecution && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-xs border border-amber-500/20">
              <Code className="w-3 h-3" /> Code Exec
            </span>
          )}
          {data.capabilities.canSendEmail && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-300 text-xs border border-pink-500/20">
              <Mail className="w-3 h-3" /> Email
            </span>
          )}
          {data.capabilities.canPostToSlack && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-xs border border-purple-500/20">
              <Hash className="w-3 h-3" /> Slack
            </span>
          )}
        </div>

        {/* System Prompt Preview */}
        {data.systemPrompt && (
          <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
            <p className="text-xs text-zinc-500 mb-1">System Prompt</p>
            <p className="text-sm text-zinc-300 line-clamp-2">{data.systemPrompt}</p>
          </div>
        )}

        {/* Knowledge Files */}
        {accessibleFileNames.length > 0 && (
          <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
            <p className="text-xs text-zinc-500 mb-2">Knowledge Access</p>
            <div className="flex flex-wrap gap-1.5">
              {accessibleFileNames.slice(0, 3).map((name, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-zinc-700 text-xs text-zinc-300">
                  {name}
                </span>
              ))}
              {accessibleFileNames.length > 3 && (
                <span className="px-2 py-0.5 rounded bg-zinc-700 text-xs text-zinc-400">
                  +{accessibleFileNames.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentCreated?: (agentId: string) => void;
}

export function CreateAgentModal({ isOpen, onClose, onAgentCreated }: CreateAgentModalProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('identity');
  const [agentData, setAgentData] = useState<NewAgentData>(DEFAULT_AGENT_DATA);
  const [isCreating, setIsCreating] = useState(false);

  // Store actions
  const createAgent = useDashboardStore((state) => state.createAgent);
  const addToast = useDashboardStore((state) => state.addToast);

  // Step index
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Validation
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'identity':
        return agentData.name.trim().length >= 2 && agentData.role.trim().length >= 2;
      case 'intelligence':
        return true; // All fields optional
      case 'knowledge':
        return true; // Optional
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, agentData]);

  // Handlers
  const handleDataChange = useCallback((updates: Partial<NewAgentData>) => {
    setAgentData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  }, [currentStepIndex]);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  const handleCreate = useCallback(async () => {
    if (!createAgent) {
      addToast({ message: 'Agent creation not available', type: 'error' });
      return;
    }

    setIsCreating(true);
    try {
      const agentId = await createAgent(agentData);
      addToast({ message: `${agentData.name} created successfully!`, type: 'success' });
      onAgentCreated?.(agentId);

      // Reset and close
      setAgentData(DEFAULT_AGENT_DATA);
      setCurrentStep('identity');
      onClose();
    } catch (error) {
      addToast({ message: 'Failed to create agent', type: 'error' });
    } finally {
      setIsCreating(false);
    }
  }, [createAgent, agentData, addToast, onAgentCreated, onClose]);

  const handleClose = useCallback(() => {
    setAgentData(DEFAULT_AGENT_DATA);
    setCurrentStep('identity');
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Create New Agent</h2>
                <p className="text-xs text-zinc-500">Step {currentStepIndex + 1} of {STEPS.length}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all flex-1 ${
                      isActive
                        ? 'bg-violet-500/10 border border-violet-500/30'
                        : isCompleted
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-zinc-800/50 border border-zinc-700/50'
                    }`}
                  >
                    <StepIcon
                      className={`w-4 h-4 ${
                        isActive ? 'text-violet-400' : isCompleted ? 'text-green-400' : 'text-zinc-500'
                      }`}
                    />
                    <span
                      className={`text-xs font-medium hidden sm:block ${
                        isActive ? 'text-violet-300' : isCompleted ? 'text-green-300' : 'text-zinc-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-zinc-600 mx-1 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep === 'identity' && (
                <IdentityStep data={agentData} onChange={handleDataChange} />
              )}
              {currentStep === 'intelligence' && (
                <IntelligenceStep data={agentData} onChange={handleDataChange} />
              )}
              {currentStep === 'knowledge' && (
                <KnowledgeStep data={agentData} onChange={handleDataChange} />
              )}
              {currentStep === 'review' && <ReviewStep data={agentData} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentStepIndex === 0
                ? 'opacity-50 cursor-not-allowed text-zinc-500'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep === 'review' ? (
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-sm font-medium hover:from-violet-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
            >
              {isCreating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </motion.div>
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Agent
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                canProceed
                  ? 'bg-violet-500 text-white hover:bg-violet-600'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateAgentModal;
