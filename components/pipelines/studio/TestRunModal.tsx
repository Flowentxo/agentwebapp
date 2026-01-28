'use client';

/**
 * TestRunModal Component
 *
 * Modal for configuring and triggering a workflow test run
 * Allows users to provide custom triggerData as JSON
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  AlertTriangle,
  FileJson,
  CheckCircle,
  Code,
  Zap,
  Info,
} from 'lucide-react';

interface TestRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (triggerData: Record<string, unknown>) => void;
  workflowName: string;
  isRunning?: boolean;
}

// Example trigger data templates
const TRIGGER_TEMPLATES = [
  {
    id: 'empty',
    name: 'Empty',
    description: 'No input data',
    data: {},
  },
  {
    id: 'webhook',
    name: 'Webhook Payload',
    description: 'Typical webhook request',
    data: {
      event: 'user.created',
      timestamp: new Date().toISOString(),
      data: {
        userId: 'usr_123',
        email: 'test@example.com',
        name: 'Test User',
      },
    },
  },
  {
    id: 'email',
    name: 'Email Event',
    description: 'Email-related trigger',
    data: {
      type: 'email_received',
      from: 'customer@example.com',
      subject: 'Support Request',
      body: 'I need help with my order #12345',
      timestamp: new Date().toISOString(),
    },
  },
  {
    id: 'crm',
    name: 'CRM Update',
    description: 'CRM contact update',
    data: {
      type: 'contact_updated',
      contactId: 'con_456',
      changes: {
        status: 'qualified',
        score: 85,
      },
      updatedBy: 'system',
    },
  },
  {
    id: 'schedule',
    name: 'Scheduled Run',
    description: 'Cron job trigger',
    data: {
      type: 'scheduled',
      schedule: '0 9 * * *',
      runAt: new Date().toISOString(),
      timezone: 'Europe/Berlin',
    },
  },
];

export function TestRunModal({
  isOpen,
  onClose,
  onRun,
  workflowName,
  isRunning = false,
}: TestRunModalProps) {
  const [triggerDataJson, setTriggerDataJson] = useState<string>(
    JSON.stringify(TRIGGER_TEMPLATES[0].data, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('empty');

  // Validate JSON
  const validateJson = useCallback((json: string): boolean => {
    try {
      JSON.parse(json);
      setJsonError(null);
      return true;
    } catch (err: any) {
      setJsonError(err.message);
      return false;
    }
  }, []);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = TRIGGER_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      const json = JSON.stringify(template.data, null, 2);
      setTriggerDataJson(json);
      validateJson(json);
    }
  };

  // Handle run
  const handleRun = () => {
    if (validateJson(triggerDataJson)) {
      try {
        const data = JSON.parse(triggerDataJson);
        onRun(data);
      } catch (err) {
        console.error('Failed to parse trigger data:', err);
      }
    }
  };

  // Format JSON
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(triggerDataJson);
      setTriggerDataJson(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl bg-card rounded-xl border border-gray-800 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Test Workflow</h2>
                <p className="text-sm text-muted-foreground">{workflowName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-300">
                  Test mode executes the workflow with the provided trigger data.
                  Results will be shown in real-time as each node completes.
                </p>
              </div>
            </div>

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Quick Templates
              </label>
              <div className="flex flex-wrap gap-2">
                {TRIGGER_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`
                      px-3 py-1.5 text-sm rounded-lg border transition-all
                      ${selectedTemplate === template.id
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-gray-800 border-gray-700 text-muted-foreground hover:border-gray-600 hover:text-white'
                      }
                    `}
                    title={template.description}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            {/* JSON Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileJson size={16} />
                  Trigger Data (JSON)
                </label>
                <button
                  onClick={handleFormat}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gray-300 transition-colors"
                >
                  <Code size={12} />
                  Format
                </button>
              </div>
              <div className="relative">
                <textarea
                  value={triggerDataJson}
                  onChange={(e) => {
                    setTriggerDataJson(e.target.value);
                    validateJson(e.target.value);
                  }}
                  className={`
                    w-full h-64 px-4 py-3 font-mono text-sm rounded-lg
                    bg-gray-800/50 border focus:ring-2 outline-none resize-none
                    ${jsonError
                      ? 'border-red-500/50 focus:ring-red-500/30 text-red-200'
                      : 'border-gray-700 focus:ring-blue-500/30 focus:border-blue-500/50 text-gray-200'
                    }
                  `}
                  placeholder='{ "key": "value" }'
                  spellCheck={false}
                />
                {!jsonError && triggerDataJson && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle size={16} className="text-green-400" />
                  </div>
                )}
              </div>
              {jsonError && (
                <div className="flex items-center gap-2 mt-2 text-sm text-red-400">
                  <AlertTriangle size={14} />
                  <span>{jsonError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-card/50">
            <div className="text-xs text-muted-foreground">
              Execution logs will appear in the Log Panel
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={isRunning}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRun}
                disabled={isRunning || !!jsonError}
                className={`
                  flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg transition-all
                  ${isRunning
                    ? 'bg-blue-600/50 text-blue-200 cursor-wait'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {isRunning ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Zap size={16} />
                    </motion.div>
                    Running...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Run Test
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default TestRunModal;
