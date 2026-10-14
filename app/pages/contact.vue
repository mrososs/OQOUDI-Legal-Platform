<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import type { Localized } from '#shared/domain/localized'
import { EMAIL_RE, isEgyptianMobile } from '#shared/domain/validators'
import { fetchPublicSetting } from '~/repositories/catalog'

const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const { call, toFailure } = useApi()

interface ContactSetting { phone: string, email: string, hours: Localized, address: Localized }
const { data: contact } = await useAsyncData('setting:contact', () => fetchPublicSetting<ContactSetting>(supabase, 'contact'))

const form = reactive({ name: '', phone: '', email: '', message: '', website: '' })
const errors = reactive<Record<string, string | undefined>>({})
const failure = shallowRef('')
const busy = shallowRef(false)
const sent = shallowRef(false)

function validate() {
  errors.name = form.name.trim().length >= 2 ? undefined : t('formErrors.required')
  errors.phone = isEgyptianMobile(form.phone) ? undefined : t('formErrors.phone')
  errors.email = !form.email || EMAIL_RE.test(form.email.trim()) ? undefined : t('formErrors.email')
  errors.message = form.message.trim().length >= 10 ? undefined : t('formErrors.minLength', { min: f.number(10) })
  return !Object.values(errors).some(Boolean)
}

async function submit() {
  failure.value = ''
  if (!validate()) return
  busy.value = true
  try {
    await call('/api/contact', { method: 'POST', body: { ...form, email: form.email.trim() } })
    sent.value = true
  }
  catch (err) {
    failure.value = toFailure(err).message
  }
  finally {
    busy.value = false
  }
}

useSeoMeta({ title: () => t('nav.contact'), description: () => t('contactPage.lead') })
</script>

<template>
  <section class="container wrap">
    <div class="info">
      <span class="eyebrow">{{ t('nav.contact') }}</span>
      <h1 class="title">{{ t('contactPage.title') }}</h1>
      <p class="lead">{{ t('contactPage.lead') }}</p>
      <dl v-if="contact" class="facts">
        <div><dt>{{ t('contactPage.phone') }}</dt><dd class="ltr">{{ contact.phone }}</dd></div>
        <div><dt>{{ t('contactPage.email') }}</dt><dd class="ltr">{{ contact.email }}</dd></div>
        <div><dt>{{ t('contactPage.hours') }}</dt><dd>{{ f.text(contact.hours) }}</dd></div>
        <div><dt>{{ t('contactPage.address') }}</dt><dd>{{ f.text(contact.address) }}</dd></div>
      </dl>
    </div>
    <div class="form-col">
      <div v-if="sent" class="kh-card sent" role="status">
        <UiBadge tone="positive" dot>{{ t('contactPage.sentBadge') }}</UiBadge>
        <div class="sent-title">{{ t('contactPage.sentTitle') }}</div>
        <p class="no-margin">{{ t('contactPage.sentText') }}</p>
      </div>
      <form v-else class="kh-card form" novalidate @submit.prevent="submit">
        <UiAlert v-if="failure">{{ failure }}</UiAlert>
        <UiInput v-model="form.name" :label="t('contactPage.name')" autocomplete="name" required :error="errors.name" />
        <UiInput v-model="form.phone" :label="t('auth.phone')" type="tel" dir="ltr" inputmode="tel" placeholder="+20 1X XXXX XXXX" required :error="errors.phone" />
        <UiInput v-model="form.email" :label="t('auth.email')" type="email" dir="ltr" autocomplete="email" :error="errors.email" />
        <UiTextarea v-model="form.message" :label="t('contactPage.message')" required :error="errors.message" />
        <!-- honeypot: hidden from people, bots tend to fill it -->
        <input v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off" class="sr-only" aria-hidden="true">
        <UiButton type="submit" size="lg" :loading="busy">{{ t('contactPage.send') }}</UiButton>
      </form>
    </div>
  </section>
</template>

<style scoped>
.wrap { padding-block: clamp(40px, 7vw, 88px) 96px; display: flex; flex-wrap: wrap; gap: clamp(24px, 5vw, 64px); }
.info { flex: 1 1 320px; display: flex; flex-direction: column; gap: 18px; }
.title { font-size: clamp(30px, 4vw, 44px); font-weight: 800; margin: 0; }
.lead { margin: 0; font-size: 16px; line-height: 1.8; }
.facts { margin: 0; display: flex; flex-direction: column; gap: 14px; font-size: 15px; }
.facts dt { font-size: 13px; color: var(--text-muted); }
.facts dd { margin: 0; font-weight: 600; color: var(--text-strong); }
.form-col { flex: 1 1 420px; }
.form { display: flex; flex-direction: column; gap: 16px; padding: 28px; }
.sent { display: flex; flex-direction: column; gap: 10px; padding: 32px; }
.sent-title { font-family: var(--font-heading); font-size: 22px; font-weight: 700; color: var(--text-strong); }
.no-margin { margin: 0; }
</style>
