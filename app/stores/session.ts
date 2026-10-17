import { defineStore } from 'pinia'
import type { Database } from '#shared/types/database.types'

type AppRole = Database['public']['Enums']['app_role']
type AccountKind = Database['public']['Enums']['account_kind']

export interface SessionProfile {
  id: string
  fullName: string
  email: string
  phone: string | null
  preferredLocale: string
  /** `null` until first-time onboarding is finished (customers only; staff are exempt). */
  onboardingCompletedAt: string | null
}

export interface SessionAccount {
  id: string
  kind: AccountKind
  displayName: string
}

/**
 * Current user's profile, roles and customer account.
 * Used for navigation/UI only — authorization is enforced by RLS and the
 * server. Never trust these values for security decisions.
 */
export const useSessionStore = defineStore('session', () => {
  const supabase = useSupabaseClient<Database>()

  const profile = ref<SessionProfile | null>(null)
  const roles = ref<AppRole[]>([])
  const account = ref<SessionAccount | null>(null)
  const loadedFor = ref<string | null>(null)

  const isAdmin = computed(() => roles.value.includes('admin'))
  const isLawyer = computed(() => roles.value.includes('lawyer'))
  const isStaff = computed(() => isAdmin.value || isLawyer.value)
  const firstName = computed(() => profile.value?.fullName.split(' ')[0] ?? '')
  /**
   * A customer whose profile is loaded but whose onboarding is unfinished.
   * UX routing only — `orders` inserts are also blocked in the database.
   * False while the profile is unknown so a slow load never causes a redirect.
   */
  const needsOnboarding = computed(() =>
    profile.value !== null && !isStaff.value && profile.value.onboardingCompletedAt === null,
  )

  function reset() {
    profile.value = null
    roles.value = []
    account.value = null
    loadedFor.value = null
  }

  async function load(userId: string | null | undefined, force = false) {
    if (!userId) {
      reset()
      return
    }
    if (!force && loadedFor.value === userId) return

    const [profileRes, rolesRes, membershipRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, phone, preferred_locale, onboarding_completed_at').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase
        .from('customer_account_members')
        .select('member_role, customer_accounts(id, kind, display_name)')
        .eq('user_id', userId)
        .order('created_at')
        .limit(1)
        .maybeSingle(),
    ])

    const p = profileRes.data
    profile.value = p
      ? { id: p.id, fullName: p.full_name, email: p.email, phone: p.phone, preferredLocale: p.preferred_locale, onboardingCompletedAt: p.onboarding_completed_at }
      : null
    roles.value = (rolesRes.data ?? []).map(r => r.role)
    const acc = membershipRes.data?.customer_accounts
    account.value = acc ? { id: acc.id, kind: acc.kind, displayName: acc.display_name } : null
    loadedFor.value = userId
  }

  return { profile, roles, account, loadedFor, isAdmin, isLawyer, isStaff, firstName, needsOnboarding, load, reset }
})
