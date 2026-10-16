import { campaignInputSchema } from '#shared/domain/serviceAdmin'
import type { CampaignState } from '#shared/domain/pricing'

/**
 * Enable (with an explicit Cairo activation date) or disable the launch campaign.
 * The 15-day end is computed in the database. Nothing starts automatically: a campaign
 * only becomes active when its start instant is reached after an admin enabled it.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await readBody_(event, campaignInputSchema)
  const state = await callFn(event, 'admin_set_launch_campaign', {
    p_actor: actor.id,
    p_enabled: body.enabled,
    p_start_date: (body.enabled ? body.startDate : null) as string,
    p_start_time: body.startTime,
  })
  return state as unknown as CampaignState
})
