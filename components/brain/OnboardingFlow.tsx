// 🎨 Onboarding Flow - Modern Stepper with Illustrations
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Upload,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';
import { ButtonV2 } from '@/components/ui/button-v2';
import { CardV2 } from '@/components/ui/card-v2';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const steps = [
  {
    id: 1,
    title: 'Welcome to Brain AI',
    description: 'Your intelligent knowledge management system',
    content: 'Brain AI helps you organize, search, and leverage your knowledge with the power of AI. Let\'s get you started!',
    icon: Brain,
    illustration: (
      <svg className="w-64 h-64" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="80" fill="url(#grad1)" opacity="0.2" />
        <path d="M70 90 Q100 60 130 90 Q160 120 130 150 Q100 180 70 150 Q40 120 70 90" fill="url(#grad2)" opacity="0.3" />
        <circle cx="100" cy="100" r="40" fill="url(#grad3)" opacity="0.4" />
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: 2,
    title: 'Upload Your Knowledge',
    description: 'Add documents to build your knowledge base',
    content: 'Upload PDFs, Word documents, text files, and more. Brain AI will automatically process and index them for fast search and retrieval.',
    icon: Upload,
    illustration: (
      <svg className="w-64 h-64" viewBox="0 0 200 200" fill="none">
        <rect x="50" y="60" width="100" height="120" rx="12" fill="url(#uploadGrad1)" opacity="0.2" />
        <rect x="60" y="70" width="80" height="100" rx="8" fill="url(#uploadGrad2)" opacity="0.3" />
        <path d="M100 90 L100 130 M85 105 L100 90 L115 105" stroke="url(#uploadGrad3)" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
        <defs>
          <linearGradient id="uploadGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="uploadGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="uploadGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: 3,
    title: 'Query with AI',
    description: 'Ask questions and get intelligent answers',
    content: 'Use natural language to search your knowledge base. Brain AI understands context and provides relevant answers from your documents.',
    icon: Sparkles,
    illustration: (
      <svg className="w-64 h-64" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="60" fill="url(#queryGrad1)" opacity="0.1" />
        <path d="M100 60 L110 90 L140 90 L115 110 L125 140 L100 120 L75 140 L85 110 L60 90 L90 90 Z" fill="url(#queryGrad2)" opacity="0.4" />
        <circle cx="100" cy="100" r="30" fill="url(#queryGrad3)" opacity="0.3" />
        <defs>
          <linearGradient id="queryGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="queryGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="queryGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: 4,
    title: 'You\'re All Set!',
    description: 'Ready to unlock the power of your knowledge',
    content: 'You\'re ready to start using Brain AI. Upload documents, search your knowledge base, and get intelligent insights powered by AI.',
    icon: Check,
    illustration: (
      <svg className="w-64 h-64" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="70" fill="url(#successGrad1)" opacity="0.2" />
        <path d="M70 100 L90 120 L130 70" stroke="url(#successGrad2)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        <circle cx="100" cy="100" r="50" stroke="url(#successGrad3)" strokeWidth="4" opacity="0.4" />
        <defs>
          <linearGradient id="successGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="successGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="successGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-4xl"
      >
        <CardV2 variant="elevated" padding="none" className="overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Getting Started
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="h-5 w-5 text-neutral-500" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 pt-6">
            <div className="flex items-center justify-between mb-2">
              {steps.map((s, index) => (
                <div key={s.id} className="flex items-center flex-1">
                  {/* Step Circle */}
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      index < currentStep
                        ? 'bg-indigo-500 border-indigo-500'
                        : index === currentStep
                        ? 'border-indigo-500 bg-card dark:bg-neutral-900'
                        : 'border-neutral-300 dark:border-neutral-700 bg-card dark:bg-neutral-900'
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : (
                      <span
                        className={`text-sm font-semibold ${
                          index === currentStep
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Progress Line */}
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 transition-all ${
                        index < currentStep
                          ? 'bg-indigo-500'
                          : 'bg-neutral-300 dark:bg-neutral-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                {/* Illustration */}
                <div className="flex justify-center mb-8">
                  {step.illustration}
                </div>

                {/* Icon Badge */}
                <div className="flex justify-center mb-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
                    <Icon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>

                {/* Title & Description */}
                <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  {step.title}
                </h2>
                <p className="text-lg text-indigo-600 dark:text-indigo-400 mb-4">
                  {step.description}
                </p>
                <p className="text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                  {step.content}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
            <div>
              {currentStep > 0 && (
                <ButtonV2
                  variant="ghost"
                  onClick={handlePrevious}
                  icon={<ChevronLeft className="h-4 w-4" />}
                  iconPosition="left"
                >
                  Previous
                </ButtonV2>
              )}
            </div>

            <div className="flex items-center gap-3">
              {currentStep < steps.length - 1 && (
                <ButtonV2 variant="secondary" onClick={handleSkip}>
                  Skip
                </ButtonV2>
              )}
              <ButtonV2
                variant="primary"
                onClick={handleNext}
                icon={
                  currentStep < steps.length - 1 ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )
                }
                iconPosition="right"
                size="lg"
              >
                {currentStep < steps.length - 1 ? 'Next' : 'Get Started'}
              </ButtonV2>
            </div>
          </div>
        </CardV2>
      </motion.div>
    </motion.div>
  );
}
