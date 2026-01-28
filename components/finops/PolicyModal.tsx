'use client';

import { useState, useEffect } from 'react';
import { X, Shield, AlertTriangle, Info } from 'lucide-react';
import { BudgetPolicy } from '@/lib/finops-terminal-data';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (policy: Partial<BudgetPolicy>) => void;
  editingPolicy?: BudgetPolicy | null;
}

export function PolicyModal({ isOpen, onClose, onSave, editingPolicy }: PolicyModalProps) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<BudgetPolicy['scope']>('global');
  const [scopeTarget, setScopeTarget] = useState('');
  const [thresholdType, setThresholdType] = useState<BudgetPolicy['thresholdType']>('absolute');
  const [threshold, setThreshold] = useState('');
  const [action, setAction] = useState<BudgetPolicy['action']>('alert');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (editingPolicy) {
      setName(editingPolicy.name);
      setScope(editingPolicy.scope);
      setScopeTarget(editingPolicy.scopeTarget || '');
      setThresholdType(editingPolicy.thresholdType);
      setThreshold(editingPolicy.threshold.toString());
      setAction(editingPolicy.action);
    } else {
      // Reset form
      setName('');
      setScope('global');
      setScopeTarget('');
      setThresholdType('absolute');
      setThreshold('');
      setAction('alert');
    }
    setErrors({});
  }, [editingPolicy, isOpen]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Policy name is required';
    }

    if (scope !== 'global' && !scopeTarget.trim()) {
      newErrors.scopeTarget = 'Target is required for non-global scope';
    }

    if (!threshold || isNaN(Number(threshold)) || Number(threshold) <= 0) {
      newErrors.threshold = 'Valid threshold is required';
    }

    if (thresholdType === 'percentage' && Number(threshold) > 100) {
      newErrors.threshold = 'Percentage cannot exceed 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validate()) return;

    onSave({
      id: editingPolicy?.id,
      name: name.trim(),
      scope,
      scopeTarget: scope !== 'global' ? scopeTarget.trim() : undefined,
      thresholdType,
      threshold: Number(threshold),
      action,
      status: 'active',
      limit: thresholdType === 'absolute' ? Number(threshold) : 100,
      currentUsage: 0,
      createdAt: editingPolicy?.createdAt || new Date().toISOString(),
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-100">
                  {editingPolicy ? 'Edit Policy' : 'Create Budget Policy'}
                </h2>
                <p className="text-xs text-zinc-500">
                  Define spending limits and actions
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Policy Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Policy Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Daily Spend Limit"
                className={`w-full px-3 py-2 text-sm bg-zinc-800 border rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors ${
                  errors.name ? 'border-red-500' : 'border-zinc-700'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Scope */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Scope
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as BudgetPolicy['scope'])}
                  className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="global">Global</option>
                  <option value="workspace">Workspace</option>
                  <option value="user">User</option>
                  <option value="agent">Agent</option>
                </select>
              </div>

              {scope !== 'global' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Target
                  </label>
                  <input
                    type="text"
                    value={scopeTarget}
                    onChange={(e) => setScopeTarget(e.target.value)}
                    placeholder={
                      scope === 'workspace'
                        ? 'Workspace name'
                        : scope === 'user'
                          ? 'user@email.com'
                          : 'Agent name'
                    }
                    className={`w-full px-3 py-2 text-sm bg-zinc-800 border rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors ${
                      errors.scopeTarget ? 'border-red-500' : 'border-zinc-700'
                    }`}
                  />
                  {errors.scopeTarget && (
                    <p className="mt-1 text-xs text-red-400">{errors.scopeTarget}</p>
                  )}
                </div>
              )}
            </div>

            {/* Threshold */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Threshold Type
                </label>
                <select
                  value={thresholdType}
                  onChange={(e) =>
                    setThresholdType(e.target.value as BudgetPolicy['thresholdType'])
                  }
                  className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="absolute">Absolute ($)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Threshold Value
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                    {thresholdType === 'absolute' ? '$' : ''}
                  </span>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder={thresholdType === 'absolute' ? '500.00' : '80'}
                    className={`w-full px-3 py-2 text-sm bg-zinc-800 border rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors ${
                      thresholdType === 'absolute' ? 'pl-6' : ''
                    } ${errors.threshold ? 'border-red-500' : 'border-zinc-700'}`}
                  />
                  {thresholdType === 'percentage' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                      %
                    </span>
                  )}
                </div>
                {errors.threshold && (
                  <p className="mt-1 text-xs text-red-400">{errors.threshold}</p>
                )}
              </div>
            </div>

            {/* Action */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Action when triggered
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['alert', 'throttle', 'block'] as const).map((actionType) => (
                  <button
                    key={actionType}
                    onClick={() => setAction(actionType)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg border transition-colors ${
                      action === actionType
                        ? actionType === 'alert'
                          ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                          : actionType === 'throttle'
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {actionType === 'alert' && <Info className="w-4 h-4" />}
                    {actionType === 'throttle' && <AlertTriangle className="w-4 h-4" />}
                    {actionType === 'block' && <X className="w-4 h-4" />}
                    <span className="capitalize">{actionType}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                {action === 'alert' && 'Send notifications when threshold is reached'}
                {action === 'throttle' && 'Reduce request rate when threshold is reached'}
                {action === 'block' && 'Block all requests when threshold is reached'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-800 bg-zinc-900/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              {editingPolicy ? 'Save Changes' : 'Create Policy'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
