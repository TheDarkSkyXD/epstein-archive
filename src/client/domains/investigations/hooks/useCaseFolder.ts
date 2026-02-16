import { useCallback, useEffect, useState } from 'react';
import type { InvestigationEvidenceByTypeResponseDto } from '@shared/dto/investigations';
import { investigationActions } from '../investigations.actions';

export const useCaseFolder = (
  investigationId: string | number | null | undefined,
  options: { enabled?: boolean } = {},
) => {
  const [data, setData] = useState<InvestigationEvidenceByTypeResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCaseFolder = useCallback(async () => {
    if (!investigationId || options.enabled === false) {
      setData(null);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = await investigationActions.loadCaseFolder(String(investigationId));
      setData(payload);
      return payload;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load case folder evidence';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [investigationId, options.enabled]);

  useEffect(() => {
    if (options.enabled === false) return;
    void loadCaseFolder();
  }, [loadCaseFolder, options.enabled]);

  return {
    caseFolder: data,
    loading,
    error,
    reload: loadCaseFolder,
  };
};
