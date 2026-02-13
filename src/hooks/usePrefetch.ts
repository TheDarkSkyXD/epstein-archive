/**
 * Custom hook for prefetching data on hover or viewport proximity
 */

import { useEffect, useRef } from 'react';
import { apiClient } from '../services/apiClient';

interface PrefetchOptions {
  enabled?: boolean;
  delay?: number; // ms to wait before prefetching
}

/**
 * Prefetch entity data on hover
 */
export function usePrefetchEntity(entityId: string | null, options: PrefetchOptions = {}) {
  const { enabled = true, delay = 100 } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prefetchedRef = useRef<Set<string>>(new Set());

  const prefetch = () => {
    if (!enabled || !entityId || prefetchedRef.current.has(entityId)) return;

    timeoutRef.current = setTimeout(() => {
      // Prefetch entity overview
      apiClient.get(`/entities/${entityId}`, { useCache: true, cacheTtl: 60000 }).catch(() => {
        // Silently fail
      });

      // Prefetch first page of documents
      apiClient
        .get(`/entities/${entityId}/documents`, {
          params: { offset: 0, limit: 20 },
          useCache: true,
          cacheTtl: 60000,
        } as any)
        .catch(() => {
          // Silently fail
        });

      prefetchedRef.current.add(entityId);
    }, delay);
  };

  const cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => cancel();
  }, []);

  return { prefetch, cancel };
}

/**
 * Prefetch data when element enters viewport
 */
export function usePrefetchOnViewport(
  callback: () => void,
  options: IntersectionObserverInit & { enabled?: boolean } = {},
) {
  const { enabled = true, ...observerOptions } = options;
  const elementRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prefetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled || prefetchedRef.current) return;

    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !prefetchedRef.current) {
          prefetchedRef.current = true;

          // Use requestIdleCallback if available, otherwise setTimeout
          if ('requestIdleCallback' in window) {
            requestIdleCallback(callback, { timeout: 2000 });
          } else {
            setTimeout(callback, 0);
          }
        }
      });
    }, observerOptions);

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, callback, observerOptions]);

  return elementRef;
}
