import type { Database } from '#shared/types/database.types'
import type { Localized } from '#shared/domain/localized'
import { formFieldsSchema, type FormField } from '#shared/domain/formSchema'
import { LIST_SECTIONS, SECTION_KEYS, type SectionKey } from '#shared/domain/serviceSections'
import { egpToMinor, minorToEgpInput, serviceInputSchema, type ServiceInput } from '#shared/domain/serviceAdmin'
import { completeSections, fetchServiceForEditor, type ServiceEditorData } from '~/repositories/admin'

export interface AddonDraft {
  key: string
  id: string | null
  title: Localized
  priceInput: string
  isActive: boolean
}

export interface SectionDraft {
  key: SectionKey
  isEnabled: boolean
  /** about */
  text: Localized
  /** who / included / deliverables / docs / steps */
  items: Localized[]
  /** faq */
  faqs: { q: Localized, a: Localized }[]
}

export interface ServiceDraft {
  slug: string
  kind: ServiceInput['kind']
  primaryCategoryId: string
  categoryIds: string[]
  title: Localized
  shortDescription: Localized
  deliveryEstimate: Localized
  pricingType: ServiceInput['pricingType']
  priceInput: string
  meetingDurationMinutes: number | null
  isFeatured: boolean
  sortOrder: number
  addons: AddonDraft[]
  sections: SectionDraft[]
}

let keySeq = 0
export const nextKey = () => `k${++keySeq}`

const emptyL = (): Localized => ({ ar: '', en: '' })
const copyL = (v: unknown): Localized => {
  const l = v as Localized | null
  return { ar: l?.ar ?? '', en: l?.en ?? '' }
}

function sectionToDraft(key: SectionKey, isEnabled: boolean, content: unknown): SectionDraft {
  const draft: SectionDraft = { key, isEnabled, text: emptyL(), items: [], faqs: [] }
  if (key === 'about') draft.text = copyL(content)
  else if (key === 'faq' && Array.isArray(content)) draft.faqs = content.map(x => ({ q: copyL(x?.q), a: copyL(x?.a) }))
  else if (Array.isArray(content)) draft.items = content.map(copyL)
  return draft
}

function defaultSections(): SectionDraft[] {
  const on: SectionKey[] = ['about', 'included', 'deliverables', 'duration', 'pricing', 'reviews']
  return SECTION_KEYS.map(k => sectionToDraft(k, on.includes(k), null))
}

export function draftFromData(d: ServiceEditorData | null, defaultCategoryId: string): ServiceDraft {
  if (!d) {
    return {
      slug: '',
      kind: 'standard',
      primaryCategoryId: defaultCategoryId,
      categoryIds: [],
      title: emptyL(),
      shortDescription: emptyL(),
      deliveryEstimate: emptyL(),
      pricingType: 'fixed',
      priceInput: '',
      meetingDurationMinutes: null,
      isFeatured: false,
      sortOrder: 0,
      addons: [],
      sections: defaultSections(),
    }
  }
  return {
    slug: d.slug,
    kind: d.kind,
    primaryCategoryId: d.primaryCategoryId,
    categoryIds: [...d.categoryIds],
    title: copyL(d.title),
    shortDescription: copyL(d.shortDescription),
    deliveryEstimate: copyL(d.deliveryEstimate),
    pricingType: d.pricingType,
    priceInput: minorToEgpInput(d.basePriceMinor),
    meetingDurationMinutes: d.meetingDurationMinutes,
    isFeatured: d.isFeatured,
    sortOrder: d.sortOrder,
    addons: d.addons.map(a => ({ key: nextKey(), id: a.id, title: copyL(a.title), priceInput: minorToEgpInput(a.priceMinor), isActive: a.isActive })),
    sections: completeSections(d.sections).map(s => sectionToDraft(s.key, s.isEnabled, s.content)),
  }
}

const trimL = (l: Localized): Localized => ({ ar: l.ar.trim(), en: (l.en ?? '').trim() || null })

/** Draft → API payload. Empty list rows are dropped; untouched disabled sections are omitted. */
export function draftToPayload(d: ServiceDraft): unknown {
  const sections = d.sections.flatMap((s) => {
    let content: unknown = null
    if (s.key === 'about') {
      if (!s.text.ar.trim()) return s.isEnabled ? [{ key: s.key, isEnabled: true, content: null }] : []
      content = trimL(s.text)
    }
    else if (s.key === 'faq') {
      content = s.faqs.filter(f => f.q.ar.trim() && f.a.ar.trim()).map(f => ({ q: trimL(f.q), a: trimL(f.a) }))
    }
    else if (LIST_SECTIONS.includes(s.key) || s.key === 'steps') {
      content = s.items.filter(i => i.ar.trim()).map(trimL)
    }
    return [{ key: s.key, isEnabled: s.isEnabled, content }]
  })
  return {
    slug: d.slug.trim(),
    kind: d.kind,
    primaryCategoryId: d.primaryCategoryId,
    categoryIds: d.categoryIds.filter(c => c !== d.primaryCategoryId),
    title: trimL(d.title),
    shortDescription: trimL(d.shortDescription),
    deliveryEstimate: trimL(d.deliveryEstimate),
    pricingType: d.kind === 'standard' ? d.pricingType : 'fixed',
    basePriceMinor: egpToMinor(d.priceInput) ?? -1,
    meetingDurationMinutes: d.kind === 'video_consultation' ? (d.meetingDurationMinutes ?? 30) : null,
    isFeatured: d.isFeatured,
    sortOrder: d.sortOrder,
    addons: d.addons
      .filter(a => a.id || a.title.ar.trim())
      .map(a => ({ id: a.id, title: trimL(a.title), priceMinor: egpToMinor(a.priceInput) ?? -1, isActive: a.isActive })),
    sections,
  }
}

/** Issue path → first message code, e.g. { 'title.ar': 'too_small', 'sections.0.content': 'invalid_section_about' }. */
export function issuesByPath(payload: unknown): Record<string, string> {
  const res = serviceInputSchema.safeParse(payload)
  if (res.success) return {}
  const out: Record<string, string> = {}
  for (const i of res.error.issues) {
    const key = i.path.join('.')
    if (out[key]) continue
    if (/^[a-z_]+$/.test(i.message)) out[key] = i.message
    else if (i.code === 'too_small' && /priceMinor|basePriceMinor/i.test(key)) out[key] = 'price'
    else if (i.code === 'too_small') out[key] = 'required'
    else if (i.code === 'too_big') out[key] = 'too_long'
    else out[key] = 'invalid'
  }
  return out
}

/**
 * State + actions of the service editor page. The page and its tab
 * components share one draft; all writes go through the admin API.
 */
export function useServiceEditor(serviceId: Ref<string>) {
  const supabase = useSupabaseClient<Database>()
  const { call, toFailure } = useApi()
  const toast = useToast()
  const { t } = useI18n()

  const isNew = computed(() => serviceId.value === 'new')
  const loaded = useAsyncData(
    () => `admin:service:${serviceId.value}`,
    () => (isNew.value ? Promise.resolve(null) : fetchServiceForEditor(supabase, serviceId.value)),
  )
  const { data, refresh, status } = loaded

  const draft = ref<ServiceDraft>(draftFromData(null, ''))
  const fields = ref<FormField[]>([])
  const savedSnapshot = shallowRef('')
  const savedFieldsSnapshot = shallowRef('')
  const busy = shallowRef<'save' | 'publish' | 'status' | 'form' | null>(null)
  const error = shallowRef('')
  const issues = ref<Record<string, string>>({})

  function resetFrom(d: ServiceEditorData | null, defaultCategoryId: string) {
    draft.value = draftFromData(d, defaultCategoryId)
    fields.value = structuredClone(d?.draftForm?.fields ?? d?.publishedForm?.fields ?? [])
    savedSnapshot.value = JSON.stringify(draftToPayload(draft.value))
    savedFieldsSnapshot.value = JSON.stringify(fields.value)
  }

  const dirty = computed(() => JSON.stringify(draftToPayload(draft.value)) !== savedSnapshot.value)
  const formDirty = computed(() => JSON.stringify(fields.value) !== savedFieldsSnapshot.value)
  const statusValue = computed(() => data.value?.status ?? 'draft')
  const hasDraftForm = computed(() => !!data.value?.draftForm || formDirty.value)
  const publishedVersion = computed(() => data.value?.publishedForm?.version ?? null)

  function validate(): unknown | null {
    const payload = draftToPayload(draft.value)
    issues.value = issuesByPath(payload)
    if (Object.keys(issues.value).length) {
      error.value = t('admin.editor.fixErrors')
      return null
    }
    return payload
  }

  /** Saves service data and (if changed) the form draft. Returns the service id. */
  async function save(): Promise<string | null> {
    error.value = ''
    const payload = validate()
    if (!payload) return null
    if (formDirty.value || (isNew.value && fields.value.length)) {
      const parsed = formFieldsSchema.safeParse(fields.value)
      if (!parsed.success) {
        error.value = t('admin.form.invalid')
        return null
      }
    }
    busy.value = 'save'
    try {
      const res = await call<{ id: string }>('/api/admin/services/save', {
        method: 'POST',
        body: { id: isNew.value ? null : serviceId.value, data: payload },
      })
      if (formDirty.value && fields.value.length) {
        await call(`/api/admin/services/${res.id}/form`, { method: 'POST', body: { fields: fields.value } })
      }
      savedSnapshot.value = JSON.stringify(payload)
      savedFieldsSnapshot.value = JSON.stringify(fields.value)
      toast.success(t('admin.editor.saved'))
      return res.id
    }
    catch (err) {
      const f = toFailure(err)
      error.value = f.message
      if (f.code === 'OQ409_SLUG_TAKEN') issues.value = { ...issues.value, slug: 'slug_taken' }
      return null
    }
    finally {
      busy.value = null
    }
  }

  async function publish(): Promise<string | null> {
    const id = (dirty.value || formDirty.value || isNew.value) ? await save() : serviceId.value
    if (!id) return null
    busy.value = 'publish'
    try {
      await call(`/api/admin/services/${id}/publish`, { method: 'POST' })
      toast.success(t('admin.editor.published'))
      return id
    }
    catch (err) {
      error.value = toFailure(err).message
      return null
    }
    finally {
      busy.value = null
    }
  }

  async function setStatus(next: 'draft' | 'archived') {
    busy.value = 'status'
    error.value = ''
    try {
      await call(`/api/admin/services/${serviceId.value}/status`, { method: 'POST', body: { status: next } })
      await refresh()
      toast.success(t('admin.editor.statusChanged'))
    }
    catch (err) {
      error.value = toFailure(err).message
    }
    finally {
      busy.value = null
    }
  }

  async function discardFormDraft() {
    busy.value = 'form'
    try {
      await call(`/api/admin/services/${serviceId.value}/form`, { method: 'DELETE' })
      await refresh()
      fields.value = structuredClone(data.value?.publishedForm?.fields ?? [])
      savedFieldsSnapshot.value = JSON.stringify(fields.value)
    }
    catch (err) {
      error.value = toFailure(err).message
    }
    finally {
      busy.value = null
    }
  }

  return {
    /** Await in the page to SSR the editor with data. */
    ready: loaded,
    data, status, refresh, isNew, draft, fields, dirty, formDirty, statusValue, hasDraftForm, publishedVersion,
    busy, error, issues, resetFrom, save, publish, setStatus, discardFormDraft,
  }
}
