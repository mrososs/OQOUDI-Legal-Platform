<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import type { Localized } from '#shared/domain/localized'

const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()

interface AboutBody {
  paragraphs?: Localized[]
  values?: { title: Localized, text: Localized }[]
}

const { data: page } = await useAsyncData('page:about', async () => {
  const { data } = await supabase.from('content_pages').select('title, body').eq('slug', 'about').eq('is_published', true).maybeSingle()
  return data ? { title: data.title as unknown as Localized, body: data.body as unknown as AboutBody } : null
})

useSeoMeta({
  title: () => t('nav.about'),
  description: () => f.text(page.value?.body.paragraphs?.[0]),
})
</script>

<template>
  <div>
    <section class="container hero">
      <div class="text">
        <span class="eyebrow">{{ t('nav.about') }}</span>
        <h1 class="title">{{ f.text(page?.title) }}</h1>
        <p v-for="(p, i) in page?.body.paragraphs ?? []" :key="i" class="para">{{ f.text(p) }}</p>
      </div>
      <div class="logo-box">
        <img src="/brand/oqoudi-logo-1200.png" :alt="t('brand.name')" width="380" height="380">
      </div>
    </section>
    <section class="container values">
      <div v-for="(v, i) in page?.body.values ?? []" :key="i" class="kh-card value">
        <div class="value-title">{{ f.text(v.title) }}</div>
        <p class="value-text">{{ f.text(v.text) }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  padding-block: clamp(40px, 7vw, 88px);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: clamp(32px, 5vw, 72px);
  align-items: center;
}
.text { display: flex; flex-direction: column; gap: 18px; }
.title { font-size: clamp(30px, 4vw, 46px); font-weight: 800; margin: 0; line-height: 1.3; }
.para { margin: 0; font-size: 17px; line-height: 1.9; }
.logo-box { background: var(--cream-100); border-radius: 28px; padding: 32px; display: flex; justify-content: center; }
.logo-box img { width: min(100%, 380px); height: auto; display: block; }
.values { padding-bottom: 96px; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 20px; }
.value { display: flex; flex-direction: column; gap: 10px; }
.value-title { font-family: var(--font-heading); font-size: 20px; font-weight: 700; color: var(--text-strong); }
.value-text { margin: 0; font-size: 15px; line-height: 1.8; }
</style>
