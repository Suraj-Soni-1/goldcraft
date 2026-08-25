import Database from 'better-sqlite3'
import path from 'node:path'
import { app } from 'electron'

const dbPath = path.join(app.getPath('userData'), 'goldcraft.db')
export const db = new Database(dbPath)

export function initDatabase() {
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      gst_number TEXT,
      total_due REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT UNIQUE,
      customer_id INTEGER REFERENCES customers(id),
      bill_date DATE,
      gold_rate_22k REAL DEFAULT 0,
      gold_rate_18k REAL DEFAULT 0,
      gold_rate_24k REAL DEFAULT 0,
      silver_rate REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      cgst REAL DEFAULT 0,
      sgst REAL DEFAULT 0,
      igst REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      discount_type TEXT DEFAULT 'flat',
      previous_due REAL DEFAULT 0,
      grand_total REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      remaining_due REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      notes TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
      item_name TEXT,
      category TEXT,
      weight REAL DEFAULT 0,
      purity TEXT DEFAULT '22K',
      rate REAL DEFAULT 0,
      making_charges REAL DEFAULT 0,
      stone_charges REAL DEFAULT 0,
      qty INTEGER DEFAULT 1,
      line_total REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT,
      entity_type TEXT,
      entity_id INTEGER,
      description TEXT,
      old_value TEXT,
      new_value TEXT,
      performed_by TEXT DEFAULT 'Admin',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metal_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metal TEXT,
      rate REAL,
      date DATE,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `)

  // Migrate existing databases safely by adding missing columns if not present
  try { db.exec(`ALTER TABLE bill_items ADD COLUMN rate REAL DEFAULT 0`) } catch (e) {}
  try { db.exec(`ALTER TABLE customers ADD COLUMN manual_balance_adj REAL DEFAULT 0`) } catch (e) {}

  // Seed default settings if not present
  const existing = db.prepare('SELECT key FROM settings WHERE key = ?').get('shop_name')
  if (!existing) {
    const defaults = {
      shop_name: 'R.K. Jewellers',
      shop_address: 'Fatehabad, Haryana - 125050',
      shop_phone: '+91 9896103609',
      shop_email: 'rkjewellers.ftb@gmail.com',
      shop_gst: '06AABCR1234A1Z5',
      cgst_rate: '1.5',
      sgst_rate: '1.5',
      igst_rate: '3',
      currency: 'INR',
      bill_prefix: 'RK',
      theme: 'dark'
    }
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    for (const [k, v] of Object.entries(defaults)) stmt.run(k, v)
  }
}
