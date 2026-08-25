import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import LoginModal from './components/LoginModal'
import LoginScreen from './components/LoginScreen'
import History from './pages/History/History'
import Customers from './pages/Customers/Customers'
import Bills from './pages/Bills/Bills'
import Rates from './pages/Rates/Rates'
import Settings from './pages/Settings/Settings'
import Dashboard from './pages/Dashboard/Dashboard'
import { ToastProvider } from './components/Toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useMobile } from './hooks/useMobile'
import Logo from './components/Logo'
import { syncElectronToCloud } from './utils/helpers'

export type Page = 'dashboard' | 'history' | 'customers' | 'bills' | 'rates' | 'settings'

const PAGE_META: Record<Page, { icon: string; title: string; subtitle: string }> = {
  dashboard: { icon: '🏠', title: 'Dashboard',          subtitle: 'Your store at a glance' },
  bills:     { icon: '🧾', title: 'Billing Workstation', subtitle: 'Create, issue & track jeweller invoices' },
  customers: { icon: '👥', title: 'Customer CRM',        subtitle: 'Client directory, dues & history' },
  history:   { icon: '📋', title: 'Audit Trail',        subtitle: 'Comprehensive store activity logs' },
  rates:     { icon: '📈', title: 'Live Metal Market',   subtitle: 'Real-time gold & silver pricing' },
  settings:  { icon: '⚙️', title: 'Store Settings',     subtitle: 'Shop details, GST & printing preferences' },
}

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.12, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.08 } }
}

function MobileHeader({ page, onOpenAuth }: { page: Page; onOpenAuth: () => void }) {
  const meta = PAGE_META[page]
  const { user } = useAuth()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', background: 'rgba(10, 8, 20, 0.98)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-bright)', zIndex: 90
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Logo size={34} glow={true} />
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: 'var(--gold-100)', lineHeight: 1.1 }}>
            {meta.title}
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--gold-400)', fontWeight: 700, letterSpacing: 0.8 }}>
            R.K. JEWELLERS
          </div>
        </div>
      </div>
      <button
        onClick={onOpenAuth}
        style={{
          height: 32, padding: '0 10px', borderRadius: 20,
          background: 'rgba(253, 176, 34, 0.14)', border: '1px solid var(--border-bright)',
          display: 'flex', alignItems: 'center', gap: 6,
          fontWeight: 800, color: 'var(--gold-100)', fontSize: 12, cursor: 'pointer'
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--gold-300), var(--gold-600))',
          color: '#050409', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 900
        }}>
          {user ? user.name[0]?.toUpperCase() : 'G'}
        </div>
        <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user ? user.name.split(' ')[0] : 'Account'}
        </span>
      </button>
    </div>
  )
}

function MainAppContent() {
  const [page, setPage] = useState<Page>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [syncKey, setSyncKey] = useState(0)
  const isMobile = useMobile()
  const { user, loading } = useAuth()

  // Real-time Cloud Sync Listener across windows/tabs and account switches
  useEffect(() => {
    const handleSync = () => setSyncKey(k => k + 1)
    window.addEventListener('gc_cloud_sync_update', handleSync)
    return () => window.removeEventListener('gc_cloud_sync_update', handleSync)
  }, [])

  // Listen for real-time cloud updates
  useEffect(() => {
    if (user?.id) {
      setSyncKey(k => k + 1)
    }
  }, [user?.id])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === '0') { setPage('dashboard'); e.preventDefault() }
        if (e.key === '1') { setPage('bills'); e.preventDefault() }
        if (e.key === '2') { setPage('customers'); e.preventDefault() }
        if (e.key === '3') { setPage('history'); e.preventDefault() }
        if (e.key === '4') { setPage('rates'); e.preventDefault() }
        if (e.key === '5') { setPage('settings'); e.preventDefault() }
      }
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)', color: 'var(--gold-200)', fontFamily: "'Outfit', sans-serif"
      }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard key={syncKey} onNavigate={setPage} />
      case 'history': return <History key={syncKey} />
      case 'customers': return <Customers key={syncKey} />
      case 'bills': return <Bills key={syncKey} />
      case 'rates': return <Rates key={syncKey} />
      case 'settings': return <Settings key={syncKey} />
    }
  }

  const handleNavigate = (p: Page) => {
    setPage(p)
    setSidebarOpen(false)
  }

  return (
    <div className="app">
      {isMobile ? (
        <MobileHeader page={page} onOpenAuth={() => setAuthModalOpen(true)} />
      ) : (
        <TitleBar onMenuToggle={() => setSidebarOpen(o => !o)} onOpenAuth={() => setAuthModalOpen(true)} />
      )}

      <div className="app-body">
        {/* Sidebar overlay backdrop (desktop) */}
        <AnimatePresence>
          {sidebarOpen && !isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 150,
                background: 'rgba(2, 1, 8, 0.6)', backdropFilter: 'blur(4px)'
              }}
            />
          )}
        </AnimatePresence>

        {/* Sidebar (collapsible) */}
        <Sidebar
          activePage={page}
          onNavigate={handleNavigate}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
          onOpenAuth={() => setAuthModalOpen(true)}
        />

        <main className="main-content" onClick={() => { if (sidebarOpen && !isMobile) setSidebarOpen(false) }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ minHeight: '100%' }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Floating hamburger FAB — desktop only */}
        {!isMobile && (
          <motion.button
            className="sidebar-fab"
            onClick={() => setSidebarOpen(o => !o)}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            title={sidebarOpen ? 'Close Navigation' : 'Open Navigation'}
          >
            <motion.div
              animate={{ rotate: sidebarOpen ? 90 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </motion.div>
          </motion.button>
        )}
      </div>

      {/* Google Auth & Cloud Sync Modal */}
      <LoginModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainAppContent />
      </ToastProvider>
    </AuthProvider>
  )
}
