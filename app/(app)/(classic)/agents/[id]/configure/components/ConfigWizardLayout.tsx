'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, ArrowLeft, ArrowRight } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 1, title: 'Agent-Details', description: 'Name, Icon & Industry' },
  { id: 2, title: 'Workflows', description: 'Trigger & Aktionen' },
  { id: 3, title: 'Integrations', description: 'CRM & Tools verbinden' },
  { id: 4, title: 'Permissions', description: 'Berechtigungen festlegen' },
  { id: 5, title: 'Testing', description: 'Sandbox-Test' },
  { id: 6, title: 'Aktivierung', description: 'Go-Live' },
];

interface ConfigWizardLayoutProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  canGoNext: boolean;
  isLastStep: boolean;
  children: ReactNode;
}

export function ConfigWizardLayout({
  currentStep,
  onStepChange,
  onBack,
  onNext,
  onSkip,
  canGoNext,
  isLastStep,
  children,
}: ConfigWizardLayoutProps) {
  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Progress */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Schritt {currentStep} von {STEPS.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% abgeschlossen
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Steps Navigation */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              const isClickable = step.id <= currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => isClickable && onStepChange(step.id)}
                  disabled={!isClickable}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all min-w-fit ${
                    isActive
                      ? 'bg-primary/10 border border-primary/30'
                      : isCompleted
                      ? 'bg-muted hover:bg-accent'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  {/* Step Icon */}
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-medium">{step.id}</span>
                    )}
                  </div>

                  {/* Step Info */}
                  <div className="hidden sm:block text-left">
                    <div className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground hidden md:block">
                      {step.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Step Content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            {children}
          </motion.div>

          {/* Navigation Footer */}
          <div className="sticky bottom-0 bg-card/80 backdrop-blur-sm border-t border-border p-6 rounded-lg">
            <div className="flex items-center justify-between gap-4">
              {/* Back Button */}
              <button
                onClick={onBack}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Zurück</span>
              </button>

              {/* Center Info */}
              <div className="text-sm text-muted-foreground text-center">
                {STEPS[currentStep - 1]?.title}
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-3">
                {/* Skip Button (nur für optionale Steps) */}
                {onSkip && currentStep < STEPS.length && (
                  <button
                    onClick={onSkip}
                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Überspringen
                  </button>
                )}

                {/* Next/Finish Button */}
                <button
                  onClick={onNext}
                  disabled={!canGoNext}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <span>{isLastStep ? 'Agent aktivieren' : 'Weiter'}</span>
                  {!isLastStep && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
