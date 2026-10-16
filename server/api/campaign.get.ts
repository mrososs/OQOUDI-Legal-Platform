import type { CampaignState, PublicCampaign } from '#shared/domain/pricing'

/**
 * Public launch-campaign state for the banner, badges and countdown.
 *
 * - `serverNow` is the DATABASE clock, so every visitor counts down against the same instant
 *   regardless of their device clock; there is no per-customer timer.
 * - Nothing about a scheduled / disabled / expired campaign is exposed (no dates, no hints).
 * - This is for display only. Prices charged at checkout are decided by `order_create` in the
 *   database; the frontend countdown and discount are never trusted.
 */
export default defineEventHandler(async (event): Promise<PublicCampaign> => {
  const state = (await callFn(event, 'launch_campaign_state', {})) as unknown as CampaignState
  const active = state?.status === 'active'
  return {
    active,
    startsAt: active ? state.startsAt : null,
    endsAt: active ? state.endsAt : null,
    serverNow: state?.serverNow ?? new Date().toISOString(),
  }
})
