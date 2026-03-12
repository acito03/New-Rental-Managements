import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const inventorySchema = z.object({
  brandTypeId: z.string(),
  modelVariant: z.string().min(1),
  serialNumber: z.string().optional(),
  shortDescription: z.string().optional(),
  status: z.enum(['OK', 'MAINTENANCE', 'OUT']).default('OK'),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const brandTypeId = searchParams.get('brandTypeId')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (brandTypeId) where.brandTypeId = brandTypeId

  const items = await prisma.inventory.findMany({
    where,
    include: { brandType: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const validation = inventorySchema.safeParse(body)
  if (!validation.success) return NextResponse.json({ error: validation.error.flatten() }, { status: 400 })

  const item = await prisma.inventory.create({
    data: validation.data,
    include: { brandType: true },
  })
  return NextResponse.json(item, { status: 201 })
}
