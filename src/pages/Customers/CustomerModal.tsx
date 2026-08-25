import { useState, useRef, useEffect, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { X, UserPlus, Save } from 'lucide-react'

interface Props {
  customer: any
  onSave: (data: any) => void
  onClose: () => void
}

export default function CustomerModal({ customer, onSave, onClose }: Props) {
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name:       customer?.name       || '',
    phone:      customer?.phone      || '',
    email:      customer?.email      || '',
    address:    customer?.address    || '',
    city:       customer?.city       || '',
    gst_number: customer?.gst_number || '',
    total_due:  String(customer?.total_due ?? '0'),
  })
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => nameInputRef.current?.focus(), 80)
    return () => clearTimeout(timer)
  }, [])

  const set = (k: string, v: string) => {
    setErrorMsg('')
    setForm(f => ({ ...f, [k]: v }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setErrorMsg('Client Name is required')
      return
    }
    onSave(form)
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ zIndex: 99999, pointerEvents: 'auto' }}
    >
      <motion.div
        className="modal modal-md"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 100000 }}
      >
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={20} color="var(--gold-300)" />
            {customer ? 'Edit Customer Record' : 'Add New Customer'}
          </h2>
          <button className="modal-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: 'var(--red)',
            fontSize: 13, fontWeight: 600
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            {([
              ['Full Name *',   'name',       'text',   'e.g. Ramesh Sharma'],
              ['Phone Number',  'phone',      'tel',    '+91 98765 43210'],
              ['Email Address', 'email',      'email',  'customer@email.com'],
              ['City / Location','city',       'text',   'Mumbai'],
              ['GST Number',    'gst_number', 'text',   '27AABCG1234A1Z5'],
            ] as [string,string,string,string][]).map(([label, key, type, ph]) => (
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <input
                  ref={key === 'name' ? nameInputRef : undefined}
                  className="form-input"
                  type={type}
                  placeholder={ph}
                  value={(form as any)[key]}
                  onChange={e => set(key, e.target.value)}
                  autoFocus={key === 'name'}
                />
              </div>
            ))}

            {/* Previous Due */}
            <div className="form-group">
              <label className="form-label">Previous Due / Advance (₹)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.total_due}
                onChange={e => set('total_due', e.target.value)}
              />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                Auto-carried forward in all new bills
              </span>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Address</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Full street address…"
                value={form.address}
                onChange={e => set('address', e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={15} />
              {customer ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
