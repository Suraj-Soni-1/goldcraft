import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Search, Pencil, Trash2, Plus, BarChart3, AlertCircle, Zap, MessageSquare, Download } from 'lucide-react'
import { api, fmt, fmtDate, statusBadge } from '../../utils/helpers'
import { downloadAndSharePDF } from '../../utils/whatsapp'
import { useToast } from '../../components/Toast'
import BillModal from './BillModal'
import WhatsAppModal from '../../components/WhatsAppModal'
import ConfirmModal from '../../components/ConfirmModal'

function useAnimatedCounter(target: number, duration = 1000) {
  const [val, setVal] = useState(0)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const update = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(ease * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(update)
    }
    rafRef.current = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])
  return val
}

export default function Bills() {
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editBill, setEditBill] = useState<any>(null)
  const [whatsAppBill, setWhatsAppBill] = useState<any>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const { toast } = useToast()

  const load = (isBackground = false) => {
    if (!isBackground) setLoading(true)
    api.getBills()
      .then((d: any[]) => { setBills(d); setLoading(false) })
      .catch((err: any) => {
        console.error(err)
        if (!isBackground) toast(err?.message || 'Failed to load bills', 'error')
        setLoading(false)
      })
    api.getSettings().then(s => setSettings(s || {}))
  }

  useEffect(() => {
    load(false)
    const handleSync = () => load(true)
    window.addEventListener('gc_cloud_sync_update', handleSync)
    return () => window.removeEventListener('gc_cloud_sync_update', handleSync)
  }, [])

  const filtered = bills.filter(b => {
    const matchSearch = !search ||
      b.bill_number?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleSave = async (billData: any, items: any[]) => {
    try {
      if (editBill) {
        setBills(prev => prev.map(b => b.id === editBill.id ? { ...b, ...billData } : b))
        await api.updateBill(editBill.id, billData, items)
        toast('Invoice updated successfully')
      } else {
        const tempId = Date.now()
        const newBillObj = { id: tempId, ...billData }
        setBills(prev => [newBillObj, ...prev])
        const savedId = await api.addBill(billData, items)
        toast('New Invoice created & saved')
        // Automatically open WhatsApp prompt to send thank you invoice message!
        setWhatsAppBill({ ...newBillObj, id: savedId })
      }
      setShowModal(false); setEditBill(null); load(true)
    } catch (err: any) {
      console.error(err)
      toast(err?.message || 'Failed to save bill', 'error')
    }
  }

  const confirmDelete = async (id: number) => {
    setDeleteTargetId(null)
    setBills(prev => prev.filter(b => b.id !== id))
    try {
      await api.deleteBill(id)
      toast('Bill removed permanently', 'error')
      load(true)
    } catch (err: any) {
      toast(err?.message || 'Failed to delete bill', 'error')
      load(true)
    }
  }

  const totalRevenue = bills.reduce((s, b) => s + (b.grand_total || 0), 0)
  const totalDue = bills.reduce((s, b) => s + (b.remaining_due || 0), 0)
  const monthCount = bills.filter(b => new Date(b.bill_date).getMonth() === new Date().getMonth()).length
  const paidCount = bills.filter(b => b.status === 'paid').length

  const animRevenue = useAnimatedCounter(Math.round(totalRevenue))
  const animDue = useAnimatedCounter(Math.round(totalDue))
  const animMonthCount = useAnimatedCounter(monthCount)

  const stats = [
    {
      label: 'Total Revenue Billed', value: '₹' + animRevenue.toLocaleString('en-IN'),
      icon: BarChart3, color: 'var(--gold-300)', sub: 'Cumulative invoice volume'
    },
    {
      label: 'Outstanding Dues', value: '₹' + animDue.toLocaleString('en-IN'),
      icon: AlertCircle, color: 'var(--red)', sub: 'Pending customer balances'
    },
    {
      label: 'Bills This Month', value: animMonthCount,
      icon: Zap, color: 'var(--blue)', sub: `${paidCount} fully paid`
    },
  ]

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FileText size={28} style={{ color: 'var(--gold-300)' }} />
            Invoices &amp; Billing
          </h1>
          <p className="page-subtitle">{bills.length} Total Invoices · {paidCount} Fully Paid</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 8px 30px rgba(253, 176, 34, 0.55)' }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary btn-lg"
          onClick={() => { setEditBill(null); setShowModal(true) }}
        >
          <Plus size={18} /> Create New Invoice
        </motion.button>
      </div>

      {/* Stat Cards */}
      <div className="card-grid card-grid-3" style={{ marginBottom: 24 }}>
        {stats.map((s, idx) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              className="card stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, type: 'spring', stiffness: 300 }}
              whileHover={{ y: -5, boxShadow: '0 20px 60px rgba(0,0,0,0.5), var(--shadow-gold)' }}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              {/* bg glow blob */}
              <div style={{
                position: 'absolute', top: -30, right: -30, width: 100, height: 100,
                background: s.color, borderRadius: '50%', opacity: 0.07, filter: 'blur(28px)',
                pointerEvents: 'none'
              }} />
              <div style={{
                width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${s.color}18`, border: `1px solid ${s.color}30`, marginBottom: 12
              }}>
                <Icon size={20} color={s.color} />
              </div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value gold" style={{ fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </motion.div>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-bar" style={{ width: 320 }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              className="form-input"
              placeholder="Search by Bill # or Customer Name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none' }}
            />
          </div>

          <select className="form-select" style={{ width: 170 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Invoice Status</option>
            <option value="paid">Paid Full</option>
            <option value="partial">Partial Paid</option>
            <option value="pending">Pending Unpaid</option>
          </select>
        </div>

        <div className="toolbar-right">
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
            Showing {filtered.length} of {bills.length}
          </span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
          >
            <FileText size={52} style={{ color: 'var(--gold-300)', opacity: 0.3 }} />
            <div className="empty-title">No Invoices Found</div>
            <div className="empty-sub">Create your first bill to record gold/silver transactions.</div>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="btn btn-primary btn-sm"
              style={{ marginTop: 8 }}
              onClick={() => { setEditBill(null); setShowModal(true) }}
            >
              <Plus size={14} /> Create Invoice
            </motion.button>
          </motion.div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>INVOICE #</th>
                <th>CUSTOMER NAME</th>
                <th>BILL DATE</th>
                <th className="td-right">GRAND TOTAL</th>
                <th className="td-right">PAID AMOUNT</th>
                <th className="td-right">REMAINING DUE</th>
                <th>PAYMENT METHOD</th>
                <th>STATUS</th>
                <th className="td-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <motion.tr
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ backgroundColor: 'rgba(253, 176, 34, 0.06)' }}
                >
                  <td style={{ fontWeight: 800, color: 'var(--gold-200)', fontFamily: "'Outfit', sans-serif" }}>
                    {b.bill_number}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.customer_name || 'Walk-in Customer'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.customer_phone || 'No phone'}</div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 500 }}>
                    {fmtDate(b.bill_date)}
                  </td>
                  <td className="td-right" style={{ fontWeight: 800, fontSize: 14, color: 'var(--gold-100)', fontFamily: "'Outfit', sans-serif" }}>
                    {fmt(b.grand_total)}
                  </td>
                  <td className="td-right" style={{ color: 'var(--green)', fontWeight: 700 }}>
                    {fmt(b.amount_paid)}
                  </td>
                  <td className="td-right" style={{ color: b.remaining_due > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
                    {fmt(b.remaining_due)}
                  </td>
                  <td style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {b.payment_method?.replace('_', ' ')}
                  </td>
                  <td><span className={statusBadge(b.status)}>{b.status}</span></td>
                  <td className="td-right">
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="btn btn-sm"
                        onClick={() => setWhatsAppBill(b)}
                        title="Share on WhatsApp"
                        style={{
                          background: 'rgba(37, 211, 102, 0.15)', border: '1px solid rgba(37, 211, 102, 0.4)',
                          color: '#25D366', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700
                        }}
                      >
                        <MessageSquare size={13} /> WhatsApp
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="btn btn-secondary btn-sm"
                        onClick={async () => {
                          const { items } = await api.getBill(b.id)
                          downloadAndSharePDF(b, items || [], settings)
                          toast(`Downloading PDF for #${b.bill_number}...`)
                        }}
                        title="Download GST PDF"
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Download size={12} /> PDF
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setEditBill(b); setShowModal(true) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <Pencil size={12} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteTargetId(b.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <Trash2 size={12} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <BillModal
            bill={editBill}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditBill(null) }}
          />
        )}
        {whatsAppBill && (
          <WhatsAppModal
            isOpen={Boolean(whatsAppBill)}
            bill={whatsAppBill}
            onClose={() => setWhatsAppBill(null)}
          />
        )}
        {deleteTargetId !== null && (
          <ConfirmModal
            title="Delete Invoice"
            message="Are you sure you want to delete this bill? This action cannot be undone."
            confirmText="Delete Invoice"
            onConfirm={() => confirmDelete(deleteTargetId)}
            onCancel={() => setDeleteTargetId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
