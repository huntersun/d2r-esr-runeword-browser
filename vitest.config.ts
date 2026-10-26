import { defineConfig } from 'vitest/config';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import path from 'path';

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@/components': path.resolve(import.meta.dirname, './src/components'),
      '@/core': path.resolve(import.meta.dirname, './src/core'),
      '@/features': path.resolve(import.meta.dirname, './src/features'),
      '@/utils': path.resolve(import.meta.dirname, './src/utils'),
      '@/lib': path.resolve(import.meta.dirname, './src/lib'),
      '@/data': path.resolve(import.meta.dirname, './src/data'),
      '@': path.resolve(import.meta.dirname, './src'),
      '@public': path.resolve(import.meta.dirname, './public'),
    },
  },
});
