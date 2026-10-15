/**
 * Demo mode only: draws a clearly labelled SAMPLE payment-proof image in the
 * browser so the full workflow can be exercised without a real transfer.
 * It deliberately contains no transaction id, bank name or account data —
 * only the order reference, method, amount and repeated "DEMO" labels.
 */
export async function createSampleProof(info: { orderNumber: string, method: string, amount: string }): Promise<File> {
  const w = 900
  const h = 1200
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')

  ctx.fillStyle = '#FBF7F0'
  ctx.fillRect(0, 0, w, h)

  // Diagonal watermark.
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(-Math.PI / 5)
  ctx.fillStyle = 'rgba(200, 40, 40, 0.10)'
  ctx.font = '800 150px sans-serif'
  ctx.textAlign = 'center'
  for (let y = -900; y <= 900; y += 300) ctx.fillText('DEMO · تجريبي', 0, y)
  ctx.restore()

  ctx.fillStyle = '#1C2D4A'
  ctx.fillRect(0, 0, w, 150)
  ctx.fillStyle = '#F8E1C4'
  ctx.textAlign = 'center'
  ctx.font = '800 44px sans-serif'
  ctx.fillText('SAMPLE PAYMENT PROOF', w / 2, 70)
  ctx.font = '700 34px sans-serif'
  ctx.fillText('إثبات دفع تجريبي', w / 2, 120)

  ctx.fillStyle = '#B42318'
  ctx.font = '800 36px sans-serif'
  ctx.fillText('NOT A REAL RECEIPT — DEMO ONLY', w / 2, 240)
  ctx.font = '700 32px sans-serif'
  ctx.fillText('ليس إيصالًا حقيقيًا — للعرض فقط', w / 2, 290)

  const rows: [string, string][] = [
    ['Order / الطلب', info.orderNumber],
    ['Method / الوسيلة', info.method],
    ['Amount / المبلغ', info.amount],
    ['Created / التاريخ', new Date().toISOString().slice(0, 16).replace('T', ' ')],
  ]
  ctx.textAlign = 'start'
  let y = 420
  for (const [label, value] of rows) {
    ctx.fillStyle = '#6B7280'
    ctx.font = '600 28px sans-serif'
    ctx.fillText(label, 90, y)
    ctx.fillStyle = '#111827'
    ctx.font = '800 40px sans-serif'
    ctx.fillText(value, 90, y + 52)
    ctx.strokeStyle = '#E5DED2'
    ctx.beginPath()
    ctx.moveTo(90, y + 80)
    ctx.lineTo(w - 90, y + 80)
    ctx.stroke()
    y += 150
  }

  ctx.fillStyle = '#1C2D4A'
  ctx.textAlign = 'center'
  ctx.font = '600 26px sans-serif'
  ctx.fillText('OQOUDI demo workflow · no money was transferred', w / 2, h - 90)
  ctx.fillText('عقودي — بيئة تجريبية · لم يتم تحويل أي أموال', w / 2, h - 50)

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('encode failed')
  return new File([blob], `demo-proof-${info.orderNumber}.png`, { type: 'image/png' })
}
