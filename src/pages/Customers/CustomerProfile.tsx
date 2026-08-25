import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Phone, Mail, MapPin, Tag, Download,
  ArrowDownLeft, ArrowUpRight, Edit3, Trash2, Receipt, Calendar,
  Wallet, ShieldCheck, Sparkles, User, FileText, Search, CheckCircle2
} from 'lucide-react'
import { api, fmt, fmtDate, initials, statusBadge } from '../../utils/helpers'
import { generateBillPDF } from '../../utils/pdfGenerator'
import { useToast } from '../../components/Toast'
import AdjustBalanceModal from './AdjustBalanceModal'
import ConfirmModal from '../../components/ConfirmModal'

interface Props {
  customerId: number
  initialCustomer?: any
  onBack: () => void
  onEdit: (c: any) => void
}

export default function CustomerProfile({ customerId, initialCustomer, onBack, onEdit }: Props) {
  const [data, setData] = useState<{ customer: any; bills: any[] } | null>(
    initialCustomer ? { customer: initialCustomer, bills: [] } : null
  )
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustMode, setAdjustMode] = useState<'receive' | 'add'>('receive')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const { toast } = useToast()

  const reload = useCallback(() => {
    api.getCustomer(customerId).then(res => {
      if (res && res.customer) {
        setData(res)
      } else if (initialCustomer) {
        setData(prev => prev || { customer: initialCustomer, bills: [] })
      } else {
        setData(res)
      }
    }).catch(() => {
      if (initialCustomer) {
        setData(prev => prev || { customer: initialCustomer, bills: [] })
      }
    })
  }, [customerId, initialCustomer])

  useEffect(() => {
    reload()
    const handleSync = () => reload()
    window.addEventListener('gc_cloud_sync_update', handleSync)
    return () => window.removeEventListener('gc_cloud_sync_update', handleSync)
  }, [reload])

  if (!data) return <div className="page"><div className="empty-state"><div className="spinner" /></div></div>
  if (!data.customer) {
    return (
      <div className="page">
        <div className="empty-state" style={{ padding: 60 }}>
          <div className="empty-icon"><User size={52} style={{ color: 'var(--gold-400)' }} /></div>
          <div className="empty-title">Customer Profile Not Found</div>
          <div className="empty-sub">This customer record may have been removed or does not exist.</div>
          <button className="btn btn-primary" onClick={onBack} style={{ marginTop: 20 }}>
            <ArrowLeft size={16} /> Back to Customer Directory
          </button>
        </div>
      </div>
    )
  }

  const c = data.customer
  const bills = data.bills || []
  const totalBusiness = bills.reduce((s: number, b: any) => s + (b.grand_total || 0), 0)
  const totalPaid = bills.reduce((s: number, b: any) => s + (b.amount_paid || 0), 0)

  const filteredBills = bills.filter(b =>
    !searchFilter ||
    b.bill_number?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    b.payment_method?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    b.status?.toLowerCase().includes(searchFilter.toLowerCase())
  )

  const handleDownload = async (bill: any) => {
    try {
      const full = await api.getBill(bill.id)
      const settings = await api.getSettings()
      generateBillPDF(full.bill, full.items, settings)
      toast('Invoice PDF downloaded successfully')
    } catch {
      toast('Failed to generate PDF invoice', 'error')
    }
  }

  const handleAdjustBalance = async (amount: number, isDeduction: boolean, paymentMethod: string, notes: string) => {
    try {
      await api.adjustCustomerBalance(customerId, amount, isDeduction, paymentMethod, notes)
      toast(isDeduction ? 'Payment received successfully' : 'Credit added successfully')
      setShowAdjustModal(false)
      reload()
    } catch (err: any) {
      console.error(err)
      toast(err?.message || 'Failed to adjust balance', 'error')
    }
  }

  const handleDeleteCustomer = async () => {
    try {
      await api.deleteCustomer(customerId)
      toast('Customer profile deleted', 'error')
      setShowDeleteConfirm(false)
      onBack()
    } catch (err: any) {
      console.error(err)
      toast(err?.message || 'Failed to delete customer', 'error')
    }
  }

  const isDue = c.total_due > 0
  const isAdvance = c.total_due < 0
  const themeColor = isDue ? '#f43f5e' : isAdvance ? '#38bdf8' : '#10b981'
  const themeGlow = isDue ? 'rgba(244, 63, 94, 0.2)' : isAdvance ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)'

  return (
    <div className="page" style={{ gap: 24, maxWidth: 1400, margin: '0 auto' }}>

      {/* Top Header & Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <motion.button
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.96 }}
          className="btn btn-ghost btn-sm"
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--gold-200)', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Back to Directory
        </motion.button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-muted)' }}>
          <span>Customer Directory</span>
          <span>/</span>
          <span style={{ color: 'var(--gold-300)', fontWeight: 600 }}>{c.name}</span>
        </div>
      </div>

      {/* Hero Customer Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: 'linear-gradient(135deg, rgba(22, 17, 34, 0.95) 0%, rgba(12, 9, 20, 0.98) 100%)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(253, 176, 34, 0.2)',
          borderRadius: 24,
          padding: '32px 36px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Ambient Glow Circles */}
        <div style={{
          position: 'absolute', top: -70, right: -70, width: 280, height: 280,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(253, 176, 34, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, position: 'relative', zIndex: 1 }}>

          {/* Top Section: Avatar, Customer Info (Left) & Account Balance Badge (Right) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>

            {/* Left Info Stack */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              <div
                style={{
                  width: 72, height: 72, borderRadius: 20, fontSize: 28, fontWeight: 900,
                  background: 'linear-gradient(135deg, #fdb022 0%, #d97706 100%)',
                  color: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(253, 176, 34, 0.35)', flexShrink: 0
                }}
              >
                {initials(c.name)}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 30, fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                    {c.name}
                  </h1>

                  {c.gst_number && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                      background: 'rgba(253, 176, 34, 0.12)', color: 'var(--gold-300)',
                      border: '1px solid rgba(253, 176, 34, 0.3)', padding: '3px 10px', borderRadius: 20
                    }}>
                      GSTIN: {c.gst_number}
                    </span>
                  )}
                </div>

                {/* Contact Meta Items */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  {c.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                      <Phone size={14} style={{ color: 'var(--gold-400)' }} /> {c.phone}
                    </div>
                  )}
                  {c.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                      <Mail size={14} style={{ color: 'var(--gold-400)' }} /> {c.email}
                    </div>
                  )}
                  {c.city && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                      <MapPin size={14} style={{ color: 'var(--gold-400)' }} /> {c.city}
                    </div>
                  )}
                </div>

                {c.address && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    📍 {c.address}
                  </div>
                )}
              </div>
            </div>

            {/* Right Featured Account Balance Box */}
            <div style={{
              background: themeGlow,
              border: `1px solid ${themeColor}40`,
              borderRadius: 18,
              padding: '16px 28px',
              minWidth: 240,
              textAlign: 'center',
              boxShadow: `0 8px 24px ${themeGlow}`
            }}>
              <div style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: themeColor, boxShadow: `0 0 10px ${themeColor}` }} />
                {isDue ? 'Pending Account Due' : isAdvance ? 'Advance Credit Balance' : 'Account Settled'}
              </div>
              <div style={{
                fontSize: 32, fontWeight: 900, fontFamily: "'Outfit', sans-serif",
                color: themeColor, marginTop: 4, letterSpacing: '-0.02em'
              }}>
                {fmt(c.total_due || 0)}
              </div>
            </div>

          </div>

          {/* Bottom Section: Perfectly Equisized Horizontal Action Toolbar (4 Equal-Width Buttons) */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 20
          }}>
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)' }}
              whileTap={{ scale: 0.98 }}
              className="btn"
              onClick={() => { setAdjustMode('receive'); setShowAdjustModal(true) }}
              style={{
                height: 46, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff', border: 'none', fontWeight: 700, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)'
              }}
            >
              <ArrowDownLeft size={16} /> Receive Payment
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(244, 63, 94, 0.35)' }}
              whileTap={{ scale: 0.98 }}
              className="btn"
              onClick={() => { setAdjustMode('add'); setShowAdjustModal(true) }}
              style={{
                height: 46, background: 'rgba(244, 63, 94, 0.12)',
                color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.35)', fontWeight: 700, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13
              }}
            >
              <ArrowUpRight size={16} /> Add Due / Credit
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(253, 176, 34, 0.25)' }}
              whileTap={{ scale: 0.98 }}
              className="btn"
              onClick={() => onEdit(c)}
              style={{
                height: 46, background: 'rgba(253, 176, 34, 0.12)',
                color: 'var(--gold-200)', border: '1px solid rgba(253, 176, 34, 0.35)', fontWeight: 700, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13
              }}
            >
              <Edit3 size={16} /> Edit Profile
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(244, 63, 94, 0.25)' }}
              whileTap={{ scale: 0.98 }}
              className="btn"
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                height: 46, background: 'rgba(255, 255, 255, 0.05)',
                color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.25)', fontWeight: 700, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13
              }}
            >
              <Trash2 size={16} /> Delete Customer
            </motion.button>
          </div>

        </div>
      </motion.div>

      {/* KPI Metric Overview Grid */}
      <div className="card-grid card-grid-4">
        {[
          { label: 'Total Bills', value: bills.length, icon: Receipt, color: 'var(--gold-300)', sub: 'Bills issued' },
          { label: 'Total Sales', value: fmt(totalBusiness), icon: Sparkles, color: '#38bdf8', sub: 'Total purchase value' },
          { label: 'Payments Received', value: fmt(totalPaid), icon: CheckCircle2, color: '#10b981', sub: 'Total cash received' },
          { label: 'Last Visit', value: bills[0] ? fmtDate(bills[0].bill_date) : 'No bills yet', icon: Calendar, color: 'var(--gold-200)', sub: 'Recent transaction' },
        ].map((s, idx) => (
          <motion.div
            key={s.label}
            className="card stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07, type: 'spring', stiffness: 280 }}
            whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)' }}
            style={{
              padding: 24, display: 'flex', flexDirection: 'column', gap: 10,
              background: 'linear-gradient(135deg, rgba(20, 16, 32, 0.8) 0%, rgba(12, 10, 22, 0.9) 100%)',
              border: '1px solid rgba(253, 176, 34, 0.12)', borderRadius: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {s.label}
              </span>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: `linear-gradient(135deg, ${s.color}20 0%, ${s.color}05 100%)`,
                border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <s.icon size={19} style={{ color: s.color }} />
              </div>
            </div>

            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.01em' }}>
              {s.value}
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {s.sub}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Customer Invoices & Billing History Section */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{
          padding: 32, background: 'linear-gradient(135deg, rgba(20, 16, 32, 0.85) 0%, rgba(12, 10, 22, 0.95) 100%)',
          border: '1px solid rgba(253, 176, 34, 0.15)', borderRadius: 24
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: '#ffffff',
              margin: 0, display: 'flex', alignItems: 'center', gap: 12
            }}>
              <FileText size={22} style={{ color: 'var(--gold-300)' }} /> Customer Invoices &amp; Billing History
              <span style={{
                fontSize: 12, background: 'rgba(253, 176, 34, 0.15)', color: 'var(--gold-300)',
                padding: '3px 12px', borderRadius: 20, border: '1px solid rgba(253, 176, 34, 0.3)', fontWeight: 800
              }}>
                {bills.length} Bills
              </span>
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              View and download bills issued to {c.name}
            </p>
          </div>

          {/* Quick Invoice Search Filter */}
          {bills.length > 0 && (
            <div className="search-bar" style={{ width: 280, height: 40, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(253,176,34,0.2)' }}>
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                placeholder="Filter by invoice # or method..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12.5 }}
              />
            </div>
          )}
        </div>

        {bills.length === 0 ? (
          <div className="empty-state" style={{ padding: '56px 24px' }}>
            <div className="empty-icon"><Receipt size={48} style={{ color: 'var(--gold-400)', opacity: 0.4 }} /></div>
            <div className="empty-title" style={{ fontSize: 17, fontWeight: 800, marginTop: 12 }}>No Invoices Issued Yet</div>
            <div className="empty-sub" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Create bills for this customer in Billing workstation to populate complete ledger history.
            </div>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(253, 176, 34, 0.1)' }}>
            <table>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.4)' }}>
                  <th style={{ padding: '16px 20px' }}>INVOICE #</th>
                  <th style={{ padding: '16px 20px' }}>BILL DATE</th>
                  <th className="td-right" style={{ padding: '16px 20px' }}>GRAND TOTAL</th>
                  <th className="td-right" style={{ padding: '16px 20px' }}>PAID AMOUNT</th>
                  <th className="td-right" style={{ padding: '16px 20px' }}>REMAINING DUE</th>
                  <th style={{ padding: '16px 20px' }}>STATUS</th>
                  <th style={{ padding: '16px 20px' }}>PAYMENT METHOD</th>
                  <th className="td-right" style={{ padding: '16px 20px' }}>DOWNLOAD</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((b, i) => (
                  <motion.tr
                    key={b.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ backgroundColor: 'rgba(253, 176, 34, 0.06)' }}
                  >
                    <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--gold-200)', fontFamily: "'Outfit', sans-serif" }}>
                      {b.bill_number}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: 13 }}>
                      {fmtDate(b.bill_date)}
                    </td>
                    <td className="td-right" style={{ padding: '16px 20px', fontWeight: 800, color: '#ffffff', fontFamily: "'Outfit', sans-serif" }}>
                      {fmt(b.grand_total)}
                    </td>
                    <td className="td-right" style={{ padding: '16px 20px', color: '#10b981', fontWeight: 700 }}>
                      {fmt(b.amount_paid)}
                    </td>
                    <td className="td-right" style={{ padding: '16px 20px', color: b.remaining_due > 0 ? '#f43f5e' : '#10b981', fontWeight: 700 }}>
                      {fmt(b.remaining_due)}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={statusBadge(b.status)}>{b.status}</span>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: 11, fontWeight: 700 }}>
                      {b.payment_method}
                    </td>
                    <td className="td-right" style={{ padding: '16px 20px' }}>
                      <motion.button
                        whileHover={{ scale: 1.05, boxShadow: '0 4px 15px rgba(253, 176, 34, 0.25)' }}
                        whileTap={{ scale: 0.95 }}
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDownload(b)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontWeight: 700, borderRadius: 10, padding: '7px 14px',
                          border: '1px solid rgba(253, 176, 34, 0.3)', color: 'var(--gold-200)'
                        }}
                      >
                        <Download size={13} /> Download PDF
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Adjust Balance Modal */}
      <AnimatePresence>
        {showAdjustModal && (
          <AdjustBalanceModal
            customer={c}
            initialDeduction={adjustMode === 'receive'}
            onSave={handleAdjustBalance}
            onClose={() => setShowAdjustModal(false)}
          />
        )}
        {showDeleteConfirm && (
          <ConfirmModal
            title="Delete Customer Profile"
            message={`Are you sure you want to delete ${c.name}? This customer record will be permanently deleted.`}
            confirmText="Delete Customer"
            onConfirm={handleDeleteCustomer}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

