import { useState } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  ArrowRight,
  Wand2,
  TrendingUp,
  FileText,
  Users,
  BarChart,
  ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCaseCategories } from './data';

interface HeroCreateAgentProps {
  onPromptSubmit: (prompt: string, useCase: string) => void;
  onTemplateSelect: (templateId: string) => void;
  onWizardOpen: () => void;
}

export default function HeroCreateAgent({ 
  onPromptSubmit, 
  onTemplateSelect, 
  onWizardOpen 
}: HeroCreateAgentProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);

  const handleSubmit = () => {
    if (prompt.trim()) {
      onPromptSubmit(prompt, selectedUseCase || 'general');
      setPrompt('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          Revolutioniere deine Agenten-Erstellung
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold text-text mb-6 leading-tight">
          Beschreibe deinen Agenten in
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> natürlichen Worten</span>
        </h1>
        
        <p className="text-xl text-text-muted mb-8 max-w-3xl mx-auto">
          Unser intelligenter Assistent versteht, was du brauchst, und erstellt 
          den perfekten Agenten für deine Anforderungen.
        </p>
      </div>

      {/* Chat Input */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="relative bg-surface-1 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            
            <div className="flex-1">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Beschreibe deinen Agenten... z.B. 'Ich brauche einen Kundensupport-Agent, der freundlich Fragen beantwortet und bei Problemen hilft'"
                className="w-full h-32 p-4 bg-surface-0 border-white/10 rounded-xl resize-none text-lg placeholder:text-text-muted focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
              />
              
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-text-muted">
                  💡 Tipp: Drücke Cmd/Ctrl + Enter zum schnellen Erstellen
                </div>
                
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim()}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Agent erstellen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Use Case Chips */}
      <div className="max-w-4xl mx-auto mb-12">
        <h3 className="text-lg font-semibold text-text mb-4 text-center">
          Oder wähle einen Anwendungsbereich
        </h3>
        
        <div className="flex flex-wrap justify-center gap-3">
          {useCaseCategories.map((category) => {
            const IconComponent = {
              MessageCircle: MessageSquare,
              TrendingUp: TrendingUp,
              FileText: FileText,
              Users: Users,
              BarChart: BarChart,
              ShoppingCart: ShoppingCart
            }[category.icon] || MessageSquare;

            return (
              <button
                key={category.id}
                onClick={() => setSelectedUseCase(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 ${
                  selectedUseCase === category.id
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-white/10 bg-surface-1 text-text-muted hover:border-white/20 hover:bg-surface-0'
                }`}
                style={{
                  borderColor: selectedUseCase === category.id ? category.color : undefined,
                  backgroundColor: selectedUseCase === category.id ? `${category.color}10` : undefined,
                  color: selectedUseCase === category.id ? category.color : undefined
                }}
              >
                <IconComponent className="w-4 h-4" />
                <span className="font-medium">{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={onWizardOpen}
          variant="outline"
          size="lg"
          className="border-white/20 text-text hover:bg-card/5 px-8 py-3"
        >
          <ArrowRight className="w-5 h-5 mr-2" />
          Erweiterten Wizard nutzen
        </Button>
        
        <Button
          onClick={() => onTemplateSelect('browse-templates')}
          variant="ghost"
          size="lg"
          className="text-text-muted hover:text-text hover:bg-card/5 px-8 py-3"
        >
          Vorlagen durchsuchen
        </Button>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl"></div>
    </div>
  );
}
