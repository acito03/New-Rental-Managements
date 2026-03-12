'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Search, Upload, Download, Pencil, Trash2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

type InventoryStatus = 'OK' | 'MAINTENANCE' | 'OUT'

interface InventoryItem {
  id: string
  modelVariant: string
  serialNumber: string | null
  shortDescription: string | null
  status: InventoryStatus
  brandType: { id: string; brand: string; type: string }
}

interface BrandType { id: string; brand: string; type: string }

const statusConfig = {
  OK: { label: 'OK', variant: 'success' as const },
  MAINTENANCE: { label: 'Maintenance', variant: 'warning' as const },
  OUT: { label: 'Out', variant: 'danger' as const },
}

export default function InventoryPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const role = (session?.user as any)?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  const [items, setItems] = useState<InventoryItem[]>([])
  const [brands, setBrands] = useState<BrandType[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState({ brandTypeId: '', modelVariant: '', serialNumber: '', shortDescription: '', status: 'OK' as InventoryStatus })

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    const res = await fetch(`/api/inventory?${params}`)
    if (res.ok) setItems(await res.json())
    setIsLoading(false)
  }, [statusFilter])

  useEffect(() => { fetchItems() }, [fetchItems])

  useEffect(() => {
    fetch('/api/brands').then(r => r.json()).then(setBrands)
  }, [])

  const filtered = items.filter(i =>
    `${i.brandType.brand} ${i.brandType.type} ${i.modelVariant} ${i.serialNumber || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() { setEditItem(null); setForm({ brandTypeId: '', modelVariant: '', serialNumber: '', shortDescription: '', status: 'OK' }); setDialogOpen(true) }
  function openEdit(item: InventoryItem) { setEditItem(item); setForm({ brandTypeId: item.brandType.id, modelVariant: item.modelVariant, serialNumber: item.serialNumber || '', shortDescription: item.shortDescription || '', status: item.status }); setDialogOpen(true) }

  async function handleSubmit() {
    const url = editItem ? `/api/inventory/${editItem.id}` : '/api/inventory'
    const method = editItem ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      toast({ title: editItem ? 'Item updated' : 'Item created', variant: 'success' as any })
      setDialogOpen(false)
      fetchItems()
    } else {
      toast({ title: 'Error', description: 'Failed to save item', variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this inventory item?')) return
    const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' })
    if (res.ok) { toast({ title: 'Deleted', variant: 'success' as any }); fetchItems() }
    else toast({ title: 'Error', variant: 'destructive' })
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/inventory/csv', { method: 'POST', body: formData })
    const result = await res.json()
    toast({ title: `Import complete: ${result.success} added, ${result.errors.length} errors`, variant: 'success' as any })
    fetchItems()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} total items</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open('/api/inventory/csv', '_blank')}>
              <Download className="w-4 h-4 mr-1" /> Template
            </Button>
            <label>
              <Button variant="outline" size="sm" asChild><span><Upload className="w-4 h-4 mr-1" /> Import CSV</span></Button>
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
            </label>
            <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by brand, model, serial..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="OUT">Out</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No inventory items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Brand / Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Model / Variant</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Serial No</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    {isAdmin && <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => (
                    <tr key={item.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.brandType.brand}</div>
                        <div className="text-xs text-muted-foreground">{item.brandType.type}</div>
                      </td>
                      <td className="px-4 py-3 font-medium">{item.modelVariant}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.serialNumber || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{item.shortDescription || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusConfig[item.status].variant}>{statusConfig[item.status].label}</Badge>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="xs" onClick={() => openEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="xs" className="hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Brand / Type</Label>
              <Select value={form.brandTypeId} onValueChange={(v) => setForm(f => ({ ...f, brandTypeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select brand/type..." /></SelectTrigger>
                <SelectContent>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.brand} - {b.type}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model / Variant</Label>
              <Input value={form.modelVariant} onChange={e => setForm(f => ({ ...f, modelVariant: e.target.value }))} placeholder="e.g. Alpha 7 IV" />
            </div>
            <div className="space-y-2">
              <Label>Serial Number <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} placeholder="e.g. SNY-001" />
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={form.shortDescription} onChange={e => setForm(f => ({ ...f, shortDescription: e.target.value }))} placeholder="Short description..." />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as InventoryStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="OUT">Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editItem ? 'Save Changes' : 'Create Item'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
