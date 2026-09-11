import { defineConfig } from 'vite'

export default defineConfig({
  base: '/slotclepsydra/',
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
