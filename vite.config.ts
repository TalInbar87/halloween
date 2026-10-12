/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      include: ['src/lib/**', 'src/components/AddHouseForm.tsx', 'src/components/ProgressBar.tsx'],
      exclude: ['**/*.test.*', 'src/lib/supabase.ts', 'src/lib/types.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
