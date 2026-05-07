import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  // Read .env from the monorepo root so all apps share one file.
  envDir: path.resolve(__dirname, '../../'),
  plugins: [tailwindcss(), react(), svgr()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: './postcss.config.mjs',
  },
  server: {
    port: 7080,
    allowedHosts: ['web.development-env.uk'],
  },
  build: {
    outDir: 'dist',
    // Docker/VPS: sourcemaps roughly double bundle work and RAM during vite build.
    sourcemap: process.env.WEB_BUILD_SOURCEMAP !== 'false',
  },
});
