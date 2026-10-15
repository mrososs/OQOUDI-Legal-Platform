import { validateAnswers, type Answers, type FieldError, type FormField } from '#shared/domain/formSchema'
import type { ServiceDetail } from '~/repositories/catalog'
import type { UploadedFile } from '~/composables/useUpload'

type Step = 'slot' | 'form' | 'review'

/**
 * Service request flow: (slot →) details → review → create order, then the
 * manual payment checkout (/checkout/:orderNumber) for fixed-price services.
 * Client validation mirrors the server (shared schema); the server is the
 * authority for prices, documents and slot availability.
 */
export function useRequestFlow(service: Ref<ServiceDetail>, form: Ref<{ id: string, fields: FormField[] }>, initialAddons: string[]) {
  const { t } = useI18n()
  const f = useFormat()
  const { call, toFailure } = useApi()
  const toast = useToast()
  const localePath = useLocalePath()

  const isMeeting = computed(() => service.value.kind === 'video_consultation')
  const isQuote = computed(() => service.value.pricingType === 'quote')
  const steps = computed<Step[]>(() => (isMeeting.value ? ['slot', 'form', 'review'] : ['form', 'review']))

  const stepIndex = shallowRef(0)
  const step = computed(() => steps.value[stepIndex.value] ?? 'form')

  const answers = ref<Answers>({})
  const files = ref<Record<string, UploadedFile[]>>({})
  const errors = ref<Record<string, FieldError>>({})
  const formAlert = shallowRef('')
  const slot = shallowRef<string | null>(null)
  const addonIds = ref<string[]>(initialAddons.filter(id => service.value.addons.some(a => a.id === id)))
  const submitting = shallowRef(false)
  const submitError = shallowRef('')
  const createdOrder = shallowRef<{ id: string, orderNumber: string } | null>(null)

  const chosenAddons = computed(() => service.value.addons.filter(a => addonIds.value.includes(a.id)))
  const totalMinor = computed(() => service.value.basePriceMinor + chosenAddons.value.reduce((n, a) => n + a.priceMinor, 0))
  const meetingLabel = computed(() => {
    if (!slot.value) return ''
    const end = new Date(new Date(slot.value).getTime() + (service.value.meetingDurationMinutes ?? 30) * 60000)
    return `${f.day(slot.value)}، ${f.time(slot.value)} – ${f.time(end)}`
  })
  const fileNames = computed(() => Object.values(files.value).flat().map(x => x.name))

  const stepLabels = computed(() => steps.value.map(s =>
    s === 'slot' ? t('request.steps.slot') : s === 'form' ? t('request.steps.details') : isQuote.value ? t('request.steps.send') : t('request.steps.pay'),
  ))

  const nextLabel = computed(() => {
    if (submitting.value) return isQuote.value ? t('request.sending') : t('request.redirecting')
    if (step.value === 'slot') return t('request.toDetails')
    if (step.value === 'form') return t('request.toReview')
    if (isQuote.value) return t('request.sendQuote')
    return t('request.continueToPayment', { amount: f.money(totalMinor.value) })
  })
  const nextDisabled = computed(() => submitting.value || (step.value === 'slot' && !slot.value))

  function touch(fieldId: string) {
    if (errors.value[fieldId]) {
      const { [fieldId]: _removed, ...rest } = errors.value
      errors.value = rest
    }
  }

  function scrollTop() {
    if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function back() {
    if (stepIndex.value === 0) return navigateTo(localePath(`/service/${service.value.slug}`))
    stepIndex.value -= 1
    scrollTop()
  }

  async function next() {
    if (step.value === 'slot') {
      if (slot.value) {
        stepIndex.value += 1
        scrollTop()
      }
      return
    }
    if (step.value === 'form') {
      const result = validateAnswers(form.value.fields, answers.value)
      errors.value = result.errors
      const n = Object.keys(result.errors).length
      if (n) {
        formAlert.value = t('request.fixFields', { n: f.number(n) }, n)
        scrollTop()
        return
      }
      formAlert.value = ''
      stepIndex.value += 1
      scrollTop()
      return
    }
    await submit()
  }

  async function submit() {
    submitting.value = true
    submitError.value = ''
    try {
      if (!createdOrder.value) {
        createdOrder.value = await call<{ id: string, orderNumber: string }>('/api/orders', {
          method: 'POST',
          body: {
            serviceId: service.value.id,
            formVersionId: form.value.id,
            answers: answers.value,
            addonIds: addonIds.value,
            slotStart: slot.value,
          },
        })
        toast.success(t('request.orderCreated', { order: createdOrder.value.orderNumber }))
      }
      if (isQuote.value) {
        await navigateTo(localePath(`/checkout/${createdOrder.value.orderNumber}/confirmation`))
        return
      }
      await navigateTo(localePath(`/checkout/${createdOrder.value.orderNumber}`))
    }
    catch (err) {
      const failure = toFailure(err)
      if (failure.fieldErrors && !createdOrder.value) {
        errors.value = failure.fieldErrors as Record<string, FieldError>
        stepIndex.value = steps.value.indexOf('form')
        formAlert.value = failure.message
      }
      else if (failure.code === 'OQ409_SLOT_TAKEN' || failure.code === 'OQ409_SLOT_UNAVAILABLE') {
        slot.value = null
        stepIndex.value = 0
        submitError.value = failure.message
      }
      else {
        submitError.value = createdOrder.value
          ? t('request.savedButPaymentFailed', { order: createdOrder.value.orderNumber, reason: failure.message })
          : failure.message
      }
      scrollTop()
    }
    finally {
      submitting.value = false
    }
  }

  return {
    isMeeting, isQuote, steps, stepIndex, step, stepLabels,
    answers, files, errors, formAlert, slot, addonIds,
    submitting, submitError, createdOrder,
    chosenAddons, totalMinor, meetingLabel, fileNames, nextLabel, nextDisabled,
    touch, back, next,
  }
}
