import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Plug,
  Brain,
  Rocket,
  MessageSquare,
  Settings,
  Globe,
  Shield,
  Zap,
  Target,
  Smile,
  Briefcase,
  Code,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface WizardData {
  // Step 1: Basics
  name: string;
  description: string;
  category: string;
  tone: string;
  
  // Step 2: Integrations
  channels: string[];
  integrations: string[];
  
  // Step 3: Behavior
  personality: string;
  responseStyle: string;
  escalationRules: string;
  learningEnabled: boolean;
  
  // Step 4: Test & Launch
  testMessages: string[];
  launchImmediately: boolean;
  monitoringEnabled: boolean;
}

interface AgentCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: WizardData) => void;
}

const STEPS = [
  {
    id: 1,
    title: 'Grundlagen',
    description: 'Basis-Informationen über deinen Agenten',
    icon: User
  },
  {
    id: 2,
    title: 'Integrationen',
    description: 'Kanäle und externe Verbindungen',
    icon: Plug
  },
  {
    id: 3,
    title: 'Verhalten',
    description: 'Persönlichkeit und Antworten',
    icon: Brain
  },
  {
    id: 4,
    title: 'Test & Start',
    description: 'Testen und live schalten',
    icon: Rocket
  }
];

const CATEGORIES = [
  { id: 'customer-support', name: 'Kundensupport', icon: MessageSquare, color: '#3B82F6' },
  { id: 'sales', name: 'Vertrieb', icon: Target, color: '#10B981' },
  { id: 'content', name: 'Content', icon: Settings, color: '#8B5CF6' },
  { id: 'hr', name: 'Personal', icon: User, color: '#F59E0B' }
];

const TONES = [
  { id: 'friendly', name: 'Freundlich', icon: Smile, description: 'Warm und einladend' },
  { id: 'professional', name: 'Professionell', icon: Briefcase, description: 'Formell und sachlich' },
  { id: 'casual', name: 'Lässig', icon: Zap, description: 'Entspannt und informell' },
  { id: 'technical', name: 'Technisch', icon: Code, description: 'Präzise und detailliert' }
];

const CHANNELS = [
  { id: 'website', name: 'Website', icon: Globe, description: 'Website-Chat Widget' },
  { id: 'api', name: 'API', icon: Code, description: 'REST API Integration' },
  { id: 'webhook', name: 'Webhook', icon: Zap, description: 'Echtzeit Benachrichtigungen' }
];

const INTEGRATIONS = [
  { id: 'slack', name: 'Slack', description: 'Team-Kommunikation' },
  { id: 'discord', name: 'Discord', description: 'Community Plattform' },
  { id: 'email', name: 'E-Mail', description: 'E-Mail Integration' },
  { id: 'crm', name: 'CRM', description: 'Kundenbeziehungsmanagement' }
];

export default function AgentCreationWizard({ isOpen, onClose, onComplete }: AgentCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    name: '',
    description: '',
    category: '',
    tone: 'friendly',
    channels: [],
    integrations: [],
    personality: '',
    responseStyle: '',
    escalationRules: '',
    learningEnabled: false,
    testMessages: [],
    launchImmediately: true,
    monitoringEnabled: true
  });

  const updateData = (updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const handleSwitchChange = (field: keyof WizardData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    updateData({ [field]: e.target.checked });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.name.trim() && data.description.trim() && data.category;
      case 2:
        return data.channels.length > 0;
      case 3:
        return data.personality.trim() && data.responseStyle.trim();
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (canProceed()) {
      onComplete(data);
      onClose();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Agent Name *
              </label>
              <Input
                value={data.name}
                onChange={(e) => updateData({ name: e.target.value })}
                placeholder="z.B. Kundensupport Bot"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Beschreibung *
              </label>
              <Textarea
                value={data.description}
                onChange={(e) => updateData({ description: e.target.value })}
                placeholder="Beschreibe, was dein Agent tun soll..."
                className="w-full h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-3">
                Kategorie *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => updateData({ category: category.id })}
                      className={`p-4 rounded-xl border-2 text-left transition ${
                        data.category === category.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-white/10 bg-surface-1 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: category.color }} />
                        </div>
                        <span className="font-medium text-text">{category.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-3">
                Kommunikationston
              </label>
              <div className="grid grid-cols-2 gap-3">
                {TONES.map((tone) => {
                  const Icon = tone.icon;
                  return (
                    <button
                      key={tone.id}
                      onClick={() => updateData({ tone: tone.id })}
                      className={`p-3 rounded-lg border text-left transition ${
                        data.tone === tone.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-white/10 bg-surface-1 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-text-muted" />
                        <span className="font-medium text-text">{tone.name}</span>
                      </div>
                      <p className="text-xs text-text-muted">{tone.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text mb-3">
                Kommunikationskanäle *
              </label>
              <div className="space-y-3">
                {CHANNELS.map((channel) => {
                  const Icon = channel.icon;
                  const isSelected = data.channels.includes(channel.id);
                  return (
                    <button
                      key={channel.id}
                      onClick={() => updateData({ 
                        channels: toggleArrayItem(data.channels, channel.id) 
                      })}
                      className={`w-full p-4 rounded-xl border text-left transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-white/10 bg-surface-1 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-text-muted" />
                        <div>
                          <div className="font-medium text-text">{channel.name}</div>
                          <div className="text-sm text-text-muted">{channel.description}</div>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-blue-400 ml-auto" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-3">
                Externe Integrationen
              </label>
              <div className="space-y-2">
                {INTEGRATIONS.map((integration) => {
                  const isSelected = data.integrations.includes(integration.id);
                  return (
                    <button
                      key={integration.id}
                      onClick={() => updateData({ 
                        integrations: toggleArrayItem(data.integrations, integration.id) 
                      })}
                      className={`w-full p-3 rounded-lg border text-left transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-white/10 bg-surface-1 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-text">{integration.name}</div>
                          <div className="text-sm text-text-muted">{integration.description}</div>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Persönlichkeit *
              </label>
              <Textarea
                value={data.personality}
                onChange={(e) => updateData({ personality: e.target.value })}
                placeholder="Beschreibe die Persönlichkeit deines Agenten..."
                className="w-full h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Antwort-Stil *
              </label>
              <Textarea
                value={data.responseStyle}
                onChange={(e) => updateData({ responseStyle: e.target.value })}
                placeholder="Wie soll der Agent antworten?"
                className="w-full h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Eskalationsregeln
              </label>
              <Textarea
                value={data.escalationRules}
                onChange={(e) => updateData({ escalationRules: e.target.value })}
                placeholder="Wann soll der Agent eskalieren?"
                className="w-full h-20"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-surface-1">
              <div>
                <div className="font-medium text-text">Lernfähigkeiten aktivieren</div>
                <div className="text-sm text-text-muted">Agent lernt aus Gesprächen</div>
              </div>
              <Switch
                checked={data.learningEnabled}
                onChange={handleSwitchChange('learningEnabled')}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <h3 className="font-medium text-text mb-2">Agent Übersicht</h3>
              <div className="space-y-2 text-sm text-text-muted">
                <div><strong>Name:</strong> {data.name}</div>
                <div><strong>Kategorie:</strong> {CATEGORIES.find(c => c.id === data.category)?.name}</div>
                <div><strong>Kanäle:</strong> {data.channels.length} ausgewählt</div>
                <div><strong>Integrationen:</strong> {data.integrations.length} ausgewählt</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-surface-1">
                <div>
                  <div className="font-medium text-text">Sofort live schalten</div>
                  <div className="text-sm text-text-muted">Agent wird nach Erstellung aktiviert</div>
                </div>
                <Switch
                  checked={data.launchImmediately}
                  onChange={handleSwitchChange('launchImmediately')}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-surface-1">
                <div>
                  <div className="font-medium text-text">Monitoring aktivieren</div>
                  <div className="text-sm text-text-muted">Performance und Aktivität überwachen</div>
                </div>
                <Switch
                  checked={data.monitoringEnabled}
                  onChange={handleSwitchChange('monitoringEnabled')}
                />
              </div>
            </div>

            <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Geschätzte Erstellungszeit: 2-3 Minuten</span>
              </div>
              <p className="text-sm text-text-muted">
                Dein Agent wird automatisch konfiguriert und kann sofort verwendet werden.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl max-h-[90vh] bg-surface-0 rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-text">Agent erstellen</h2>
              <p className="text-text-muted mt-1">
                Schritt {currentStep} von 4: {STEPS[currentStep - 1].description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-text-muted transition hover:bg-card/5 hover:text-text"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-3 ${
                    isActive ? 'text-blue-400' : 
                    isCompleted ? 'text-green-400' : 'text-text-muted'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isActive ? 'border-blue-400 bg-blue-400/10' :
                      isCompleted ? 'border-green-400 bg-green-400/10' :
                      'border-white/20 bg-surface-1'
                    }`}>
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <div className="font-medium">{step.title}</div>
                      <div className="text-xs text-text-muted">{step.description}</div>
                    </div>
                  </div>
                  
                  {index < STEPS.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-400' : 'bg-card/20'
                    }`} />
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
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Zurück
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {currentStep < 4 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  Weiter
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Rocket className="w-4 h-4" />
                  Agent erstellen
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}