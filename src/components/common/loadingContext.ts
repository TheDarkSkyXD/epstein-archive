import { createContext } from 'react';

export interface LoadingTask {
  id: string;
  label: string;
  progress?: number;
  startTime: number;
}

export interface LoadingContextType {
  addTask: (id: string, label: string) => void;
  updateTask: (id: string, progress: number) => void;
  removeTask: (id: string) => void;
  tasks: LoadingTask[];
}

export const LoadingContext = createContext<LoadingContextType | null>(null);
