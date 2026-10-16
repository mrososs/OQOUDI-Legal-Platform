import { remainingParts, type PublicCampaign } from '#shared/domain/pricing'

/**
 * Reactive view of the launch campaign for the whole public site.
 * `active` flips to false by itself when the window ends. It never turns true
 * on its own while a page is open: activation is decided by the server.
 */
export function useLaunchCampaign() {
  const campaign = useState<PublicCampaign>('launch-campaign')
  const nowMs = useState<number>('launch-campaign-now')

  const endsAtMs = computed(() => (campaign.value?.endsAt ? Date.parse(campaign.value.endsAt) : 0))
  const active = computed(() => !!campaign.value?.active && endsAtMs.value > 0 && nowMs.value < endsAtMs.value)
  const remaining = computed(() => remainingParts(endsAtMs.value, nowMs.value))
  const endsAt = computed(() => campaign.value?.endsAt ?? null)

  return { campaign, active, endsAt, endsAtMs, remaining, nowMs }
}
