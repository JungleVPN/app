import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Required config in every environment; see RU_INTERNAL_SQUAD in .env.
    env: { RU_INTERNAL_SQUAD: '6f40164a-51d0-432a-8fa3-3e1311e13757' },
  },
});
