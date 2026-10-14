<script setup lang="ts">
import type { StaffExtras } from '~/repositories/dashboard'

defineProps<{ customer: StaffExtras['customer'] }>()
const { t } = useI18n()
const f = useFormat()
</script>

<template>
  <section class="kh-card card">
    <h2 class="title">{{ t('dashOps.customer') }}</h2>
    <strong class="name">{{ customer.accountName }}</strong>
    <span v-if="customer.fullName && customer.fullName !== customer.accountName" class="muted">{{ customer.fullName }}</span>
    <span v-if="customer.phone" class="ltr contact">{{ customer.phone }}</span>
    <span v-if="customer.email" class="ltr contact wrap">{{ customer.email }}</span>
    <span class="muted">
      {{ customer.accountKind === 'company' ? t('auth.kind.company') : t('auth.kind.individual') }}
      · {{ t('dashOps.ordersCount', { n: f.number(customer.ordersCount) }) }}
    </span>
  </section>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 8px; }
.title { font-size: 15px; font-weight: 700; margin: 0 0 4px; }
.name { color: var(--text-strong); font-size: 16px; }
.contact { align-self: flex-start; }
.wrap { overflow-wrap: anywhere; }
</style>
