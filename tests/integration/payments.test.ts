import { createHmac, randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import { APP_URL, createLegalNoticeOrder, env, newCustomer, orderRow, payOrder, service, sql, startCheckout, type Session } from './helpers'

const secret = env.PAYMENTS_SIMULATOR_SECRET!

async function postWebhook(body: Record<string, unknown>, signature?: string) {
  const raw = JSON.stringify(body)
  const res = await fetch(`${APP_URL}/api/payments/webhook/simulator`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-oq-simulator-signature': signature ?? createHmac('sha256', secret).update(raw).digest('hex'),
    },
    body: raw,
  })
  return { status: res.status, data: await res.json().catch(() => null) as { result?: string } | null }
}

function webhook(paymentId: string, amountMinor: number, success = true) {
  return {
    eventId: `sim_${randomUUID()}`,
    type: success ? 'payment.succeeded' : 'payment.failed',
    paymentId,
    amountMinor,
    failureReason: success ? null : 'declined',
    createdAt: new Date().toISOString(),
  }
}

describe('payments', () => {
  let customer: Session

  beforeAll(async () => {
    customer = await newCustomer('pay')
  })

  it('a forged (unsigned / wrongly signed) webhook cannot mark an order paid', async () => {
    const order = await createLegalNoticeOrder(customer)
    const { paymentId } = await startCheckout(customer, order.id)
    const res = await postWebhook(webhook(paymentId, 90000), 'deadbeef')
    expect(res.status).toBe(401)
    expect((await orderRow(order.id)).payment_status).toBe('unpaid')
  })

  it('returning to the success URL does not mark the order paid', async () => {
    const order = await createLegalNoticeOrder(customer)
    await startCheckout(customer, order.id)
    const page = await fetch(`${APP_URL}/checkout/${order.orderNumber}/confirmation`)
    expect(page.status).toBeLessThan(500)
    const row = await orderRow(order.id)
    expect(row.payment_status).toBe('unpaid')
    expect(row.status).toBe('awaiting_payment')
  })

  it('a verified webhook marks paid exactly once, even when replayed', async () => {
    const order = await createLegalNoticeOrder(customer)
    const { paymentId } = await startCheckout(customer, order.id)
    const event = webhook(paymentId, 90000)

    const first = await postWebhook(event)
    expect(first.data?.result).toBe('succeeded')
    const replay = await postWebhook(event)
    expect(replay.data?.result).toBe('duplicate_event')
    const again = await postWebhook({ ...event, eventId: `sim_${randomUUID()}` })
    expect(again.data?.result).toBe('already_succeeded')

    const row = await orderRow(order.id)
    expect(row.payment_status).toBe('paid')
    expect(row.status).toBe('under_review')
    expect(row.assigned_lawyer_id).not.toBeNull()

    const payments = await sql<{ status: string, receipt_number: string | null }>('select status, receipt_number from payments where order_id = $1', [order.id])
    expect(payments.filter(p => p.status === 'succeeded')).toHaveLength(1)
    const events = await sql('select id from payment_events where provider_event_id = $1', [event.eventId])
    expect(events).toHaveLength(1)
    const history = await sql<{ type: string }>(`select type from order_events where order_id = $1 and type = 'payment.succeeded'`, [order.id])
    expect(history).toHaveLength(1)
  })

  it('ignores a webhook whose amount differs from the server-calculated amount', async () => {
    const order = await createLegalNoticeOrder(customer)
    const { paymentId } = await startCheckout(customer, order.id)
    const res = await postWebhook(webhook(paymentId, 1))
    expect(res.data?.result).toBe('amount_mismatch')
    expect((await orderRow(order.id)).payment_status).toBe('unpaid')
  })

  it('keeps the order after a failed payment and allows a successful retry', async () => {
    const order = await createLegalNoticeOrder(customer)
    const failed = await payOrder(customer, order.id, 'failure')
    expect(failed.result).toBe('failed')
    let row = await orderRow(order.id)
    expect(row.payment_status).toBe('failed')
    expect(row.status).toBe('awaiting_payment')

    const retry = await payOrder(customer, order.id, 'success')
    expect(retry.result).toBe('succeeded')
    row = await orderRow(order.id)
    expect(row.payment_status).toBe('paid')
    expect(row.total_minor).toBe(90000)
  })

  it('another customer cannot drive the simulator for someone else’s payment', async () => {
    const order = await createLegalNoticeOrder(customer)
    const { paymentId } = await startCheckout(customer, order.id)
    const intruder = await newCustomer('intruder')
    const res = await intruder.api(`/api/dev/payment-simulator/${paymentId}`, { method: 'POST', body: { outcome: 'success' } })
    expect(res.status).toBe(404)
    expect((await orderRow(order.id)).payment_status).toBe('unpaid')
  })

  it('cannot pay twice once paid', async () => {
    const order = await createLegalNoticeOrder(customer)
    await payOrder(customer, order.id)
    const res = await customer.api(`/api/orders/${order.id}/checkout`, { method: 'POST', body: { method: 'card' } })
    expect(res.status).toBe(409)
    const { count } = await service.from('payments').select('id', { count: 'exact', head: true }).eq('order_id', order.id).eq('status', 'succeeded')
    expect(count).toBe(1)
  })
})
