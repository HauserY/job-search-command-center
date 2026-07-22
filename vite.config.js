import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Base path is env-driven (release plan clarification 7) so forks and local
// previews never break on a hardcoded repo name:
//   local dev/preview:            base '/'
//   GitHub Pages project deploy:  VITE_BASE=/job-search-command-center/
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // autoUpdate: stale clients pick up new builds on next visit. Version
      // skew during the window is handled by the state layer (write-time
      // schema guard + spread-preserve), see src/state/persistence.js.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Job Search Command Center',
        short_name: 'JSCC',
        description: 'Private campaign discipline system for your job search. Local-first: your data never leaves your browser.',
        theme_color: '#030712',
        background_color: '#030712',
        display: 'standalone',
        scope: base,
        start_url: base,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache everything the build emits — including the lazy Insights
        // chunk, so offline navigation covers every tab.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    exclude: ['node_modules/**', 'e2e/**'], // e2e runs under Playwright, not Vitest
  },
})
