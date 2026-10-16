<script setup lang="ts">
import { ArrowLeft, ArrowRight, Sparkles } from '@lucide/vue'

/**
 * Launch-offer announcement above the public navigation (the navbar itself is untouched).
 * Rendered only while the campaign is genuinely active; it disappears by itself at the end
 * of the window. Navy + gold, slow shimmer (disabled for reduced-motion), RTL/LTR aware.
 */
const { t, locale } = useI18n()
const { active } = useLaunchCampaign()
const Arrow = computed(() => (locale.value === 'en' ? ArrowRight : ArrowLeft))
</script>

<template>
  <aside v-if="active" class="offer" role="region" :aria-label="t('launch.banner.label')">
    <div class="container inner">
      <span class="seal" aria-hidden="true"><Sparkles :size="18" :stroke-width="1.8" /></span>
      <div class="copy">
        <p class="headline">{{ t('launch.banner.title') }}</p>
        <p class="support">{{ t('launch.banner.text') }}</p>
      </div>
      <ServicesLaunchCountdown tone="dark" class="chip" />
      <NuxtLinkLocale to="/services?offer=launch" class="cta">
        {{ t('launch.banner.cta') }}
        <component :is="Arrow" :size="16" :stroke-width="2" class="arrow" aria-hidden="true" />
      </NuxtLinkLocale>
    </div>
  </aside>
</template>

<style scoped>
.offer {
  position: relative; color: var(--cream-50); overflow: hidden;
  background: linear-gradient(100deg, var(--footer-900) 0%, var(--ink-900) 45%, var(--ink-800) 100%);
  border-bottom: 1px solid var(--gold-500);
}
/* slow gold sheen — purely decorative */
.offer::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(110deg, transparent 30%, rgba(184, 147, 90, 0.18) 50%, transparent 70%);
  background-size: 220% 100%; animation: offer-sheen 9s ease-in-out infinite;
}
@keyframes offer-sheen { 0% { background-position: 120% 0; } 100% { background-position: -120% 0; } }
.inner { position: relative; display: flex; align-items: center; gap: 14px 18px; padding-block: 10px; flex-wrap: wrap; }
.seal {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center;
  color: var(--ink-900); background: linear-gradient(145deg, var(--gold-300), var(--gold-500));
}
.copy { flex: 1 1 320px; min-width: 0; }
.headline { margin: 0; font-family: var(--font-heading); font-weight: 700; font-size: 15px; line-height: 1.5; color: #fff; }
.support { margin: 2px 0 0; font-size: 13px; line-height: 1.5; color: var(--gold-100); }
.chip { flex-shrink: 0; }
.cta {
  display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; white-space: nowrap;
  padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 700; color: var(--ink-900);
  background: linear-gradient(145deg, var(--gold-200), var(--gold-400)); border: 1px solid var(--gold-300);
  transition: transform .15s ease, box-shadow .15s ease;
}
.cta:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28); }
.cta:focus-visible { outline: 2px solid var(--gold-200); outline-offset: 2px; }
.arrow { transition: transform .15s ease; }
.cta:hover .arrow { transform: translateX(calc(var(--dir-sign, 1) * -3px)); }

@media (max-width: 720px) {
  .inner { gap: 8px 12px; padding-block: 10px 12px; }
  .seal { width: 28px; height: 28px; }
  .headline { font-size: 14px; }
  .support { display: none; }
  .cta { flex: 1 1 100%; justify-content: center; }
  .chip { flex: 1 1 100%; }
}
@media (prefers-reduced-motion: reduce) { .offer::before { animation: none; } }
</style>
