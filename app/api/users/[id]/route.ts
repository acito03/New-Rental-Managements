import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const authRole = (session.user as any).role
  if (authRole !== 'SUPER_ADMIN' && authRole !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const validation = updateSchema.safeParse(body)
  if (!validation.success) return NextResponse.json({ error: validation.error.flatten() }, { status: 400 })

  const data: Record<string, unknown> = { ...validation.data }
  if (data.password) {
    data.password = await bcrypt.hash(data.password as string, 12)
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const authRole = (session.user as any).role
  if (authRole !== 'SUPER_ADMIN' && authRole !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const targetUser = await prisma.user.findUnique({ where: { id: params.id } })
  if (targetUser?.role === 'SUPER_ADMIN') return NextResponse.json({ error: 'Cannot delete Super Admin' }, { status: 403 })

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
