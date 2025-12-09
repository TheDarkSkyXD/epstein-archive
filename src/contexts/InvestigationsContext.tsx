import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Investigation } from '../types/investigation';

interface InvestigationsContextType {
  investigations: Investigation[];
  selectedInvestigation: Investigation | null;
  isLoading: boolean;
  error: string | null;
  loadInvestigations: () => Promise<void>;
  selectInvestigation: (id: string) => void;
  createInvestigation: (data: Omit<Investigation, 'id' | 'createdAt' | 'updatedAt' | 'team' | 'permissions' | 'tags'>) => Promise<Investigation | null>;
  addToInvestigation: (investigationId: string, item: any, relevance: 'high' | 'medium' | 'low') => Promise<void>;
}

const InvestigationsContext = createContext<InvestigationsContextType | undefined>(undefined);

interface InvestigationsProviderProps {
  children: ReactNode;
}

export const InvestigationsProvider: React.FC<InvestigationsProviderProps> = ({ children }) => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvestigations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/investigations');
      const data = await resp.json();
      const mapped: Investigation[] = (data.data || []).map((inv: any) => ({
        id: String(inv.id),
        title: inv.title,
        description: inv.description || '',
        hypothesis: inv.scope || '',
        status: inv.status === 'open' ? 'active' : inv.status === 'in_review' ? 'review' : inv.status === 'closed' ? 'published' : 'archived',
        createdAt: new Date(inv.created_at),
        updatedAt: new Date(inv.updated_at),
        team: inv.team || [{
          id: inv.owner_id,
          name: inv.owner_name || 'Investigation Owner',
          email: inv.owner_email || '',
          role: 'lead',
          permissions: ['read', 'write', 'admin'],
          joinedAt: new Date(inv.created_at),
          organization: inv.owner_organization || '',
          expertise: []
        }],
        leadInvestigator: inv.owner_id,
        permissions: [],
        tags: [],
        priority: 'medium'
      }));
      setInvestigations(mapped);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load investigations';
      setError(errorMessage);
      console.error('Error loading investigations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectInvestigation = (id: string) => {
    const investigation = investigations.find(inv => inv.id === id) || null;
    setSelectedInvestigation(investigation);
  };

  const createInvestigation = async (data: Omit<Investigation, 'id' | 'createdAt' | 'updatedAt' | 'team' | 'permissions' | 'tags'>): Promise<Investigation | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          ownerId: '1', // This should come from auth context
          scope: data.hypothesis
        })
      });
      
      if (!resp.ok) {
        throw new Error('Failed to create investigation');
      }
      
      const inv = await resp.json();
      await loadInvestigations(); // Refresh the list
      
      const newInvestigation: Investigation = {
        id: String(inv.id),
        title: inv.title,
        description: inv.description || '',
        hypothesis: inv.scope || '',
        status: inv.status === 'open' ? 'active' : inv.status === 'in_review' ? 'review' : inv.status === 'closed' ? 'published' : 'archived',
        createdAt: new Date(inv.created_at),
        updatedAt: new Date(inv.updated_at),
        team: [{
          id: '1', // This should come from auth context
          name: 'Current User',
          email: '',
          role: 'lead',
          permissions: ['read', 'write', 'admin'],
          joinedAt: new Date(inv.created_at),
          organization: '',
          expertise: [],
          status: 'active'
        }],
        leadInvestigator: '1',
        permissions: [],
        tags: [],
        priority: 'medium'
      };
      
      return newInvestigation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create investigation';
      setError(errorMessage);
      console.error('Error creating investigation:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const addToInvestigation = async (investigationId: string, item: any, relevance: 'high' | 'medium' | 'low') => {
    setIsLoading(true);
    setError(null);
    try {
      // In a real implementation, this would call the API to add the item to the investigation
      // For now, we'll just simulate the action
      console.log('Adding item to investigation:', { investigationId, item, relevance });
      
      // Dispatch a custom event for other components to listen to
      const event = new CustomEvent('investigation-item-added', {
        detail: { investigationId, item, relevance }
      });
      window.dispatchEvent(event);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item to investigation';
      setError(errorMessage);
      console.error('Error adding to investigation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvestigations();
  }, []);

  return (
    <InvestigationsContext.Provider
      value={{
        investigations,
        selectedInvestigation,
        isLoading,
        error,
        loadInvestigations,
        selectInvestigation,
        createInvestigation,
        addToInvestigation
      }}
    >
      {children}
    </InvestigationsContext.Provider>
  );
};

export const useInvestigations = () => {
  const context = useContext(InvestigationsContext);
  if (context === undefined) {
    throw new Error('useInvestigations must be used within an InvestigationsProvider');
  }
  return context;
};