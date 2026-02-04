'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Filter,
  PlayCircle,
  Plus,
  Mail,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  X,
  Clock,
  DollarSign,
  TrendingDown
} from 'lucide-react';
import type { GeneratedAgent } from '@/lib/utils/generateAgentFromDescription';

interface Workflow {
  id: string;
  name: string;
  icon: React.ReactNode;
  trigger: {
    type: string;
    label: string;
    icon: React.ReactNode;
  };
  conditions: {
    type: string;
    label: string;
  }[];
  actions: {
    type: string;
    label: string;
    icon: React.ReactNode;
  }[];
  category: string;
}

const WORKFLOW_TEMPLATES: Workflow[] = [
  {
    id: 'lead-qualification',
    name: 'Lead Qualifizierung & Follow-up',
    icon: <DollarSign className="w-5 h-5" />,
    trigger: {
      type: 'hubspot_new_lead',
      label: 'Neuer Lead in HubSpot',
      icon: <Zap className="w-4 h-4" />
    },
    conditions: [
      { type: 'budget_gt', label: 'Budget > 50.000€' },
      { type: 'industry_eq', label: 'Branche = Maschinenbau' }
    ],
    actions: [
      { type: 'send_email', label: 'E-Mail senden', icon: <Mail className="w-4 h-4" /> },
      { type: 'update_crm', label: 'CRM-Status setzen', icon: <CheckCircle2 className="w-4 h-4" /> },
      { type: 'create_task', label: 'Follow-up Task (3 Tage)', icon: <Clock className="w-4 h-4" /> }
    ],
    category: 'Sales'
  },
  {
    id: 'support-escalation',
    name: 'Kunden-Support Eskalation',
    icon: <AlertCircle className="w-5 h-5" />,
    trigger: {
      type: 'whatsapp_keyword',
      label: 'WhatsApp enthält "dringend"',
      icon: <MessageSquare className="w-4 h-4" />
    },
    conditions: [
      { type: 'no_response', label: 'Keine Antwort in 2 Stunden' }
    ],
    actions: [
      { type: 'create_ticket', label: 'Ticket erstellen', icon: <AlertCircle className="w-4 h-4" /> },
      { type: 'notify_team', label: 'Team benachrichtigen', icon: <Mail className="w-4 h-4" /> },
      { type: 'send_auto_reply', label: 'Auto-Antwort senden', icon: <MessageSquare className="w-4 h-4" /> }
    ],
    category: 'Support'
  },
  {
    id: 'churn-prevention',
    name: 'Kündigungs-Prävention',
    icon: <TrendingDown className="w-5 h-5" />,
    trigger: {
      type: 'sentiment_low',
      label: 'Sentiment Score < 5',
      icon: <TrendingDown className="w-4 h-4" />
    },
    conditions: [
      { type: 'contract_expiry', label: 'Vertrag läuft in < 60 Tagen ab' }
    ],
    actions: [
      { type: 'notify_account_manager', label: 'Account Manager benachrichtigen', icon: <Mail className="w-4 h-4" /> },
      { type: 'send_email', label: 'Retention-E-Mail senden', icon: <Mail className="w-4 h-4" /> },
      { type: 'create_offer', label: 'Angebot erstellen', icon: <DollarSign className="w-4 h-4" /> }
    ],
    category: 'Retention'
  }
];

interface WorkflowsStepProps {
  agent: GeneratedAgent;
  onUpdate: (updates: Partial<GeneratedAgent>) => void;
  onValidationChange: (isValid: boolean) => void;
}

export function WorkflowsStep({ agent, onUpdate, onValidationChange }: WorkflowsStepProps) {
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [showActionLibrary, setShowActionLibrary] = useState(false);

  // Validation: At least 1 workflow must be selected
  useEffect(() => {
    const isValid = selectedWorkflows.length > 0;
    onValidationChange(isValid);
  }, [selectedWorkflows, onValidationChange]);

  const toggleWorkflow = (workflowId: string) => {
    setSelectedWorkflows(prev =>
      prev.includes(workflowId)
        ? prev.filter(id => id !== workflowId)
        : [...prev, workflowId]
    );
  };

  const toggleExpanded = (workflowId: string) => {
    setExpandedWorkflow(prev => prev === workflowId ? null : workflowId);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Workflows definieren</h2>
        <p className="text-muted-foreground">
          Wähle vordefinierte Workflows oder erstelle eigene Automatisierungen für deinen Agent
        </p>
      </div>

      {/* Workflow Templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Vordefinierte Workflows</h3>
          <span className="text-sm text-muted-foreground">
            {selectedWorkflows.length} ausgewählt
          </span>
        </div>

        <div className="space-y-3">
          {WORKFLOW_TEMPLATES.map((workflow) => {
            const isSelected = selectedWorkflows.includes(workflow.id);
            const isExpanded = expandedWorkflow === workflow.id;

            return (
              <motion.div
                key={workflow.id}
                layout
                className={`border-2 rounded-lg transition-all overflow-hidden ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {/* Workflow Header */}
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleWorkflow(workflow.id)}
                      className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                      )}
                    </button>

                    {/* Workflow Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          {workflow.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{workflow.name}</h4>
                          <span className="text-xs px-2 py-0.5 bg-muted rounded-md text-muted-foreground">
                            {workflow.category}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(workflow.id)}
                          className="text-sm text-primary hover:underline"
                        >
                          {isExpanded ? 'Einklappen' : 'Details anzeigen'}
                        </button>
                      </div>

                      {/* Compact Flow Preview */}
                      {!isExpanded && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                          <div className="flex items-center gap-1">
                            {workflow.trigger.icon}
                            <span className="font-medium">Trigger</span>
                          </div>
                          <ArrowRight className="w-4 h-4" />
                          <div className="flex items-center gap-1">
                            <Filter className="w-4 h-4" />
                            <span>{workflow.conditions.length} Bedingungen</span>
                          </div>
                          <ArrowRight className="w-4 h-4" />
                          <div className="flex items-center gap-1">
                            <PlayCircle className="w-4 h-4" />
                            <span>{workflow.actions.length} Aktionen</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Flow Visualization */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border"
                    >
                      <div className="p-6 bg-muted/30">
                        <div className="flex items-start gap-4">
                          {/* Trigger Block */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                                {workflow.trigger.icon}
                              </div>
                              <div>
                                <div className="text-xs font-medium text-muted-foreground">TRIGGER</div>
                                <div className="text-sm font-medium">{workflow.trigger.label}</div>
                              </div>
                            </div>
                          </div>

                          <ArrowRight className="w-5 h-5 text-muted-foreground mt-6" />

                          {/* Conditions Block */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-600 dark:text-orange-400">
                                <Filter className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-medium text-muted-foreground">BEDINGUNGEN</div>
                                <div className="text-sm font-medium">{workflow.conditions.length} Filter</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {workflow.conditions.map((condition, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs bg-background/60 rounded px-2 py-1.5 border border-border"
                                >
                                  {condition.label}
                                </div>
                              ))}
                            </div>
                          </div>

                          <ArrowRight className="w-5 h-5 text-muted-foreground mt-6" />

                          {/* Actions Block */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-2 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
                                <PlayCircle className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-medium text-muted-foreground">AKTIONEN</div>
                                <div className="text-sm font-medium">{workflow.actions.length} Tasks</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {workflow.actions.map((action, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-xs bg-background/60 rounded px-2 py-1.5 border border-border"
                                >
                                  {action.icon}
                                  <span>{action.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Custom Workflow Button */}
      <div>
        <button
          type="button"
          onClick={() => setShowActionLibrary(true)}
          className="w-full p-4 border-2 border-dashed border-border hover:border-primary/50 rounded-lg transition-colors group"
        >
          <div className="flex items-center justify-center gap-3 text-muted-foreground group-hover:text-primary">
            <Plus className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">Eigene Aktion hinzufügen</div>
              <div className="text-xs">Erstelle einen benutzerdefinierten Workflow</div>
            </div>
          </div>
        </button>
      </div>

      {/* Validation Message */}
      {selectedWorkflows.length === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                Mind. 1 Workflow erforderlich
              </h4>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Wähle mindestens einen Workflow aus, um fortzufahren, oder erstelle einen eigenen.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {selectedWorkflows.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">
                {selectedWorkflows.length} {selectedWorkflows.length === 1 ? 'Workflow' : 'Workflows'} ausgewählt
              </h4>
              <p className="text-sm text-green-600 dark:text-green-400">
                Dein Agent wird automatisch auf diese Events reagieren
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Library Modal (Placeholder) */}
      <AnimatePresence>
        {showActionLibrary && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowActionLibrary(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-3xl bg-card border border-border rounded-lg shadow-2xl z-50 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h3 className="text-xl font-bold">Action Library</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Erstelle einen benutzerdefinierten Workflow
                  </p>
                </div>
                <button
                  onClick={() => setShowActionLibrary(false)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-muted/50 border border-border rounded-lg p-8 text-center">
                  <PlayCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Custom Workflow Builder wird hier implementiert
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Drag & Drop Interface für Trigger, Conditions und Actions
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-border flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowActionLibrary(false)}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => setShowActionLibrary(false)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Workflow hinzufügen
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
