import type { Localized } from '#shared/domain/localized'

/**
 * Notifications are stored as type + payload; text is rendered in the
 * viewer's language (keys `notifications.<type with _>`).
 */
export function useNotificationText() {
  const { t, te } = useI18n()
  const f = useFormat()

  return (type: string, payload: Record<string, unknown>) => {
    const key = `notifications.${type.replace('.', '_')}`
    const params: Record<string, string> = {
      order: String(payload.orderNumber ?? ''),
      service: f.text(payload.serviceTitle as Localized | undefined),
      version: f.number(Number(payload.version ?? 0)),
      amount: typeof payload.amountMinor === 'number' ? f.money(payload.amountMinor) : '',
      rating: f.number(Number(payload.rating ?? 0)),
      when: typeof payload.startsAt === 'string' ? `${f.day(payload.startsAt)}، ${f.time(payload.startsAt)}` : '',
      status: typeof payload.status === 'string' ? t(`status.${payload.status}.client`) : '',
    }
    return te(key) ? t(key, params) : type
  }
}
