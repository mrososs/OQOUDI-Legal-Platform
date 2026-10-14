<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

defineProps<{
  title: string
  description?: string
}>()

const dialogRef = useTemplateRef<HTMLDivElement>('dialog')
const titleId = useId()

function close() {
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(open, async (value) => {
  if (!import.meta.client) return
  document.body.style.overflow = value ? 'hidden' : ''
  if (value) {
    await nextTick()
    const focusable = dialogRef.value?.querySelector<HTMLElement>('textarea, input, select, button:not(.modal-close)')
    focusable?.focus()
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="backdrop" @click.self="close" @keydown="onKeydown">
        <div
          ref="dialog"
          class="dialog kh-card"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
        >
          <div class="head">
            <h2 :id="titleId" class="title">{{ title }}</h2>
            <button type="button" class="modal-close" :aria-label="$t('common.close')" @click="close">×</button>
          </div>
          <p v-if="description" class="desc">{{ description }}</p>
          <slot />
          <div v-if="$slots.footer" class="footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(21, 35, 59, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.dialog {
  width: min(520px, 100%);
  max-height: calc(100vh - 32px);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}
.head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.title { font-size: 20px; font-weight: 700; margin: 0; }
.desc { margin: 0; color: var(--text-muted); font-size: 14px; line-height: 1.7; }
.modal-close {
  background: none; border: none; font-size: 24px; line-height: 1; cursor: pointer;
  color: var(--text-muted); padding: 4px 8px; border-radius: 8px;
}
.modal-close:hover { background: var(--surface-sunken); }
.footer { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
.modal-enter-active, .modal-leave-active { transition: opacity var(--duration-normal) var(--ease-standard); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
