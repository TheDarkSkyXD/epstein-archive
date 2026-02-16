import { useCallback, useState } from 'react';
import type { Investigation, Investigator } from '../../../../types/investigation';
import { investigationsApi } from '../investigations.api';
import { mapApiInvestigation } from '../investigations.model';

interface UseInvestigationListOptions {
  currentUser?: Investigator;
  onError?: (message: string) => void;
}

export const useInvestigationList = (options: UseInvestigationListOptions = {}) => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadInvestigations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await investigationsApi.list();
      const mapped = (data?.data || []).map(mapApiInvestigation);
      setInvestigations(mapped);
      return mapped;
    } catch (error) {
      console.error('Error loading investigations:', error);
      options.onError?.('Failed to load investigations');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const loadInvestigation = useCallback(
    async (id: string) => {
      setIsLoading(true);
      try {
        const inv = await investigationsApi.getById(id);
        const mapped = mapApiInvestigation(inv);
        setSelectedInvestigation(mapped);
        return { investigation: mapped, raw: inv };
      } catch (error) {
        console.error('Error loading investigation:', error);
        options.onError?.('Failed to load investigation');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [options],
  );

  const createInvestigation = useCallback(
    async (payload: { title: string; description?: string; hypothesis?: string }) => {
      if (!options.currentUser?.id) throw new Error('Current user is required to create a case');
      const created = await investigationsApi.create({
        title: payload.title,
        description: payload.description,
        ownerId: options.currentUser.id,
        scope: payload.hypothesis,
      });
      const mapped = mapApiInvestigation(created);
      setSelectedInvestigation(mapped);
      setInvestigations((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
      return { investigation: mapped, raw: created };
    },
    [options.currentUser?.id],
  );

  return {
    investigations,
    setInvestigations,
    selectedInvestigation,
    setSelectedInvestigation,
    isLoading,
    loadInvestigations,
    loadInvestigation,
    createInvestigation,
  };
};
