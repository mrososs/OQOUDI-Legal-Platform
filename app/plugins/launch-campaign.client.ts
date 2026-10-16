import type { PublicCampaign } from '#shared/domain/pricing'

const TICK_MS = 1000
const RESYNC_MS = 60_000

/**
 * Client ticker. Starts after the app is mounted (never during hydration):
 *  - the displayed "now" is the SERVER clock (offset-corrected), so a wrong device clock cannot
 *    show a wrong countdown and every visitor counts down against the same instant;
 *  - it re-syncs with /api/campaign every minute and at the expiry instant, so an admin
 *    disabling the campaign — or the window ending — updates the UI without a reload.
 */
export default defineNuxtPlugin({
  name: 'oq-launch-campaign-ticker',
  dependsOn: ['oq-launch-campaign'],
  setup(nuxtApp) {
    const campaign = useState<PublicCampaign>('launch-campaign')
    const nowMs = useState<number>('launch-campaign-now')
    let offset = 0
    let lastSync = 0
    let syncing = false

    const anchor = () => {
      offset = Date.parse(campaign.value.serverNow) - Date.now()
    }

    async function resync() {
      if (syncing) return
      syncing = true
      try {
        const res = await $fetch<PublicCampaign>('/api/campaign')
        campaign.value = res
        anchor()
        nowMs.value = Date.now() + offset
      }
      catch {
        // keep the last known state
      }
      finally {
        lastSync = Date.now()
        syncing = false
      }
    }

    nuxtApp.hook('app:mounted', () => {
      anchor()
      lastSync = Date.now()
      setInterval(() => {
        const c = campaign.value
        const needsClock = c.active || c.endsAt
        if (needsClock) nowMs.value = Date.now() + offset
        const expired = c.active && c.endsAt !== null && nowMs.value >= Date.parse(c.endsAt)
        if (document.visibilityState === 'visible' && (expired || Date.now() - lastSync >= RESYNC_MS)) resync()
      }, TICK_MS)
    })
  },
})
