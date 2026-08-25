import { pushToCloud } from './syncEngine'

export interface BackupData {
  version: string
  app: string
  exportedAt: string
  userId: string
  userEmail: string
  customers: any[]
  bills: any[]
  billItems: Record<number, any[]>
  history: any[]
  settings: Record<string, string>
}

function getCurrentUserInfo() {
  try {
    const raw = localStorage.getItem('gc_auth_user')
    if (raw) return JSON.parse(raw)
  } catch {}
  return { id: '', email: '' }
}

function getCurrentUserKey(): string {
  const u = getCurrentUserInfo()
  return u?.id ? '_' + u.id : ''
}

function getStored<T>(key: string, fallback: T): T {
  const userKey = getCurrentUserKey()
  const item = localStorage.getItem('gc_' + key + userKey)
  if (!item) return fallback
  try { return JSON.parse(item) } catch { return fallback }
}

// ═══════════════════════════════════════════════════════════
// 1. Export Store Backup to JSON File
// ═══════════════════════════════════════════════════════════
export function exportStoreBackup(): { filename: string; sizeKb: number; count: number } {
  const u = getCurrentUserInfo()
  const customers = getStored<any[]>('customers', [])
  const bills = getStored<any[]>('bills', [])
  const billItems = getStored<Record<number, any[]>>('bill_items', {})
  const history = getStored<any[]>('history', [])
  const settings = getStored<Record<string, string>>('settings', {})

  const backupObj: BackupData = {
    version: '2.0.0',
    app: 'GoldCraft Jeweller Billing',
    exportedAt: new Date().toISOString(),
    userId: u?.id || 'unknown',
    userEmail: u?.email || 'unknown',
    customers,
    bills,
    billItems,
    history,
    settings
  }

  const jsonString = JSON.stringify(backupObj, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `GoldCraft_Backup_${dateStr}_${(u?.email || 'store').split('@')[0]}.json`

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  const count = customers.length + bills.length
  const sizeKb = Math.round(blob.size / 1024)

  return { filename, sizeKb, count }
}

// ═══════════════════════════════════════════════════════════
// 2. Import & Restore Store Data from Backup JSON File
// ═══════════════════════════════════════════════════════════
export function importStoreBackup(file: File): Promise<{ success: boolean; message: string; customerCount: number; billCount: number }> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.json')) {
      return resolve({ success: false, message: 'Invalid file format. Please select a .json backup file.', customerCount: 0, billCount: 0 })
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        const parsed: BackupData = JSON.parse(text)

        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.customers) || !Array.isArray(parsed.bills)) {
          return resolve({ success: false, message: 'Backup file schema invalid or corrupted.', customerCount: 0, billCount: 0 })
        }

        const u = getCurrentUserInfo()
        const userKey = getCurrentUserKey()

        // Restore into LocalStorage under current active user key
        localStorage.setItem('gc_customers' + userKey, JSON.stringify(parsed.customers))
        localStorage.setItem('gc_bills' + userKey, JSON.stringify(parsed.bills))
        if (parsed.billItems) localStorage.setItem('gc_bill_items' + userKey, JSON.stringify(parsed.billItems))
        if (parsed.history) localStorage.setItem('gc_history' + userKey, JSON.stringify(parsed.history))
        if (parsed.settings) localStorage.setItem('gc_settings' + userKey, JSON.stringify(parsed.settings))

        // Push restored data to Cloud if user is signed in
        if (u?.id) {
          pushToCloud(u.id, 'customers', parsed.customers)
          pushToCloud(u.id, 'bills', parsed.bills)
          if (parsed.billItems) pushToCloud(u.id, 'bill_items', parsed.billItems)
          if (parsed.history) pushToCloud(u.id, 'history', parsed.history)
          if (parsed.settings) pushToCloud(u.id, 'settings', parsed.settings)
        }

        // Notify app to refresh state
        window.dispatchEvent(new Event('gc_cloud_sync_update'))

        resolve({
          success: true,
          message: `Successfully restored ${parsed.customers.length} customers and ${parsed.bills.length} invoices!`,
          customerCount: parsed.customers.length,
          billCount: parsed.bills.length
        })
      } catch (err: any) {
        resolve({ success: false, message: 'Failed to parse JSON backup file: ' + err.message, customerCount: 0, billCount: 0 })
      }
    }
    reader.onerror = () => reject(new Error('File reading error'))
    reader.readAsText(file)
  })
}

