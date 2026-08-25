import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
import { auth, googleProvider, signInWithPopup, firebaseSignOut, onAuthStateChanged } from '../utils/firebase'
import { initRealtimeSync, stopRealtimeSync } from '../utils/syncEngine'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar_url?: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithGoogleEmail: (email: string, name?: string) => void
  signInWithMasterPin: (pin: string) => boolean
  updateMasterPin: (currentPin: string, newPin: string) => boolean
  signOut: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'gc_auth_user'
const PIN_KEY = 'gc_master_pin'

export function getStoredMasterPin(): string {
  try {
    return localStorage.getItem(PIN_KEY) || '1234'
  } catch {
    return '1234'
  }
}

export function getCleanUserIdFromEmail(email: string): string {
  if (!email) return 'gid_anonymous'
  return 'gid_' + email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.id) {
      initRealtimeSync(user.id)
    } else {
      stopRealtimeSync()
    }
  }, [user?.id])

  useEffect(() => {
    // On native Android, skip Firebase web auth listener entirely.
    // Firebase web SDK has NO session on mobile - it always fires null,
    // which would kick the user back to the login screen immediately.
    // On mobile, auth state is managed purely via localStorage + React state.
    if (Capacitor.isNativePlatform()) {
      setLoading(false)
      return
    }

    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email) {
        const userId = getCleanUserIdFromEmail(fbUser.email)
        const u: AuthUser = {
          id: userId,
          email: fbUser.email.toLowerCase(),
          name: fbUser.displayName || fbUser.email.split('@')[0] || 'Google User',
          avatar_url: fbUser.photoURL || undefined
        }
        setUser(u)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)) } catch {}
      }
      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const signInWithGoogle = async (): Promise<void> => {
    // 1. If running on Android / Mobile Device:
    if (Capacitor.isNativePlatform()) {
      try {
        await GoogleAuth.initialize({
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        })
        const googleUser = await GoogleAuth.signIn()
        if (googleUser && googleUser.email) {
          const userId = getCleanUserIdFromEmail(googleUser.email)
          const u: AuthUser = {
            id: userId,
            email: googleUser.email.toLowerCase(),
            name: googleUser.name || (googleUser as any).displayName || googleUser.email.split('@')[0] || 'Google User',
            avatar_url: googleUser.imageUrl || undefined
          }
          setUser(u)
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)) } catch {}
          return
        }
      } catch (nativeErr: any) {
        console.warn('Native Google Auth error:', nativeErr)
        // If user cancelled picker, silently ignore
        if (
          nativeErr?.message?.includes('cancel') ||
          nativeErr?.message?.includes('Cancel') ||
          nativeErr?.error === 'USER_CANCELLED' ||
          nativeErr?.code === 'USER_CANCELLED'
        ) {
          return
        }
        // Any other error: throw so LoginScreen can show message
        throw nativeErr
      }
      return
    }

    // 2. Web / Desktop browser popup login:
    if (!auth) {
      throw new Error('Firebase Auth not initialized')
    }
    const res = await signInWithPopup(auth, googleProvider)
    if (res?.user && res.user.email) {
      const userId = getCleanUserIdFromEmail(res.user.email)
      const u: AuthUser = {
        id: userId,
        email: res.user.email.toLowerCase(),
        name: res.user.displayName || res.user.email.split('@')[0] || 'Google User',
        avatar_url: res.user.photoURL || undefined
      }
      setUser(u)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)) } catch {}
    }
  }

  const signInWithGoogleEmail = (email: string, name?: string) => {
    if (!email || !email.trim()) return
    const cleanEmail = email.trim().toLowerCase()
    const displayName = name?.trim() || cleanEmail.split('@')[0] || 'Google User'
    const id = getCleanUserIdFromEmail(cleanEmail)
    const u: AuthUser = {
      id,
      email: cleanEmail,
      name: displayName,
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`
    }
    setUser(u)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    } catch {}
  }

  const signInWithMasterPin = (pin: string): boolean => {
    const validPin = getStoredMasterPin()
    if (pin.trim() === validPin) {
      const u: AuthUser = {
        id: 'gid_store_master',
        email: 'master@goldcraft.store',
        name: 'Store Master',
      }
      setUser(u)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)) } catch {}
      return true
    }
    return false
  }

  const updateMasterPin = (currentPin: string, newPin: string): boolean => {
    const stored = getStoredMasterPin()
    if (currentPin.trim() !== stored) return false
    try { localStorage.setItem(PIN_KEY, newPin.trim()) } catch {}
    return true
  }

  const signOut = async () => {
    if (auth) {
      try { await firebaseSignOut(auth) } catch {}
    }
    setUser(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithGoogleEmail,
        signInWithMasterPin,
        updateMasterPin,
        signOut,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
