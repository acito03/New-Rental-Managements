import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const transactionSchema = z.object({
  clientName: z.string().min(1),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    inventoryId: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    quantity: z.number().default(1),
  })).min(1),
})

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
      admin: { select: { id: true, name: true } },
      request: { select: { id: true, user: { select: { name: true } } } },
      items: {
        include: { inventory: { include: { brandType: true } } },
      },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(transactions)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  const adminId = (session.user as any).id
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const validation = transactionSchema.safeParse(body)
  if (!validation.success) return NextResponse.json({ error: validation.error.flatten() }, { status: 400 })

  const { clientName, purpose, notes, items } = validation.data
  const now = new Date()

  const transaction = await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.create({
      data: {
        adminId,
        clientName,
        purpose,
        notes,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        items: {
          create: items.map(item => ({
            inventoryId: item.inventoryId,
            startDate: new Date(item.startDate),
            endDate: new Date(item.endDate),
            quantity: item.quantity,
          })),
        },
      },
      include: { items: { include: { inventory: { include: { brandType: true } } } } },
    })
    // Set inventory to OUT
    await Promise.all(
      items.map(item =>
        tx.inventory.update({ where: { id: item.inventoryId }, data: { status: 'OUT' } })
      )
    )
    return t
  })

  return NextResponse.json(transaction, { status: 201 })
}
