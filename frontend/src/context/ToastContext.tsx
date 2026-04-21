import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

// ── Context ───────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  showToast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {}
})

// ── Provider ──────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const success = useCallback((m: string) => showToast(m, 'success'), [showToast])
  const error   = useCallback((m: string) => showToast(m, 'error'),   [showToast])
  const warning = useCallback((m: string) => showToast(m, 'warning'), [showToast])
  const info    = useCallback((m: string) => showToast(m, 'info'),    [showToast])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toasts, showToast, success, error, warning, info }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ── Toast Item ────────────────────────────────────────────────

const toastStyles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
  success: { bg: 'bg-emerald-950', border: 'border-emerald-500/40', icon: <CheckCircle2 size={18} className="text-emerald-400 shrink-0" /> },
  error:   { bg: 'bg-red-950',     border: 'border-red-500/40',     icon: <XCircle size={18} className="text-red-400 shrink-0" /> },
  warning: { bg: 'bg-amber-950',   border: 'border-amber-500/40',   icon: <AlertTriangle size={18} className="text-amber-400 shrink-0" /> },
  info:    { bg: 'bg-slate-900',   border: 'border-slate-500/40',   icon: <Info size={18} className="text-slate-400 shrink-0" /> }
}

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const style = toastStyles[toast.type]
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-xl ${style.bg} ${style.border} animate-slide-up`}>
      {style.icon}
      <span className="text-sm text-white flex-1">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="text-slate-500 hover:text-white transition-colors shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}

export const useToast = () => useContext(ToastContext)
