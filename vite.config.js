import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isTest = process.env.VITEST;

// https://vitejs.dev/config/
export default defineConfig({
  base: '/lighthouse/',
  plugins: [
    react(),
    !isTest && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: 'Lighthouse Dashboard',
        short_name: 'Lighthouse',
        description: 'Real-time team monitoring dashboard for book digitization teams',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/lighthouse/',
        scope: '/lighthouse/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/lighthouse/index.html',
        navigateFallbackDenylist: [/^\/lighthouse\/api/],
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['tests/**', 'node_modules/**'],
    globals: true,
  },
})
