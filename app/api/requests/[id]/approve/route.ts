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

  const request = await prisma.request.findUnique({
    where: { id: params.id },
    include: { items: true },
  })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.status !== 'PENDING') return NextResponse.json({ error: 'Request already processed' }, { status: 400 })

  const now = new Date()

  // Create transaction from request
  const transaction = await prisma.$transaction(async (tx) => {
    // Update request status
    await tx.request.update({
      where: { id: params.id },
      data: { status: 'APPROVED', reviewedBy: adminId, reviewedAt: now },
    })

    // Create transaction
    const t = await tx.transaction.create({
      data: {
        requestId: params.id,
        adminId,
        clientName: request.clientName,
        purpose: request.purpose,
        notes: request.notes,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        items: {
          create: request.items.map(item => ({
            inventoryId: item.inventoryId,
            startDate: item.startDate,
            endDate: item.endDate,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    })

    // Update inventory status to OUT
    await Promise.all(
      request.items.map(item =>
        tx.inventory.update({
          where: { id: item.inventoryId },
          data: { status: 'OUT' },
        })
      )
    )

    return t
  })

  return NextResponse.json(transaction)
}
