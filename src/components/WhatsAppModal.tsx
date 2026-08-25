import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Download, CheckCircle, MessageSquare, Phone, Store } from 'lucide-react'
import { sendWhatsAppInvoice, downloadAndSharePDF, generateWhatsAppInvoiceMessage } from '../utils/whatsapp'
import { api } from '../utils/helpers'
import { useToast } from './Toast'

interface WhatsAppModalProps {
  isOpen: boolean
  bill: any
  items?: any[]
  onClose: () => void
}

export default function WhatsAppModal({ isOpen, bill, items = [], onClose }: WhatsAppModalProps) {
  const [phone, setPhone] = useState(bill?.customer_phone || '')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const { toast } = useToast()

  useEffect(() => {
    if (bill?.customer_phone) setPhone(bill.customer_phone)
    api.getSettings().then((s: Record<string, string>) => setSettings(s || {}))
  }, [bill])

  if (!isOpen || !bill) return null

  const handleSend = () => {
    const updatedBill = { ...bill, customer_phone: phone }
    const success = sendWhatsAppInvoice(updatedBill, items, settings)
    if (success) {
      toast('Opening WhatsApp with invoice & thank you message!')
      onClose()
    } else {
      toast('Could not open WhatsApp', 'error')
    }
  }

  const handleDownloadPDF = () => {
    downloadAndSharePDF(bill, items, settings)
    toast('Downloading Official GST PDF invoice...')
  }

  const previewText = generateWhatsAppInvoiceMessage({ ...bill, customer_phone: phone }, items, settings)

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(2, 1, 8, 0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
      }}>
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="card"
          style={{
            maxWidth: 520, width: '100%', padding: 24,
            border: '1px solid rgba(37, 211, 102, 0.35)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.85), 0 0 30px rgba(37, 211, 102, 0.15)',
            position: 'relative', overflow: 'hidden'
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', width: 32, height: 32, borderRadius: 8,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(37, 211, 102, 0.4)', flexShrink: 0
            }}>
              <MessageSquare size={24} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Share Bill on WhatsApp
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0' }}>
                Invoice #{bill.bill_number} · {bill.customer_name || 'Customer'}
              </p>
            </div>
          </div>

          {/* Phone input */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              WhatsApp Mobile Number
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                height: 42, padding: '0 12px', background: 'var(--bg-base)',
                border: '1px solid var(--border)', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 6, flex: 1
              }}>
                <Phone size={15} color="#25D366" />
                <input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{
                    border: 'none', background: 'transparent', color: 'var(--text-primary)',
                    outline: 'none', width: '100%', fontSize: 13.5, fontWeight: 600
                  }}
                />
              </div>
            </div>
          </div>

          {/* Message Preview Box */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Thank You Message Preview
            </label>
            <div style={{
              background: 'rgba(5, 4, 12, 0.8)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 14, maxHeight: 180, overflowY: 'auto',
              fontSize: 11.5, lineHeight: 1.5, color: '#e0e0e0', whiteSpace: 'pre-line',
              fontFamily: 'monospace'
            }}>
              {previewText}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDownloadPDF}
              className="btn btn-secondary"
              style={{
                height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontWeight: 700, fontSize: 13
              }}
            >
              <Download size={16} /> Download PDF
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSend}
              style={{
                height: 46, background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                color: '#ffffff', border: 'none', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontWeight: 800, fontSize: 13.5, cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(37, 211, 102, 0.4)'
              }}
            >
              <Send size={16} /> Send on WhatsApp
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
