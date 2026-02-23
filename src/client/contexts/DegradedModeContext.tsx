import React, { useContext, useState, useEffect } from 'react';
import { DegradedModeContext, DegradedModeState } from './DegradedModeContext.helpers';

export function DegradedModeProvider({ children }: { children: React.ReactNode }) {
  const [isDegraded, setDegraded] = useState(false);

  // Auto-recover after 30s
  useEffect(() => {
    if (isDegraded) {
      const timer = setTimeout(() => {
        setDegraded(false);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isDegraded]);

  useEffect(() => {
    const handleDegradedEvent = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setDegraded(customEvent.detail);
    };
    window.addEventListener('api:degraded', handleDegradedEvent);
    return () => window.removeEventListener('api:degraded', handleDegradedEvent);
  }, []);

  return (
    <DegradedModeContext.Provider value={{ isDegraded, setDegraded }}>
      {children}
    </DegradedModeContext.Provider>
  );
}

export function useDegradedMode() {
  const context = useContext(DegradedModeContext);
  if (!context) throw new Error('useDegradedMode must be used within DegradedModeProvider');
  return context;
}
