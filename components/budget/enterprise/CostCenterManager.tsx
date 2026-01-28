'use client';

/**
 * Enterprise Cost Center Manager Component
 * Manages departmental budget allocation with CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  ChevronRight,
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  Check,
  X,
  Search,
  Filter,
  MoreVertical,
} from 'lucide-react';

interface CostCenter {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  parentCostCenterId?: string;
  managerId?: string;
  monthlyBudgetLimitUsd?: number;
  monthlyTokenLimit?: number;
  usedBudgetUsd?: number;
  usedTokens?: number;
  allowOverspend: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  usagePercentage?: number;
  projectCount?: number;
}

interface CostCenterFormData {
  name: string;
  code: string;
  description: string;
  monthlyBudgetLimitUsd: string;
  monthlyTokenLimit: string;
  allowOverspend: boolean;
}

interface CostCenterManagerProps {
  className?: string;
  onCostCenterSelect?: (costCenter: CostCenter) => void;
}

export function CostCenterManager({
  className = '',
  onCostCenterSelect,
}: CostCenterManagerProps) {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [formData, setFormData] = useState<CostCenterFormData>({
    name: '',
    code: '',
    description: '',
    monthlyBudgetLimitUsd: '',
    monthlyTokenLimit: '',
    allowOverspend: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCostCenters = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/budget/enterprise/cost-centers?includeStats=true');
      if (!response.ok) throw new Error('Failed to fetch cost centers');
      const data = await response.json();
      setCostCenters(data.data.costCenters || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCostCenters();
  }, [fetchCostCenters]);

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      monthlyBudgetLimitUsd: '',
      monthlyTokenLimit: '',
      allowOverspend: false,
    });
    setEditingCostCenter(null);
  };

  const openEditModal = (costCenter: CostCenter) => {
    setEditingCostCenter(costCenter);
    setFormData({
      name: costCenter.name,
      code: costCenter.code,
      description: costCenter.description || '',
      monthlyBudgetLimitUsd: costCenter.monthlyBudgetLimitUsd?.toString() || '',
      monthlyTokenLimit: costCenter.monthlyTokenLimit?.toString() || '',
      allowOverspend: costCenter.allowOverspend,
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        monthlyBudgetLimitUsd: formData.monthlyBudgetLimitUsd
          ? parseFloat(formData.monthlyBudgetLimitUsd)
          : undefined,
        monthlyTokenLimit: formData.monthlyTokenLimit
          ? parseInt(formData.monthlyTokenLimit)
          : undefined,
      };

      const url = '/api/budget/enterprise/cost-centers';
      const method = editingCostCenter ? 'PATCH' : 'POST';
      const body = editingCostCenter
        ? { id: editingCostCenter.id, ...payload }
        : payload;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save cost center');
      }

      await fetchCostCenters();
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCostCenters = costCenters.filter(
    (cc) =>
      cc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cc.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getUsageColor = (percentage: number | undefined) => {
    if (!percentage) return 'bg-card/20';
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <div className={`rounded-3xl bg-card/[0.02] border border-white/[0.05] p-8 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-card/10 rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-card/10 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl bg-card/[0.02] border border-white/[0.05] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <Building2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">
                Cost Centers
              </h3>
              <p className="text-[10px] text-white/30 mt-0.5">
                {costCenters.length} departments
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Cost Center
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            placeholder="Search cost centers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="m-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-card/10 rounded"
          >
            <X className="h-4 w-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Cost Center List */}
      <div className="p-6 space-y-3 max-h-[500px] overflow-y-auto">
        {filteredCostCenters.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-white/10 mx-auto mb-4" />
            <p className="text-sm text-white/40">No cost centers found</p>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="mt-4 text-sm text-emerald-400 hover:text-emerald-300"
            >
              Create your first cost center
            </button>
          </div>
        ) : (
          filteredCostCenters.map((costCenter) => (
            <motion.div
              key={costCenter.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-card/[0.03] border border-white/[0.05] hover:bg-card/[0.05] transition-colors cursor-pointer group"
              onClick={() => onCostCenterSelect?.(costCenter)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-white">{costCenter.name}</h4>
                    <span className="px-2 py-0.5 rounded-full bg-card/10 text-[10px] text-white/50 font-mono">
                      {costCenter.code}
                    </span>
                    {!costCenter.isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-[10px] text-red-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  {costCenter.description && (
                    <p className="text-xs text-white/40 mb-3">{costCenter.description}</p>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-white/30" />
                      <span className="text-xs text-white/60">
                        {formatCurrency(costCenter.usedBudgetUsd || 0)} /{' '}
                        {formatCurrency(costCenter.monthlyBudgetLimitUsd)}
                      </span>
                    </div>
                    {costCenter.usagePercentage !== undefined && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-white/30" />
                        <span className="text-xs text-white/60">
                          {costCenter.usagePercentage.toFixed(1)}% used
                        </span>
                      </div>
                    )}
                    {costCenter.allowOverspend && (
                      <span className="text-[10px] text-orange-400">Overspend allowed</span>
                    )}
                  </div>

                  {/* Usage Bar */}
                  {costCenter.monthlyBudgetLimitUsd && (
                    <div className="mt-3 h-1.5 bg-card/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(costCenter.usagePercentage || 0, 100)}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`h-full rounded-full ${getUsageColor(costCenter.usagePercentage)}`}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(costCenter);
                    }}
                    className="p-2 rounded-lg hover:bg-card/10 transition-colors"
                  >
                    <Edit3 className="h-4 w-4 text-white/40" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-white/20" />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#1a1a2e] border border-white/10 rounded-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-6">
                {editingCostCenter ? 'Edit Cost Center' : 'Create Cost Center'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                      placeholder="Engineering"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Code *</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 font-mono"
                      placeholder="ENG-001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
                    placeholder="Optional description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Monthly Budget (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.monthlyBudgetLimitUsd}
                      onChange={(e) => setFormData({ ...formData, monthlyBudgetLimitUsd: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Monthly Token Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.monthlyTokenLimit}
                      onChange={(e) => setFormData({ ...formData, monthlyTokenLimit: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                      placeholder="1000000"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, allowOverspend: !formData.allowOverspend })}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      formData.allowOverspend ? 'bg-orange-500' : 'bg-card/10'
                    }`}
                  >
                    <motion.div
                      animate={{ x: formData.allowOverspend ? 16 : 2 }}
                      className="w-5 h-5 bg-card rounded-full shadow-lg"
                    />
                  </button>
                  <span className="text-sm text-white/60">Allow overspend</span>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-3 rounded-xl bg-card/5 hover:bg-card/10 border border-white/[0.05] text-sm font-medium text-white/60 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-sm font-bold text-white transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingCostCenter ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
