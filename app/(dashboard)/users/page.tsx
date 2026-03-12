'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'

interface User { id: string; name: string; email: string; role: string; createdAt: string }

const roleConfig: Record<string, { label: string; variant: 'info' | 'warning' | 'danger' | 'success' }> = {
  SUPER_ADMIN: { label: 'Super Admin', variant: 'danger' },
  ADMIN: { label: 'Admin', variant: 'info' },
  USER: { label: 'User', variant: 'success' },
}

export default function UsersPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const currentRole = (session?.user as any)?.role
  const currentUserId = (session?.user as any)?.id

  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' })

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  function openCreate() { setEditUser(null); setForm({ name: '', email: '', password: '', role: 'USER' }); setDialogOpen(true) }
  function openEdit(u: User) { setEditUser(u); setForm({ name: u.name, email: u.email, password: '', role: u.role }); setDialogOpen(true) }

  async function handleSubmit() {
    const url = editUser ? `/api/users/${editUser.id}` : '/api/users'
    const method = editUser ? 'PUT' : 'POST'
    const body = editUser ? { name: form.name, email: form.email, ...(form.password ? { password: form.password } : {}), role: form.role } : form
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      toast({ title: editUser ? 'User updated' : 'User created', variant: 'success' as any })
      setDialogOpen(false)
      fetchUsers()
    } else {
      const err = await res.json()
      toast({ title: 'Error', description: err.error || 'Failed', variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this user?')) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) { toast({ title: 'User deleted', variant: 'success' as any }); fetchUsers() }
    else {
      const err = await res.json()
      toast({ title: 'Error', description: err.error, variant: 'destructive' })
    }
  }

  const canCreateAdmin = currentRole === 'SUPER_ADMIN'
  const availableRoles = canCreateAdmin ? ['USER', 'ADMIN'] : ['USER']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">{users.length} users</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add User</Button>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={user.id} className={`border-b border-border/50 hover:bg-secondary/30 ${idx % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{user.name}</span>
                        {user.id === currentUserId && <Badge variant="outline" className="text-xs">You</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={roleConfig[user.role]?.variant || 'secondary'}>{roleConfig[user.role]?.label || user.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {user.role !== 'SUPER_ADMIN' && (
                          <>
                            <Button variant="ghost" size="xs" onClick={() => openEdit(user)}><Pencil className="w-3.5 h-3.5" /></Button>
                            {user.id !== currentUserId && (
                              <Button variant="ghost" size="xs" className="hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(user.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editUser ? 'Edit User' : 'Create User'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Password {editUser && <span className="text-muted-foreground">(leave blank to keep)</span>}</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editUser ? '••••••••' : 'Min 6 characters'} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableRoles.map(r => <SelectItem key={r} value={r}>{r === 'ADMIN' ? 'Admin' : 'User'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editUser ? 'Save Changes' : 'Create User'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
