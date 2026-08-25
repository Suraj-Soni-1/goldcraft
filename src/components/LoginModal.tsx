import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck, Cloud, LogOut, CheckCircle2, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { forceCloudSync, getCloudSyncState } from '../utils/syncEngine'
import { useToast } from './Toast'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: Props) {
  const { user, signInWithGoogle, signOut } = useAuth()
  const { toast } = useToast()
  const [signingIn, setSigningIn] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(getCloudSyncState().lastSyncedTime)

  useEffect(() => {
    const handleStatus = (e: any) => {
      if (e.detail?.lastSyncedTime) setLastSynced(e.detail.lastSyncedTime)
    }
    window.addEventListener('gc_sync_status_change', handleStatus)
    return () => window.removeEventListener('gc_sync_status_change', handleStatus)
  }, [])

  if (!isOpen) return null

  const handleGoogleSignIn = async () => {
    setSigningIn(true)
    try {
      await signInWithGoogle()
      toast('Redirecting to Google Sign-In...')
    } catch (err: any) {
      toast(err?.message || 'Google Sign-In failed', 'error')
    } finally {
      setSigningIn(false)
    }
  }

  const handleForceSync = async () => {
    if (!user?.id) return
    setSyncing(true)
    try {
      await forceCloudSync(user.id)
      toast('Store data synced with Google Cloud!')
    } catch (err) {
      toast('Cloud sync failed. Check internet connection.', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    toast('Signed out from Goldcraft Cloud')
    onClose()
  }

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(2, 1, 8, 0.82)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
      }}>
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="card"
          style={{
            maxWidth: 480, width: '100%', padding: 28,
            border: '1px solid var(--border-bright)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.8), var(--shadow-gold)',
            position: 'relative'
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

          {/* Modal Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px',
              background: 'linear-gradient(135deg, var(--gold-300), var(--gold-600))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 25px rgba(253, 176, 34, 0.4)'
            }}>
              <Cloud size={26} color="#050409" />
            </div>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800,
              color: 'var(--gold-100)', marginBottom: 6
            }}>
              Goldcraft Cloud Account
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Your store data is synced securely with your Google account across all devices.
            </p>
          </div>

          {/* Current User Card */}
          {user ? (
            <div style={{
              background: 'rgba(253, 176, 34, 0.08)',
              border: '1px solid var(--border-bright)',
              borderRadius: 'var(--radius-md)', padding: 18, marginBottom: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%', overflow: 'hidden',
                  border: '2px solid var(--gold-300)', flexShrink: 0,
                  background: 'var(--gold-600)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, color: '#000', fontSize: 18
                }}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    user.name[0]?.toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.email}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span className="badge badge-green" style={{ fontSize: 9.5, padding: '2px 7px' }}>
                      <CheckCircle2 size={10} style={{ display: 'inline', marginRight: 3 }} /> CLOUD ACTIVE
                    </span>
                    {lastSynced && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Last synced: {lastSynced}
                      </span>
                    )}
                  </div>
                </div>
                <ShieldCheck size={18} color="var(--gold-300)" style={{ flexShrink: 0, opacity: 0.7 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={handleForceSync}
                  disabled={syncing}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <RefreshCw size={13} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={handleSignOut}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--red)' }}
                >
                  <LogOut size={13} /> Sign Out
                </button>
              </div>
            </div>
          ) : (
            /* Google Sign In Button */
            <div style={{ marginBottom: 22 }}>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(255,255,255,0.15)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                style={{
                  width: '100%', padding: '13px 20px', borderRadius: 'var(--radius-md)',
                  background: '#ffffff', color: '#1f1f1f', border: '1px solid #dadce0',
                  fontSize: 14.5, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
                }}
              >
                {/* Official Google Color SVG */}
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                {signingIn ? 'Connecting to Google...' : 'Continue with Google Account'}
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
