<script setup lang="ts">
import { isStrongPassword } from '#shared/domain/validators'

/**
 * Landing page of the reset email. The Supabase browser client exchanges
 * the PKCE code from the URL for a short recovery session automatically.
 */
const { t } = useI18n()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const localePath = useLocalePath()

const password = shallowRef('')
const confirm = shallowRef('')
const errors = reactive<{ password?: string, confirm?: string }>({})
const failure = shallowRef('')
const busy = shallowRef(false)
const done = shallowRef(false)
const ready = computed(() => !!user.value)

async function submit() {
  errors.password = isStrongPassword(password.value) ? undefined : t('formErrors.password')
  errors.confirm = password.value === confirm.value ? undefined : t('formErrors.passwordMatch')
  if (errors.password || errors.confirm) return
  busy.value = true
  const { error } = await supabase.auth.updateUser({ password: password.value })
  busy.value = false
  if (error) {
    failure.value = error.code === 'same_password' ? t('auth.samePassword') : t('auth.resetFailed')
    return
  }
  done.value = true
  setTimeout(() => navigateTo(localePath('/account')), 1500)
}

useSeoMeta({ title: () => t('auth.resetTitle'), robots: 'noindex' })
</script>

<template>
  <AuthCard>
    <h1 class="title">{{ t('auth.resetTitle') }}</h1>
    <UiAlert v-if="done" tone="positive">{{ t('auth.resetDone') }}</UiAlert>
    <template v-else-if="ready">
      <UiAlert v-if="failure">{{ failure }}</UiAlert>
      <form class="form" novalidate @submit.prevent="submit">
        <UiInput v-model="password" :label="t('auth.newPassword')" type="password" dir="ltr" autocomplete="new-password" required :hint="t('auth.passwordHint')" :error="errors.password" />
        <UiInput v-model="confirm" :label="t('auth.confirmPassword')" type="password" dir="ltr" autocomplete="new-password" required :error="errors.confirm" />
        <UiButton type="submit" size="lg" block :loading="busy">{{ t('auth.savePassword') }}</UiButton>
      </form>
    </template>
    <template v-else>
      <UiAlert tone="caution">{{ t('auth.resetLinkInvalid') }}</UiAlert>
      <UiButton variant="secondary" to="/auth/forgot-password">{{ t('auth.sendResetLink') }}</UiButton>
    </template>
  </AuthCard>
</template>

<style scoped>
.title { font-size: 22px; font-weight: 700; margin: 0; text-align: center; }
.form { display: flex; flex-direction: column; gap: 14px; }
</style>
