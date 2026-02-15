import { useContext } from 'react';
import { ToastCtx } from './toastContext';

export function useToasts() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('ToastProvider missing');
  return ctx;
}
