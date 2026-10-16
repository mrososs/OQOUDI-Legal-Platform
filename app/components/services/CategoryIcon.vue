<script setup lang="ts">
import {
  BookOpen, Briefcase, Building2, Car, Cpu, Hammer, Handshake, House, KeyRound, Landmark,
  Megaphone, Package, Scale, Shield, ShoppingCart, Sparkles, Trophy, User, Users,
} from '@lucide/vue'

const props = defineProps<{ icon: string, size?: number }>()

// Keys mirror the whitelist in service_categories_icon_check.
const ICONS: Record<string, unknown> = {
  'user': User, 'building': Building2, 'scale': Scale, 'briefcase': Briefcase,
  'home': House, 'key': KeyRound, 'users': Users, 'trophy': Trophy, 'handshake': Handshake,
  'car': Car, 'hammer': Hammer, 'sparkles': Sparkles, 'landmark': Landmark, 'book-open': BookOpen,
  'package': Package, 'cpu': Cpu, 'shopping-cart': ShoppingCart, 'shield': Shield, 'megaphone': Megaphone,
}
const component = computed(() => (ICONS[props.icon] ?? Briefcase) as never)
</script>

<template>
  <component :is="component" :size="size ?? 22" :stroke-width="1.7" aria-hidden="true" />
</template>
