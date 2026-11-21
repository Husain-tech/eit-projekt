import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  // Unit tests only. The browser tests in e2e/ run with Playwright.
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
