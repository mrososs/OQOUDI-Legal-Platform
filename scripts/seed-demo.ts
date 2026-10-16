/**
 * Creates demo orders in every lifecycle state through the REAL APIs
 * (uploads, business functions, simulated-gateway webhooks).
 * Requires: local Supabase (npm run db:start) + dev server (npm run dev).
 * Run: npm run db:seed-demo   (after `npm run db:reset` for a clean slate)
 * LOCAL DEVELOPMENT ONLY — fictional people and companies.
 */
import { anon, login, payOrder, serviceBySlug, uploadPdf, type Session } from '../tests/integration/helpers.ts'

type Answers = Record<string, unknown>

async function order(session: Session, slug: string, answers: Answers, opts: { fileField?: string, fileName?: string, files?: { field: string, name: string }[], addonIds?: string[], slotStart?: string } = {}) {
  const svc = await serviceBySlug(slug)
  if (opts.fileField) {
    answers[opts.fileField] = [await uploadPdf(session, { purpose: 'form', formVersionId: svc.published_form_version_id!, fieldId: opts.fileField }, opts.fileName ?? 'مستند.pdf')]
  }
  // several upload fields (catalog contracts list each required document separately)
  for (const file of opts.files ?? []) {
    answers[file.field] = [await uploadPdf(session, { purpose: 'form', formVersionId: svc.published_form_version_id!, fieldId: file.field }, file.name)]
  }
  const res = await session.api<{ id: string, orderNumber: string }>('/api/orders', {
    method: 'POST',
    body: { serviceId: svc.id, formVersionId: svc.published_form_version_id, answers, addonIds: opts.addonIds ?? [], slotStart: opts.slotStart ?? null },
  })
  if (res.status !== 200) throw new Error(`${slug}: ${res.status} ${JSON.stringify(res.data)}`)
  console.log(`  ${res.data.orderNumber}  ${slug}`)
  return res.data
}

async function ok(p: Promise<{ status: number, data: unknown }>, label: string) {
  const r = await p
  if (r.status !== 200) throw new Error(`${label}: ${r.status} ${JSON.stringify(r.data)}`)
}

async function deliver(lawyer: Session, orderId: string, name: string, note?: string) {
  const doc = await uploadPdf(lawyer, { purpose: 'deliverable', orderId }, name)
  await ok(lawyer.api(`/api/orders/${orderId}/deliver`, { method: 'POST', body: { note, documentIds: [doc] } }), 'deliver')
}

async function freeSlot(offsetDays: number, index: number) {
  const from = new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10)
  const to = new Date(Date.now() + (offsetDays + 10) * 86400000).toISOString().slice(0, 10)
  const { data } = await anon.rpc('available_slots', { p_from: from, p_to: to })
  return (data ?? []).filter(s => s.is_available)[index]!.slot_start
}

async function main() {
  const ahmed = await login('ahmed@oqoudi.test')
  const mona = await login('mona@oqoudi.test')
  const nile = await login('nile@oqoudi.test')
  const karim = await login('karim@oqoudi.test')

  console.log('ahmed@oqoudi.test')
  // 1) Contract drafting: delivered v1, awaiting the customer's decision
  const drafting = await order(ahmed, 'contract-drafting', {
    party_one: 'أحمد سامي عبد الله',
    party_two: 'شركة الأمل للتوريدات',
    contract_type: 'supply',
    language: 'ar',
    description: 'توريد مستلزمات مكتبية شهريًا لمدة سنة، الدفع خلال ٣٠ يومًا من الفاتورة.',
    clauses: ['penalty', 'arbitration'],
  }, { fileField: 'files', fileName: 'عرض-سعر-الأمل.pdf' })
  await payOrder(ahmed, drafting.id)
  await ok(karim.api(`/api/orders/${drafting.id}/messages`, { method: 'POST', body: { body: 'مرحبًا أ. أحمد، هل يتحمل المورد تكلفة النقل؟' } }), 'msg')
  await ok(ahmed.api(`/api/orders/${drafting.id}/messages`, { method: 'POST', body: { body: 'نعم، النقل على المورد داخل القاهرة الكبرى.' } }), 'msg')
  await ok(karim.api(`/api/orders/${drafting.id}/notes`, { method: 'POST', body: { body: 'العميل يفضل مدة إشعار ٦٠ يومًا.' } }), 'note')
  await ok(karim.api(`/api/orders/${drafting.id}/status`, { method: 'POST', body: { status: 'in_progress' } }), 'status')
  await deliver(karim, drafting.id, 'عقد-توريد-مستلزمات-v1.pdf', 'المسودة الأولى. راجعت مدة الإشعار في البند السابع.')

  // 2) Lease: v1 → revision → v2 → accepted → reviewed
  const lease = await order(ahmed, 'lease-agreement', {
    landlord_name: 'محمود فؤاد', landlord_national_id: '28001011234567', landlord_current_address: '٥ شارع الجمهورية، القاهرة',
    tenant_name: 'أحمد سامي عبد الله', tenant_national_id: '29005051234567', tenant_current_address: '١٢ شارع النصر، مدينة نصر، القاهرة',
    unit_address: 'شقة بالدور الثالث، ١٢ شارع النصر، مدينة نصر، القاهرة.', lease_start: '2026-11-01', lease_end: '2028-10-31',
    monthly_rent: 6500, deposit_amount: 13000,
  }, { files: [{ field: 'doc_party_ids', name: 'بطاقات-المؤجر-والمستأجر.pdf' }] })
  await payOrder(ahmed, lease.id)
  await deliver(karim, lease.id, 'عقد-إيجار-سكني-v1.pdf')
  await ok(ahmed.api(`/api/orders/${lease.id}/revision`, { method: 'POST', body: { reason: 'برجاء تعديل مدة العقد إلى سنتين.' } }), 'revision')
  await deliver(karim, lease.id, 'عقد-إيجار-سكني-v2.pdf', 'تعديل مدة العقد إلى سنتين.')
  await ok(ahmed.api(`/api/orders/${lease.id}/accept`, { method: 'POST' }), 'accept')
  await ok(ahmed.api(`/api/orders/${lease.id}/review`, { method: 'POST', body: { rating: 5, comment: 'العقد واضح جدًا، والتعديل وصل في نفس اليوم.' } }), 'review')

  // 3) Contract review: failed payment (retry available)
  const review = await order(ahmed, 'contract-review', { contract_type: 'employment', pages: 8, concerns: 'أخشى أن يكون بند عدم المنافسة واسعًا أكثر من اللازم.' }, { fileField: 'contract_file', fileName: 'عقد-العمل-المقترح.pdf' })
  await payOrder(ahmed, review.id, 'failure')

  // 4) Written consultation: in progress
  const written = await order(ahmed, 'written-consultation', {
    area: 'real_estate', title: 'تأخر المالك في رد مبلغ التأمين',
    description: 'انتهى عقد الإيجار منذ شهرين وسلمت الشقة بحالة جيدة، والمالك يرفض رد التأمين ويطلب خصم تكاليف دهان.',
    dispute: 'no',
  })
  await payOrder(ahmed, written.id)
  await ok(karim.api(`/api/orders/${written.id}/status`, { method: 'POST', body: { status: 'in_progress' } }), 'status')

  // 5) Video consultation: confirmed, meeting link not yet added
  const video = await order(ahmed, 'video-consultation', {
    topics: ['company', 'contracts'],
    description: 'أرغب في تأسيس شركة ذات مسؤولية محدودة مع شريكين وأحتاج فهم الخيارات.',
  }, { slotStart: await freeSlot(2, 0) })
  await payOrder(ahmed, video.id)

  console.log('mona@oqoudi.test')
  const notice = await order(mona, 'legal-notice', { subject: 'payment', recipient: 'سامح رشدي', facts: 'حرر المنذر إليه إيصال أمانة بمبلغ ٥٠٬٠٠٠ جنيه ولم يقم بالسداد رغم المطالبة الودية.' }, { fileField: 'files', fileName: 'إيصال-أمانة.pdf' })
  await payOrder(mona, notice.id)
  const monaVideo = await order(mona, 'video-consultation', { topics: ['family'], description: 'استفسار حول إجراءات الحضانة والرؤية بعد الطلاق.' }, { slotStart: await freeSlot(3, 2) })
  await payOrder(mona, monaVideo.id)
  await ok(karim.api(`/api/orders/${monaVideo.id}/meeting-link`, { method: 'POST', body: { url: 'https://meet.google.com/qwe-rtyu-iop' } }), 'meet')
  const monaWritten = await order(mona, 'written-consultation', { area: 'labour', title: 'مستحقات نهاية الخدمة', description: 'استقلت من عملي بعد خمس سنوات وأريد معرفة المستحقات القانونية ومدة صرفها وفق قانون العمل.', dispute: 'no' })
  await payOrder(mona, monaWritten.id)
  await ok(karim.api(`/api/orders/${monaWritten.id}/response`, { method: 'POST', body: { body: 'وفق قانون العمل، يستحق العامل عند انتهاء الخدمة أجره المستحق ومقابل رصيد الإجازات. ننصح بطلب كتابي لصاحب العمل خلال ٣٠ يومًا، وفي حال الرفض يمكن اللجوء إلى مكتب العمل المختص.' } }), 'response')
  await ok(mona.api(`/api/orders/${monaWritten.id}/accept`, { method: 'POST' }), 'accept')
  await ok(mona.api(`/api/orders/${monaWritten.id}/review`, { method: 'POST', body: { rating: 5, comment: 'رد مفصل ومنظم، وفهمت خياراتي بوضوح.' } }), 'review')

  console.log('nile@oqoudi.test')
  await order(nile, 'company-formation', { entity: 'llc', partners: 3, description: 'شركة برمجيات برأس مال ٥٠٠٬٠٠٠ جنيه ونشاط تطوير التطبيقات.' }, { fileField: 'files', fileName: 'بطاقات-الشركاء.pdf' })
  const employment = await order(nile, 'employment-contract', {
    company_company_name: 'شركة نيل للحلول التقنية', company_commercial_register: '123456', company_legal_rep: 'يوسف عادل',
    employee_name: 'مها إبراهيم', employee_national_id: '29503031234567',
    job_title: 'مطورة برمجيات', start_date: '2026-11-15', total_salary: 18000,
  }, { files: [{ field: 'doc_employee_id', name: 'بطاقة-الموظفة.pdf' }, { field: 'doc_commercial_register', name: 'السجل-التجاري-نيل.pdf' }] })
  await payOrder(nile, employment.id)
  await ok(karim.api(`/api/orders/${employment.id}/request-info`, { method: 'POST', body: { message: 'نحتاج نسخة من اللائحة الداخلية الحالية إن وجدت.' } }), 'info')
  const nileReview = await order(nile, 'contract-review', { contract_type: 'other', pages: 14, concerns: 'اتفاقية SaaS مع عميل خارجي؛ نريد مراجعة بنود المسؤولية والتعويض.' }, { fileField: 'contract_file', fileName: 'اتفاقية-SaaS.pdf' })
  await payOrder(nile, nileReview.id)
  await deliver(karim, nileReview.id, 'مراجعة-اتفاقية-SaaS.pdf')
  await ok(nile.api(`/api/orders/${nileReview.id}/accept`, { method: 'POST' }), 'accept')
  await ok(nile.api(`/api/orders/${nileReview.id}/review`, { method: 'POST', body: { rating: 4, comment: 'ملاحظات دقيقة على بنود المسؤولية. تمنيت تسليمًا أسرع بيوم.' } }), 'review')

  console.log('Demo data created.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
