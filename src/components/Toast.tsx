import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Check } from 'lucide-react';

type Kind = 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  kind: Kind;
  action?: { label: string; run: () => void };
}
interface ToastApi {
  success: (message: string, action?: ToastItem['action']) => void;
  error: (message: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const push = useCallback((message: string, kind: Kind, action?: ToastItem['action']) => {
    const id = next.current++;
    setToasts((t) => [...t.slice(-2), { id, message, kind, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 6000 : kind === 'error' ? 5000 : 2600);
  }, []);

  const api = useRef<ToastApi>({
    success: (m, a) => push(m, 'success', a),
    error: (m) => push(m, 'error'),
  }).current;

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === 'success' ? <Check /> : <AlertCircle />}
            <span>{t.message}</span>
            {t.action && (
              <button
                className="toast-action"
                onClick={() => {
                  t.action!.run();
                  setToasts((all) => all.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast doit être utilisé dans ToastProvider');
  return ctx;
}
