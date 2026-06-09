import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  envDir: path.resolve(__dirname, '../../'),
  envPrefix: ['VITE_', 'PUBLIC_'],
  /** Required for `*.svg?react` imports from `@workspace/core` (e.g. payment row icons). */
  plugins: [tailwindcss(), react(), svgr()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 7090,
    host: '127.0.0.1',
    // dash.cloudflare.com
    allowedHosts: ['app.development-env.uk'],
    /**
     * TMA requires HTTPS in production (served at tma.thejungle.pro).
     * For local dev, use ngrok or a reverse proxy to expose with HTTPS,
     * or configure `https: { key, cert }` here with a self-signed certificate.
     */
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.WEB_BUILD_SOURCEMAP !== 'false',
  },
});
