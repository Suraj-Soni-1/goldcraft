import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Search } from 'lucide-react'
import { api, fmtDate, actionColor } from '../../utils/helpers'
import { useToast } from '../../components/Toast'

const ACTION_LABELS: Record<string, string> = {
  created: 'CREATED', updated: 'UPDATED', deleted: 'DELETED', sent_whatsapp: 'WHATSAPP SENT'
}

export default function History() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('')
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  const load = (isBackground = false) => {
    if (!isBackground) setLoading(true)
    api.getHistory({ action: filterAction || undefined })
      .then(data => { setLogs(data); setLoading(false) })
      .catch((err: any) => {
        console.error(err)
        if (!isBackground) toast(err?.message || 'Failed to load activity history', 'error')
        setLoading(false)
      })
  }

  useEffect(() => {
    load(false)
    const handleSync = () => load(true)
    window.addEventListener('gc_cloud_sync_update', handleSync)
    return () => window.removeEventListener('gc_cloud_sync_update', handleSync)
  }, [filterAction])

  const filtered = logs.filter(l =>
    !search || l.description?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Clock size={28} style={{ color: 'var(--gold-300)' }} />
            Activity Audit History
          </h1>
          <p className="page-subtitle">Real-time audit log of all store transactions, invoice edits, and price updates</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-bar" style={{ width: 340 }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              className="form-input"
              placeholder="Search audit descriptions or entity..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none' }}
            />
          </div>

          <select className="form-select" style={{ width: 180 }} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
            <option value="">All Action Types</option>
            <option value="created">Created Records</option>
            <option value="updated">Updated Records</option>
            <option value="deleted">Deleted Records</option>
          </select>
        </div>

        <div className="toolbar-right">
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
            {filtered.length} Audit Events Logged
          </span>
        </div>
      </div>

      {/* Audit Log Timeline */}
      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
        >
          <Clock size={52} style={{ color: 'var(--gold-300)', opacity: 0.3 }} />
          <div className="empty-title">No Audit Logs Recorded</div>
          <div className="empty-sub">Activity logs will populate automatically as staff performs actions.</div>
        </motion.div>
        </div>
      ) : (
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filtered.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  display: 'flex', gap: 20, padding: '16px 0',
                  borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--border)',
                  alignItems: 'flex-start'
                }}
              >
                {/* Timeline node */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: actionColor(log.action), flexShrink: 0,
                    boxShadow: `0 0 12px ${actionColor(log.action)}`
                  }} />
                  {i < filtered.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 6, minHeight: 28 }} />
                  )}
                </div>

                {/* Event Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: actionColor(log.action), letterSpacing: 0.8 }}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    <span className="badge badge-gold">{log.entity_type}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', fontWeight: 600 }}>
                      {fmtDate(log.timestamp)} · {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
                    {log.description}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Executed by <span style={{ color: 'var(--gold-200)', fontWeight: 700 }}>{log.performed_by || 'Admin'}</span> · Record #{log.entity_id}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
