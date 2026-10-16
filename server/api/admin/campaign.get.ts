import type { CampaignState } from '#shared/domain/pricing'

/** Full campaign state for the admin dashboard + how many services the campaign applies to. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const state = (await callFn(event, 'launch_campaign_state', {})) as unknown as CampaignState

  const db = adminClient(event)
  const [eligible, published] = await Promise.all([
    db.from('services').select('id', { count: 'exact', head: true }).eq('launch_eligible', true).eq('status', 'published'),
    db.from('services').select('id', { count: 'exact', head: true }).eq('status', 'published'),
  ])
  if (eligible.error) throw fromDbError(eligible.error, 'campaign.eligible')
  if (published.error) throw fromDbError(published.error, 'campaign.published')

  return { state, eligibleServices: eligible.count ?? 0, publishedServices: published.count ?? 0 }
})
