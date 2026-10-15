<script setup lang="ts">
import { Copy } from '@lucide/vue'
import type { ManualMethodConfig } from '#shared/domain/manualPayments'

/** Step 3: where to transfer, how much, which reference — with copy buttons. */
const props = defineProps<{ method: ManualMethodConfig, amountMinor: number, orderNumber: string, demo: boolean }>()
const { t } = useI18n()
const f = useFormat()
const toast = useToast()

const steps = computed(() => [1, 2, 3, 4].map(n => t(`mpay.instructions.${props.method.id}.${n}`, { order: props.orderNumber })))
const isEmailLike = computed(() => props.method.id === 'paypal')

async function copy(value: string, what: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.info(t('mpay.copied', { what }))
  }
  catch {
    toast.error(t('mpay.copyFailed'))
  }
}
</script>

<template>
  <div class="instructions">
    <div class="head">
      <PaymentsPaymentMethodLogo :method="method.id" size="md" />
      <div>
        <div class="name">{{ t(`mpay.methods.${method.id}.label`) }}</div>
        <div class="muted small">{{ t('mpay.instructionsLead') }}</div>
      </div>
    </div>

    <dl class="facts">
      <div class="fact fact--wide">
        <dt>{{ t(`mpay.destination.${method.id}`) }}</dt>
        <dd>
          <span class="value" :class="{ ltr: !method.isPlaceholder || isEmailLike, placeholder: method.isPlaceholder }">{{ method.destination }}</span>
          <button
            type="button"
            class="copy"
            :aria-label="t('mpay.copyWhat', { what: t(`mpay.destination.${method.id}`) })"
            @click="copy(method.destination, t(`mpay.destination.${method.id}`))"
          >
            <Copy :size="15" :stroke-width="2" aria-hidden="true" /><span>{{ t('mpay.copy') }}</span>
          </button>
        </dd>
        <dd v-if="method.isPlaceholder" class="note">{{ t('mpay.placeholderNote') }}</dd>
      </div>
      <div class="fact">
        <dt>{{ t('mpay.amount') }}</dt>
        <dd><span class="value amount">{{ f.money(amountMinor) }}</span></dd>
      </div>
      <div class="fact">
        <dt>{{ t('mpay.reference') }}</dt>
        <dd>
          <span class="value ltr">{{ orderNumber }}</span>
          <button type="button" class="copy" :aria-label="t('mpay.copyWhat', { what: t('mpay.reference') })" @click="copy(orderNumber, t('mpay.reference'))">
            <Copy :size="15" :stroke-width="2" aria-hidden="true" /><span>{{ t('mpay.copy') }}</span>
          </button>
        </dd>
      </div>
    </dl>

    <ol class="steps">
      <li v-for="(s, i) in steps" :key="i"><span class="num">{{ f.number(i + 1) }}</span><span>{{ s }}</span></li>
    </ol>
    <p v-if="method.id === 'paypal'" class="muted small">{{ t('mpay.paypalCurrencyNote') }}</p>
    <UiAlert v-if="demo" tone="caution">{{ t('mpay.demo.noTransfer') }}</UiAlert>
  </div>
</template>

<style scoped>
.instructions { display: flex; flex-direction: column; gap: 16px; }
.head { display: flex; gap: 12px; align-items: center; }
.name { font-weight: 800; font-size: 17px; color: var(--text-strong); }
.small { font-size: 13px; }
.facts { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 10px; }
.fact { background: var(--neutral-100); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.fact--wide { grid-column: 1 / -1; background: var(--gold-50); border: 1px solid var(--gold-200); }
.fact dt { font-size: 12px; color: var(--text-muted); font-weight: 600; }
.fact dd { margin: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.value { font-weight: 800; color: var(--text-strong); font-size: 18px; overflow-wrap: anywhere; }
.value.placeholder { font-size: 15px; color: var(--caution-500); }
.amount { font-family: var(--font-heading); font-size: 22px; }
.note { font-size: 12px; color: var(--caution-500); }
.copy {
  display: inline-flex; gap: 6px; align-items: center; border: 1px solid var(--border-default); background: #fff;
  border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 13px; font-weight: 700; color: var(--text-strong); cursor: pointer;
}
.copy:hover { border-color: var(--ink-900); }
.copy:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.steps { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.steps li { display: flex; gap: 12px; font-size: 14px; line-height: 1.7; }
.num {
  width: 24px; height: 24px; border-radius: 50%; background: var(--ink-900); color: var(--cream-100); font-size: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;
}
</style>
