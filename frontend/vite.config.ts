import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks so app changes don't bust the cache for libraries.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\/](gsap|@gsap|lenis)[\/]/.test(id)) return 'vendor-scroll'
          if (/[\/](react-markdown|remark-|micromark|mdast-|unified|hast-|unist-|vfile)/.test(id)) return 'vendor-markdown'
          if (/[\/](motion|framer-motion|motion-dom|motion-utils)[\/]/.test(id)) return 'vendor-motion'
          if (/[\/]@phosphor-icons[\/]/.test(id)) return 'vendor-icons'
          return 'vendor'
        },
      },
    },
  },
})
