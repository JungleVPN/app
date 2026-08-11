import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  envDir: path.resolve(__dirname, '../../'),
  envPrefix: ['VITE_', 'PUBLIC_'],
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
    allowedHosts: ['.development-env.uk'],
  },
  build: {
    outDir: 'dist/client',
    sourcemap: process.env.WEB_BUILD_SOURCEMAP !== 'false',
  },
  ssr: {
    noExternal: [/@heroui\//, /@react-aria\//, /@lottiefiles\//],
  },
});
