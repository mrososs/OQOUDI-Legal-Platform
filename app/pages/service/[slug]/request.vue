<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { fetchPublishedForm, fetchServiceBySlug } from '~/repositories/catalog'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const { t } = useI18n()
const f = useFormat()
const supabase = useSupabaseClient<Database>()
const session = useSessionStore()

const slug = String(route.params.slug)
const { data } = await useAsyncData(`request:${slug}`, async () => {
  const service = await fetchServiceBySlug(supabase, slug)
  if (!service) return null
  const form = await fetchPublishedForm(supabase, service.id)
  return form ? { service, form } : null
})
if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Service not available', fatal: true })
}

const service = computed(() => data.value!.service)
const form = computed(() => data.value!.form)
const initialAddons = typeof route.query.addons === 'string' ? route.query.addons.split(',') : []
const flow = useRequestFlow(service, form, initialAddons)

const title = computed(() => {
  if (flow.isMeeting.value) return t('request.titleMeeting')
  if (flow.isQuote.value) return t('request.titleQuote', { service: f.text(service.value.title) })
  if (service.value.kind === 'written_consultation') return t('request.titleWritten')
  return t('request.titleService', { service: f.text(service.value.title) })
})

useSeoMeta({ title, robots: 'noindex' })
</script>

<template>
  <section class="wrap">
    <div class="top">
      <div class="top-text">
        <NuxtLinkLocale :to="`/service/${service.slug}`" class="back-link">
          {{ t('request.backTo', { service: f.text(service.title) }) }}
        </NuxtLinkLocale>
        <h1 class="title">{{ title }}</h1>
      </div>
      <CheckoutRequestStepper :steps="flow.stepLabels.value" :current="flow.stepIndex.value" />
    </div>

    <div class="layout">
      <div class="main-col">
        <UiAlert v-if="flow.submitError.value" :title="t('request.errorTitle')">{{ flow.submitError.value }}</UiAlert>

        <BookingSlotPicker v-if="flow.step.value === 'slot'" v-model="flow.slot.value" />

        <template v-else-if="flow.step.value === 'form'">
          <UiAlert v-if="flow.formAlert.value">{{ flow.formAlert.value }}</UiAlert>
          <FormsDynamicForm
            v-model:answers="flow.answers.value"
            v-model:files="flow.files.value"
            :fields="form.fields"
            :errors="flow.errors.value"
            :form-version-id="form.id"
            @touch="flow.touch"
          />
        </template>

        <template v-else>
          <CheckoutAnswersSummary
            :fields="form.fields"
            :answers="flow.answers.value"
            :file-names="flow.fileNames.value"
            :meeting-label="flow.meetingLabel.value"
            editable
            @edit="flow.back()"
          />
          <CheckoutPaymentMethodPicker v-if="!flow.isQuote.value" v-model="flow.method.value" />
          <UiAlert v-else tone="info">{{ t('request.quoteInfo') }}</UiAlert>
        </template>

        <div class="actions">
          <UiButton variant="ghost" :disabled="flow.submitting.value" @click="flow.back()">{{ t('request.back') }}</UiButton>
          <UiButton size="lg" :loading="flow.submitting.value" :disabled="flow.nextDisabled.value" @click="flow.next()">
            {{ flow.nextLabel.value }}
          </UiButton>
        </div>
      </div>

      <CheckoutOrderSummaryAside
        :title="service.title"
        :base-minor="service.basePriceMinor"
        :is-quote="flow.isQuote.value"
        :addons="flow.chosenAddons.value"
        :total-minor="flow.totalMinor.value"
        :meeting-label="flow.meetingLabel.value"
        :customer-name="session.profile?.fullName"
      />
    </div>
  </section>
</template>

<style scoped>
.wrap { max-width: 1080px; margin: 0 auto; padding: clamp(24px, 4vw, 48px) var(--container-pad) 96px; display: flex; flex-direction: column; gap: 24px; }
.top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.top-text { flex: 1 1 320px; }
.back-link { font-size: 13px; }
.title { font-size: clamp(24px, 3vw, 34px); font-weight: 800; margin: 6px 0 0; }
.layout { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
.main-col { flex: 1 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
.actions { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
</style>
