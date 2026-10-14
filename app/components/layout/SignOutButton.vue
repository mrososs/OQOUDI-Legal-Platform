<script setup lang="ts">
const props = withDefaults(defineProps<{ inverse?: boolean }>(), { inverse: false })
const supabase = useSupabaseClient()
const session = useSessionStore()
const localePath = useLocalePath()
const busy = shallowRef(false)

async function signOut() {
  busy.value = true
  await supabase.auth.signOut()
  session.reset()
  busy.value = false
  await navigateTo(localePath('/'))
}
</script>

<template>
  <button type="button" class="signout" :class="{ inverse: props.inverse }" :disabled="busy" @click="signOut">
    {{ $t('nav.signOut') }}
  </button>
</template>

<style scoped>
.signout {
  background: none; border: none; font-size: 13px; color: var(--text-muted);
  cursor: pointer; text-decoration: underline; padding: 4px;
}
.signout.inverse { color: var(--gold-300); }
</style>
