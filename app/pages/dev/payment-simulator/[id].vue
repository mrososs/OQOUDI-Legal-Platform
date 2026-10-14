<script setup lang="ts">
import type { Database } from '#shared/types/database.types'

/**
 * DEVELOPMENT PAYMENT SIMULATOR — imitates a provider's hosted page.
 * The outcome is delivered by a signed webhook, never by this page.
 */
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const { call, toFailure } = useApi()
const localePath = useLocalePath()

if (!useRuntimeConfig().public.paymentsSimulator) {
  throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true })
}

const paymentId = String(route.params.id)
const { data: payment } = await useAsyncData(`sim:${paymentId}`, async () => {
  const { data } = await supabase
    .from('payments')
    .select('id, amount_minor, method, status, provider_reference, orders(order_number)')
    .eq('id', paymentId)
    .maybeSingle()
  return data
})

const busy = shallowRef<'success' | 'failure' | null>(null)
const error = shallowRef('')

/** Only same-site relative return paths are followed. */
function safeReturn(): string {
  const raw = typeof route.query.return === 'string' ? route.query.return : ''
  try {
    const url = new URL(raw, window.location.origin)
    if (url.origin === window.location.origin) return url.pathname + url.search
  }
  catch {
    // malformed return URL → fall back to the account page
  }
  return localePath('/account')
}

async function complete(outcome: 'success' | 'failure') {
  busy.value = outcome
  error.value = ''
  try {
    await call(`/api/dev/payment-simulator/${paymentId}`, { method: 'POST', body: { outcome } })
    await navigateTo(safeReturn())
  }
  catch (err) {
    error.value = toFailure(err).message
    busy.value = null
  }
}

useSeoMeta({ title: 'Payment simulator', robots: 'noindex' })
</script>

<template>
  <section class="wrap">
    <div class="kh-card kh-card--raised card">
      <div class="dev-banner" role="note">{{ t('simulator.banner') }}</div>
      <template v-if="payment">
        <h1 class="title">{{ t('simulator.title') }}</h1>
        <dl class="facts">
          <div><dt>{{ t('confirm.orderNumber') }}</dt><dd class="ltr">{{ (payment.orders as { order_number: string } | null)?.order_number }}</dd></div>
          <div><dt>{{ t('confirm.amount') }}</dt><dd>{{ f.money(payment.amount_minor) }}</dd></div>
          <div><dt>{{ t('checkout.paymentMethod') }}</dt><dd>{{ t(`checkout.methods.${payment.method}.label`) }}</dd></div>
          <div><dt>{{ t('simulator.reference') }}</dt><dd class="ltr">{{ payment.provider_reference }}</dd></div>
        </dl>
        <UiAlert v-if="error">{{ error }}</UiAlert>
        <p v-if="payment.status !== 'pending'" class="muted">{{ t('simulator.notPending') }}</p>
        <div class="actions">
          <UiButton :loading="busy === 'success'" :disabled="!!busy || payment.status !== 'pending'" data-testid="sim-success" @click="complete('success')">
            {{ t('simulator.success') }}
          </UiButton>
          <UiButton variant="danger" :loading="busy === 'failure'" :disabled="!!busy || payment.status !== 'pending'" data-testid="sim-failure" @click="complete('failure')">
            {{ t('simulator.failure') }}
          </UiButton>
        </div>
      </template>
      <SharedAccessDenied v-else />
    </div>
  </section>
</template>

<style scoped>
.wrap { max-width: 640px; margin: 0 auto; padding: clamp(40px, 7vw, 88px) var(--container-pad) 96px; }
.card { display: flex; flex-direction: column; gap: 18px; }
.dev-banner {
  border: 1px dashed var(--gold-400); background: var(--gold-50); color: var(--gold-700);
  border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 600;
}
.title { font-size: 24px; font-weight: 800; margin: 0; }
.facts { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; background: var(--neutral-100); border-radius: 14px; padding: 16px; }
.facts dt { font-size: 12px; color: var(--text-muted); }
.facts dd { margin: 0; font-weight: 700; color: var(--text-strong); }
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
</style>
