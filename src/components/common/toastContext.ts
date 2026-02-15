import { createContext } from 'react';

export type Toast = {
  id: string;
  text: string;
  type?: 'info' | 'success' | 'error' | 'warning' | 'loading';
  action?: { label: string; onClick: () => void };
};

export const ToastCtx = createContext<{ addToast: (t: Omit<Toast, 'id'>) => void } | null>(null);
