<script setup lang="ts">
import { PenLine, Video } from '@lucide/vue'
import type { ServiceSummary } from '~/repositories/catalog'

const props = defineProps<{ services: ServiceSummary[] }>()

const { t } = useI18n()
const f = useFormat()

const cards = computed(() =>
  props.services
    .filter(s => s.kind === 'written_consultation' || s.kind === 'video_consultation')
    .map(s => ({
      ...s,
      isMeeting: s.kind === 'video_consultation',
      steps: [1, 2, 3, 4].map(n => t(`home.consult.${s.kind}.step${n}`)),
      cta: s.kind === 'video_consultation' ? t('home.consult.pickTime') : t('home.consult.writeIt'),
    })),
)
</script>

<template>
  <section v-if="cards.length" class="band">
    <div class="inner container">
      <div class="intro">
        <div class="eyebrow gold">{{ t('home.consult.eyebrow') }}</div>
        <h2 class="section-title light">{{ t('home.consult.title') }}</h2>
        <p class="lead">{{ t('home.consult.lead') }}</p>
      </div>
      <div class="grid">
        <div v-for="c in cards" :key="c.id" class="card">
          <div class="head">
            <div class="who">
              <div class="icon" aria-hidden="true">
                <Video v-if="c.isMeeting" :size="20" :stroke-width="1.8" />
                <PenLine v-else :size="20" :stroke-width="1.8" />
              </div>
              <div>
                <div class="title">{{ f.text(c.title) }}</div>
                <div class="days">{{ f.text(c.deliveryEstimate) }}</div>
              </div>
            </div>
            <div class="price">{{ f.money(c.basePriceMinor) }}</div>
          </div>
          <ol class="steps">
            <li v-for="(s, i) in c.steps" :key="i">
              <span class="num">{{ f.number(i + 1) }}</span>{{ s }}
            </li>
          </ol>
          <div class="cta">
            <UiButton variant="inverse" :to="`/service/${c.slug}`">{{ c.cta }}</UiButton>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.band { margin-top: clamp(56px, 8vw, 104px); background: var(--ink-900); color: var(--cream-100); }
.inner { padding-block: clamp(48px, 7vw, 88px); display: flex; flex-direction: column; gap: 32px; }
.intro { max-width: 640px; }
.gold { color: var(--gold-300); }
.light { color: #fff; margin-bottom: 12px; }
.lead { margin: 0; font-size: 16px; line-height: 1.8; color: var(--gold-200); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap: 20px; }
.card {
  border: 1px solid rgba(177, 154, 118, 0.35); border-radius: 20px; padding: 28px;
  display: flex; flex-direction: column; gap: 18px; background: rgba(255, 255, 255, 0.03);
}
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.who { display: flex; gap: 14px; align-items: center; }
.icon {
  width: 44px; height: 44px; border-radius: 12px; background: var(--cream-100); color: var(--ink-900);
  display: flex; align-items: center; justify-content: center;
}
.title { font-family: var(--font-heading); font-size: 20px; font-weight: 700; color: #fff; }
.days { font-size: 13px; color: var(--gold-300); }
.price { font-size: 20px; font-weight: 700; color: var(--cream-100); white-space: nowrap; }
.steps { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.steps li { display: flex; gap: 12px; align-items: center; font-size: 15px; color: var(--gold-100); }
.num {
  width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--gold-400); display: flex;
  align-items: center; justify-content: center; font-size: 12px; color: var(--gold-300); flex-shrink: 0;
}
.cta { margin-top: auto; }
</style>
