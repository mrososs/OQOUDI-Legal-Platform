/**
 * Integration helpers: talk to the local Supabase stack directly and to the
 * Nuxt server (http://localhost:3000) with real auth cookies, exactly like a
 * browser would.
 */
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { deflateSync } from 'node:zlib'
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

/**
 * A valid PNG (solid colour) built with zlib, so tests need no binary
 * fixtures. `padTo` adds a tEXt chunk to reach (at least) that many bytes.
 */
export function samplePng(padTo = 0): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf: Buffer) => {
    let c = 0xFFFFFFFF
    for (const b of buf) c = crcTable[(c ^ b) & 0xFF]! ^ (c >>> 8)
    return (c ^ 0xFFFFFFFF) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const sum = Buffer.alloc(4)
    sum.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, sum])
  }
  const w = 16
  const h = 16
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolour
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) raw.set([200, 40, 40], y * (w * 3 + 1) + 1 + x * 3)
  }
  const parts = [
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
  ]
  const end = chunk('IEND', Buffer.alloc(0))
  const baseLength = Buffer.concat([...parts, end]).length
  if (padTo > baseLength + 20) {
    parts.push(chunk('tEXt', Buffer.concat([Buffer.from('Comment\0', 'latin1'), Buffer.alloc(padTo - baseLength - 20, 0x41)])))
  }
  return Buffer.concat([...parts, end])
}

export type ManualMethod = 'instapay' | 'vodafone_cash' | 'paypal'

/** Signs a proof upload and puts the bytes straight into the private bucket. Returns the object path. */
export async function uploadProof(session: Session, orderId: string, bytes: Buffer = samplePng(), fileName = 'proof.png', contentType = 'image/png') {
  const sign = await session.api<{ path: string, token: string }>(`/api/orders/${orderId}/payment-proof`, {
    method: 'POST',
    body: { fileName, sizeBytes: bytes.length, mimeType: contentType },
  })
  if (sign.status !== 200) throw new Error(`proof sign failed ${sign.status} ${JSON.stringify(sign.data)}`)
  const { error } = await anon.storage.from('payment-proofs').uploadToSignedUrl(sign.data.path, sign.data.token, bytes, { contentType })
  if (error) throw error
  return sign.data.path
}

/** Customer: upload a proof and submit it for review (pending_review). */
export async function submitProof(session: Session, orderId: string, method: ManualMethod = 'instapay') {
  const proofPath = await uploadProof(session, orderId)
  const res = await session.api<{ submissionId: string, paymentId: string, status: string }>(`/api/orders/${orderId}/manual-payment`, {
    method: 'POST',
    body: { method, proofPath },
  })
  if (res.status !== 200) throw new Error(`submit proof failed ${res.status} ${JSON.stringify(res.data)}`)
  return res.data
}

let adminSession: Session | null = null
export async function adminLogin() {
  adminSession ??= await login('admin@oqoudi.test')
  return adminSession
}

/** Full path: proof submission → admin approval → order paid and started. */
export async function payOrder(session: Session, orderId: string) {
  const { submissionId, paymentId } = await submitProof(session, orderId)
  const admin = await adminLogin()
  const res = await admin.api<{ result: string, orderStatus: string }>(`/api/admin/manual-payments/${submissionId}/approve`, { method: 'POST', body: { orderId } })
  if (res.status !== 200) throw new Error(`approve failed ${res.status} ${JSON.stringify(res.data)}`)
  return { submissionId, paymentId, result: res.data.result, orderStatus: res.data.orderStatus }
}

export async function orderRow(orderId: string) {
  const { data, error } = await service.from('orders').select('*').eq('id', orderId).single()
  if (error) throw error
  return data
}

export function errorCode(data: unknown): string | undefined {
  return (data as { data?: { code?: string } })?.data?.code
}
