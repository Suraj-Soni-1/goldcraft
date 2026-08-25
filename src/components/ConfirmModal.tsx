import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
      style={{ zIndex: 999999, pointerEvents: 'auto' }}
    >
      <motion.div
        className="modal modal-sm"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1000000 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: type === 'danger' ? 'rgba(244,63,94,0.15)' : 'rgba(251,146,60,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: type === 'danger' ? 'var(--red)' : 'var(--orange)'
          }}>
            <AlertTriangle size={22} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
        </div>

        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel} type="button">
            {cancelText}
          </button>
          <button
            className={type === 'danger' ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={() => {
              onConfirm()
              setTimeout(() => window.focus(), 50)
            }}
            type="button"
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
