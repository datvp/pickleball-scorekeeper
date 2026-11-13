import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Pickleball Scorekeeper',
        short_name: 'Pickleball',
        description: 'Ghi điểm và theo dõi các trận pickleball.',
        lang: 'vi',
        theme_color: '#101713',
        background_color: '#101713',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{css,html,ico,js,png,svg,webmanifest}'],
      },
    }),
  ],
  base: loadEnv(mode, '.', 'VITE_').VITE_BASE_PATH || './',
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
}));
