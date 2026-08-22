import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const databaseSrc = fileURLToPath(new URL('../../packages/database/src/index.ts', import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Resolve the workspace database package to its TypeScript source rather
      // than the compiled `dist/` mirror, which can lag behind a schema change.
      '@workspace/database': databaseSrc,
    },
  },
  test: {
    // Only TS sources — never the compiled JS mirror under dist/.
    include: ['src/**/*.{spec,test}.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.{spec,test}.ts', 'src/**/tests/**'],
      reporter: ['text', 'json', 'html'],
    },
  },
});
