import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' }
interface ToastCtx { toast: (message: string, type?: Toast['type']) => void }

const ToastContext = createContext<ToastCtx>({ toast: () => {} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  
  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        <AnimatePresence mode="sync">
          {toasts.map(t => (
            <motion.div
              key={t.id}
              className={`toast toast-${t.type}`}
              initial={{ opacity: 0, y: 30, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: 50 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              <div style={{
                fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%',
                background: t.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : t.type === 'error' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                color: t.type === 'success' ? '#10b981' : t.type === 'error' ? '#f43f5e' : '#38bdf8'
              }}>
                {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
              </div>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t.message}</span>
              
              {/* Progress timer bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 3.5, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: 3,
                  background: t.type === 'success' ? 'var(--green)' : t.type === 'error' ? 'var(--red)' : 'var(--gold-300)'
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
