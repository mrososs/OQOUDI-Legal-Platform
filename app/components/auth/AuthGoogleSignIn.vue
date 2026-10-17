<script setup lang="ts">
const props = defineProps<{
  /** Untrusted post-login destination (the page's `?redirect=`). */
  redirect?: unknown
  hint?: string
}>()

const { t } = useI18n()
const { busy, error, start } = useGoogleSignIn()
</script>

<template>
  <div class="google">
    <div class="divider" role="separator">
      <span>{{ t('auth.or') }}</span>
    </div>
    <UiAlert v-if="error">{{ error }}</UiAlert>
    <UiButton
      variant="secondary"
      size="lg"
      block
      class="google-btn"
      data-testid="google-signin"
      :loading="busy"
      @click="start(props.redirect)"
    >
      <svg v-if="!busy" class="g-logo" width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      <span>{{ busy ? t('auth.googleRedirecting') : t('auth.continueWithGoogle') }}</span>
    </UiButton>
    <p v-if="hint" class="hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.google { display: flex; flex-direction: column; gap: 14px; }
.divider { display: flex; align-items: center; gap: 12px; color: var(--text-muted); font-size: 13px; }
.divider::before,
.divider::after { content: ''; flex: 1; height: 1px; background: var(--border-subtle); }
/* Neutral white button: Google's mark keeps its own colours. */
.google-btn { align-items: center; justify-content: center; gap: 10px; background: #fff; border-color: var(--border-default); color: var(--text-strong); font-weight: 600; }
.google-btn:hover:not(:disabled) { background: var(--surface-sunken); border-color: var(--border-default); color: var(--text-strong); }
.g-logo { flex-shrink: 0; }
.hint { margin: 0; font-size: 13px; color: var(--text-muted); text-align: center; line-height: 1.6; }
</style>
