'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  X,
  Settings,
  Lightbulb,
  Users,
  Zap,
  Target,
  Bot,
  Sparkles,
  Shield,
  Globe,
  Code,
  MessageSquare,
  BarChart3,
  Mail,
  Database,
  Brain,
  TestTube,
  Rocket,
  HelpCircle,
  Search,
  Star,
  Palette,
  Link
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAgents } from '@/store/agents';
import { agentTemplates } from '@/lib/agents/templates';

// Types and Interfaces
export type UserMode = 'beginner' | 'advanced';

export interface WizardData {
  // Step 1: Goal Definition
  userGoal: string;
  businessContext: string;
  targetAudience: string;
  successMetrics: string;

  // Step 2: Template Selection
  selectedTemplate: string | null;
  templateCustomizations: Record<string, any>;

  // Step 3: AI Analysis
  analyzedRequirements: {
    purpose: string;
    skills: string[];
    integrations: string[];
    personality: string;
    complexity: 'simple' | 'moderate' | 'advanced';
  };

  // Step 4: Visual Builder
  agentConfig: {
    name: string;
    description: string;
    personality: {
      tone: string;
      traits: string[];
      communicationStyle: string;
    };
    capabilities: {
      skills: string[];
      tools: string[];
      integrations: string[];
      knowledgeAreas: string[];
    };
    behavior: {
      responseStyle: string;
      decisionMaking: string;
      escalationRules: string;
    };
  };

  // Step 5: Integrations
  integrations: {
    sap: { enabled: boolean; config: any };
    crm: { enabled: boolean; config: any; provider: string };
    email: { enabled: boolean; config: any; provider: string };
    slack: { enabled: boolean; config: any };
    teams: { enabled: boolean; config: any };
    api: { enabled: boolean; config: any; endpoints: any[] };
    custom: { enabled: boolean; config: any };
  };

  // Step 6: Testing
  testResults: {
    functionality: boolean;
    integrations: boolean;
    performance: number;
    userExperience: number;
    issues: string[];
    recommendations: string[];
  };

  // Step 7: Deployment
  deploymentConfig: {
    environment: 'development' | 'staging' | 'production';
    monitoring: boolean;
    autoScaling: boolean;
    backup: boolean;
    notifications: boolean;
    teamAccess: string[];
  };
}

export interface StepConfig {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  estimatedTime: string;
  required: boolean;
  completed: boolean;
}

// Step-specific props interfaces
interface StepProps {
  data: WizardData;
  userMode: UserMode;
  onUpdate: (updates: Partial<WizardData>) => void;
}

// Advanced Agent Wizard Component
export function AdvancedAgentWizard({ 
  onClose, 
  onComplete 
}: { 
  onClose: () => void;
  onComplete?: (agentData: WizardData) => void;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [userMode, setUserMode] = useState<UserMode>('beginner');
  const [isLoading, setIsLoading] = useState(false);
  const [wizardData, setWizardData] = useState<WizardData>({
    // Step 1: Goal Definition
    userGoal: '',
    businessContext: '',
    targetAudience: '',
    successMetrics: '',

    // Step 2: Template Selection
    selectedTemplate: null,
    templateCustomizations: {},

    // Step 3: AI Analysis
    analyzedRequirements: {
      purpose: '',
      skills: [],
      integrations: [],
      personality: 'professional',
      complexity: 'simple'
    },

    // Step 4: Visual Builder
    agentConfig: {
      name: '',
      description: '',
      personality: {
        tone: 'professional',
        traits: [],
        communicationStyle: 'helpful'
      },
      capabilities: {
        skills: [],
        tools: [],
        integrations: [],
        knowledgeAreas: []
      },
      behavior: {
        responseStyle: 'concise',
        decisionMaking: 'guided',
        escalationRules: 'always'
      }
    },

    // Step 5: Integrations
    integrations: {
      sap: { enabled: false, config: {} },
      crm: { enabled: false, config: {}, provider: '' },
      email: { enabled: false, config: {}, provider: '' },
      slack: { enabled: false, config: {} },
      teams: { enabled: false, config: {} },
      api: { enabled: false, config: {}, endpoints: [] },
      custom: { enabled: false, config: {} }
    },

    // Step 6: Testing
    testResults: {
      functionality: false,
      integrations: false,
      performance: 0,
      userExperience: 0,
      issues: [],
      recommendations: []
    },

    // Step 7: Deployment
    deploymentConfig: {
      environment: 'development',
      monitoring: true,
      autoScaling: false,
      backup: true,
      notifications: true,
      teamAccess: []
    }
  });

  // Step configurations
  const steps: StepConfig[] = [
    {
      id: 1,
      title: 'Welcome & Goals',
      subtitle: 'Define your vision',
      description: 'Tell us what you want your agent to accomplish',
      icon: Target,
      estimatedTime: '2-3 min',
      required: true,
      completed: false
    },
    {
      id: 2,
      title: 'Smart Templates',
      subtitle: 'Choose your foundation',
      description: 'Select from AI-recommended templates',
      icon: Sparkles,
      estimatedTime: '1-2 min',
      required: false,
      completed: false
    },
    {
      id: 3,
      title: 'AI Analysis',
      subtitle: 'Deep understanding',
      description: 'We analyze and refine your requirements',
      icon: Brain,
      estimatedTime: '2-3 min',
      required: true,
      completed: false
    },
    {
      id: 4,
      title: 'Visual Builder',
      subtitle: 'Design your agent',
      description: 'Customize personality, skills, and behavior',
      icon: Palette,
      estimatedTime: '3-5 min',
      required: true,
      completed: false
    },
    {
      id: 5,
      title: 'Integrations',
      subtitle: 'Connect your systems',
      description: 'Set up connections to your tools',
      icon: Link,
      estimatedTime: '2-4 min',
      required: false,
      completed: false
    },
    {
      id: 6,
      title: 'Test & Preview',
      subtitle: 'Validate performance',
      description: 'Test your agent before going live',
      icon: TestTube,
      estimatedTime: '2-3 min',
      required: true,
      completed: false
    },
    {
      id: 7,
      title: 'Deploy & Launch',
      subtitle: 'Go live',
      description: 'Deploy your agent and start using it',
      icon: Rocket,
      estimatedTime: '1-2 min',
      required: true,
      completed: false
    }
  ];

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleStepSelect = useCallback((stepId: number) => {
    setCurrentStep(stepId);
  }, []);

  // Data handlers
  const updateWizardData = useCallback((updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  const updateStepData = useCallback((stepKey: keyof WizardData, data: any) => {
    setWizardData(prev => ({ ...prev, [stepKey]: data }));
  }, []);

  // Progress calculation
  const getProgress = useCallback(() => {
    const completedSteps = steps.filter(step => step.completed).length;
    return (completedSteps / steps.length) * 100;
  }, [steps]);

  // Can proceed validation
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return wizardData.userGoal.trim().length > 10;
      case 2:
        return true; // Template selection is optional
      case 3:
        return wizardData.analyzedRequirements.purpose !== '';
      case 4:
        return wizardData.agentConfig.name.trim().length > 0;
      case 5:
        return true; // Integrations are optional
      case 6:
        return wizardData.testResults.functionality;
      case 7:
        return true;
      default:
        return false;
    }
  }, [currentStep, wizardData]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-7xl h-[90vh] bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-card/20 flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Advanced Agent Creator</h2>
                <p className="text-blue-100">Build your personalized AI agent in 7 simple steps</p>
              </div>
            </div>
            
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 bg-card/10 rounded-lg p-1">
              <button
                onClick={() => setUserMode('beginner')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  userMode === 'beginner' 
                    ? 'bg-card text-blue-600' 
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Beginner
              </button>
              <button
                onClick={() => setUserMode('advanced')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  userMode === 'advanced' 
                    ? 'bg-card text-blue-600' 
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Advanced
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3, 4, 5, 6, 7].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                  currentStep >= stepNumber 
                    ? 'bg-card text-blue-600' 
                    : 'bg-card/20 text-white/60'
                }`}>
                  {stepNumber < currentStep ? '✓' : stepNumber}
                </div>
                {stepNumber < 7 && (
                  <div className={`flex-1 h-1 mx-2 rounded transition ${
                    currentStep > stepNumber ? 'bg-card' : 'bg-card/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-sm text-white/90">
            <span>
              Step {currentStep} of 7: {steps[currentStep - 1]?.title}
            </span>
            <span>{Math.round(getProgress())}% Complete</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full p-6 overflow-y-auto"
            >
              {/* Step 1: Welcome & Goals */}
              {currentStep === 1 && (
                <WelcomeStep
                  data={wizardData}
                  userMode={userMode}
                  onUpdate={(updates: Partial<WizardData>) => updateWizardData(updates)}
                />
              )}

              {/* Step 2: Smart Templates */}
              {currentStep === 2 && (
                <TemplateStep
                  data={wizardData}
                  userMode={userMode}
                  onUpdate={(updates: Partial<WizardData>) => updateWizardData(updates)}
                />
              )}

              {/* Step 3: AI Analysis */}
              {currentStep === 3 && (
                <AIAnalysisStep
                  data={wizardData}
                  userMode={userMode}
                  onUpdate={(updates: Partial<WizardData>) => updateWizardData(updates)}
                />
              )}

              {/* Step 4: Visual Builder */}
              {currentStep === 4 && (
                <VisualBuilderStep
                  data={wizardData}
                  userMode={userMode}
                  onUpdate={(updates: Partial<WizardData>) => updateWizardData(updates)}
                />
              )}

              {/* Step 5: Integrations */}
              {currentStep === 5 && (
                <IntegrationStep
                  data={wizardData}
                  userMode={userMode}
                  onUpdate={(updates: Partial<WizardData>) => updateWizardData(updates)}
                />
              )}

              {/* Step 6: Testing & Preview */}
              {currentStep === 6 && (
                <TestingStep
                  data={wizardData}
                  userMode={userMode}
                  onUpdate={(updates: Partial<WizardData>) => updateWizardData(updates)}
                />
              )}

              {/* Step 7: Deployment */}
              {currentStep === 7 && (
                <DeploymentStep
                  data={wizardData}
                  userMode={userMode}
                  onUpdate={(updates: Partial<WizardData>) => updateWizardData(updates)}
                  onComplete={onComplete}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <div className="border-t border-border p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Step Navigation */}
              <div className="flex items-center gap-2">
                {steps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <button
                      key={step.id}
                      onClick={() => handleStepSelect(step.id)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${
                        currentStep === step.id
                          ? 'bg-blue-600 text-white'
                          : step.completed
                          ? 'bg-green-100 text-green-600'
                          : 'bg-muted text-muted-foreground hover:bg-gray-200'
                      }`}
                      title={step.title}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
              
              {/* Help */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <HelpCircle className="w-4 h-4" />
                <span>Need help? Check our guide</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Previous Button */}
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </Button>
              )}

              {/* Next/Complete Button */}
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isLoading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {currentStep === 7 ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Complete Wizard
                  </>
                ) : (
                  <>
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 1: Welcome & Goals Component
function WelcomeStep({ data, userMode, onUpdate }: StepProps) {
  const handleInputChange = (field: keyof WizardData, value: string) => {
    onUpdate({ [field]: value });
  };

  const exampleGoals = [
    "I need an agent that handles customer support tickets automatically",
    "Create a sales agent that qualifies leads and books appointments",
    "Build an agent that analyzes data and creates weekly reports",
    "Design an agent that helps with email marketing campaigns"
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Welcome! Let's Define Your Agent's Purpose</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Tell us what you want your AI agent to accomplish. The more specific you are, the better we can tailor your agent.
        </p>
      </div>

      {/* Main Form */}
      <div className="space-y-6">
        {/* Primary Goal */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">
            What is your main goal? *
          </label>
          <Textarea
            value={data.userGoal}
            onChange={(e) => handleInputChange('userGoal', e.target.value)}
            placeholder="Describe in detail what you want your agent to do. Be specific about the tasks, workflows, and outcomes you're looking for."
            className="w-full h-32 text-base"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {data.userGoal.length}/500 characters
            </p>
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters required
            </p>
          </div>
        </div>

        {/* Business Context */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">
            Business Context {userMode === 'beginner' && <span className="text-blue-600">(Optional - helps us understand your industry)</span>}
          </label>
          <Input
            value={data.businessContext}
            onChange={(e) => handleInputChange('businessContext', e.target.value)}
            placeholder="e.g., E-commerce store, SaaS company, consulting firm, healthcare practice"
          />
        </div>

        {/* Target Audience */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">
            Who will interact with this agent? {userMode === 'beginner' && <span className="text-blue-600">(Optional)</span>}
          </label>
          <Input
            value={data.targetAudience}
            onChange={(e) => handleInputChange('targetAudience', e.target.value)}
            placeholder="e.g., customers, employees, prospects, partners, specific departments"
          />
        </div>

        {/* Success Metrics */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">
            How will you measure success? {userMode === 'beginner' && <span className="text-blue-600">(Optional)</span>}
          </label>
          <Textarea
            value={data.successMetrics}
            onChange={(e) => handleInputChange('successMetrics', e.target.value)}
            placeholder="e.g., faster response times, higher customer satisfaction, more qualified leads, time saved per task"
            className="w-full h-24"
          />
        </div>

        {/* Example Goals */}
        {userMode === 'beginner' && (
          <div className="bg-blue-500/10 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Need inspiration? Here are some examples:
            </h3>
            <div className="space-y-2">
              {exampleGoals.map((goal, index) => (
                <button
                  key={index}
                  onClick={() => handleInputChange('userGoal', goal)}
                  className="w-full text-left p-3 bg-card rounded-lg border hover:border-blue-300 hover:bg-blue-500/10 transition text-sm"
                >
                  "{goal}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Help Section */}
        {userMode === 'beginner' && (
          <div className="bg-muted/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Writing a Good Goal Description
            </h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>✅ Good: "Handle customer support tickets by answering common questions, escalating complex issues, and tracking resolution status"</p>
              <p>❌ Too vague: "Help with customer service"</p>
              <p className="mt-3 font-medium">Include these elements for the best results:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>What tasks should the agent perform?</li>
                <li>Who will interact with it?</li>
                <li>What outcomes do you expect?</li>
                <li>Any specific workflows or processes?</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 2: Template Gallery Component
function TemplateStep({ data, userMode, onUpdate }: StepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Smart template recommendations based on user goal
  const getRecommendations = () => {
    if (!data.userGoal) return [];
    
    const goal = data.userGoal.toLowerCase();
    const recommendations = [];
    
    // AI-powered keyword matching
    if (goal.includes('customer') || goal.includes('support') || goal.includes('help')) {
      recommendations.push('customer-support-pro');
    }
    if (goal.includes('sales') || goal.includes('lead') || goal.includes('revenue')) {
      recommendations.push('sales-accelerator');
    }
    if (goal.includes('data') || goal.includes('analy') || goal.includes('report')) {
      recommendations.push('data-analyst-expert');
    }
    if (goal.includes('email') || goal.includes('mail') || goal.includes('communication')) {
      recommendations.push('email-master');
    }
    if (goal.includes('code') || goal.includes('develop') || goal.includes('technical')) {
      recommendations.push('code-mentor');
    }
    
    return recommendations;
  };

  const recommendedIds = getRecommendations();
  const recommendedTemplates = agentTemplates.filter(t => recommendedIds.includes(t.id));
  const otherTemplates = agentTemplates.filter(t => !recommendedIds.includes(t.id));

  const categories = [
    { id: 'all', label: 'All Templates', count: agentTemplates.length },
    { id: 'support', label: 'Support', count: agentTemplates.filter(t => t.category === 'support').length },
    { id: 'analytics', label: 'Analytics', count: agentTemplates.filter(t => t.category === 'analytics').length },
    { id: 'productivity', label: 'Productivity', count: agentTemplates.filter(t => t.category === 'productivity').length },
    { id: 'sales', label: 'Sales', count: agentTemplates.filter(t => t.category === 'sales').length },
    { id: 'technical', label: 'Technical', count: agentTemplates.filter(t => t.category === 'technical').length },
  ];

  const filteredTemplates = selectedCategory === 'all' 
    ? otherTemplates
    : otherTemplates.filter(t => t.category === selectedCategory);

  const handleTemplateSelect = (templateId: string) => {
    onUpdate({ selectedTemplate: templateId });
  };

  const handleTemplatePreview = (template: any) => {
    setSelectedTemplate(template);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Smart Template Selection</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose from AI-recommended templates or browse our professional library. Templates are pre-configured and ready to customize.
        </p>
      </div>

      {/* AI Recommendations */}
      {recommendedTemplates.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-blue-600" />
            <h3 className="text-xl font-semibold text-foreground">AI Recommended for You</h3>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-800 text-xs font-medium rounded-full">
              Based on your goal
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isRecommended={true}
                isSelected={data.selectedTemplate === template.id}
                onSelect={() => handleTemplateSelect(template.id)}
                onPreview={() => handleTemplatePreview(template)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-card text-foreground border-border hover:border-gray-400'
                }`}
              >
                {category.label}
                <span className="ml-1 text-xs opacity-70">({category.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {selectedCategory === 'all' ? 'All Templates' : `${categories.find(c => c.id === selectedCategory)?.label} Templates`}
        </h3>
        
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-foreground mb-2">No templates found</h4>
            <p className="text-muted-foreground">Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isRecommended={false}
                isSelected={data.selectedTemplate === template.id}
                onSelect={() => handleTemplateSelect(template.id)}
                onPreview={() => handleTemplatePreview(template)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Skip Option */}
      <div className="text-center">
        <button
          onClick={() => handleTemplateSelect('custom')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Skip template selection - I'll build from scratch
        </button>
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onUse={() => {
            handleTemplateSelect(selectedTemplate.id);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// Template Card Component
function TemplateCard({ 
  template, 
  isRecommended, 
  isSelected, 
  onSelect, 
  onPreview 
}: {
  template: any;
  isRecommended: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      className={`border rounded-xl p-6 transition-all cursor-pointer ${
        isSelected 
          ? 'border-blue-500 bg-blue-500/10 shadow-lg' 
          : 'border-border hover:border-border hover:shadow-md'
      } ${isRecommended ? 'ring-2 ring-blue-200' : ''}`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: template.color + '20' }}
          >
            {template.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{template.name}</h3>
              {isRecommended && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-800 text-xs font-medium rounded-full">
                  AI Recommended
                </span>
              )}
              {template.featured && (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground capitalize">{template.category}</p>
          </div>
        </div>
        
        {isSelected && (
          <CheckCircle className="w-6 h-6 text-blue-600" />
        )}
      </div>

      {/* Description */}
      <p className="text-foreground mb-4 line-clamp-2">
        {template.description}
      </p>

      {/* Use Case */}
      <div className="bg-muted/50 rounded-lg p-3 mb-4">
        <p className="text-xs font-medium text-foreground mb-1">Use Case</p>
        <p className="text-sm text-muted-foreground">{template.useCase}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {template.tags.slice(0, 3).map((tag: string, index: number) => (
          <span
            key={index}
            className="px-2 py-1 bg-muted text-foreground text-xs rounded-full"
          >
            {tag}
          </span>
        ))}
        {template.tags.length > 3 && (
          <span className="text-xs text-muted-foreground">+{template.tags.length - 3}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="flex-1 px-3 py-2 border border-border text-foreground rounded-lg hover:bg-muted/50 text-sm font-medium"
        >
          Preview
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
            isSelected
              ? 'bg-blue-600 text-white'
              : 'bg-primary text-white hover:bg-gray-800'
          }`}
        >
          {isSelected ? 'Selected' : 'Use Template'}
        </button>
      </div>
    </div>
  );
}

// Template Preview Modal
function TemplatePreviewModal({ 
  template, 
  onClose, 
  onUse 
}: {
  template: any;
  onClose: () => void;
  onUse: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: template.color + '20' }}
            >
              {template.icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{template.name}</h2>
              <p className="text-sm text-muted-foreground capitalize">{template.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-foreground">{template.description}</p>
          </div>

          {/* Use Case */}
          <div>
            <h3 className="font-semibold mb-2">Use Case</h3>
            <p className="text-foreground">{template.useCase}</p>
          </div>

          {/* Benefits */}
          <div>
            <h3 className="font-semibold mb-2">Benefits</h3>
            <ul className="space-y-2">
              {template.benefits.map((benefit: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Capabilities */}
          <div>
            <h3 className="font-semibold mb-2">Capabilities</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(template.capabilities).map(([key, value]) => (
                <div
                  key={key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    value ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-sm capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Conversation Starters */}
          <div>
            <h3 className="font-semibold mb-2">Example Prompts</h3>
            <div className="space-y-2">
              {template.conversationStarters.map((starter: string, i: number) => (
                <div
                  key={i}
                  className="p-3 bg-muted/50 rounded-lg text-sm text-foreground border-l-4 border-blue-500"
                >
                  "{starter}"
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            onClick={onUse}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Use This Template
          </button>
        </div>
      </div>
    </div>
  );
}

// Placeholder components for remaining steps
function AIAnalysisStep({ data, userMode, onUpdate }: StepProps) {
  return <div className="text-center py-12">AI Analysis Step - To be implemented</div>;
}

function VisualBuilderStep({ data, userMode, onUpdate }: StepProps) {
  return <div className="text-center py-12">Visual Builder Step - To be implemented</div>;
}

function IntegrationStep({ data, userMode, onUpdate }: StepProps) {
  return <div className="text-center py-12">Integration Step - To be implemented</div>;
}

function TestingStep({ data, userMode, onUpdate }: StepProps) {
  return <div className="text-center py-12">Testing Step - To be implemented</div>;
}

function DeploymentStep({ data, userMode, onUpdate, onComplete }: StepProps & { onComplete?: (agentData: WizardData) => void }) {
  return <div className="text-center py-12">Deployment Step - To be implemented</div>;
}
