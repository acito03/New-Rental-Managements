import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  const adminId = (session.user as any).id
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { notes } = await req.json().catch(() => ({ notes: '' }))

  const request = await prisma.request.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.status !== 'PENDING') return NextResponse.json({ error: 'Request already processed' }, { status: 400 })

  const updated = await prisma.request.update({
    where: { id: params.id },
    data: {
      status: 'REJECTED',
      reviewedBy: adminId,
      reviewedAt: new Date(),
      notes: notes || request.notes,
    },
  })
  return NextResponse.json(updated)
}
