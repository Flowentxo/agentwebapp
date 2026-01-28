'use client';

/**
 * CostCenterTable - Phase 4: Enterprise Cost Center Management
 *
 * Features:
 * - TanStack Table with sorting, filtering
 * - Budget allocation progress bars
 * - Quick allocation modal for budget transfers
 * - Hierarchical display with expand/collapse
 *
 * @author AI Systems Team
 * @version 1.0.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ExpandedState,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronRight,
  Building2,
  ArrowRightLeft,
  MoreHorizontal,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Users,
  Folder,
  TrendingUp,
  Edit2,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// =====================================================
// TYPES
// =====================================================

export interface CostCenter {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  parentCostCenterId?: string | null;
  monthlyBudgetLimitUsd: number;
  usedBudgetUsd: number;
  usagePercentage: number;
  managerId?: string | null;
  isActive: boolean;
  projectCount: number;
  children?: CostCenter[];
}

export interface CostCenterTableProps {
  data: CostCenter[];
  isLoading?: boolean;
  onTransfer?: (source: CostCenter, target: CostCenter) => void;
  onEdit?: (costCenter: CostCenter) => void;
  onDelete?: (costCenter: CostCenter) => void;
  onCreate?: () => void;
  className?: string;
}

// =====================================================
// HELPER COMPONENTS
// =====================================================

/**
 * Progress bar for budget allocation
 */
const AllocationBar = ({
  percentage,
  used,
  limit,
}: {
  percentage: number;
  used: number;
  limit: number;
}) => {
  const getColor = () => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-amber-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStatusIcon = () => {
    if (percentage >= 100) {
      return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
    }
    if (percentage >= 80) {
      return <TrendingUp className="w-3.5 h-3.5 text-amber-400" />;
    }
    return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
  };

  return (
    <div className="w-full min-w-[140px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">
          ${used.toFixed(0)} / ${limit.toFixed(0)}
        </span>
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          <span className="text-xs font-medium">{percentage.toFixed(0)}%</span>
        </div>
      </div>
      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Transfer Modal for quick budget allocation
 */
const TransferModal = ({
  isOpen,
  onClose,
  source,
  costCenters,
  onTransfer,
}: {
  isOpen: boolean;
  onClose: () => void;
  source: CostCenter | null;
  costCenters: CostCenter[];
  onTransfer: (targetId: string, amount: number, reason: string) => void;
}) => {
  const [targetId, setTargetId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableTargets = useMemo(() => {
    return costCenters.filter((cc) => cc.id !== source?.id);
  }, [costCenters, source]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      await onTransfer(targetId, parseFloat(amount), reason);
      onClose();
      setTargetId('');
      setAmount('');
      setReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !source) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-background border border-border/50 rounded-xl shadow-2xl w-full max-w-md p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <ArrowRightLeft className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Budget Transfer</h3>
              <p className="text-sm text-muted-foreground">
                Von: {source.name} ({source.code})
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Target Selection */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Ziel-Abteilung
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                required
              >
                <option value="">Auswählen...</option>
                {availableTargets.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.name} ({cc.code}) - ${cc.monthlyBudgetLimitUsd.toFixed(0)}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Betrag (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  max={source.monthlyBudgetLimitUsd}
                  step="0.01"
                  className="w-full pl-7 pr-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Verfügbar: ${source.monthlyBudgetLimitUsd.toFixed(2)}
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Grund (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Z.B. Q4 Kampagnen-Budget"
                rows={2}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !targetId || !amount}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4" />
                )}
                Übertragen
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export const CostCenterTable: React.FC<CostCenterTableProps> = ({
  data,
  isLoading = false,
  onTransfer,
  onEdit,
  onDelete,
  onCreate,
  className = '',
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [transferSource, setTransferSource] = useState<CostCenter | null>(null);

  // Flatten tree for table display
  const flattenedData = useMemo(() => {
    const flatten = (nodes: CostCenter[], depth = 0): (CostCenter & { depth: number })[] => {
      return nodes.flatMap((node) => [
        { ...node, depth },
        ...(node.children ? flatten(node.children, depth + 1) : []),
      ]);
    };
    return flatten(data);
  }, [data]);

  // Column definitions
  const columnHelper = createColumnHelper<CostCenter & { depth: number }>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Abteilung',
        cell: ({ row, getValue }) => {
          const depth = (row.original as any).depth || 0;
          const hasChildren = row.original.children && row.original.children.length > 0;

          return (
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: `${depth * 20}px` }}
            >
              {hasChildren ? (
                <button
                  onClick={() => row.toggleExpanded()}
                  className="p-0.5 hover:bg-muted/50 rounded"
                >
                  {row.getIsExpanded() ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              ) : (
                <div className="w-5" />
              )}
              <div className="p-1.5 bg-blue-500/10 rounded">
                <Building2 className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm">{getValue()}</p>
                <p className="text-xs text-muted-foreground">{row.original.code}</p>
              </div>
            </div>
          );
        },
      }),

      columnHelper.accessor('monthlyBudgetLimitUsd', {
        header: 'Budget Allocation',
        cell: ({ row }) => (
          <AllocationBar
            percentage={row.original.usagePercentage}
            used={row.original.usedBudgetUsd}
            limit={row.original.monthlyBudgetLimitUsd}
          />
        ),
      }),

      columnHelper.accessor('projectCount', {
        header: 'Projekte',
        cell: ({ getValue }) => (
          <div className="flex items-center gap-1.5">
            <Folder className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{getValue()}</span>
          </div>
        ),
      }),

      columnHelper.accessor('isActive', {
        header: 'Status',
        cell: ({ getValue }) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              getValue()
                ? 'bg-green-500/10 text-green-400'
                : 'bg-muted/30 text-muted-foreground'
            }`}
          >
            {getValue() ? 'Aktiv' : 'Inaktiv'}
          </span>
        ),
      }),

      columnHelper.display({
        id: 'actions',
        header: 'Aktionen',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {onTransfer && (
              <button
                onClick={() => setTransferSource(row.original)}
                className="p-1.5 hover:bg-purple-500/10 rounded-lg transition-colors"
                title="Budget übertragen"
              >
                <ArrowRightLeft className="w-4 h-4 text-purple-400" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(row.original)}
                className="p-1.5 hover:bg-blue-500/10 rounded-lg transition-colors"
                title="Bearbeiten"
              >
                <Edit2 className="w-4 h-4 text-blue-400" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(row.original)}
                className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Löschen"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            )}
          </div>
        ),
      }),
    ],
    [onTransfer, onEdit, onDelete]
  );

  const table = useReactTable({
    data: flattenedData,
    columns,
    state: {
      sorting,
      expanded,
      globalFilter,
    },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => row.children,
  });

  const handleTransfer = useCallback(
    async (targetId: string, amount: number, reason: string) => {
      if (!transferSource || !onTransfer) return;

      const target = flattenedData.find((cc) => cc.id === targetId);
      if (target) {
        onTransfer(transferSource, target);
      }
    },
    [transferSource, flattenedData, onTransfer]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-card/50 rounded-xl border border-border/50 p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card/50 rounded-xl border border-border/50 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold">Cost Centers</h3>
            <p className="text-xs text-muted-foreground">
              {flattenedData.length} Abteilungen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Suchen..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 pr-3 py-1.5 w-48 bg-muted/30 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Create Button */}
          {onCreate && (
            <button
              onClick={onCreate}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Neu
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border/30">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'cursor-pointer select-none hover:text-foreground transition-colors'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Keine Cost Centers gefunden</p>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      {flattenedData.length > 0 && (
        <div className="flex items-center justify-between p-4 border-t border-border/30 bg-muted/10">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Gesamt Budget:</span>{' '}
              <span className="font-semibold">
                ${flattenedData.reduce((sum, cc) => sum + cc.monthlyBudgetLimitUsd, 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Verwendet:</span>{' '}
              <span className="font-semibold">
                ${flattenedData.reduce((sum, cc) => sum + cc.usedBudgetUsd, 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Projekte:</span>{' '}
              <span className="font-semibold">
                {flattenedData.reduce((sum, cc) => sum + cc.projectCount, 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      <TransferModal
        isOpen={!!transferSource}
        onClose={() => setTransferSource(null)}
        source={transferSource}
        costCenters={flattenedData}
        onTransfer={handleTransfer}
      />
    </div>
  );
};

export default CostCenterTable;
