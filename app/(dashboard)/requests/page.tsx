'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Check, X, Trash2, Pencil, ClipboardList, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'

interface RequestItem { id: string; inventoryId: string; startDate: string; endDate: string; inventory: { modelVariant: string; brandType: { brand: string; type: string } } }
interface Request { id: string; clientName: string; purpose: string | null; notes: string | null; status: 'PENDING' | 'APPROVED' | 'REJECTED'; createdAt: string; user: { name: string }; items: RequestItem[] }
interface Inventory { id: string; modelVariant: string; status: string; brandType: { brand: string; type: string } }

const statusConfig = {
  PENDING: { label: 'Pending', variant: 'warning' as const },
  APPROVED: { label: 'Approved', variant: 'success' as const },
  REJECTED: { label: 'Rejected', variant: 'danger' as const },
}

export default function RequestsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const role = (session?.user as any)?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  const [requests, setRequests] = useState<Request[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRequest, setEditRequest] = useState<Request | null>(null)
  const [form, setForm] = useState({ clientName: '', purpose: '', notes: '', items: [{ inventoryId: '', startDate: '', endDate: '' }] })

  const fetchRequests = useCallback(async () => {
    setIsLoading(true)
    const res = await fetch('/api/requests')
    if (res.ok) setRequests(await res.json())
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])
  useEffect(() => { fetch('/api/inventory?status=OK').then(r => r.json()).then(setInventory) }, [])

  function openCreate() { setEditRequest(null); setForm({ clientName: '', purpose: '', notes: '', items: [{ inventoryId: '', startDate: '', endDate: '' }] }); setDialogOpen(true) }
  function openEdit(r: Request) {
    setEditRequest(r)
    setForm({ clientName: r.clientName, purpose: r.purpose || '', notes: r.notes || '', items: r.items.map(i => ({ inventoryId: i.inventoryId, startDate: i.startDate.split('T')[0], endDate: i.endDate.split('T')[0] })) })
    setDialogOpen(true)
  }

  function addItem() { setForm(f => ({ ...f, items: [...f.items, { inventoryId: '', startDate: '', endDate: '' }] })) }
  function removeItem(idx: number) { setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })) }
  function updateItem(idx: number, field: string, value: string) { setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item) })) }

  async function handleSubmit() {
    const url = editRequest ? `/api/requests/${editRequest.id}` : '/api/requests'
    const method = editRequest ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { toast({ title: editRequest ? 'Updated' : 'Request submitted', variant: 'success' as any }); setDialogOpen(false); fetchRequests() }
    else toast({ title: 'Error', variant: 'destructive' })
  }

  async function handleApprove(id: string) {
    const res = await fetch(`/api/requests/${id}/approve`, { method: 'PUT' })
    if (res.ok) { toast({ title: 'Request approved', variant: 'success' as any }); fetchRequests() }
    else toast({ title: 'Error', variant: 'destructive' })
  }

  async function handleReject(id: string) {
    const res = await fetch(`/api/requests/${id}/reject`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    if (res.ok) { toast({ title: 'Request rejected', variant: 'success' as any }); fetchRequests() }
    else toast({ title: 'Error', variant: 'destructive' })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this request?')) return
    const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' })
    if (res.ok) { toast({ title: 'Deleted', variant: 'success' as any }); fetchRequests() }
    else toast({ title: 'Error', variant: 'destructive' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">{requests.length} total requests</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> New Request</Button>
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No requests yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {requests.map(r => (
                <div key={r.id} className="p-4 hover:bg-secondary/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{r.clientName}</span>
                        <Badge variant={statusConfig[r.status].variant}>{statusConfig[r.status].label}</Badge>
                      </div>
                      {isAdmin && <p className="text-xs text-muted-foreground mb-1">by {r.user.name}</p>}
                      {r.purpose && <p className="text-sm text-muted-foreground mb-2">{r.purpose}</p>}
                      <div className="flex flex-wrap gap-1">
                        {r.items.map(item => (
                          <span key={item.id} className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                            {item.inventory.brandType.brand} {item.inventory.modelVariant} ({formatDate(item.startDate)} – {formatDate(item.endDate)})
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{formatDate(r.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isAdmin && r.status === 'PENDING' && (
                        <>
                          <Button size="xs" variant="success" onClick={() => handleApprove(r.id)}><Check className="w-3.5 h-3.5 mr-1" />Approve</Button>
                          <Button size="xs" variant="outline" className="hover:text-destructive" onClick={() => handleReject(r.id)}><X className="w-3.5 h-3.5 mr-1" />Reject</Button>
                        </>
                      )}
                      {/* PDF for all */}
                      <Button size="xs" variant="outline" onClick={() => window.open(`/api/pdf/request-form/${r.id}`, '_blank')} title="PDF Request Form">
                        <FileDown className="w-3.5 h-3.5" />
                      </Button>
                      {/* Edit/Delete: user on own PENDING, admin on all */}
                      {(isAdmin || r.status === 'PENDING') && (
                        <>
                          <Button size="xs" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="xs" variant="ghost" className="hover:text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRequest ? 'Edit Request' : 'New Request'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Client name" />
              </div>
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Purpose of rental" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button size="xs" variant="outline" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Add Item</Button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr,auto,auto,auto] gap-2 items-end p-3 bg-secondary/30 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs">Item</Label>
                    <Select value={item.inventoryId} onValueChange={v => updateItem(idx, 'inventoryId', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{inventory.map(i => <SelectItem key={i.id} value={i.id}>{i.brandType.brand} - {i.modelVariant}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Start</Label>
                    <Input type="date" value={item.startDate} onChange={e => updateItem(idx, 'startDate', e.target.value)} className="h-8 text-xs w-32" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End</Label>
                    <Input type="date" value={item.endDate} onChange={e => updateItem(idx, 'endDate', e.target.value)} className="h-8 text-xs w-32" />
                  </div>
                  <Button size="xs" variant="ghost" className="hover:text-destructive" onClick={() => removeItem(idx)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editRequest ? 'Save Changes' : 'Submit Request'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
