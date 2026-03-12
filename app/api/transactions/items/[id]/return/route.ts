import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // params.id = transactionItemId
  const transactionItem = await prisma.transactionItem.findUnique({
    where: { id: params.id },
  })
  if (!transactionItem) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (transactionItem.returned) return NextResponse.json({ error: 'Already returned' }, { status: 400 })

  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // Mark item as returned
    await tx.transactionItem.update({
      where: { id: params.id },
      data: { returned: true, returnDate: now },
    })

    // Update inventory status back to OK
    await tx.inventory.update({
      where: { id: transactionItem.inventoryId },
      data: { status: 'OK' },
    })
  })

  return NextResponse.json({ success: true, returnDate: now })
}
