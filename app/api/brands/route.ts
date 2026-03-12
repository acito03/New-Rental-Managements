import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const brandSchema = z.object({
  brand: z.string().min(1),
  type: z.string().min(1),
})

export async function GET() {
  const brands = await prisma.brandType.findMany({
    include: { _count: { select: { inventory: true } } },
    orderBy: [{ brand: 'asc' }, { type: 'asc' }],
  })
  return NextResponse.json(brands)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const validation = brandSchema.safeParse(body)
  if (!validation.success) return NextResponse.json({ error: validation.error.flatten() }, { status: 400 })

  const brand = await prisma.brandType.create({ data: validation.data })
  return NextResponse.json(brand, { status: 201 })
}
