import { fmt, fmtDate } from './helpers'
import { generateBillPDF } from './pdfGenerator'

export interface WhatsAppBillData {
  bill_number: string
  bill_date: string
  customer_name: string
  customer_phone?: string
  grand_total: number
  amount_paid: number
  remaining_due: number
  payment_method?: string
  notes?: string
}

export function formatIndianPhoneNumber(phone: string): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return '91' + digits
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits
  }
  return digits
}

export function generateWhatsAppInvoiceMessage(
  bill: WhatsAppBillData,
  items: any[] = [],
  settings: Record<string, string> = {}
): string {
  const shopName = settings.shop_name || 'R.K. Jewellers'
  const shopAddress = settings.shop_address || 'Fatehabad, Haryana - 125050'
  const shopPhone = settings.shop_phone || '+91 9896103609'
  const upiId = settings.shop_bank_ifsc || settings.shop_upi || ''
  const customerName = bill.customer_name || 'Valued Customer'

  let msg = `✨ *${shopName.toUpperCase()}* ✨\n`
  if (shopAddress) msg += `📍 ${shopAddress}\n`
  if (shopPhone) msg += `📞 Contact: ${shopPhone}\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `🙏 *Thank you for shopping with us!*\n\n`
  msg += `Dear *${customerName}*,\n`
  msg += `Here is your digital invoice summary:\n\n`
  msg += `🧾 *Invoice No:* #${bill.bill_number}\n`
  msg += `📅 *Date:* ${fmtDate(bill.bill_date)}\n`

  if (items && items.length > 0) {
    msg += `\n📦 *Items Purchased:*\n`
    items.forEach((it, idx) => {
      const weight = it.weight ? ` (${it.weight}g ${it.purity || '22K'})` : ''
      const lineTotal = it.line_total || (parseFloat(it.rate) * parseFloat(it.weight || 1) + (parseFloat(it.making_charges) || 0))
      msg += `${idx + 1}. *${it.item_name || 'Jewellery Item'}*${weight} - ${fmt(lineTotal)}\n`
    })
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `💰 *Grand Total:* ${fmt(bill.grand_total)}\n`
  msg += `💳 *Amount Paid:* ${fmt(bill.amount_paid)} [${(bill.payment_method || 'CASH').toUpperCase()}]\n`
  
  if (bill.remaining_due > 0) {
    msg += `⚠️ *Balance Due:* ${fmt(bill.remaining_due)}\n`
    if (upiId) {
      const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${bill.remaining_due}&cu=INR`
      msg += `\n📲 *Pay Remaining Due via UPI:* \n${upiLink}\n`
    }
  } else {
    msg += `✅ *Payment Status:* FULLY PAID\n`
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `📄 *PDF Invoice:* Your official GST tax invoice has been generated.\n`
  msg += `✨ *We look forward to serving you again!*`

  return msg
}

export function sendWhatsAppInvoice(
  bill: WhatsAppBillData,
  items: any[] = [],
  settings: Record<string, string> = {}
): boolean {
  // Automatically generate and download the PDF file onto the device
  try {
    downloadAndSharePDF(bill, items, settings)
  } catch (e) {
    console.warn('Auto PDF generation on send:', e)
  }

  const phone = bill.customer_phone || ''
  const cleanPhone = formatIndianPhoneNumber(phone)
  const message = generateWhatsAppInvoiceMessage(bill, items, settings)
  const encodedText = encodeURIComponent(message)

  let whatsappUrl = ''
  if (cleanPhone) {
    whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
  } else {
    whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`
  }

  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank')
    return true
  }
  return false
}

export function downloadAndSharePDF(
  bill: any,
  items: any[] = [],
  settings: Record<string, string> = {}
) {
  try {
    generateBillPDF(bill, items, settings)
  } catch (err) {
    console.error('Failed to generate PDF:', err)
  }
}
