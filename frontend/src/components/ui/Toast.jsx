import { createContext, useContext, useCallback, useState, useMemo } from 'react'
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)

const TOAST_ICONS = {
  success: { Icon: CheckCircle, color: '#10b981', bg: 'rgba(52,211,153,0.12)' },
  error:   { Icon: AlertCircle, color: '#ef4444', bg: 'rgba(248,113,113,0.12)' },
  info:    { Icon: Info,        color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  warning: { Icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
}

let id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((msg, type = 'info', duration = 4000) => {
    const toastId = ++id
    setToasts(prev => [...prev, { id: toastId, msg, type, duration, exiting: false }])
    setTimeout(() => dismiss(toastId), duration)
  }, [])

  const dismiss = useCallback((toastId) => {
    setToasts(prev => prev.map(t => t.id === toastId ? { ...t, exiting: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toastId)), 300)
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(({ id: tid, msg, type, duration, exiting }) => {
          const cfg = TOAST_ICONS[type] || TOAST_ICONS.info
          const { Icon } = cfg
          const [title, body] = Array.isArray(msg) ? msg : [msg, '']
          return (
            <div key={tid} className={`toast${exiting ? ' exit' : ''}`}>
              <div className="toast-icon" style={{ background: cfg.bg }}>
                <Icon size={16} color={cfg.color} />
              </div>
              <div className="toast-body">
                <div className="toast-title">{title}</div>
                {body && <div className="toast-msg">{body}</div>}
              </div>
              <button className="toast-close" onClick={() => dismiss(tid)}>
                <X size={14} />
              </button>
              <div
                className="toast-progress"
                style={{
                  background: cfg.color,
                  animationDuration: `${duration}ms`,
                }}
              />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return useMemo(() => ({
    success: (msg, body) => ctx(body ? [msg, body] : msg, 'success'),
    error:   (msg, body) => ctx(body ? [msg, body] : msg, 'error'),
    info:    (msg, body) => ctx(body ? [msg, body] : msg, 'info'),
    warning: (msg, body) => ctx(body ? [msg, body] : msg, 'warning'),
  }), [ctx])
}
