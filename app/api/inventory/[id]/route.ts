import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  brandTypeId: z.string().optional(),
  modelVariant: z.string().min(1).optional(),
  serialNumber: z.string().optional().nullable(),
  shortDescription: z.string().optional(),
  status: z.enum(['OK', 'MAINTENANCE', 'OUT']).optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const item = await prisma.inventory.findUnique({
    where: { id: params.id },
    include: { brandType: true },
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const validation = updateSchema.safeParse(body)
  if (!validation.success) return NextResponse.json({ error: validation.error.flatten() }, { status: 400 })

  const item = await prisma.inventory.update({
    where: { id: params.id },
    data: validation.data,
    include: { brandType: true },
  })
  return NextResponse.json(item)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.inventory.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
