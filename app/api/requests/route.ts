import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const requestSchema = z.object({
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
  const role = (session.user as any).role
  const userId = (session.user as any).id

  const where = role === 'USER' ? { userId } : {}

  const requests = await prisma.request.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { include: { inventory: { include: { brandType: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(requests)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const body = await req.json()
  const validation = requestSchema.safeParse(body)
  if (!validation.success) return NextResponse.json({ error: validation.error.flatten() }, { status: 400 })

  const { clientName, purpose, notes, items } = validation.data

  const request = await prisma.request.create({
    data: {
      userId,
      clientName,
      purpose,
      notes,
      items: {
        create: items.map(item => ({
          inventoryId: item.inventoryId,
          startDate: new Date(item.startDate),
          endDate: new Date(item.endDate),
          quantity: item.quantity,
        })),
      },
    },
    include: {
      items: { include: { inventory: { include: { brandType: true } } } },
    },
  })
  return NextResponse.json(request, { status: 201 })
}
