import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  optimizeDeps: {
    // because of monorepo local non esm modules need to be included here
    // see: https://vitejs.dev/guide/dep-pre-bundling.html#monorepos-and-linked-dependencies
    include: ['@mopri/schema']
  },
  build: {
    commonjsOptions: {
      include: ['/@mopri/schema/', /node_modules/]
    }
  }
})
