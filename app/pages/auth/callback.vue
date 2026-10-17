<script setup lang="ts">
/** Google (OAuth) return page: waits for the session, then routes via the shared post-auth rules. */
const { t } = useI18n()
const { failure, run } = useOAuthCallback()

onMounted(run)

useSeoMeta({ title: () => t('auth.callback.title'), robots: 'noindex' })
</script>

<template>
  <AuthCard>
    <h1 class="title">{{ t('auth.callback.title') }}</h1>
    <template v-if="failure">
      <UiAlert tone="caution" data-testid="oauth-failure" :data-failure="failure">
        {{ t(`auth.callback.failed.${failure}`) }}
      </UiAlert>
      <div class="actions">
        <UiButton to="/auth/login" size="lg" block>{{ t('auth.callback.retry') }}</UiButton>
        <UiButton to="/auth/register" variant="secondary" block>{{ t('auth.registerTab') }}</UiButton>
      </div>
    </template>
    <p v-else class="lead" role="status" aria-live="polite">{{ t('auth.callback.signingIn') }}</p>
  </AuthCard>
</template>

<style scoped>
.title { font-size: 22px; font-weight: 700; margin: 0; text-align: center; }
.lead { margin: 0; text-align: center; color: var(--text-muted); }
.actions { display: flex; flex-direction: column; gap: 10px; }
</style>
