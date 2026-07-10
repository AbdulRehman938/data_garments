import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX, FiAlertTriangle } from 'react-icons/fi';

/* ─────────────────────────── Types ─────────────────────────── */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, title?: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

/* ─────────────────────────── Context ─────────────────────────── */
const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};

/* ─────────────────────────── Provider ─────────────────────────── */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const toast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ open: true, options, resolve });
    });
  }, []);

  const resolveConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  const icons: Record<ToastType, React.ReactNode> = {
    success: <FiCheckCircle size={18} className="text-emerald-500 shrink-0" />,
    error:   <FiAlertCircle size={18} className="text-red-500 shrink-0" />,
    warning: <FiAlertTriangle size={18} className="text-amber-500 shrink-0" />,
    info:    <FiInfo size={18} className="text-logo-rose shrink-0" />,
  };

  const borders: Record<ToastType, string> = {
    success: 'border-l-emerald-500',
    error:   'border-l-red-500',
    warning: 'border-l-amber-500',
    info:    'border-l-logo-rose',
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* ── Toast Stack ── */}
      <div className="fixed bottom-5 right-4 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`pointer-events-auto w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-logo-rose/10 border-l-4 px-4 py-3.5 flex items-start gap-3 ${borders[t.type]}`}
            >
              {icons[t.type]}
              <div className="flex-1 min-w-0">
                {t.title && <p className="font-sans text-xs font-bold text-logo-black mb-0.5">{t.title}</p>}
                <p className="font-sans text-xs text-logo-black/80 leading-relaxed">{t.message}</p>
              </div>
              <button onClick={() => dismiss(t.id)} className="shrink-0 p-1 hover:bg-logo-rose/10 rounded-full transition-colors cursor-pointer mt-0.5">
                <FiX size={13} className="text-logo-black/40" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Confirm Modal ── */}
      <AnimatePresence>
        {confirmState?.open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000]"
              onClick={() => resolveConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-3xl shadow-2xl border border-logo-rose/15 p-7 w-full max-w-sm">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${confirmState.options.danger ? 'bg-red-50' : 'bg-logo-rose/10'}`}>
                  {confirmState.options.danger
                    ? <FiAlertTriangle size={22} className="text-red-500" />
                    : <FiInfo size={22} className="text-logo-rose" />
                  }
                </div>
                <h3 className="font-serif text-lg text-logo-black mb-2">{confirmState.options.title}</h3>
                <p className="font-sans text-sm text-logo-black/65 leading-relaxed mb-6">{confirmState.options.message}</p>
                <div className="flex gap-3">
                  <button onClick={() => resolveConfirm(false)}
                    className="flex-1 py-2.5 border border-logo-rose/20 rounded-xl text-sm font-semibold text-logo-black hover:bg-logo-rose/5 transition-all cursor-pointer font-sans">
                    {confirmState.options.cancelLabel ?? 'Cancel'}
                  </button>
                  <button onClick={() => resolveConfirm(true)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer font-sans ${confirmState.options.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-action-bordeaux hover:bg-[#460416]'}`}>
                    {confirmState.options.confirmLabel ?? 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};
