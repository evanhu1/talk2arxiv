import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['shared/**/*.test.ts', 'worker/**/*.test.ts'] },
})
