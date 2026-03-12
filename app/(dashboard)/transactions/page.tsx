'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, RotateCcw, Pencil, Trash2, FileDown, Download, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatDate, getMonthName } from '@/lib/utils'

interface TransactionItem { id: string; inventoryId: string; startDate: string; endDate: string; returned: boolean; returnDate: string | null; inventory: { modelVariant: string; status: string; brandType: { brand: string; type: string } } }
interface Transaction { id: string; clientName: string; purpose: string | null; month: number; year: number; createdAt: string; admin: { name: string }; request: { id: string; user: { name: string } } | null; items: TransactionItem[] }
interface Inventory { id: string; modelVariant: string; status: string; brandType: { brand: string; type: string } }

export default function TransactionsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const role = (session?.user as any)?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString())
  const [form, setForm] = useState({ clientName: '', purpose: '', notes: '', items: [{ inventoryId: '', startDate: '', endDate: '' }] })

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    const params = new URLSearchParams()
    if (filterMonth !== 'all') params.set('month', filterMonth)
    if (filterYear) params.set('year', filterYear)
    const res = await fetch(`/api/transactions?${params}`)
    if (res.ok) setTransactions(await res.json())
    setIsLoading(false)
  }, [filterMonth, filterYear])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])
  useEffect(() => { fetch('/api/inventory').then(r => r.json()).then(setInventory) }, [])

  // Group by month/year
  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
    const key = `${t.year}-${String(t.month).padStart(2, '0')}`
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})
  const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  function addItem() { setForm(f => ({ ...f, items: [...f.items, { inventoryId: '', startDate: '', endDate: '' }] })) }
  function removeItem(idx: number) { setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })) }
  function updateItem(idx: number, field: string, value: string) { setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item) })) }

  async function handleCreate() {
    const res = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { toast({ title: 'Transaction created', variant: 'success' as any }); setDialogOpen(false); fetchTransactions() }
    else toast({ title: 'Error', variant: 'destructive' })
  }

  async function handleReturn(itemId: string) {
    if (!confirm('Mark item as returned?')) return
    const res = await fetch(`/api/transactions/items/${itemId}/return`, { method: 'PUT' })
    if (res.ok) { toast({ title: 'Item returned, inventory updated to OK', variant: 'success' as any }); fetchTransactions() }
    else toast({ title: 'Error', variant: 'destructive' })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    // No direct delete API needed but nice to have
    toast({ title: 'Not implemented - transactions are permanent records', variant: 'destructive' })
  }

  function handleExport() {
    const params = new URLSearchParams()
    if (filterMonth !== 'all') params.set('month', filterMonth)
    if (filterYear) params.set('year', filterYear)
    window.open(`/api/transactions/export?${params}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">{transactions.length} transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
          {isAdmin && <Button size="sm" onClick={() => { setForm({ clientName: '', purpose: '', notes: '', items: [{ inventoryId: '', startDate: '', endDate: '' }] }); setDialogOpen(true) }}><Plus className="w-4 h-4 mr-1" /> New Transaction</Button>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {Array.from({ length: 12 }, (_, i) => <SelectItem key={i+1} value={String(i+1)}>{getMonthName(i+1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grouped transactions */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : sortedKeys.length === 0 ? (
        <div className="py-12 text-center">
          <ArrowLeftRight className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No transactions found</p>
        </div>
      ) : (
        sortedKeys.map(key => {
          const [year, month] = key.split('-')
          const group = grouped[key]
          return (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {getMonthName(parseInt(month))} {year}
                </h2>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{group.length} transactions</span>
              </div>
              <Card className="border-border/60">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {group.map(t => (
                      <div key={t.id} className="p-4 hover:bg-secondary/20 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{t.clientName}</span>
                              <span className="text-xs text-muted-foreground">TXN-{t.id.slice(-8).toUpperCase()}</span>
                            </div>
                            {t.purpose && <p className="text-sm text-muted-foreground mb-2">{t.purpose}</p>}
                            <div className="space-y-1">
                              {t.items.map(item => (
                                <div key={item.id} className="flex items-center gap-2 text-sm">
                                  <span>{item.inventory.brandType.brand} - {item.inventory.modelVariant}</span>
                                  <span className="text-muted-foreground text-xs">({formatDate(item.startDate)} → {formatDate(item.endDate)})</span>
                                  {item.returned
                                    ? <Badge variant="success">Returned {item.returnDate ? formatDate(item.returnDate) : ''}</Badge>
                                    : <Badge variant="danger">Active</Badge>
                                  }
                                  {isAdmin && !item.returned && (
                                    <Button size="xs" variant="outline" onClick={() => handleReturn(item.id)}>
                                      <RotateCcw className="w-3 h-3 mr-1" />Return
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">by {t.admin.name} · {formatDate(t.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="xs" variant="outline" onClick={() => window.open(`/api/pdf/transmittal/${t.id}`, '_blank')} title="PDF Transmittal">
                              <FileDown className="w-3.5 h-3.5 mr-1" />Transmittal
                            </Button>
                            {t.request && (
                              <Button size="xs" variant="outline" onClick={() => window.open(`/api/pdf/request-form/${t.request!.id}`, '_blank')} title="PDF Request Form">
                                <FileDown className="w-3.5 h-3.5 mr-1" />Req. Form
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })
      )}

      {/* Create Transaction Dialog (Admin only) */}
      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Direct Transaction</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Client name" />
                </div>
                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Purpose" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes..." />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button size="xs" variant="outline" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Add</Button>
                </div>
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr,auto,auto,auto] gap-2 items-end p-3 bg-secondary/30 rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-xs">Item</Label>
                      <Select value={item.inventoryId} onValueChange={v => updateItem(idx, 'inventoryId', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{inventory.map(i => <SelectItem key={i.id} value={i.id}>{i.brandType.brand} - {i.modelVariant} ({i.status})</SelectItem>)}</SelectContent>
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
                    <Button size="xs" variant="ghost" className="hover:text-destructive" onClick={() => removeItem(idx)}><span className="text-lg">×</span></Button>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Transaction</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
