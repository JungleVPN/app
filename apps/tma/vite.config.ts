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
  server: {
    port: 7090,
    host: '127.0.0.1',
    allowedHosts: ['app.development-env.uk'],
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.WEB_BUILD_SOURCEMAP !== 'false',
  },
});
