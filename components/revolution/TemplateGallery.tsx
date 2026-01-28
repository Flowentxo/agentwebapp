import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Sparkles,
  MessageCircle,
  BarChart,
  FileText,
  Zap,
  TrendingUp,
  DollarSign,
  Mail,
  Users,
  ShoppingCart,
  Clock,
  Star,
  ArrowRight,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { agentTemplates, type AgentTemplate } from './data';

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect: (template: AgentTemplate) => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  'customer-support': MessageCircle,
  'sales': TrendingUp,
  'content': FileText,
  'hr': Users,
  'analytics': BarChart,
  'ecommerce': ShoppingCart,
};

const COMPLEXITY_COLORS = {
  simple: '#10B981',
  medium: '#F59E0B',
  advanced: '#EF4444'
};

const COMPLEXITY_LABELS = {
  simple: 'Einfach',
  medium: 'Mittel',
  advanced: 'Fortgeschritten'
};

export default function TemplateGallery({ isOpen, onClose, onTemplateSelect }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);

  // Filter templates
  const filteredTemplates = agentTemplates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(new Set(agentTemplates.map(t => t.category)));

  const handleUseTemplate = async (template: AgentTemplate) => {
    setCloningId(template.id);
    // Simulate cloning process
    await new Promise(resolve => setTimeout(resolve, 1500));
    onTemplateSelect(template);
    onClose();
    setCloningId(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-7xl max-h-[90vh] bg-surface-0 rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="border-b border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-text flex items-center gap-3">
                  <Sparkles className="h-8 w-8 text-blue-400" />
                  Agent Templates
                </h2>
                <p className="text-text-muted mt-2">
                  Starte mit vorgefertigten Agent-Vorlagen für schnelle Einrichtung
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-text-muted transition hover:bg-card/5 hover:text-text"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Search & Filters */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
                <Input
                  type="text"
                  placeholder="Templates durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-surface-1 text-text outline-none transition focus:border-blue-500/50"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition ${
                    selectedCategory === null
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-white/10 bg-surface-1 text-text-muted hover:bg-card/5'
                  }`}
                >
                  Alle Kategorien
                </button>
                
                {categories.map((category) => {
                  const Icon = CATEGORY_ICONS[category] || Zap;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition ${
                        selectedCategory === category
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-white/10 bg-surface-1 text-text-muted hover:bg-card/5'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredTemplates.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center max-w-md">
                  <Search className="h-16 w-16 text-text-muted opacity-30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-text mb-2">Keine Templates gefunden</h3>
                  <p className="text-text-muted">
                    Versuche es mit anderen Suchbegriffen oder wähle eine andere Kategorie
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => {
                  const Icon = CATEGORY_ICONS[template.category] || Zap;
                  const isCloning = cloningId === template.id;
                  const complexityColor = COMPLEXITY_COLORS[template.complexity];

                  return (
                    <motion.div
                      key={template.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="group relative rounded-xl border border-white/10 bg-surface-1 p-6 transition-all duration-200 hover:border-white/20 hover:bg-card/5 hover:shadow-xl"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${template.color}20` }}
                          >
                            <Icon className="h-6 w-6" style={{ color: template.color }} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-text">{template.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span 
                                className="px-2 py-0.5 rounded-md text-xs font-medium"
                                style={{ 
                                  backgroundColor: `${complexityColor}20`, 
                                  color: complexityColor 
                                }}
                              >
                                {COMPLEXITY_LABELS[template.complexity]}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-text-muted">
                                <Clock className="h-3 w-3" />
                                {template.estimatedTime}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-text-muted text-sm mb-4 line-clamp-3">
                        {template.description}
                      </p>

                      {/* Capabilities */}
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-text-muted mb-2">FÄHIGKEITEN</h4>
                        <div className="flex flex-wrap gap-1">
                          {template.capabilities.slice(0, 3).map((capability, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-card/5 text-xs text-text-muted rounded-md"
                            >
                              {capability}
                            </span>
                          ))}
                          {template.capabilities.length > 3 && (
                            <span className="px-2 py-1 bg-card/5 text-xs text-text-muted rounded-md">
                              +{template.capabilities.length - 3} mehr
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Use Cases */}
                      <div className="mb-6">
                        <h4 className="text-xs font-medium text-text-muted mb-2">ANWENDUNGSFÄLLE</h4>
                        <div className="flex flex-wrap gap-1">
                          {template.useCases.map((useCase, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-500/10 text-xs text-blue-400 rounded-md"
                            >
                              {useCase}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        onClick={() => handleUseTemplate(template)}
                        disabled={isCloning}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-200"
                      >
                        {isCloning ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Wird erstellt...
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Template verwenden
                          </>
                        )}
                      </Button>

                      {/* Hover Effect */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}