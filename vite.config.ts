/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: './',
  // 試験で index.css の中身(?raw)を読めるように(src/test/motion.test.ts)
  test: { css: { include: /index\.css/ } },
})
