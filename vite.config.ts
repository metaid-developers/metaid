/**
 * <reference types="vitest" />
 *  */
import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import wasm from 'vite-plugin-wasm'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  // test: {
  //   globals: true,
  //   testTimeout: 30000,
  // },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: ['edge90', 'chrome90', 'firefox90', 'safari15'],
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Metaid',
      fileName: 'metaid',
      formats: ['es', 'cjs', 'iife'],
    },
    minify: false,
  },
  plugins: [dts(), nodePolyfills(), wasm()],
  optimizeDeps: {
    include: ['buffer', 'process'],
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis',
      },
      supported: {
        bigint: true,
      },
    },
  },
})
