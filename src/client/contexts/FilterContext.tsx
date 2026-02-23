import React, { useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FilterState,
  defaultState,
  FilterContext,
  serializeFilters,
  deserializeFilters,
} from './FilterContext.helpers';

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialHydrated = useRef(false);

  const [filters, setFiltersState] = useState<FilterState>(() => {
    const urlFilters = deserializeFilters(searchParams.get('f'));
    return { ...defaultState, ...urlFilters };
  });

  // Update URL whenever filters change (except on initial mount hydration)
  useEffect(() => {
    if (!initialHydrated.current) {
      initialHydrated.current = true;
      return;
    }

    const encoded = serializeFilters(filters);
    if (encoded) {
      setSearchParams(
        (prev) => {
          prev.set('f', encoded);
          return prev;
        },
        { replace: true },
      );
    } else {
      setSearchParams(
        (prev) => {
          prev.delete('f');
          return prev;
        },
        { replace: true },
      );
    }
  }, [filters, setSearchParams]);

  const setFilters = useCallback(
    (update: Partial<FilterState> | ((prev: FilterState) => FilterState)) => {
      setFiltersState((prev) => {
        if (typeof update === 'function') {
          return update(prev);
        }
        return { ...prev, ...update };
      });
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFiltersState(defaultState);
  }, []);

  return (
    <FilterContext.Provider value={{ filters, setFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};
