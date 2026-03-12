'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Package,
  Tags,
  ClipboardList,
  ArrowLeftRight,
  Users,
  LogOut,
  ChevronRight,
  Box,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { href: '/inventory', label: 'Inventory', icon: Package, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { href: '/brands', label: 'Brand / Type', icon: Tags, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { href: '/requests', label: 'Requests', icon: ClipboardList, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { href: '/users', label: 'User Management', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN'] },
]

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'text-purple-400 bg-purple-400/10',
  ADMIN: 'text-blue-400 bg-blue-400/10',
  USER: 'text-green-400 bg-green-400/10',
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  USER: 'User',
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role as string

  const filteredNav = navItems.filter((item) => item.roles.includes(userRole))

  return (
    <aside className="flex flex-col h-screen w-[var(--sidebar-width)] bg-card border-r border-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 border border-primary/20">
          <Box className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-bold text-sm text-foreground">Rental-Sys</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary-foreground' : '')} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="px-3 py-4 border-t border-border space-y-2">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary border border-border text-xs font-semibold shrink-0">
            {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session?.user?.name}</p>
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', roleColors[userRole] || 'text-muted-foreground bg-muted')}>
              {roleLabels[userRole] || userRole}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
