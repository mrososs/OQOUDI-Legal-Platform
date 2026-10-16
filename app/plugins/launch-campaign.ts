import type { PublicCampaign } from '#shared/domain/pricing'

/**
 * Loads the public launch-campaign state once per request (SSR) and shares it through
 * `useState`, so the server render and the client hydration see the exact same values
 * (no hydration mismatch, no per-visitor timer). The client ticker lives in
 * launch-campaign.client.ts and starts only after mount.
 */
export default defineNuxtPlugin({
  name: 'oq-launch-campaign',
  async setup() {
    const campaign = useState<PublicCampaign>('launch-campaign', () => ({ active: false, startsAt: null, endsAt: null, serverNow: '' }))
    const nowMs = useState<number>('launch-campaign-now', () => 0)

    // On the client the state is restored from the SSR payload; only fetch when it is missing.
    if (import.meta.server || !campaign.value.serverNow) {
      try {
        const res = await $fetch<PublicCampaign>('/api/campaign')
        campaign.value = res
        nowMs.value = Date.parse(res.serverNow)
      }
      catch {
        // Fail closed: no campaign means regular prices everywhere.
        campaign.value = { active: false, startsAt: null, endsAt: null, serverNow: new Date().toISOString() }
        nowMs.value = Date.parse(campaign.value.serverNow)
      }
    }
  },
})
