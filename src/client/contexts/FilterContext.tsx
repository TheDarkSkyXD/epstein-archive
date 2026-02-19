import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useSearchParams } from 'react-router-dom';

export interface FilterState {
  timeRange: [string | null, string | null]; // ISO strings
  docTypes: string[];
  entityTypes: string[];
  riskBands: [number, number]; // [min, max]
  minStrength: number;
  minConnections: number;
  limit: number;
  includeInferred: boolean;
  communityId: string | null;
  searchQuery: string;
  includeJunk: boolean;
}

const defaultState: FilterState = {
  timeRange: [null, null],
  docTypes: [],
  entityTypes: [],
  riskBands: [0, 5],
  minStrength: 0,
  minConnections: 0,
  limit: 100,
  includeInferred: true,
  communityId: null,
  searchQuery: '',
  includeJunk: false,
};

interface FilterContextType {
  filters: FilterState;
  setFilters: (update: Partial<FilterState> | ((prev: FilterState) => FilterState)) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

// Helper to serialize state to URL-safe string
const serializeFilters = (state: FilterState): string => {
  const diff: any = {};
  Object.keys(state).forEach((key) => {
    const k = key as keyof FilterState;
    if (JSON.stringify(state[k]) !== JSON.stringify(defaultState[k])) {
      diff[k] = state[k];
    }
  });
  if (Object.keys(diff).length === 0) return '';
  try {
    return btoa(encodeURIComponent(JSON.stringify(diff)));
  } catch (e) {
    return '';
  }
};

// Helper to deserialize from URL string
const deserializeFilters = (encoded: string | null): Partial<FilterState> => {
  if (!encoded) return {};
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  } catch (e) {
    console.warn('Failed to parse filters from URL');
    return {};
  }
};

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
