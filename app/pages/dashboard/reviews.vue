<script setup lang="ts">
import { Lock } from '@lucide/vue'
import type { Database } from '#shared/types/database.types'
import { fetchStaffReviews } from '~/repositories/admin'

/** Lawyers reply on their own orders, admins on all (enforced by review_reply). */
definePageMeta({ layout: 'lawyer', middleware: ['auth', 'staff'] })

const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const session = useSessionStore()
const user = useSupabaseUser()

const { data: reviews, refresh } = await useAsyncData('staff:reviews', () => fetchStaffReviews(supabase), { default: () => [] })

const stats = computed(() => {
  const n = reviews.value.length
  const avg = n ? reviews.value.reduce((s, r) => s + r.rating, 0) / n : 0
  const dist = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.value.filter(r => r.rating === star).length
    return { star, count, width: n ? `${Math.round((count / n) * 100)}%` : '0%' }
  })
  return { n, avg: Math.round(avg * 10) / 10, dist }
})

const canReply = (r: (typeof reviews.value)[number]) => session.isAdmin || (!!r.assignedLawyerId && r.assignedLawyerId === user.value?.sub)

useSeoMeta({ title: () => t('dash.nav.reviews'), robots: 'noindex' })
</script>

<template>
  <div class="page">
    <h1 class="title">{{ t('dash.nav.reviews') }}</h1>
    <div class="summary">
      <div class="kh-card avg">
        <span class="muted small">{{ t('admin.reviews.average') }}</span>
        <span class="big">{{ f.number(stats.avg) }}</span>
        <SharedStarRating :value="stats.avg" />
        <span class="muted small">{{ t('home.reviews.count', { n: f.number(stats.n) }) }}</span>
      </div>
      <div class="kh-card dist">
        <div v-for="d in stats.dist" :key="d.star" class="dist-row">
          <span class="dist-label">{{ f.number(d.star) }} ★</span>
          <span class="bar"><span class="fill" :style="{ width: d.width }" /></span>
          <span class="dist-n">{{ f.number(d.count) }}</span>
        </div>
      </div>
    </div>
    <div class="note"><Lock :size="14" aria-hidden="true" /> {{ t('admin.reviews.immutable') }}</div>

    <AdminReviewCard
      v-for="r in reviews"
      :key="r.id"
      :review="r"
      :can-reply="canReply(r)"
      @replied="refresh"
    />
    <UiEmptyState v-if="!reviews.length" :title="t('admin.reviews.empty')" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.title { font-size: 26px; font-weight: 800; margin: 0; }
.summary { display: flex; flex-wrap: wrap; gap: 16px; }
.avg { flex: 0 1 220px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
.big { font-family: var(--font-heading); font-size: 40px; font-weight: 800; color: var(--text-strong); line-height: 1.1; }
.small { font-size: 12px; }
.dist { flex: 1 1 320px; display: flex; flex-direction: column; gap: 6px; }
.dist-row { display: flex; gap: 10px; align-items: center; }
.dist-label { width: 44px; font-size: 13px; }
.bar { flex: 1; height: 8px; border-radius: 4px; background: var(--neutral-200); overflow: hidden; }
.fill { display: block; height: 100%; background: var(--gold-500); }
.dist-n { width: 24px; font-size: 12px; color: var(--text-muted); }
.note { background: var(--neutral-100); border-radius: 10px; padding: 10px 14px; font-size: 13px; display: flex; gap: 8px; align-items: center; }
</style>
