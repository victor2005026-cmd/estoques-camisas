import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

type ToastTipo = 'sucesso' | 'erro' | 'info';

interface ToastState {
  mensagem: string;
  tipo: ToastTipo;
  visivel: boolean;
}

interface ToastContextValue {
  mostrar: (mensagem: string, tipo?: ToastTipo) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ mensagem: '', tipo: 'info', visivel: false });
  const timerRef = useRef<number | undefined>(undefined);

  const mostrar = useCallback((mensagem: string, tipo: ToastTipo = 'info') => {
    setToast({ mensagem, tipo, visivel: true });
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setToast((s) => ({ ...s, visivel: false }));
    }, 3200);
  }, []);

  const cores: Record<ToastTipo, string> = {
    erro: 'bg-red-600',
    sucesso: 'bg-green-600',
    info: 'bg-gray-900',
  };

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      <div
        className={`fixed left-1/2 bottom-24 -translate-x-1/2 px-4 py-3 rounded-full text-sm font-semibold text-white shadow-lg max-w-[90vw] text-center transition-all duration-200 z-[100] ${
          toast.visivel ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        } ${cores[toast.tipo]}`}
      >
        {toast.mensagem}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return ctx;
}
