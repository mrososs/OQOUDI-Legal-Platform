<script setup lang="ts">
/** Grant / revoke lawyer and admin roles. Every change is audited server-side. */
interface UserRow {
  id: string
  fullName: string
  email: string
  createdAt: string
  roles: string[]
  lawyerDisplayName: string | null
}

const { t } = useI18n()
const f = useFormat()
const { call, toFailure } = useApi()
const toast = useToast()
const user = useSupabaseUser()
// Forwards the session cookie during SSR.
const requestFetch = useRequestFetch()

const q = shallowRef('')
const query = shallowRef('')
const { data: users, refresh, status } = useAsyncData(
  () => `admin:users:${query.value}`,
  () => requestFetch<UserRow[]>('/api/admin/users', { query: query.value ? { q: query.value } : {} }),
  { default: () => [] as UserRow[], watch: [query] },
)

const busy = shallowRef<string | null>(null)

async function setRole(u: UserRow, role: 'lawyer' | 'admin', grant: boolean) {
  busy.value = `${u.id}:${role}`
  try {
    await call(`/api/admin/users/${u.id}/roles`, { method: 'POST', body: { role, grant } })
    toast.show(t('admin.users.updated'))
    await refresh()
  }
  catch (err) {
    toast.error(toFailure(err).message)
  }
  finally {
    busy.value = null
  }
}
</script>

<template>
  <section class="kh-card wrap">
    <h2 class="h">{{ t('admin.users.title') }}</h2>
    <p class="muted small">{{ t('admin.users.lead') }}</p>
    <form class="search" role="search" @submit.prevent="query = q.trim()">
      <UiInput v-model="q" :placeholder="t('admin.users.search')" dir="auto" />
      <UiButton type="submit" variant="secondary">{{ t('home.searchCta') }}</UiButton>
    </form>
    <div class="table-wrap">
      <table class="table" :aria-busy="status === 'pending'">
        <thead>
          <tr>
            <th>{{ t('admin.users.name') }}</th>
            <th>{{ t('auth.email') }}</th>
            <th>{{ t('admin.users.roles') }}</th>
            <th>{{ t('admin.users.lawyer') }}</th>
            <th>{{ t('admin.users.admin') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td><strong class="strong">{{ u.fullName }}</strong><div class="muted tiny">{{ f.date(u.createdAt) }}</div></td>
            <td class="ltr">{{ u.email }}</td>
            <td>
              <div class="badges">
                <UiBadge v-for="r in u.roles" :key="r" :tone="r === 'admin' ? 'solid' : r === 'lawyer' ? 'accent' : 'neutral'">{{ t(`admin.roles.${r}`) }}</UiBadge>
              </div>
            </td>
            <td>
              <AdminSwitch
                :model-value="u.roles.includes('lawyer')"
                :aria-label="t('admin.users.toggleRole', { role: t('admin.roles.lawyer'), name: u.fullName })"
                :disabled="busy === `${u.id}:lawyer`"
                @update:model-value="v => setRole(u, 'lawyer', v)"
              />
            </td>
            <td>
              <AdminSwitch
                :model-value="u.roles.includes('admin')"
                :aria-label="t('admin.users.toggleRole', { role: t('admin.roles.admin'), name: u.fullName })"
                :disabled="busy === `${u.id}:admin` || (u.id === user?.sub && u.roles.includes('admin'))"
                @update:model-value="v => setRole(u, 'admin', v)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.wrap { display: flex; flex-direction: column; gap: 10px; }
.h { font-size: 16px; font-weight: 700; margin: 0; }
.small { font-size: 13px; margin: 0; }
.tiny { font-size: 11px; }
.search { display: flex; gap: 8px; align-items: flex-start; max-width: 520px; }
.search > :first-child { flex: 1; }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 720px; font-size: 14px; }
.table th { background: var(--neutral-100); text-align: start; color: var(--text-muted); font-weight: 600; padding: 10px 12px; }
.table td { padding: 10px 12px; border-top: 1px solid var(--border-subtle); }
.strong { color: var(--text-strong); }
.badges { display: flex; gap: 4px; flex-wrap: wrap; }
</style>
