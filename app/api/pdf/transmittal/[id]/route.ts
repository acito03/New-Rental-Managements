import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const transaction = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: {
      admin: { select: { name: true, email: true } },
      request: { include: { user: { select: { name: true } } } },
      items: { include: { inventory: { include: { brandType: true } } } },
    },
  })
  if (!transaction) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Generate PDF using jsPDF
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF()

  // Header
  doc.setFillColor(30, 58, 138)
  doc.rect(0, 0, 210, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('RENTAL TRANSMITTAL', 105, 18, { align: 'center' })
  doc.setFontSize(10)
  doc.text('Professional Rental Management System', 105, 27, { align: 'center' })

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)

  // Info section
  const startY = 45
  doc.setFont('helvetica', 'bold')
  doc.text('Transaction Details', 14, startY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const details = [
    ['Transaction No:', `TXN-${transaction.id.slice(-8).toUpperCase()}`],
    ['Client Name:', transaction.clientName],
    ['Purpose:', transaction.purpose || '-'],
    ['Processed By:', transaction.admin.name],
    ['Date:', formatDate(transaction.createdAt)],
    ['Period:', `${transaction.month}/${transaction.year}`],
  ]

  details.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, 14, startY + 10 + (i * 7))
    doc.setFont('helvetica', 'normal')
    doc.text(value, 70, startY + 10 + (i * 7))
  })

  // Items table
  autoTable(doc, {
    startY: startY + 60,
    head: [['No', 'Brand / Type', 'Model / Variant', 'Serial No', 'Rental Period', 'Status']],
    body: transaction.items.map((item, idx) => [
      idx + 1,
      `${item.inventory.brandType.brand} - ${item.inventory.brandType.type}`,
      item.inventory.modelVariant,
      item.inventory.serialNumber || '-',
      `${formatDate(item.startDate)} → ${formatDate(item.endDate)}`,
      item.returned ? 'Returned' : 'Active',
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 58, 138] },
    alternateRowStyles: { fillColor: [245, 247, 255] },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 20

  // Signature section
  doc.setFontSize(10)
  doc.text('Prepared By:', 14, finalY)
  doc.line(14, finalY + 15, 80, finalY + 15)
  doc.text(transaction.admin.name, 14, finalY + 20)
  doc.text('Authorized Signature', 14, finalY + 25)

  doc.text('Received By:', 120, finalY)
  doc.line(120, finalY + 15, 196, finalY + 15)
  doc.text(transaction.clientName, 120, finalY + 20)
  doc.text('Client Signature', 120, finalY + 25)

  if (transaction.notes) {
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Notes: ${transaction.notes}`, 14, finalY + 40)
  }

  const pdfBuffer = doc.output('arraybuffer')
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="transmittal-${transaction.id.slice(-8)}.pdf"`,
    },
  })
}
