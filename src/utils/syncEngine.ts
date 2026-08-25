import { db } from './firebase'
import { doc, setDoc, onSnapshot, getDoc, type Firestore } from 'firebase/firestore'

export const SYNC_KEYS = ['customers', 'bills', 'bill_items', 'history', 'settings'] as const
export type SyncKey = typeof SYNC_KEYS[number]

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error'

let activeUnsubscribers: (() => void)[] = []
let isPushingToRemote = false
let currentSyncState: SyncState = navigator.onLine ? 'synced' : 'offline'
let lastSyncedTime: string | null = null
const lastLocalPushTimes: Record<string, number> = {}

function updateSyncState(state: SyncState) {
  currentSyncState = state
  if (state === 'synced') {
    lastSyncedTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gc_sync_status_change', { detail: { state: currentSyncState, lastSyncedTime } }))
  }
}

export function getCloudSyncState(): { state: SyncState; lastSyncedTime: string | null } {
  return { state: currentSyncState, lastSyncedTime }
}

export function stopRealtimeSync() {
  activeUnsubscribers.forEach(unsub => {
    try { unsub() } catch {}
  })
  activeUnsubscribers = []
}

export function initRealtimeSync(userId: string) {
  if (!db || !userId) return
  const database = db as Firestore

  stopRealtimeSync()
  updateSyncState('syncing')

  // Migrate any offline/pre-login data to user account if user account key is empty
  migrateOfflineDataToUser(userId)

  // Subscribe to each dataset in users/{userId}/store/{key}
  SYNC_KEYS.forEach(key => {
    try {
      const docRef = doc(database, `users/${userId}/store/${key}`)
      const unsub = onSnapshot(docRef, (docSnap) => {
        // Ignore local pending writes and recent local pushes
        if (docSnap.metadata?.hasPendingWrites) {
          updateSyncState('synced')
          return
        }

        const lastPush = lastLocalPushTimes[key] || 0
        const isRecentPush = (Date.now() - lastPush) < 10000

        if (isPushingToRemote || isRecentPush) {
          updateSyncState('synced')
          return
        }

        if (docSnap.exists()) {
          const remoteData = docSnap.data()?.value
          if (remoteData !== undefined && Array.isArray(remoteData)) {
            const localKey = `gc_${key}_${userId}`
            const currentLocal = localStorage.getItem(localKey)
            const remoteStr = JSON.stringify(remoteData)

            if (currentLocal !== remoteStr) {
              localStorage.setItem(localKey, remoteStr)
              window.dispatchEvent(new Event('gc_cloud_sync_update'))
            }
          }
        }
        updateSyncState('synced')
      }, (err) => {
        console.warn(`[Cloud Sync] ${key} snapshot error:`, err)
        updateSyncState(navigator.onLine ? 'error' : 'offline')
      })

      activeUnsubscribers.push(unsub)
    } catch (e) {
      console.warn(`[Cloud Sync] Failed to init snapshot for ${key}:`, e)
      updateSyncState('error')
    }
  })

  // Initial Sync: Push any local data to Firestore if doc doesn't exist
  syncInitialLocalToCloud(userId)
}

function migrateOfflineDataToUser(userId: string) {
  SYNC_KEYS.forEach(key => {
    const defaultLocalKey = `gc_${key}`
    const userLocalKey = `gc_${key}_${userId}`
    const unScopedData = localStorage.getItem(defaultLocalKey)
    const userScopedData = localStorage.getItem(userLocalKey)

    // If user storage is empty but pre-login offline storage has data, copy it over
    if (!userScopedData && unScopedData) {
      localStorage.setItem(userLocalKey, unScopedData)
    }
  })
}

async function syncInitialLocalToCloud(userId: string) {
  if (!db || !userId) return
  const database = db as Firestore

  updateSyncState('syncing')
  for (const key of SYNC_KEYS) {
    try {
      const docRef = doc(database, `users/${userId}/store/${key}`)
      const snap = await getDoc(docRef)
      const userKey = `gc_${key}_${userId}`
      const defaultKey = `gc_${key}`
      const localRaw = localStorage.getItem(userKey) || localStorage.getItem(defaultKey)

      if (snap.exists()) {
        const remoteVal = snap.data()?.value
        if (remoteVal !== undefined) {
          // Cloud has data — ALWAYS load cloud data into local storage
          const remoteStr = JSON.stringify(remoteVal)
          localStorage.setItem(userKey, remoteStr)
          window.dispatchEvent(new Event('gc_cloud_sync_update'))
        }
      } else if (localRaw) {
        // Only push local to cloud if cloud document does NOT exist yet
        try {
          const parsed = JSON.parse(localRaw)
          if (Array.isArray(parsed) ? parsed.length > 0 : Boolean(parsed)) {
            await setDoc(docRef, { value: parsed, updatedAt: new Date().toISOString() })
          }
        } catch {}
      }
    } catch (err) {
      console.warn(`[Cloud Sync] Initial sync error for ${key}:`, err)
    }
  }
  updateSyncState('synced')
}

export async function forceCloudSync(userId: string) {
  if (!userId) return
  updateSyncState('syncing')
  await syncInitialLocalToCloud(userId)
}

export async function pushToCloud(userId: string, key: SyncKey, payload: any) {
  if (!db || !userId) return
  const database = db as Firestore

  lastLocalPushTimes[key] = Date.now()
  isPushingToRemote = true
  updateSyncState('syncing')
  try {
    const docRef = doc(database, `users/${userId}/store/${key}`)
    await setDoc(docRef, {
      value: payload,
      updatedAt: new Date().toISOString()
    })
    updateSyncState('synced')
  } catch (err) {
    console.warn(`[Cloud Sync Push Error] ${key}:`, err)
    updateSyncState('error')
  } finally {
    setTimeout(() => {
      isPushingToRemote = false
    }, 10000)
  }
}

// Window connectivity listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => updateSyncState('synced'))
  window.addEventListener('offline', () => updateSyncState('offline'))
}

