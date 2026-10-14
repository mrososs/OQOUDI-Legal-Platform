import { streamDocument } from '../../../services/documents'

/** Authenticated, RLS-checked file download (see services/documents.ts). */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = routeUuid(event)
  return await streamDocument(event, id)
})
