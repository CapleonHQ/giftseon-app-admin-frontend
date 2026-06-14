'use client'

import { useState, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Upload,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
  Calendar,
  ExternalLink,
  Gift,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatCurrency, formatDateTime, truncate } from '@/lib/utils'
import type { AdminRecommendation, AdminOccasion } from '@/types/Admin'
import { toast } from 'sonner'
import {
  listRecommendations,
  createRecommendation,
  updateRecommendation,
  deleteRecommendation,
  restoreRecommendation,
  bulkImportRecommendations,
  listOccasions,
  createOccasion,
  updateOccasion,
  deleteOccasion,
  bulkImportOccasions,
  type CreateRecommendationPayload,
  type OccasionPayload,
} from '@/api/services/admin'

// ── Form state types ──────────────────────────────────────────────────────────

type RecForm = {
  title: string
  description: string
  category: string
  currency: string
  minPrice: string
  maxPrice: string
  occasionTags: string
  recipientTags: string
  imageUrl: string
  externalLink: string
  isCashGift: boolean
  priority: string
}

const defaultRecForm: RecForm = {
  title: '',
  description: '',
  category: '',
  currency: 'NGN',
  minPrice: '',
  maxPrice: '',
  occasionTags: '',
  recipientTags: '',
  imageUrl: '',
  externalLink: '',
  isCashGift: false,
  priority: '0',
}

type OccForm = { slug: string; label: string; description: string; iconName: string }
const defaultOccForm: OccForm = { slug: '', label: '', description: '', iconName: '' }

function recToForm(r: AdminRecommendation): RecForm {
  return {
    title: r.title,
    description: r.description,
    category: r.category ?? '',
    currency: r.currency,
    minPrice: r.minPrice != null ? String(r.minPrice) : '',
    maxPrice: r.maxPrice != null ? String(r.maxPrice) : '',
    occasionTags: r.occasionTags.join(', '),
    recipientTags: r.recipientTags.join(', '),
    imageUrl: r.imageUrl ?? '',
    externalLink: r.externalLink ?? '',
    isCashGift: r.isCashGift,
    priority: String(r.priority),
  }
}

function occToForm(o: AdminOccasion): OccForm {
  return {
    slug: o.slug,
    label: o.label,
    description: o.description ?? '',
    iconName: o.iconName ?? '',
  }
}

function buildRecPayload(f: RecForm): CreateRecommendationPayload {
  return {
    title: f.title.trim(),
    description: f.description.trim(),
    category: f.category.trim() || undefined,
    currency: f.currency || 'NGN',
    minPrice: f.minPrice ? parseFloat(f.minPrice) : undefined,
    maxPrice: f.maxPrice ? parseFloat(f.maxPrice) : undefined,
    occasionTags: f.occasionTags ? f.occasionTags.split(',').map((s) => s.trim()).filter(Boolean) : [],
    recipientTags: f.recipientTags ? f.recipientTags.split(',').map((s) => s.trim()).filter(Boolean) : [],
    imageUrl: f.imageUrl.trim() || undefined,
    externalLink: f.externalLink.trim() || undefined,
    isCashGift: f.isCashGift,
    priority: parseInt(f.priority) || 0,
  }
}

// ── Label helpers ─────────────────────────────────────────────────────────────

const FormField = ({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) => (
  <div className='flex flex-col gap-1.5'>
    <label className='text-xs font-medium text-grey-700'>
      {label} {required && <span className='text-error-500'>*</span>}
    </label>
    {children}
  </div>
)

// ── Recommendations Tab ───────────────────────────────────────────────────────

const RecommendationsTab = () => {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [recModal, setRecModal] = useState<{ open: boolean; mode: 'create' | 'edit'; target: AdminRecommendation | null }>({ open: false, mode: 'create', target: null })
  const [recForm, setRecForm] = useState<RecForm>(defaultRecForm)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkJson, setBulkJson] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['recommendations', { page }],
    queryFn: () => listRecommendations({ page, limit: 20 }),
    retry: 1,
  })

  const recs: AdminRecommendation[] = data?.data ?? []
  const meta = data?.meta
  const total = meta?.total ?? 0
  const totalPages = meta?.totalPages ?? 1

  const activeCount = recs.filter((r) => r.isActive).length
  const cashGiftCount = recs.filter((r) => r.isCashGift).length

  const invalidate = () => qc.invalidateQueries({ queryKey: ['recommendations'] })

  const createMutation = useMutation({
    mutationFn: (dto: CreateRecommendationPayload) => createRecommendation(dto),
    onSuccess: () => { invalidate(); setRecModal({ open: false, mode: 'create', target: null }); toast.success('Recommendation created.') },
    onError: () => toast.error('Failed to create recommendation.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateRecommendationPayload> }) => updateRecommendation(id, dto),
    onSuccess: () => { invalidate(); setRecModal({ open: false, mode: 'create', target: null }); toast.success('Recommendation updated.') },
    onError: () => toast.error('Failed to update recommendation.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRecommendation(id),
    onSuccess: () => { invalidate(); setConfirmDelete(null); toast.success('Recommendation deactivated.') },
    onError: () => toast.error('Failed to delete recommendation.'),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreRecommendation(id),
    onSuccess: () => { invalidate(); toast.success('Recommendation restored.') },
    onError: () => toast.error('Failed to restore recommendation.'),
  })

  const bulkMutation = useMutation({
    mutationFn: (items: CreateRecommendationPayload[]) => bulkImportRecommendations(items),
    onSuccess: (result: { count: number; message: string }) => { invalidate(); setBulkOpen(false); setBulkJson(''); toast.success(result.message) },
    onError: () => toast.error('Bulk import failed. Check JSON format.'),
  })

  const openCreate = () => { setRecForm(defaultRecForm); setRecModal({ open: true, mode: 'create', target: null }) }
  const openEdit = (r: AdminRecommendation) => { setRecForm(recToForm(r)); setRecModal({ open: true, mode: 'edit', target: r }) }

  const handleSubmit = () => {
    const payload = buildRecPayload(recForm)
    if (!payload.title || !payload.description) { toast.error('Title and description are required.'); return }
    if (recModal.mode === 'create') createMutation.mutate(payload)
    else if (recModal.target) updateMutation.mutate({ id: recModal.target.id, dto: payload })
  }

  const handleBulkImport = () => {
    try {
      const parsed = JSON.parse(bulkJson)
      const items: CreateRecommendationPayload[] = Array.isArray(parsed) ? parsed : [parsed]
      bulkMutation.mutate(items)
    } catch {
      toast.error('Invalid JSON. Please check your input.')
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending

  return (
    <div className='flex flex-col gap-4'>
      {/* Stats */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        {[
          { label: 'Total', value: total, icon: Sparkles, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Active (this page)', value: activeCount, icon: Sparkles, color: 'text-success-600', bg: 'bg-success-50' },
          { label: 'Cash Gifts (this page)', value: cashGiftCount, icon: Gift, color: 'text-warning-600', bg: 'bg-warning-50' },
          { label: 'Total Pages', value: totalPages, icon: Tag, color: 'text-information-600', bg: 'bg-information-50' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className='p-4 flex items-center gap-3'>
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className='text-[10px] text-grey-500'>{s.label}</p>
                  <p className={`text-lg font-semibold ${s.color}`}>{isLoading ? '—' : s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <Card>
          <CardHeader>
            <div className='flex flex-col sm:flex-row sm:items-center gap-3 justify-between'>
              <CardTitle className='text-sm'>All Recommendations</CardTitle>
              <div className='flex items-center gap-2'>
                <Button size='sm' variant='outline' className='h-8 text-xs gap-1.5' onClick={() => setBulkOpen(true)}>
                  <Upload className='w-3 h-3' />
                  Bulk Import
                </Button>
                <Button size='sm' className='h-8 text-xs gap-1.5' onClick={openCreate}>
                  <Plus className='w-3 h-3' />
                  New Recommendation
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className='pt-0 px-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price Range</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className='h-4 w-full' /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : recs.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={8} className='text-center text-sm text-grey-400 py-10'>
                            No recommendations yet. Create one or bulk import.
                          </TableCell>
                        </TableRow>
                      )
                    : recs.map((r) => (
                        <TableRow key={r.id} className={!r.isActive ? 'opacity-50' : ''}>
                          <TableCell>
                            <div className='flex items-start gap-2 max-w-[200px]'>
                              {r.imageUrl && (
                                <img src={r.imageUrl} alt='' className='w-8 h-8 rounded-md object-cover shrink-0 bg-grey-100' onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                              )}
                              <div>
                                <p className='text-xs font-medium text-grey-800 leading-tight'>{truncate(r.title, 40)}</p>
                                <p className='text-[10px] text-grey-400 mt-0.5 leading-tight'>{truncate(r.description, 50)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {r.category ? (
                              <Badge variant='information' className='text-[10px]'>{r.category}</Badge>
                            ) : (
                              <span className='text-[10px] text-grey-300'>—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.minPrice != null || r.maxPrice != null ? (
                              <span className='text-xs text-grey-700'>
                                {r.minPrice != null ? formatCurrency(r.minPrice, r.currency) : '—'}
                                {' – '}
                                {r.maxPrice != null ? formatCurrency(r.maxPrice, r.currency) : '∞'}
                              </span>
                            ) : (
                              <span className='text-[10px] text-grey-300'>Any</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className='flex flex-col gap-0.5 max-w-[140px]'>
                              {r.occasionTags.length > 0 && (
                                <div className='flex flex-wrap gap-1'>
                                  {r.occasionTags.slice(0, 2).map((t) => (
                                    <span key={t} className='inline-flex items-center gap-0.5 text-[9px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full'>
                                      <Calendar className='w-2 h-2' />{t}
                                    </span>
                                  ))}
                                  {r.occasionTags.length > 2 && <span className='text-[9px] text-grey-400'>+{r.occasionTags.length - 2}</span>}
                                </div>
                              )}
                              {r.recipientTags.length > 0 && (
                                <div className='flex flex-wrap gap-1'>
                                  {r.recipientTags.slice(0, 2).map((t) => (
                                    <span key={t} className='inline-flex items-center gap-0.5 text-[9px] bg-success-50 text-success-700 px-1.5 py-0.5 rounded-full'>
                                      <Tag className='w-2 h-2' />{t}
                                    </span>
                                  ))}
                                  {r.recipientTags.length > 2 && <span className='text-[9px] text-grey-400'>+{r.recipientTags.length - 2}</span>}
                                </div>
                              )}
                              {r.occasionTags.length === 0 && r.recipientTags.length === 0 && (
                                <span className='text-[10px] text-grey-300'>—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-semibold ${r.priority > 0 ? 'text-primary-600' : 'text-grey-400'}`}>
                              {r.priority}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className='flex flex-col gap-1'>
                              <Badge variant={r.isActive ? 'success' : 'error'} className='text-[10px] w-fit'>
                                {r.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              {r.isCashGift && (
                                <Badge variant='warning' className='text-[10px] w-fit'>Cash Gift</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className='text-[10px] text-grey-500'>{formatDateTime(r.createdAt)}</span>
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-1'>
                              {r.externalLink && (
                                <Button size='sm' variant='ghost' className='h-6 w-6 p-0' title='Open link' onClick={() => window.open(r.externalLink!, '_blank')}>
                                  <ExternalLink className='w-3 h-3' />
                                </Button>
                              )}
                              <Button size='sm' variant='outline' className='h-6 w-6 p-0' title='Edit' onClick={() => openEdit(r)}>
                                <Pencil className='w-3 h-3' />
                              </Button>
                              {r.isActive ? (
                                <Button
                                  size='sm'
                                  variant='destructive'
                                  className='h-6 w-6 p-0'
                                  title='Deactivate'
                                  disabled={deleteMutation.isPending}
                                  onClick={() => setConfirmDelete(r.id)}
                                >
                                  <Trash2 className='w-3 h-3' />
                                </Button>
                              ) : (
                                <Button
                                  size='sm'
                                  variant='success'
                                  className='h-6 w-6 p-0'
                                  title='Restore'
                                  disabled={restoreMutation.isPending}
                                  onClick={() => restoreMutation.mutate(r.id)}
                                >
                                  <RotateCcw className='w-3 h-3' />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
              </TableBody>
            </Table>
            <div className='px-4 py-3 border-t border-grey-50 flex items-center justify-between'>
              <span className='text-xs text-grey-500'>Showing {recs.length} of {total} recommendations</span>
              <div className='flex items-center gap-2'>
                <Button variant='outline' size='sm' disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className='w-3.5 h-3.5' /></Button>
                <span className='text-xs text-grey-500'>{page} / {Math.max(totalPages, 1)}</span>
                <Button variant='outline' size='sm' disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className='w-3.5 h-3.5' /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create / Edit Recommendation Modal */}
      <Dialog open={recModal.open} onOpenChange={(open) => !open && setRecModal((s) => ({ ...s, open: false }))}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{recModal.mode === 'create' ? 'New Recommendation' : 'Edit Recommendation'}</DialogTitle>
            <DialogDescription>
              {recModal.mode === 'create' ? 'Add a new gift recommendation to the catalog.' : 'Update recommendation details.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='sm:col-span-2'>
              <FormField label='Title' required>
                <Input placeholder='e.g. Premium Coffee Set' value={recForm.title} onChange={(e) => setRecForm((f) => ({ ...f, title: e.target.value }))} />
              </FormField>
            </div>
            <div className='sm:col-span-2'>
              <FormField label='Description' required>
                <textarea
                  className='flex min-h-[72px] w-full rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm text-grey-900 placeholder:text-grey-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-none'
                  placeholder='Describe this gift idea...'
                  value={recForm.description}
                  onChange={(e) => setRecForm((f) => ({ ...f, description: e.target.value }))}
                />
              </FormField>
            </div>
            <FormField label='Category'>
              <Input placeholder='e.g. Electronics, Food' value={recForm.category} onChange={(e) => setRecForm((f) => ({ ...f, category: e.target.value }))} />
            </FormField>
            <FormField label='Currency'>
              <Input placeholder='NGN' value={recForm.currency} onChange={(e) => setRecForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} />
            </FormField>
            <FormField label='Min Price'>
              <Input type='number' placeholder='0' value={recForm.minPrice} onChange={(e) => setRecForm((f) => ({ ...f, minPrice: e.target.value }))} />
            </FormField>
            <FormField label='Max Price'>
              <Input type='number' placeholder='50000' value={recForm.maxPrice} onChange={(e) => setRecForm((f) => ({ ...f, maxPrice: e.target.value }))} />
            </FormField>
            <div className='sm:col-span-2'>
              <FormField label='Occasion Tags'>
                <Input placeholder='birthday, wedding, graduation (comma-separated)' value={recForm.occasionTags} onChange={(e) => setRecForm((f) => ({ ...f, occasionTags: e.target.value }))} />
              </FormField>
            </div>
            <div className='sm:col-span-2'>
              <FormField label='Recipient Tags'>
                <Input placeholder='mom, dad, friend, colleague (comma-separated)' value={recForm.recipientTags} onChange={(e) => setRecForm((f) => ({ ...f, recipientTags: e.target.value }))} />
              </FormField>
            </div>
            <div className='sm:col-span-2'>
              <FormField label='Image URL'>
                <Input placeholder='https://...' value={recForm.imageUrl} onChange={(e) => setRecForm((f) => ({ ...f, imageUrl: e.target.value }))} />
              </FormField>
            </div>
            <div className='sm:col-span-2'>
              <FormField label='External Link'>
                <Input placeholder='https://store.example.com/product' value={recForm.externalLink} onChange={(e) => setRecForm((f) => ({ ...f, externalLink: e.target.value }))} />
              </FormField>
            </div>
            <FormField label='Priority'>
              <Input type='number' placeholder='0' value={recForm.priority} onChange={(e) => setRecForm((f) => ({ ...f, priority: e.target.value }))} />
            </FormField>
            <div className='flex items-center gap-3 pt-6'>
              <input
                id='isCashGift'
                type='checkbox'
                className='w-4 h-4 accent-primary-600 cursor-pointer'
                checked={recForm.isCashGift}
                onChange={(e) => setRecForm((f) => ({ ...f, isCashGift: e.target.checked }))}
              />
              <label htmlFor='isCashGift' className='text-sm text-grey-700 cursor-pointer select-none'>Cash gift recommendation</label>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant='outline' size='sm' onClick={() => setRecModal((s) => ({ ...s, open: false }))}>Cancel</Button>
            <Button size='sm' disabled={isMutating} onClick={handleSubmit}>
              {isMutating ? 'Saving…' : recModal.mode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Bulk Import Recommendations</DialogTitle>
            <DialogDescription>
              Paste a JSON array of recommendations. Each item needs at minimum <code className='text-primary-600'>title</code> and <code className='text-primary-600'>description</code>.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <textarea
              className='w-full h-64 font-mono text-xs rounded-lg border border-grey-200 bg-grey-50 px-3 py-3 text-grey-800 placeholder:text-grey-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none'
              placeholder={`[\n  {\n    "title": "Coffee Gift Set",\n    "description": "Premium arabica blend",\n    "category": "Food",\n    "occasionTags": ["birthday"],\n    "minPrice": 5000,\n    "maxPrice": 20000\n  }\n]`}
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
            />
            <p className='text-[10px] text-grey-400 mt-2'>Supported fields: title, description, category, currency, minPrice, maxPrice, occasionTags[], recipientTags[], imageUrl, externalLink, isCashGift, priority</p>
          </DialogBody>
          <DialogFooter>
            <Button variant='outline' size='sm' onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button size='sm' disabled={bulkMutation.isPending || !bulkJson.trim()} onClick={handleBulkImport}>
              {bulkMutation.isPending ? 'Importing…' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Deactivate Recommendation?</DialogTitle>
            <DialogDescription>This recommendation will be soft-deleted and hidden from users. You can restore it later.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' size='sm' onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              size='sm'
              variant='destructive'
              disabled={deleteMutation.isPending}
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
            >
              {deleteMutation.isPending ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Occasions Tab ─────────────────────────────────────────────────────────────

const OccasionsTab = () => {
  const qc = useQueryClient()
  const [occModal, setOccModal] = useState<{ open: boolean; mode: 'create' | 'edit'; target: AdminOccasion | null }>({ open: false, mode: 'create', target: null })
  const [occForm, setOccForm] = useState<OccForm>(defaultOccForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkJson, setBulkJson] = useState('')

  const { data: occasions = [], isLoading } = useQuery({
    queryKey: ['occasions'],
    queryFn: listOccasions,
    retry: 1,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['occasions'] })

  const createMutation = useMutation({
    mutationFn: (dto: OccasionPayload) => createOccasion(dto),
    onSuccess: () => { invalidate(); setOccModal({ open: false, mode: 'create', target: null }); toast.success('Occasion created.') },
    onError: () => toast.error('Failed to create occasion.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<OccasionPayload> }) => updateOccasion(id, dto),
    onSuccess: () => { invalidate(); setOccModal({ open: false, mode: 'create', target: null }); toast.success('Occasion updated.') },
    onError: () => toast.error('Failed to update occasion.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOccasion(id),
    onSuccess: () => { invalidate(); setConfirmDelete(null); toast.success('Occasion deleted.') },
    onError: () => toast.error('Failed to delete occasion.'),
  })

  const bulkMutation = useMutation({
    mutationFn: (items: OccasionPayload[]) => bulkImportOccasions(items),
    onSuccess: (result: { count: number; message: string }) => { invalidate(); setBulkOpen(false); setBulkJson(''); toast.success(result.message) },
    onError: () => toast.error('Bulk import failed. Check JSON format.'),
  })

  const openCreate = () => { setOccForm(defaultOccForm); setOccModal({ open: true, mode: 'create', target: null }) }
  const openEdit = (o: AdminOccasion) => { setOccForm(occToForm(o)); setOccModal({ open: true, mode: 'edit', target: o }) }

  const handleBulkImport = () => {
    try {
      const parsed = JSON.parse(bulkJson)
      const items: OccasionPayload[] = Array.isArray(parsed) ? parsed : [parsed]
      bulkMutation.mutate(items)
    } catch {
      toast.error('Invalid JSON. Please check your input.')
    }
  }

  const handleSubmit = () => {
    if (!occForm.slug.trim() || !occForm.label.trim()) { toast.error('Slug and label are required.'); return }
    const dto: OccasionPayload = {
      slug: occForm.slug.trim(),
      label: occForm.label.trim(),
      description: occForm.description.trim() || undefined,
      iconName: occForm.iconName.trim() || undefined,
    }
    if (occModal.mode === 'create') createMutation.mutate(dto)
    else if (occModal.target) updateMutation.mutate({ id: occModal.target.id, dto })
  }

  const isMutating = createMutation.isPending || updateMutation.isPending
  const activeOccasions = occasions.filter((o) => o.isActive)

  return (
    <div className='flex flex-col gap-4'>
      {/* Stats */}
      <div className='grid grid-cols-2 gap-4 max-w-sm'>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className='p-4 flex items-center gap-3'>
              <div className='w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center'>
                <Calendar className='w-4 h-4 text-primary-600' />
              </div>
              <div>
                <p className='text-[10px] text-grey-500'>Total Occasions</p>
                <p className='text-lg font-semibold text-primary-600'>{occasions.length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardContent className='p-4 flex items-center gap-3'>
              <div className='w-9 h-9 rounded-xl bg-success-50 flex items-center justify-center'>
                <Calendar className='w-4 h-4 text-success-600' />
              </div>
              <div>
                <p className='text-[10px] text-grey-500'>Active</p>
                <p className='text-lg font-semibold text-success-600'>{activeOccasions.length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-sm'>Occasions</CardTitle>
              <div className='flex items-center gap-2'>
                <Button size='sm' variant='outline' className='h-8 text-xs gap-1.5' onClick={() => setBulkOpen(true)}>
                  <Upload className='w-3 h-3' />
                  Bulk Import
                </Button>
                <Button size='sm' className='h-8 text-xs gap-1.5' onClick={openCreate}>
                  <Plus className='w-3 h-3' />
                  New Occasion
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className='pt-0 px-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className='h-4 w-full' /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : occasions.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={7} className='text-center text-sm text-grey-400 py-10'>
                            No occasions yet. Create your first occasion.
                          </TableCell>
                        </TableRow>
                      )
                    : occasions.map((o) => (
                        <TableRow key={o.id} className={!o.isActive ? 'opacity-50' : ''}>
                          <TableCell>
                            <code className='text-xs bg-grey-100 text-grey-700 px-1.5 py-0.5 rounded'>{o.slug}</code>
                          </TableCell>
                          <TableCell>
                            <span className='text-xs font-medium text-grey-800'>{o.label}</span>
                          </TableCell>
                          <TableCell>
                            {o.description ? (
                              <span className='text-xs text-grey-500'>{truncate(o.description, 60)}</span>
                            ) : (
                              <span className='text-[10px] text-grey-300'>—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {o.iconName ? (
                              <code className='text-[10px] bg-grey-100 text-grey-600 px-1.5 py-0.5 rounded'>{o.iconName}</code>
                            ) : (
                              <span className='text-[10px] text-grey-300'>—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={o.isActive ? 'success' : 'error'} className='text-[10px]'>
                              {o.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className='text-[10px] text-grey-500'>{formatDateTime(o.createdAt)}</span>
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-1'>
                              <Button size='sm' variant='outline' className='h-6 w-6 p-0' title='Edit' onClick={() => openEdit(o)}>
                                <Pencil className='w-3 h-3' />
                              </Button>
                              <Button
                                size='sm'
                                variant='destructive'
                                className='h-6 w-6 p-0'
                                title='Delete'
                                disabled={deleteMutation.isPending}
                                onClick={() => setConfirmDelete(o.id)}
                              >
                                <Trash2 className='w-3 h-3' />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create / Edit Occasion Modal */}
      <Dialog open={occModal.open} onOpenChange={(open) => !open && setOccModal((s) => ({ ...s, open: false }))}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>{occModal.mode === 'create' ? 'New Occasion' : 'Edit Occasion'}</DialogTitle>
            <DialogDescription>Occasions are used to tag recommendations for gift suggestions.</DialogDescription>
          </DialogHeader>
          <DialogBody className='flex flex-col gap-4'>
            <FormField label='Slug' required>
              <Input
                placeholder='e.g. birthday, wedding'
                value={occForm.slug}
                onChange={(e) => setOccForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
              />
              <p className='text-[10px] text-grey-400'>Lowercase, hyphenated, unique identifier</p>
            </FormField>
            <FormField label='Label' required>
              <Input placeholder='e.g. Birthday' value={occForm.label} onChange={(e) => setOccForm((f) => ({ ...f, label: e.target.value }))} />
            </FormField>
            <FormField label='Description'>
              <Input placeholder='Optional description...' value={occForm.description} onChange={(e) => setOccForm((f) => ({ ...f, description: e.target.value }))} />
            </FormField>
            <FormField label='Icon Name'>
              <Input placeholder='e.g. cake, heart, star' value={occForm.iconName} onChange={(e) => setOccForm((f) => ({ ...f, iconName: e.target.value }))} />
              <p className='text-[10px] text-grey-400'>Lucide icon name or custom identifier</p>
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button variant='outline' size='sm' onClick={() => setOccModal((s) => ({ ...s, open: false }))}>Cancel</Button>
            <Button size='sm' disabled={isMutating} onClick={handleSubmit}>
              {isMutating ? 'Saving…' : occModal.mode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Bulk Import Occasions</DialogTitle>
            <DialogDescription>
              Paste a JSON array of occasions. Each item needs at minimum <code className='text-primary-600'>slug</code> and <code className='text-primary-600'>label</code>. Duplicate slugs are silently skipped.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <textarea
              className='w-full h-56 font-mono text-xs rounded-lg border border-grey-200 bg-grey-50 px-3 py-3 text-grey-800 placeholder:text-grey-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none'
              placeholder={`[\n  {\n    "slug": "birthday",\n    "label": "Birthday",\n    "description": "Celebrate another year",\n    "iconName": "cake"\n  },\n  {\n    "slug": "wedding",\n    "label": "Wedding"\n  }\n]`}
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
            />
            <p className='text-[10px] text-grey-400 mt-2'>Supported fields: slug (required), label (required), description, iconName</p>
          </DialogBody>
          <DialogFooter>
            <Button variant='outline' size='sm' onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button size='sm' disabled={bulkMutation.isPending || !bulkJson.trim()} onClick={handleBulkImport}>
              {bulkMutation.isPending ? 'Importing…' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Delete Occasion?</DialogTitle>
            <DialogDescription>This occasion will be soft-deleted. Existing recommendations with this tag will not be affected.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' size='sm' onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              size='sm'
              variant='destructive'
              disabled={deleteMutation.isPending}
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Page Root ─────────────────────────────────────────────────────────────────

const RecommendationsPageClient = () => {
  return (
    <div className='flex flex-col gap-6'>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className='flex items-center gap-3 mb-1'>
          <div className='w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center'>
            <Sparkles className='w-4 h-4 text-primary-600' />
          </div>
          <div>
            <h1 className='text-sm font-semibold text-grey-900'>Gift Recommendations</h1>
            <p className='text-xs text-grey-500'>Manage the gift catalog and occasions shown to users</p>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue='recommendations'>
        <TabsList>
          <TabsTrigger value='recommendations'>Recommendations</TabsTrigger>
          <TabsTrigger value='occasions'>Occasions</TabsTrigger>
        </TabsList>
        <TabsContent value='recommendations'>
          <RecommendationsTab />
        </TabsContent>
        <TabsContent value='occasions'>
          <OccasionsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RecommendationsPageClient
