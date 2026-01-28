'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  X,
  AlertCircle,
  Plug,
  Mail,
  MessageSquare,
  Building2,
  Zap
} from 'lucide-react';

type IntegrationType = 'oauth' | 'api_key';
type CategoryType = 'crm' | 'messaging' | 'email';

interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: CategoryType;
  type: IntegrationType;
  features: string[];
  description: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    icon: <Building2 className="w-6 h-6" />,
    category: 'crm',
    type: 'oauth',
    features: [
      'Kontakte synchronisieren',
      'Deals verwalten',
      'Tickets erstellen'
    ],
    description: 'CRM und Marketing Automation'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    icon: <MessageSquare className="w-6 h-6" />,
    category: 'messaging',
    type: 'api_key',
    features: [
      'Nachrichten senden/empfangen',
      'Status-Updates',
      'Media-Support'
    ],
    description: 'Business Messaging Platform'
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: <Mail className="w-6 h-6" />,
    category: 'email',
    type: 'oauth',
    features: [
      'E-Mails senden',
      'Postfach lesen',
      'Anhänge verarbeiten'
    ],
    description: 'E-Mail Kommunikation'
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    icon: <Zap className="w-6 h-6" />,
    category: 'crm',
    type: 'oauth',
    features: [
      'Leads importieren',
      'Opportunities tracken',
      'Reports erstellen'
    ],
    description: 'Enterprise CRM Platform'
  }
];

const CATEGORY_LABELS: Record<CategoryType | 'all', string> = {
  crm: 'CRM',
  messaging: 'Messaging',
  email: 'E-Mail',
  all: 'Alle'
};

interface ApiKeyField {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  value?: string;
  required?: boolean;
}

interface IntegrationsStepProps {
  agentId: string;
  onValidationChange: (isValid: boolean) => void;
}

export function IntegrationsStep({ agentId, onValidationChange }: IntegrationsStepProps) {
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<CategoryType | 'all'>('all');
  const [showApiKeyModal, setShowApiKeyModal] = useState<{
    integration: Integration;
    fields: ApiKeyField[];
  } | null>(null);
  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Validation: At least 1 integration required
  useEffect(() => {
    const isValid = connectedIds.length >= 1;
    onValidationChange(isValid);
  }, [connectedIds, onValidationChange]);

  // Show toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filter integrations by active tab
  const filteredIntegrations = activeTab === 'all'
    ? INTEGRATIONS
    : INTEGRATIONS.filter(i => i.category === activeTab);

  // Handle OAuth connection
  const handleOAuthConnect = (integration: Integration) => {
    // Simulate OAuth flow (in production: open popup, handle callback)
    const authUrl = `/api/integrations/${integration.id}/auth?agent_id=${agentId}`;

    // For demo: just connect immediately
    setTimeout(() => {
      setConnectedIds(prev => [...prev, integration.id]);
      showToast(`${integration.name} erfolgreich verbunden!`, 'success');
    }, 1000);

    // In production:
    // const popup = window.open(authUrl, 'oauth', 'width=600,height=700');
    // window.addEventListener('message', handleOAuthCallback);
  };

  // Handle API Key connection
  const handleApiKeyConnect = (integration: Integration) => {
    const fields: ApiKeyField[] = [
      {
        name: 'phoneNumber',
        label: 'Telefonnummer',
        placeholder: '+49...',
        type: 'tel',
        required: true
      },
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Gib deinen API Key ein',
        required: true
      },
      {
        name: 'webhookUrl',
        label: 'Webhook URL',
        disabled: true,
        value: `${window.location.origin}/api/webhooks/${agentId}/whatsapp`,
        required: false
      }
    ];

    setShowApiKeyModal({ integration, fields });
  };

  // Submit API Key form
  const handleSubmitApiKey = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!showApiKeyModal) return;

    // Validate required fields
    const requiredFields = showApiKeyModal.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !apiKeyValues[f.name]);

    if (missingFields.length > 0) {
      showToast('Bitte fülle alle erforderlichen Felder aus', 'error');
      return;
    }

    // Simulate API call
    setTimeout(() => {
      setConnectedIds(prev => [...prev, showApiKeyModal.integration.id]);
      showToast(`${showApiKeyModal.integration.name} erfolgreich verbunden!`, 'success');
      setShowApiKeyModal(null);
      setApiKeyValues({});
    }, 1000);

    // In production:
    // const response = await fetch(`/api/integrations/${integration.id}/connect`, {
    //   method: 'POST',
    //   body: JSON.stringify({ agentId, ...apiKeyValues })
    // });
  };

  // Handle connect button click
  const handleConnect = (integration: Integration) => {
    if (integration.type === 'oauth') {
      handleOAuthConnect(integration);
    } else {
      handleApiKeyConnect(integration);
    }
  };

  // Test connection
  const handleTestConnection = (integration: Integration) => {
    showToast(`Verbindung zu ${integration.name} wird getestet...`, 'success');
    // In production: actual API test
  };

  // Disconnect integration
  const handleDisconnect = (integrationId: string) => {
    setConnectedIds(prev => prev.filter(id => id !== integrationId));
    const integration = INTEGRATIONS.find(i => i.id === integrationId);
    showToast(`${integration?.name} getrennt`, 'success');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Integrationen verbinden</h2>
        <p className="text-muted-foreground">
          Verbinde deinen Agent mit CRM, Messaging und E-Mail-Tools
        </p>
      </div>

      {/* Success Summary */}
      {connectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/10 border border-green-500/30 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="font-semibold text-green-600 dark:text-green-400">
              {connectedIds.length} Integration{connectedIds.length > 1 ? 'en' : ''} erfolgreich verbunden
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {connectedIds.map(id => {
              const integration = INTEGRATIONS.find(i => i.id === id);
              return (
                <span
                  key={id}
                  className="px-3 py-1 bg-green-500/20 text-green-700 dark:text-green-300 text-sm rounded-md border border-green-500/30 font-medium"
                >
                  {integration?.name}
                </span>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {(['all', 'crm', 'messaging', 'email'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors relative ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {CATEGORY_LABELS[tab]}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredIntegrations.map((integration) => {
            const isConnected = connectedIds.includes(integration.id);

            return (
              <motion.div
                key={integration.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`border-2 rounded-lg overflow-hidden transition-all ${
                  isConnected
                    ? 'border-green-500 bg-green-500/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-border bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isConnected
                            ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {integration.icon}
                      </div>

                      <div>
                        <h3 className="font-semibold text-base">{integration.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {integration.description}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isConnected && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs rounded-md font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Verbunden
                      </span>
                    )}
                  </div>

                  {/* Category Badge */}
                  <div className="mt-3">
                    <span className="px-2 py-1 bg-background/60 border border-border text-xs rounded-md">
                      {CATEGORY_LABELS[integration.category]}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  {/* Features */}
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">FEATURES</h4>
                    <ul className="space-y-1">
                      {integration.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {!isConnected ? (
                      <button
                        onClick={() => handleConnect(integration)}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Plug className="w-4 h-4" />
                          <span>Mit {integration.name} verbinden</span>
                        </div>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleTestConnection(integration)}
                          className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors font-medium text-sm"
                        >
                          Verbindung testen
                        </button>
                        <button
                          onClick={() => handleDisconnect(integration.id)}
                          className="px-4 py-2 border border-red-500/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
                        >
                          Trennen
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Validation Warning */}
      {connectedIds.length === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                Mind. 1 Integration erforderlich
              </h4>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Verbinde mindestens eine Integration, um deinem Agent Zugriff auf externe Tools zu geben.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      <AnimatePresence>
        {showApiKeyModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowApiKeyModal(null)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-card border border-border rounded-lg shadow-2xl z-50"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h3 className="text-xl font-bold">
                    {showApiKeyModal.integration.name} konfigurieren
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gib deine API-Zugangsdaten ein um die Integration zu aktivieren
                  </p>
                </div>
                <button
                  onClick={() => setShowApiKeyModal(null)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <form onSubmit={handleSubmitApiKey} className="p-6 space-y-4">
                {showApiKeyModal.fields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <label htmlFor={field.name} className="block text-sm font-medium">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      type={field.type || 'text'}
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                      value={field.disabled ? field.value : apiKeyValues[field.name] || ''}
                      onChange={(e) => setApiKeyValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                      className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                ))}

                {/* Modal Footer */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModal(null)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Verbinden
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <div
              className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
                toast.type === 'success'
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
