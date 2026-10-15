<script setup lang="ts">
import { AlertTriangle, CheckCircle2, ExternalLink, X } from '@lucide/vue'
import type { AdminSubmission } from '~/composables/useAdminManualPayments'

/**
 * Side panel to review one submission: customer, order, expected amount,
 * method, proof image (60 s signed URL) and approve / reject with explicit
 * confirmation. The server re-checks everything on each decision.
 */
const props = defineProps<{ submission: AdminSubmission | null, loading?: boolean, acting: 'approve' | 'reject' | null }>()
const emit = defineEmits<{ close: [], approve: [sub: AdminSubmission], reject: [sub: AdminSubmission, reason: string] }>()

const { t } = useI18n()
const f = useFormat()
const preview = useProofPreview()
const closeRef = useTemplateRef<HTMLButtonElement>('closeBtn')
const titleId = useId()

const open = computed(() => !!props.submission || !!props.loading)
const sub = computed(() => props.submission)
const pending = computed(() => sub.value?.status === 'pending_review')
const amountMatches = computed(() => !!sub.value && sub.value.amountMinor === sub.value.orderTotalMinor)
const orderPayable = computed(() => sub.value?.orderStatus === 'awaiting_payment')
const canApprove = computed(() => pending.value && amountMatches.value && orderPayable.value)

const confirmApprove = shallowRef(false)
const confirmReject = shallowRef(false)
const reason = shallowRef('')

watch(() => sub.value?.id, async (id) => {
  confirmApprove.value = false
  confirmReject.value = false
  reason.value = ''
  if (id) {
    preview.load(id)
    await nextTick()
    closeRef.value?.focus()
  }
  else {
    preview.clear()
  }
}, { immediate: true })

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !confirmApprove.value && !confirmReject.value) emit('close')
}

function doApprove() {
  if (sub.value) emit('approve', sub.value)
  confirmApprove.value = false
}
function doReject() {
  if (sub.value) emit('reject', sub.value, reason.value)
  confirmReject.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="panel">
      <div v-if="open" class="backdrop" @click.self="emit('close')" @keydown="onKeydown">
        <aside class="panel" role="dialog" aria-modal="true" :aria-labelledby="titleId">
          <header class="head">
            <div>
              <div class="muted small">{{ t('admin.mpay.panel.title') }}</div>
              <h2 :id="titleId" class="title"><span class="ltr">{{ sub?.orderNumber ?? '…' }}</span></h2>
            </div>
            <button ref="closeBtn" type="button" class="close" :aria-label="t('common.close')" @click="emit('close')">
              <X :size="18" aria-hidden="true" />
            </button>
          </header>

          <div v-if="!sub" class="body muted">{{ t('common.loading') }}</div>
          <div v-else class="body">
            <div class="status-row">
              <PaymentsPaymentVerificationBadge :status="sub.status" :demo="sub.demo" />
              <span class="muted small">{{ t('admin.mpay.panel.orderStatus') }}: {{ t(`status.${sub.orderStatus}.label`) }}</span>
            </div>
            <PaymentsPaymentDemoNotice v-if="sub.demo" compact />

            <section class="block">
              <h3 class="block-title">{{ t('admin.mpay.panel.customer') }}</h3>
              <dl class="kv">
                <div><dt>{{ t('admin.mpay.panel.name') }}</dt><dd>{{ sub.customer.name }}</dd></div>
                <div><dt>{{ t('admin.mpay.panel.email') }}</dt><dd class="ltr">{{ sub.customer.email }}</dd></div>
                <div v-if="sub.customer.phone"><dt>{{ t('admin.mpay.panel.phone') }}</dt><dd class="ltr">{{ sub.customer.phone }}</dd></div>
              </dl>
            </section>

            <section class="block">
              <h3 class="block-title">{{ t('admin.mpay.panel.payment') }}</h3>
              <dl class="kv">
                <div><dt>{{ t('admin.mpay.cols.service') }}</dt><dd>{{ f.text(sub.serviceTitle) }}</dd></div>
                <div><dt>{{ t('admin.mpay.cols.method') }}</dt><dd class="method"><PaymentsPaymentMethodLogo :method="sub.method" size="sm" />{{ t(`mpay.methods.${sub.method}.label`) }}</dd></div>
                <div><dt>{{ t('admin.mpay.panel.expected') }}</dt><dd class="amount">{{ f.money(sub.amountMinor) }}</dd></div>
                <div><dt>{{ t('admin.mpay.panel.orderTotal') }}</dt><dd>{{ f.money(sub.orderTotalMinor) }}</dd></div>
                <div><dt>{{ t('admin.mpay.cols.date') }}</dt><dd>{{ f.dateTime(sub.submittedAt) }}</dd></div>
                <div v-if="sub.reviewedAt"><dt>{{ t('admin.mpay.panel.reviewed') }}</dt><dd>{{ f.dateTime(sub.reviewedAt) }}<template v-if="sub.reviewerName"> · {{ sub.reviewerName }}</template></dd></div>
              </dl>
              <p v-if="sub.rejectionReason" class="reason"><strong>{{ t('mpay.facts.reason') }}:</strong> {{ sub.rejectionReason }}</p>
              <UiAlert v-if="pending && !amountMatches" tone="critical">{{ t('admin.mpay.panel.amountMismatch') }}</UiAlert>
              <UiAlert v-else-if="pending && !orderPayable" tone="caution">{{ t('admin.mpay.panel.notPayable') }}</UiAlert>
            </section>

            <section class="block">
              <div class="proof-head">
                <h3 class="block-title">{{ t('admin.mpay.panel.proof') }}</h3>
                <span class="muted small">{{ f.bytes(sub.proofSizeBytes) }} · {{ sub.proofMime.replace('image/', '').toUpperCase() }}</span>
              </div>
              <div class="proof">
                <div v-if="preview.loading.value" class="muted">{{ t('common.loading') }}</div>
                <a v-else-if="preview.url.value" :href="preview.url.value" target="_blank" rel="noopener noreferrer" class="proof-link">
                  <img :src="preview.url.value" :alt="t('mpay.proof.previewAlt')" class="proof-img">
                </a>
                <div v-else class="muted">{{ t('mpay.proof.unavailable') }}</div>
              </div>
              <div class="proof-actions">
                <UiButton variant="secondary" size="sm" :loading="preview.loading.value" @click="preview.load(sub.id)">{{ t('admin.mpay.panel.reloadProof') }}</UiButton>
                <UiButton v-if="preview.url.value" variant="ghost" size="sm" :href="preview.url.value" target="_blank" rel="noopener noreferrer">
                  <ExternalLink :size="14" aria-hidden="true" /> {{ t('mpay.proof.openFull') }}
                </UiButton>
              </div>
              <p class="muted small">{{ t('admin.mpay.panel.proofNote') }}</p>
            </section>
          </div>

          <footer v-if="sub && pending" class="foot">
            <UiButton variant="danger" :loading="acting === 'reject'" :disabled="!!acting" @click="confirmReject = true">{{ t('admin.mpay.reject') }}</UiButton>
            <UiButton :loading="acting === 'approve'" :disabled="!!acting || !canApprove" @click="confirmApprove = true">{{ t('admin.mpay.approve') }}</UiButton>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>

  <UiModal v-model:open="confirmApprove" :title="t('admin.mpay.confirmApprove.title')">
    <div v-if="sub" class="confirm">
      <CheckCircle2 :size="22" class="ok" aria-hidden="true" />
      <p>{{ t('admin.mpay.confirmApprove.body', { amount: f.money(sub.amountMinor), order: sub.orderNumber }) }}</p>
    </div>
    <p v-if="sub?.demo" class="muted small">{{ t('admin.mpay.confirmApprove.demo') }}</p>
    <template #footer>
      <UiButton variant="ghost" @click="confirmApprove = false">{{ t('common.cancel') }}</UiButton>
      <UiButton :loading="acting === 'approve'" @click="doApprove">{{ t('admin.mpay.approve') }}</UiButton>
    </template>
  </UiModal>

  <UiModal v-model:open="confirmReject" :title="t('admin.mpay.confirmReject.title')">
    <div v-if="sub" class="confirm">
      <AlertTriangle :size="22" class="warn" aria-hidden="true" />
      <p>{{ t('admin.mpay.confirmReject.body', { order: sub.orderNumber }) }}</p>
    </div>
    <UiTextarea v-model="reason" :label="t('admin.mpay.confirmReject.reason')" :hint="t('admin.mpay.confirmReject.reasonHint')" :maxlength="500" />
    <template #footer>
      <UiButton variant="ghost" @click="confirmReject = false">{{ t('common.cancel') }}</UiButton>
      <UiButton variant="danger" :loading="acting === 'reject'" @click="doReject">{{ t('admin.mpay.reject') }}</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 55; background: rgba(21, 35, 59, 0.4); display: flex; justify-content: flex-end; }
.panel {
  width: min(520px, 100%); height: 100%; background: var(--surface-page); box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column;
}
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 18px 20px; background: var(--surface-card); border-bottom: 1px solid var(--border-subtle); }
.title { margin: 2px 0 0; font-size: 20px; font-weight: 800; }
.close { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--border-default); background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-strong); }
.close:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.body { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
.status-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.small { font-size: 12px; }
.block { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.block-title { margin: 0; font-size: 14px; font-weight: 800; color: var(--text-strong); }
.kv { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 10px; }
.kv dt { font-size: 12px; color: var(--text-muted); }
.kv dd { margin: 0; font-weight: 700; color: var(--text-strong); overflow-wrap: anywhere; }
.method { display: flex; align-items: center; gap: 8px; }
.amount { font-family: var(--font-heading); font-size: 18px; }
.reason { margin: 0; font-size: 13px; background: var(--critical-100); color: var(--critical-500); border-radius: 10px; padding: 8px 12px; }
.proof-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.proof { min-height: 220px; display: flex; align-items: center; justify-content: center; background: var(--neutral-100); border-radius: 12px; padding: 8px; }
.proof-link { display: block; }
.proof-img { max-width: 100%; max-height: 420px; object-fit: contain; border-radius: 8px; display: block; }
.proof-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.foot { display: flex; justify-content: space-between; gap: 10px; padding: 14px 20px; background: var(--surface-card); border-top: 1px solid var(--border-subtle); }
.confirm { display: flex; gap: 12px; align-items: flex-start; }
.confirm p { margin: 0; line-height: 1.8; }
.ok { color: var(--positive-500); flex-shrink: 0; }
.warn { color: var(--critical-500); flex-shrink: 0; }
.panel-enter-active, .panel-leave-active { transition: opacity var(--duration-normal) var(--ease-standard); }
.panel-enter-active .panel, .panel-leave-active .panel { transition: transform var(--duration-normal) var(--ease-standard); }
.panel-enter-from, .panel-leave-to { opacity: 0; }
.panel-enter-from .panel, .panel-leave-to .panel { transform: translateX(calc(40px * var(--dir-sign, 1))); }
@media (prefers-reduced-motion: reduce) { .panel-enter-active .panel, .panel-leave-active .panel { transition: none; } }
</style>
