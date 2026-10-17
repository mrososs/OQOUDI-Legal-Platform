<script setup lang="ts">
import { EMAIL_RE } from '#shared/domain/validators'

definePageMeta({ middleware: ['guest'] })

const { t } = useI18n()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const localePath = useLocalePath()
const { settle } = usePostAuth()

const form = reactive({ email: '', password: '' })
const errors = reactive<{ email?: string, password?: string }>({})
const failure = shallowRef('')
const unconfirmed = shallowRef(false)
const busy = shallowRef(false)
const resent = shallowRef(false)

function validate(): boolean {
  errors.email = EMAIL_RE.test(form.email.trim()) ? undefined : t('formErrors.email')
  errors.password = form.password ? undefined : t('formErrors.required')
  return !errors.email && !errors.password
}

async function submit() {
  failure.value = ''
  unconfirmed.value = false
  if (!validate()) return
  busy.value = true
  const { data, error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
  if (error || !data.user) {
    busy.value = false
    if (error?.code === 'email_not_confirmed') {
      unconfirmed.value = true
      failure.value = t('auth.emailNotConfirmed')
    }
    else {
      failure.value = error?.status === 429 ? t('errors.OQ429') : t('auth.invalidCredentials')
    }
    return
  }
  // The Supabase module fills `useSupabaseUser()` from an un-awaited getClaims()
  // after SIGNED_IN (a JWKS fetch on hosted projects). Populate it before
  // navigating so the auth middleware doesn't bounce back to the login page.
  const [{ data: claims }, target] = await Promise.all([
    supabase.auth.getClaims(),
    settle(data.user.id, route.query.redirect),
  ])
  user.value = claims?.claims ?? null
  busy.value = false
  await navigateTo(target, { replace: true })
}

async function resend() {
  await supabase.auth.resend({
    type: 'signup',
    email: form.email.trim(),
    options: { emailRedirectTo: `${useRuntimeConfig().public.siteUrl}${localePath('/auth/confirm')}` },
  })
  resent.value = true
}

useSeoMeta({ title: () => t('auth.loginTitle'), robots: 'noindex' })
</script>

<template>
  <AuthCard active="login" show-tabs>
    <UiAlert v-if="failure">
      {{ failure }}
      <button v-if="unconfirmed && !resent" type="button" class="link-btn" @click="resend">{{ t('auth.resendConfirmation') }}</button>
      <span v-if="resent"> {{ t('auth.confirmationResent') }}</span>
    </UiAlert>
    <form class="form" novalidate @submit.prevent="submit">
      <UiInput v-model="form.email" :label="t('auth.email')" type="email" dir="ltr" autocomplete="email" required :error="errors.email" />
      <UiInput v-model="form.password" :label="t('auth.password')" type="password" dir="ltr" autocomplete="current-password" required :error="errors.password" />
      <NuxtLinkLocale to="/auth/forgot-password" class="forgot">{{ t('auth.forgot') }}</NuxtLinkLocale>
      <UiButton type="submit" size="lg" block :loading="busy">{{ busy ? t('auth.signingIn') : t('auth.signIn') }}</UiButton>
    </form>
    <AuthGoogleSignIn :redirect="route.query.redirect" />
  </AuthCard>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 14px; }
.forgot { font-size: 13px; align-self: flex-start; }
.link-btn { background: none; border: none; color: inherit; text-decoration: underline; cursor: pointer; padding: 0; font-weight: 700; }
</style>
