'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { agentPersonas } from '@/lib/agents/personas';
import { Search, Bot, Sparkles, MessageSquare, ChevronRight, Filter } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  BentoCard,
  Badge,
  Button,
  EmptyState,
} from '@/components/ui/premium';
import { tokens } from '@/lib/design-system';

export default function AgentsBrowsePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { value: 'all', label: 'Alle Agents', icon: Bot },
    { value: 'marketing', label: 'Marketing', icon: Sparkles },
    { value: 'data', label: 'Daten & Analytics', icon: Bot },
    { value: 'support', label: 'Support', icon: MessageSquare },
    { value: 'operations', label: 'Operations', icon: Bot },
    { value: 'creative', label: 'Kreativ', icon: Sparkles },
    { value: 'technical', label: 'Technisch', icon: Bot }
  ];

  const filteredAgents = useMemo(() => {
    return agentPersonas.filter(agent => {
      const matchesSearch =
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || agent.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="AI Agents"
        subtitle={`Wähle aus ${agentPersonas.length} spezialisierten AI-Agents für deine Aufgaben`}
        actions={
          <Button variant="gradient" onClick={() => router.push('/agents/studio')}>
            Agent erstellen
          </Button>
        }
      />

      {/* Search & Filters */}
      <BentoCard delay={0.1} className="!p-6">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder="Suche nach Name, Rolle oder Spezialisierung..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-card/[0.03] border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${selectedCategory === category.value
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-card/5 text-white/60 hover:bg-card/10 hover:text-white'}
              `}
            >
              <category.icon className="w-4 h-4" />
              {category.label}
            </button>
          ))}
        </div>
      </BentoCard>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">
          <span className="text-white font-semibold">{filteredAgents.length}</span> {filteredAgents.length === 1 ? 'Agent' : 'Agents'} gefunden
        </p>
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Filter className="w-4 h-4" />
          <span>Sortiert nach Beliebtheit</span>
        </div>
      </div>

      {/* Agents Grid */}
      <AnimatePresence mode="popLayout">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent, index) => (
            <PremiumAgentCard
              key={agent.id}
              agent={agent}
              index={index}
              onClick={() => router.push(`/agents/${agent.id}/chat`)}
            />
          ))}
        </div>
      </AnimatePresence>

      {/* Empty State */}
      {filteredAgents.length === 0 && (
        <EmptyState
          icon={<Search className="w-12 h-12" />}
          title="Keine Agents gefunden"
          description={`Keine Agents für "${searchQuery || selectedCategory}" gefunden. Versuche eine andere Suche.`}
          action={
            <Button variant="secondary" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
              Filter zurücksetzen
            </Button>
          }
        />
      )}
    </PageContainer>
  );
}

// Premium Agent Card Component
interface PremiumAgentCardProps {
  agent: typeof agentPersonas[0];
  index: number;
  onClick: () => void;
}

function PremiumAgentCard({ agent, index, onClick }: PremiumAgentCardProps) {
  const Icon = agent.icon;

  // Convert hex color to RGB for glow effect
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '99, 102, 241';
  };

  const rgbColor = hexToRgb(agent.color);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div
        className="relative p-6 rounded-[32px] border border-white/10 overflow-hidden transition-all duration-500 hover:border-white/20"
        style={{
          background: tokens.bgCard,
          backdropFilter: 'blur(50px)',
        }}
      >
        {/* Glow Effect on Hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(600px circle at 50% 0%, rgba(${rgbColor}, 0.15), transparent 60%)`,
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Header: Avatar + Name */}
          <div className="flex items-start gap-4 mb-4">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${agent.color}40, ${agent.color}20)`,
                border: `1px solid ${agent.color}40`,
                boxShadow: `0 0 30px ${agent.color}20`,
              }}
            >
              <Icon className="w-7 h-7" style={{ color: agent.color }} />
            </div>

            {/* Name & Role */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                {agent.name}
              </h3>
              <p className="text-sm text-white/50 truncate">{agent.role}</p>
            </div>

            {/* Status Badge */}
            {agent.status !== 'active' && (
              <Badge
                text={agent.status === 'beta' ? 'BETA' : 'BALD'}
                color={agent.status === 'beta' ? 'yellow' : 'white'}
              />
            )}
          </div>

          {/* Bio */}
          <p className="text-sm text-white/40 leading-relaxed mb-4 line-clamp-2">
            {agent.bio}
          </p>

          {/* Specialties */}
          <div className="flex flex-wrap gap-2 mb-4">
            {agent.specialties.slice(0, 3).map((specialty) => (
              <span
                key={specialty}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-card/5 text-white/50 border border-white/5"
              >
                {specialty}
              </span>
            ))}
            {agent.specialties.length > 3 && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-card/5 text-white/30 border border-white/5">
                +{agent.specialties.length - 3}
              </span>
            )}
          </div>

          {/* Action Button */}
          <div
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: `linear-gradient(135deg, ${agent.color}20, ${agent.color}10)`,
              border: `1px solid ${agent.color}30`,
              color: agent.color,
            }}
          >
            <MessageSquare className="w-4 h-4" />
            Chat starten
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
