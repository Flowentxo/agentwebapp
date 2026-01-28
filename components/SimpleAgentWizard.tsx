'use client';

import { useState } from 'react';
import { 
  MessageSquare, 
  Users, 
  FileText, 
  MoreHorizontal,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Globe,
  Link,
  Code,
  Smile,
  MessageCircle,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAgents } from '@/store/agents';

type Purpose = 'customer-support' | 'sales' | 'documents' | 'other';
type Tone = 'friendly' | 'direct' | 'formal' | 'casual';
type Channel = 'website' | 'internal' | 'api';

interface WizardData {
  purpose: Purpose | null;
  behavior: string;
  tone: Tone;
  channel: Channel;
}

export function SimpleAgentWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    purpose: null,
    behavior: '',
    tone: 'friendly',
    channel: 'website'
  });
  const [isCreating, setIsCreating] = useState(false);
  const { add } = useAgents();

  const purposes = [
    {
      id: 'customer-support' as Purpose,
      title: 'Kundensupport',
      description: 'Beantwortet Fragen von Kunden und hilft bei Problemen',
      icon: MessageSquare,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'sales' as Purpose,
      title: 'Vertrieb & Leads',
      description: 'Spricht mit Interessenten und qualifiziert potentielle Kunden',
      icon: Briefcase,
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'documents' as Purpose,
      title: 'Interne Fragen',
      description: 'Hilft Mitarbeitern bei Fragen zu Dokumenten und Prozessen',
      icon: FileText,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'other' as Purpose,
      title: 'Sonstiges',
      description: 'Für alle anderen Anwendungsfälle',
      icon: MoreHorizontal,
      color: 'from-orange-500 to-red-500'
    }
  ];

  const tones = [
    { id: 'friendly' as Tone, label: 'Freundlich', icon: Smile },
    { id: 'direct' as Tone, label: 'Direkt', icon: MessageCircle },
    { id: 'formal' as Tone, label: 'Formal', icon: Briefcase },
    { id: 'casual' as Tone, label: 'Locker', icon: Users }
  ];

  const channels = [
    {
      id: 'website' as Channel,
      title: 'Website-Chat',
      description: 'Kunden können direkt auf deiner Website mit dem Agenten chatten',
      icon: Globe,
      recommended: true
    },
    {
      id: 'internal' as Channel,
      title: 'Interner Link',
      description: 'Teile einen privaten Link mit deinem Team',
      icon: Link
    },
    {
      id: 'api' as Channel,
      title: 'API/Technik',
      description: 'Für Entwickler: Integration in eigene Anwendungen',
      icon: Code
    }
  ];

  const handleCreate = async () => {
    if (!data.purpose || !data.behavior.trim()) return;

    setIsCreating(true);
    
    try {
      // Generate agent name based on purpose
      const purposeNames = {
        'customer-support': 'Kundensupport',
        'sales': 'Vertrieb',
        'documents': 'Hilfe',
        'other': 'Assistent'
      };

      const agentName = `${purposeNames[data.purpose]} Agent`;
      
      // Create agent with simplified config
      const agentId = `${data.purpose}-${Date.now()}`;
      
      add({
        id: agentId,
        name: agentName,
        status: 'active',
        description: `${purposeNames[data.purpose]} Agent - ${data.behavior.substring(0, 100)}...`,
        capabilities: getCapabilitiesForPurpose(data.purpose),
        kpis: [
          { label: 'Anfragen', value: '0' },
          { label: 'Erfolgsrate', value: '—' },
          { label: 'Ø Antwortzeit', value: '—' },
          { label: 'Verfügbarkeit', value: '—' }
        ],
        tags: [data.purpose, data.tone],
        lastAction: 'Gerade erstellt'
      });

      // Simulate brief creation delay for UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onClose();
    } catch (error) {
      console.error('Error creating agent:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getCapabilitiesForPurpose = (purpose: Purpose): string[] => {
    const capabilities = {
      'customer-support': ['Fragen beantworten', 'Probleme lösen', 'Tickets erstellen'],
      'sales': ['Leads qualifizieren', 'Termine vereinbaren', 'Angebote erstellen'],
      'documents': ['Dokumente durchsuchen', 'Informationen finden', 'Prozesse erklären'],
      'other': ['Allgemeine Hilfe', 'Fragen beantworten', 'Support leisten']
    };
    return capabilities[purpose];
  };

  const canProceed = () => {
    switch (step) {
      case 1: return data.purpose !== null;
      case 2: return data.behavior.trim().length > 10;
      case 3: return true;
      default: return false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Agent erstellen</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition"
            >
              ✕
            </button>
          </div>
          
          {/* Progress */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= stepNumber ? 'bg-card text-blue-600' : 'bg-card/20 text-white/60'
                }`}>
                  {step > stepNumber ? '✓' : stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-12 h-1 mx-2 ${
                    step > stepNumber ? 'bg-card' : 'bg-card/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-white/90 mt-2">
            Schritt {step} von 3: {
              step === 1 ? 'Zweck wählen' :
              step === 2 ? 'Verhalten beschreiben' :
              'Verwendung festlegen'
            }
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Wofür brauchst du den Agenten?
              </h3>
              <div className="grid gap-3">
                {purposes.map((purpose) => {
                  const Icon = purpose.icon;
                  return (
                    <button
                      key={purpose.id}
                      onClick={() => setData({ ...data, purpose: purpose.id })}
                      className={`p-4 rounded-xl border-2 text-left transition ${
                        data.purpose === purpose.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-border hover:border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${purpose.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{purpose.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{purpose.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Wie soll er sich verhalten?
                </h3>
                <textarea
                  value={data.behavior}
                  onChange={(e) => setData({ ...data, behavior: e.target.value })}
                  placeholder="Beschreibe in normalen Worten, wie der Agent arbeiten soll. Zum Beispiel: 'Der Agent soll freundlich Fragen beantworten und bei Problemen weiterhelfen.'"
                  className="w-full h-32 p-4 border border-border rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Mindestens 10 Zeichen erforderlich ({data.behavior.length}/10)
                </p>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-3">Tonfall</h4>
                <div className="grid grid-cols-2 gap-2">
                  {tones.map((tone) => {
                    const Icon = tone.icon;
                    return (
                      <button
                        key={tone.id}
                        onClick={() => setData({ ...data, tone: tone.id })}
                        className={`p-3 rounded-lg border text-left transition ${
                          data.tone === tone.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-border hover:border-border'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{tone.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Wo willst du ihn benutzen?
              </h3>
              <div className="space-y-3">
                {channels.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => setData({ ...data, channel: channel.id })}
                      className={`p-4 rounded-xl border-2 text-left transition ${
                        data.channel === channel.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-border hover:border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">{channel.title}</h4>
                            {channel.recommended && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                Empfohlen
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{channel.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <div>
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Zurück
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  Weiter
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={!canProceed() || isCreating}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Wird erstellt...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Agent erstellen
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}