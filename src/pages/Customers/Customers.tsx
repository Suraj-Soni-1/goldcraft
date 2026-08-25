import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Search, Pencil, Trash2, Plus, Crown, AlertCircle, CheckCircle } from 'lucide-react'
import { api, fmt, fmtDate, initials } from '../../utils/helpers'
import { useToast } from '../../components/Toast'
import CustomerModal from './CustomerModal'
import CustomerProfile from './CustomerProfile'
import ConfirmModal from '../../components/ConfirmModal'

function useAnimatedCounter(target: number, duration = 1000) {
  const [val, setVal] = useState(0)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const update = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) rafRef.current = requestAnimationFrame(update)
    }
    rafRef.current = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])
  return val
}

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editCustomer, setEditCustomer] = useState<any>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const { toast } = useToast()

  const load = (isBackground = false) => {
    if (!isBackground) setLoading(true)
    api.getCustomers()
      .then(d => { setCustomers(d); setLoading(false) })
      .catch((err: any) => {
        console.error(err)
        if (!isBackground) toast(err?.message || 'Failed to load customers', 'error')
        setLoading(false)
      })
  }

  useEffect(() => {
    load(false)
    const handleSync = () => load(true)
    window.addEventListener('gc_cloud_sync_update', handleSync)
    return () => window.removeEventListener('gc_cloud_sync_update', handleSync)
  }, [])

  const filtered = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.city?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async (data: any) => {
    try {
      if (editCustomer) {
        setCustomers(prev => prev.map(c => c.id === editCustomer.id ? { ...c, ...data } : c))
        await api.updateCustomer(editCustomer.id, data)
        toast('Customer profile updated')
      } else {
        const tempId = Date.now()
        const newObj = { id: tempId, ...data, total_due: parseFloat(data.total_due) || 0, created_at: new Date().toISOString() }
        setCustomers(prev => [newObj, ...prev])
        await api.addCustomer(data)
        toast('New customer added to directory')
      }
      setShowModal(false)
      setEditCustomer(null)
      load(true)
    } catch (err: any) {
      console.error(err)
      toast(err?.message || 'Failed to save customer', 'error')
    }
  }

  const confirmDelete = async (id: number) => {
    setDeleteTargetId(null)
    if (selectedId && String(selectedId) === String(id)) {
      setSelectedId(null)
    }
    if (editCustomer && String(editCustomer.id) === String(id)) {
      setEditCustomer(null)
      setShowModal(false)
    }
    setCustomers(prev => prev.filter(c => String(c.id) !== String(id)))
    try {
      await api.deleteCustomer(id)
      toast('Customer deleted', 'error')
      load(true)
    } catch (err: any) {
      toast(err?.message || 'Failed to delete customer', 'error')
      load(true)
    }
  }

  const totalDues = customers.reduce((s, c) => s + (c.total_due || 0), 0)
  const customersWithDues = customers.filter(c => c.total_due > 0).length

  const animTotal = useAnimatedCounter(customers.length)
  const animDues = useAnimatedCounter(Math.round(totalDues))
  const animClear = useAnimatedCounter(customers.length - customersWithDues)

  if (selectedId !== null) {
    return (
      <>
        <CustomerProfile
          customerId={selectedId}
          initialCustomer={customers.find(c => String(c.id) === String(selectedId))}
          onBack={() => setSelectedId(null)}
          onEdit={(c) => { setEditCustomer(c); setShowModal(true) }}
        />
        <AnimatePresence>
          {showModal && (
            <CustomerModal
              customer={editCustomer}
              onSave={handleSave}
              onClose={() => { setShowModal(false); setEditCustomer(null) }}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  const stats = [
    { label: 'Total Customers', value: animTotal, icon: Crown, color: 'var(--gold-300)', sub: 'Total registered accounts' },
    { label: 'Total Pending Dues', value: '₹' + animDues.toLocaleString('en-IN'), icon: AlertCircle, color: 'var(--red)', sub: `${customersWithDues} accounts with pending balance` },
    { label: 'Clear Accounts', value: animClear, icon: CheckCircle, color: 'var(--green)', sub: 'Accounts with zero balance' },
  ]

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Users size={28} style={{ color: 'var(--gold-300)' }} />
            Customer Directory
          </h1>
          <p className="page-subtitle">{customers.length} Customers · {customersWithDues} Accounts with Pending Due</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 8px 30px rgba(253, 176, 34, 0.55)' }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary btn-lg"
          onClick={() => { setEditCustomer(null); setShowModal(true) }}
        >
          <Plus size={18} /> Add New Customer
        </motion.button>
      </div>

      {/* Metrics */}
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
              <div style={{
                position: 'absolute', top: -30, right: -30, width: 100, height: 100,
                background: s.color, borderRadius: '50%', opacity: 0.07, filter: 'blur(28px)', pointerEvents: 'none'
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
          <div className="search-bar" style={{ width: 340 }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              className="form-input"
              placeholder="Search by client name, mobile #, or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none' }}
            />
          </div>
        </div>
        <div className="toolbar-right">
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
            {filtered.length} Clients Found
          </span>
        </div>
      </div>

      {/* Directory Table */}
      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
          >
            <Users size={52} style={{ color: 'var(--gold-300)', opacity: 0.3 }} />
            <div className="empty-title">No Customers Found</div>
            <div className="empty-sub">Add customer records to streamline billing and ledger tracking.</div>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="btn btn-primary btn-sm"
              style={{ marginTop: 8 }}
              onClick={() => { setEditCustomer(null); setShowModal(true) }}
            >
              <Plus size={14} /> Add Customer
            </motion.button>
          </motion.div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>CLIENT NAME &amp; CONTACT</th>
                <th>MOBILE PHONE</th>
                <th>CITY / LOCATION</th>
                <th>GST NUMBER</th>
                <th className="td-right">ACCOUNT DUE BALANCE</th>
                <th className="td-right">REGISTERED DATE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedId(c.id)}
                  whileHover={{ backgroundColor: 'rgba(253, 176, 34, 0.06)' }}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar">{initials(c.name)}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email || 'No email registered'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.phone || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.city || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.gst_number || '—'}</td>
                  <td className="td-right">
                    <span style={{
                      fontWeight: 800, color: c.total_due > 0 ? 'var(--red)' : c.total_due < 0 ? 'var(--blue)' : 'var(--green)',
                      fontFamily: "'Outfit', sans-serif", fontSize: 14
                    }}>
                      {fmt(c.total_due || 0)} {c.total_due < 0 ? '(Advance)' : ''}
                    </span>
                  </td>
                  <td className="td-right" style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{fmtDate(c.created_at)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <CustomerModal customer={editCustomer} onSave={handleSave} onClose={() => { setShowModal(false); setEditCustomer(null) }} />
        )}
        {deleteTargetId !== null && (
          <ConfirmModal
            title="Delete Customer Record"
            message="Are you sure you want to delete this customer record? Associated invoice history will also be cleaned up."
            confirmText="Delete Customer"
            onConfirm={() => confirmDelete(deleteTargetId)}
            onCancel={() => setDeleteTargetId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
