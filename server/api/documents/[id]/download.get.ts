import { createDownloadUrl } from '../../../services/documents'

/** Returns a 60-second signed URL if (and only if) RLS lets the caller see the document. */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = routeUuid(event)
  return await createDownloadUrl(event, id)
})
