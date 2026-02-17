import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import solid from 'vite-plugin-solid'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    basicSsl(), // For local development with HTTPS, can be removed for production
    solid(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'LinkedInSnap',
        short_name: 'LISnap',
        description: 'Quickly share your LinkedIn profile and take selfies',
        theme_color: '#0072b1',
        background_color: '#0072b1',
        display: 'standalone',
        scope: '/linkedinsnap/',
        start_url: '/linkedinsnap/#ekohilas',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  base: '/linkedinsnap/',
})
