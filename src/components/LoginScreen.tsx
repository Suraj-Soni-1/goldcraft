import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Cloud, Smartphone, ArrowRight, Mail, Sparkles, UserCheck } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'

export default function LoginScreen() {
  const { signInWithGoogle, signInWithGoogleEmail } = useAuth()
  const { toast } = useToast()
  const [emailInput, setEmailInput] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  const handleGoogleOneTap = async () => {
    setSigningIn(true)
    try {
      await signInWithGoogle()
      toast('Signed in with Google Account successfully!')
    } catch (err: any) {
      console.warn('Google Sign-In Error:', err)
      toast('Google Sign-In failed. Please type your Gmail address below and tap Continue.', 'error')
    } finally {
      setSigningIn(false)
    }
  }

  const handleGoogleEmailSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const email = emailInput.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      toast('Please enter your Gmail address (e.g. yourname@gmail.com)', 'error')
      return
    }
    signInWithGoogleEmail(email)
    toast(`Signed in successfully as ${email}`)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 30% 20%, rgba(253, 176, 34, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(217, 119, 6, 0.06) 0%, transparent 50%), var(--bg-base)',
      padding: '20px 16px', position: 'relative', overflow: 'hidden'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          maxWidth: 460, width: '100%', textAlign: 'center',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{
          width: 86, height: 86, borderRadius: 24, margin: '0 auto 16px',
          background: 'radial-gradient(circle, rgba(253, 176, 34, 0.15) 0%, rgba(18, 14, 33, 0.8) 100%)',
          border: '1px solid var(--border-bright)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 45px rgba(253, 176, 34, 0.35), 0 12px 40px rgba(0,0,0,0.7)',
        }}>
          <Logo size={68} />
        </div>

        {/* Brand */}
        <h1 style={{
          fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 32,
          color: 'var(--gold-100)', letterSpacing: 2, marginBottom: 4,
        }}>
          GOLDCRAFT
        </h1>
        <p style={{
          fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
          letterSpacing: 3, textTransform: 'uppercase', marginBottom: 24,
        }}>
          JEWELLERY BILLING WORKSTATION
        </p>

        {/* Sign In Card */}
        <div className="card" style={{
          padding: 26, border: '1px solid var(--border-bright)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), var(--shadow-gold)',
        }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800,
              color: 'var(--gold-100)', marginBottom: 6,
            }}>
              Sign In with Google Account
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Sign in to sync your store ledger and customer invoices across all your devices.
            </p>
          </div>

          {/* 1. Official Google Sign-In Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleOneTap}
            disabled={signingIn}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 'var(--radius-sm)',
              background: '#ffffff',
              color: '#1f1f1f',
              fontSize: 14.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
              cursor: signingIn ? 'wait' : 'pointer',
              marginBottom: 16,
              border: 'none'
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            {signingIn ? 'Opening Dashboard...' : 'Sign in with Google Account'}
          </motion.button>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            margin: '16px 0', color: 'var(--text-muted)', fontSize: 10, fontWeight: 700,
            letterSpacing: 1.2, textTransform: 'uppercase',
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            OR SIGN IN WITH YOUR EMAIL
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* 2. Direct Google Email Input Form */}
          <form onSubmit={handleGoogleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                placeholder="Enter your email (e.g. shop@gmail.com)"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                className="form-input"
                style={{
                  paddingLeft: 38,
                  paddingRight: 14,
                  paddingTop: 11,
                  paddingBottom: 11,
                  fontSize: 13.5,
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'var(--border-bright)'
                }}
              />
              <Mail size={16} color="var(--gold-300)" style={{ position: 'absolute', left: 12, top: 12, opacity: 0.9 }} />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '11px',
                fontSize: 13.5,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Sparkles size={15} /> Continue to Dashboard
            </motion.button>
          </form>

          {/* Features Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
            {[
              { icon: Shield, text: 'Strictly Google ID protected store ledger', color: 'var(--green)' },
              { icon: Cloud, text: 'Automatic real-time cloud data backup', color: 'var(--blue)' },
              { icon: Smartphone, text: 'Full offline invoicing & print support', color: 'var(--orange)' },
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: `${f.color}15`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <f.icon size={12} color={f.color} />
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {f.text}
                </span>
                <ArrowRight size={10} color="var(--text-muted)" style={{ marginLeft: 'auto', opacity: 0.4 }} />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
