import { useContext } from 'react';
import { LoadingContext } from './loadingContext';

export const useLoading = () => {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    return {
      addTask: () => {},
      updateTask: () => {},
      removeTask: () => {},
      tasks: [],
    };
  }
  return ctx;
};
