// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: [
      'design-reference/**',
      'shared/types/database.types.ts',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  {
    rules: {
      // Optional props in type-based defineProps are `undefined` by design.
      'vue/require-default-prop': 'off',
    },
  },
)
