import React, { useState } from 'react';
import { useSensitiveSettings } from '../contexts/SensitiveSettingsContext';
import { EyeOff } from 'lucide-react';

interface SensitiveContentProps {
  isSensitive?: boolean;
  children: React.ReactNode;
  className?: string;
  label?: string;
}

/**
 * Wrapper component that blurs sensitive content until the user clicks to reveal.
 * Respects the global showAllSensitive setting from SensitiveSettingsContext.
 */
export function SensitiveContent({
  isSensitive = false,
  children,
  className = '',
  label = 'Sensitive Content',
}: SensitiveContentProps): React.ReactElement {
  const { showAllSensitive } = useSensitiveSettings();
  const [revealed, setRevealed] = useState(false);

  const shouldHide = isSensitive && !showAllSensitive && !revealed;

  // If content should not be hidden, render children directly
  if (!shouldHide) {
    return <div className={className}>{children}</div>;
  }

  const handleReveal = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setRevealed(true);
  };

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ minHeight: '100px' }}>
      {/* Blurred content */}
      <div
        className="blur-2xl opacity-30 transition-all duration-300"
        style={{ filter: 'blur(40px) brightness(0.5)' }}
      >
        {children}
      </div>

      {/* Click overlay */}
      <button
        onClick={handleReveal}
        className="absolute inset-0 flex flex-col items-center justify-center z-20 cursor-pointer transition-all hover:bg-black/20 group"
        aria-label="Click to reveal sensitive content"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-md" />

        {/* Icon and label */}
        <div className="relative z-30 flex flex-col items-center gap-3 transition-transform group-hover:scale-110">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 border-2 border-slate-600/50 flex items-center justify-center backdrop-blur-sm shadow-2xl group-hover:border-slate-500 transition-all">
            <EyeOff
              size={28}
              className="text-slate-300 group-hover:text-slate-200 transition-colors"
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white font-semibold text-base tracking-wide uppercase">
              {label}
            </span>
            <span className="text-slate-400 text-xs">Click to reveal</span>
          </div>
        </div>
      </button>
    </div>
  );
}
