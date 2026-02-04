'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ConfigWizardLayout } from './components/ConfigWizardLayout';
import { AgentDetailsStep } from './components/steps/AgentDetailsStep';
import { WorkflowsStep } from './components/steps/WorkflowsStep';
import { IntegrationsStep } from './components/steps/IntegrationsStep';
import { PermissionsStep } from './components/steps/PermissionsStep';
import { TestingStep } from './components/steps/TestingStep';
import { ActivationStep } from './components/steps/ActivationStep';
import { generateAgentFromDescription, type GeneratedAgent } from '@/lib/utils/generateAgentFromDescription';

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Reserved route names that shouldn't be treated as agent IDs
const RESERVED_ROUTES = ['studio', 'create', 'browse', 'templates', 'marketplace', 'my-agents', 'revolutionary', 'integrations'];

export default function ConfigureAgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [agent, setAgent] = useState<GeneratedAgent | null>(null);
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({
    1: false,
    2: false, // Mind. 1 Workflow erforderlich
    3: false, // Mind. 1 Integration erforderlich
    4: false, // Mind. 1 Read-Permission erforderlich
    5: false, // Test muss durchgeführt werden (3+ Messages, 2+ Responses)
    6: false,
  });

  // Load agent data (aktuell Mock, später von API)
  useEffect(() => {
    // TODO: Load from API
    // Für jetzt: Mock-Agent laden
    const mockAgent = generateAgentFromDescription(
      'Enterprise Sales Agent für Maschinenbau - qualifiziert Leads und koordiniert mit dem Sales-Team',
      'business'
    );
    mockAgent.id = agentId;
    setAgent(mockAgent);
  }, [agentId]);

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final activation
      handleActivation();
    }
  };

  const handleSkip = () => {
    router.push(`/agents/${agentId}`);
  };

  const handleActivation = async () => {
    if (!agent) return;

    // Validate agentId before making API calls
    if (RESERVED_ROUTES.includes(agentId.toLowerCase()) || !isValidUUID(agentId)) {
      console.warn(`[CONFIGURE] Cannot activate agent with invalid ID: ${agentId}`);
      // If it's a reserved route or invalid UUID, create a new agent instead
      try {
        const createResponse = await fetch('/api/agents/custom', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: agent.name,
            description: agent.description,
            icon: agent.icon || '🤖',
            color: agent.color || '#3B82F6',
            systemInstructions: agent.systemPrompt || `You are ${agent.name}, ${agent.role}.`,
            status: 'active',
            visibility: 'private',
          }),
        });

        const createResult = await createResponse.json();
        if (createResult.success && createResult.data?.id) {
          console.log('Agent created successfully:', createResult.data.name);
          router.push(`/agents/${createResult.data.id}?activated=true`);
          return;
        } else {
          throw new Error(createResult.error || 'Failed to create agent');
        }
      } catch (error) {
        console.error('Failed to create agent:', error);
        router.push(`/agents/browse?error=activation_failed`);
        return;
      }
    }

    try {
      // API Call to activate agent - set status to 'active'
      const response = await fetch(`/api/agents/custom?id=${agentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'active',
          name: agent.name,
          description: agent.description,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        // If custom agent doesn't exist, try creating it first
        if (response.status === 404) {
          const createResponse = await fetch('/api/agents/custom', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: agent.name,
              description: agent.description,
              icon: agent.icon || '🤖',
              color: agent.color || '#3B82F6',
              systemInstructions: agent.systemPrompt || `You are ${agent.name}, ${agent.role}.`,
              status: 'active',
              visibility: 'private',
            }),
          });

          const createResult = await createResponse.json();
          if (!createResult.success) {
            throw new Error(createResult.error || 'Failed to create and activate agent');
          }
        } else {
          throw new Error(result.error || 'Failed to activate agent');
        }
      }

      console.log('Agent activated successfully:', agent.name);
      router.push(`/agents/${agentId}?activated=true`);
    } catch (error) {
      console.error('Failed to activate agent:', error);
      // Still navigate but show error state
      router.push(`/agents/${agentId}?activated=false&error=activation_failed`);
    }
  };

  const handleAgentUpdate = (updates: Partial<GeneratedAgent>) => {
    setAgent(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleValidationChange = (stepNumber: number, isValid: boolean) => {
    setStepValidation(prev => ({ ...prev, [stepNumber]: isValid }));
  };

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Lade Agent-Daten...</p>
        </div>
      </div>
    );
  }

  const canGoNext = stepValidation[currentStep] ?? false;
  const isLastStep = currentStep === 6;

  return (
    <ConfigWizardLayout
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onBack={handleBack}
      onNext={handleNext}
      onSkip={currentStep === 1 ? handleSkip : undefined}
      canGoNext={canGoNext}
      isLastStep={isLastStep}
    >
      {/* Render current step */}
      {currentStep === 1 && (
        <AgentDetailsStep
          agent={agent}
          onUpdate={handleAgentUpdate}
          onValidationChange={(isValid) => handleValidationChange(1, isValid)}
        />
      )}

      {currentStep === 2 && (
        <WorkflowsStep
          agent={agent}
          onUpdate={handleAgentUpdate}
          onValidationChange={(isValid) => handleValidationChange(2, isValid)}
        />
      )}

      {currentStep === 3 && (
        <IntegrationsStep
          agentId={agentId}
          onValidationChange={(isValid) => handleValidationChange(3, isValid)}
        />
      )}

      {currentStep === 4 && (
        <PermissionsStep
          onValidationChange={(isValid) => handleValidationChange(4, isValid)}
        />
      )}

      {currentStep === 5 && (
        <TestingStep
          onValidationChange={(isValid) => handleValidationChange(5, isValid)}
        />
      )}

      {currentStep === 6 && (
        <ActivationStep
          stepValidation={stepValidation}
          agentName={agent.name}
          onNavigateToStep={handleStepChange}
          onActivate={handleActivation}
        />
      )}
    </ConfigWizardLayout>
  );
}
