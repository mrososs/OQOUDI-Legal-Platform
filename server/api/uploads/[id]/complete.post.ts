import { completeUpload } from '../../../services/documents'

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  const id = routeUuid(event)
  return await completeUpload(event, actor.id, id)
})
