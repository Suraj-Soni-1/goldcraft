import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoImg from '../assets/logo.png'

// Helper to convert numbers to Indian Rupees in words
function numberToWords(amount: number): string {
  if (amount === 0) return 'Rupees Zero Only'
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  function convertLessThanThousand(num: number): string {
    if (num === 0) return ''
    if (num < 20) return ones[num] + ' '
    const hundred = Math.floor(num / 100)
    const rem = num % 100
    let str = ''
    if (hundred > 0) {
      str += ones[hundred] + ' Hundred '
    }
    if (rem > 0) {
      if (rem < 20) {
        str += ones[rem] + ' '
      } else {
        str += tens[Math.floor(rem / 10)] + ' ' + ones[rem % 10] + ' '
      }
    }
    return str
  }

  let words = ''
  let num = Math.floor(amount)
  const paise = Math.round((amount - num) * 100)

  if (num >= 10000000) {
    const crore = Math.floor(num / 10000000)
    words += convertLessThanThousand(crore) + 'Crore '
    num %= 10000000
  }
  if (num >= 100000) {
    const lakh = Math.floor(num / 100000)
    words += convertLessThanThousand(lakh) + 'Lakh '
    num %= 100000
  }
  if (num >= 1000) {
    const thousand = Math.floor(num / 1000)
    words += convertLessThanThousand(thousand) + 'Thousand '
    num %= 1000
  }
  if (num > 0) {
    words += convertLessThanThousand(num)
  }

  let result = 'Rupees ' + words.trim()
  if (paise > 0) {
    let paiseWords = ''
    if (paise < 20) {
      paiseWords = ones[paise]
    } else {
      paiseWords = tens[Math.floor(paise / 10)] + ' ' + ones[paise % 10]
    }
    result += ' and ' + paiseWords.trim() + ' Paise'
  }
  result += ' Only'
  return result
}

export function generateBillPDF(bill: any, items: any[], settings: Record<string, string>) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // Format currency in standard Rs. format to avoid Unicode font corruption
  const fmt = (n: number) => 'Rs. ' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // --- 1. Page Bounds & Double Border ---
  doc.setLineWidth(0.15)
  doc.setDrawColor(0, 0, 0)
  // Outer frame border
  doc.rect(7, 7, W - 14, H - 14)
  // Innermost accent line (offset by 0.5mm)
  doc.rect(7.5, 7.5, W - 15, H - 15)

  // --- 2. Top Header Row ---
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  doc.text('Page No. 1 of 1', 10, 11.5)
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text('TAX INVOICE', W / 2, 11.5, { align: 'center' })
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Original Copy', W - 10, 11.5, { align: 'right' })

  // Divider line below header row
  doc.line(7, 13, W - 7, 13)

  // --- 3. Shop Logo & Brand Info Box ---
  // Draw left logo square box
  doc.rect(7, 13, 24, 25)

  // Draw official emblem logo in logo box
  try {
    doc.addImage(logoImg, 'PNG', 7.5, 13.5, 23, 24)
  } catch (err) {
    doc.setFillColor(40, 40, 40)
    doc.rect(11, 28, 16, 1.5, 'F')
    doc.triangle(11, 28, 11, 20, 15, 28, 'F')
    doc.triangle(15, 28, 19, 17, 23, 28, 'F')
    doc.triangle(23, 28, 27, 20, 27, 28, 'F')
  }

  // Centered Shop Details in Header
  const brandCenterX = (31 + (W - 7)) / 2
  doc.setFont('times', 'bold')
  doc.setFontSize(16.5)
  doc.setTextColor(0, 0, 0)
  doc.text(settings.shop_name || 'GoldCraft Jewellers', brandCenterX, 19.5, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(settings.shop_address || '', brandCenterX, 24.5, { align: 'center' })
  
  const phoneEmail = `Mobile: ${settings.shop_phone || ''}  |  Email: ${settings.shop_email || ''}`
  doc.text(phoneEmail, brandCenterX, 29, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(`GSTIN - ${settings.shop_gst || ''}`, brandCenterX, 34.5, { align: 'center' })

  // Bottom of Header Box line
  doc.line(7, 38, W - 7, 38)

  // --- 4. Invoice Metadata & Material Rates Box ---
  // Draw vertical separator
  doc.line(W / 2, 38, W / 2, 63)

  // Left Column: Invoice Info
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Invoice Number', 10, 42.5)
  doc.text('Invoice Date', 10, 46.5)
  doc.text('Due Date', 10, 50.5)
  doc.text('Place of Supply', 10, 54.5)

  doc.setFont('helvetica', 'normal')
  doc.text(`:  ${bill.bill_number}`, 38, 42.5)
  doc.text(`:  ${new Date(bill.bill_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 38, 46.5)
  doc.text(`:  ${new Date(bill.bill_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 38, 50.5)
  doc.text(`:  ${settings.shop_address?.split(',').pop()?.trim() || 'Maharashtra'}`, 38, 54.5)

  // Right Column: Metal Rates
  doc.setFont('helvetica', 'bold')
  doc.text('Supply Gold 24K', W / 2 + 3, 42.5)
  doc.text('Supply Gold 22K', W / 2 + 3, 46.5)
  doc.text('Supply Silver', W / 2 + 3, 50.5)

  doc.setFont('helvetica', 'normal')
  doc.text(`:  ${fmt(bill.gold_rate_24k)} per gram`, W / 2 + 33, 42.5)
  doc.text(`:  ${fmt(bill.gold_rate_22k)} per gram`, W / 2 + 33, 46.5)
  doc.text(`:  ${fmt(bill.silver_rate)} per Kg`, W / 2 + 33, 50.5)

  // Bottom of Metadata Box line
  doc.line(7, 63, W - 7, 63)

  // --- 5. Billing Details & Shipping Details Box ---
  // Draw vertical separator
  doc.line(W / 2, 63, W / 2, 88)

  // Left Column: Billing Details
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('Billing Details', 10, 67.5)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Name      :  ${bill.customer_name || '—'}`, 10, 72)
  doc.text(`GSTIN     :  ${bill.customer_gst || '—'}`, 10, 76)
  doc.text(`Mobile    :  ${bill.customer_phone || '—'}`, 10, 80)
  doc.text(`Address   :  ${bill.customer_address || '—'}`, 10, 84)

  // Right Column: Shipping Details
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('Shipping Details', W / 2 + 3, 67.5)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Name      :  ${bill.customer_name || '—'}`, W / 2 + 3, 72)
  doc.text(`GSTIN     :  ${bill.customer_gst || '—'}`, W / 2 + 3, 76)
  doc.text(`Mobile    :  ${bill.customer_phone || '—'}`, W / 2 + 3, 80)
  doc.text(`Address   :  ${bill.customer_address || '—'}`, W / 2 + 3, 84)

  // Bottom of Billing/Shipping Box line
  doc.line(7, 88, W - 7, 88)

  // --- 6. Items Grid Table ---
  autoTable(doc, {
    startY: 88,
    margin: { left: 7, right: 7 },
    head: [['Sr.', 'Item Description', 'Weight (g)', 'Rate / g', 'Making Charges', 'Qty', 'Amount']],
    body: items.map((item: any, i: number) => [
      i + 1,
      `${item.item_name} (${item.category}, ${item.purity})`,
      `${(item.weight || 0).toFixed(3)} g`,
      fmt(item.rate),
      fmt(item.making_charges),
      item.qty,
      fmt(item.line_total)
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      lineWidth: 0.15,
      lineColor: [0, 0, 0]
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 7.5,
      lineWidth: 0.15,
      lineColor: [0, 0, 0]
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      font: 'helvetica',
      cellPadding: 1.8,
      lineColor: [0, 0, 0],
      lineWidth: 0.15
    }
  })

  // Get coordinate of where the table finished
  const finalY = (doc as any).lastAutoTable.finalY

  // --- 7. Grand Settlement & Amount-in-Words Box ---
  // Draw summary details box
  doc.rect(7, finalY + 4, W - 14, 18)
  
  // Amount in words
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  const amtInWords = numberToWords(bill.grand_total)
  doc.text(amtInWords, 9, finalY + 9)

  // Payment Settlement line
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  const paySettlement = `Settled by - ${bill.payment_method?.toUpperCase() || 'CASH'}: ${fmt(bill.amount_paid)}  |  Remaining Balance Due: ${fmt(bill.remaining_due)}`
  doc.text(paySettlement, 9, finalY + 13.5)

  // Tax and discount summary breakdown
  const taxVal = (bill.cgst || 0) + (bill.sgst || 0) + (bill.igst || 0)
  const taxBreakdown = `Subtotal: ${fmt(bill.subtotal)}  |  CGST: ${fmt(bill.cgst)}  |  SGST: ${fmt(bill.sgst)}  |  Discount: ${fmt(bill.discount)}  |  Grand Total: ${fmt(bill.grand_total)}`
  doc.text(taxBreakdown, 9, finalY + 18)


  // --- 8. Bottom Footer: Terms, QR Code, Bank Account, Signature Grid ---
  // Anchor footer area precisely at the bottom of the page
  const footerTopY = 228
  
  // Outer divider lines
  doc.line(7, footerTopY, W - 7, footerTopY)
  doc.line(7, 285, W - 7, 285)
  
  // Vertical column dividers
  doc.line(73, footerTopY, 73, 285)
  doc.line(138, footerTopY, 138, 285)

  // --- Column 1: Terms & Conditions ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Terms and Conditions', 9, footerTopY + 4.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  const termsStr = settings.shop_terms || "E & O.E\n1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is late.\n3. Subject to local jurisdiction."
  const termsLines = termsStr.split('\n')
  let currentTermsY = footerTopY + 8.5
  termsLines.forEach((line: string) => {
    if (currentTermsY < 283) {
      doc.text(line, 9, currentTermsY)
      currentTermsY += 4.2
    }
  })

  // --- Column 2: Payment QR & Bank Account Info ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Payment Info', 75, footerTopY + 4.5)

  // Draw dynamic high-fidelity vector QR Code visual
  const qrX = 75
  const qrY = footerTopY + 7
  doc.setLineWidth(0.15)
  doc.rect(qrX, qrY, 18, 18) // main boundary
  
  // Position markers
  doc.rect(qrX + 0.8, qrY + 0.8, 5, 5, 'F')
  doc.setFillColor(255, 255, 255)
  doc.rect(qrX + 1.8, qrY + 1.8, 3, 3, 'F')
  doc.setFillColor(0, 0, 0)
  doc.rect(qrX + 2.3, qrY + 2.3, 2, 2, 'F')

  doc.rect(qrX + 12.2, qrY + 0.8, 5, 5, 'F')
  doc.setFillColor(255, 255, 255)
  doc.rect(qrX + 13.2, qrY + 1.8, 3, 3, 'F')
  doc.setFillColor(0, 0, 0)
  doc.rect(qrX + 13.7, qrY + 2.3, 2, 2, 'F')

  doc.rect(qrX + 0.8, qrY + 12.2, 5, 5, 'F')
  doc.setFillColor(255, 255, 255)
  doc.rect(qrX + 1.8, qrY + 13.2, 3, 3, 'F')
  doc.setFillColor(0, 0, 0)
  doc.rect(qrX + 2.3, qrY + 13.7, 2, 2, 'F')

  // Random pixel grid filler details for realistic appearance
  doc.rect(qrX + 7, qrY + 2, 1.5, 1, 'F')
  doc.rect(qrX + 9, qrY + 4, 1, 2, 'F')
  doc.rect(qrX + 7.5, qrY + 8, 2, 2, 'F')
  doc.rect(qrX + 11.5, qrY + 9, 2, 1, 'F')
  doc.rect(qrX + 13.5, qrY + 11.5, 1.2, 2, 'F')
  doc.rect(qrX + 1.5, qrY + 8.5, 1, 1, 'F')
  doc.rect(qrX + 3.5, qrY + 10, 2, 1, 'F')
  doc.rect(qrX + 7.5, qrY + 13, 1, 3, 'F')
  doc.rect(qrX + 10, qrY + 15, 3, 1, 'F')

  // Bank Info labels next to QR code
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  const bankX = 95
  doc.text(`Bank: ${settings.shop_bank_name || 'ICICI Bank'}`, bankX, footerTopY + 9.5)
  doc.text(`A/C : ${settings.shop_bank_ac || '123456789'}`, bankX, footerTopY + 13.5)
  doc.text(`IFSC: ${settings.shop_bank_ifsc || 'ICIC1122'}`, bankX, footerTopY + 17.5)
  doc.text(`Branch: ${settings.shop_bank_branch || 'Noida'}`, bankX, footerTopY + 21.5)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(`Holder: ${settings.shop_bank_holder || settings.shop_name || 'Add Name'}`, 75, footerTopY + 26.5)

  // --- Column 3: Signature Block ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(`For ${settings.shop_name || 'GoldCraft Jewellers'}`, 141, footerTopY + 4.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Authorized Signature', 170, 281.5, { align: 'center' })
  // Signature line
  doc.line(142, 276, 198, 276)

  // --- 9. Brand Tag Footer ---
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(110, 110, 110)
  doc.text('Invoice generated by GoldCraft Goldsmith Billing Software', W / 2, 291, { align: 'center' })

  // --- Save file ---
  doc.save(`Bill-${bill.bill_number}.pdf`)
}
