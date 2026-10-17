<script setup lang="ts">
const { t } = useI18n()
const { form, errors, failure, busy, email, submit } = useCompleteProfile()
</script>

<template>
  <div class="onboarding">
    <header class="head">
      <h1 class="title">{{ t('onboarding.title') }}</h1>
      <p class="lead">{{ t('onboarding.lead') }}</p>
    </header>

    <UiAlert v-if="failure" data-testid="onboarding-failure">{{ failure }}</UiAlert>

    <form class="form" novalidate data-testid="onboarding-form" @submit.prevent="submit">
      <UiInput v-model="form.fullName" :label="t('onboarding.fullName')" autocomplete="name" required :error="errors.fullName" />
      <UiInput :model-value="email" :label="t('onboarding.email')" type="email" dir="ltr" autocomplete="email" readonly :hint="t('onboarding.emailHint')" />
      <UiInput
        v-model="form.phone"
        :label="t('onboarding.phone')"
        type="tel"
        dir="ltr"
        inputmode="tel"
        autocomplete="tel"
        placeholder="01XXXXXXXXX"
        required
        :hint="t('onboarding.phoneHint')"
        :error="errors.phone"
      />
      <AuthAccountKindPicker v-model="form.accountKind" :error="errors.accountKind" />
      <UiInput v-if="form.accountKind === 'company'" v-model="form.companyName" :label="t('auth.companyName')" autocomplete="organization" required :error="errors.companyName" />
      <UiButton type="submit" size="lg" block :loading="busy">{{ busy ? t('onboarding.saving') : t('onboarding.submit') }}</UiButton>
    </form>

    <div class="foot">
      <LayoutSignOutButton />
    </div>
  </div>
</template>

<style scoped>
.onboarding { display: flex; flex-direction: column; gap: 18px; }
.head { display: flex; flex-direction: column; gap: 6px; text-align: center; }
.title { font-size: 22px; font-weight: 700; margin: 0; }
.lead { margin: 0; font-size: 14px; line-height: 1.8; color: var(--text-muted); }
.form { display: flex; flex-direction: column; gap: 14px; }
.foot { display: flex; justify-content: center; }
</style>
