/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@yois-games/shared': resolve(__dirname, '../packages/shared/src'),
      '@yois-games/game-engine': resolve(__dirname, '../packages/game-engine/src'),
      '@yois-games/frontend': resolve(__dirname, '../packages/frontend/src'),
      '@yois-games/backend': resolve(__dirname, '../packages/backend/src'),
    }
  }
})