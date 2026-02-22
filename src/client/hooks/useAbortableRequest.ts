import { useRef, useEffect, useCallback } from 'react';

export function useAbortableRequest() {
  const controllerRef = useRef<AbortController | null>(null);

  const abortAll = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();
  }, []);

  useEffect(() => {
    controllerRef.current = new AbortController();
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  const getSignal = useCallback(() => {
    if (!controllerRef.current) {
      controllerRef.current = new AbortController();
    }
    return controllerRef.current.signal;
  }, []);

  return { getSignal, abortAll };
}
