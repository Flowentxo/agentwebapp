
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Lock, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface CredentialsFormProps {
  provider: string; // 'hubspot', 'gmail', 'google'
  providerName: string; // 'HubSpot', 'Gmail', 'Google Calendar'
  onCancel: () => void;
  onSuccess: () => void;
}

export function CredentialsForm({ provider, providerName, onCancel, onSuccess }: CredentialsFormProps) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Client ID and Client Secret are required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await axios.post(`/api/integrations/config/${provider}`, {
        clientId,
        clientSecret,
      });
      // Small delay for UX
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save credentials.');
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-card border border-border rounded-xl p-4 mt-4"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-medium text-white">Configure {providerName} Credentials</h3>
        </div>
        
        <p className="text-xs text-zinc-400">
          Enter your OAuth Client credentials from the developer portal.
          These are stored securely encrypted.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Client ID</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
              placeholder="Enter Client ID"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Client Secret</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors pr-10"
                placeholder="Enter Client Secret"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <Save className="w-3 h-3" />
            )}
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
