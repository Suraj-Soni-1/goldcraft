import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '../../components/Logo'
import { api } from '../../utils/helpers'

interface BillModalProps {
  bill: any
  onSave: (billData: any, items: any[]) => void
  onClose: () => void
}

const EMPTY_ITEM = { item_name: '', category: 'Ring', weight: '', purity: '22K', rate: '', making_charges: '', qty: 1 }
const CATS = ['Ring', 'Necklace', 'Earrings', 'Bracelet', 'Pendant', 'Bangle', 'Chain', 'Other']
const PURS = ['24K', '22K', '18K', 'Silver']

export default function BillModal({ bill, onSave, onClose }: BillModalProps) {
  const [customers, setCustomers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([{ ...EMPTY_ITEM }])
  const [customerDue, setCustomerDue] = useState(0)
  const [latestRates, setLatestRates] = useState<any>(null)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [form, setForm] = useState({
    customer_id: '', bill_date: new Date().toISOString().slice(0, 10),
    gold_rate_22k: '', gold_rate_18k: '', gold_rate_24k: '', silver_rate: '',
    discount: '0', discount_type: 'flat',
    amount_paid: '0', payment_method: 'cash', notes: '', status: 'pending',
    cgst: '0', sgst: '0', igst: '0',
  })

  // Helper to resolve auto rate
  const getAutoRate = (purity: string, ratesObj = latestRates) => {
    if (!ratesObj) return 0
    if (purity === '22K') return ratesObj.gold_22k?.rate || 0
    if (purity === '18K') return ratesObj.gold_18k?.rate || 0
    if (purity === '24K') return ratesObj.gold_24k?.rate || 0
    if (purity === 'Silver') return ratesObj.silver?.rate || 0
    return 0
  }

  useEffect(() => {
    api.getCustomers().then((c: any[]) => setCustomers(c))

    api.getLatestRates().then((r: any) => {
      setLatestRates((prev: any) => ({
        gold_22k: r?.gold_22k || prev?.gold_22k,
        gold_18k: r?.gold_18k || prev?.gold_18k,
        gold_24k: r?.gold_24k || prev?.gold_24k,
        silver: r?.silver || prev?.silver
      }))
    })

    api.fetchLiveRates().then((res: any) => {
      if (res && res.ok) {
        setLatestRates((prev: any) => ({
          gold_22k: prev?.gold_22k || { rate: res.gold22k },
          gold_18k: prev?.gold_18k || { rate: res.gold18k },
          gold_24k: prev?.gold_24k || { rate: res.gold24k },
          silver: prev?.silver || { rate: res.silver }
        }))
      }
    }).catch(() => {})

    if (bill) {
      api.getBill(bill.id).then(({ bill: b, items: its }: any) => {
        setForm({
          customer_id: String(b.customer_id || ''), bill_date: b.bill_date || '',
          gold_rate_22k: String(b.gold_rate_22k || ''), gold_rate_18k: String(b.gold_rate_18k || ''),
          gold_rate_24k: String(b.gold_rate_24k || ''), silver_rate: String(b.silver_rate || ''),
          discount: String(b.discount || 0), discount_type: b.discount_type || 'flat',
          amount_paid: String(b.amount_paid || 0),
          payment_method: b.payment_method || 'cash', notes: b.notes || '', status: b.status || 'pending',
          cgst: String(b.cgst || 0), sgst: String(b.sgst || 0), igst: String(b.igst || 0),
        })
        setCustomerDue(b.previous_due || 0)
        setItems(its.length ? its.map((it: any) => ({ ...it, rate: String(it.rate ?? '') })) : [{ ...EMPTY_ITEM }])
      })
    }
  }, [bill])

  useEffect(() => {
    if (latestRates && items.length === 1 && !items[0].rate && !items[0].weight && !items[0].item_name) {
      const rateVal = getAutoRate('22K')
      if (rateVal) {
        setItems([{ ...EMPTY_ITEM, rate: String(rateVal) }])
      }
    }
  }, [latestRates])

  useEffect(() => {
    if (!form.customer_id || bill) return
    const c = customers.find((x: any) => String(x.id) === form.customer_id)
    setCustomerDue(c ? (c.total_due || 0) : 0)
  }, [form.customer_id, customers])

  const n = (v: any) => parseFloat(v) || 0
  const calcItem = (it: any) => n(it.rate) * n(it.weight) + n(it.making_charges)
  const subtotal = items.reduce((s, it) => s + calcItem(it) * n(it.qty || 1), 0)
  const tax = n(form.cgst) + n(form.sgst) + n(form.igst)
  const disc = form.discount_type === 'pct' ? subtotal * n(form.discount) / 100 : n(form.discount)
  const grand = subtotal + tax - disc + customerDue
  const remaining = grand - n(form.amount_paid)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const setItem = (i: number, k: string, v: any) => setItems(a => a.map((it, j) => j === i ? { ...it, [k]: v } : it))
  const addItem = () => {
    const autoRate = getAutoRate('22K')
    setItems(a => [...a, { ...EMPTY_ITEM, rate: autoRate ? String(autoRate) : '' }])
  }
  const removeItem = (i: number) => setItems(a => a.filter((_, j) => j !== i))
  const r = (v: number) => '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let finalCustomerId = n(form.customer_id)
    if (form.customer_id === 'new') {
      if (!newCustomerName.trim()) {
        alert('Please enter a name for the new customer.')
        return
      }
      const newId = await api.addCustomer({
        name: newCustomerName, phone: newCustomerPhone, total_due: 0,
        email: '', address: '', city: '', gst_number: ''
      })
      finalCustomerId = newId
    }

    onSave({
      customer_id: finalCustomerId, bill_date: form.bill_date,
      gold_rate_22k: getAutoRate('22K'), gold_rate_18k: getAutoRate('18K'),
      gold_rate_24k: getAutoRate('24K'), silver_rate: getAutoRate('Silver'),
      subtotal, cgst: n(form.cgst), sgst: n(form.sgst), igst: n(form.igst),
      discount: n(form.discount), discount_type: form.discount_type,
      previous_due: customerDue, grand_total: grand,
      amount_paid: n(form.amount_paid), remaining_due: remaining,
      payment_method: form.payment_method, notes: form.notes, status: form.status,
    }, items.map(it => ({
      item_name: it.item_name, category: it.category,
      weight: n(it.weight), purity: it.purity, rate: n(it.rate),
      making_charges: n(it.making_charges), stone_charges: 0,
      qty: n(it.qty) || 1, line_total: calcItem(it) * (n(it.qty) || 1),
    })))
  }

  const selCust = customers.find((c: any) => String(c.id) === form.customer_id)

  const content = (
    <motion.div
      className="bill-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bill-dialog"
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bill-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <Logo size={38} glow={true} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="bill-header-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {bill ? 'Edit Invoice' : 'New Billing Workstation'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Auto-calculated metal pricing & VAT/GST
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {selCust && (
              <div className="bill-header-cust-badge" style={{
                background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: 12, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 8
              }}>
                <span style={{ fontSize: 14 }}>👤</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gold-100)' }}>{selCust.name}</span>
                {customerDue > 0 && (
                  <span className="badge badge-red" style={{ marginLeft: 4, padding: '2px 6px', fontSize: 10 }}>Due: {r(customerDue)}</span>
                )}
              </div>
            )}
            <motion.button
              type="button"
              whileHover={{ scale: 1.08, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#ffffff',
                width: 36, height: 36,
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(10px)',
              }}
            >✕</motion.button>
          </div>
        </div>

        {/* Two-panel form */}
        <form onSubmit={handleSubmit} className="bill-body">
          {/* Left Panel */}
          <div className="bill-left">
            <div>
              <div className="bill-section-title">Client Details & Billing Date</div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Select Customer *</label>
                  <select className="bi bi-select" required value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
                    <option value="">— Select Registered Client —</option>
                    <option value="new">[+ Add New Customer Quickly]</option>
                    {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice Date</label>
                  <input type="date" className="bi" value={form.bill_date} onChange={e => set('bill_date', e.target.value)} />
                </div>
              </div>

              {form.customer_id === 'new' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="form-grid-2"
                  style={{
                    marginTop: 12, padding: 14, background: 'rgba(253, 176, 34, 0.05)',
                    border: '1px dashed var(--border-bright)', borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">New Customer Full Name *</label>
                    <input type="text" className="bi" placeholder="e.g. Rahul Sharma" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Mobile Phone</label>
                    <input type="tel" className="bi" placeholder="+91 98765 43210" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Line Items */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="bill-section-title">Jewellery Items & Metal Breakdown</div>

              <div className="bill-items-header" style={{ display: 'flex', gap: 8, marginBottom: 6, padding: '0 10px' }}>
                <div style={{ flex: 2.2, fontSize: 10.5, fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Item Name / Description</div>
                <div style={{ flex: 1.2, fontSize: 10.5, fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Type</div>
                <div style={{ flex: 1, fontSize: 10.5, fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Purity</div>
                <div style={{ flex: 1, fontSize: 10.5, fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Weight (g)</div>
                <div style={{ flex: 1.2, fontSize: 10.5, fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Rate (₹/g)</div>
                <div style={{ flex: 1, fontSize: 10.5, fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Making ₹</div>
                <div style={{ flex: 0.6, fontSize: 10.5, fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Qty</div>
                <div style={{ minWidth: 100, fontSize: 10.5, fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'right' }}>Total</div>
                <div style={{ width: 28 }}></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                <AnimatePresence>
                  {items.map((it, idx) => (
                    <motion.div
                      key={idx}
                      className="bill-item-row"
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    >
                      <div className="bill-item-field">
                        <span className="bill-item-label">Item Name / Description</span>
                        <input className="bi" placeholder="e.g. Gold Necklace 22K" value={it.item_name} onChange={e => setItem(idx, 'item_name', e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div className="bill-item-field" style={{ flex: 1 }}>
                          <span className="bill-item-label">Type</span>
                          <select className="bi bi-select" value={it.category} onChange={e => setItem(idx, 'category', e.target.value)}>
                            {CATS.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="bill-item-field" style={{ flex: 1 }}>
                          <span className="bill-item-label">Purity</span>
                          <select className="bi bi-select" value={it.purity} onChange={e => {
                            const p = e.target.value
                            const autoRate = getAutoRate(p)
                            setItems(a => a.map((item, j) => j === idx ? { ...item, purity: p, rate: autoRate ? String(autoRate) : '' } : item))
                          }}>
                            {PURS.map(p => <option key={p}>{p}</option>)}
                          </select>
                        </div>
                        <div className="bill-item-field" style={{ flex: 1 }}>
                          <span className="bill-item-label">Qty</span>
                          <input type="number" className="bi" placeholder="1" value={it.qty} onChange={e => setItem(idx, 'qty', e.target.value)} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div className="bill-item-field" style={{ flex: 1 }}>
                          <span className="bill-item-label">Weight (g)</span>
                          <input type="number" step="0.001" className="bi" placeholder="0.000" value={it.weight} onChange={e => setItem(idx, 'weight', e.target.value)} />
                        </div>
                        <div className="bill-item-field" style={{ flex: 1 }}>
                          <span className="bill-item-label">Rate (₹/g)</span>
                          <input type="number" step="0.01" className="bi" placeholder="0.00" value={it.rate} onChange={e => setItem(idx, 'rate', e.target.value)} />
                        </div>
                        <div className="bill-item-field" style={{ flex: 1 }}>
                          <span className="bill-item-label">Making (₹)</span>
                          <input type="number" step="0.01" className="bi" placeholder="0.00" value={it.making_charges} onChange={e => setItem(idx, 'making_charges', e.target.value)} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--gold-100)', fontFamily: "'Outfit', sans-serif" }}>
                          Total: {r(calcItem(it) * (n(it.qty) || 1))}
                        </span>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)} className="btn btn-danger btn-sm" style={{ padding: 4, width: 28, height: 28 }}>
                            ✕
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={addItem}
                style={{
                  marginTop: 12, padding: '8px 16px', background: 'rgba(253, 176, 34, 0.08)',
                  border: '1px dashed var(--border-bright)', color: 'var(--gold-200)',
                  borderRadius: 'var(--radius-xs)', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  alignSelf: 'flex-start'
                }}
              >
                + Add Another Line Item
              </motion.button>
            </div>
          </div>

          {/* Right Panel */}
          <div className="bill-right">
            <div>
              <div className="bill-section-title">Applicable Taxes (GST)</div>
              <div className="form-grid-3">
                {([['cgst','CGST'],['sgst','SGST'],['igst','IGST']] as [string,string][]).map(([k,l]) => (
                  <div key={k} className="form-group">
                    <label className="form-label">{l} (₹)</label>
                    <input type="number" step="0.01" className="bi" value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="bill-section-title">Discounts & Payment Status</div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Discount</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="number" step="0.01" className="bi" value={form.discount} onChange={e => set('discount', e.target.value)} />
                    <select className="bi bi-select" style={{ width: 56 }} value={form.discount_type} onChange={e => set('discount_type', e.target.value)}>
                      <option value="flat">₹</option>
                      <option value="pct">%</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount Paid (₹)</label>
                  <input type="number" step="0.01" className="bi" value={form.amount_paid} onChange={e => set('amount_paid', e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="bi bi-select" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                    <option value="cash">💵 Cash</option>
                    <option value="upi">📱 UPI / QR Code</option>
                    <option value="card">💳 Credit/Debit Card</option>
                    <option value="bank_transfer">🏦 Bank Transfer</option>
                    <option value="cheque">📝 Cheque</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="bi bi-select" value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="pending">⏳ Pending</option>
                    <option value="partial">🌗 Partial</option>
                    <option value="paid">✅ Paid Full</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Glowing Summary Box */}
            <div className="bill-summary">
              <div className="bill-section-title" style={{ color: 'var(--gold-300)' }}>Final Summary Breakdown</div>
              {[
                ['Subtotal Items', r(subtotal), 'var(--text-primary)'],
                ['Total Tax Amount', r(tax), 'var(--text-secondary)'],
                ['Total Discount', `− ${r(disc)}`, disc > 0 ? 'var(--green)' : 'var(--text-muted)'],
                ['Previous Client Due', r(customerDue), customerDue > 0 ? 'var(--red)' : 'var(--text-muted)'],
              ].map(([label, val, color]) => (
                <div key={label} className="bill-summary-row">
                  <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>{label}</span>
                  <span style={{ color, fontWeight: 700, fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>{val}</span>
                </div>
              ))}
              <div className="bill-summary-row grand">
                <span style={{ color: 'var(--gold-100)', fontSize: 15 }}>Grand Net Total</span>
                <span style={{ color: 'var(--gold-100)', fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{r(grand)}</span>
              </div>
              <div className="bill-summary-row" style={{ marginTop: 4 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Net Remaining Balance Due</span>
                <span style={{ color: remaining > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 800, fontSize: 15, fontFamily: "'Outfit', sans-serif" }}>{r(remaining)}</span>
              </div>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Additional Billing Notes</label>
              <textarea className="bi" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Enter terms, hallmark certifications, or warranty notes..." style={{ resize: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ flex: 2 }}
              >
                {bill ? '✓ Update Invoice' : '⚡ Save & Issue Invoice'}
              </motion.button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )

  return createPortal(content, document.body)
}
