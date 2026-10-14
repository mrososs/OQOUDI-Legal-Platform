import { z } from 'zod'
import { serverSupabaseUser } from '#supabase/server'

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().transform(v => v.replace(/[\s-]/g, '')).pipe(z.string().regex(/^(\+20|0)1[0125]\d{8}$/)),
  email: z.union([z.literal(''), z.email()]).optional(),
  message: z.string().trim().min(10).max(4000),
  /** honeypot — must stay empty */
  website: z.string().max(0).optional(),
})

/** Public contact form — rate limited, stored for admins only. */
export default defineEventHandler(async (event) => {
  rateLimit(event, 'contact', 5, 15 * 60 * 1000)
  const body = await readBody_(event, bodySchema)
  const claims = await serverSupabaseUser(event).catch(() => null)
  const { error } = await adminClient(event).from('contact_messages').insert({
    name: body.name,
    phone: body.phone,
    email: body.email || null,
    message: body.message,
    user_id: claims?.sub ?? null,
  })
  if (error) throw fromDbError(error, 'contact_messages.insert')
  return { ok: true }
})
