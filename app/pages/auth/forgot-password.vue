<script setup lang="ts">
import { EMAIL_RE } from '#shared/domain/validators'

const { t } = useI18n()
const supabase = useSupabaseClient()
const localePath = useLocalePath()
const runtime = useRuntimeConfig()

const email = shallowRef('')
const error = shallowRef('')
const busy = shallowRef(false)
const sent = shallowRef(false)

async function submit() {
  error.value = EMAIL_RE.test(email.value.trim()) ? '' : t('formErrors.email')
  if (error.value) return
  busy.value = true
  const { error: authError } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
    redirectTo: `${runtime.public.siteUrl}${localePath('/auth/reset-password')}`,
  })
  busy.value = false
  if (authError?.status === 429) {
    error.value = t('errors.OQ429')
    return
  }
  // Always the same confirmation (no account enumeration).
  sent.value = true
}

useSeoMeta({ title: () => t('auth.forgotTitle'), robots: 'noindex' })
</script>

<template>
  <AuthCard>
    <h1 class="title">{{ t('auth.forgotTitle') }}</h1>
    <UiAlert v-if="sent" tone="positive">{{ t('auth.resetSent') }}</UiAlert>
    <form v-else class="form" novalidate @submit.prevent="submit">
      <p class="lead">{{ t('auth.forgotLead') }}</p>
      <UiInput v-model="email" :label="t('auth.email')" type="email" dir="ltr" autocomplete="email" required :error="error" />
      <UiButton type="submit" size="lg" block :loading="busy">{{ t('auth.sendResetLink') }}</UiButton>
    </form>
    <NuxtLinkLocale to="/auth/login" class="back">{{ t('auth.backToLogin') }}</NuxtLinkLocale>
  </AuthCard>
</template>

<style scoped>
.title { font-size: 22px; font-weight: 700; margin: 0; text-align: center; }
.form { display: flex; flex-direction: column; gap: 14px; }
.lead { margin: 0; color: var(--text-muted); line-height: 1.7; }
.back { font-size: 14px; text-align: center; }
</style>
