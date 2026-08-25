import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Save, Store, MapPin, Phone, Mail, FileText, Tag, BarChart2, Landmark, CreditCard, Building, User, Download, Upload, ShieldCheck, Database } from 'lucide-react'
import { api, clearAllStoreData } from '../../utils/helpers'
import { useToast } from '../../components/Toast'
import { exportStoreBackup, importStoreBackup } from '../../utils/backup'
import { useAuth } from '../../context/AuthContext'
import ConfirmModal from '../../components/ConfirmModal'

const FIELDS = [
  { key: 'shop_name', label: 'Shop Business Name', icon: Store },
  { key: 'shop_address', label: 'Street Address & City', icon: MapPin },
  { key: 'shop_phone', label: 'Contact Phone Number', icon: Phone },
  { key: 'shop_email', label: 'Official Email', icon: Mail },
  { key: 'shop_gst', label: 'GSTIN Registration Number', icon: Tag },
  { key: 'bill_prefix', label: 'Invoice Bill Number Prefix', icon: FileText },
]

const TAX_FIELDS = [
  { key: 'cgst_rate', label: 'CGST Rate (%)', icon: BarChart2 },
  { key: 'sgst_rate', label: 'SGST Rate (%)', icon: BarChart2 },
  { key: 'igst_rate', label: 'IGST Rate (%)', icon: BarChart2 },
]

const BANK_FIELDS = [
  { key: 'shop_bank_name', label: 'Bank Name', icon: Landmark },
  { key: 'shop_bank_ac', label: 'Account Number', icon: CreditCard },
  { key: 'shop_bank_ifsc', label: 'IFSC Code', icon: Tag },
  { key: 'shop_bank_branch', label: 'Branch Name', icon: Building },
  { key: 'shop_bank_holder', label: 'Account Holder Name', icon: User },
]

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showWipeConfirm, setShowWipeConfirm] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.getSettings().then((s: Record<string, string>) => { setSettings(s); setLoading(false) })
    const handleSync = () => {
      api.getSettings().then((s: Record<string, string>) => setSettings(s))
    }
    window.addEventListener('gc_cloud_sync_update', handleSync)
    return () => window.removeEventListener('gc_cloud_sync_update', handleSync)
  }, [])

  const set = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.saveSettings(settings)
    toast('Store preferences and invoice layout saved')
  }

  const handleExportBackup = () => {
    const res = exportStoreBackup()
    toast(`Backup downloaded: ${res.filename} (${res.sizeKb} KB, ${res.count} records)`)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const res = await importStoreBackup(file)
    if (res.success) {
      toast(res.message)
    } else {
      toast(res.message, 'error')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading) return <div className="empty-state"><div className="spinner" /></div>

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <SettingsIcon size={28} style={{ color: 'var(--gold-300)' }} />
            Shop Settings &amp; Configuration
          </h1>
          <p className="page-subtitle">Customise shop headers, default tax rates, bank payment details, and terms</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          form="settings-form"
          className="btn btn-primary btn-lg"
        >
          <Save size={16} /> Save All Changes
        </motion.button>
      </div>

      {/* Backup & Data Recovery Card */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(18, 14, 33, 0.9) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <ShieldCheck size={20} /> 1-Click Store Backup &amp; Data Safety
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Export a complete offline <code>.json</code> backup of your invoices, client ledgers, and settings — or restore existing backup files on any device.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleExportBackup}
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff' }}
            >
              <Download size={15} /> Download Store Backup (.json)
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary"
            >
              <Upload size={15} /> Restore from Backup (.json)
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </motion.div>

      {/* Live Invoice Preview Header */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(253, 176, 34, 0.08) 0%, rgba(18, 14, 33, 0.9) 100%)',
          border: '1px solid var(--border-bright)'
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
          LIVE PRINTED INVOICE HEADER PREVIEW
        </div>
        <div style={{ padding: 16, background: '#ffffff', borderRadius: 8, color: '#000000', fontFamily: 'serif' }}>
          <div style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>
            {settings['shop_name'] || 'GOLDCRAFT JEWELLERS'}
          </div>
          <div style={{ fontSize: 11, textAlign: 'center', color: '#555555', marginTop: 2 }}>
            {settings['shop_address'] || '123 Jewellery Market, Main Road'} · Ph: {settings['shop_phone'] || '+91 98765 43210'}
          </div>
          <div style={{ fontSize: 10, textAlign: 'center', color: '#777777', marginTop: 2, fontFamily: 'sans-serif' }}>
            GSTIN: {settings['shop_gst'] || '27AAAAA0000A1Z5'} · Email: {settings['shop_email'] || 'info@goldcraft.com'}
          </div>
        </div>
      </motion.div>

      <form id="settings-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Shop Info */}
        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: 'var(--gold-100)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}>
            <Store size={18} color="var(--gold-300)" /> Shop Profile &amp; Header Details
          </div>
          <div className="form-grid form-grid-2">
            {FIELDS.map(f => (
              <div key={f.key} className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <f.icon size={13} />{f.label}
                </label>
                <input
                  className="form-input"
                  value={settings[f.key] || ''}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.label}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Tax Rates */}
        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: 'var(--gold-100)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={18} color="var(--gold-300)" /> Default Tax Rates (GST)
          </div>
          <div className="form-grid form-grid-3">
            {TAX_FIELDS.map(f => (
              <div key={f.key} className="form-group">
                <label className="form-label">{f.label}</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={settings[f.key] || ''}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Bank Details */}
        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: 'var(--gold-100)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}>
            <Landmark size={18} color="var(--gold-300)" /> Bank Account Details
          </div>
          <div className="form-grid form-grid-2">
            {BANK_FIELDS.map(f => (
              <div key={f.key} className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <f.icon size={13} />{f.label}
                </label>
                <input
                  className="form-input"
                  value={settings[f.key] || ''}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.label}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18, color: 'var(--gold-100)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="var(--gold-300)" /> Custom Invoice Terms &amp; Conditions
          </div>
          <div className="form-group">
            <label className="form-label">Terms (One clause per line)</label>
            <textarea
              className="form-input"
              rows={4}
              value={settings['shop_terms'] || ''}
              onChange={e => set('shop_terms', e.target.value)}
              placeholder="1. Goods once sold will not be taken back.&#10;2. Subject to local jurisdiction.&#10;3. Hallmark certified 916 gold."
              style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
            />
          </div>
        </div>

        {/* Danger Zone: Reset Data */}
        <div className="card" style={{ border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.04)' }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12, color: 'var(--red)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={18} color="var(--red)" /> Reset &amp; Clear All Application Data
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Permanently delete all customers, invoices, line items, and audit history from both Local Database and Firebase Cloud to start completely fresh.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            className="btn btn-danger"
            onClick={() => setShowWipeConfirm(true)}
          >
            🗑️ Wipe All Store &amp; Cloud Data Cleanly
          </motion.button>
        </div>

        {showWipeConfirm && (
          <ConfirmModal
            title="Wipe All Application Data"
            message="Are you sure you want to PERMANENTLY WIPE all customers, bills, and history data from both Local and Firebase Cloud? This action CANNOT be undone!"
            confirmText="Permanently Wipe Data"
            onConfirm={async () => {
              setShowWipeConfirm(false)
              await clearAllStoreData(user?.id)
              toast('All application data cleared cleanly!', 'error')
            }}
            onCancel={() => setShowWipeConfirm(false)}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="btn btn-primary btn-lg"
          >
            <Save size={16} /> Save All Preferences
          </motion.button>
        </div>
      </form>
    </div>
  )
}

