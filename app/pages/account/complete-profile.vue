<script setup lang="ts">
/** First-time customer onboarding. Guarded by the `onboarding` middleware (signed in + still incomplete). */
definePageMeta({ middleware: ['onboarding'] })

const { t } = useI18n()

useSeoMeta({ title: () => t('onboarding.title'), robots: 'noindex' })
</script>

<template>
  <AuthCard>
    <AuthOnboardingForm />
  </AuthCard>
</template>
