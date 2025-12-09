import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Investigation } from '../types/investigation';

interface InvestigationContextType {
  investigations: Investigation[];
  loading: boolean;
  error: string | null;
  addEvidenceToInvestigation: (investigationId: string, evidence: any, relevance: 'high' | 'medium' | 'low') => Promise<void>;
  refreshInvestigations: () => Promise<void>;
}

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

export const useInvestigations = () => {
  const context = useContext(InvestigationContext);
  if (!context) {
    throw new Error('useInvestigations must be used within an InvestigationProvider');
  }
  return context;
};

interface InvestigationProviderProps {
  children: ReactNode;
}

export const InvestigationProvider: React.FC<InvestigationProviderProps> = ({ children }) => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvestigations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/investigations');
      if (!response.ok) {
        throw new Error('Failed to fetch investigations');
      }
      
      const data = await response.json();
      setInvestigations(data.investigations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load investigations');
      console.error('Error fetching investigations:', err);
    } finally {
      setLoading(false);
    }
  };

  const addEvidenceToInvestigation = async (
    investigationId: string, 
    evidence: any, 
    relevance: 'high' | 'medium' | 'low'
  ) => {
    try {
      const response = await fetch(`/api/investigations/${investigationId}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evidence,
          relevance,
          addedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add evidence to investigation');
      }

      // Refresh investigations after adding evidence
      await fetchInvestigations();
    } catch (err) {
      console.error('Error adding evidence to investigation:', err);
      throw err;
    }
  };

  const refreshInvestigations = async () => {
    await fetchInvestigations();
  };

  useEffect(() => {
    fetchInvestigations();
  }, []);

  const value: InvestigationContextType = {
    investigations,
    loading,
    error,
    addEvidenceToInvestigation,
    refreshInvestigations,
  };

  return (
    <InvestigationContext.Provider value={value}>
      {children}
    </InvestigationContext.Provider>
  );
};