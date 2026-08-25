import { useState } from 'react'
import { motion } from 'framer-motion'
import { fmt } from '../../utils/helpers'

interface Props {
  customer: any
  initialDeduction?: boolean
  onSave: (amount: number, isDeduction: boolean, paymentMethod: string, notes: string) => void
  onClose: () => void
}

export default function AdjustBalanceModal({ customer, initialDeduction = true, onSave, onClose }: Props) {
  const [amount, setAmount] = useState('')
  const [isDeduction, setIsDeduction] = useState(initialDeduction)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return alert('Please enter a valid amount')
    onSave(amt, isDeduction, paymentMethod, notes)
  }

  return (
    <motion.div
      className="bill-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, pointerEvents: 'auto' }}
    >
      <motion.div
        className="bill-dialog"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{ width: 480, padding: 26, borderRadius: 16, background: 'var(--bg-card)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, color: 'var(--gold-300)', fontWeight: 800 }}>
            {isDeduction ? '💸 Receive Payment' : '➕ Add Money / Charge Credit'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ marginBottom: 20, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Customer</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{customer.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current Due Balance</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: customer.total_due > 0 ? 'var(--red)' : customer.total_due < 0 ? 'var(--blue)' : 'var(--green)' }}>
              {fmt(customer.total_due || 0)} {customer.total_due < 0 ? '(Advance Credit)' : ''}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Transaction Type</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, border: `1px solid ${isDeduction ? 'var(--green)' : 'rgba(255,255,255,0.1)'}`, background: isDeduction ? 'rgba(40,167,69,0.12)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input type="radio" checked={isDeduction} onChange={() => setIsDeduction(true)} style={{ accentColor: 'var(--green)' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: isDeduction ? 'var(--green)' : 'var(--text-primary)' }}>Receive Money</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Deduct from due balance</div>
                </div>
              </label>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, border: `1px solid ${!isDeduction ? 'var(--red)' : 'rgba(255,255,255,0.1)'}`, background: !isDeduction ? 'rgba(232,69,69,0.12)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input type="radio" checked={!isDeduction} onChange={() => setIsDeduction(false)} style={{ accentColor: 'var(--red)' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: !isDeduction ? 'var(--red)' : 'var(--text-primary)' }}>Add Money / Credit</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Increase due balance</div>
                </div>
              </label>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Amount (₹) *</label>
            <input type="number" step="0.01" className="bi" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="e.g. 5000" autoFocus />
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Payment Method (Optional)</label>
            <select className="bi bi-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="cash">💵 Cash</option>
              <option value="upi">📱 UPI / GPay / PhonePe</option>
              <option value="bank">🏦 Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="card">💳 Credit / Debit Card</option>
              <option value="cheque">📜 Cheque</option>
              <option value="other">🌐 Other / Adjustment</option>
            </select>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Reason / Notes (Optional)</label>
            <textarea className="bi" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Received partial cash advance" style={{ resize: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {isDeduction ? 'Confirm Money Received' : 'Confirm Money Added'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
