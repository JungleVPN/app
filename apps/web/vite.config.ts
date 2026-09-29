import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

const envDir = path.resolve(__dirname, '../../');

// Vite only reads .env / .env.[mode] itself; prefixed vars already in process.env are picked up too.
for (const file of ['.env.public', '.env.payments', '.env.secrets']) {
  const envFile = path.join(envDir, file);
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
}

export default defineConfig({
  envDir,
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
    allowedHosts: ['.development-env.uk', '.thejungle.pro'],
  },
  build: {
    outDir: 'dist/client',
    sourcemap: process.env.WEB_BUILD_SOURCEMAP !== 'false',
  },
  ssr: {
    noExternal: [/@heroui\//, /@react-aria\//, /@lottiefiles\//],
  },
});
