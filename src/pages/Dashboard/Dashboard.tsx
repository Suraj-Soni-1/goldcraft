import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, FileText, Users, AlertCircle, CheckCircle,
  Clock, ArrowRight, Package, Zap, BarChart3
} from 'lucide-react'
import { api, fmt, fmtDate, statusBadge } from '../../utils/helpers'
import type { Page } from '../../App'

// Fast lightweight counter hook
function useAnimatedCounter(target: number, duration = 300) {
  const [val, setVal] = useState(target)
  useEffect(() => {
    let lastTime = 0
    const start = performance.now()
    let frameId: number
    const update = (now: number) => {
      // Throttle updates to ~30fps to prevent state thrashing
      if (now - lastTime >= 33) {
        lastTime = now
        const progress = Math.min((now - start) / duration, 1)
        setVal(Math.round(progress * target))
      }
      if (performance.now() - start < duration) {
        frameId = requestAnimationFrame(update)
      } else {
        setVal(target)
      }
    }
    frameId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frameId)
  }, [target, duration])
  return val
}

function StatCard({
  label, value, prefix = '', suffix = '', icon: Icon, color, gradientStart, gradientEnd, trend, trendLabel, delay = 0, onClick
}: {
  label: string, value: number, prefix?: string, suffix?: string,
  icon: any, color: string, gradientStart?: string, gradientEnd?: string,
  trend?: number, trendLabel?: string, delay?: number, onClick?: () => void
}) {
  const animatedVal = useAnimatedCounter(value)
  const up = (trend ?? 0) >= 0

  const displayVal = prefix === '₹'
    ? prefix + animatedVal.toLocaleString('en-IN') + suffix
    : `${prefix}${animatedVal.toLocaleString('en-IN')}${suffix}`

  const gStart = gradientStart || color
  const gEnd = gradientEnd || color

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: Math.min(delay, 0.2), type: 'spring', stiffness: 300, damping: 26 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative', overflow: 'hidden',
        borderRadius: 20,
        background: `linear-gradient(145deg, rgba(15,11,30,0.95) 0%, rgba(8,5,18,0.98) 100%)`,
        border: `1px solid ${gStart}30`,
        padding: '20px 18px',
        boxShadow: `0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px ${gStart}10, inset 0 1px 0 rgba(255,255,255,0.04)`,
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Animated gradient corner glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 120, height: 120,
        background: `radial-gradient(circle, ${gStart}25 0%, transparent 70%)`,
        borderRadius: '50%', pointerEvents: 'none',
        animation: 'float-up 5s ease-in-out infinite',
      }} />
      {/* Bottom shimmer line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${gStart}60, ${gEnd}60, transparent)`,
        borderRadius: '0 0 20px 20px'
      }} />
      {/* Top highlight line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${gStart}50, transparent)`,
      }} />

      {/* Icon + Trend row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: `linear-gradient(135deg, ${gStart}25 0%, ${gEnd}15 100%)`,
          border: `1px solid ${gStart}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 16px ${gStart}20`,
        }}>
          <Icon size={21} color={gStart} strokeWidth={2} />
        </div>

        {trend !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 30,
            background: up ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
            border: `1px solid ${up ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
            fontSize: 11, fontWeight: 800, color: up ? 'var(--green)' : 'var(--red)',
            boxShadow: up ? '0 0 10px rgba(16,185,129,0.15)' : '0 0 10px rgba(244,63,94,0.15)',
          }}>
            {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      {/* Label */}
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, fontFamily: "'Inter', sans-serif"
      }}>
        {label}
      </div>

      {/* Value */}
      <div style={{
        fontSize: 27, fontWeight: 900, fontFamily: "'Outfit', sans-serif",
        letterSpacing: -1, lineHeight: 1,
        background: `linear-gradient(135deg, #ffffff 0%, ${gStart} 100%)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        {displayVal}
      </div>

      {/* Sub label */}
      {trendLabel && (
        <div style={{
          fontSize: 11.5, color: 'rgba(255,255,255,0.3)', marginTop: 8, fontWeight: 500,
          fontFamily: "'Inter', sans-serif"
        }}>
          {trendLabel}
        </div>
      )}
    </motion.div>
  )
}

interface Props {
  onNavigate: (p: Page) => void
}

export default function Dashboard({ onNavigate }: Props) {
  const [bills, setBills] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = (isBackground = false) => {
    if (!isBackground) setLoading(true)
    Promise.all([api.getBills(), api.getCustomers()])
      .then(([b, c]) => { setBills(b); setCustomers(c) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData(false)
    const handleSync = () => loadData(true)
    window.addEventListener('gc_cloud_sync_update', handleSync)
    return () => window.removeEventListener('gc_cloud_sync_update', handleSync)
  }, [])

  const thisMonth = new Date().getMonth()
  const monthBills = bills.filter(b => new Date(b.bill_date).getMonth() === thisMonth)
  const totalRevenue = bills.reduce((s, b) => s + (b.grand_total || 0), 0)
  const totalDue = bills.reduce((s, b) => s + (b.remaining_due || 0), 0)
  const paidBills = bills.filter(b => b.status === 'paid').length
  const customersWithDues = customers.filter(c => c.total_due > 0).length
  const recentBills = bills.slice(0, 5)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '🌅 Good Morning' : hour < 17 ? '☀️ Good Afternoon' : '🌙 Good Evening'

  if (loading) {
    return (
      <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="page" style={{ gap: 0 }}>
      {/* Greeting Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-hero"
      >
        <div className="dashboard-hero-left">
          <div className="dashboard-hero-greeting">
            <span className="live-status-dot" />
            <span>{greeting}, Admin</span>
          </div>
          <h1 className="dashboard-hero-title">
            Store Overview
          </h1>
          <p className="dashboard-hero-subtitle">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="btn btn-primary new-invoice-cta"
          onClick={() => onNavigate('bills')}
        >
          <FileText size={18} />
          <span>New Invoice</span>
        </motion.button>
      </motion.div>

      {/* Main Metric Cards */}
      <div className="card-grid card-grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          label="Total Revenue Billed" value={Math.round(totalRevenue)} prefix="₹"
          icon={BarChart3} color="#fbbf24" gradientStart="#fbbf24" gradientEnd="#f59e0b"
          trend={8} trendLabel={`${monthBills.length} bills this month`}
          delay={0} onClick={() => onNavigate('bills')}
        />
        <StatCard
          label="Outstanding Dues" value={Math.round(totalDue)} prefix="₹"
          icon={AlertCircle} color="#f43f5e" gradientStart="#f43f5e" gradientEnd="#e11d48"
          trend={-3} trendLabel={`${customersWithDues} clients with balance`}
          delay={0.07} onClick={() => onNavigate('customers')}
        />
        <StatCard
          label="Paid Invoices" value={paidBills}
          icon={CheckCircle} color="#10b981" gradientStart="#10b981" gradientEnd="#059669"
          trend={12} trendLabel={`${bills.length - paidBills} still pending`}
          delay={0.14} onClick={() => onNavigate('bills')}
        />
        <StatCard
          label="Registered Clients" value={customers.length}
          icon={Users} color="#818cf8" gradientStart="#818cf8" gradientEnd="#a78bfa"
          trend={5} trendLabel={`${customersWithDues} accounts overdue`}
          delay={0.21} onClick={() => onNavigate('customers')}
        />
      </div>

      {/* Bottom Row: Recent Invoices + Quick Actions */}
      <div className="dashboard-bottom-grid">
        {/* Recent Bills */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          style={{ padding: 0, overflow: 'hidden' }}
        >
          <div style={{
            padding: '18px 22px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                Recent Invoices
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Latest 5 billing transactions</div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate('bills')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
            >
              View all <ArrowRight size={12} />
            </button>
          </div>

          {recentBills.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <Package size={42} style={{ opacity: 0.3, color: 'var(--gold-300)', marginBottom: 8 }} />
              <div className="empty-title">No Invoices Yet</div>
              <div className="empty-sub">Create your first invoice to see it here</div>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="btn btn-primary btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => onNavigate('bills')}
              >
                + Create Invoice
              </motion.button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(253,176,34,0.06)' }}>
                <tr>
                  <th style={{ padding: '10px 22px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: 'var(--gold-300)', textTransform: 'uppercase', letterSpacing: 1 }}>INVOICE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: 'var(--gold-300)', textTransform: 'uppercase', letterSpacing: 1 }}>CLIENT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 800, color: 'var(--gold-300)', textTransform: 'uppercase', letterSpacing: 1 }}>AMOUNT</th>
                  <th style={{ padding: '10px 22px 10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 800, color: 'var(--gold-300)', textTransform: 'uppercase', letterSpacing: 1 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.map((b, i) => (
                  <motion.tr
                    key={b.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    onClick={() => onNavigate('bills')}
                    style={{ cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    whileHover={{ background: 'rgba(253,176,34,0.05)' }}
                  >
                    <td style={{ padding: '12px 22px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--gold-200)', fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>{b.bill_number}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(b.bill_date)}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{b.customer_name || 'Walk-in'}</div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 14, fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}>
                        {fmt(b.grand_total)}
                      </div>
                      {b.remaining_due > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>
                          Due: {fmt(b.remaining_due)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 22px 12px 12px', textAlign: 'right' }}>
                      <span className={statusBadge(b.status)} style={{ textTransform: 'capitalize' }}>{b.status}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>

        {/* Quick Actions Panel */}
        <motion.div
          className="card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.32 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              Quick Actions
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Frequently used shortcuts</div>
          </div>

          {[
            { label: 'Create New Invoice', sub: 'Start billing a customer', icon: FileText, color: 'var(--gold-300)', page: 'bills' as Page },
            { label: 'Add New Customer', sub: 'Register a new client', icon: Users, color: 'var(--blue)', page: 'customers' as Page },
            { label: 'Check Market Rates', sub: 'Live gold & silver prices', icon: TrendingUp, color: 'var(--green)', page: 'rates' as Page },
            { label: 'View Activity Log', sub: 'Review audit trail', icon: Clock, color: 'var(--purple)', page: 'history' as Page },
          ].map((action, i) => {
            const Icon = action.icon
            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.07 }}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate(action.page)}
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${action.color}14`, border: `1px solid ${action.color}25`, flexShrink: 0
                }}>
                  <Icon size={16} color={action.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{action.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{action.sub}</div>
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
              </motion.button>
            )
          })}

          {/* Market snapshot */}
          <div
            style={{
              marginTop: 6, padding: '12px 14px',
              background: 'linear-gradient(135deg, rgba(253,176,34,0.1), rgba(253,176,34,0.04))',
              border: '1px solid var(--border-bright)', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
            onClick={() => onNavigate('rates')}
          >
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold-400)', letterSpacing: 1.2, marginBottom: 8 }}>
              TODAY'S METAL SNAPSHOT
            </div>
            {[
              { label: '24K Gold', val: '₹13,950/g', change: '+0.45%', up: true },
              { label: '22K Gold', val: '₹12,788/g', change: '+0.45%', up: true },
              { label: 'Silver',   val: '₹233/g',    change: '+0.20%', up: true },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{m.label}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>{m.val}</span>
                  <span style={{ fontSize: 10, color: m.up ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                    <Zap size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> {m.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
