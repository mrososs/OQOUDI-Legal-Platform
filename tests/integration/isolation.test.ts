import { beforeAll, describe, expect, it } from 'vitest'
import { anon, APP_URL, createLegalNoticeOrder, errorCode, login, newCustomer, payOrder, service, type Session } from './helpers'

/**
 * IDOR / data isolation: customer B must not see or act on customer A's
 * order or documents through any channel; an unassigned lawyer neither.
 */
describe('customer and lawyer data isolation', () => {
  let a: Session
  let b: Session
  let order: { id: string, orderNumber: string, fileIds: string[] }
  let docPath: string

  beforeAll(async () => {
    a = await newCustomer('alice')
    b = await newCustomer('bob')
    order = await createLegalNoticeOrder(a, true)
    await payOrder(a, order.id)
    const { data } = await service.from('documents').select('storage_path').eq('id', order.fileIds[0]!).single()
    docPath = data!.storage_path
  })

  it('A sees her order, B does not (same response as non-existent)', async () => {
    const mine = await a.db.from('orders').select('id').eq('id', order.id).maybeSingle()
    expect(mine.data?.id).toBe(order.id)
    for (const table of ['orders', 'order_events', 'order_messages', 'payments'] as const) {
      const col = table === 'orders' ? 'id' : 'order_id'
      const { data } = await b.db.from(table).select('id').eq(col, order.id)
      expect(data, table).toEqual([])
    }
    const docs = await b.db.from('documents').select('id').eq('id', order.fileIds[0]!)
    expect(docs.data).toEqual([])
  })

  it('B cannot download A’s document via the API or storage directly', async () => {
    const ok = await a.api<{ url: string }>(`/api/documents/${order.fileIds[0]}/download`)
    expect(ok.status).toBe(200)
    expect(ok.data.url).toBe(`/api/documents/${order.fileIds[0]}/file`)
    const file = await a.api<string>(ok.data.url)
    expect(file.status).toBe(200)
    expect(String(file.data)).toContain('%PDF')

    const denied = await b.api(`/api/documents/${order.fileIds[0]}/download`)
    expect(denied.status).toBe(404)
    const deniedFile = await b.api(`/api/documents/${order.fileIds[0]}/file`)
    expect(deniedFile.status).toBe(404)
    const anonymousFile = await fetch(`${APP_URL}/api/documents/${order.fileIds[0]}/file`)
    expect(anonymousFile.status).toBe(401)

    const direct = await b.db.storage.from('order-documents').download(docPath)
    expect(direct.error).not.toBeNull()
    const signed = await b.db.storage.from('order-documents').createSignedUrl(docPath, 60)
    expect(signed.error).not.toBeNull()
    const anonymous = await anon.storage.from('order-documents').download(docPath)
    expect(anonymous.error).not.toBeNull()
  })

  it('B cannot message, accept, cancel, review or pay A’s order', async () => {
    const attempts = [
      b.api(`/api/orders/${order.id}/messages`, { method: 'POST', body: { body: 'مرحبا' } }),
      b.api(`/api/orders/${order.id}/accept`, { method: 'POST' }),
      b.api(`/api/orders/${order.id}/cancel`, { method: 'POST', body: {} }),
      b.api(`/api/orders/${order.id}/review`, { method: 'POST', body: { rating: 1 } }),
      b.api(`/api/orders/${order.id}/checkout`, { method: 'POST', body: { method: 'card' } }),
    ]
    for (const res of await Promise.all(attempts)) {
      expect(res.status).toBe(404)
      expect(errorCode(res.data)).toBe('OQ404_ORDER')
    }
  })

  it('customers cannot use staff endpoints', async () => {
    const res = await a.api(`/api/orders/${order.id}/status`, { method: 'POST', body: { status: 'completed' } })
    expect(res.status).toBe(403)
  })

  it('the assigned lawyer sees the order; another lawyer does not', async () => {
    const karim = await login('karim@oqoudi.test')
    const sara = await login('sara@oqoudi.test')
    const assigned = await karim.db.from('orders').select('id, assigned_lawyer_id').eq('id', order.id).maybeSingle()
    expect(assigned.data?.id).toBe(order.id)

    const other = await sara.db.from('orders').select('id').eq('id', order.id).maybeSingle()
    expect(other.data).toBeNull()
    const otherDoc = await sara.api(`/api/documents/${order.fileIds[0]}/download`)
    expect(otherDoc.status).toBe(404)
    const otherStatus = await sara.api(`/api/orders/${order.id}/status`, { method: 'POST', body: { status: 'in_progress' } })
    expect(otherStatus.status).toBe(404)
    const profile = await sara.db.from('profiles').select('id').eq('id', a.userId).maybeSingle()
    expect(profile.data).toBeNull()
  })

  it('ordinary lawyers cannot see payments, settings, audit log or use admin actions', async () => {
    const karim = await login('karim@oqoudi.test')
    const payments = await karim.db.from('payments').select('id').eq('order_id', order.id)
    expect(payments.data).toEqual([])
    const audit = await karim.db.from('audit_logs').select('id').limit(1)
    expect(audit.data).toEqual([])
    const privateSettings = await karim.db.from('platform_settings').select('key').eq('key', 'assignment.default_lawyer')
    expect(privateSettings.data).toEqual([])
    const quote = await karim.api(`/api/orders/${order.id}/quote`, { method: 'POST', body: { amountMinor: 100 } })
    expect(quote.status).toBe(403)
    const assign = await karim.api(`/api/orders/${order.id}/assign`, { method: 'POST', body: { lawyerId: karim.userId } })
    expect(assign.status).toBe(403)
  })

  it('anonymous visitors see published catalog only', async () => {
    const { data: drafts } = await anon.from('services').select('slug').eq('status', 'draft')
    expect(drafts).toEqual([])
    const { data: orders } = await anon.from('orders').select('id').limit(1)
    expect(orders).toEqual([])
  })
})
