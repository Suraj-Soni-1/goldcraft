import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FileText, Users, Clock, TrendingUp, Settings,
  ChevronRight, Zap, X, Cloud, LogIn
} from 'lucide-react'
import Logo from './Logo'
import type { Page } from '../App'
import { useAuth } from '../context/AuthContext'

const navItems: {
  id: Page; icon: any; label: string; badge?: string; shortcut?: string
}[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', shortcut: 'Alt+0' },
    { id: 'bills', icon: FileText, label: 'Invoices & Billing', shortcut: 'Alt+1' },
    { id: 'customers', icon: Users, label: 'Client Directory', shortcut: 'Alt+2' },
    { id: 'history', icon: Clock, label: 'Audit History', shortcut: 'Alt+3' },
    { id: 'rates', icon: TrendingUp, label: 'Market Rates', badge: 'LIVE', shortcut: 'Alt+4' },
    { id: 'settings', icon: Settings, label: 'Shop Settings', shortcut: 'Alt+5' },
  ]

interface Props {
  activePage: Page
  onNavigate: (p: Page) => void
  isOpen: boolean
  onClose: () => void
  isMobile?: boolean
  onOpenAuth: () => void
}

export default function Sidebar({ activePage, onNavigate, isOpen, onClose, isMobile, onOpenAuth }: Props) {
  const { user } = useAuth()
  if (isMobile) {
    /* ── Mobile floating bottom nav ── */
    return (
      <nav className="sidebar">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = activePage === item.id
          return (
            <motion.div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              whileTap={{ scale: 0.9 }}
            >
              <Icon size={20} />
            </motion.div>
          )
        })}
      </nav>
    )
  }

  /* ── Desktop sliding drawer sidebar ── */
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.nav
          className="sidebar sidebar-drawer"
          initial={{ x: -280 }}
          animate={{ x: 0 }}
          exit={{ x: -280 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        >
          {/* Header */}
          <div style={{
            padding: '12px 16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)', marginBottom: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <motion.div
                whileHover={{ rotate: 10, scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 300 }}
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(253, 176, 34, 0.08)',
                  border: '1px solid var(--border-bright)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(253, 176, 34, 0.25)',
                  flexShrink: 0
                }}
              >
                <Logo size={28} />
              </motion.div>
              <div>
                <div style={{
                  fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: 15,
                  color: 'var(--gold-100)', letterSpacing: '0.8px'
                }}>GOLDCRAFT</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1.2px' }}>
                  JEWELLERY WORKSTATION
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', width: 30, height: 30, borderRadius: 8,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={14} />
            </motion.button>
          </div>

          <div className="sidebar-section-label">NAVIGATION</div>

          {navItems.map(item => {
            const Icon = item.icon
            const isActive = activePage === item.id
            return (
              <motion.div
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                style={{ position: 'relative' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activePill"
                    style={{
                      position: 'absolute', inset: 0,
                      borderRadius: 'var(--radius-sm)',
                      background: 'linear-gradient(135deg, rgba(253, 176, 34, 0.22) 0%, rgba(217, 119, 6, 0.12) 100%)',
                      border: '1px solid var(--border-bright)',
                      boxShadow: 'var(--shadow-gold), inset 0 0 15px rgba(253, 176, 34, 0.1)',
                      zIndex: 0
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}

                <Icon size={17} style={{ zIndex: 1, flexShrink: 0 }} />
                <span style={{ zIndex: 1, flex: 1, fontSize: 13.5, fontWeight: 600 }}>{item.label}</span>

                {item.badge && (
                  <span style={{
                    zIndex: 1, fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
                    background: 'linear-gradient(135deg, var(--green), #059669)',
                    color: '#fff', borderRadius: 4, padding: '2px 6px'
                  }}>
                    {item.badge}
                  </span>
                )}

                <span style={{
                  zIndex: 1, fontSize: 9, opacity: 0.35, fontWeight: 700, letterSpacing: 0.5,
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '1px 4px',
                  display: isActive ? 'block' : 'none'
                }}>
                  {item.shortcut}
                </span>
              </motion.div>
            )
          })}

          <div className="sidebar-bottom">
            {/* User Cloud Account Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={onOpenAuth}
              style={{
                background: 'rgba(253, 176, 34, 0.08)',
                border: '1px solid var(--border-bright)',
                borderRadius: 'var(--radius-sm)',
                padding: '9px 11px',
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer'
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
                background: 'var(--gold-500)', color: '#000', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, flexShrink: 0
              }}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user?.name?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--gold-100)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || 'Google Account'}
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Cloud size={9} color="var(--green)" /> Google Synced
                </div>
              </div>
            </motion.div>

            {/* Live Gold Rate Mini Widget */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              style={{
                background: 'rgba(253, 176, 34, 0.06)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer'
              }}
              onClick={() => onNavigate('rates')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--gold-300)', letterSpacing: 1 }}>
                  LIVE 24K GOLD
                </span>
                <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Zap size={9} /> +0.45%
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}>
                ₹ 13,950 <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/10g</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                <span>View all rates</span>
                <ChevronRight size={10} />
              </div>
            </motion.div>

            <div style={{
              fontSize: 10, color: 'var(--text-muted)', textAlign: 'center',
              paddingTop: 6, fontWeight: 600
            }}>
              GoldCraft Pro v2.0
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
