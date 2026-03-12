'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface BrandType { id: string; brand: string; type: string; _count: { inventory: number } }

export default function BrandsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const role = (session?.user as any)?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  const [brands, setBrands] = useState<BrandType[]>([])
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editBrand, setEditBrand] = useState<BrandType | null>(null)
  const [form, setForm] = useState({ brand: '', type: '' })

  const fetchBrands = useCallback(async () => {
    const res = await fetch('/api/brands')
    if (res.ok) setBrands(await res.json())
  }, [])

  useEffect(() => { fetchBrands() }, [fetchBrands])

  const filtered = brands.filter(b =>
    `${b.brand} ${b.type}`.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = filtered.reduce<Record<string, BrandType[]>>((acc, b) => {
    if (!acc[b.brand]) acc[b.brand] = []
    acc[b.brand].push(b)
    return acc
  }, {})

  function openCreate() { setEditBrand(null); setForm({ brand: '', type: '' }); setDialogOpen(true) }
  function openEdit(b: BrandType) { setEditBrand(b); setForm({ brand: b.brand, type: b.type }); setDialogOpen(true) }

  async function handleSubmit() {
    const url = editBrand ? `/api/brands/${editBrand.id}` : '/api/brands'
    const method = editBrand ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      toast({ title: editBrand ? 'Updated' : 'Created', variant: 'success' as any })
      setDialogOpen(false)
      fetchBrands()
    } else {
      const err = await res.json()
      toast({ title: 'Error', description: err.error || 'Failed', variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this brand/type?')) return
    const res = await fetch(`/api/brands/${id}`, { method: 'DELETE' })
    if (res.ok) { toast({ title: 'Deleted', variant: 'success' as any }); fetchBrands() }
    else toast({ title: 'Error', variant: 'destructive' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Brand / Type</h1>
          <p className="text-muted-foreground text-sm mt-1">{brands.length} categories</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Brand/Type</Button>
        )}
      </div>

      <Input placeholder="Search brand or type..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      {Object.keys(grouped).length === 0 ? (
        <div className="py-12 text-center">
          <Tags className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No brand/types yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([brand, types]) => (
            <Card key={brand} className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{brand}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-muted-foreground font-medium">Type</th>
                      <th className="text-left px-4 py-2 text-muted-foreground font-medium">Items</th>
                      {isAdmin && <th className="text-right px-4 py-2 text-muted-foreground font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {types.map(bt => (
                      <tr key={bt.id} className="border-b border-border/30 hover:bg-secondary/20">
                        <td className="px-4 py-2.5 font-medium">{bt.type}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{bt._count.inventory} items</td>
                        {isAdmin && (
                          <td className="px-4 py-2.5">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="xs" onClick={() => openEdit(bt)}><Pencil className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="xs" className="hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(bt.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editBrand ? 'Edit Brand/Type' : 'Add Brand/Type'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. Sony" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="e.g. Camera" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editBrand ? 'Save Changes' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
