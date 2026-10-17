import { z } from 'zod'
import { validateOnboarding } from '#shared/domain/onboarding'

/**
 * Shape only. Business rules (lengths, Egyptian mobile, company name) live in
 * `validateOnboarding`, shared with the form. Anything else the browser sends
 * (`userId`, `accountId`, `role`, `email`…) is ignored: the actor comes from
 * the verified session and every record is derived from it in SQL.
 */
const bodySchema = z.object({
  fullName: z.string().max(400),
  phone: z.string().max(60),
  accountKind: z.string().max(20),
  companyName: z.string().max(400).nullish(),
  locale: z.string().max(5).nullish(),
})

/**
 * First-time customer onboarding. One transactional, idempotent SQL function
 * updates the profile, the customer account created at signup and the
 * completion marker together.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  rateLimit(event, 'account.onboarding', 20, 60 * 60 * 1000)
  const body = await readBody_(event, bodySchema)

  const checked = validateOnboarding(body)
  if (!checked.ok) throw appError('OQ422_VALIDATION', checked.errors)
  const v = checked.value

  const result = await callFn(event, 'complete_customer_onboarding', {
    p_actor: actor.id,
    p_full_name: v.fullName,
    p_phone: v.phone,
    p_account_kind: v.accountKind,
    p_company_name: v.companyName ?? undefined,
    p_locale: v.locale ?? undefined,
  })

  return result as { status: 'completed' | 'already_completed' | 'not_required', accountId?: string, accountKind?: string, displayName?: string }
})
