import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, type User, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

// Remove all stale localStorage Firebase configs
try {
  localStorage.removeItem('gc_firebase_config')
} catch {}

// Firebase config - ONLY from .env, NO localStorage override
const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || 'AIzaSyANWQpThjXq-CgD9R22CMwmbrVLfWbBmn8',
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || 'goldcraft-store.firebaseapp.com',
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'goldcraft-store',
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || 'goldcraft-store.firebasestorage.app',
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '317628461401',
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '1:317628461401:web:4a3664c802ef2253de1c48'
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
  auth = getAuth(app)
  db = getFirestore(app)
} catch (err) {
  console.error('[GoldCraft Firebase] Init error:', err)
}

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

// Keep for backward compat
export function getSavedFirebaseConfig() {
  return firebaseConfig
}
export function saveFirebaseConfig(_config: Record<string, string>) {
  window.location.reload()
}

export { app, auth, db, signInWithPopup, firebaseSignOut, onAuthStateChanged, type User }
