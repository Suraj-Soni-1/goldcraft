import { db } from './firebase'
import { doc, setDoc, collection } from 'firebase/firestore'
import { pushToCloud } from './syncEngine'

export function fmt(amount: number) {
  if (amount < 0) {
    return '-₹' + Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function initials(name: string) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export function statusBadge(status: string) {
  switch (status) {
    case 'paid': return 'badge badge-green'
    case 'partial': return 'badge badge-orange'
    case 'pending': return 'badge badge-red'
    default: return 'badge badge-blue'
  }
}

export function actionColor(action: string) {
  switch (action) {
    case 'created': return 'var(--green)'
    case 'updated': return 'var(--orange)'
    case 'deleted': return 'var(--red)'
    default: return 'var(--blue)'
  }
}

// Check if running inside Electron
const hasElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined

function getCurrentUserId(): string | null {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('gc_auth_user')
      if (raw) {
        const u = JSON.parse(raw)
        return u?.id || null
      }
    }
  } catch {}
  return null
}

function getCurrentUserKey(): string {
  const uid = getCurrentUserId()
  return uid ? '_' + uid : ''
}

export function getWebStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  const userKey = getCurrentUserKey()
  const fullKey = 'gc_' + key + userKey
  const item = localStorage.getItem(fullKey)
  
  // If user scoped storage is empty, check un-scoped storage (pre-login data)
  if (!item && userKey) {
    const defaultItem = localStorage.getItem('gc_' + key)
    if (defaultItem) {
      try {
        const parsed = JSON.parse(defaultItem)
        if (Array.isArray(parsed) ? parsed.length > 0 : Boolean(parsed)) {
          localStorage.setItem(fullKey, defaultItem)
          return parsed
        }
      } catch {}
    }
  }

  if (!item) {
    return fallback
  }
  try { return JSON.parse(item) } catch { return fallback }
}

export function setWebStorage<T>(key: string, val: T, shouldPushToCloud = true) {
  if (typeof window !== 'undefined') {
    const userId = getCurrentUserId()
    const userKey = getCurrentUserKey()
    const fullKey = 'gc_' + key + userKey
    const newStr = JSON.stringify(val)
    const oldStr = localStorage.getItem(fullKey)

    if (oldStr !== newStr) {
      localStorage.setItem(fullKey, newStr)
      window.dispatchEvent(new Event('gc_cloud_sync_update'))

      if (userId && shouldPushToCloud) {
        pushToCloud(userId, key as any, val)
      }
    }
  }
}

export async function syncElectronToCloud() {
  // Neutralized: Cloud Firestore is the master store.
  // SQLite receives data from cloud, but never overwrites cloud on startup.
}

// Log history — ALWAYS writes to local storage first, then tries Firebase Firestore in background
async function logHistoryCloud(
  action: string,
  entityType: string,
  entityId: number,
  description: string,
  oldValue: string | null,
  newValue: string | null
) {
  const userId = getCurrentUserId()
  const list = getWebStorage('history', [])
  const newItem = {
    id: Date.now(), action, entity_type: entityType, entity_id: entityId,
    description, old_value: oldValue, new_value: newValue, performed_by: 'Admin',
    timestamp: new Date().toISOString()
  }
  setWebStorage('history', [newItem, ...list])

  // Firebase Firestore background sync
  if (db && userId) {
    try {
      const historyRef = doc(collection(db, `users/${userId}/history`))
      await setDoc(historyRef, newItem)
    } catch {}
  }
}

// ═══════════════════════════════════════════════════════════
// Unified API — 100% LOCAL-STORAGE + FIRESTORE HYBRID ENGINE
// All reads come from local cache instantly.
// Syncs SQLite data in Electron straight to Firestore Cloud.
// ═══════════════════════════════════════════════════════════
export const api = {
  minimize: () => { if (hasElectron) (window as any).electronAPI.minimize() },
  maximize: () => { if (hasElectron) (window as any).electronAPI.maximize() },
  close: () => { if (hasElectron) (window as any).electronAPI.close() },

  fetchLiveRates: async () => {
    if (hasElectron) return (window as any).electronAPI.fetchLiveRates()
    return {
      ok: true, gold24k: 13950, gold22k: 12788, gold18k: 10462, silver: 233,
      goldChange: 0.45, silverChange: 0.20, fxRate: 83.5, marketState: 'OPEN', timestamp: Date.now()
    }
  },

  getLatestRates: async () => {
    if (hasElectron) {
      try { return await (window as any).electronAPI.getLatestRates() } catch {}
    }
    return getWebStorage('rates', {
      gold_24k: { rate: 13950 }, gold_22k: { rate: 12788 }, gold_18k: { rate: 10462 }, silver: { rate: 233 }
    })
  },

  // ── CUSTOMERS ──────────────────────────────────────────

  getCustomers: async () => {
    const userId = getCurrentUserId()
    const wCusts = getWebStorage<any[]>('customers', [])
    let eCusts: any[] = []

    if (!userId && hasElectron) {
      try { eCusts = await (window as any).electronAPI.getCustomers() } catch {}
    }

    const map = new Map<string, any>()
    for (const c of eCusts) {
      if (c && c.id) map.set(String(c.id), c)
    }
    for (const c of wCusts) {
      if (c && c.id) map.set(String(c.id), c)
    }
    const uniqueCusts = Array.from(map.values())

    const wBills = getWebStorage<any[]>('bills', [])
    let eBills: any[] = []
    if (!userId && hasElectron) {
      try { eBills = await (window as any).electronAPI.getBills() } catch {}
    }
    const billMap = new Map<string, any>()
    for (const b of eBills) {
      if (b && b.id) billMap.set(String(b.id), b)
    }
    for (const b of wBills) {
      if (b && b.id) billMap.set(String(b.id), b)
    }
    const bills = Array.from(billMap.values())

    // Dynamically calculate total_due from bills — match only by customer_id
    const updatedCusts = uniqueCusts.map((c: any) => {
      const cBills = bills.filter((b: any) =>
        b.customer_id && String(b.customer_id) === String(c.id)
      )
      const dueFromBills = cBills.reduce((s: number, b: any) => s + (parseFloat(b.remaining_due) || 0), 0)
      const manualAdj = parseFloat(c.manual_balance_adj) || 0
      return {
        ...c,
        total_due: dueFromBills + manualAdj
      }
    })

    return updatedCusts
  },

  getCustomer: async (id: number) => {
    if (!id) return { customer: null, bills: [] }

    let customer: any = null
    let userBills: any[] = []

    if (hasElectron) {
      try {
        const result = await (window as any).electronAPI.getCustomer(id)
        if (result?.customer) {
          customer = result.customer
          userBills = result.bills || []
        }
      } catch {}
    }

    if (!customer) {
      const custs = getWebStorage<any[]>('customers', [])
      const bills = getWebStorage<any[]>('bills', [])
      customer = custs.find((c: any) => c.id && String(c.id) === String(id)) || null
      userBills = bills.filter((b: any) => b.customer_id && String(b.customer_id) === String(id))
    }

    // Always compute live balance from bills
    if (customer) {
      const dueFromBills = userBills.reduce((s: number, b: any) => s + (parseFloat(b.remaining_due) || 0), 0)
      const manualAdj = parseFloat(customer.manual_balance_adj) || 0
      customer = { ...customer, total_due: dueFromBills + manualAdj }
    }

    return { customer, bills: userBills }
  },

  addCustomer: async (data: any) => {
    let newId = Date.now()
    const manualAdj = parseFloat(data.manual_balance_adj ?? data.total_due) || 0
    const payload = { ...data, manual_balance_adj: manualAdj, total_due: parseFloat(data.total_due) || 0 }
    if (hasElectron) {
      try {
        const eId = await (window as any).electronAPI.addCustomer(payload)
        if (eId) newId = eId
      } catch {}
    }
    const custs = getWebStorage<any[]>('customers', [])
    const newCust = { id: newId, ...payload, created_at: new Date().toISOString() }
    const updated = [newCust, ...custs.filter((c: any) => String(c.id) !== String(newId))]
    setWebStorage('customers', updated)
    await logHistoryCloud('created', 'customer', newId, `Added customer: ${data.name}`, null, JSON.stringify(data))
    return newId
  },

  updateCustomer: async (id: number, data: any) => {
    if (!id) return false
    let bills: any[] = []
    if (hasElectron) {
      try { bills = await (window as any).electronAPI.getBills() } catch {}
    }
    if (!bills || !bills.length) bills = getWebStorage('bills', [])
    const cBills = bills.filter((b: any) => b.customer_id && String(b.customer_id) === String(id))
    const dueFromBills = cBills.reduce((s: number, b: any) => s + (parseFloat(b.remaining_due) || 0), 0)

    const manualAdj = data.manual_balance_adj !== undefined 
      ? (parseFloat(data.manual_balance_adj) || 0)
      : (parseFloat(data.total_due) !== undefined ? (parseFloat(data.total_due) - dueFromBills) : 0)

    const payload = { ...data, manual_balance_adj: manualAdj }

    if (hasElectron) {
      try { await (window as any).electronAPI.updateCustomer(id, payload) } catch {}
    }
    const custs = getWebStorage<any[]>('customers', [])
    const updated = custs.map((c: any) => c.id && String(c.id) === String(id) ? { ...c, ...payload, id } : c)
    setWebStorage('customers', updated)
    await logHistoryCloud('updated', 'customer', Number(id), `Updated customer: ${data.name}`, null, JSON.stringify(data))
    return true
  },

  deleteCustomer: async (id: number) => {
    if (!id) return false
    if (hasElectron) {
      try { await (window as any).electronAPI.deleteCustomer(id) } catch {}
    }
    const custs = getWebStorage<any[]>('customers', [])
    const bills = getWebStorage<any[]>('bills', [])
    const itemsMap = getWebStorage<Record<number, any[]>>('bill_items', {})

    const billsToDelete = bills.filter((b: any) => b.customer_id && String(b.customer_id) === String(id))
    billsToDelete.forEach((b: any) => {
      delete itemsMap[b.id]
      delete itemsMap[Number(b.id)]
    })

    setWebStorage('customers', custs.filter((c: any) => c.id && String(c.id) !== String(id)))
    setWebStorage('bills', bills.filter((b: any) => b.customer_id && String(b.customer_id) !== String(id)))
    setWebStorage('bill_items', itemsMap)

    await logHistoryCloud('deleted', 'customer', Number(id), 'Deleted customer', null, null)
    return true
  },

  adjustCustomerBalance: async (id: number, amount: number, isDeduction: boolean, paymentMethod: string = 'cash', notes: string = '') => {
    if (!id) return false
    const diff = isDeduction ? -amount : amount
    const fullNotes = `Method: ${paymentMethod.toUpperCase()}${notes ? ' | ' + notes : ''}`
    if (hasElectron) {
      try { await (window as any).electronAPI.adjustCustomerBalance(id, amount, isDeduction, fullNotes) } catch {}
    }
    const custs = getWebStorage<any[]>('customers', [])
    const cust = custs.find((c: any) => c.id && String(c.id) === String(id))
    if (cust) {
      cust.manual_balance_adj = (parseFloat(cust.manual_balance_adj) || 0) + diff
      cust.total_due = (parseFloat(cust.total_due) || 0) + diff
      setWebStorage('customers', [...custs])
    } else {
      window.dispatchEvent(new Event('gc_cloud_sync_update'))
    }
    await logHistoryCloud('updated', 'customer', Number(id), `Balance adjusted (${isDeduction ? 'Received' : 'Added'}): ₹${amount} [${paymentMethod.toUpperCase()}] ${notes}`, null, null)
    return true
  },

  // ── BILLS ──────────────────────────────────────────────

  getBills: async () => {
    const userId = getCurrentUserId()
    let billsList = getWebStorage<any[]>('bills', [])
    if (!userId && hasElectron) {
      try {
        const eBills = await (window as any).electronAPI.getBills()
        if (eBills && eBills.length) billsList = eBills
      } catch {}
    }
    const custs = getWebStorage<any[]>('customers', [])
    return billsList.map((b: any) => {
      const c = custs.find((x: any) =>
        (x.id && b.customer_id && String(x.id) === String(b.customer_id)) ||
        (x.phone && b.customer_phone && x.phone === b.customer_phone) ||
        (x.name && b.customer_name && x.name.toLowerCase() === b.customer_name.toLowerCase())
      )
      return {
        ...b,
        customer_id: c ? c.id : b.customer_id,
        customer_name: c ? c.name : (b.customer_name || 'Walk-In Customer'),
        customer_phone: c ? c.phone : (b.customer_phone || '')
      }
    })
  },

  getBill: async (id: number) => {
    const userId = getCurrentUserId()
    if (!userId && hasElectron) {
      try { return await (window as any).electronAPI.getBill(id) } catch {}
    }
    const bills = getWebStorage<any[]>('bills', [])
    const itemsMap = getWebStorage<Record<number, any[]>>('bill_items', {})
    const bill = bills.find((b: any) => String(b.id) === String(id)) || null
    const items = itemsMap[id] || itemsMap[Number(id)] || []
    return { bill, items }
  },

  addBill: async (billData: any, items: any[]) => {
    let newId = Date.now()
    const billNum = `GC${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Date.now()).slice(-4)}`
    const payload = { ...billData, bill_number: billData.bill_number || billNum }
    if (hasElectron) {
      try {
        const eId = await (window as any).electronAPI.addBill(payload, items)
        if (eId) newId = eId
      } catch {}
    }

    const bills = getWebStorage<any[]>('bills', [])
    const itemsMap = getWebStorage<Record<number, any[]>>('bill_items', {})
    const newBill = { id: newId, ...payload, created_at: new Date().toISOString() }

    itemsMap[newId] = items.map((it, idx) => ({ id: Date.now() + idx, bill_id: newId, ...it }))

    setWebStorage('bills', [newBill, ...bills.filter((b: any) => String(b.id) !== String(newId))])
    setWebStorage('bill_items', itemsMap)

    // Update customer due automatically
    if (billData.customer_id) {
      const custs = getWebStorage<any[]>('customers', [])
      const cust = custs.find((c: any) => c.id && String(c.id) === String(billData.customer_id))
      if (cust) {
        setWebStorage('customers', [...custs])
      }
    }

    await logHistoryCloud('created', 'bill', newId, `Created invoice ${newBill.bill_number} (₹${billData.grand_total})`, null, JSON.stringify(billData))
    return newId
  },

  updateBill: async (id: number, billData: any, items: any[]) => {
    if (!id) return false
    if (hasElectron) {
      try { await (window as any).electronAPI.updateBill(id, billData, items) } catch {}
    }
    const bills = getWebStorage<any[]>('bills', [])
    const itemsMap = getWebStorage<Record<number, any[]>>('bill_items', {})

    const updatedBills = bills.map((b: any) => String(b.id) === String(id) ? { ...b, ...billData, id } : b)
    itemsMap[id] = items.map((it, idx) => ({ id: it.id || (Date.now() + idx), bill_id: id, ...it }))

    setWebStorage('bills', updatedBills)
    setWebStorage('bill_items', itemsMap)

    await logHistoryCloud('updated', 'bill', Number(id), `Updated invoice #${id}`, null, JSON.stringify(billData))
    return true
  },

  deleteBill: async (id: number) => {
    if (!id) return false
    if (hasElectron) {
      try { await (window as any).electronAPI.deleteBill(id) } catch {}
    }
    const bills = getWebStorage<any[]>('bills', [])
    const itemsMap = getWebStorage<Record<number, any[]>>('bill_items', {})

    delete itemsMap[id]
    delete itemsMap[Number(id)]

    setWebStorage('bills', bills.filter((b: any) => String(b.id) !== String(id)))
    setWebStorage('bill_items', itemsMap)

    await logHistoryCloud('deleted', 'bill', Number(id), `Deleted invoice #${id}`, null, null)
    return true
  },

  // ── HISTORY ─────────────────────────────────────────────

  getHistory: async (filters?: any) => {
    const userId = getCurrentUserId()
    let list = getWebStorage<any[]>('history', [])
    if (!userId && hasElectron) {
      try {
        const eHist = await (window as any).electronAPI.getHistory(filters)
        if (eHist && eHist.length) list = eHist
      } catch {}
    }
    const custs = getWebStorage<any[]>('customers', [])
    return list.map((h: any) => {
      const c = h.entity_type === 'customer' ? custs.find((x: any) => String(x.id) === String(h.entity_id)) : null
      return { ...h, customer_name: c ? c.name : h.customer_name }
    })
  },

  // ── SETTINGS ────────────────────────────────────────────

  getSettings: async () => {
    if (hasElectron) {
      try {
        const eSettings = await (window as any).electronAPI.getSettings()
        if (eSettings && Object.keys(eSettings).length) return eSettings
      } catch {}
    }
    return getWebStorage('settings', {
      shop_name: 'R.K. Jewellers',
      shop_address: 'Fatehabad, Haryana - 125050',
      shop_phone: '+91 9896103609',
      shop_email: 'rkjewellers.ftb@gmail.com',
      shop_gst: '06AABCR1234A1Z5',
      cgst_rate: '1.5',
      sgst_rate: '1.5',
      igst_rate: '3',
      bill_prefix: 'RK'
    })
  },

  saveSettings: async (settings: Record<string, string>) => {
    if (hasElectron) {
      try { await (window as any).electronAPI.saveSettings(settings) } catch {}
    }
    setWebStorage('settings', settings)
    await logHistoryCloud('updated', 'settings', 0, 'Updated store settings & tax rates', null, null)
    return true
  },

  clearAllData: async () => {
    if (hasElectron) {
      try { await (window as any).electronAPI.clearAllData() } catch {}
    }
    setWebStorage('customers', [])
    setWebStorage('bills', [])
    setWebStorage('bill_items', {})
    setWebStorage('history', [])
    return true
  }
}

export function clearAllStoreData(_userId?: string) {
  return api.clearAllData()
}
