import { beforeAll, describe, expect, it } from 'vitest'
import { createLegalNoticeOrder, errorCode, login, newCustomer, orderRow, payOrder, service, sql, uploadPdf, type Session } from './helpers'

/** Contract-style order: pay (proof approved) → in progress → info request → deliver → revision → v2 → accept → review. */
describe('order lifecycle', () => {
  let customer: Session
  let lawyer: Session
  let order: { id: string, orderNumber: string }

  beforeAll(async () => {
    customer = await newCustomer('life')
    lawyer = await login('karim@oqoudi.test')
    order = await createLegalNoticeOrder(customer)
    await payOrder(customer, order.id)
  })

  it('cannot be reviewed before completion', async () => {
    const res = await customer.api(`/api/orders/${order.id}/review`, { method: 'POST', body: { rating: 5 } })
    expect(res.status).toBe(409)
    expect(errorCode(res.data)).toBe('OQ409_REVIEW_NOT_ELIGIBLE')
  })

  it('rejects illegal transitions', async () => {
    const res = await lawyer.api(`/api/orders/${order.id}/status`, { method: 'POST', body: { status: 'completed' } })
    expect(res.status).toBe(409)
    expect(errorCode(res.data)).toBe('OQ409_TRANSITION')
  })

  it('info request → customer reply returns the order to review', async () => {
    const ask = await lawyer.api(`/api/orders/${order.id}/request-info`, { method: 'POST', body: { message: 'نرجو إرسال صورة من إيصال الأمانة.' } })
    expect(ask.status).toBe(200)
    expect((await orderRow(order.id)).status).toBe('awaiting_info')

    const reply = await customer.api(`/api/orders/${order.id}/messages`, { method: 'POST', body: { body: 'تم، مرفق الإيصال.' } })
    expect(reply.status).toBe(200)
    expect((await orderRow(order.id)).status).toBe('under_review')

    const notes = await sql<{ type: string }>(`select type from notifications where order_id = $1`, [order.id])
    expect(notes.map(n => n.type)).toEqual(expect.arrayContaining(['order.info_requested', 'order.info_provided', 'payment.approved', 'order.started']))
  })

  it('customers cannot see deliverables before they are published', async () => {
    await lawyer.api(`/api/orders/${order.id}/status`, { method: 'POST', body: { status: 'in_progress' } })
    const draftDoc = await uploadPdf(lawyer, { purpose: 'deliverable', orderId: order.id }, 'مسودة.pdf')
    const visible = await customer.db.from('documents').select('id').eq('id', draftDoc)
    expect(visible.data).toEqual([])
    const dl = await customer.api(`/api/documents/${draftDoc}/download`)
    expect(dl.status).toBe(404)

    const delivered = await lawyer.api<{ version: number }>(`/api/orders/${order.id}/deliver`, { method: 'POST', body: { note: 'المسودة الأولى', documentIds: [draftDoc] } })
    expect(delivered.status).toBe(200)
    expect(delivered.data.version).toBe(1)
    expect((await orderRow(order.id)).status).toBe('delivered')
    const nowVisible = await customer.api(`/api/documents/${draftDoc}/download`)
    expect(nowVisible.status).toBe(200)
  })

  it('a customer cannot deliver or upload deliverables', async () => {
    const res = await customer.api('/api/uploads', { method: 'POST', body: { purpose: 'deliverable', fileName: 'x.pdf', sizeBytes: 10, orderId: order.id } })
    expect(res.status).toBe(404)
    const deliver = await customer.api(`/api/orders/${order.id}/deliver`, { method: 'POST', body: { documentIds: [order.id] } })
    expect(deliver.status).toBe(403)
  })

  it('revision keeps version 1 and adds version 2', async () => {
    const rev = await customer.api(`/api/orders/${order.id}/revision`, { method: 'POST', body: { reason: 'يرجى تعديل مدة الإنذار إلى ١٥ يومًا.' } })
    expect(rev.status).toBe(200)
    expect((await orderRow(order.id)).status).toBe('revision')

    const v2doc = await uploadPdf(lawyer, { purpose: 'deliverable', orderId: order.id }, 'الإصدار-الثاني.pdf')
    const v2 = await lawyer.api<{ version: number }>(`/api/orders/${order.id}/deliver`, { method: 'POST', body: { documentIds: [v2doc] } })
    expect(v2.data.version).toBe(2)

    const deliveries = await sql<{ version: number, files: number }>(`
      select d.version, count(x.id)::int as files from order_deliveries d
      left join documents x on x.delivery_id = d.id
      where d.order_id = $1 group by d.version order by d.version`, [order.id])
    expect(deliveries).toEqual([{ version: 1, files: 1 }, { version: 2, files: 1 }])
    const revisions = await sql('select id from revision_requests where order_id = $1', [order.id])
    expect(revisions).toHaveLength(1)
  })

  it('accept completes the order and enables exactly one review', async () => {
    const accept = await customer.api(`/api/orders/${order.id}/accept`, { method: 'POST' })
    expect(accept.status).toBe(200)
    const row = await orderRow(order.id)
    expect(row.status).toBe('completed')
    expect(row.completed_at).not.toBeNull()

    const review = await customer.api(`/api/orders/${order.id}/review`, { method: 'POST', body: { rating: 5, comment: 'خدمة ممتازة' } })
    expect(review.status).toBe(200)
    const dup = await customer.api(`/api/orders/${order.id}/review`, { method: 'POST', body: { rating: 1 } })
    expect(dup.status).toBe(409)
    expect(errorCode(dup.data)).toBe('OQ409_REVIEW_EXISTS')

    const { data } = await service.from('reviews').select('rating, display_name').eq('order_id', order.id).single()
    expect(data?.rating).toBe(5)
  })

  it('records a complete, ordered status history', async () => {
    const rows = await sql<{ to_status: string }>(`
      select to_status from order_events where order_id = $1 and type in ('order.status_changed','order.created')
      order by created_at`, [order.id])
    expect(rows.map(r => r.to_status)).toEqual([
      'awaiting_payment', 'in_progress', 'awaiting_info', 'under_review', 'in_progress',
      'delivered', 'revision', 'delivered', 'completed',
    ])
  })
})
