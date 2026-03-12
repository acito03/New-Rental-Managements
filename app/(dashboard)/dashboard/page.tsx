import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Package, ArrowUpRight, Wrench, ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardCalendar } from '@/components/dashboard/DashboardCalendar'

async function getStats(userId: string, role: string) {
  const [totalItems, outItems, maintenanceItems, pendingRequests] = await Promise.all([
    prisma.inventory.count(),
    prisma.inventory.count({ where: { status: 'OUT' } }),
    prisma.inventory.count({ where: { status: 'MAINTENANCE' } }),
    prisma.request.count({
      where: role === 'USER' ? { status: 'PENDING', userId } : { status: 'PENDING' },
    }),
  ])
  return { totalItems, outItems, maintenanceItems, pendingRequests }
}

async function getCalendarEvents() {
  const transactions = await prisma.transaction.findMany({
    include: {
      items: {
        include: { inventory: { include: { brandType: true } } },
      },
    },
    where: {
      items: { some: { returned: false } },
    },
    take: 100,
  })

  return transactions.flatMap((t) =>
    t.items
      .filter((i) => !i.returned)
      .map((i) => ({
        id: i.id,
        title: `${t.clientName} - ${i.inventory.brandType.brand} ${i.inventory.modelVariant}`,
        start: i.startDate.toISOString().split('T')[0],
        end: i.endDate.toISOString().split('T')[0],
        color: '#3b82f6',
      }))
  )
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  const role = (session?.user as any)?.role

  const [stats, events] = await Promise.all([
    getStats(userId, role),
    getCalendarEvents(),
  ])

  const statCards = [
    { title: 'Total Items', value: stats.totalItems, icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { title: 'Items Out', value: stats.outItems, icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-400/10' },
    { title: 'Maintenance', value: stats.maintenanceItems, icon: Wrench, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { title: 'Pending Requests', value: stats.pendingRequests, icon: ClipboardList, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back, {session?.user?.name}. Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="stat-card-gradient border-border/60 hover:border-primary/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Rental Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardCalendar events={events} />
        </CardContent>
      </Card>
    </div>
  )
}
