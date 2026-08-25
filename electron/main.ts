import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import https from 'node:https'
import { initDatabase, db } from './database'

// ─── Live Rate Fetcher (Node.js — no CORS) ────────────────────────────────────
function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const doGet = (u: string, redirects = 0) => {
      if (redirects > 3) return reject(new Error('Too many redirects'))
      const req = https.get(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        }
      }, (res) => {
        // Follow redirects
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          return doGet(res.headers.location, redirects + 1)
        }
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => resolve(data))
      })
      req.on('error', reject)
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')) })
    }
    doGet(url)
  })
}

// Fetch a single Yahoo Finance v8 chart symbol
async function fetchYahooSymbol(symbol: string): Promise<{ price: number; changePercent: number; marketState: string } | null> {
  // Try query1, then query2 as fallback
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']
  for (const host of hosts) {
    try {
      const enc = encodeURIComponent(symbol)
      const url = `https://${host}/v8/finance/chart/${enc}?interval=1m&range=1d&includePrePost=true`
      const raw = await httpsGet(url)
      const json = JSON.parse(raw)
      const meta = json?.chart?.result?.[0]?.meta
      if (meta && meta.regularMarketPrice) {
        return {
          price: meta.regularMarketPrice,
          changePercent: meta.regularMarketChangePercent ?? 0,
          marketState: meta.marketState ?? 'CLOSED',
        }
      }
    } catch { /* try next host */ }
  }
  return null
}

ipcMain.handle('fetch-live-rates', async () => {
  try {
    const TROY = 31.1035

    // Fetch all three in parallel
    const [goldData, silverData, fxData] = await Promise.all([
      fetchYahooSymbol('GC=F'),
      fetchYahooSymbol('SI=F'),
      fetchYahooSymbol('USDINR=X'),
    ])

    const fxRate = fxData?.price ?? 83.5

    if (!goldData && !silverData) {
      return { ok: false, error: `No data returned from Yahoo Finance. Gold: ${goldData}, Silver: ${silverData}` }
    }

    const gold24k = goldData ? (goldData.price * fxRate) / TROY : null
    const gold22k = gold24k  ? gold24k * (22 / 24) : null
    const gold18k = gold24k  ? gold24k * (18 / 24) : null
    const silver  = silverData ? (silverData.price * fxRate) / TROY : null

    return {
      ok: true,
      gold24k, gold22k, gold18k, silver,
      goldChange:   goldData?.changePercent   ?? 0,
      silverChange: silverData?.changePercent ?? 0,
      fxRate,
      marketState: goldData?.marketState ?? 'CLOSED',
      timestamp: Date.now(),
    }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0A0A0F',
    show: false,   // Don't show until ready-to-show — prevents blank flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(process.env.VITE_PUBLIC || '', 'icon.png'),
  })

  win.once('ready-to-show', () => {
    win?.show()
    win?.focus()
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toISOString())
    win?.show()
    win?.focus()
  })



  let retryCount = 0
  if (!app.isPackaged) {
    // VITE_DEV_SERVER_URL is injected by vite-plugin-electron with the correct dynamic port
    const devUrl = VITE_DEV_SERVER_URL!
    win.webContents.on('did-fail-load', (_e, errCode) => {
      // ERR_CONNECTION_REFUSED = Vite not ready yet, retry
      if (errCode === -102 && retryCount < 20) {
        retryCount++
        setTimeout(() => {
          if (win && !win.isDestroyed()) win.loadURL(devUrl)
        }, 800)
      }
    })
    win.loadURL(devUrl)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Initialize DB then create window
app.whenReady().then(() => {
  initDatabase()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

// ─── Window Controls ───────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => win?.minimize())
ipcMain.on('window-maximize', () => {
  if (win?.isMaximized()) win.unmaximize()
  else win?.maximize()
})
ipcMain.on('window-close', () => win?.close())

// ─── Customers ─────────────────────────────────────────────────────────────────
ipcMain.handle('get-customers', () => {
  return db.prepare('SELECT * FROM customers ORDER BY name ASC').all()
})
ipcMain.handle('get-customer', (_e, id: any) => {
  const numId = Number(id)
  const strId = String(id)
  const customer = db.prepare('SELECT * FROM customers WHERE id = ? OR id = ?').get(numId, strId)
  const bills = db.prepare('SELECT * FROM bills WHERE customer_id = ? OR customer_id = ? ORDER BY bill_date DESC').all(numId, strId)
  return { customer, bills }
})
ipcMain.handle('add-customer', (_e, data) => {
  const manualAdj = parseFloat(data.manual_balance_adj ?? data.total_due) || 0
  const cleanData = {
    name: data.name || 'Unnamed Client',
    phone: data.phone || '',
    email: data.email || '',
    address: data.address || '',
    city: data.city || '',
    gst_number: data.gst_number || '',
    total_due: parseFloat(data.total_due) || 0,
    manual_balance_adj: manualAdj,
  }
  const stmt = db.prepare(`
    INSERT INTO customers (name, phone, email, address, city, gst_number, total_due, manual_balance_adj, created_at, updated_at)
    VALUES (@name, @phone, @email, @address, @city, @gst_number, @total_due, @manual_balance_adj, datetime('now'), datetime('now'))
  `)
  const result = stmt.run(cleanData)
  logHistory('created', 'customer', result.lastInsertRowid as number, `Added customer: ${cleanData.name}`, null, JSON.stringify(cleanData))
  return result.lastInsertRowid
})
ipcMain.handle('update-customer', (_e, id: number, data) => {
  const old = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any
  const manualAdj = data.manual_balance_adj !== undefined ? (parseFloat(data.manual_balance_adj) || 0) : (parseFloat(data.total_due) || 0)
  const cleanData = {
    id,
    name: data.name || old?.name || 'Unnamed Client',
    phone: data.phone ?? old?.phone ?? '',
    email: data.email ?? old?.email ?? '',
    address: data.address ?? old?.address ?? '',
    city: data.city ?? old?.city ?? '',
    gst_number: data.gst_number ?? old?.gst_number ?? '',
    total_due: parseFloat(data.total_due) || 0,
    manual_balance_adj: manualAdj,
  }
  db.prepare(`
    UPDATE customers SET name=@name, phone=@phone, email=@email,
    address=@address, city=@city, gst_number=@gst_number,
    total_due=@total_due, manual_balance_adj=@manual_balance_adj, updated_at=datetime('now')
    WHERE id=@id
  `).run(cleanData)
  logHistory('updated', 'customer', id, `Updated customer: ${cleanData.name}`, JSON.stringify(old), JSON.stringify(cleanData))
  return true
})
ipcMain.handle('delete-customer', (_e, id: number) => {
  const old = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any
  if (old) {
    const deleteTx = db.transaction((custId: number) => {
      const custBills = db.prepare('SELECT id FROM bills WHERE customer_id = ?').all(custId) as any[]
      for (const b of custBills) {
        db.prepare('DELETE FROM bill_items WHERE bill_id = ?').run(b.id)
      }
      db.prepare('DELETE FROM bills WHERE customer_id = ?').run(custId)
      db.prepare('DELETE FROM customers WHERE id = ?').run(custId)
    })
    deleteTx(id)
    logHistory('deleted', 'customer', id, `Deleted customer ${old.name}`, JSON.stringify(old), null)
  }
  return true
})
ipcMain.handle('adjust-customer-balance', (_e, id: number, amount: number, isDeduction: boolean, notes: string) => {
  const old = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any
  const diff = isDeduction ? -amount : amount
  db.prepare(`
    UPDATE customers 
    SET manual_balance_adj = COALESCE(manual_balance_adj, 0) + @diff, 
        total_due = COALESCE(total_due, 0) + @diff, 
        updated_at = datetime('now') 
    WHERE id = @id
  `).run({ diff, id })
  
  const actionText = isDeduction ? 'Received Payment' : 'Added Credit'
  const desc = `${actionText}: ₹${amount}. ${notes ? 'Notes: ' + notes : ''}`
  logHistory('updated', 'customer', id, desc, JSON.stringify(old), null)
  return true
})

// ─── Bills ─────────────────────────────────────────────────────────────────────
ipcMain.handle('get-bills', () => {
  return db.prepare(`
    SELECT b.*, c.name as customer_name, c.phone as customer_phone
    FROM bills b LEFT JOIN customers c ON b.customer_id = c.id
    ORDER BY b.bill_date DESC, b.id DESC
  `).all()
})
ipcMain.handle('get-bill', (_e, id: number) => {
  const bill = db.prepare(`
    SELECT b.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address, c.gst_number as customer_gst, c.email as customer_email
    FROM bills b LEFT JOIN customers c ON b.customer_id = c.id
    WHERE b.id = ?
  `).get(id)
  const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(id)
  return { bill, items }
})
ipcMain.handle('add-bill', (_e, billData, items) => {
  const billNum = generateBillNumber()
  const insertBill = db.prepare(`
    INSERT INTO bills (bill_number, customer_id, bill_date, gold_rate_22k, gold_rate_18k, gold_rate_24k, silver_rate,
      subtotal, cgst, sgst, igst, discount, discount_type, previous_due, grand_total, amount_paid,
      remaining_due, payment_method, notes, status, created_at, updated_at)
    VALUES (@bill_number, @customer_id, @bill_date, @gold_rate_22k, @gold_rate_18k, @gold_rate_24k, @silver_rate,
      @subtotal, @cgst, @sgst, @igst, @discount, @discount_type, @previous_due, @grand_total, @amount_paid,
      @remaining_due, @payment_method, @notes, @status, datetime('now'), datetime('now'))
  `)
  const insertItem = db.prepare(`
    INSERT INTO bill_items (bill_id, item_name, category, weight, purity, rate, making_charges, stone_charges, qty, line_total)
    VALUES (@bill_id, @item_name, @category, @weight, @purity, @rate, @making_charges, @stone_charges, @qty, @line_total)
  `)
  const transaction = db.transaction((bill: any, itemList: any[]) => {
    const result = insertBill.run({ ...bill, bill_number: billNum })
    const billId = result.lastInsertRowid as number
    for (const item of itemList) insertItem.run({ ...item, bill_id: billId })
    // Update customer due
    db.prepare(`UPDATE customers SET total_due = total_due + @due, updated_at = datetime('now') WHERE id = @id`)
      .run({ due: bill.remaining_due, id: bill.customer_id })
    logHistory('created', 'bill', billId, `Created bill ${billNum} for customer #${bill.customer_id}`, null, JSON.stringify(bill))
    return billId
  })
  return transaction(billData, items)
})
ipcMain.handle('update-bill', (_e, id: number, billData, items) => {
  const old = db.prepare('SELECT * FROM bills WHERE id = ?').get(id) as any
  db.prepare(`
    UPDATE bills SET customer_id=@customer_id, bill_date=@bill_date, gold_rate_22k=@gold_rate_22k,
      gold_rate_18k=@gold_rate_18k, gold_rate_24k=@gold_rate_24k, silver_rate=@silver_rate,
      subtotal=@subtotal, cgst=@cgst, sgst=@sgst, igst=@igst, discount=@discount,
      discount_type=@discount_type, previous_due=@previous_due, grand_total=@grand_total,
      amount_paid=@amount_paid, remaining_due=@remaining_due, payment_method=@payment_method,
      notes=@notes, status=@status, updated_at=datetime('now') WHERE id=@id
  `).run({ ...billData, id })
  db.prepare('DELETE FROM bill_items WHERE bill_id = ?').run(id)
  const insertItem = db.prepare(`
    INSERT INTO bill_items (bill_id, item_name, category, weight, purity, rate, making_charges, stone_charges, qty, line_total)
    VALUES (@bill_id, @item_name, @category, @weight, @purity, @rate, @making_charges, @stone_charges, @qty, @line_total)
  `)
  for (const item of items) insertItem.run({ ...item, bill_id: id })
  // Recalculate customer due
  const dueDiff = billData.remaining_due - (old as any).remaining_due
  db.prepare(`UPDATE customers SET total_due = total_due + @diff, updated_at = datetime('now') WHERE id = @id`)
    .run({ diff: dueDiff, id: billData.customer_id })
  logHistory('updated', 'bill', id, `Updated bill #${id}`, JSON.stringify(old), JSON.stringify(billData))
  return true
})
ipcMain.handle('delete-bill', (_e, id: number) => {
  const old = db.prepare('SELECT * FROM bills WHERE id = ?').get(id) as any
  db.prepare('DELETE FROM bill_items WHERE bill_id = ?').run(id)
  db.prepare('DELETE FROM bills WHERE id = ?').run(id)
  if (old) {
    db.prepare('UPDATE customers SET total_due = total_due - @due WHERE id = @id')
      .run({ due: old.remaining_due, id: old.customer_id })
    logHistory('deleted', 'bill', id, `Deleted bill #${id}`, JSON.stringify(old), null)
  }
  return true
})

// ─── History ───────────────────────────────────────────────────────────────────
ipcMain.handle('get-history', (_e, filters) => {
  let query = `
    SELECT h.*, c.name as customer_name
    FROM history h
    LEFT JOIN customers c ON (h.entity_type = 'customer' AND h.entity_id = c.id)
    WHERE 1=1
  `
  const params: any[] = []
  if (filters?.action) { query += ' AND h.action = ?'; params.push(filters.action) }
  if (filters?.from) { query += ' AND h.timestamp >= ?'; params.push(filters.from) }
  if (filters?.to) { query += ' AND h.timestamp <= ?'; params.push(filters.to) }
  query += ' ORDER BY h.timestamp DESC LIMIT 500'
  return db.prepare(query).all(...params)
})

// ─── Metal Rates ───────────────────────────────────────────────────────────────
ipcMain.handle('get-rates', () => {
  return db.prepare('SELECT * FROM metal_rates ORDER BY date DESC, recorded_at DESC LIMIT 200').all()
})
ipcMain.handle('get-latest-rates', () => {
  const metals = ['gold_22k', 'gold_18k', 'gold_24k', 'silver']
  const result: any = {}
  for (const m of metals) {
    result[m] = db.prepare('SELECT * FROM metal_rates WHERE metal = ? ORDER BY date DESC LIMIT 1').get(m)
  }
  return result
})
ipcMain.handle('add-rate', (_e, data) => {
  const stmt = db.prepare(`
    INSERT INTO metal_rates (metal, rate, date, recorded_at)
    VALUES (@metal, @rate, @date, datetime('now'))
  `)
  for (const [metal, rate] of Object.entries(data.rates)) {
    stmt.run({ metal, rate, date: data.date })
  }
  return true
})

// ─── Settings ──────────────────────────────────────────────────────────────────
ipcMain.handle('get-settings', () => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as any[]
  return Object.fromEntries(rows.map((r: any) => [r.key, r.value]))
})
ipcMain.handle('save-settings', (_e, settings: Record<string, string>) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  for (const [key, value] of Object.entries(settings)) stmt.run(key, value)
  return true
})

// ─── Helpers ───────────────────────────────────────────────────────────────────
function generateBillNumber(): string {
  const date = new Date()
  const y = date.getFullYear().toString().slice(-2)
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const count = (db.prepare('SELECT COUNT(*) as c FROM bills').get() as any).c + 1
  return `GC${y}${m}${String(count).padStart(4, '0')}`
}

function logHistory(action: string, entityType: string, entityId: number, description: string, oldValue: string | null, newValue: string | null) {
  db.prepare(`
    INSERT INTO history (action, entity_type, entity_id, description, old_value, new_value, performed_by, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, 'Admin', datetime('now'))
  `).run(action, entityType, entityId, description, oldValue, newValue)
}

ipcMain.handle('clear-all-data', () => {
  db.exec('DELETE FROM bill_items; DELETE FROM bills; DELETE FROM customers; DELETE FROM history;')
  return true
})
