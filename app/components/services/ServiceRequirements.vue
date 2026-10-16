<script setup lang="ts">
import { Check, Paperclip } from '@lucide/vue'
import type { FormField } from '#shared/domain/formSchema'

/**
 * "What you need to prepare" — rendered from the PUBLISHED form version itself, so it always
 * matches what the request form asks (parties, details, special terms, documents).
 */
const props = defineProps<{ fields: FormField[] }>()

const { t } = useI18n()
const f = useFormat()

interface Item {
  id: string
  label: string
  required: boolean
  file: boolean
  /** Clause options of a checkbox group, or the columns of a list. */
  sub: string[]
}
interface Group {
  id: string
  title: string
  help: string
  optionalGroup: boolean
  items: Item[]
}

const groups = computed<Group[]>(() => {
  const out: Group[] = []
  let current: Group | null = null
  const open = (id: string, title: string, help: string) => {
    current = { id, title, help, optionalGroup: id === 'step_special', items: [] }
    out.push(current)
  }
  for (const field of props.fields) {
    if (field.type === 'section') {
      open(field.id, f.text(field.label), f.text(field.help as never))
      continue
    }
    if (field.type === 'help') continue
    if (!current) open('default', t('services.requirements.requested'), '')
    const sub = field.type === 'repeater'
      ? (field.columns ?? []).map(c => f.text(c.label))
      : field.type === 'checkbox' || field.type === 'multiselect'
        ? (field.options ?? []).map(o => f.text(o.label))
        : []
    current!.items.push({ id: field.id, label: f.text(field.label), required: !!field.required, file: field.type === 'file', sub })
  }
  return out.filter(g => g.items.length)
})
</script>

<template>
  <section v-if="groups.length" id="sec-requirements" class="kh-card box">
    <div>
      <h2 class="title">{{ t('services.requirements.title') }}</h2>
      <p class="intro">{{ t('services.requirements.intro') }}</p>
    </div>
    <div v-for="g in groups" :key="g.id" class="group">
      <h3 class="group-title">
        {{ g.title }}
        <span v-if="g.optionalGroup" class="tag tag--soft">{{ t('services.requirements.optional') }}</span>
      </h3>
      <ul class="list">
        <li v-for="it in g.items" :key="it.id">
          <Paperclip v-if="it.file" :size="16" :stroke-width="1.9" class="tick" aria-hidden="true" />
          <Check v-else :size="16" :stroke-width="2.2" class="tick" aria-hidden="true" />
          <div class="item">
            <span>
              {{ it.label }}
              <span v-if="it.required" class="tag">{{ t('services.requirements.required') }}</span>
            </span>
            <ul v-if="it.sub.length" class="sub">
              <li v-for="(s, i) in it.sub" :key="i">{{ s }}</li>
            </ul>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.box { display: flex; flex-direction: column; gap: 22px; scroll-margin-top: 100px; }
.title { font-size: 22px; font-weight: 700; margin: 0; }
.intro { margin: 6px 0 0; font-size: 14px; color: var(--text-muted); line-height: 1.7; }
.group { display: flex; flex-direction: column; gap: 10px; }
.group-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--text-strong); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.list > li { display: flex; gap: 10px; align-items: flex-start; font-size: 15px; line-height: 1.7; }
.tick { color: var(--gold-500); flex-shrink: 0; margin-top: 5px; }
.item { min-width: 0; }
.sub { margin: 4px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: var(--text-muted); }
.sub li::before { content: '–'; margin-inline-end: 6px; color: var(--gold-400); }
.tag {
  display: inline-block; font-size: 11px; font-weight: 700; color: var(--ink-900); background: var(--gold-50);
  border: 1px solid var(--gold-200); border-radius: 999px; padding: 1px 8px; margin-inline-start: 6px;
}
.tag--soft { color: var(--text-muted); background: var(--neutral-100); border-color: var(--neutral-200); font-weight: 600; }
</style>
