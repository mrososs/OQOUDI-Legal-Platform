import { beforeAll, describe, expect, it } from 'vitest'
import {
  adminLogin,
  anon,
  APP_URL,
  createLegalNoticeOrder,
  errorCode,
  login,
  newCustomer,
  orderRow,
  payOrder,
  samplePng,
  service,
  sql,
  submitProof,
  uploadProof,
  type Session,
} from './helpers'

/**
 * Manual payment verification: proof submission → admin approval/rejection.
 * Exercises the real server routes, SQL functions, storage and RLS.
 */
describe('manual payments', () => {
  let customer: Session
  let admin: Session

  beforeAll(async () => {
    customer = await newCustomer('mpay')
    admin = await adminLogin()
  })

  it('a submitted proof is pending review and does not start the order', async () => {
    const order = await createLegalNoticeOrder(customer)
    const sub = await submitProof(customer, order.id, 'instapay')
    expect(sub.status).toBe('pending_review')

    const row = await orderRow(order.id)
    expect(row.status).toBe('awaiting_payment')
    expect(row.payment_status).toBe('unpaid')

    const [submission] = await sql<{ verification_status: string, demo_mode: boolean, expected_amount_minor: string, proof_storage_path: string }>(
      'select verification_status, demo_mode, expected_amount_minor, proof_storage_path from manual_payment_submissions where id = $1', [sub.submissionId])
    expect(submission?.verification_status).toBe('pending_review')
    expect(submission?.demo_mode).toBe(true)
    expect(Number(submission?.expected_amount_minor)).toBe(row.total_minor)
    expect(submission?.proof_storage_path.startsWith(`${order.id}/${customer.userId}/`)).toBe(true)

    const [payment] = await sql<{ status: string, provider: string, is_demo: boolean }>('select status, provider, is_demo from payments where id = $1', [sub.paymentId])
    expect(payment).toEqual({ status: 'pending', provider: 'manual', is_demo: true })

    const notes = await sql<{ type: string, payload: Record<string, unknown> }>('select type, payload from notifications where order_id = $1', [order.id])
    expect(notes.map(n => n.type)).toEqual(expect.arrayContaining(['payment.proof_submitted', 'payment.review_pending']))
    const adminNote = notes.find(n => n.type === 'payment.review_pending')!
    expect(adminNote.payload.submissionId).toBe(sub.submissionId)
    expect(JSON.stringify(adminNote.payload)).not.toContain('payment-proofs')
    expect(JSON.stringify(adminNote.payload)).not.toContain(submission!.proof_storage_path)

    const events = await sql<{ type: string }>(`select type from order_events where order_id = $1 and type like 'payment.%'`, [order.id])
    expect(events.map(e => e.type)).toContain('payment.proof_submitted')
  })

  it('blocks a second submission while one is pending', async () => {
    const order = await createLegalNoticeOrder(customer)
    await submitProof(customer, order.id)
    const path = await uploadProof(customer, order.id)
    const res = await customer.api(`/api/orders/${order.id}/manual-payment`, { method: 'POST', body: { method: 'vodafone_cash', proofPath: path } })
    expect(res.status).toBe(409)
    expect(errorCode(res.data)).toBe('OQ409_PAYMENT_PENDING_REVIEW')
  })

  it('approval marks the payment succeeded and starts the order with a lawyer', async () => {
    const order = await createLegalNoticeOrder(customer)
    const { submissionId, paymentId, orderStatus } = await payOrder(customer, order.id)
    expect(orderStatus).toBe('in_progress')

    const row = await orderRow(order.id)
    expect(row.payment_status).toBe('paid')
    expect(row.status).toBe('in_progress')
    expect(row.assigned_lawyer_id).not.toBeNull()

    const [payment] = await sql<{ status: string, receipt_number: string }>('select status, receipt_number from payments where id = $1', [paymentId])
    expect(payment?.status).toBe('succeeded')
    expect(payment?.receipt_number).toMatch(/^DEMO-RC-\d+$/)

    const [sub] = await sql<{ verification_status: string, reviewed_by: string }>('select verification_status, reviewed_by from manual_payment_submissions where id = $1', [submissionId])
    expect(sub).toEqual({ verification_status: 'approved', reviewed_by: admin.userId })

    const customerNotes = await sql<{ type: string }>('select type from notifications where order_id = $1 and user_id = $2', [order.id, customer.userId])
    expect(customerNotes.map(n => n.type)).toEqual(expect.arrayContaining(['payment.approved', 'order.started']))
    const lawyerNotes = await sql<{ type: string }>('select type from notifications where order_id = $1 and user_id = $2', [order.id, row.assigned_lawyer_id])
    expect(lawyerNotes.map(n => n.type)).toContain('order.assigned')

    const audit = await sql<{ action: string }>(`select action from audit_logs where entity_type = 'manual_payment_submission' and entity_id = $1 order by id`, [submissionId])
    expect(audit.map(a => a.action)).toEqual(['manual_payment.submit', 'manual_payment.approve'])

    const history = await sql<{ from_status: string, to_status: string }>(`select from_status, to_status from order_events where order_id = $1 and type = 'order.status_changed' order by created_at`, [order.id])
    expect(history.at(-1)).toEqual({ from_status: 'awaiting_payment', to_status: 'in_progress' })
  })

  it('the assigned lawyer sees the started order in their queue', async () => {
    const order = await createLegalNoticeOrder(customer)
    await payOrder(customer, order.id)
    const row = await orderRow(order.id)
    const [profile] = await sql<{ email: string }>('select email from profiles where id = $1', [row.assigned_lawyer_id])
    const assignee = await login(profile!.email)
    const { data } = await assignee.db.from('orders').select('id, status').eq('id', order.id)
    expect(data).toEqual([{ id: order.id, status: 'in_progress' }])
  })

  it('cannot approve twice, even concurrently', async () => {
    const order = await createLegalNoticeOrder(customer)
    const { submissionId } = await submitProof(customer, order.id)
    const results = await Promise.all([1, 2, 3].map(() =>
      admin.api(`/api/admin/manual-payments/${submissionId}/approve`, { method: 'POST', body: { orderId: order.id } })))
    expect(results.filter(r => r.status === 200)).toHaveLength(1)
    expect(results.filter(r => r.status === 409).map(r => errorCode(r.data))).toEqual(['OQ409_PAYMENT_REVIEWED', 'OQ409_PAYMENT_REVIEWED'])
    const { count } = await service.from('payments').select('id', { count: 'exact', head: true }).eq('order_id', order.id).eq('status', 'succeeded')
    expect(count).toBe(1)

    const reject = await admin.api(`/api/admin/manual-payments/${submissionId}/reject`, { method: 'POST', body: { orderId: order.id } })
    expect(reject.status).toBe(409)
    expect(errorCode(reject.data)).toBe('OQ409_PAYMENT_REVIEWED')
  })

  it('refuses to approve a submission against the wrong order', async () => {
    const a = await createLegalNoticeOrder(customer)
    const b = await createLegalNoticeOrder(customer)
    const { submissionId } = await submitProof(customer, a.id)
    const res = await admin.api(`/api/admin/manual-payments/${submissionId}/approve`, { method: 'POST', body: { orderId: b.id } })
    expect(res.status).toBe(409)
    expect(errorCode(res.data)).toBe('OQ409_PAYMENT_ORDER_MISMATCH')
    expect((await orderRow(a.id)).payment_status).toBe('unpaid')
  })

  it('rejection keeps the order blocked, keeps the evidence and notifies the customer', async () => {
    const order = await createLegalNoticeOrder(customer)
    const { submissionId, paymentId } = await submitProof(customer, order.id, 'paypal')
    const res = await admin.api<{ result: string, remainingAttempts: number }>(`/api/admin/manual-payments/${submissionId}/reject`, {
      method: 'POST',
      body: { orderId: order.id, reason: 'المبلغ في الصورة غير واضح' },
    })
    expect(res.status).toBe(200)
    expect(res.data).toEqual({ result: 'rejected', remainingAttempts: 2 })

    const row = await orderRow(order.id)
    expect(row.status).toBe('awaiting_payment')
    expect(row.payment_status).toBe('failed')
    const [payment] = await sql<{ status: string }>('select status from payments where id = $1', [paymentId])
    expect(payment?.status).toBe('failed')
    const [sub] = await sql<{ verification_status: string, rejection_reason: string, proof_storage_path: string }>(
      'select verification_status, rejection_reason, proof_storage_path from manual_payment_submissions where id = $1', [submissionId])
    expect(sub?.verification_status).toBe('rejected')
    expect(sub?.rejection_reason).toBe('المبلغ في الصورة غير واضح')

    const folder = sub!.proof_storage_path.split('/').slice(0, 2).join('/')
    const { data: objects } = await service.storage.from('payment-proofs').list(folder)
    expect(objects?.some(o => sub!.proof_storage_path.endsWith(o.name))).toBe(true)

    const notes = await sql<{ type: string }>('select type from notifications where order_id = $1 and user_id = $2', [order.id, customer.userId])
    expect(notes.map(n => n.type)).toContain('payment.rejected')

    // The customer reads the decision (and reason) through RLS.
    const { data: own } = await customer.db.from('manual_payment_submissions').select('verification_status, rejection_reason').eq('id', submissionId).single()
    expect(own?.verification_status).toBe('rejected')
  })

  it('allows a limited number of resubmissions after rejection', async () => {
    const order = await createLegalNoticeOrder(customer)
    for (let i = 0; i < 3; i++) {
      const { submissionId } = await submitProof(customer, order.id)
      const r = await admin.api(`/api/admin/manual-payments/${submissionId}/reject`, { method: 'POST', body: { orderId: order.id } })
      expect(r.status).toBe(200)
    }
    const path = await uploadProof(customer, order.id)
    const res = await customer.api(`/api/orders/${order.id}/manual-payment`, { method: 'POST', body: { method: 'instapay', proofPath: path } })
    expect(res.status).toBe(409)
    expect(errorCode(res.data)).toBe('OQ409_PAYMENT_ATTEMPTS_EXCEEDED')
  })

  it('a proof left pending on a cancelled order can be rejected but not approved', async () => {
    const order = await createLegalNoticeOrder(customer)
    const { submissionId } = await submitProof(customer, order.id)
    const cancel = await customer.api(`/api/orders/${order.id}/cancel`, { method: 'POST', body: {} })
    expect(cancel.status).toBe(200)
    const approve = await admin.api(`/api/admin/manual-payments/${submissionId}/approve`, { method: 'POST', body: { orderId: order.id } })
    expect(approve.status).toBe(409)
    expect(errorCode(approve.data)).toBe('OQ409_NOT_PAYABLE')
    const reject = await admin.api(`/api/admin/manual-payments/${submissionId}/reject`, { method: 'POST', body: { orderId: order.id, reason: 'الطلب ملغي' } })
    expect(reject.status).toBe(200)
    expect((await orderRow(order.id)).status).toBe('cancelled')
  })

  it('a rejected order can still be paid by a later approved proof', async () => {
    const order = await createLegalNoticeOrder(customer)
    const first = await submitProof(customer, order.id)
    await admin.api(`/api/admin/manual-payments/${first.submissionId}/reject`, { method: 'POST', body: { orderId: order.id } })
    const second = await payOrder(customer, order.id)
    expect(second.result).toBe('approved')
    const row = await orderRow(order.id)
    expect(row.payment_status).toBe('paid')
    expect(row.total_minor).toBe(90000)
  })
})

describe('manual payment security', () => {
  let customer: Session
  let other: Session
  let lawyer: Session
  let order: { id: string, orderNumber: string }
  let submissionId: string

  beforeAll(async () => {
    customer = await newCustomer('mpsec')
    other = await newCustomer('mpother')
    lawyer = await login('karim@oqoudi.test')
    order = await createLegalNoticeOrder(customer)
    ;({ submissionId } = await submitProof(customer, order.id))
  })

  it('customers and lawyers cannot approve or reject', async () => {
    for (const actor of [customer, lawyer]) {
      const approve = await actor.api(`/api/admin/manual-payments/${submissionId}/approve`, { method: 'POST', body: { orderId: order.id } })
      expect(approve.status).toBe(403)
      const reject = await actor.api(`/api/admin/manual-payments/${submissionId}/reject`, { method: 'POST', body: { orderId: order.id } })
      expect(reject.status).toBe(403)
      const list = await actor.api('/api/admin/manual-payments')
      expect(list.status).toBe(403)
    }
    expect((await orderRow(order.id)).payment_status).toBe('unpaid')
  })

  it('the SQL decision functions re-check the admin role', async () => {
    const { error } = await service.rpc('manual_payment_approve', { p_actor: lawyer.userId, p_submission: submissionId, p_order: order.id })
    expect(error?.message).toBe('OQ403')
  })

  it('customers cannot change verification status or mark orders paid directly', async () => {
    const upd = await customer.db.from('manual_payment_submissions').update({ verification_status: 'approved' }).eq('id', submissionId).select()
    expect(upd.error ?? upd.data?.length === 0).toBeTruthy()
    const paid = await customer.db.from('orders').update({ payment_status: 'paid' }).eq('id', order.id).select()
    expect(paid.error ?? paid.data?.length === 0).toBeTruthy()
    const ins = await customer.db.from('manual_payment_submissions').insert({
      order_id: order.id, customer_account_id: order.id, payment_id: order.id, payment_method: 'instapay', expected_amount_minor: 1,
      proof_storage_path: 'x', proof_mime_type: 'image/png', proof_size_bytes: 1, demo_mode: true, submitted_by: customer.userId,
    })
    expect(ins.error).not.toBeNull()
    const [sub] = await sql<{ verification_status: string }>('select verification_status from manual_payment_submissions where id = $1', [submissionId])
    expect(sub?.verification_status).toBe('pending_review')
  })

  it('only the owner and admins can get a proof preview URL', async () => {
    const own = await customer.api<{ url: string, expiresIn: number }>(`/api/payments/manual/${submissionId}/proof`)
    expect(own.status).toBe(200)
    expect(own.data.expiresIn).toBe(60)
    const img = await fetch(own.data.url)
    expect(img.status).toBe(200)
    expect(img.headers.get('content-type')).toContain('image/png')

    const adminRes = await (await adminLogin()).api(`/api/payments/manual/${submissionId}/proof`)
    expect(adminRes.status).toBe(200)

    expect((await other.api(`/api/payments/manual/${submissionId}/proof`)).status).toBe(404)
    expect((await lawyer.api(`/api/payments/manual/${submissionId}/proof`)).status).toBe(404)
    const anonRes = await fetch(`${APP_URL}/api/payments/manual/${submissionId}/proof`)
    expect(anonRes.status).toBe(401)
  })

  it('the proof bucket is private (no public URL access)', async () => {
    const [row] = await sql<{ proof_storage_path: string }>('select proof_storage_path from manual_payment_submissions where id = $1', [submissionId])
    const { data } = anon.storage.from('payment-proofs').getPublicUrl(row!.proof_storage_path)
    expect((await fetch(data.publicUrl)).status).toBeGreaterThanOrEqual(400)
    const { error } = await anon.storage.from('payment-proofs').download(row!.proof_storage_path)
    expect(error).not.toBeNull()
  })

  it('another customer cannot upload or submit for someone else’s order', async () => {
    const sign = await other.api(`/api/orders/${order.id}/payment-proof`, { method: 'POST', body: { fileName: 'p.png', sizeBytes: 100 } })
    expect(sign.status).toBe(404)
    const target = await createLegalNoticeOrder(other)
    // A path issued for customer's order cannot be attached to other's order.
    const path = await uploadProof(customer, (await createLegalNoticeOrder(customer)).id)
    const res = await other.api(`/api/orders/${target.id}/manual-payment`, { method: 'POST', body: { method: 'instapay', proofPath: path } })
    expect(res.status).toBe(422)
    expect(errorCode(res.data)).toBe('OQ422_PROOF_INVALID')
  })

  it('rejects unauthenticated uploads', async () => {
    const res = await fetch(`${APP_URL}/api/orders/${order.id}/payment-proof`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fileName: 'p.png', sizeBytes: 100 }),
    })
    expect(res.status).toBe(401)
  })

  it('rejects wrong types and oversized files', async () => {
    const fresh = await createLegalNoticeOrder(customer)
    const pdf = await customer.api(`/api/orders/${fresh.id}/payment-proof`, { method: 'POST', body: { fileName: 'proof.pdf', sizeBytes: 100 } })
    expect(errorCode(pdf.data)).toBe('OQ422_PROOF_TYPE')
    const big = await customer.api(`/api/orders/${fresh.id}/payment-proof`, { method: 'POST', body: { fileName: 'proof.png', sizeBytes: 6 * 1024 * 1024 } })
    expect(errorCode(big.data)).toBe('OQ422_PROOF_SIZE')

    // Declared small, actually > 5 MB: the private bucket refuses the bytes.
    await expect(uploadProof(customer, fresh.id, samplePng(5 * 1024 * 1024 + 2048))).rejects.toBeTruthy()

    // A non-image renamed to .png is detected by magic bytes and deleted.
    const fakePath = await uploadProof(customer, fresh.id, Buffer.from('%PDF-1.4 not an image'), 'proof.png')
    const res = await customer.api(`/api/orders/${fresh.id}/manual-payment`, { method: 'POST', body: { method: 'instapay', proofPath: fakePath } })
    expect(res.status).toBe(422)
    expect(errorCode(res.data)).toBe('OQ422_PROOF_TYPE')
    const { data: gone } = await service.storage.from('payment-proofs').download(fakePath)
    expect(gone).toBeNull()
  })

  it('the retired gateway cannot bypass manual verification', async () => {
    const fresh = await createLegalNoticeOrder(customer)
    const checkout = await customer.api(`/api/orders/${fresh.id}/checkout`, { method: 'POST', body: { method: 'card' } })
    expect(checkout.status).toBe(404)
    const webhook = await fetch(`${APP_URL}/api/payments/webhook/simulator`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    expect(webhook.status).toBe(404)
    const simulator = await customer.api(`/api/dev/payment-simulator/${fresh.id}`, { method: 'POST', body: { outcome: 'success' } })
    expect(simulator.status).toBe(404)
    const { error } = await service.rpc('payment_start', { p_actor: customer.userId, p_order: fresh.id, p_method: 'card', p_provider: 'simulator' })
    expect(error?.message).toBe('OQ410_GATEWAY_RETIRED')
    expect((await orderRow(fresh.id)).payment_status).toBe('unpaid')
  })

  it('review decisions and the audit trail are immutable', async () => {
    const fresh = await createLegalNoticeOrder(customer)
    const { submissionId: decided } = await payOrder(customer, fresh.id)
    await expect(sql(`update manual_payment_submissions set verification_status = 'rejected', rejection_reason = 'x' where id = $1`, [decided])).rejects.toThrow(/OQ409_PAYMENT_IMMUTABLE/)
    await expect(sql('delete from manual_payment_submissions where id = $1', [decided])).rejects.toThrow(/OQ409_PAYMENT_IMMUTABLE/)
    await expect(sql(`update audit_logs set action = 'tampered' where entity_id = $1`, [decided])).rejects.toThrow(/OQ409_AUDIT_IMMUTABLE/)
  })

  it('demo approvals are excluded from revenue', async () => {
    const [kpi] = await sql<{ demo: string }>(`select coalesce(sum(amount_minor), 0) as demo from payments where status = 'succeeded' and is_demo`)
    expect(Number(kpi?.demo)).toBeGreaterThan(0)
    const admin = await adminLogin()
    const { data } = await admin.db.rpc('dashboard_kpis')
    const [real] = await sql<{ real: string }>(`select coalesce(sum(amount_minor), 0) as real from payments where status = 'succeeded' and not is_demo and succeeded_at >= date_trunc('month', now())`)
    expect(Number((data as { revenueThisMonthMinor: number }).revenueThisMonthMinor)).toBe(Number(real?.real))
  })
})
