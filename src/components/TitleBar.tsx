import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Menu, Wifi, Cloud, Download, RefreshCw, AlertCircle } from 'lucide-react'
import Logo from './Logo'
import { api } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'
import { exportStoreBackup } from '../utils/backup'
import { getCloudSyncState, type SyncState } from '../utils/syncEngine'
import { useToast } from './Toast'

interface Props {
  onMenuToggle: () => void
  onOpenAuth: () => void
}

export default function TitleBar({ onMenuToggle, onOpenAuth }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [syncState, setSyncState] = useState<SyncState>(getCloudSyncState().state)

  useEffect(() => {
    const handleStatus = (e: any) => {
      if (e.detail?.state) setSyncState(e.detail.state)
    }
    window.addEventListener('gc_sync_status_change', handleStatus)
    return () => window.removeEventListener('gc_sync_status_change', handleStatus)
  }, [])

  const handleQuickBackup = (e: React.MouseEvent) => {
    e.stopPropagation()
    const res = exportStoreBackup()
    toast(`Backup downloaded: ${res.filename}`)
  }

  const getStatusBadge = () => {
    if (syncState === 'syncing') {
      return (
        <span style={{ color: 'var(--orange)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={11} className="spin" /> SYNCING...
        </span>
      )
    }
    if (syncState === 'offline') {
      return (
        <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={11} /> OFFLINE MODE
        </span>
      )
    }
    return (
      <span style={{ color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Wifi size={11} /> CLOUD SYNCED
      </span>
    )
  }

  return (
    <div className="titlebar">
      <div className="titlebar-logo">
        {/* Hamburger menu */}
        <button
          onClick={onMenuToggle}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
            padding: '4px 8px', borderRadius: 6, WebkitAppRegion: 'no-drag',
            transition: 'all 0.2s'
          } as any}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--gold-200)'; (e.currentTarget as HTMLElement).style.background = 'rgba(253,176,34,0.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <Menu size={18} />
        </button>

        <Logo size={22} />
        <span className="titlebar-logo-text">GoldCraft</span>
      </div>

      {/* Cloud & User status - auto-hide by default, unhide on hover */}
      <motion.div
        className="titlebar-center"
        initial={false}
        whileHover={{ opacity: 1, y: 0, scale: 1 }}
        style={{
          WebkitAppRegion: 'no-drag',
          cursor: 'pointer',
          opacity: 0,
          transform: 'translateY(-6px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          padding: '4px 12px',
          borderRadius: 16,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        } as any}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.opacity = '1'
            ; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.opacity = '0'
            ; (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'
        }}
        onClick={onOpenAuth}
      >
        {getStatusBadge()}
        {user && (
          <span style={{
            marginLeft: 8, background: 'rgba(253,176,34,0.15)', border: '1px solid var(--border-bright)',
            color: 'var(--gold-200)', borderRadius: 12, padding: '2px 8px', fontSize: 10,
            display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700
          }}>
            <Cloud size={10} /> {user.name}
          </span>
        )}

        <button
          onClick={handleQuickBackup}
          title="Quick Backup Data (.json)"
          style={{
            marginLeft: 10, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--green)', borderRadius: 12, padding: '2px 8px', fontSize: 10,
            display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, cursor: 'pointer'
          }}
        >
          <Download size={10} /> Backup
        </button>
      </motion.div>

      <div className="titlebar-controls">
        <button className="titlebar-btn minimize" onClick={() => api.minimize()} title="Minimize" />
        <button className="titlebar-btn maximize" onClick={() => api.maximize()} title="Maximize" />
        <button className="titlebar-btn close" onClick={() => api.close()} title="Close" />
      </div>
    </div>
  )
}

