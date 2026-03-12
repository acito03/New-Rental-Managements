import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Download CSV template
export async function GET() {
  const csv = `brand,type,modelVariant,serialNumber,shortDescription,status
Sony,Camera,Alpha 7 IV,SNY-001,Full-frame mirrorless camera,OK
Canon,Camera,EOS R5,CNX-001,Professional mirrorless camera,OK
DJI,Drone,Mavic 3 Pro,DJI-001,Professional cinema drone,OK
Rode,Audio,VideoMic Pro+,,Directional shotgun microphone,OK`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="inventory-template.csv"',
    },
  })
}

// POST: Import CSV
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const text = await file.text()
  const lines = text.split('\n').filter(l => l.trim())
  const headers = lines[0].split(',').map(h => h.trim())
  
  const results = { success: 0, errors: [] as string[] }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })

    const { brand, type, modelVariant, serialNumber, shortDescription, status } = row

    if (!brand || !type || !modelVariant) {
      results.errors.push(`Row ${i + 1}: Missing required fields (brand, type, modelVariant)`)
      continue
    }

    const validStatuses = ['OK', 'MAINTENANCE', 'OUT']
    const itemStatus = validStatuses.includes(status?.toUpperCase()) ? status.toUpperCase() as 'OK' | 'MAINTENANCE' | 'OUT' : 'OK'

    try {
      // Find or create brand/type
      const brandType = await prisma.brandType.upsert({
        where: { brand_type: { brand, type } },
        update: {},
        create: { brand, type },
      })

      await prisma.inventory.create({
        data: {
          brandTypeId: brandType.id,
          modelVariant,
          serialNumber: serialNumber || undefined,
          shortDescription: shortDescription || undefined,
          status: itemStatus,
        },
      })
      results.success++
    } catch (err) {
      results.errors.push(`Row ${i + 1}: ${String(err)}`)
    }
  }

  return NextResponse.json(results)
}
