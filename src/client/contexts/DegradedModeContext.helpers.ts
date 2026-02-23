import { createContext } from 'react';

export interface DegradedModeState {
  isDegraded: boolean;
  setDegraded: (degraded: boolean) => void;
}

export const DegradedModeContext = createContext<DegradedModeState | undefined>(undefined);
