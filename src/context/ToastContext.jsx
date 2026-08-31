import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";

const ToastContext = createContext(null);

const VARIANTS = {
  success: { icon: CheckCircle2, ring: "ring-emerald-400/30", color: "text-emerald-400" },
  error: { icon: XCircle, ring: "ring-rose-400/30", color: "text-rose-400" },
  warning: { icon: AlertTriangle, ring: "ring-amber-400/30", color: "text-amber-400" },
  info: { icon: Info, ring: "ring-indigo-400/30", color: "text-indigo-400" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message, variant = "info", duration = 4200) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((list) => [...list.slice(-3), { id, message, variant }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration)
      );
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      notify,
      dismiss,
      success: (message) => notify(message, "success"),
      error: (message) => notify(message, "error", 6000),
      warning: (message) => notify(message, "warning", 5000),
      info: (message) => notify(message, "info"),
    }),
    [notify, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
        {toasts.map((toast) => {
          const variant = VARIANTS[toast.variant] || VARIANTS.info;
          const Icon = variant.icon;
          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-xl border border-line-strong bg-surface-solid/95 p-3.5 shadow-soft ring-1 backdrop-blur-xl"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${variant.color}`} />
              <p className="flex-1 text-sm leading-snug text-ink-soft">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-md p-1 text-muted transition hover:bg-white/10 hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
