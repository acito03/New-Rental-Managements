import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const request = await prisma.request.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true } },
      items: { include: { inventory: { include: { brandType: true } } } },
    },
  })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF()

  // Header
  doc.setFillColor(79, 70, 229)
  doc.rect(0, 0, 210, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('RENTAL REQUEST FORM', 105, 18, { align: 'center' })
  doc.setFontSize(10)
  doc.text('Professional Rental Management System', 105, 27, { align: 'center' })

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)

  const startY = 45
  doc.setFont('helvetica', 'bold')
  doc.text('Request Information', 14, startY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const statusColors: Record<string, [number,number,number]> = {
    PENDING: [234, 179, 8],
    APPROVED: [34, 197, 94],
    REJECTED: [239, 68, 68],
  }

  const details = [
    ['Request No:', `REQ-${request.id.slice(-8).toUpperCase()}`],
    ['Requested By:', request.user.name],
    ['Client Name:', request.clientName],
    ['Purpose:', request.purpose || '-'],
    ['Status:', request.status],
    ['Date:', formatDate(request.createdAt)],
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
    head: [['No', 'Brand / Type', 'Model / Variant', 'Serial No', 'Start Date', 'End Date']],
    body: request.items.map((item, idx) => [
      idx + 1,
      `${item.inventory.brandType.brand} - ${item.inventory.brandType.type}`,
      item.inventory.modelVariant,
      item.inventory.serialNumber || '-',
      formatDate(item.startDate),
      formatDate(item.endDate),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [245, 245, 255] },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 20

  if (request.notes) {
    doc.setFontSize(9)
    doc.text(`Notes: ${request.notes}`, 14, finalY)
  }

  // Signature
  doc.setFontSize(10)
  const sigY = finalY + (request.notes ? 15 : 0)
  doc.text('Requested By:', 14, sigY)
  doc.line(14, sigY + 15, 80, sigY + 15)
  doc.text(request.user.name, 14, sigY + 20)

  doc.text('Approved By:', 120, sigY)
  doc.line(120, sigY + 15, 196, sigY + 15)
  doc.text('(Admin Signature)', 120, sigY + 20)

  const pdfBuffer = doc.output('arraybuffer')
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="request-form-${request.id.slice(-8)}.pdf"`,
    },
  })
}
