import { useContext } from 'react';
import { DegradedModeContext } from './DegradedModeContext.helpers';

export function useDegradedMode() {
  const context = useContext(DegradedModeContext);
  if (!context) throw new Error('useDegradedMode must be used within DegradedModeProvider');
  return context;
}
