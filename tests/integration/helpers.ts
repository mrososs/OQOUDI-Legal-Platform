/**
 * Integration helpers: talk to the local Supabase stack directly and to the
 * Nuxt server (http://localhost:3000) with real auth cookies, exactly like a
 * browser would.
 */
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import pg from 'pg'
import type { Database } from '../../shared/types/database.types'

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(new URL('../../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]!] = m[2]!
  }
  return out
}

export const env = loadEnv()
export const SUPABASE_URL = env.SUPABASE_URL!
export const PUBLISHABLE_KEY = env.SUPABASE_KEY!
export const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'
export const DB_URL = process.env.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:55322/postgres'
export const PASSWORD = 'Oqoudi123'

/** Service-role client — plays the role of the trusted server in tests. */
export const service: SupabaseClient<Database> = createClient<Database>(SUPABASE_URL, env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export const anon: SupabaseClient<Database> = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()
  try {
    return (await client.query(text, params)).rows as T[]
  }
  finally {
    await client.end()
  }
}

export interface Session {
  userId: string
  email: string
  /** RLS-scoped Supabase client for this user. */
  db: SupabaseClient<Database>
  /** Calls a Nuxt API route with this user's auth cookies. */
  api: <T = unknown>(path: string, init?: { method?: string, body?: unknown, headers?: Record<string, string> }) => Promise<{ status: number, data: T }>
}

export async function login(email: string, password = PASSWORD): Promise<Session> {
  const jar = new Map<string, string>()
  const db = createServerClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const c of cookies) {
          if (c.value) jar.set(c.name, c.value)
          else jar.delete(c.name)
        }
      },
    },
  })
  const { data, error } = await db.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw new Error(`login failed for ${email}: ${error?.message}`)

  const api: Session['api'] = async (path, init = {}) => {
    const res = await fetch(`${APP_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        'cookie': [...jar].map(([n, v]) => `${n}=${v}`).join('; '),
        ...init.headers,
      },
      body: init.body === undefined ? undefined : typeof init.body === 'string' ? init.body : JSON.stringify(init.body),
    })
    const text = await res.text()
    let parsed: unknown = text
    try {
      parsed = JSON.parse(text)
    }
    catch {
      // non-JSON response body (e.g. HTML error page) — keep raw text
    }
    return { status: res.status, data: parsed as never }
  }

  return { userId: data.user.id, email, db: db as unknown as SupabaseClient<Database>, api }
}

/** Fresh confirmed customer (individual) for isolation tests. */
export async function newCustomer(label = 'cust'): Promise<Session> {
  const email = `${label}-${randomUUID().slice(0, 8)}@test.oqoudi.local`
  const { error } = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `عميل اختبار ${label}`, account_type: 'individual', phone: '+201001112233' },
  })
  if (error) throw error
  return login(email)
}

export async function serviceBySlug(slug: string) {
  const { data, error } = await service
    .from('services')
    .select('id, slug, base_price_minor, published_form_version_id')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

/** Uploads a small PDF through the real signed-upload flow and returns the document id. */
export async function uploadPdf(session: Session, target: { purpose: 'form' | 'message' | 'deliverable' | 'response', formVersionId?: string, fieldId?: string, orderId?: string }, name = 'test.pdf'): Promise<string> {
  const bytes = Buffer.from(`%PDF-1.4\n% oqoudi test ${randomUUID()}\n%%EOF\n`)
  const sign = await session.api<{ documentId: string, path: string, token: string, contentType: string }>('/api/uploads', {
    method: 'POST',
    body: { purpose: target.purpose, fileName: name, sizeBytes: bytes.length, formVersionId: target.formVersionId ?? null, fieldId: target.fieldId ?? null, orderId: target.orderId ?? null },
  })
  if (sign.status !== 200) throw new Error(`upload sign failed ${sign.status} ${JSON.stringify(sign.data)}`)
  const { error } = await anon.storage.from('order-documents').uploadToSignedUrl(sign.data.path, sign.data.token, bytes, { contentType: sign.data.contentType })
  if (error) throw error
  const done = await session.api(`/api/uploads/${sign.data.documentId}/complete`, { method: 'POST' })
  if (done.status !== 200) throw new Error(`upload complete failed ${done.status} ${JSON.stringify(done.data)}`)
  return sign.data.documentId
}

/** Creates a legal-notice order (fixed price) for the customer. */
export async function createLegalNoticeOrder(session: Session, withFile = false) {
  const svc = await serviceBySlug('legal-notice')
  const files = withFile
    ? [await uploadPdf(session, { purpose: 'form', formVersionId: svc.published_form_version_id!, fieldId: 'files' }, 'إيصال-أمانة.pdf')]
    : []
  const res = await session.api<{ id: string, orderNumber: string, status: string }>('/api/orders', {
    method: 'POST',
    body: {
      serviceId: svc.id,
      formVersionId: svc.published_form_version_id,
      answers: { subject: 'payment', recipient: 'شركة الاختبار', facts: 'وقائع تجريبية كافية الطول لاختبار النموذج والتحقق منه.', files },
      addonIds: [],
    },
  })
  if (res.status !== 200) throw new Error(`create order failed ${res.status} ${JSON.stringify(res.data)}`)
  return { ...res.data, fileIds: files }
}

export async function startCheckout(session: Session, orderId: string) {
  const res = await session.api<{ paymentId: string, redirectUrl: string }>(`/api/orders/${orderId}/checkout`, { method: 'POST', body: { method: 'card' } })
  if (res.status !== 200) throw new Error(`checkout failed ${res.status} ${JSON.stringify(res.data)}`)
  return res.data
}

/** Full path: checkout → simulated gateway → signed webhook → paid. */
export async function payOrder(session: Session, orderId: string, outcome: 'success' | 'failure' = 'success') {
  const { paymentId } = await startCheckout(session, orderId)
  const res = await session.api<{ result: string }>(`/api/dev/payment-simulator/${paymentId}`, { method: 'POST', body: { outcome } })
  if (res.status !== 200) throw new Error(`simulator failed ${res.status} ${JSON.stringify(res.data)}`)
  return { paymentId, result: res.data.result }
}

export async function orderRow(orderId: string) {
  const { data, error } = await service.from('orders').select('*').eq('id', orderId).single()
  if (error) throw error
  return data
}

export function errorCode(data: unknown): string | undefined {
  return (data as { data?: { code?: string } })?.data?.code
}
