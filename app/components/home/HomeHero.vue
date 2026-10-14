<script setup lang="ts">
import { Check, Scale, Search, Video } from '@lucide/vue'

/**
 * Landing hero: real (translatable, indexable) headline + service search,
 * beside an illustration of what the client actually receives — a
 * lawyer-reviewed contract, its delivery status and the order stages.
 * The backdrop echoes the Egyptian gateway of the brand cover art.
 */
const { t } = useI18n()
const f = useFormat()
const localePath = useLocalePath()
const query = shallowRef('')

const quick = computed(() => [
  { label: t('home.quick.lease'), q: t('home.quick.leaseQuery') },
  { label: t('home.quick.company'), q: t('home.quick.companyQuery') },
  { label: t('home.quick.consultation'), q: t('home.quick.consultationQuery') },
])

const stages = ['payment', 'review', 'work', 'delivery'] as const

function search(q = query.value) {
  navigateTo({ path: localePath('/services'), query: q.trim() ? { q: q.trim() } : {} })
}
</script>

<template>
  <section class="hero">
    <div class="container grid">
      <div class="copy">
        <p class="eyebrow-line rise" style="--d: 0ms">{{ t('home.hero.eyebrow') }}</p>
        <h1 class="title rise" style="--d: 60ms">{{ t('home.hero.title') }}</h1>
        <p class="tagline rise" style="--d: 120ms">{{ t('home.hero.tagline') }}</p>
        <p class="lead rise" style="--d: 180ms">{{ t('home.lead') }}</p>

        <form class="search rise" style="--d: 240ms" role="search" @submit.prevent="search()">
          <Search :size="20" :stroke-width="1.8" class="search-icon" aria-hidden="true" />
          <input
            v-model="query"
            type="search"
            :placeholder="t('home.searchPlaceholder')"
            :aria-label="t('home.searchLabel')"
          >
          <UiButton type="submit">{{ t('home.searchCta') }}</UiButton>
        </form>

        <div class="quick rise" style="--d: 300ms">
          <span class="quick-label">{{ t('home.popular') }}</span>
          <button v-for="c in quick" :key="c.label" type="button" class="chip" @click="search(c.q)">{{ c.label }}</button>
        </div>

        <div class="ctas rise" style="--d: 360ms">
          <UiButton variant="secondary" to="/services">{{ t('home.browseArrow') }}</UiButton>
          <NuxtLinkLocale to="/service/video-consultation" class="meet-link">
            <Video :size="18" :stroke-width="1.8" aria-hidden="true" />
            {{ t('home.bookMeeting') }}
          </NuxtLinkLocale>
        </div>
      </div>

      <figure class="visual" role="img" :aria-label="t('home.hero.visualLabel')">
        <!-- Egyptian gateway line art (decorative) -->
        <svg class="gate" viewBox="0 0 520 520" fill="none" aria-hidden="true">
          <g stroke="currentColor" stroke-width="1.2">
            <path d="M58 92h404M66 92l10-26h368l10 26M58 104h404M58 112h404" />
            <path v-for="i in 33" :key="i" :d="`M${66 + i * 11} 70v20`" opacity=".55" />
            <path d="M232 80c-30-18-70-20-112-8M288 80c30-18 70-20 112-8" />
            <circle cx="260" cy="80" r="11" />
            <path d="M104 112v408M416 112v408M140 148h240v372M140 148v372" />
            <path d="M176 184h168v336M176 184v336M212 220h96v300M212 220v300" opacity=".7" />
            <path d="M104 132h312M140 166h240" opacity=".5" />
          </g>
        </svg>

        <div class="doc" aria-hidden="true">
          <div class="doc-head">
            <img src="/brand/oqoudi-logo-tight.png" alt="" width="34" height="34" class="doc-logo">
            <span class="doc-no ltr">DQ-10254</span>
          </div>
          <div class="doc-kind">{{ t('home.hero.doc.kind') }}</div>
          <div class="doc-rule" />
          <div class="clause">{{ t('home.hero.doc.clause1') }}</div>
          <span class="ln" style="--w: 100%" />
          <span class="ln" style="--w: 92%" />
          <span class="ln" style="--w: 64%" />
          <div class="clause">{{ t('home.hero.doc.clause2') }}</div>
          <span class="ln" style="--w: 96%" />
          <span class="ln" style="--w: 78%" />
          <div class="sigs">
            <div class="sig">
              <svg viewBox="0 0 120 36" class="sig-ink"><path d="M4 26c10-14 18-20 22-12s-6 16 2 12 14-22 22-18-4 18 6 14 12-10 20-12 10 6 18 2 10-8 20-8" /></svg>
              <span class="sig-label">{{ t('home.hero.doc.party1') }}</span>
            </div>
            <div class="sig">
              <svg viewBox="0 0 120 36" class="sig-ink"><path d="M6 22c8-4 12-14 20-12s-4 18 6 16 10-18 18-16 2 14 10 12 16-16 24-14-2 12 8 10 14-6 22-4" /></svg>
              <span class="sig-label">{{ t('home.hero.doc.party2') }}</span>
            </div>
          </div>
        </div>

        <div class="seal" aria-hidden="true">
          <svg viewBox="0 0 120 120" class="seal-art">
            <circle cx="60" cy="60" r="58" class="seal-disc" />
            <circle cx="60" cy="60" r="53" class="seal-ring" />
            <path v-for="i in 48" :key="i" d="M60 10v6" class="seal-tick" :transform="`rotate(${i * 7.5} 60 60)`" />
            <circle cx="60" cy="60" r="41" class="seal-ring" />
            <circle cx="60" cy="60" r="30" class="seal-ring seal-ring--inner" />
          </svg>
          <Scale class="seal-mark" :stroke-width="1.6" />
        </div>

        <div class="tag tag-status" aria-hidden="true">
          <span class="tag-check"><Check :size="14" :stroke-width="2.6" /></span>
          <span><strong>{{ t('home.hero.delivered') }}</strong> · {{ t('home.hero.version', { n: f.number(2) }) }}</span>
        </div>

        <ol class="tag tag-stages" aria-hidden="true">
          <li v-for="(s, i) in stages" :key="s" :class="{ last: i === stages.length - 1 }">
            <span class="dot">
              <Check v-if="i < stages.length - 1" :size="11" :stroke-width="3" />
            </span>
            <span class="stage">{{ t(`flow.${s}`) }}</span>
          </li>
        </ol>
      </figure>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative; overflow: hidden;
  background:
    radial-gradient(ellipse 60% 70% at 18% 40%, rgba(227, 207, 171, 0.45), transparent 70%),
    linear-gradient(180deg, var(--cream-50), var(--surface-page));
  border-bottom: 1px solid var(--border-subtle);
}
.grid {
  display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  align-items: center; gap: clamp(32px, 5vw, 72px);
  padding-block: clamp(32px, 4.5vw, 64px) clamp(40px, 5.5vw, 80px);
}

/* ---------- Copy ---------- */
.eyebrow-line {
  display: flex; align-items: center; gap: 12px; margin: 0 0 18px;
  font-size: 14px; font-weight: 600; color: var(--gold-600);
}
.eyebrow-line::before { content: ''; width: 28px; height: 1.5px; background: var(--gold-400); flex-shrink: 0; }
.title {
  font-family: var(--font-display); font-weight: 800; color: var(--ink-900);
  font-size: clamp(32px, 3.8vw, 52px); line-height: 1.2; margin: 0 0 12px; text-wrap: balance;
}
.tagline {
  font-family: var(--font-display); font-weight: 600; color: var(--gold-600);
  font-size: clamp(19px, 2vw, 26px); line-height: 1.4; margin: 0 0 18px;
}
.lead { font-size: 17px; line-height: 1.8; color: var(--text-body); max-width: 54ch; margin: 0 0 24px; }

.search {
  display: flex; align-items: center; gap: 8px; max-width: 600px;
  background: var(--surface-card); border: 1.5px solid var(--border-default); border-radius: 16px;
  padding: 7px; box-shadow: var(--shadow-md); transition: var(--transition-base);
}
.search:focus-within { border-color: var(--accent); box-shadow: var(--shadow-md), var(--shadow-focus); }
.search-icon { color: var(--text-muted); flex-shrink: 0; margin-inline: 10px 2px; }
.search input {
  flex: 1; min-width: 0; border: none; outline: none; background: transparent;
  font-size: 16px; color: var(--text-strong); padding-block: 8px;
}
.search input::placeholder { color: var(--text-subtle); }

.quick { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 16px; }
.quick-label { font-size: 13px; color: var(--text-muted); }
.chip {
  border: 1px solid var(--border-default); background: rgba(255, 255, 255, 0.6); border-radius: 999px;
  padding: 6px 14px; font-size: 13px; color: var(--text-body); cursor: pointer; white-space: nowrap;
  transition: var(--transition-base);
}
.chip:hover { border-color: var(--ink-900); color: var(--text-strong); background: var(--surface-card); }

.ctas { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 22px; margin-top: 22px; }
.meet-link {
  display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px;
  color: var(--text-strong); padding: 8px 2px; border-bottom: 1.5px solid var(--gold-300);
}
.meet-link:hover { color: var(--gold-600); border-color: var(--gold-500); }

/* ---------- Visual ---------- */
.visual { position: relative; margin: 0; aspect-ratio: 1; width: 100%; max-width: 500px; justify-self: center; }
.gate { position: absolute; inset: 0; width: 100%; height: 100%; color: var(--gold-400); opacity: 0.45; }

.doc {
  position: absolute; inset-block-start: 15%; inset-inline-start: 19%; width: 62%;
  background: #FFFDF8; border: 1px solid var(--gold-100); border-radius: 6px;
  padding: clamp(16px, 2.4vw, 26px); box-shadow: var(--shadow-lg), 0 1px 0 var(--gold-50);
  rotate: -2.5deg; display: flex; flex-direction: column; gap: 9px;
}
.doc::after { /* stacked sheet beneath */
  content: ''; position: absolute; inset: 8px -8px -8px 8px; z-index: -1;
  background: #F8F1E3; border: 1px solid var(--gold-100); border-radius: 6px; rotate: 2deg;
}
.doc-head { display: flex; align-items: center; justify-content: space-between; }
.doc-logo { width: 34px; height: 34px; object-fit: contain; }
.doc-no { font-size: 11px; color: var(--text-subtle); letter-spacing: 0.06em; }
.doc-kind { font-family: var(--font-display); font-weight: 700; color: var(--ink-900); font-size: clamp(14px, 1.5vw, 18px); }
.doc-rule { height: 2px; width: 44px; background: var(--gold-400); border-radius: 2px; margin-block: 2px 4px; }
.clause { font-size: clamp(10px, 1vw, 12px); font-weight: 700; color: var(--ink-700); margin-top: 4px; }
.ln { display: block; height: 6px; width: var(--w); border-radius: 3px; background: var(--neutral-200); }
.sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 12px; }
.sig { display: flex; flex-direction: column; gap: 4px; }
.sig-ink { width: 100%; height: 30px; border-bottom: 1px solid var(--border-default); }
.sig-ink path {
  fill: none; stroke: var(--ink-700); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 260; stroke-dashoffset: 260; animation: sign 1.1s var(--ease-out) forwards;
  animation-delay: 900ms;
}
.sig:last-child .sig-ink path { animation-delay: 1250ms; }
.sig-label { font-size: 10px; color: var(--text-muted); }

.seal {
  position: absolute; width: 21%; aspect-ratio: 1; inset-block-end: 9%; inset-inline-end: 7%;
  filter: drop-shadow(0 8px 14px rgba(102, 80, 47, 0.28)); rotate: -10deg;
  display: grid; place-items: center;
}
.seal-art { position: absolute; inset: 0; width: 100%; height: 100%; }
.seal-disc { fill: var(--gold-500); }
.seal-ring { fill: none; stroke: var(--cream-100); stroke-width: 1; opacity: 0.8; }
.seal-ring--inner { stroke-width: 1.4; }
.seal-tick { stroke: var(--cream-100); stroke-width: 1.2; opacity: 0.7; }
.seal-mark { position: relative; width: 38%; height: 38%; color: var(--cream-50); }

.tag {
  position: absolute; background: var(--surface-card); border: 1px solid var(--border-subtle);
  border-radius: 14px; box-shadow: var(--shadow-md); font-size: 13px; color: var(--text-body);
}
.tag-status {
  inset-block-start: 9%; inset-inline-end: 0; display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  white-space: nowrap;
}
.tag-status strong { color: var(--positive-500); }
.tag-check {
  width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center;
  background: var(--positive-100); color: var(--positive-500);
}
.tag-stages {
  inset-block-end: 4%; inset-inline-start: 0; margin: 0; padding: 12px 16px; list-style: none;
  display: flex; gap: 6px;
}
.tag-stages li { display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; min-width: 52px; }
.tag-stages li:not(.last)::after {
  content: ''; position: absolute; top: 10px; inset-inline-start: calc(50% + 13px); width: calc(100% - 20px);
  height: 2px; background: var(--positive-500); opacity: 0.35;
}
.dot {
  width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center;
  background: var(--positive-500); color: #fff;
}
.last .dot { background: var(--gold-500); box-shadow: 0 0 0 4px var(--gold-50); }
.stage { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.last .stage { color: var(--text-strong); font-weight: 600; }

/* ---------- Motion: one orchestrated entrance ---------- */
.hero { --ease-out: cubic-bezier(0.22, 1, 0.36, 1); }
.rise { animation: rise 700ms var(--ease-out) both; animation-delay: var(--d, 0ms); }
.doc { animation: doc-in 900ms var(--ease-out) 150ms both; }
.seal { animation: stamp 520ms var(--ease-out) 1500ms both; }
.tag-status { animation: rise 700ms var(--ease-out) 650ms both; }
.tag-stages { animation: rise 700ms var(--ease-out) 800ms both; }
.gate { animation: fade 1400ms ease-out both; }

@keyframes rise { from { opacity: 0; translate: 0 14px; } }
@keyframes fade { from { opacity: 0; } }
@keyframes doc-in { from { opacity: 0; translate: 0 28px; rotate: 1deg; } }
@keyframes stamp { from { opacity: 0; scale: 1.6; rotate: -28deg; } }
@keyframes sign { to { stroke-dashoffset: 0; } }

/* ---------- Responsive ---------- */
@media (max-width: 959px) {
  .grid { grid-template-columns: minmax(0, 1fr); }
  .visual { max-width: 460px; }
}
@media (max-width: 520px) {
  .search :deep(.kh-btn) { padding-inline: 1rem; }
  .doc { width: 72%; inset-inline-start: 14%; inset-block-start: 12%; }
  .seal { width: 20%; inset-block-end: 3%; inset-inline-end: 1%; }
  .tag-stages { inset-block-end: 0; }
  .tag { font-size: 12px; }
  .tag-stages { padding: 10px 12px; }
  .tag-stages li { min-width: 44px; }
}
</style>
