'use client';

/**
 * Enterprise Project Manager Component
 * Manages projects for granular cost tracking with full CRUD
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban,
  Plus,
  Edit3,
  Archive,
  ChevronRight,
  DollarSign,
  Calendar,
  Clock,
  AlertTriangle,
  Check,
  X,
  Search,
  Filter,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'archived';

interface Project {
  id: string;
  costCenterId?: string;
  costCenterName?: string;
  name: string;
  code: string;
  description?: string;
  ownerId: string;
  status: ProjectStatus;
  allocatedBudgetUsd?: number;
  usedBudgetUsd?: number;
  allocatedTokens?: number;
  usedTokens?: number;
  startDate?: string;
  endDate?: string;
  completedAt?: string;
  dailyBudgetLimitUsd?: number;
  dailyTokenLimit?: number;
  allowedModels?: string[];
  allowedAgents?: string[];
  createdAt: string;
  updatedAt: string;
  usagePercentage?: number;
}

interface ProjectFormData {
  name: string;
  code: string;
  description: string;
  costCenterId: string;
  allocatedBudgetUsd: string;
  allocatedTokens: string;
  startDate: string;
  endDate: string;
  dailyBudgetLimitUsd: string;
  dailyTokenLimit: string;
}

interface ProjectManagerProps {
  className?: string;
  costCenterId?: string;
  onProjectSelect?: (project: Project) => void;
}

const statusConfig: Record<ProjectStatus, { label: string; color: string; icon: any }> = {
  planning: { label: 'Planning', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
  active: { label: 'Active', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Play },
  paused: { label: 'Paused', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Pause },
  completed: { label: 'Completed', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: CheckCircle2 },
  archived: { label: 'Archived', color: 'bg-muted/500/20 text-muted-foreground border-gray-500/30', icon: Archive },
};

export function ProjectManager({
  className = '',
  costCenterId,
  onProjectSelect,
}: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    code: '',
    description: '',
    costCenterId: costCenterId || '',
    allocatedBudgetUsd: '',
    allocatedTokens: '',
    startDate: '',
    endDate: '',
    dailyBudgetLimitUsd: '',
    dailyTokenLimit: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      let url = '/api/budget/enterprise/projects?includeUsage=true';
      if (costCenterId) {
        url += `&costCenterId=${costCenterId}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data.data.projects || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [costCenterId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      costCenterId: costCenterId || '',
      allocatedBudgetUsd: '',
      allocatedTokens: '',
      startDate: '',
      endDate: '',
      dailyBudgetLimitUsd: '',
      dailyTokenLimit: '',
    });
    setEditingProject(null);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description || '',
      costCenterId: project.costCenterId || '',
      allocatedBudgetUsd: project.allocatedBudgetUsd?.toString() || '',
      allocatedTokens: project.allocatedTokens?.toString() || '',
      startDate: project.startDate?.split('T')[0] || '',
      endDate: project.endDate?.split('T')[0] || '',
      dailyBudgetLimitUsd: project.dailyBudgetLimitUsd?.toString() || '',
      dailyTokenLimit: project.dailyTokenLimit?.toString() || '',
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        allocatedBudgetUsd: formData.allocatedBudgetUsd ? parseFloat(formData.allocatedBudgetUsd) : undefined,
        allocatedTokens: formData.allocatedTokens ? parseInt(formData.allocatedTokens) : undefined,
        dailyBudgetLimitUsd: formData.dailyBudgetLimitUsd ? parseFloat(formData.dailyBudgetLimitUsd) : undefined,
        dailyTokenLimit: formData.dailyTokenLimit ? parseInt(formData.dailyTokenLimit) : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        costCenterId: formData.costCenterId || undefined,
      };

      const url = '/api/budget/enterprise/projects';
      const method = editingProject ? 'PATCH' : 'POST';
      const body = editingProject ? { id: editingProject.id, ...payload } : payload;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save project');
      }

      await fetchProjects();
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (project: Project, newStatus: ProjectStatus) => {
    try {
      const response = await fetch('/api/budget/enterprise/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      await fetchProjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleArchive = async (project: Project) => {
    if (!confirm(`Archive project "${project.name}"? This action cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/budget/enterprise/projects?id=${project.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to archive project');
      await fetchProjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
              <div key={i} className="h-24 bg-card/10 rounded-xl" />
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
            <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <FolderKanban className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">
                Projects
              </h3>
              <p className="text-[10px] text-white/30 mt-0.5">
                {projects.length} projects
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
            className="px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-white/20"
          >
            <option value="all">All Status</option>
            {Object.entries(statusConfig).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="m-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-card/10 rounded">
            <X className="h-4 w-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Project List */}
      <div className="p-6 space-y-3 max-h-[500px] overflow-y-auto">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="h-12 w-12 text-white/10 mx-auto mb-4" />
            <p className="text-sm text-white/40">No projects found</p>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="mt-4 text-sm text-purple-400 hover:text-purple-300"
            >
              Create your first project
            </button>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const StatusIcon = statusConfig[project.status]?.icon || Clock;
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-card/[0.03] border border-white/[0.05] hover:bg-card/[0.05] transition-colors cursor-pointer group"
                onClick={() => onProjectSelect?.(project)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white">{project.name}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-card/10 text-[10px] text-white/50 font-mono">
                        {project.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] border flex items-center gap-1 ${
                          statusConfig[project.status]?.color
                        }`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig[project.status]?.label}
                      </span>
                    </div>

                    {project.description && (
                      <p className="text-xs text-white/40 mb-2">{project.description}</p>
                    )}

                    {project.costCenterName && (
                      <p className="text-[10px] text-white/30 mb-2">
                        Cost Center: {project.costCenterName}
                      </p>
                    )}

                    {/* Stats Row */}
                    <div className="flex items-center gap-6 text-xs text-white/60">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-white/30" />
                        <span>
                          {formatCurrency(project.usedBudgetUsd || 0)} /{' '}
                          {formatCurrency(project.allocatedBudgetUsd)}
                        </span>
                      </div>
                      {project.startDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-white/30" />
                          <span>
                            {formatDate(project.startDate)}
                            {project.endDate && ` - ${formatDate(project.endDate)}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Usage Bar */}
                    {project.allocatedBudgetUsd && (
                      <div className="mt-3 h-1.5 bg-card/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(project.usagePercentage || 0, 100)}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className={`h-full rounded-full ${getUsageColor(project.usagePercentage)}`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {project.status === 'active' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(project, 'paused');
                        }}
                        className="p-2 rounded-lg hover:bg-card/10 transition-colors"
                        title="Pause Project"
                      >
                        <Pause className="h-4 w-4 text-orange-400" />
                      </button>
                    )}
                    {project.status === 'paused' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(project, 'active');
                        }}
                        className="p-2 rounded-lg hover:bg-card/10 transition-colors"
                        title="Resume Project"
                      >
                        <Play className="h-4 w-4 text-green-400" />
                      </button>
                    )}
                    {(project.status === 'active' || project.status === 'paused') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(project, 'completed');
                        }}
                        className="p-2 rounded-lg hover:bg-card/10 transition-colors"
                        title="Mark Complete"
                      >
                        <CheckCircle2 className="h-4 w-4 text-purple-400" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(project);
                      }}
                      className="p-2 rounded-lg hover:bg-card/10 transition-colors"
                      title="Edit Project"
                    >
                      <Edit3 className="h-4 w-4 text-white/40" />
                    </button>
                    {project.status !== 'archived' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(project);
                        }}
                        className="p-2 rounded-lg hover:bg-card/10 transition-colors"
                        title="Archive Project"
                      >
                        <Archive className="h-4 w-4 text-white/40" />
                      </button>
                    )}
                    <ChevronRight className="h-4 w-4 text-white/20 ml-2" />
                  </div>
                </div>
              </motion.div>
            );
          })
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
              className="w-full max-w-lg bg-[#1a1a2e] border border-white/10 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-6">
                {editingProject ? 'Edit Project' : 'Create Project'}
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
                      placeholder="Q1 Marketing Campaign"
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
                      placeholder="MKT-Q1-2025"
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
                    <label className="block text-xs text-white/40 mb-1.5">Budget (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.allocatedBudgetUsd}
                      onChange={(e) => setFormData({ ...formData, allocatedBudgetUsd: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Token Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.allocatedTokens}
                      onChange={(e) => setFormData({ ...formData, allocatedTokens: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                      placeholder="500000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-white/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-white/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Daily Budget Limit (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.dailyBudgetLimitUsd}
                      onChange={(e) => setFormData({ ...formData, dailyBudgetLimitUsd: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                      placeholder="200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Daily Token Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.dailyTokenLimit}
                      onChange={(e) => setFormData({ ...formData, dailyTokenLimit: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                      placeholder="20000"
                    />
                  </div>
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
                    className="flex-1 px-4 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-sm font-bold text-white transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingProject ? 'Update' : 'Create'}
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
