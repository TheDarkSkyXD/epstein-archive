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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl shadow-cyan-900/20 border border-slate-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-800/50">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-8 bg-cyan-500 rounded-full"></span>
            Getting Started
          </h2>
          <button
            onClick={handleSkip}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 bg-slate-900/30">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
            <span>Step {step} of {totalSteps}</span>
            <span className="text-cyan-400">{Math.round((step / totalSteps) * 100)}% complete</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
              style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8 min-h-[300px] flex flex-col items-center justify-center text-center">
          <div className="mb-8 relative group">
            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full group-hover:bg-cyan-500/30 transition-all duration-500"></div>
            <div className="relative bg-slate-800/80 p-6 rounded-2xl border border-slate-700 shadow-xl group-hover:scale-110 transition-transform duration-300">
              {React.cloneElement(icon as React.ReactElement, { className: "h-12 w-12 text-cyan-400" })}
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-4 neon-text-cyan">
            {title}
          </h3>
          <p className="text-lg text-slate-300 leading-relaxed max-w-lg">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-slate-900/50 border-t border-slate-800/50">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-white transition-colors"
          >
            Skip Tour
          </button>
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium shadow-lg shadow-cyan-900/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              {step === totalSteps ? 'Get Started' : 'Next'}
              {step !== totalSteps && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};