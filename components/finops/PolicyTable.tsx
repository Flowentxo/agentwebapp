'use client';

import { useState } from 'react';
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Power,
  Copy,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  BudgetPolicy,
  formatCurrency,
  formatTimestampShort,
  getStatusClasses,
  getScopeClasses,
  getActionClasses,
  getProgressColor,
} from '@/lib/finops-terminal-data';

interface PolicyTableProps {
  policies: BudgetPolicy[];
  onCreatePolicy: () => void;
  onEditPolicy: (policy: BudgetPolicy) => void;
  onDeletePolicy: (id: string) => void;
  onTogglePolicy: (id: string) => void;
}

type SortField = 'name' | 'scope' | 'threshold' | 'usage' | 'status';
type SortDirection = 'asc' | 'desc';

export function PolicyTable({
  policies,
  onCreatePolicy,
  onEditPolicy,
  onDeletePolicy,
  onTogglePolicy,
}: PolicyTableProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Sort policies
  const sortedPolicies = [...policies].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'scope':
        comparison = a.scope.localeCompare(b.scope);
        break;
      case 'threshold':
        comparison = a.threshold - b.threshold;
        break;
      case 'usage':
        comparison = (a.currentUsage / a.limit) - (b.currentUsage / b.limit);
        break;
      case 'status':
        const statusOrder = { triggered: 0, active: 1, disabled: 2 };
        comparison = statusOrder[a.status] - statusOrder[b.status];
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-zinc-600" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-blue-400" />
    ) : (
      <ChevronDown className="w-3 h-3 text-blue-400" />
    );
  };

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-zinc-200">Budget Policies</h3>
          <span className="px-1.5 py-0.5 text-[10px] bg-zinc-800 text-zinc-400 rounded">
            {policies.length}
          </span>
        </div>

        <button
          onClick={onCreatePolicy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          New Policy
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/30">
              <th className="text-left px-4 py-2">
                <button
                  onClick={() => toggleSort('name')}
                  className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
                >
                  Policy Name
                  <SortIndicator field="name" />
                </button>
              </th>
              <th className="text-left px-4 py-2">
                <button
                  onClick={() => toggleSort('scope')}
                  className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
                >
                  Scope
                  <SortIndicator field="scope" />
                </button>
              </th>
              <th className="text-left px-4 py-2">
                <button
                  onClick={() => toggleSort('threshold')}
                  className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
                >
                  Threshold
                  <SortIndicator field="threshold" />
                </button>
              </th>
              <th className="text-left px-4 py-2 w-48">
                <button
                  onClick={() => toggleSort('usage')}
                  className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
                >
                  Current Usage
                  <SortIndicator field="usage" />
                </button>
              </th>
              <th className="text-left px-4 py-2">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Action
                </span>
              </th>
              <th className="text-left px-4 py-2">
                <button
                  onClick={() => toggleSort('status')}
                  className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
                >
                  Status
                  <SortIndicator field="status" />
                </button>
              </th>
              <th className="w-12 px-4 py-2"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800/50">
            {sortedPolicies.map((policy) => {
              const statusClasses = getStatusClasses(policy.status);
              const scopeClasses = getScopeClasses(policy.scope);
              const actionClasses = getActionClasses(policy.action);
              const usagePercent = (policy.currentUsage / policy.limit) * 100;
              const progressColor = getProgressColor(usagePercent);

              return (
                <tr
                  key={policy.id}
                  className="group hover:bg-zinc-800/30 transition-colors"
                >
                  {/* Name */}
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-zinc-200">
                        {policy.name}
                      </span>
                      {policy.scopeTarget && (
                        <span className="text-[10px] text-zinc-500">
                          {policy.scopeTarget}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Scope */}
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${scopeClasses.bg} ${scopeClasses.text}`}
                    >
                      {policy.scope}
                    </span>
                  </td>

                  {/* Threshold */}
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-zinc-300">
                      {policy.thresholdType === 'absolute'
                        ? formatCurrency(policy.threshold)
                        : `${policy.threshold}%`}
                    </span>
                  </td>

                  {/* Usage */}
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-400">
                          {policy.thresholdType === 'absolute'
                            ? formatCurrency(policy.currentUsage)
                            : `${policy.currentUsage.toFixed(1)}%`}
                        </span>
                        <span className="text-zinc-500">
                          {usagePercent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${progressColor} transition-all duration-300`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${actionClasses.bg} ${actionClasses.text}`}
                    >
                      {policy.action}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border ${statusClasses.bg} ${statusClasses.text} ${statusClasses.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusClasses.dot}`} />
                        {policy.status}
                      </span>
                      {policy.lastTriggered && (
                        <span className="flex items-center gap-1 text-[9px] text-zinc-500">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTimestampShort(policy.lastTriggered)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-2.5">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenMenuId(openMenuId === policy.id ? null : policy.id)
                        }
                        className="p-1 rounded hover:bg-zinc-700 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                      </button>

                      {openMenuId === policy.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 z-50 w-36 py-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl">
                            <button
                              onClick={() => {
                                onEditPolicy(policy);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                // Duplicate logic
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                              Duplicate
                            </button>
                            <button
                              onClick={() => {
                                onTogglePolicy(policy.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
                            >
                              <Power className="w-3 h-3" />
                              {policy.status === 'disabled' ? 'Enable' : 'Disable'}
                            </button>
                            <div className="my-1 border-t border-zinc-700" />
                            <button
                              onClick={() => {
                                onDeletePolicy(policy.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {policies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-8 h-8 text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-400 mb-4">No budget policies configured</p>
          <button
            onClick={onCreatePolicy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Create First Policy
          </button>
        </div>
      )}
    </div>
  );
}
