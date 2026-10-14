<script setup lang="ts">
import { EMAIL_RE, isEgyptianMobile, isStrongPassword, normalizeEgyptianMobile } from '#shared/domain/validators'

definePageMeta({ middleware: ['guest'] })

const { t, locale } = useI18n()
const supabase = useSupabaseClient()
const localePath = useLocalePath()
const runtime = useRuntimeConfig()

type Kind = 'individual' | 'company'
const form = reactive({ fullName: '', kind: 'individual' as Kind, companyName: '', phone: '', email: '', password: '' })
const errors = reactive<Record<string, string | undefined>>({})
const failure = shallowRef('')
const busy = shallowRef(false)
const sentTo = shallowRef<string | null>(null)

function validate(): boolean {
  errors.fullName = form.fullName.trim().length >= 3 ? undefined : t('formErrors.required')
  errors.companyName = form.kind === 'company' && form.companyName.trim().length < 2 ? t('formErrors.required') : undefined
  errors.phone = isEgyptianMobile(form.phone) ? undefined : t('formErrors.phone')
  errors.email = EMAIL_RE.test(form.email.trim()) ? undefined : t('formErrors.email')
  errors.password = isStrongPassword(form.password) ? undefined : t('formErrors.password')
  return !Object.values(errors).some(Boolean)
}

async function submit() {
  failure.value = ''
  if (!validate()) return
  busy.value = true
  // Only descriptive metadata is sent. Security roles are never taken from
  // signup data — the database grants `customer` and nothing else.
  const { error } = await supabase.auth.signUp({
    email: form.email.trim(),
    password: form.password,
    options: {
      emailRedirectTo: `${runtime.public.siteUrl}${localePath('/auth/confirm')}`,
      data: {
        full_name: form.fullName.trim(),
        account_type: form.kind,
        company_name: form.kind === 'company' ? form.companyName.trim() : null,
        phone: normalizeEgyptianMobile(form.phone),
        locale: locale.value,
      },
    },
  })
  busy.value = false
  if (error) {
    failure.value = error.status === 429 ? t('errors.OQ429') : error.code === 'weak_password' ? t('formErrors.password') : t('auth.registerFailed')
    return
  }
  // Same message whether or not the email already exists (no enumeration).
  sentTo.value = form.email.trim()
}

useSeoMeta({ title: () => t('auth.registerTitle'), robots: 'noindex' })
</script>

<template>
  <AuthCard active="register" show-tabs>
    <div v-if="sentTo" class="sent" role="status">
      <UiBadge tone="positive" dot>{{ t('auth.checkEmailBadge') }}</UiBadge>
      <h1 class="sent-title">{{ t('auth.checkEmailTitle') }}</h1>
      <p class="sent-text">{{ t('auth.checkEmailText', { email: sentTo }) }}</p>
      <UiButton variant="secondary" to="/auth/login">{{ t('auth.signIn') }}</UiButton>
    </div>
    <template v-else>
      <UiAlert v-if="failure">{{ failure }}</UiAlert>
      <form class="form" novalidate @submit.prevent="submit">
        <UiInput v-model="form.fullName" :label="t('auth.fullName')" autocomplete="name" required :error="errors.fullName" />
        <div class="kh-field">
          <span id="kind-label" class="kh-field__label">{{ t('auth.accountType') }}</span>
          <div class="kinds" role="radiogroup" aria-labelledby="kind-label">
            <button
              v-for="k in (['individual', 'company'] as const)"
              :key="k"
              type="button"
              role="radio"
              class="kind"
              :aria-checked="form.kind === k"
              @click="form.kind = k"
            >
              {{ t(`auth.kind.${k}`) }}
            </button>
          </div>
        </div>
        <UiInput v-if="form.kind === 'company'" v-model="form.companyName" :label="t('auth.companyName')" autocomplete="organization" required :error="errors.companyName" />
        <UiInput v-model="form.phone" :label="t('auth.phone')" type="tel" dir="ltr" inputmode="tel" autocomplete="tel" placeholder="+20 1X XXXX XXXX" required :error="errors.phone" />
        <UiInput v-model="form.email" :label="t('auth.email')" type="email" dir="ltr" autocomplete="email" required :error="errors.email" />
        <UiInput v-model="form.password" :label="t('auth.password')" type="password" dir="ltr" autocomplete="new-password" required :hint="t('auth.passwordHint')" :error="errors.password" />
        <UiButton type="submit" size="lg" block :loading="busy">{{ busy ? t('auth.creating') : t('auth.createAccount') }}</UiButton>
      </form>
    </template>
  </AuthCard>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 14px; }
.kinds { display: flex; gap: 8px; }
.kind {
  flex: 1; padding: 10px; border-radius: 10px; border: 1.5px solid var(--border-default); background: #fff;
  font-size: 14px; cursor: pointer; color: var(--text-strong);
}
.kind[aria-checked='true'] { border-color: var(--ink-900); background: var(--gold-50); }
.sent { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.sent-title { font-size: 22px; font-weight: 700; margin: 0; }
.sent-text { margin: 0; line-height: 1.8; }
</style>
