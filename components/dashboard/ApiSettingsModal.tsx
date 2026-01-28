'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Sparkles,
  ExternalLink,
  Trash2,
  Mail,
  MessageSquare,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDashboardStore } from '@/store/useDashboardStore';

// ============================================================================
// TYPES
// ============================================================================

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

// ============================================================================
// API SETTINGS MODAL COMPONENT
// ============================================================================

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiSettingsModal({ isOpen, onClose }: ApiSettingsModalProps) {
  // OpenAI State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationMessage, setValidationMessage] = useState('');

  // Level 12: Integration Keys State
  const [resendKeyInput, setResendKeyInput] = useState('');
  const [showResendKey, setShowResendKey] = useState(false);
  const [slackWebhookInput, setSlackWebhookInput] = useState('');
  const [showSlackWebhook, setShowSlackWebhook] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);

  // Store state and actions
  const storedApiKey = useDashboardStore((state) => state.openaiApiKey);
  const setOpenaiApiKey = useDashboardStore((state) => state.setOpenaiApiKey);
  const clearOpenaiApiKey = useDashboardStore((state) => state.clearOpenaiApiKey);
  const addToast = useDashboardStore((state) => state.addToast);

  // Level 12: Integration keys from store
  const storedResendApiKey = useDashboardStore((state) => state.resendApiKey);
  const storedSlackWebhookUrl = useDashboardStore((state) => state.slackWebhookUrl);
  const setResendApiKey = useDashboardStore((state) => state.setResendApiKey);
  const setSlackWebhookUrl = useDashboardStore((state) => state.setSlackWebhookUrl);
  const clearResendApiKey = useDashboardStore((state) => state.clearResendApiKey);
  const clearSlackWebhookUrl = useDashboardStore((state) => state.clearSlackWebhookUrl);

  // Initialize inputs with stored values (masked)
  useEffect(() => {
    if (isOpen) {
      if (storedApiKey) {
        setApiKeyInput(maskApiKey(storedApiKey));
      } else {
        setApiKeyInput('');
      }
      if (storedResendApiKey) {
        setResendKeyInput(maskApiKey(storedResendApiKey));
      } else {
        setResendKeyInput('');
      }
      if (storedSlackWebhookUrl) {
        setSlackWebhookInput(maskWebhookUrl(storedSlackWebhookUrl));
      } else {
        setSlackWebhookInput('');
      }
    }
  }, [isOpen, storedApiKey, storedResendApiKey, storedSlackWebhookUrl]);

  // Mask API key for display
  const maskApiKey = (key: string): string => {
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 7)}...${key.slice(-4)}`;
  };

  // Mask webhook URL for display
  const maskWebhookUrl = (url: string): string => {
    if (url.length <= 20) return '••••••••';
    return `${url.slice(0, 25)}...${url.slice(-10)}`;
  };

  // Validate API key format
  const isValidKeyFormat = (key: string): boolean => {
    return key.startsWith('sk-') && key.length >= 40;
  };

  // Validate Resend key format
  const isValidResendKeyFormat = (key: string): boolean => {
    return key.startsWith('re_') && key.length >= 20;
  };

  // Validate Slack webhook URL format
  const isValidSlackWebhookFormat = (url: string): boolean => {
    return url.startsWith('https://hooks.slack.com/services/') && url.length > 50;
  };

  // Validate API key with OpenAI
  const validateApiKey = useCallback(async (key: string) => {
    if (!isValidKeyFormat(key)) {
      setValidationStatus('invalid');
      setValidationMessage('Invalid API key format. Must start with "sk-"');
      return false;
    }

    setValidationStatus('validating');
    setValidationMessage('Validating API key...');

    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: key }),
      });

      const data = await response.json();

      if (data.valid) {
        setValidationStatus('valid');
        setValidationMessage('API key is valid!');
        return true;
      } else {
        setValidationStatus('invalid');
        setValidationMessage(data.error || 'Invalid API key');
        return false;
      }
    } catch (error) {
      // If validation endpoint doesn't exist, just check format
      if (isValidKeyFormat(key)) {
        setValidationStatus('valid');
        setValidationMessage('API key format looks correct');
        return true;
      }
      setValidationStatus('invalid');
      setValidationMessage('Could not validate API key');
      return false;
    }
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    // Save OpenAI key if not masked
    if (apiKeyInput && !apiKeyInput.includes('•')) {
      const isValid = await validateApiKey(apiKeyInput);
      if (isValid) {
        setOpenaiApiKey(apiKeyInput);
      } else {
        return; // Don't close if validation failed
      }
    }

    // Save Resend key if not masked and valid
    if (resendKeyInput && !resendKeyInput.includes('•')) {
      if (isValidResendKeyFormat(resendKeyInput)) {
        setResendApiKey(resendKeyInput);
      } else {
        addToast({
          message: 'Invalid Resend API key format (should start with "re_")',
          type: 'error',
        });
        return;
      }
    }

    // Save Slack webhook if not masked and valid
    if (slackWebhookInput && !slackWebhookInput.includes('•')) {
      if (isValidSlackWebhookFormat(slackWebhookInput)) {
        setSlackWebhookUrl(slackWebhookInput);
      } else {
        addToast({
          message: 'Invalid Slack Webhook URL format',
          type: 'error',
        });
        return;
      }
    }

    addToast({
      message: 'Settings saved successfully',
      type: 'success',
    });

    setTimeout(() => {
      onClose();
      resetInputs();
    }, 300);
  }, [apiKeyInput, resendKeyInput, slackWebhookInput, validateApiKey, setOpenaiApiKey, setResendApiKey, setSlackWebhookUrl, addToast, onClose]);

  // Reset inputs
  const resetInputs = () => {
    setApiKeyInput('');
    setResendKeyInput('');
    setSlackWebhookInput('');
    setValidationStatus('idle');
    setValidationMessage('');
    setShowKey(false);
    setShowResendKey(false);
    setShowSlackWebhook(false);
  };

  // Handle clear OpenAI key
  const handleClearOpenAI = useCallback(() => {
    clearOpenaiApiKey();
    setApiKeyInput('');
    setValidationStatus('idle');
    setValidationMessage('');
    addToast({
      message: 'OpenAI API key removed',
      type: 'info',
    });
  }, [clearOpenaiApiKey, addToast]);

  // Handle clear Resend key
  const handleClearResend = useCallback(() => {
    clearResendApiKey();
    setResendKeyInput('');
    addToast({
      message: 'Resend API key removed',
      type: 'info',
    });
  }, [clearResendApiKey, addToast]);

  // Handle clear Slack webhook
  const handleClearSlack = useCallback(() => {
    clearSlackWebhookUrl();
    setSlackWebhookInput('');
    addToast({
      message: 'Slack Webhook URL removed',
      type: 'info',
    });
  }, [clearSlackWebhookUrl, addToast]);

  // Handle close
  const handleClose = useCallback(() => {
    resetInputs();
    onClose();
  }, [onClose]);

  const hasStoredKey = !!storedApiKey;
  const hasStoredResendKey = !!storedResendApiKey;
  const hasStoredSlackWebhook = !!storedSlackWebhookUrl;
  const isInputMasked = apiKeyInput.includes('•');
  const canSave =
    (apiKeyInput.length > 0 && !isInputMasked) ||
    (resendKeyInput.length > 0 && !resendKeyInput.includes('•')) ||
    (slackWebhookInput.length > 0 && !slackWebhookInput.includes('•'));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            API & Integration Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info Box */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-300">Your Keys, Your Control</p>
                <p className="text-xs text-amber-400/70 mt-1">
                  All API keys are stored locally in your browser and never sent to our servers.
                  They're used directly with their respective services.
                </p>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* OpenAI Section */}
          {/* ================================================================ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-medium text-white">OpenAI API Key</h3>
              {hasStoredKey && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-400">
                  Configured
                </span>
              )}
            </div>

            {/* Current Status */}
            {hasStoredKey && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs text-green-300">Real AI Mode Active</span>
                </div>
                <button
                  onClick={handleClearOpenAI}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            )}

            {/* API Key Input */}
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setValidationStatus('idle');
                  setValidationMessage('');
                }}
                placeholder="sk-..."
                className={`w-full px-4 py-2.5 pr-12 bg-zinc-800/50 border rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 transition-all font-mono text-sm ${
                  validationStatus === 'valid'
                    ? 'border-green-500/50 focus:ring-green-500/20'
                    : validationStatus === 'invalid'
                    ? 'border-red-500/50 focus:ring-red-500/20'
                    : 'border-zinc-700 focus:border-amber-500/50 focus:ring-amber-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-white transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Validation Message */}
            <AnimatePresence mode="wait">
              {validationMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={`flex items-center gap-2 text-xs ${
                    validationStatus === 'valid'
                      ? 'text-green-400'
                      : validationStatus === 'invalid'
                      ? 'text-red-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {validationStatus === 'validating' && <Loader2 className="w-3 h-3 animate-spin" />}
                  {validationStatus === 'valid' && <CheckCircle className="w-3 h-3" />}
                  {validationStatus === 'invalid' && <AlertCircle className="w-3 h-3" />}
                  {validationMessage}
                </motion.div>
              )}
            </AnimatePresence>

            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Get your API key from OpenAI
            </a>
          </div>

          {/* ================================================================ */}
          {/* Level 12: Integrations Section (Collapsible) */}
          {/* ================================================================ */}
          <div className="border-t border-zinc-800 pt-4">
            <button
              onClick={() => setShowIntegrations(!showIntegrations)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-white">Real-World Integrations</span>
                {(hasStoredResendKey || hasStoredSlackWebhook) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/20 text-indigo-400">
                    Level 12
                  </span>
                )}
              </div>
              {showIntegrations ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              )}
            </button>

            <AnimatePresence>
              {showIntegrations && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-5 pt-4">
                    {/* Resend (Email) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-rose-400" />
                          <span className="text-sm font-medium text-white">Resend (Email)</span>
                          {hasStoredResendKey && (
                            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                          )}
                        </div>
                        {hasStoredResendKey && (
                          <button
                            onClick={handleClearResend}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">
                        Enable agents to send real emails via Resend.
                      </p>
                      <div className="relative">
                        <input
                          type={showResendKey ? 'text' : 'password'}
                          value={resendKeyInput}
                          onChange={(e) => setResendKeyInput(e.target.value)}
                          placeholder="re_..."
                          className="w-full px-4 py-2.5 pr-12 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:border-rose-500/50 focus:ring-rose-500/20 transition-all font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResendKey(!showResendKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-white transition-colors"
                        >
                          {showResendKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <a
                        href="https://resend.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-rose-400 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Get your API key from Resend
                      </a>
                    </div>

                    {/* Slack Webhook */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-medium text-white">Slack Webhook</span>
                          {hasStoredSlackWebhook && (
                            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                          )}
                        </div>
                        {hasStoredSlackWebhook && (
                          <button
                            onClick={handleClearSlack}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">
                        Enable agents to post notifications to Slack channels.
                      </p>
                      <div className="relative">
                        <input
                          type={showSlackWebhook ? 'text' : 'password'}
                          value={slackWebhookInput}
                          onChange={(e) => setSlackWebhookInput(e.target.value)}
                          placeholder="https://hooks.slack.com/services/..."
                          className="w-full px-4 py-2.5 pr-12 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSlackWebhook(!showSlackWebhook)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-white transition-colors"
                        >
                          {showSlackWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <a
                        href="https://api.slack.com/messaging/webhooks"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Create a Slack Webhook URL
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mode Indicator */}
          <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${hasStoredKey ? 'text-violet-400' : 'text-zinc-500'}`} />
              <span className="text-sm text-zinc-300">
                AI Mode: <span className={`font-medium ${hasStoredKey ? 'text-violet-400' : 'text-amber-400'}`}>
                  {hasStoredKey ? 'Real AI (GPT-4)' : 'Simulation'}
                </span>
              </span>
            </div>
            {(hasStoredResendKey || hasStoredSlackWebhook) && (
              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                {hasStoredResendKey && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-rose-400" />
                    Email Ready
                  </span>
                )}
                {hasStoredSlackWebhook && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-emerald-400" />
                    Slack Ready
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave && validationStatus === 'validating'}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              canSave || validationStatus !== 'validating'
                ? 'bg-amber-500 hover:bg-amber-600 text-black'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {validationStatus === 'validating' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Key className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ApiSettingsModal;
