import { useContext } from 'react';
import { FilterContext } from './FilterContext.helpers';

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};
