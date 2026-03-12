import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMonthName } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  const where: Record<string, unknown> = {}
  if (month) where.month = parseInt(month)
  if (year) where.year = parseInt(year)

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      admin: { select: { name: true } },
      items: { include: { inventory: { include: { brandType: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Build CSV
  const rows = ['Transaction ID,Client Name,Purpose,Brand,Type,Model,Serial No,Start Date,End Date,Returned,Return Date,Month,Year,Processed By']

  for (const t of transactions) {
    for (const item of t.items) {
      rows.push([
        `TXN-${t.id.slice(-8).toUpperCase()}`,
        `"${t.clientName}"`,
        `"${t.purpose || ''}"`,
        item.inventory.brandType.brand,
        item.inventory.brandType.type,
        `"${item.inventory.modelVariant}"`,
        item.inventory.serialNumber || '',
        new Date(item.startDate).toLocaleDateString(),
        new Date(item.endDate).toLocaleDateString(),
        item.returned ? 'Yes' : 'No',
        item.returnDate ? new Date(item.returnDate).toLocaleDateString() : '',
        getMonthName(t.month),
        t.year,
        `"${t.admin.name}"`,
      ].join(','))
    }
  }

  const csv = rows.join('\n')
  const monthLabel = month ? getMonthName(parseInt(month)) : 'All'
  const yearLabel = year || 'All'

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="transactions-${monthLabel}-${yearLabel}.csv"`,
    },
  })
}
