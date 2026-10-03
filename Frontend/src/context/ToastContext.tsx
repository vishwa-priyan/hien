import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    const dur = toast.duration ?? 4500;
    setTimeout(() => {
      removeToast(id);
    }, dur);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 max-w-md w-full pointer-events-none p-4">
        {toasts.map(toast => {
          const bgColors = {
            success: 'bg-emerald-50 border-emerald-300 text-emerald-950',
            error: 'bg-red-50 border-red-300 text-red-950',
            warning: 'bg-amber-50 border-amber-300 text-amber-950',
            info: 'bg-blue-50 border-blue-300 text-blue-950',
          };
          const Icon = {
            success: CheckCircle2,
            error: XCircle,
            warning: AlertTriangle,
            info: Info,
          }[toast.type];

          const iconColors = {
            success: 'text-emerald-600',
            error: 'text-red-600',
            warning: 'text-amber-600',
            info: 'text-blue-600',
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-lg transition-all transform translate-y-0 ${bgColors[toast.type]}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColors}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{toast.title}</div>
                {toast.description && (
                  <div className="text-xs mt-0.5 opacity-90 leading-relaxed">
                    {toast.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Close toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
