import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  clientName: z.string().min(1).optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    inventoryId: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    quantity: z.number().default(1),
  })).optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const request = await prisma.request.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { include: { inventory: { include: { brandType: true } } } },
    },
  })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const role = (session.user as any).role
  const userId = (session.user as any).id
  if (role === 'USER' && request.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(request)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  const userId = (session.user as any).id

  const request = await prisma.request.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (role === 'USER' && (request.userId !== userId || request.status !== 'PENDING')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const validation = updateSchema.safeParse(body)
  if (!validation.success) return NextResponse.json({ error: validation.error.flatten() }, { status: 400 })

  const { items, ...rest } = validation.data

  const updated = await prisma.request.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(items ? {
        items: {
          deleteMany: {},
          create: items.map(item => ({
            inventoryId: item.inventoryId,
            startDate: new Date(item.startDate),
            endDate: new Date(item.endDate),
            quantity: item.quantity,
          })),
        },
      } : {}),
    },
    include: { items: { include: { inventory: { include: { brandType: true } } } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  const userId = (session.user as any).id

  const request = await prisma.request.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (role === 'USER' && (request.userId !== userId || request.status !== 'PENDING')) {
    return NextResponse.json({ error: 'Forbidden - can only delete your own pending requests' }, { status: 403 })
  }

  await prisma.request.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
