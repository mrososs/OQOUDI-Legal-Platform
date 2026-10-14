<template>
  <div class="shell">
    <LayoutPublicHeader />
    <main id="main" class="main">
      <slot />
    </main>
    <LayoutPublicFooter />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-page);
}
.main { flex: 1; }
</style>
