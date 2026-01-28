'use client';

import { useState, useEffect } from 'react';
import { Bot, Building2, Factory, TrendingUp, Mail, DollarSign, Calendar, MessageSquare, Lock, Handshake, BarChart3, Shield } from 'lucide-react';
import type { GeneratedAgent } from '@/lib/utils/generateAgentFromDescription';

const ICONS = [
  { value: '🏢', label: 'Enterprise', icon: Building2 },
  { value: '🏭', label: 'Factory', icon: Factory },
  { value: '📊', label: 'Analytics', icon: BarChart3 },
  { value: '💬', label: 'Chat', icon: MessageSquare },
  { value: '📧', label: 'Email', icon: Mail },
  { value: '🤖', label: 'Bot', icon: Bot },
  { value: '💰', label: 'Finance', icon: DollarSign },
  { value: '📅', label: 'Calendar', icon: Calendar },
  { value: '✉️', label: 'Mail', icon: Mail },
  { value: '📈', label: 'Growth', icon: TrendingUp },
  { value: '🔒', label: 'Security', icon: Lock },
  { value: '🤝', label: 'Partnership', icon: Handshake },
];

const INDUSTRIES = [
  'Maschinenbau',
  'Versicherung',
  'IT-Dienstleistung',
  'Fertigung',
  'Handel',
  'Logistik',
  'Finanzdienstleistung',
  'Gesundheitswesen',
  'E-Commerce',
  'Pharma',
];

interface AgentDetailsStepProps {
  agent: GeneratedAgent;
  onUpdate: (updates: Partial<GeneratedAgent>) => void;
  onValidationChange: (isValid: boolean) => void;
}

export function AgentDetailsStep({ agent, onUpdate, onValidationChange }: AgentDetailsStepProps) {
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description);
  const [selectedIcon, setSelectedIcon] = useState(agent.icon);
  const [agentType, setAgentType] = useState<'standard' | 'enterprise'>(agent.type);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(
    agent.industry ? [agent.industry] : []
  );

  const [errors, setErrors] = useState({
    name: '',
    description: '',
    industries: '',
  });

  // Validation
  useEffect(() => {
    const newErrors = {
      name: name.length < 3 ? 'Name muss mindestens 3 Zeichen lang sein' : '',
      description: description.length < 20 ? 'Beschreibung muss mindestens 20 Zeichen lang sein' : '',
      industries: selectedIndustries.length === 0 ? 'Wähle mindestens eine Branche' : '',
    };

    setErrors(newErrors);

    const isValid = !newErrors.name && !newErrors.description && !newErrors.industries;
    onValidationChange(isValid);

    if (isValid) {
      onUpdate({
        name,
        description,
        icon: selectedIcon,
        type: agentType,
        industry: selectedIndustries[0],
        tags: [...agent.tags.filter(t => !INDUSTRIES.includes(t)), ...selectedIndustries],
      });
    }
  }, [name, description, selectedIcon, agentType, selectedIndustries]);

  const toggleIndustry = (industry: string) => {
    setSelectedIndustries(prev =>
      prev.includes(industry)
        ? prev.filter(i => i !== industry)
        : [...prev, industry]
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Agent-Details anpassen</h2>
        <p className="text-muted-foreground">
          Definiere Name, Icon und Branchenfokus deines Agents
        </p>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Agent Name */}
        <div>
          <label htmlFor="agent-name" className="block text-sm font-medium mb-2">
            Agent Name *
          </label>
          <input
            id="agent-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Enterprise Sales Agent"
            className={`w-full px-4 py-3 bg-muted/50 border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.name ? 'border-red-500' : 'border-border'
            }`}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* Icon Picker */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Agent Icon *
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-3">
            {ICONS.map((icon) => (
              <button
                key={icon.value}
                type="button"
                onClick={() => setSelectedIcon(icon.value)}
                className={`aspect-square rounded-lg border-2 p-3 transition-all hover:scale-105 ${
                  selectedIcon === icon.value
                    ? 'border-primary bg-primary/10 scale-105'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="text-2xl">{icon.value}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="agent-description" className="block text-sm font-medium mb-2">
            Beschreibung *
          </label>
          <textarea
            id="agent-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beschreibe, was dein Agent tun soll..."
            rows={4}
            className={`w-full px-4 py-3 bg-muted/50 border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none ${
              errors.description ? 'border-red-500' : 'border-border'
            }`}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.description ? (
              <p className="text-red-500 text-sm">{errors.description}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                {description.length} / min. 20 Zeichen
              </p>
            )}
          </div>
        </div>

        {/* Agent Type */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Agent-Typ *
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setAgentType('standard')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                agentType === 'standard'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-medium mb-1">Standard</div>
              <div className="text-sm text-muted-foreground">
                Für typische Business-Aufgaben
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAgentType('enterprise')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                agentType === 'enterprise'
                  ? 'border-purple-500 bg-purple-500/5'
                  : 'border-border hover:border-purple-500/50'
              }`}
            >
              <div className="font-medium mb-1 flex items-center gap-2">
                Enterprise
                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs rounded-md border border-purple-500/20">
                  PRO
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Für komplexe B2B-Prozesse
              </div>
            </button>
          </div>
        </div>

        {/* Industry Tags */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Branchen *
          </label>
          <p className="text-sm text-muted-foreground mb-3">
            Wähle die Branchen aus, in denen dein Agent eingesetzt wird
          </p>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((industry) => {
              const isSelected = selectedIndustries.includes(industry);
              return (
                <button
                  key={industry}
                  type="button"
                  onClick={() => toggleIndustry(industry)}
                  className={`px-3 py-2 rounded-lg border transition-all text-sm ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-foreground'
                  }`}
                >
                  {industry}
                </button>
              );
            })}
          </div>
          {errors.industries && (
            <p className="text-red-500 text-sm mt-2">{errors.industries}</p>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-muted/50 border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium mb-4 text-muted-foreground">Vorschau</h3>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center text-3xl flex-shrink-0"
            style={{ backgroundColor: agent.color }}
          >
            {selectedIcon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-lg">{name || 'Agent Name'}</h4>
              {agentType === 'enterprise' && (
                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs rounded-md border border-purple-500/20 font-medium">
                  Enterprise
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {description || 'Beschreibung des Agents...'}
            </p>
            {selectedIndustries.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedIndustries.map((industry) => (
                  <span
                    key={industry}
                    className="px-2 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs rounded-md border border-orange-500/20"
                  >
                    {industry}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
