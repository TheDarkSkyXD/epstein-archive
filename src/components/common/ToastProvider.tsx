import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';

type Toast = {
  id: string;
  text: string;
  type?: 'info' | 'success' | 'error' | 'warning' | 'loading';
  action?: { label: string; onClick: () => void };
};

const ToastCtx = createContext<{ addToast: (t: Omit<Toast, 'id'>) => void } | null>(null);

export function useToasts() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('ToastProvider missing');
  return ctx;
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, text: t.text, type: t.type || 'info', action: t.action };
    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss logic - don't auto-dismiss loading toasts
    if (t.type !== 'loading') {
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    if (toasts.length > 6) setToasts((prev) => prev.slice(-6));
  }, [toasts]);

  return (
    <ToastCtx.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-3 right-3 z-[100] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded-lg text-xs shadow-md border flex items-center justify-between ${t.type === 'success' ? 'bg-emerald-900/70 border-emerald-700 text-emerald-200' : t.type === 'error' ? 'bg-red-900/70 border-red-700 text-red-200' : t.type === 'warning' ? 'bg-yellow-900/70 border-yellow-700 text-yellow-200' : t.type === 'loading' ? 'bg-blue-900/70 border-blue-700 text-blue-200' : 'bg-slate-900/70 border-slate-700 text-slate-200'}`}
          >
            <div className="flex items-center">
              {t.text}
              {t.type === 'loading' && (
                <div className="ml-2 w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick();
                  removeToast(t.id);
                }}
                className="ml-2 px-2 py-1 text-xs rounded hover:bg-white/10 transition-colors"
              >
                {t.action.label}
              </button>
            )}
            {t.type !== 'loading' && (
              <button
                onClick={() => removeToast(t.id)}
                className="ml-2 text-xs hover:text-white/80"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
