/**
 * Order lifecycle model. The authoritative transition rules live in the
 * database business functions; this module drives UI (labels, tones,
 * stepper, which actions to offer). See docs/database-schema.md.
 */
export const ORDER_STATUSES = [
  'new',
  'awaiting_payment',
  'under_review',
  'awaiting_info',
  'in_progress',
  'revision',
  'delivered',
  'completed',
  'cancelled',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = ['unpaid', 'failed', 'paid', 'refunded', 'partially_refunded'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export type Tone = 'neutral' | 'accent' | 'caution' | 'positive' | 'critical'

export const STATUS_TONE: Record<OrderStatus, Tone> = {
  new: 'neutral',
  awaiting_payment: 'caution',
  under_review: 'accent',
  awaiting_info: 'caution',
  in_progress: 'accent',
  revision: 'caution',
  delivered: 'positive',
  completed: 'positive',
  cancelled: 'critical',
}

export const PAYMENT_TONE: Record<PaymentStatus, Tone> = {
  unpaid: 'neutral',
  failed: 'critical',
  paid: 'positive',
  refunded: 'neutral',
  partially_refunded: 'caution',
}

/** Statuses where the customer has something to do. */
export const CUSTOMER_ACTION_STATUSES: readonly OrderStatus[] = ['awaiting_payment', 'awaiting_info', 'delivered']

export const ACTIVE_STATUSES: readonly OrderStatus[] = [
  'new', 'awaiting_payment', 'under_review', 'awaiting_info', 'in_progress', 'revision', 'delivered',
]

/** Progress stepper: payment → review → work → delivery → completion. */
export const FLOW_STEPS = ['payment', 'review', 'work', 'delivery', 'completion'] as const
export type FlowStep = (typeof FLOW_STEPS)[number]

export const FLOW_INDEX: Record<OrderStatus, number> = {
  new: 0,
  awaiting_payment: 0,
  under_review: 1,
  awaiting_info: 1,
  in_progress: 2,
  revision: 2,
  delivered: 3,
  completed: 4,
  cancelled: -1,
}

/** Transitions staff can trigger with the generic status control. */
export function staffStatusOptions(
  status: OrderStatus,
  serviceKind: string,
  isAdmin: boolean,
): OrderStatus[] {
  const out: OrderStatus[] = []
  if (status === 'under_review') out.push('in_progress')
  if (status === 'awaiting_info') out.push('under_review')
  if (status === 'revision') out.push('in_progress')
  if (status === 'in_progress') {
    out.push('under_review')
    if (serviceKind === 'video_consultation') out.push('completed')
  }
  if (status === 'delivered' && isAdmin) out.push('completed')
  return out
}

export function canCustomerCancel(status: OrderStatus, payment: PaymentStatus): boolean {
  return (status === 'new' || status === 'awaiting_payment') && payment !== 'paid'
}

export function canPay(status: OrderStatus, payment: PaymentStatus, isQuote: boolean, quoteIssued: boolean): boolean {
  if (status !== 'awaiting_payment') return false
  if (payment !== 'unpaid' && payment !== 'failed') return false
  return !isQuote || quoteIssued
}
