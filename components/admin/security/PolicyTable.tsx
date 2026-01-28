/**
 * Policy Table Component
 * Displays and manages security policies
 */

'use client';

import { useState } from 'react';
import { Shield, Edit2, Check, X } from 'lucide-react';
import type { SecurityPolicy } from '@/lib/mock-data/security';

interface PolicyTableProps {
  policies: SecurityPolicy[];
  onToggle: (policyId: string, enabled: boolean) => void;
  onUpdateThreshold: (policyId: string, threshold: number) => void;
}

export default function PolicyTable({ policies, onToggle, onUpdateThreshold }: PolicyTableProps) {
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const handleStartEdit = (policy: SecurityPolicy) => {
    setEditingPolicy(policy.id);
    setEditValue(policy.threshold);
  };

  const handleSaveEdit = (policyId: string) => {
    onUpdateThreshold(policyId, editValue);
    setEditingPolicy(null);
  };

  const handleCancelEdit = () => {
    setEditingPolicy(null);
    setEditValue(0);
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm uppercase tracking-wide text-white/50 font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Security Policies
        </h3>
        <span className="text-xs text-white/40">
          {policies.filter((p) => p.enabled).length} / {policies.length} aktiv
        </span>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-white/50 font-semibold">
                Policy
              </th>
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-white/50 font-semibold">
                Status
              </th>
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-white/50 font-semibold">
                Threshold
              </th>
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-white/50 font-semibold">
                Violations
              </th>
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-white/50 font-semibold">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.id} className="border-b border-white/5 hover:bg-card/[0.02] transition-colors">
                <td className="py-4 px-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{policy.name}</p>
                    <p className="text-xs text-white/50 mt-0.5">{policy.description}</p>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <button
                    onClick={() => onToggle(policy.id, !policy.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      policy.enabled ? 'bg-green-500' : 'bg-card/10'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${
                        policy.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>
                <td className="py-4 px-4">
                  {editingPolicy === policy.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 rounded bg-card/[0.02] border border-white/10 text-white text-sm focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none"
                      />
                      <button
                        onClick={() => handleSaveEdit(policy.id)}
                        className="p-1 rounded hover:bg-green-500/20 text-green-400 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-mono">{policy.threshold}</span>
                      <button
                        onClick={() => handleStartEdit(policy)}
                        className="p-1 rounded hover:bg-card/10 text-white/40 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`text-sm font-semibold ${
                      policy.violations > 10
                        ? 'text-red-400'
                        : policy.violations > 5
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    }`}
                  >
                    {policy.violations}
                  </span>
                  <span className="text-xs text-white/40 ml-1">letzte 24h</span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-white/50">{formatLastUpdated(policy.lastUpdated)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {policies.map((policy) => (
          <div key={policy.id} className="rounded-xl bg-card/[0.02] border border-white/10 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white mb-1">{policy.name}</p>
                <p className="text-xs text-white/50">{policy.description}</p>
              </div>
              <button
                onClick={() => onToggle(policy.id, !policy.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ml-3 flex-shrink-0 ${
                  policy.enabled ? 'bg-green-500' : 'bg-card/10'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${
                    policy.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-white/50 mb-1">Threshold</p>
                {editingPolicy === policy.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 rounded bg-card/[0.02] border border-white/10 text-white text-xs focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none"
                    />
                    <button
                      onClick={() => handleSaveEdit(policy.id)}
                      className="p-1 rounded hover:bg-green-500/20 text-green-400 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-white font-mono">{policy.threshold}</span>
                    <button
                      onClick={() => handleStartEdit(policy)}
                      className="p-0.5 rounded hover:bg-card/10 text-white/40 hover:text-white transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <p className="text-white/50 mb-1">Violations</p>
                <p
                  className={`font-semibold ${
                    policy.violations > 10
                      ? 'text-red-400'
                      : policy.violations > 5
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}
                >
                  {policy.violations}
                </p>
              </div>

              <div>
                <p className="text-white/50 mb-1">Updated</p>
                <p className="text-white">{formatLastUpdated(policy.lastUpdated)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
