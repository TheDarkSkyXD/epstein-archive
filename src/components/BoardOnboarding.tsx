import React, { useState } from 'react';
import { X, ArrowRight, Target, FileText, BookOpen, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BoardOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const BoardOnboarding: React.FC<BoardOnboardingProps> = ({
  onComplete,
  onSkip,
}) => {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const steps = [
    {
      id: 1,
      title: 'Define Your Hypotheses',
      description:
        'Start on the left. create theories or questions you want to answer. These act as the "buckets" for your evidence.',
      icon: Target,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      glow: 'shadow-purple-500/20',
    },
    {
      id: 2,
      title: 'Gather & Connect Evidence',
      description:
        'Items you "Add to Investigation" from around the app appear in the middle Evidence Pool. Drag them onto Hypotheses to prove or disprove them.',
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      glow: 'shadow-blue-500/20',
    },
    {
      id: 3,
      title: 'Build Your Case',
      description:
        'Finally, drag your proven points into the Case Narrative on the right. This organizes your findings into a coherent story ready for export.',
      icon: BookOpen,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      glow: 'shadow-amber-500/20',
    },
  ];

  const currentStep = steps[step - 1];
  const Icon = currentStep.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
        className="relative bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
           <motion.div 
             className="h-full bg-indigo-500"
             initial={{ width: '0%' }}
             animate={{ width: `${(step / totalSteps) * 100}%` }}
             transition={{ duration: 0.3 }}
           />
        </div>

        {/* Content Area */}
        <div className="p-8 pb-6 flex flex-col items-center text-center">
            <div className="absolute top-4 right-4">
                <button
                    onClick={onSkip}
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <div
                className={`mb-6 p-4 rounded-xl ${currentStep.bg} ${currentStep.border} border shadow-lg ${currentStep.glow} ring-1 ring-white/5`}
              >
                <Icon className={`h-8 w-8 ${currentStep.color}`} />
              </div>

              <h2 className="text-xl font-bold text-white mb-3">{currentStep.title}</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                {currentStep.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 flex flex-col gap-3">
          <button
            onClick={handleNext}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all"
          >
            <span>{step === totalSteps ? 'Start Investigating' : 'Next'}</span>
            {step === totalSteps ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </button>
          
          <div className="text-center">
             <span className="text-xs text-slate-600">Step {step} of {totalSteps}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
