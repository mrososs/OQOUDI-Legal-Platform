<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'
import { REPEATER_DEFAULT_MAX_ROWS, type FormField, type RepeaterRow } from '#shared/domain/formSchema'

/**
 * Structured list input (all partners / heirs / children / installment schedule …).
 * Blank rows are ignored by validation, so an untouched first row never blocks an optional list.
 */
const rows = defineModel<RepeaterRow[]>('rows', { default: () => [] })

const props = defineProps<{
  field: FormField
  label: string
  help?: string
  error?: string
  /** (row, column) of the failing cell reported by validation, 1-based row. */
  errorCell?: { row: number, column: string } | null
}>()

const emit = defineEmits<{ touch: [] }>()

const { t } = useI18n()
const f = useFormat()
const groupId = useId()

const columns = computed(() => props.field.columns ?? [])
const maxRows = computed(() => props.field.maxItems ?? REPEATER_DEFAULT_MAX_ROWS)
const minRows = computed(() => Math.max(props.field.minItems ?? 1, 1))

const blank = (): RepeaterRow => ({})
const shown = computed<RepeaterRow[]>(() => {
  const list = rows.value.length ? rows.value : []
  const pad = Math.max(0, minRows.value - list.length)
  return [...list, ...Array.from({ length: pad }, blank)]
})

function commit(next: RepeaterRow[]) {
  rows.value = next
  emit('touch')
}
function setCell(i: number, column: string, value: string) {
  const next = shown.value.map(r => ({ ...r }))
  next[i] = { ...next[i], [column]: value }
  commit(next)
}
function addRow() {
  if (shown.value.length < maxRows.value) commit([...shown.value, blank()])
}
function removeRow(i: number) {
  const next = shown.value.filter((_, idx) => idx !== i)
  commit(next)
}
const cellValue = (row: RepeaterRow, column: string) => (row[column] == null ? '' : String(row[column]))
const cellError = (i: number, column: string) => (props.errorCell && props.errorCell.row === i + 1 && props.errorCell.column === column ? props.error : '')
</script>

<template>
  <fieldset class="rep" :aria-describedby="error ? `${groupId}-err` : undefined">
    <legend class="legend">{{ label }}<span v-if="field.required" aria-hidden="true"> *</span></legend>
    <p v-if="help" class="help">{{ help }}</p>

    <div v-for="(row, i) in shown" :key="i" class="row">
      <div class="row-head">
        <span class="row-no">{{ t('formFields.repeater.row', { n: f.number(i + 1) }) }}</span>
        <button v-if="shown.length > minRows" type="button" class="remove" :aria-label="`${t('formFields.repeater.remove')} ${f.number(i + 1)}`" @click="removeRow(i)">
          <Trash2 :size="15" :stroke-width="1.9" aria-hidden="true" />
        </button>
      </div>
      <div class="cells">
        <template v-for="col in columns" :key="col.id">
          <UiTextarea
            v-if="col.type === 'textarea'"
            :model-value="cellValue(row, col.id)"
            :label="f.text(col.label)"
            :required="col.required"
            :maxlength="col.maxLength"
            :error="cellError(i, col.id)"
            class="cell cell--wide"
            @update:model-value="v => setCell(i, col.id, String(v ?? ''))"
          />
          <UiSelect
            v-else-if="col.type === 'select'"
            :model-value="cellValue(row, col.id)"
            :label="f.text(col.label)"
            :required="col.required"
            :options="(col.options ?? []).map(o => ({ value: o.value, label: f.text(o.label) }))"
            :placeholder="t('common.choose')"
            :error="cellError(i, col.id)"
            class="cell"
            @update:model-value="v => setCell(i, col.id, String(v ?? ''))"
          />
          <UiInput
            v-else
            :model-value="cellValue(row, col.id)"
            :label="f.text(col.label)"
            :required="col.required"
            :type="col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'"
            :min="col.min"
            :max="col.max"
            :maxlength="col.maxLength"
            :inputmode="col.type === 'number' ? 'decimal' : undefined"
            :error="cellError(i, col.id)"
            class="cell"
            @update:model-value="v => setCell(i, col.id, String(v ?? ''))"
          />
        </template>
      </div>
    </div>

    <button v-if="shown.length < maxRows" type="button" class="add" @click="addRow">
      <Plus :size="16" :stroke-width="2" aria-hidden="true" /> {{ t('formFields.repeater.add') }}
    </button>
    <span v-if="error" :id="`${groupId}-err`" class="err" role="alert">{{ error }}</span>
  </fieldset>
</template>

<style scoped>
.rep { border: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.legend { font-size: 14px; font-weight: 600; color: var(--text-strong); padding: 0; margin-bottom: 2px; }
.help { margin: 0; font-size: 13px; color: var(--text-muted); }
.row { border: 1.5px solid var(--border-subtle); border-radius: 12px; padding: 12px 14px 14px; background: var(--neutral-50); display: flex; flex-direction: column; gap: 10px; }
.row-head { display: flex; justify-content: space-between; align-items: center; }
.row-no { font-size: 12px; font-weight: 700; color: var(--text-muted); }
.remove { border: none; background: none; color: var(--critical-500); cursor: pointer; padding: 4px; border-radius: 6px; }
.remove:hover { background: var(--critical-100); }
.cells { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); gap: 12px; }
.cell--wide { grid-column: 1 / -1; }
.add {
  align-self: flex-start; display: inline-flex; gap: 6px; align-items: center; cursor: pointer; font-size: 14px; font-weight: 600;
  color: var(--ink-900); background: #fff; border: 1.5px dashed var(--gold-400); border-radius: 10px; padding: 8px 14px;
}
.add:hover { background: var(--gold-50); }
.err { font-size: 13px; color: var(--critical-500); }
</style>
