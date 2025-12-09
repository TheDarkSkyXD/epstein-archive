import React, { useState } from 'react';
import { X, ArrowRight, Filter, Search, FileText, Flag, Plus } from 'lucide-react';

interface FirstRunOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const FirstRunOnboarding: React.FC<FirstRunOnboardingProps> = ({ 
  onComplete, 
  onSkip 
}) => {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const getStepContent = () => {
    switch (step) {
      case 1:
        return {
          title: "Welcome to the Epstein Archive",
          description: "Discover a powerful tool for investigating complex networks and uncovering hidden connections through advanced search and analysis capabilities.",
          icon: <Search className="h-8 w-8 text-[var(--accent-primary)]" />
        };
      case 2:
        return {
          title: "Filter by Red Flag Index",
          description: "Use the Red Flag Index to cut through noise and focus on the most significant entities and documents in your investigation. Higher ratings indicate stronger evidence connections.",
          icon: <Flag className="h-8 w-8 text-[var(--accent-danger)]" />
        };
      case 3:
        return {
          title: "Build Investigations with Evidence",
          description: "Add people, documents, and connections to investigations to build comprehensive case files. Everything you add is traceable back to source documents.",
          icon: <Plus className="h-8 w-8 text-[var(--accent-secondary)]" />
        };
      case 4:
        return {
          title: "Unlock Advanced Features",
          description: "Explore powerful features like network visualization, advanced filtering, and collaborative investigations to deepen your research.",
          icon: <Filter className="h-8 w-8 text-[var(--accent-warning)]" />
        };
      default:
        return {
          title: "",
          description: "",
          icon: null
        };
    }
  };

  const { title, description, icon } = getStepContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-elevated)] rounded-[var(--radius-xl)] w-full max-w-2xl border border-[var(--border-strong)]">
        {/* Header */}
        <div className="flex items-center justify-between p-[var(--space-6)] pb-[var(--space-4)]">
          <h2 className="text-[var(--font-size-h2)] font-bold text-[var(--text-primary)]">
            Getting Started
          </h2>
          <button
            onClick={handleSkip}
            className="p-[var(--space-2)] hover:bg-[var(--bg-subtle)] rounded-[var(--radius-md)] transition-colors"
          >
            <X className="h-5 w-5 text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-[var(--space-6)] pb-[var(--space-4)]">
          <div className="flex items-center justify-between text-[var(--font-size-caption)] text-[var(--text-tertiary)] mb-[var(--space-2)]">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}% complete</span>
          </div>
          <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2">
            <div 
              className="bg-[var(--accent-primary)] h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="px-[var(--space-6)] py-[var(--space-4)]">
          <div className="flex items-center justify-center mb-[var(--space-6)]">
            <div className="bg-[var(--bg-subtle)] rounded-full p-[var(--space-4)]">
              {icon}
            </div>
          </div>
          <h3 className="text-[var(--font-size-h3)] font-semibold text-[var(--text-primary)] text-center mb-[var(--space-3)]">
            {title}
          </h3>
          <p className="text-[var(--font-size-body)] text-[var(--text-secondary)] text-center mb-[var(--space-6)]">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-[var(--space-6)] pt-[var(--space-4)] border-t border-[var(--border-subtle)]">
          <button
            onClick={handleSkip}
            className="px-[var(--space-4)] py-[var(--space-2)] text-[var(--font-size-caption)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
          >
            Skip Tour
          </button>
          <div className="flex items-center space-x-[var(--space-3)]">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-[var(--space-4)] py-[var(--space-2)] text-[var(--font-size-caption)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-[var(--space-6)] py-[var(--space-2)] bg-[var(--accent-primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--accent-secondary)] transition-colors flex items-center whitespace-nowrap"
            >
              {step === totalSteps ? 'Get Started' : 'Next'}
              {step !== totalSteps && <ArrowRight className="h-4 w-4 ml-[var(--space-2)]" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};