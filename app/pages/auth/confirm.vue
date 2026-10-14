<script setup lang="ts">
/** Email-confirmation landing: the browser client exchanges the code, then we continue. */
const { t } = useI18n()
const user = useSupabaseUser()
const session = useSessionStore()
const localePath = useLocalePath()
const route = useRoute()

const failed = computed(() => typeof route.query.error_description === 'string')

watch(() => user.value?.sub, async (id) => {
  if (!id) return
  await session.load(id, true)
  await navigateTo(localePath(session.isStaff ? '/dashboard' : '/account'))
}, { immediate: true })

useSeoMeta({ title: () => t('auth.confirmTitle'), robots: 'noindex' })
</script>

<template>
  <AuthCard>
    <h1 class="title">{{ t('auth.confirmTitle') }}</h1>
    <UiAlert v-if="failed" tone="caution">{{ t('auth.confirmFailed') }}</UiAlert>
    <p v-else class="lead" aria-live="polite">{{ t('auth.confirming') }}</p>
    <UiButton variant="secondary" to="/auth/login">{{ t('auth.signIn') }}</UiButton>
  </AuthCard>
</template>

<style scoped>
.title { font-size: 22px; font-weight: 700; margin: 0; text-align: center; }
.lead { margin: 0; text-align: center; color: var(--text-muted); }
</style>
